<?php

namespace Tests\Feature;

use App\Models\Schedule;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class WalkInControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Service $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->service = Service::create([
            'id'               => (string) Str::ulid(),
            'name'             => 'Consulta General',
            'duration_minutes' => 30,
            'price'            => 50,
            'category'         => 'consulta',
            'is_active'        => true,
        ]);
    }

    private function createWeekdaySchedule(): void
    {
        for ($d = 0; $d <= 6; $d++) {
            Schedule::create([
                'id'           => (string) Str::ulid(),
                'day_of_week'  => $d,
                'open_time'    => '09:00',
                'close_time'   => '18:00',
                'is_available' => $d >= 1 && $d <= 5,
            ]);
        }
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'ownerName'     => 'Juan Pérez',
            'phone'         => '+584121234567',
            'petName'       => 'Max',
            'petSpecies'    => 'perro',
            'serviceId'     => $this->service->id,
            'startTime'     => '10:00',
            'paymentMethod' => 'cash',
        ], $overrides);
    }

    /** @test */
    public function test_store_returns_201_with_default_schedule_when_table_is_empty(): void
    {
        // La tabla schedules está vacía — debe usar el default L-V 09-18 y no devolver 400.
        // Este test verifica el Bug 10.
        // Solo correrlo en día de semana; en fin de semana el resultado esperado es diferente.
        $dayOfWeek = Carbon::today()->dayOfWeek;
        if ($dayOfWeek === 0 || $dayOfWeek === 6) {
            $this->markTestSkipped('Este test solo aplica en días de semana');
        }

        $res = $this->actingAs($this->admin)->postJson('/api/admin/walk-in', $this->validPayload());

        $res->assertStatus(201)->assertJsonPath('success', true);
    }

    /** @test */
    public function test_store_returns_400_on_weekend_with_empty_schedule_table(): void
    {
        // Simular que hoy es sábado para verificar el bloqueo de fin de semana.
        $dayOfWeek = Carbon::today()->dayOfWeek;
        if ($dayOfWeek !== 0 && $dayOfWeek !== 6) {
            $this->markTestSkipped('Este test solo aplica en fin de semana');
        }

        $res = $this->actingAs($this->admin)->postJson('/api/admin/walk-in', $this->validPayload());

        $res->assertStatus(400);
    }

    /** @test */
    public function test_store_returns_400_when_schedule_explicitly_closed(): void
    {
        $today = Carbon::today();
        $dayOfWeek = $today->dayOfWeek;

        Schedule::create([
            'id'           => (string) Str::ulid(),
            'day_of_week'  => $dayOfWeek,
            'open_time'    => '09:00',
            'close_time'   => '18:00',
            'is_available' => false,
        ]);

        $res = $this->actingAs($this->admin)->postJson('/api/admin/walk-in', $this->validPayload());

        $res->assertStatus(400);
    }

    /** @test */
    public function test_store_persists_walk_in_and_client_correctly(): void
    {
        $this->createWeekdaySchedule();
        $dayOfWeek = Carbon::today()->dayOfWeek;
        if ($dayOfWeek === 0 || $dayOfWeek === 6) {
            $this->markTestSkipped('Solo aplica en días de semana');
        }

        $res = $this->actingAs($this->admin)->postJson('/api/admin/walk-in', $this->validPayload());

        $res->assertStatus(201);
        $this->assertDatabaseHas('walk_in_clients', ['phone' => '+584121234567', 'owner_name' => 'Juan Pérez']);
        $this->assertDatabaseHas('walk_in_appointments', ['status' => 'confirmed', 'start_time' => '10:00']);
    }
}
