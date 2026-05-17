<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
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

    public function test_authenticated_user_can_view_profile()
    {
        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Alice Smith',
            'email'    => 'alice@example.com',
            'phone'    => '+34600111222',
            'password' => Hash::make('password'),
            'role'     => 'client',
        ]);

        $response = $this->actingAs($user)->getJson('/api/user/profile');

        $response->assertStatus(200)
            ->assertJson([
                'id'    => $user->id,
                'name'  => 'Alice Smith',
                'email' => 'alice@example.com',
                'phone' => '+34600111222',
                'role'  => 'client',
            ]);
    }

    public function test_guest_cannot_view_profile()
    {
        $response = $this->getJson('/api/user/profile');
        $response->assertStatus(401);
    }

    public function test_user_can_update_profile()
    {
        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Alice Smith',
            'email'    => 'alice@example.com',
            'phone'    => '+34600111222',
            'password' => Hash::make('password'),
            'role'     => 'client',
        ]);

        $response = $this->actingAs($user)->patchJson('/api/user/profile', [
            'name'  => 'Alice Jones',
            'phone' => '+34600333444',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'name'  => 'Alice Jones',
                'phone' => '+34600333444',
            ]);

        $this->assertDatabaseHas('users', [
            'id'    => $user->id,
            'name'  => 'Alice Jones',
            'phone' => '+34600333444',
        ]);
    }

    public function test_user_cannot_update_profile_without_name()
    {
        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Alice Smith',
            'email'    => 'alice@example.com',
            'password' => Hash::make('password'),
            'role'     => 'client',
        ]);

        $response = $this->actingAs($user)->patchJson('/api/user/profile', [
            'name' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_user_can_change_password_with_valid_current_password()
    {
        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Alice Smith',
            'email'    => 'alice@example.com',
            'password' => Hash::make('old_password123'),
            'role'     => 'client',
        ]);

        $response = $this->actingAs($user)->postJson('/api/user/change-password', [
            'currentPassword' => 'old_password123',
            'newPassword'     => 'new_password456',
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Refrescar el modelo y verificar que la contraseña cambió
        $user->refresh();
        $this->assertTrue(Hash::check('new_password456', $user->password));
    }

    public function test_change_password_fails_if_current_password_is_incorrect()
    {
        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Alice Smith',
            'email'    => 'alice@example.com',
            'password' => Hash::make('old_password123'),
            'role'     => 'client',
        ]);

        $response = $this->actingAs($user)->postJson('/api/user/change-password', [
            'currentPassword' => 'wrong_current_password',
            'newPassword'     => 'new_password456',
        ]);

        $response->assertStatus(400)
            ->assertJson(['error' => 'Contraseña actual incorrecta']);

        $user->refresh();
        $this->assertFalse(Hash::check('new_password456', $user->password));
    }

    public function test_change_password_fails_if_new_password_is_too_short()
    {
        $user = User::forceCreate([
            'id'       => (string) Str::ulid(),
            'name'     => 'Alice Smith',
            'email'    => 'alice@example.com',
            'password' => Hash::make('old_password123'),
            'role'     => 'client',
        ]);

        $response = $this->actingAs($user)->postJson('/api/user/change-password', [
            'currentPassword' => 'old_password123',
            'newPassword'     => '123', // menos de 6 caracteres
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['newPassword']);
    }
}
