<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Pet;
use App\Models\Service;
use App\Models\User;
use App\Models\WalkInAppointment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Tests\TestCase;

class ConcurrencyBookingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->client = User::factory()->create(['role' => 'client']);
        $this->pet = Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name' => 'Fido',
            'species' => 'dog',
            'is_active' => true,
        ]);
        
        $this->service = Service::create([
            'id' => (string) Str::ulid(),
            'name' => 'Consulta',
            'duration_minutes' => 60,
            'price' => 50,
            'category' => 'general',
            'is_active' => true,
        ]);

        // Crear 1 solo doctor para este servicio (Capacidad = 1)
        $this->doctorUser = User::factory()->create(['role' => 'doctor']);
        $this->doctor = Doctor::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->doctorUser->id,
            'name' => 'Dr. Only One',
            'specialty' => 'General',
            'is_active' => true,
        ]);
        $this->doctor->services()->attach($this->service->id);

        // Crear horario
        \App\Models\Schedule::create([
            'day_of_week' => now()->dayOfWeek,
            'open_time' => '09:00',
            'close_time' => '18:00',
            'is_available' => true,
        ]);
    }

    /** @test */
    public function test_booking_respects_atomic_lock_logic()
    {
        $tomorrow = now()->addDay()->format('Y-m-d');
        
        // Actualizar horario para mañana
        \App\Models\Schedule::updateOrCreate(
            ['day_of_week' => now()->addDay()->dayOfWeek],
            ['open_time' => '09:00', 'close_time' => '18:00', 'is_available' => true]
        );

        Cache::shouldReceive('lock')
            ->once()
            ->with("appointment_lock_{$tomorrow}_10:00", 10)
            ->andReturn(new \Illuminate\Cache\NoLock('test', 10));

        $res = $this->actingAs($this->client)->postJson('/api/appointments', [
            'petId' => $this->pet->id,
            'serviceId' => $this->service->id,
            'date' => $tomorrow,
            'startTime' => '10:00',
        ]);

        $res->assertStatus(201);
    }

    /** @test */
    public function test_collision_prevention_when_capacity_is_full()
    {
        $tomorrow = now()->addDay()->format('Y-m-d');
        $time = '10:00';

        // Actualizar horario para mañana
        \App\Models\Schedule::updateOrCreate(
            ['day_of_week' => now()->addDay()->dayOfWeek],
            ['open_time' => '09:00', 'close_time' => '18:00', 'is_available' => true]
        );

        $client = \App\Models\WalkInClient::create([
            'owner_name' => 'John Doe',
            'phone' => '12345678',
            'pet_name' => 'Rex',
            'pet_species' => 'dog',
        ]);

        // 1. Ocupar el único slot disponible con un WalkIn
        WalkInAppointment::create([
            'id' => (string) Str::ulid(),
            'walk_in_client_id' => $client->id,
            'service_id' => $this->service->id,
            'doctor_id' => $this->doctor->id,
            'date' => $tomorrow,
            'start_time' => '10:00',
            'end_time' => '11:00',
            'status' => 'confirmed',
        ]);

        // 2. Intentar reservar el mismo horario por el Wizard (Cliente)
        $res = $this->actingAs($this->client)->postJson('/api/appointments', [
            'petId' => $this->pet->id,
            'serviceId' => $this->service->id,
            'date' => $tomorrow,
            'startTime' => '10:00',
        ]);

        // Debe fallar con 409 Conflict
        $res->assertStatus(409);
        $res->assertJsonPath('error', 'Este horario ya no está disponible');
    }
}
