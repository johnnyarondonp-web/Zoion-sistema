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
     * Ejecuta el Job.
     * Consulta todos los usuarios con rol 'admin' y realiza las inserciones en la tabla de notificaciones.
     * Al ejecutarse de forma asíncrona, elimina el cuello de botella del loop síncrono en el request HTTP principal.
     */
    public function handle(): void
    {
        $admins = User::where('role', 'admin')->get();

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'title'   => $this->title,
                'message' => $this->message,
                'type'    => $this->type,
                'data'    => $this->data,
            ]);
        }
    }
}
