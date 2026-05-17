<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'client']);
    }

    public function test_upload_rejects_jpg_with_malicious_php_or_invalid_binary_content()
    {
        Storage::fake('public');

        // Contenido malicioso PHP simulado
        $maliciousPhpContent = '<?php echo "shell exec"; ?>';
        
        // Creamos un archivo UploadedFile con extensión .jpg pero que en realidad es código PHP malicioso
        $fakeFile = UploadedFile::fake()->createWithContent(
            'malicious.jpg',
            $maliciousPhpContent
        );

        $response = $this->actingAs($this->user)->postJson('/api/upload', [
            'file' => $fakeFile,
        ]);

        // Debe ser rechazado por imagecreatefromstring() devolviendo 422
        $response->assertStatus(422);
        $response->assertJsonPath('success', false);
        $response->assertJsonPath('error', 'Imagen inválida');
    }

    public function test_upload_accepts_valid_image()
    {
        Storage::fake('public');

        // Generamos una imagen de verdad usando UploadedFile::fake()->image()
        $validImage = UploadedFile::fake()->image('valid.png', 100, 100);

        $response = $this->actingAs($this->user)->postJson('/api/upload', [
            'file' => $validImage,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        
        $url = $response->json('data.url');
        $filename = str_replace('/storage/', '', $url);
        
        Storage::disk('public')->assertExists($filename);
    }
}
