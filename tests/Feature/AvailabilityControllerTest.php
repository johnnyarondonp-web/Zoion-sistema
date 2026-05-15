<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BlockedDate;
use App\Models\Schedule;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AvailabilityControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['role' => 'client']);

        $this->service = Service::create([
            'id'               => (string) Str::ulid(),
            'name'             => 'Consulta General',
            'duration_minutes' => 60,
            'price'            => 50,
            'category'         => 'consulta',
            'is_active'        => true,
        ]);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function createSchedule(int $day, bool $available = true, string $open = '09:00', string $close = '18:00'): Schedule
    {
        return Schedule::create([
            'id'           => (string) Str::ulid(),
            'day_of_week'  => $day,
            'open_time'    => $open,
            'close_time'   => $close,
            'is_available' => $available,
        ]);
    }

    private function createDefaultSchedules(): void
    {
        for ($day = 0; $day <= 6; $day++) {
            $this->createSchedule($day, $day >= 1 && $day <= 5);
        }
    }

    private function nextWeekday(int $targetDow): string
    {
        // Devuelve la próxima fecha que caiga en $targetDow (0=dom) que sea futura.
        $date = Carbon::now()->addDay();
        while ($date->dayOfWeek !== $targetDow) {
            $date->addDay();
        }
        return $date->format('Y-m-d');
    }

    // ─── Tests: endpoint /api/availability/schedule ───────────────────────────

    /** @test */
    public function schedule_endpoint_returns_unavailable_days_when_db_has_data(): void
    {
        $this->createDefaultSchedules();

        $res = $this->actingAs($this->user)->getJson('/api/availability/schedule');

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.unavailableDays', fn($days) =>
                in_array(0, $days) && in_array(6, $days) && !in_array(1, $days)
            );
    }

    /** @test */
    public function schedule_endpoint_returns_default_unavailable_days_when_table_is_empty(): void
    {
        // Sin schedules en DB: debe devolver sábado y domingo como no disponibles por defecto.
        $res = $this->actingAs($this->user)->getJson('/api/availability/schedule');

        $res->assertOk()
            ->assertJsonPath('data.unavailableDays', fn($days) =>
                in_array(0, $days) && in_array(6, $days)
            );
    }

    /** @test */
    public function schedule_endpoint_reflects_admin_changes(): void
    {
        $this->createDefaultSchedules();
        // El admin desactiva el viernes
        Schedule::where('day_of_week', 5)->update(['is_available' => false]);

        $res = $this->actingAs($this->user)->getJson('/api/availability/schedule');

        $res->assertOk();
        $unavailable = $res->json('data.unavailableDays');
        $this->assertContains(5, $unavailable, 'Viernes debe estar en unavailableDays');
        $this->assertContains(0, $unavailable, 'Domingo debe estar en unavailableDays');
        $this->assertContains(6, $unavailable, 'Sábado debe estar en unavailableDays');
        $this->assertNotContains(1, $unavailable, 'Lunes no debe estar bloqueado');
    }

    // ─── Tests: endpoint /api/availability?date=...&serviceId=... ────────────

    /** @test */
    public function availability_returns_slots_for_open_weekday(): void
    {
        $this->createDefaultSchedules();
        $monday = $this->nextWeekday(1); // próximo lunes

        $res = $this->actingAs($this->user)->getJson("/api/availability?date={$monday}&serviceId={$this->service->id}");

        $res->assertOk()
            ->assertJsonPath('data.available', true);

        $slots = $res->json('data.slots');
        $this->assertNotEmpty($slots, 'Debe haber slots disponibles el lunes');
    }

    /** @test */
    public function availability_returns_no_slots_for_saturday_with_default_schedule(): void
    {
        $this->createDefaultSchedules();
        $saturday = $this->nextWeekday(6);

        $res = $this->actingAs($this->user)->getJson("/api/availability?date={$saturday}&serviceId={$this->service->id}");

        $res->assertOk()
            ->assertJsonPath('data.available', false)
            ->assertJsonPath('data.slots', []);
    }

    /** @test */
    public function availability_returns_no_slots_for_sunday_with_default_schedule(): void
    {
        $this->createDefaultSchedules();
        $sunday = $this->nextWeekday(0);

        $res = $this->actingAs($this->user)->getJson("/api/availability?date={$sunday}&serviceId={$this->service->id}");

        $res->assertOk()
            ->assertJsonPath('data.available', false);
    }

    /** @test */
    public function availability_returns_no_slots_when_table_empty_and_day_is_weekend(): void
    {
        // Sin schedules en DB, sábado debe devolver no disponible (default).
        $saturday = $this->nextWeekday(6);

        $res = $this->actingAs($this->user)->getJson("/api/availability?date={$saturday}&serviceId={$this->service->id}");

        $res->assertOk()
            ->assertJsonPath('data.available', false);
    }

    /** @test */
    public function availability_returns_slots_when_table_empty_and_day_is_weekday(): void
    {
        // Sin schedules en DB, lunes debe usar el horario predeterminado y devolver slots.
        $monday = $this->nextWeekday(1);

        $res = $this->actingAs($this->user)->getJson("/api/availability?date={$monday}&serviceId={$this->service->id}");

        $res->assertOk()
            ->assertJsonPath('data.available', true);
        $this->assertNotEmpty($res->json('data.slots'));
    }

    /** @test */
    public function availability_returns_no_slots_for_blocked_date(): void
    {
        $this->createDefaultSchedules();
        $monday = $this->nextWeekday(1);

        BlockedDate::create([
            'id'   => (string) Str::ulid(),
            'date' => $monday,
        ]);

        $res = $this->actingAs($this->user)->getJson("/api/availability?date={$monday}&serviceId={$this->service->id}");

        $res->assertOk()
            ->assertJsonPath('data.available', false)
            ->assertJsonPath('data.slots', []);
    }

    /** @test */
    public function availability_generates_correct_number_of_slots(): void
    {
        // Horario 09:00-18:00 con servicio de 60 min = 9 slots (9,10,11,12,13,14,15,16,17)
        $this->createDefaultSchedules();
        $monday = $this->nextWeekday(1);

        $res = $this->actingAs($this->user)->getJson("/api/availability?date={$monday}&serviceId={$this->service->id}");

        $slots = $res->json('data.slots');
        $this->assertCount(9, $slots, 'Debe haber exactamente 9 slots de 60 minutos entre 09:00 y 18:00');
        $this->assertEquals('09:00', $slots[0]['time']);
        $this->assertEquals('17:00', $slots[8]['time']);
    }

    /** @test */
    public function availability_respects_custom_schedule_hours(): void
    {
        // El admin cambia el horario del lunes a 10:00-14:00
        $this->createSchedule(1, true, '10:00', '14:00');
        $monday = $this->nextWeekday(1);

        $res = $this->actingAs($this->user)->getJson("/api/availability?date={$monday}&serviceId={$this->service->id}");

        $slots = $res->json('data.slots');
        // 10:00, 11:00, 12:00, 13:00 = 4 slots de 60 min
        $this->assertCount(4, $slots);
        $this->assertEquals('10:00', $slots[0]['time']);
        $this->assertEquals('13:00', $slots[3]['time']);
    }

    /** @test */
    public function availability_returns_no_slots_for_disabled_weekday(): void
    {
        // Admin desactiva el viernes
        for ($d = 0; $d <= 6; $d++) {
            $this->createSchedule($d, $d >= 1 && $d <= 4); // solo L-J activos
        }
        $friday = $this->nextWeekday(5);

        $res = $this->actingAs($this->user)->getJson("/api/availability?date={$friday}&serviceId={$this->service->id}");

        $res->assertOk()
            ->assertJsonPath('data.available', false);
    }

    /** @test */
    public function availability_slot_labels_are_in_12h_format(): void
    {
        $this->createDefaultSchedules();
        $monday = $this->nextWeekday(1);

        $res = $this->actingAs($this->user)->getJson("/api/availability?date={$monday}&serviceId={$this->service->id}");

        $slots = $res->json('data.slots');
        $this->assertNotEmpty($slots);

        // Los labels deben contener AM o PM
        foreach ($slots as $slot) {
            $this->assertMatchesRegularExpression('/\d+:\d{2} (AM|PM)/', $slot['label']);
        }

        // 9:00 debe ser "9:00 AM", 17:00 debe ser "5:00 PM"
        $this->assertEquals('9:00 AM', $slots[0]['label']);
        $this->assertEquals('5:00 PM', $slots[8]['label']);
    }
}
