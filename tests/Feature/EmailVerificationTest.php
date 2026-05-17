<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Str;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

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
