<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class NotifyAdminsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $title;
    protected string $message;
    protected string $type;
    protected array $data;

    /**
     * Creamos una nueva instancia del Job.
     * Este Job encapsula la lógica de notificación a administradores para ser procesada en la cola (queue).
     *
     * @param string $title Título de la notificación.
     * @param string $message Mensaje detallado.
     * @param string $type Tipo de notificación (ej. 'new_appointment', 'new_message').
     * @param array $data Metadatos adicionales (ej. ['appointment_id' => ...]).
     */
    public function __construct(string $title, string $message, string $type, array $data = [])
    {
        $this->title = $title;
        $this->message = $message;
        $this->type = $type;
        $this->data = $data;
    }

    /**
     * Intenta despachar el Job de forma asíncrona en la cola de trabajo.
     * Si falla debido a problemas con la conexión del driver de colas (ej. Redis offline),
     * captura el error, registra un aviso y ejecuta la lógica de forma síncrona/inmediata.
     */
    public static function dispatchSafe(string $title, string $message, string $type, array $data = []): void
    {
        try {
            // Intentamos despachar normalmente a la cola
            self::dispatch($title, $message, $type, $data);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("No se pudo despachar NotifyAdminsJob a la cola (" . $e->getMessage() . "). Ejecutando de forma síncrona.");
            try {
                // Caída segura síncrona
                $job = new self($title, $message, $type, $data);
                $job->handle();
            } catch (\Throwable $innerException) {
                \Illuminate\Support\Facades\Log::error("Fallo catastrófico al procesar notificación de forma síncrona: " . $innerException->getMessage());
            }
        }
    }

    /**
     * Ejecuta el Job.
     * Consulta todos los usuarios con rol 'admin' y realiza las inserciones en la tabla de notificaciones.
     * Al ejecutarse de forma asíncrona, elimina el cuello de botella del loop síncrono en el request HTTP principal.
     */
    public function handle(): void
    {
        // Usamos insert() masivo para evitar el problema de N+1 que teníamos
        // con el create() dentro del bucle. Esto reduce drásticamente la carga en la BD.
        // Como insert() no dispara eventos de Eloquent, generamos los ULIDs a mano aquí mismo.
        $now = now();
        $notifications = User::whereIn('role', ['admin', 'receptionist'])->pluck('id')
            ->map(fn($id) => [
                'id'         => (string) \Illuminate\Support\Str::ulid(),
                'user_id'    => $id,
                'title'      => $this->title,
                'message'    => $this->message,
                'type'       => $this->type,
                'data'       => json_encode($this->data),
                'created_at' => $now,
                'updated_at' => $now,
            ])->toArray();

        Notification::insert($notifications);
    }
}

