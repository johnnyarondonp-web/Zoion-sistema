<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_access_clinic_info()
    {
        $user = User::factory()->create(['role' => 'client']);

        $response = $this->actingAs($user)->getJson('/api/user/clinic-info');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => ['name', 'address', 'phone', 'email', 'logo']
            ]);
    }

    public function test_guest_cannot_access_clinic_info()
    {
        $response = $this->getJson('/api/user/clinic-info');
        $response->assertStatus(401);
    }
}
