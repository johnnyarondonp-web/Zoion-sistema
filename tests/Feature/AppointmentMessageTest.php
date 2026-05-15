<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentMessage;
use App\Models\Notification;
use App\Models\Pet;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AppointmentMessageTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private User $admin;
    private Appointment $appointment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = User::factory()->create(['role' => 'client']);
        $this->admin  = User::factory()->create(['role' => 'admin']);

        $service = Service::create([
            'id' => (string) Str::ulid(), 'name' => 'Consulta', 'duration_minutes' => 30,
            'price' => 50, 'category' => 'consulta', 'is_active' => true,
        ]);

        $pet = Pet::create([
            'id'      => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name'    => 'Fido',
            'species' => 'perro',
        ]);

        $this->appointment = Appointment::create([
            'id'         => (string) Str::ulid(),
            'user_id'    => $this->client->id,
            'pet_id'     => $pet->id,
            'service_id' => $service->id,
            'date'       => now()->addDay()->format('Y-m-d'),
            'start_time' => '10:00',
            'end_time'   => '10:30',
            'status'     => 'confirmed',
        ]);
    }

    /** @test */
    public function test_client_message_response_includes_createdAt_in_camelCase(): void
    {
        // Bug 4: la respuesta debe usar createdAt, no created_at.
        $res = $this->actingAs($this->client)->postJson(
            "/api/appointments/{$this->appointment->id}/messages",
            ['message' => 'Hola, tengo una pregunta']
        );

        $res->assertStatus(201)->assertJsonPath('success', true);
        $this->assertArrayHasKey('createdAt', $res->json('data'));
        $this->assertArrayNotHasKey('created_at', $res->json('data'));
        // El valor debe ser parseable como fecha ISO
        $this->assertNotNull(new \DateTime($res->json('data.createdAt')));
    }

    /** @test */
    public function test_message_index_returns_createdAt_in_camelCase(): void
    {
        AppointmentMessage::create([
            'id'             => (string) Str::ulid(),
            'appointment_id' => $this->appointment->id,
            'user_id'        => $this->client->id,
            'message'        => 'Mensaje de prueba',
            'created_at'     => now(),
        ]);

        $res = $this->actingAs($this->client)->getJson("/api/appointments/{$this->appointment->id}/messages");

        $res->assertOk();
        $messages = $res->json('data');
        $this->assertNotEmpty($messages);
        $this->assertArrayHasKey('createdAt', $messages[0]);
    }

    /** @test */
    public function test_client_message_creates_notification_for_admin(): void
    {
        $this->actingAs($this->client)->postJson(
            "/api/appointments/{$this->appointment->id}/messages",
            ['message' => 'Tengo una duda sobre mi cita']
        );

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->admin->id,
            'type'    => 'new_message',
        ]);
    }

    /** @test */
    public function test_admin_message_creates_notification_for_client(): void
    {
        $this->actingAs($this->admin)->postJson(
            "/api/appointments/{$this->appointment->id}/messages",
            ['message' => 'Todo está en orden para tu cita']
        );

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->client->id,
            'type'    => 'new_message',
        ]);
    }

    /** @test */
    public function test_admin_can_mark_messages_as_read(): void
    {
        AppointmentMessage::create([
            'id'               => (string) Str::ulid(),
            'appointment_id'   => $this->appointment->id,
            'user_id'          => $this->client->id,
            'message'          => 'Hola',
            'created_at'       => now(),
            'is_read_by_admin' => false,
        ]);

        $res = $this->actingAs($this->admin)->patchJson(
            "/api/appointments/{$this->appointment->id}/messages/read"
        );

        $res->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseMissing('appointment_messages', [
            'appointment_id'   => $this->appointment->id,
            'is_read_by_admin' => false,
        ]);
    }

    /** @test */
    public function test_unread_messages_count_appears_in_dashboard_for_admin(): void
    {
        AppointmentMessage::create([
            'id'               => (string) Str::ulid(),
            'appointment_id'   => $this->appointment->id,
            'user_id'          => $this->client->id,
            'message'          => 'Sin leer',
            'created_at'       => now(),
            'is_read_by_admin' => false,
        ]);

        $res = $this->actingAs($this->admin)->getJson('/api/dashboard');

        $res->assertOk();
        $this->assertEquals(1, $res->json('data.unreadMessages'));
    }

    /** @test */
    public function test_client_cannot_mark_messages_as_read_for_admin(): void
    {
        AppointmentMessage::create([
            'id'               => (string) Str::ulid(),
            'appointment_id'   => $this->appointment->id,
            'user_id'          => $this->client->id,
            'message'          => 'Hola',
            'created_at'       => now(),
            'is_read_by_admin' => false,
            'is_read_by_client' => false,
        ]);

        $res = $this->actingAs($this->client)->patchJson(
            "/api/appointments/{$this->appointment->id}/messages/read"
        );
        $res->assertOk();
        
        // El admin debería seguir teniéndolo sin leer
        $this->assertDatabaseHas('appointment_messages', [
            'appointment_id'   => $this->appointment->id,
            'is_read_by_admin' => false,
        ]);
        
        // El cliente sí se marcó como leido
        $this->assertDatabaseHas('appointment_messages', [
            'appointment_id'   => $this->appointment->id,
            'is_read_by_client' => true,
        ]);
    }
}
