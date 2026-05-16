<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\User;
use App\Models\ClinicalNote;
use App\Models\Appointment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PetControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = User::factory()->create(['role' => 'client']);
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    /** @test */
    public function test_client_can_only_see_their_own_pets(): void
    {
        $myPet = Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name' => 'My Dog',
            'species' => 'perro',
            'is_active' => true,
        ]);

        $otherUser = User::factory()->create(['role' => 'client']);
        $otherPet = Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $otherUser->id,
            'name' => 'Other Cat',
            'species' => 'gato',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->client)->getJson('/api/pets');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $myPet->id);
    }

    /** @test */
    public function test_admin_can_see_all_pets(): void
    {
        Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name' => 'Pet 1',
            'species' => 'perro',
            'is_active' => true,
        ]);

        $otherUser = User::factory()->create(['role' => 'client']);
        Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $otherUser->id,
            'name' => 'Pet 2',
            'species' => 'gato',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/pets');

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');
    }

    /** @test */
    public function test_pet_storage_requires_name_and_species(): void
    {
        $response = $this->actingAs($this->client)->postJson('/api/pets', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'species']);
    }

    /** @test */
    public function test_client_can_store_a_pet(): void
    {
        $data = [
            'name' => 'Rex',
            'species' => 'perro',
            'breed' => 'German Shepherd',
            'gender' => 'macho',
            'weight' => 25.5,
        ];

        $response = $this->actingAs($this->client)->postJson('/api/pets', $data);

        $response->assertStatus(201);
        $this->assertDatabaseHas('pets', [
            'name' => 'Rex',
            'user_id' => $this->client->id,
        ]);
    }

    /** @test */
    public function test_client_can_show_their_own_pet(): void
    {
        $pet = Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name' => 'Rex',
            'species' => 'perro',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->client)->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.name', 'Rex');
    }

    /** @test */
    public function test_client_cannot_show_other_users_pet(): void
    {
        $otherUser = User::factory()->create(['role' => 'client']);
        $otherPet = Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $otherUser->id,
            'name' => 'Stealthy Cat',
            'species' => 'gato',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->client)->getJson("/api/pets/{$otherPet->id}");

        $response->assertStatus(404);
    }

    /** @test */
    public function test_client_can_update_their_own_pet(): void
    {
        $pet = Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name' => 'Old Name',
            'species' => 'perro',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->client)->patchJson("/api/pets/{$pet->id}", [
            'name' => 'New Name'
        ]);

        $response->assertStatus(200);
        $this->assertEquals('New Name', $pet->fresh()->name);
    }

    /** @test */
    public function test_client_can_toggle_pet_active_status(): void
    {
        $pet = Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name' => 'Rex',
            'species' => 'perro',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->client)->patchJson("/api/pets/{$pet->id}/toggle");

        $response->assertStatus(200);
        $this->assertFalse($pet->fresh()->is_active);

        $this->actingAs($this->client)->patchJson("/api/pets/{$pet->id}/toggle");
        $this->assertTrue($pet->fresh()->is_active);
    }

    /** @test */
    public function test_health_summary_returns_all_clinical_data(): void
    {
        $pet = Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name' => 'Rex',
            'species' => 'perro',
            'is_active' => true,
        ]);

        $service = \App\Models\Service::create([
            'id' => (string) Str::ulid(),
            'name' => 'General Consultation',
            'duration_minutes' => 60,
            'price' => 50,
            'category' => 'consultation',
            'is_active' => true,
        ]);

        $appointment = Appointment::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'pet_id' => $pet->id,
            'service_id' => $service->id,
            'date' => now()->format('Y-m-d'),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'status' => 'confirmed',
        ]);

        $doctorUser = User::factory()->create(['role' => 'doctor']);
        $doctor = \App\Models\Doctor::create([
            'id' => (string) Str::ulid(),
            'user_id' => $doctorUser->id,
            'name' => 'Dr. Test',
            'specialty' => 'Test',
            'is_active' => true,
        ]);

        ClinicalNote::create([
            'id' => (string) Str::ulid(),
            'appointment_id' => $appointment->id,
            'doctor_id' => $doctor->id,
            'note' => 'Sample medical note',
        ]);

        $response = $this->actingAs($this->client)->getJson("/api/pets/{$pet->id}/health-summary");

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data.notes');
        $response->assertJsonPath('data.notes.0.note', 'Sample medical note');
    }
}
