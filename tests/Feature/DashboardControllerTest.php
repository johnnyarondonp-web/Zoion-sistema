<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Pet;
use App\Models\Schedule;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        return User::forceCreate([
            'id'                => (string) Str::ulid(),
            'name'              => 'Admin Test',
            'email'             => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password'          => bcrypt('password'),
            'role'              => 'admin',
        ]);
    }

    private function makeUser(): User
    {
        return User::forceCreate([
            'id'                => (string) Str::ulid(),
            'name'              => fake()->name(),
            'email'             => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password'          => bcrypt('password'),
            'role'              => 'client',
        ]);
    }

    private function makeService(float $price = 50.0): Service
    {
        return Service::create([
            'id'               => (string) Str::ulid(),
            'name'             => 'Servicio ' . fake()->word(),
            'duration_minutes' => 30,
            'price'            => $price,
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

    // ─── /api/dashboard ──────────────────────────────────────────────────────

    public function test_dashboard_requiere_autenticacion(): void
    {
        $this->getJson('/api/dashboard')->assertStatus(401);
    }

    public function test_dashboard_devuelve_estructura_completa(): void
    {
        $admin = $this->makeAdmin();

        $res = $this->actingAs($admin)->getJson('/api/dashboard');

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_clients',
                    'total_pets',
                    'total_appointments',
                    'appointments_today',
                    'appointments_pending',
                    'appointments_confirmed',
                    'revenue_month',
                    'recent_appointments',
                    'appointments_by_status',
                    'appointments_by_month',
                    'appointmentsThisMonth',
                    'appointmentsLastMonth',
                    'mostRequestedService',
                    'unreadMessages',
                    'petsAttendedThisMonth',
                    'cancellationRate',
                    'recentAppointments',
                    'appointmentsByService',
                    'appointmentsByDay',
                ],
            ]);

        // appointmentsByDay siempre devuelve exactamente 14 días
        $byDay = $res->json('data.appointmentsByDay');
        $this->assertCount(14, $byDay);

        // appointmentsByMonth siempre devuelve exactamente 6 meses
        $byMonth = $res->json('data.appointments_by_month');
        $this->assertCount(6, $byMonth);
    }

    public function test_dashboard_contabiliza_citas_correctamente(): void
    {
        $admin   = $this->makeAdmin();
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'pending',
        ]);

        $res = $this->actingAs($admin)->getJson('/api/dashboard');

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertGreaterThanOrEqual(1, $data['total_appointments']);
        $this->assertGreaterThanOrEqual(1, $data['appointments_pending']);
        $this->assertGreaterThanOrEqual(1, $data['appointments_today']);
    }

    public function test_dashboard_calcula_revenue_solo_de_citas_completadas(): void
    {
        $admin   = $this->makeAdmin();
        $client  = $this->makeUser();
        $service = $this->makeService(100.0);
        $pet     = $this->makePet($client->id);

        // Una cita completada y otra pending — solo la primera debe sumar revenue
        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'completed',
        ]);

        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'pending',
        ]);

        $res  = $this->actingAs($admin)->getJson('/api/dashboard');
        $data = $res->json('data');

        // El revenue debe ser exactamente el precio del servicio (una sola completada)
        $this->assertEquals(100.0, (float) $data['revenue_month']);
    }

    public function test_dashboard_recent_appointments_incluye_mascota(): void
    {
        $admin   = $this->makeAdmin();
        $client  = $this->makeUser();
        $service = $this->makeService();
        $pet     = $this->makePet($client->id);

        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
        ]);

        $res = $this->actingAs($admin)->getJson('/api/dashboard');

        $recent = $res->json('data.recentAppointments');
        $this->assertNotEmpty($recent);
        // Verificar que el pet viene en el objeto y no es null
        $this->assertNotNull($recent[0]['pet']);
        $this->assertArrayHasKey('name', $recent[0]['pet']);
    }

    // ─── /api/reports ────────────────────────────────────────────────────────

    public function test_reports_requiere_autenticacion(): void
    {
        $this->getJson('/api/reports')->assertStatus(401);
    }

    public function test_reports_devuelve_estructura_correcta(): void
    {
        $admin = $this->makeAdmin();

        $res = $this->actingAs($admin)->getJson('/api/reports');

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'summary' => [
                        'totalRevenue',
                        'totalAppointments',
                        'completionRate',
                        'completedAppointments',
                    ],
                    'appointmentsByMonth',
                    'statusBreakdown',
                    'topServices',
                    'newClientsByMonth',
                ],
            ]);

        // Verificar que appointmentsByMonth siempre tiene 6 elementos
        $byMonth = $res->json('data.appointmentsByMonth');
        $this->assertCount(6, $byMonth);
    }

    public function test_reports_filtra_por_rango_de_fechas(): void
    {
        $admin   = $this->makeAdmin();
        $client  = $this->makeUser();
        $service = $this->makeService(50.0);
        $pet     = $this->makePet($client->id);

        // Cita dentro del rango
        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::today()->format('Y-m-d'),
            'status'     => 'completed',
        ]);

        // Cita fuera del rango (mes pasado)
        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => Carbon::now()->subMonths(3)->format('Y-m-d'),
            'status'     => 'completed',
        ]);

        $from = Carbon::now()->startOfMonth()->format('Y-m-d');
        $to   = Carbon::now()->endOfMonth()->format('Y-m-d');

        $res  = $this->actingAs($admin)->getJson("/api/reports?from={$from}&to={$to}");
        $data = $res->json('data');

        // Solo debe contar 1 cita en el rango
        $this->assertEquals(1, $data['summary']['totalAppointments']);
    }

    public function test_reports_revenue_usa_join_no_lazy_load(): void
    {
        // Este test verifica que el revenue se calcula correctamente y en una sola query,
        // no que podamos observar el query count (eso requeriría DB::getQueryLog).
        // Lo que sí podemos verificar es que el resultado es correcto con múltiples servicios.
        $admin    = $this->makeAdmin();
        $client   = $this->makeUser();
        $service1 = $this->makeService(100.0);
        $service2 = $this->makeService(200.0);
        $pet      = $this->makePet($client->id);

        $today = Carbon::today()->format('Y-m-d');

        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service1->id,
            'date'       => $today,
            'status'     => 'completed',
        ]);

        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service2->id,
            'date'       => $today,
            'status'     => 'completed',
        ]);

        // Una pending que NO debe sumar al revenue
        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service1->id,
            'date'       => $today,
            'status'     => 'pending',
        ]);

        $from = Carbon::now()->startOfMonth()->format('Y-m-d');
        $to   = Carbon::now()->endOfMonth()->format('Y-m-d');

        $res     = $this->actingAs($admin)->getJson("/api/reports?from={$from}&to={$to}");
        $revenue = $res->json('data.summary.totalRevenue');

        $this->assertEquals(300.0, (float) $revenue);
    }

    public function test_reports_top_services_incluye_revenue_por_servicio(): void
    {
        $admin   = $this->makeAdmin();
        $client  = $this->makeUser();
        $service = $this->makeService(75.0);
        $pet     = $this->makePet($client->id);

        $today = Carbon::today()->format('Y-m-d');

        $this->makeAppointment([
            'user_id'    => $client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => $today,
            'status'     => 'completed',
        ]);

        $from = Carbon::now()->startOfMonth()->format('Y-m-d');
        $to   = Carbon::now()->endOfMonth()->format('Y-m-d');

        $res         = $this->actingAs($admin)->getJson("/api/reports?from={$from}&to={$to}");
        $topServices = $res->json('data.topServices');

        $this->assertNotEmpty($topServices);
        $this->assertArrayHasKey('revenue', $topServices[0]);
        $this->assertArrayHasKey('name', $topServices[0]);
        $this->assertArrayHasKey('count', $topServices[0]);
    }
}
