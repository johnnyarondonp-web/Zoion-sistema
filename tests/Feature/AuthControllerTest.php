<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_correct_credentials()
    {
        $password = 'password123';
        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Test User',
            'email'    => 'test@example.com',
            'password' => Hash::make($password),
            'role'     => 'client',
        ]);

        $response = $this->post('/login', [
            'email'    => 'test@example.com',
            'password' => $password,
        ]);

        $response->assertStatus(302); // Redirects to /client/pets
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_fails_with_incorrect_credentials()
    {
        $response = $this->post('/login', [
            'email'    => 'nonexistent@example.com',
            'password' => 'wrong',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_user_can_register()
    {
        $response = $this->post('/register', [
            'name'     => 'New User',
            'email'    => 'new@example.com',
            'phone'    => '+58412123456',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(302);
        
        $this->assertDatabaseHas('users', [
            'email' => 'new@example.com',
            'role'  => 'client',
        ]);
    }
}
