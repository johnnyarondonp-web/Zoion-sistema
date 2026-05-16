<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminRestrictionAndValidationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that receptionists cannot manage services or staff.
     */
    public function test_receptionist_cannot_manage_services_or_staff(): void
    {
        $receptionist = User::factory()->create(['role' => 'receptionist']);
        $this->actingAs($receptionist);

        // 1. Try to create a service
        $response = $this->postJson('/api/services', [
            'name' => 'New Service',
            'durationMinutes' => 30,
            'price' => 100,
            'category' => 'consultation',
        ]);
        $response->assertStatus(403);

        // 2. Try to list doctors (CRUD complete includes index)
        $response = $this->getJson('/api/admin/doctors');
        $response->assertStatus(403);

        // 3. Try to list receptionists
        $response = $this->getJson('/api/admin/receptionists');
        $response->assertStatus(403);
    }

    /**
     * Test that admin can manage services.
     */
    public function test_admin_can_manage_services(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->postJson('/api/services', [
            'name' => 'Admin Service',
            'durationMinutes' => 60,
            'price' => 250,
            'category' => 'surgery',
        ]);
        
        $response->assertStatus(201);
        $this->assertEquals('Admin Service', $response->json('data.name'));
    }

    /**
     * Test that small images are rejected with 422.
     */
    public function test_small_images_are_rejected(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $this->actingAs($client);

        // Create a 50x50 black pixel image
        $image = imagecreatetruecolor(50, 50);
        ob_start();
        imagejpeg($image);
        $imageData = ob_get_clean();
        imagedestroy($image);
        $base64Image = 'data:image/jpeg;base64,' . base64_encode($imageData);

        $response = $this->postJson('/api/pets', [
            'name' => 'Tiny Pet',
            'species' => 'Dog',
            'photo' => $base64Image,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['photo']);
        $response->assertJsonFragment(['photo' => ['La imagen debe ser de al menos 100x100 píxeles']]);
    }
}
