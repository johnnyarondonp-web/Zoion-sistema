<?php

namespace Tests\Unit;

use App\Jobs\NotifyAdminsJob;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotifyAdminsJobTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @test
     * Verifica que el job NotifyAdminsJob cree notificaciones correctamente
     * únicamente para los usuarios que poseen el rol de administrador,
     * ignorando a clientes y médicos.
     * 
     * Se usa insert() masivo con ULIDs autogenerados en lote para optimización de consultas.
     */
    public function test_handle_creates_notifications_for_all_admin_users()
    {
        // 1. Crear 3 administradores
        $admin1 = User::forceCreate([
            'id' => (string) Str::ulid(),
            'name' => 'Admin Uno',
            'email' => 'admin1@zoion.app',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);
        $admin2 = User::forceCreate([
            'id' => (string) Str::ulid(),
            'name' => 'Admin Dos',
            'email' => 'admin2@zoion.app',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);
        $admin3 = User::forceCreate([
            'id' => (string) Str::ulid(),
            'name' => 'Admin Tres',
            'email' => 'admin3@zoion.app',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        // 2. Crear un cliente regular (no debe recibir notificación)
        $client = User::forceCreate([
            'id' => (string) Str::ulid(),
            'name' => 'Cliente Perez',
            'email' => 'cliente@zoion.app',
            'password' => bcrypt('password'),
            'role' => 'client',
        ]);

        // 3. Definir los parámetros del Job
        $title = 'Nueva Cita Agendada';
        $message = 'El cliente Firulais ha reservado una cita para mañana.';
        $type = 'new_appointment';
        $data = ['appointment_id' => '01H7X1234567890ABCDEFGH999'];

        // 4. Instanciar y ejecutar el Job de forma síncrona
        $job = new NotifyAdminsJob($title, $message, $type, $data);
        $job->handle();

        // 5. Verificar que se insertaron las 3 notificaciones para los admins en la BD
        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin1->id,
            'title' => $title,
            'message' => $message,
            'type' => $type,
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin2->id,
            'title' => $title,
            'message' => $message,
            'type' => $type,
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin3->id,
            'title' => $title,
            'message' => $message,
            'type' => $type,
        ]);

        // 6. Verificar que la data se haya guardado y decodificado como array correctamente
        $notif1 = Notification::where('user_id', $admin1->id)->first();
        $this->assertNotNull($notif1);
        $this->assertEquals($data, $notif1->data);

        // 7. Asegurar que el cliente regular NO recibió ninguna notificación
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $client->id,
        ]);

        // 8. Asegurar que el total de notificaciones creadas es exactamente 3
        $this->assertEquals(3, Notification::count());
    }
}
