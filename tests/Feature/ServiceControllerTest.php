<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ServiceControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->client = User::factory()->create(['role' => 'client']);
    }

    /** @test */
    public function test_client_can_see_active_services(): void
    {
        Service::create([
            'id' => (string) Str::ulid(),
            'name' => 'Active Service',
            'duration_minutes' => 30,
            'price' => 20,
            'category' => 'test',
            'is_active' => true,
        ]);

        Service::create([
            'id' => (string) Str::ulid(),
            'name' => 'Inactive Service',
            'duration_minutes' => 30,
            'price' => 20,
            'category' => 'test',
            'is_active' => false,
        ]);

        $response = $this->actingAs($this->client)->getJson('/api/services');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Active Service');
    }

    /** @test */
    public function test_admin_can_see_all_services_with_all_flag(): void
    {
        Service::create([
            'id' => (string) Str::ulid(),
            'name' => 'Inactive Service',
            'duration_minutes' => 30,
            'price' => 20,
            'category' => 'test',
            'is_active' => false,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/services?all=true');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Inactive Service');
    }

    /** @test */
    public function test_only_admin_can_store_service(): void
    {
        $data = [
            'name' => 'New Service',
            'durationMinutes' => 45,
            'price' => 100,
            'category' => 'surgery',
        ];

        // Client attempt
        $this->actingAs($this->client)->postJson('/api/services', $data)->assertStatus(403);

        // Admin attempt
        $response = $this->actingAs($this->admin)->postJson('/api/services', $data);
        $response->assertStatus(201);
        $this->assertDatabaseHas('services', ['name' => 'New Service']);
    }

    /** @test */
    public function test_admin_can_update_service(): void
    {
        $service = Service::create([
            'id' => (string) Str::ulid(),
            'name' => 'Old Name',
            'duration_minutes' => 30,
            'price' => 20,
            'category' => 'test',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/services/{$service->id}", [
            'name' => 'Updated Name',
            'price' => 50
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Updated Name', $service->fresh()->name);
        $this->assertEquals(50, $service->fresh()->price);
    }

    /** @test */
    public function test_admin_can_delete_service(): void
    {
        $service = Service::create([
            'id' => (string) Str::ulid(),
            'name' => 'To Be Deleted',
            'duration_minutes' => 30,
            'price' => 20,
            'category' => 'test',
            'is_active' => true,
        ]);

        $this->actingAs($this->admin)->deleteJson("/api/services/{$service->id}")->assertStatus(200);
        $this->assertDatabaseMissing('services', ['id' => $service->id]);
    }
}
