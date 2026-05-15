<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Pet;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminClientDetailTest extends TestCase
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
    public function test_client_detail_includes_pet_gender(): void
    {
        // Bug 2: el campo gender del pet debe estar presente en la respuesta.
        Pet::create([
            'id'      => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name'    => 'Luna',
            'species' => 'gato',
            'gender'  => 'hembra',
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/admin/clients/{$this->client->id}");

        $res->assertOk();
        $pets = $res->json('data.pets');
        $this->assertNotEmpty($pets);
        $this->assertArrayHasKey('gender', $pets[0]);
        $this->assertEquals('hembra', $pets[0]['gender']);
    }

    /** @test */
    public function test_client_detail_returns_null_gender_when_not_set(): void
    {
        Pet::create([
            'id'      => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name'    => 'Rex',
            'species' => 'perro',
            'gender'  => null,
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/admin/clients/{$this->client->id}");

        $res->assertOk();
        $this->assertNull($res->json('data.pets.0.gender'));
    }
}
