<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Notification;
use App\Models\Pet;
use App\Models\Schedule;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AppointmentFlowsTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'client'): User
    {
        return User::forceCreate([
            'id'                => (string) Str::ulid(),
            'name'              => fake()->name(),
            'email'             => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password'          => bcrypt('password'),
            'role'              => $role,
        ]);
    }

    private function makeService(int $durationMinutes = 30): Service
    {
        return Service::create([
            'id'               => (string) Str::ulid(),
            'name'             => 'Consulta ' . fake()->word(),
            'duration_minutes' => $durationMinutes,
            'price'            => 50.00,
            'is_active'        => true,
        ]);
    }

    private function makePet(string $userId): Pet
    {
        return Pet::create([
            'id'        => (string) Str::ulid(),
            'user_id'   => $userId,
            'name'      => fake()->firstName(),
            'species'   => 'perro',
            'is_active' => true,
        ]);
    }

    private function makeDoctor(Service $service): Doctor
    {
        $doctor = Doctor::create([
            'id'        => (string) Str::ulid(),
            'name'      => 'Dr. ' . fake()->lastName(),
            'is_active' => true,
        ]);
        $doctor->services()->attach($service->id);
        return $doctor;
    }

    private function makeSchedule(int $dayOfWeek): Schedule
    {
        return Schedule::create([
            'id'           => (string) Str::ulid(),
            'day_of_week'  => $dayOfWeek,
            'open_time'    => '08:00',
            'close_time'   => '18:00',
            'is_available' => true,
        ]);
    }

    private function makeAppointment(array $attrs): Appointment
    {
        $defaults = [
            'id'             => (string) Str::ulid(),
            'status'         => 'confirmed',
            'source'         => 'online',
            'payment_status' => 'pending',
            'start_time'     => '09:00',
            'end_time'       => '09:30',
            'status_history' => json_encode([['status' => 'confirmed', 'date' => now()->toISOString()]]),
        ];
        return Appointment::create(array_merge($defaults, $attrs));
    }

    private function tomorrowWithSchedule(): string
    {
        $day = Carbon::tomorrow()->dayOfWeek;
        $this->makeSchedule($day);
        return Carbon::tomorrow()->format('Y-m-d');
    }

    // ─── Flujo de pago ───────────────────────────────────────────────────────

    public function test_admin_puede_registrar_pago_de_cita(): void
    {
        $admin   = $this->makeUser('admin');
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
        ]);

        $res = $this->actingAs($admin)->patchJson("/api/appointments/{$appointment->id}", [
            'paymentMethod' => 'cash',
            'paymentStatus' => 'paid',
            'paymentAmount' => 50.00,
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.paymentStatus', 'paid');

        $this->assertDatabaseHas('appointments', [
            'id'             => $appointment->id,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
        ]);
    }

    public function test_pago_registra_paid_at_automaticamente(): void
    {
        $admin   = $this->makeUser('admin');
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
        ]);

        $this->assertNull($appointment->paid_at);

        $this->actingAs($admin)->patchJson("/api/appointments/{$appointment->id}", [
            'paymentStatus' => 'paid',
        ]);

        $appointment->refresh();
        $this->assertNotNull($appointment->paid_at);
    }

    public function test_pago_no_sobreescribe_paid_at_si_ya_estaba_pagado(): void
    {
        $admin   = $this->makeUser('admin');
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $originalPaidAt = now()->subHour();

        $appointment = $this->makeAppointment([
            'user_id'        => $client->id,
            'pet_id'         => $pet->id,
            'service_id'     => $service->id,
            'date'           => Carbon::today()->format('Y-m-d'),
            'payment_status' => 'paid',
            'paid_at'        => $originalPaidAt,
        ]);

        // Enviar otro PATCH con paymentStatus=paid — no debe pisar paid_at
        $this->actingAs($admin)->patchJson("/api/appointments/{$appointment->id}", [
            'paymentStatus' => 'paid',
        ]);

        $appointment->refresh();
        // La fecha original no debe cambiar
        $this->assertEquals(
            $originalPaidAt->format('Y-m-d H:i'),
            $appointment->paid_at->format('Y-m-d H:i')
        );
    }

    public function test_cliente_no_puede_actualizar_pago(): void
    {
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
        ]);

        $this->actingAs($client)->patchJson("/api/appointments/{$appointment->id}", [
            'paymentStatus' => 'paid',
        ]);

        // El campo payment_status no está en la lista permitida para clientes,
        // así que la BD debe conservar 'pending'
        $this->assertDatabaseHas('appointments', [
            'id'             => $appointment->id,
            'payment_status' => 'pending',
        ]);
    }

    public function test_medico_no_puede_actualizar_pago(): void
    {
        $doctorUser = $this->makeUser('doctor');
        $client     = $this->makeUser();
        $service    = $this->makeService();
        $pet        = $this->makePet($client->id);

        // Crear perfil Doctor
        $doctor = Doctor::create([
            'id'        => (string) Str::ulid(),
            'name'      => 'Dr. Test',
            'is_active' => true,
        ]);
        // Vincular usuario doctor con perfil
        $doctorUser->update(['id' => $doctor->id]); 

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'doctor_id'  => $doctor->id,
            'date'       => Carbon::today()->format('Y-m-d'),
        ]);

        $this->actingAs($doctorUser)->patchJson("/api/appointments/{$appointment->id}", [
            'paymentStatus' => 'paid',
        ]);

        // El médico no debe poder modificar la parte administrativa (pagos),
        // por lo que la BD debe conservar 'pending'
        $this->assertDatabaseHas('appointments', [
            'id'             => $appointment->id,
            'payment_status' => 'pending',
        ]);
    }

    // ─── Rating de citas ─────────────────────────────────────────────────────

    public function test_cliente_puede_calificar_cita_completada(): void
    {
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'completed',
        ]);

        $res = $this->actingAs($client)->postJson("/api/appointments/{$appointment->id}/rating", [
            'rating' => 5,
            'review' => 'Excelente atención',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.rating', 5);

        $this->assertDatabaseHas('appointments', [
            'id'     => $appointment->id,
            'rating' => 5,
        ]);
    }

    public function test_rating_no_se_puede_calificar_dos_veces(): void
    {
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'completed',
            'rating'     => 3,
        ]);

        // Intentar calificar de nuevo con otro score — debe ser rechazado
        $res = $this->actingAs($client)->postJson("/api/appointments/{$appointment->id}/rating", [
            'rating' => 5,
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('success', false);

        // El rating original no debe haber cambiado
        $this->assertDatabaseHas('appointments', [
            'id'     => $appointment->id,
            'rating' => 3,
        ]);
    }

    public function test_rating_no_se_puede_sobrescribir_via_update(): void
    {
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'completed',
            'rating'     => 4,
        ]);

        // Intentar sobrescribir la calificación usando el PATCH general de actualización
        $res = $this->actingAs($client)->patchJson("/api/appointments/{$appointment->id}", [
            'rating' => 1,
            'review' => 'Malísimo',
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('success', false);

        // La base de datos debe mantener el rating original de 4
        $this->assertDatabaseHas('appointments', [
            'id'     => $appointment->id,
            'rating' => 4,
        ]);
    }

    public function test_rating_falla_si_cita_no_esta_completada(): void
    {
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'confirmed',
        ]);

        $res = $this->actingAs($client)->postJson("/api/appointments/{$appointment->id}/rating", [
            'rating' => 4,
        ]);

        $res->assertStatus(422);
    }

    public function test_rating_rechaza_valores_fuera_de_rango(): void
    {
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'completed',
        ]);

        $this->actingAs($client)
            ->postJson("/api/appointments/{$appointment->id}/rating", ['rating' => 6])
            ->assertStatus(422);

        $this->actingAs($client)
            ->postJson("/api/appointments/{$appointment->id}/rating", ['rating' => 0])
            ->assertStatus(422);
    }

    public function test_otro_usuario_no_puede_calificar_cita_ajena(): void
    {
        $client  = $this->makeUser();
        $otro    = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'completed',
        ]);

        $this->actingAs($otro)
            ->postJson("/api/appointments/{$appointment->id}/rating", ['rating' => 5])
            ->assertStatus(403);
    }

    // ─── Notificaciones al crear cita ────────────────────────────────────────

    public function test_crear_cita_online_notifica_al_admin(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $admin   = $this->makeUser('admin');
        $client  = $this->makeUser();
        $service = $this->makeService(30);
        $doctor  = $this->makeDoctor($service);
        $pet     = $this->makePet($client->id);

        $this->actingAs($client)->postJson('/api/appointments', [
            'petId'     => $pet->id,
            'serviceId' => $service->id,
            'date'      => $date,
            'startTime' => '09:00',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'type'    => 'new_appointment',
        ]);
    }

    public function test_admin_agendando_para_cliente_notifica_al_cliente(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $admin   = $this->makeUser('admin');
        $client  = $this->makeUser();
        $service = $this->makeService(30);
        $doctor  = $this->makeDoctor($service);
        $pet     = $this->makePet($client->id);

        // El admin agenda para el cliente pasando userId
        $this->actingAs($admin)->postJson('/api/appointments', [
            'petId'     => $pet->id,
            'serviceId' => $service->id,
            'date'      => $date,
            'startTime' => '09:00',
            'userId'    => $client->id,
        ]);

        // El cliente debe recibir una notificación de tipo new_appointment
        $this->assertDatabaseHas('notifications', [
            'user_id' => $client->id,
            'type'    => 'new_appointment',
        ]);
    }

    public function test_confirmar_cita_notifica_al_cliente(): void
    {
        $admin   = $this->makeUser('admin');
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'pending',
        ]);

        $this->actingAs($admin)->patchJson("/api/appointments/{$appointment->id}", [
            'status' => 'confirmed',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $client->id,
            'type'    => 'appointment_confirmed',
        ]);
    }

    public function test_confirmar_cita_sin_estado_no_genera_notificacion_duplicada(): void
    {
        $admin   = $this->makeUser('admin');
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'confirmed',
        ]);

        // PATCH sin cambio de status — no debe generar notificación de confirmación
        $this->actingAs($admin)->patchJson("/api/appointments/{$appointment->id}", [
            'paymentStatus' => 'paid',
        ]);

        $notifCount = Notification::where('user_id', $client->id)
            ->where('type', 'appointment_confirmed')
            ->count();

        $this->assertEquals(0, $notifCount);
    }

    // ─── Borrado y acceso ────────────────────────────────────────────────────

    public function test_admin_puede_eliminar_cita(): void
    {
        $admin   = $this->makeUser('admin');
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/appointments/{$appointment->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('appointments', ['id' => $appointment->id]);
    }

    public function test_cliente_no_puede_eliminar_cita(): void
    {
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
        ]);

        $this->actingAs($client)
            ->deleteJson("/api/appointments/{$appointment->id}")
            ->assertStatus(403);
    }
}
