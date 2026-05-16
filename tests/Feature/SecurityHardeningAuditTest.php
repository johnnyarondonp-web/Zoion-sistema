<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\Pet;
use App\Models\WalkInClient;
use App\Models\WalkInAppointment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SecurityHardeningAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->receptionist = User::factory()->create(['role' => 'receptionist']);
        $this->client = User::factory()->create(['role' => 'client']);
    }

    /** @test */
    public function receptionist_cannot_delete_clients()
    {
        $target = User::factory()->create(['role' => 'client']);
        
        $response = $this->actingAs($this->receptionist)->deleteJson("/api/admin/clients/{$target->id}");
        
        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }

    /** @test */
    public function admin_can_delete_clients()
    {
        $target = User::factory()->create(['role' => 'client']);
        
        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/clients/{$target->id}");
        
        $response->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    /** @test */
    public function walk_in_search_requires_7_characters()
    {
        $response = $this->actingAs($this->receptionist)->getJson('/api/admin/walk-in/search?phone=123');
        $response->assertJsonPath('data', null);
    }

    /** @test */
    public function appointment_message_length_is_capped_at_500()
    {
        $service = Service::create([
            'id' => (string) Str::ulid(),
            'name' => 'Test',
            'duration_minutes' => 30,
            'price' => 10,
            'category' => 'test',
            'is_active' => true
        ]);
        
        $pet = Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name' => 'Fido',
            'species' => 'dog',
            'is_active' => true
        ]);

        $appointment = Appointment::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'pet_id' => $pet->id,
            'service_id' => $service->id,
            'date' => now()->format('Y-m-d'),
            'start_time' => '10:00',
            'end_time' => '10:30',
            'status' => 'pending'
        ]);

        $longMessage = str_repeat('a', 501);

        $response = $this->actingAs($this->client)->postJson("/api/appointments/{$appointment->id}/messages", [
            'message' => $longMessage
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['message']);
    }
}
