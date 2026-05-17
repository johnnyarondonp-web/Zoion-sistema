<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Support\Str;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_access_forgot_password_form()
    {
        $response = $this->get('/forgot-password');
        $response->assertStatus(200);
    }

    public function test_user_can_request_password_reset_link()
    {
        NotificationFacade::fake();

        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Alice Smith',
            'email'    => 'alice@example.com',
            'password' => Hash::make('password'),
            'role'     => 'client',
        ]);

        $response = $this->post('/forgot-password', [
            'email' => 'alice@example.com',
        ]);

        $response->assertStatus(302);
        
        // Verificar que se haya creado el token en base de datos
        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'alice@example.com',
        ]);

        NotificationFacade::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_guest_can_access_reset_password_form_with_token()
    {
        $response = $this->get('/reset-password/sample-token');
        $response->assertStatus(200);
    }

    public function test_user_can_reset_password_with_valid_token()
    {
        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Alice Smith',
            'email'    => 'alice@example.com',
            'password' => Hash::make('old_password'),
            'role'     => 'client',
        ]);

        // Crear token válido de restablecimiento de contraseña
        $token = Password::createToken($user);

        $response = $this->post('/reset-password', [
            'token'                 => $token,
            'email'                 => 'alice@example.com',
            'password'              => 'new_password123',
            'password_confirmation' => 'new_password123',
        ]);

        $response->assertRedirect('/login');

        $user->refresh();
        $this->assertTrue(Hash::check('new_password123', $user->password));
    }
}
