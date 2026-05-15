<?php

namespace Tests\Feature;

use App\Models\Schedule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ScheduleControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin  = User::factory()->create(['role' => 'admin']);
        $this->client = User::factory()->create(['role' => 'client']);
    }

    /** @test */
    public function test_index_returns_default_schedule_when_table_is_empty(): void
    {
        $res = $this->actingAs($this->client)->getJson('/api/schedules');

        $res->assertOk()->assertJsonPath('success', true);
        $this->assertCount(7, $res->json('data'));
    }

    /** @test */
    public function test_admin_can_update_and_fetch_schedules(): void
    {
        // Bug 1: guardar y recuperar debe producir datos consistentes.
        $payload = collect(range(0, 6))->map(fn($d) => [
            'dayOfWeek'   => $d,
            'openTime'    => '08:00',
            'closeTime'   => '16:00',
            'isAvailable' => $d >= 1 && $d <= 5,
        ])->all();

        $this->actingAs($this->admin)->putJson('/api/schedules', ['schedules' => $payload])
            ->assertOk()->assertJsonPath('success', true);

        // Al fetchar de vuelta, el horario modificado debe estar guardado.
        $res = $this->actingAs($this->admin)->getJson('/api/schedules');
        $schedules = $res->json('data');

        // Buscar el lunes (day_of_week = 1) — debe tener 08:00
        $monday = collect($schedules)->firstWhere(fn($s) =>
            ($s['day_of_week'] ?? $s['dayOfWeek'] ?? null) === 1
        );
        $this->assertNotNull($monday, 'Debe existir el registro del lunes');

        $openTime = $monday['open_time'] ?? $monday['openTime'] ?? null;
        $this->assertEquals('08:00', $openTime, 'La hora guardada debe ser 08:00');
    }

    /** @test */
    public function test_update_is_idempotent(): void
    {
        $payload = collect(range(0, 6))->map(fn($d) => [
            'dayOfWeek' => $d, 'openTime' => '09:00', 'closeTime' => '18:00', 'isAvailable' => true,
        ])->all();

        $this->actingAs($this->admin)->putJson('/api/schedules', ['schedules' => $payload]);
        $this->actingAs($this->admin)->putJson('/api/schedules', ['schedules' => $payload]);

        $this->assertEquals(7, Schedule::count());
    }

    /** @test */
    public function test_client_cannot_update_schedules(): void
    {
        $payload = [['dayOfWeek' => 1, 'openTime' => '08:00', 'closeTime' => '20:00', 'isAvailable' => true]];
        $this->actingAs($this->client)->putJson('/api/schedules', ['schedules' => $payload])->assertForbidden();
    }
}
