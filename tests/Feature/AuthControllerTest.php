<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
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

    // ─── Pruebas de Recuperación de Contraseña (Password Reset) ─────────────

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

    // ─── Pruebas de Verificación de Email (Email Verification) ───────────────

    public function test_guest_cannot_access_email_verification_notice()
    {
        $response = $this->get('/email/verify');
        $response->assertRedirect('/login');
    }

    public function test_user_can_access_email_verification_notice()
    {
        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Alice Smith',
            'email'    => 'alice@example.com',
            'password' => Hash::make('password'),
            'role'     => 'client',
        ]);

        $response = $this->actingAs($user)->get('/email/verify');
        $response->assertStatus(200);
    }

    public function test_user_can_resend_verification_notification()
    {
        NotificationFacade::fake();

        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Alice Smith',
            'email'    => 'alice@example.com',
            'password' => Hash::make('password'),
            'role'     => 'client',
        ]);

        $response = $this->actingAs($user)->post('/email/verification-notification');

        $response->assertStatus(302);
        NotificationFacade::assertSentTo($user, VerifyEmail::class);
    }

    public function test_user_can_verify_email_via_signed_url()
    {
        $user = User::forceCreate([
            'id'                => (string) Str::ulid(),
            'name'              => 'Alice Smith',
            'email'             => 'alice@example.com',
            'password'          => Hash::make('password'),
            'role'              => 'client',
            'email_verified_at' => null,
        ]);

        $verificationUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $response = $this->actingAs($user)->get($verificationUrl);

        $response->assertRedirect('/client/pets');
        
        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }
}
