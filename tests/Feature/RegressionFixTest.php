<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegressionFixTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that login is throttled.
     */
    public function test_login_is_throttled(): void
    {
        // 5 attempts allowed in 1 minute. 6th should fail.
        for ($i = 0; $i < 5; $i++) {
            $response = $this->post('/login', [
                'email' => 'test@example.com',
                'password' => 'password',
            ]);
            // The route might return 302 (redirect back) or 422 (validation error)
            // but it should NOT be 429 yet.
            $this->assertNotEquals(429, $response->getStatusCode(), "Attempt $i should not be throttled.");
        }

        $response = $this->post('/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(429);
    }

    /**
     * Test that registration is throttled.
     */
    public function test_register_is_throttled(): void
    {
        // 10 attempts allowed. 11th should fail.
        for ($i = 0; $i < 10; $i++) {
            $response = $this->post('/register', [
                'name' => 'Test User',
                'email' => "test{$i}@example.com",
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);
            $this->assertNotEquals(429, $response->getStatusCode(), "Attempt $i should not be throttled.");
        }

        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test_final@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(429);
    }

    /**
     * Test that client routes require client role.
     */
    public function test_client_routes_require_client_role(): void
    {
        // 1. Doctor should not access client routes
        $doctor = User::factory()->create(['role' => 'doctor']);
        $this->actingAs($doctor);
        $response = $this->get('/client/pets');
        $response->assertStatus(403);

        // 2. Admin should not access client routes
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        $response = $this->get('/client/pets');
        $response->assertStatus(403);

        // 3. Client SHOULD access client routes
        $client = User::factory()->create(['role' => 'client']);
        $this->actingAs($client);
        $response = $this->get('/client/pets');
        $response->assertStatus(200);
    }
}
