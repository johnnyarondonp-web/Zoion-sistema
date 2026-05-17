<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Pet;
use App\Models\Schedule;
use App\Models\Service;
use App\Models\User;
use App\Models\WalkInAppointment;
use App\Models\WalkInClient;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ZoionBugFixesTest extends TestCase
{
    use RefreshDatabase;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function makeUser(string $role = 'client'): User
    {
        return User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => fake()->name(),
            'email'    => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => bcrypt('password'),
            'role'     => $role,
        ]);
    }

    private function makeService(int $durationMinutes = 60): Service
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

    // open: 08:00, close: 18:00 por defecto
    private function makeSchedule(int $dayOfWeek, bool $isAvailable = true, string $open = '08:00', string $close = '18:00'): Schedule
    {
        return Schedule::create([
            'id'           => (string) Str::ulid(),
            'day_of_week'  => $dayOfWeek,
            'open_time'    => $open,
            'close_time'   => $close,
            'is_available' => $isAvailable,
        ]);
    }

    // Fecha de mañana formateada como Y-m-d
    private function tomorrow(): string
    {
        return Carbon::tomorrow()->format('Y-m-d');
    }

    // Crea el schedule para mañana y retorna la fecha
    private function tomorrowWithSchedule(string $open = '08:00', string $close = '18:00'): string
    {
        $dayOfWeek = Carbon::tomorrow()->dayOfWeek;
        $this->makeSchedule($dayOfWeek, true, $open, $close);
        return $this->tomorrow();
    }

    // Crea una cita directamente en BD sin pasar por el controller
    private function makeAppointment(array $attrs): Appointment
    {
        $defaults = [
            'id'             => (string) Str::ulid(),
            'status'         => 'pending',
            'source'         => 'online',
            'payment_status' => 'pending',
            'status_history' => json_encode([['status' => 'pending', 'date' => now()->toISOString()]]),
        ];
        return Appointment::create(array_merge($defaults, $attrs));
    }

    // ─── Bug 1: Overlap con múltiples médicos ─────────────────────────────────

    public function test_crear_cita_no_rechaza_slot_cuando_hay_otro_medico_disponible(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $service = $this->makeService(60);
        $doctor1 = $this->makeDoctor($service);
        $doctor2 = $this->makeDoctor($service);

        $client1 = $this->makeUser();
        $client2 = $this->makeUser();
        $pet1    = $this->makePet($client1->id);
        $pet2    = $this->makePet($client2->id);

        // Doctor1 ya tiene una cita en ese slot
        $this->makeAppointment([
            'user_id'    => $client1->id,
            'pet_id'     => $pet1->id,
            'service_id' => $service->id,
            'doctor_id'  => $doctor1->id,
            'date'       => $date,
            'start_time' => '09:00',
            'end_time'   => '10:00',
            'status'     => 'confirmed',
        ]);

        // Client2 pide el mismo slot — doctor2 está libre, debe pasar
        $res = $this->actingAs($client2)->postJson('/api/appointments', [
            'petId'     => $pet2->id,
            'serviceId' => $service->id,
            'date'      => $date,
            'startTime' => '09:00',
        ]);

        $res->assertStatus(201);
    }

    public function test_crear_cita_rechaza_slot_cuando_todos_los_medicos_estan_ocupados(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $service = $this->makeService(60);
        $doctor  = $this->makeDoctor($service);

        $client1 = $this->makeUser();
        $client2 = $this->makeUser();
        $pet1    = $this->makePet($client1->id);
        $pet2    = $this->makePet($client2->id);

        $this->makeAppointment([
            'user_id'    => $client1->id,
            'pet_id'     => $pet1->id,
            'service_id' => $service->id,
            'doctor_id'  => $doctor->id,
            'date'       => $date,
            'start_time' => '09:00',
            'end_time'   => '10:00',
            'status'     => 'confirmed',
        ]);

        $res = $this->actingAs($client2)->postJson('/api/appointments', [
            'petId'     => $pet2->id,
            'serviceId' => $service->id,
            'date'      => $date,
            'startTime' => '09:00',
        ]);

        $res->assertStatus(409);
    }

    public function test_crear_cita_funciona_sin_medicos_configurados(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $service = $this->makeService(60); // sin doctores

        $client1 = $this->makeUser();
        $client2 = $this->makeUser();
        $pet1    = $this->makePet($client1->id);
        $pet2    = $this->makePet($client2->id);

        // Primera cita — debe fallar porque ya no se permite agendar sin médicos
        $res1 = $this->actingAs($client1)->postJson('/api/appointments', [
            'petId'     => $pet1->id,
            'serviceId' => $service->id,
            'date'      => $date,
            'startTime' => '09:00',
        ]);
        $res1->assertStatus(409);

        // Segunda cita en el mismo slot — debe ser rechazada (comportamiento original)
        $res2 = $this->actingAs($client2)->postJson('/api/appointments', [
            'petId'     => $pet2->id,
            'serviceId' => $service->id,
            'date'      => $date,
            'startTime' => '09:00',
        ]);
        $res2->assertStatus(409);
    }

    // ─── Bug 3: Inertia prop appointmentId ───────────────────────────────────

    public function test_ruta_detalle_cita_cliente_pasa_appointment_id_como_prop(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $service = $this->makeService(60);
        $client  = $this->makeUser();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => $date,
            'start_time' => '09:00',
            'end_time'   => '10:00',
        ]);

        $this->actingAs($client)
            ->get("/client/appointments/{$appointment->id}")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Client/AppointmentDetail')
                ->where('appointmentId', $appointment->id)
            );
    }

    // ─── Bug 4: PATCH de estado ───────────────────────────────────────────────

    public function test_admin_puede_cambiar_estado_de_cita_sin_500(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $service = $this->makeService(60);
        $client  = $this->makeUser();
        $admin   = $this->makeUser('admin');
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => $date,
            'start_time' => '09:00',
            'end_time'   => '10:00',
        ]);

        $res = $this->actingAs($admin)->patchJson("/api/appointments/{$appointment->id}", [
            'status' => 'confirmed',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed');
    }

    public function test_cambiar_estado_actualiza_status_history(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $service = $this->makeService(60);
        $client  = $this->makeUser();
        $admin   = $this->makeUser('admin');
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => $date,
            'start_time' => '09:00',
            'end_time'   => '10:00',
        ]);

        $this->actingAs($admin)->patchJson("/api/appointments/{$appointment->id}", [
            'status' => 'confirmed',
        ]);

        // Leer directo de BD para evitar que el cast del modelo interfiera
        $raw = DB::table('appointments')->where('id', $appointment->id)->value('status_history');
        $history = json_decode($raw, true);

        $this->assertCount(2, $history);
        $this->assertEquals('confirmed', $history[1]['status']);
    }

    public function test_cliente_no_puede_cambiar_estado_de_cita(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $service = $this->makeService(60);
        $client  = $this->makeUser();
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => $date,
            'start_time' => '09:00',
            'end_time'   => '10:00',
        ]);

        $this->actingAs($client)->patchJson("/api/appointments/{$appointment->id}", [
            'status' => 'confirmed',
        ]);

        $this->assertDatabaseHas('appointments', [
            'id'     => $appointment->id,
            'status' => 'pending',
        ]);
    }

    // ─── Bug 5: Estructura de notificaciones ─────────────────────────────────

    public function test_endpoint_notificaciones_admin_devuelve_estructura_correcta(): void
    {
        // El controller busca citas pending con date >= today, usamos hoy para asegurar que entra
        $date    = Carbon::today()->format('Y-m-d');
        $service = $this->makeService(60);
        $client  = $this->makeUser();
        $admin   = $this->makeUser('admin');
        $pet     = $this->makePet($client->id);

        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => $date,
            'start_time' => '09:00',
            'end_time'   => '10:00',
            'status'     => 'pending',
        ]);

        \App\Models\Notification::create([
            'user_id' => $admin->id,
            'title'   => 'Test',
            'message' => 'Test message',
            'type'    => 'new_appointment',
        ]);

        $res = $this->actingAs($admin)->getJson('/api/notifications');

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'data' => ['notifications', 'unreadCount'],
            ]);

        $notifications = $res->json('data.notifications');
        $this->assertNotEmpty($notifications);
        $this->assertIsBool($notifications[0]['read']);
        $this->assertIsString($notifications[0]['timestamp']);
    }

    public function test_endpoint_notificaciones_cliente_devuelve_estructura_correcta(): void
    {
        $today   = Carbon::today()->format('Y-m-d');
        $service = $this->makeService(60);
        $client  = $this->makeUser();
        $pet     = $this->makePet($client->id);

        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => $today,
            'start_time' => '09:00',
            'end_time'   => '10:00',
            'status'     => 'confirmed',
        ]);

        $res = $this->actingAs($client)->getJson('/api/notifications');

        $res->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'notifications',
                    'unreadCount',
                ],
            ]);
    }

    // ─── Bug 6: Mascota eliminada no rompe admin/clients ─────────────────────

    public function test_admin_puede_ver_detalle_de_cliente_aunque_tenga_mascota_eliminada(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $service = $this->makeService(60);
        $client  = $this->makeUser();
        $admin   = $this->makeUser('admin');
        $pet     = $this->makePet($client->id);

        $appointment = $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => $date,
            'start_time' => '09:00',
            'end_time'   => '10:00',
        ]);

        // Borrar la mascota después de crear la cita — la FK pet_id tiene onDelete('set null')
        // así que esto funciona tanto en SQLite como en PostgreSQL sin PRAGMA
        $pet->delete();

        $this->actingAs($admin)
            ->getJson("/api/admin/clients/{$client->id}")
            ->assertStatus(200);
    }

    // ─── Bug 7: Walk-in con fecha de nacimiento ───────────────────────────────

    public function test_walk_in_guarda_fecha_nacimiento_de_mascota(): void
    {
        $admin   = $this->makeUser('admin');
        $service = $this->makeService(30);
        $dayOfWeek = Carbon::today()->dayOfWeek;
        $this->makeSchedule($dayOfWeek, true, '08:00', '18:00');

        $res = $this->actingAs($admin)->postJson('/api/admin/walk-in', [
            'ownerName'     => 'Carlos López',
            'phone'         => '04141234567',
            'petName'       => 'Firulais',
            'petSpecies'    => 'perro',
            'serviceId'     => $service->id,
            'startTime'     => '09:00',
            'paymentMethod' => 'cash',
            'petBirthDate'  => '2020-06-15',
        ]);

        $res->assertStatus(201);

        // Si pet_birth_date llega null, la migración 022044 (vacía) está corriendo
        // en lugar de la 121627 — eliminar 022044 del proyecto
        $this->assertDatabaseHas('walk_in_clients', ['pet_birth_date' => '2020-06-15']);
    }

    public function test_walk_in_rechaza_fecha_nacimiento_futura(): void
    {
        $admin   = $this->makeUser('admin');
        $service = $this->makeService(30);
        $dayOfWeek = Carbon::today()->dayOfWeek;
        $this->makeSchedule($dayOfWeek, true, '08:00', '18:00');

        $res = $this->actingAs($admin)->postJson('/api/admin/walk-in', [
            'ownerName'     => 'Carlos López',
            'phone'         => '04141234568',
            'petName'       => 'Firulais',
            'petSpecies'    => 'perro',
            'serviceId'     => $service->id,
            'startTime'     => '09:00',
            'paymentMethod' => 'cash',
            'petBirthDate'  => Carbon::tomorrow()->format('Y-m-d'),
        ]);

        $res->assertStatus(422);
    }

    // ─── Horarios ────────────────────────────────────────────────────────────

    public function test_crear_cita_rechaza_dia_no_laborable(): void
    {
        $service = $this->makeService(60);
        $this->makeDoctor($service);
        $client  = $this->makeUser();
        $pet     = $this->makePet($client->id);

        $dayOfWeek = Carbon::tomorrow()->dayOfWeek;
        $this->makeSchedule($dayOfWeek, false); // marcado como no disponible

        $res = $this->actingAs($client)->postJson('/api/appointments', [
            'petId'     => $pet->id,
            'serviceId' => $service->id,
            'date'      => $this->tomorrow(),
            'startTime' => '09:00',
        ]);

        $res->assertStatus(400);
    }

    public function test_crear_cita_rechaza_hora_fuera_de_horario_laboral(): void
    {
        $service = $this->makeService(60);
        $this->makeDoctor($service);
        $client  = $this->makeUser();
        $pet     = $this->makePet($client->id);

        $dayOfWeek = Carbon::tomorrow()->dayOfWeek;
        $this->makeSchedule($dayOfWeek, true, '09:00', '17:00');

        $res = $this->actingAs($client)->postJson('/api/appointments', [
            'petId'     => $pet->id,
            'serviceId' => $service->id,
            'date'      => $this->tomorrow(),
            'startTime' => '08:00', // antes del horario de apertura
        ]);

        $res->assertStatus(400);
    }

    public function test_endpoint_availability_schedule_devuelve_dias_no_laborables(): void
    {
        $client = $this->makeUser();

        $this->makeSchedule(0, false); // domingo
        $this->makeSchedule(6, false); // sábado

        $res = $this->actingAs($client)->getJson('/api/availability/schedule');

        $res->assertStatus(200)
            ->assertJsonPath('success', true);

        $unavailable = $res->json('data.unavailableDays');
        $this->assertContains(0, $unavailable);
        $this->assertContains(6, $unavailable);
    }

    // ─── Fix 5: Pago Móvil reemplaza Zelle ───────────────────────────────────

    public function test_crear_cita_acepta_pago_movil_como_metodo_de_pago(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $service = $this->makeService(60);
        $this->makeDoctor($service);
        $client  = $this->makeUser();
        $pet     = $this->makePet($client->id);

        $res = $this->actingAs($client)->postJson('/api/appointments', [
            'petId'         => $pet->id,
            'serviceId'     => $service->id,
            'date'          => $date,
            'startTime'     => '09:00',
            'paymentMethod' => 'pago_movil',
        ]);

        $res->assertStatus(201);
        $this->assertDatabaseHas('appointments', ['payment_method' => 'pago_movil']);
    }

    public function test_crear_cita_rechaza_zelle_como_metodo_de_pago(): void
    {
        $date    = $this->tomorrowWithSchedule();
        $service = $this->makeService(60);
        $client  = $this->makeUser();
        $pet     = $this->makePet($client->id);

        $res = $this->actingAs($client)->postJson('/api/appointments', [
            'petId'         => $pet->id,
            'serviceId'     => $service->id,
            'date'          => $date,
            'startTime'     => '09:00',
            'paymentMethod' => 'zelle',
        ]);

        $res->assertStatus(422);
    }

    public function test_crear_cita_rechaza_fecha_mas_de_tres_meses_en_el_futuro(): void
    {
        $date    = now()->addMonths(3)->addDay()->format('Y-m-d');
        $service = $this->makeService(60);
        $client  = $this->makeUser();
        $pet     = $this->makePet($client->id);

        $res = $this->actingAs($client)->postJson('/api/appointments', [
            'petId'     => $pet->id,
            'serviceId' => $service->id,
            'date'      => $date,
            'startTime' => '09:00',
        ]);

        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['date']);
    }
}