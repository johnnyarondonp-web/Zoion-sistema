<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Pet;
use App\Models\Service;
use App\Models\BlockedDate;
use App\Models\Schedule;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class AppointmentController extends Controller
{
    private function hasCapacityFor(string $serviceId, string $date, string $startTime, string $endTime): bool
    {
        $doctorIds = \Illuminate\Support\Facades\DB::table('doctor_services')
            ->join('doctors', 'doctors.id', '=', 'doctor_services.doctor_id')
            ->where('doctor_services.service_id', $serviceId)
            ->where('doctors.is_active', true)
            ->pluck('doctor_services.doctor_id');

        $totalDoctors = $doctorIds->count();

        if ($totalDoctors > 0) {
            $busyFromAppts = Appointment::where('date', $date)
                ->whereIn('status', ['pending', 'confirmed'])
                ->whereIn('doctor_id', $doctorIds)
                ->where('start_time', '<', $endTime)
                ->where('end_time', '>', $startTime)
                ->distinct('doctor_id')
                ->count('doctor_id');

            $busyFromWalkIns = \App\Models\WalkInAppointment::where('date', $date)
                ->whereIn('status', ['pending', 'confirmed'])
                ->whereIn('doctor_id', $doctorIds)
                ->where('start_time', '<', $endTime)
                ->where('end_time', '>', $startTime)
                ->distinct('doctor_id')
                ->count('doctor_id');

            return ($busyFromAppts + $busyFromWalkIns) < $totalDoctors;
        }

        // Si no hay doctores asignados a este servicio, la capacidad es CERO.
        return false;
    }

    private function timeToMinutes(string $time): int
    {
        [$h, $m] = explode(':', $time);
        return (int)$h * 60 + (int)$m;
    }

    private function minutesToTime(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Appointment::with(['pet', 'service', 'doctor']);

        // Seguridad: Filtrar según el rol del usuario
        if ($user->role === 'admin' || $user->role === 'receptionist') {
            // Personal administrativo ve todo
            $query->with(['user:id,name,email,phone'])
                  ->withCount(['messages as unread_messages' => function ($query) {
                      $query->where('is_read_by_admin', false);
                  }]);
        } elseif ($user->role === 'doctor') {
            // El médico solo ve las citas que tiene asignadas
            $doctorId = $user->doctor?->id;
            if ($doctorId) {
                $query->where('doctor_id', $doctorId)
                      ->with(['user:id,name,email,phone'])
                      ->withCount(['messages as unread_messages' => function ($query) {
                          $query->where('is_read_by_admin', false);
                      }]);
            } else {
                $query->whereRaw('1 = 0');
            }
        } else {
            // El cliente solo ve sus propias citas
            $query->where('user_id', $user->id)
                  ->withCount(['messages as unread_messages' => function ($query) {
                      $query->where('is_read_by_client', false);
                  }]);
        }

        // Filtros opcionales
        if ($request->status) {
            $statuses = explode(',', $request->status);
            $query->whereIn('status', $statuses);
        }
        if ($request->petId)     $query->where('pet_id', $request->petId);
        if ($request->serviceId) $query->where('service_id', $request->serviceId);
        if ($request->date)      $query->where('date', $request->date);
        if ($request->dateFrom)  $query->where('date', '>=', $request->dateFrom);
        if ($request->dateTo)    $query->where('date', '<=', $request->dateTo);

        $page  = (int) $request->query('page', 1);
        $limit = (int) $request->query('limit', 15);
        
       
        $total = $query->count();
        $appointments = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $limit)->take($limit)->get();

        $mappedAppointments = $appointments->map(fn($apt) => [
            'id'            => $apt->id,
            'date'          => $apt->date,
            'startTime'     => $apt->start_time,
            'endTime'       => $apt->end_time,
            'status'        => $apt->status,
            'notes'         => $apt->notes,
            'statusHistory' => $apt->status_history,
            'cancelledAt'   => $apt->cancelled_at,
            'cancelReason'  => $apt->cancel_reason,
            'rating'        => $apt->rating,
            'review'        => $apt->review,
            'unreadMessages'=> $apt->unread_messages ?? 0,
            'pet' => $apt->pet ? [
                'id'        => $apt->pet->id,
                'name'      => $apt->pet->name,
                'photo'     => $apt->pet->photo,
                'species'   => $apt->pet->species,
                'breed'     => $apt->pet->breed,
                'gender'    => $apt->pet->gender,
                'birthdate' => $apt->pet->birthdate,
                'weight'    => $apt->pet->weight,
            ] : null,
            'service' => $apt->service ? [
                'id'              => $apt->service->id,
                'name'            => $apt->service->name,
                'price'           => $apt->service->price,
                'durationMinutes' => $apt->service->duration_minutes,
            ] : null,
            'user' => $apt->relationLoaded('user') && $apt->user ? [
                'id'    => $apt->user->id,
                'name'  => $apt->user->name,
                'email' => $apt->user->email,
                'phone' => $apt->user->phone,
            ] : null,
            'doctor' => $apt->doctor ? [
                'id'   => $apt->doctor->id,
                'name' => $apt->doctor->name,
            ] : null,
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'appointments' => $mappedAppointments,
                'pagination'   => [
                    'page'       => $page,
                    'limit'      => $limit,
                    'total'      => $total,
                    'totalPages' => ceil($total / $limit),
                ],
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'petId'         => 'required|string',
            'serviceId'     => 'required|string',
            'date'          => 'required|date_format:Y-m-d',
            'startTime'     => 'required|date_format:H:i',
            'userId'        => 'nullable|string|exists:users,id',
            'paymentMethod' => 'nullable|string|in:cash,transfer,card,pago_movil',
        ]);

        $user    = $request->user();
        $isStaff = in_array($user->role, ['admin', 'receptionist']);

        // El staff puede agendar para otro cliente. Un cliente siempre agenda para sí mismo.
        $targetUserId = ($isStaff && $request->userId) ? $request->userId : $user->id;

        // Validación de tiempo (2 horas de anticipación) — solo para clientes, no para el staff
        if (!$isStaff) {
            $appointmentDateTime = \Carbon\Carbon::createFromFormat(
                'Y-m-d H:i', $request->date . ' ' . $request->startTime
            );
            if ($appointmentDateTime->lt(now()->addHours(2))) {
                return response()->json(['success' => false, 'error' => 'Las citas deben reservarse con al menos 2 horas de anticipación'], 400);
            }
        }

        // Verificar propiedad de la mascota respecto al usuario destino
        $pet = Pet::findOrFail($request->petId);
        if ($pet->user_id !== $targetUserId) {
            return response()->json(['success' => false, 'error' => 'La mascota no pertenece al cliente indicado'], 403);
        }
        if (!$pet->is_active) return response()->json(['success' => false, 'error' => 'La mascota no está activa'], 400);

        // Verificar disponibilidad del servicio
        $service = Service::findOrFail($request->serviceId);
        if (!$service->is_active) return response()->json(['success' => false, 'error' => 'El servicio no está disponible'], 400);

        $endTime = $this->minutesToTime($this->timeToMinutes($request->startTime) + $service->duration_minutes);

        // Verificar fechas bloqueadas
        if (BlockedDate::where('date', $request->date)->exists()) {
            return response()->json(['success' => false, 'error' => 'Esta fecha está bloqueada por la clínica'], 400);
        }

        // Verificar horario laboral
        $dayOfWeek = \Carbon\Carbon::parse($request->date)->dayOfWeek;
        $schedule  = Schedule::where('day_of_week', $dayOfWeek)->first();
        if (!$schedule || !$schedule->is_available) {
            return response()->json(['success' => false, 'error' => 'No hay horario disponible para este día'], 400);
        }

        $startMinutes = $this->timeToMinutes($request->startTime);
        $endMinutes   = $startMinutes + $service->duration_minutes;
        $openMinutes  = $this->timeToMinutes($schedule->open_time);
        $closeMinutes = $this->timeToMinutes($schedule->close_time);

        if ($startMinutes < $openMinutes || $endMinutes > $closeMinutes) {
            return response()->json([
                'success' => false,
                'error'   => "El horario solicitado está fuera del horario de atención ({$schedule->open_time} – {$schedule->close_time})"
            ], 400);
        }

        $source = ($isStaff && $request->userId && $request->userId !== $user->id) ? 'admin_booked' : 'online';

        $lockKey = "appointment_lock_{$request->date}_{$request->startTime}";
        $lock = Cache::lock($lockKey, 10);

        try {
            // Esperar hasta 5 segundos para obtener el bloqueo
            $lock->block(5);

            // Re-verificar capacidad dentro del bloqueo
            if (!$this->hasCapacityFor($request->serviceId, $request->date, $request->startTime, $endTime)) {
                return response()->json(['success' => false, 'error' => 'Este horario ya no está disponible'], 409);
            }

            // Asignar el médico con menos citas activas ese día para este servicio.
            $assignedDoctorId = null;
            $availableDoctors = \App\Models\Doctor::whereHas('services', fn ($q) => $q->where('services.id', $request->serviceId))
                ->where('is_active', true)
                ->withCount(['appointments as today_count' => fn ($q) => $q
                    ->where('date', $request->date)
                    ->whereIn('status', ['pending', 'confirmed'])
                ])
                ->orderBy('today_count')
                ->get();

            if ($availableDoctors->isNotEmpty()) {
                $assignedDoctorId = $availableDoctors->first()->id;
            } else {
                return response()->json(['success' => false, 'error' => 'No hay médicos disponibles para este servicio'], 409);
            }

            $appointment = Appointment::create([
                'id'             => (string) Str::ulid(),
                'user_id'        => $targetUserId,
                'pet_id'         => $request->petId,
                'service_id'     => $request->serviceId,
                'doctor_id'      => $assignedDoctorId,
                'source'         => $source,
                'date'           => $request->date,
                'start_time'     => $request->startTime,
                'end_time'       => $endTime,
                'status'         => 'pending',
                'notes'          => $request->notes ? trim($request->notes) : null,
                'status_history' => [['status' => 'pending', 'date' => now()->toISOString()]],
                'payment_method' => $request->paymentMethod,
                'payment_status' => 'pending',
            ]);
        } catch (\Illuminate\Contracts\Cache\LockTimeoutException $e) {
            return response()->json(['success' => false, 'error' => 'El sistema está procesando demasiadas solicitudes, por favor intenta de nuevo en unos segundos.'], 408);
        } finally {
            $lock?->release();
        }

        // Notificar según quién agendó: si el staff agendó para un cliente, el cliente recibe la notificación.
        if ($source === 'admin_booked') {
            \App\Models\Notification::create([
                'user_id' => $targetUserId,
                'title'   => 'Cita agendada por la clínica',
                'message' => "La clínica ha agendado una cita para {$pet->name} el {$appointment->date} a las {$appointment->start_time}.",
                'type'    => 'new_appointment',
                'data'    => ['appointment_id' => $appointment->id],
            ]);
        } else {
            $admins = \App\Models\User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                \App\Models\Notification::create([
                    'user_id' => $admin->id,
                    'title'   => 'Nueva cita solicitada',
                    'message' => "{$user->name} solicitó una cita para {$pet->name} el {$appointment->date} a las {$appointment->start_time}.",
                    'type'    => 'new_appointment',
                    'data'    => ['appointment_id' => $appointment->id],
                ]);
            }
        }

        // Notificar al doctor asignado
        if ($assignedDoctorId) {
            $assignedDoctor = \App\Models\Doctor::find($assignedDoctorId);
            if ($assignedDoctor && $assignedDoctor->user_id) {
                \App\Models\Notification::create([
                    'user_id' => $assignedDoctor->user_id,
                    'title'   => 'Nuevo paciente asignado',
                    'message' => "Se te ha asignado un paciente ({$pet->name}) para el {$appointment->date} a las {$appointment->start_time}.",
                    'type'    => 'new_appointment',
                    'data'    => ['appointment_id' => $appointment->id],
                ]);
            }
        }

        $appointment->load(['pet', 'service']);

        $mappedAppointment = [
            'id'            => $appointment->id,
            'date'          => $appointment->date,
            'startTime'     => $appointment->start_time,
            'endTime'       => $appointment->end_time,
            'status'        => $appointment->status,
            'notes'         => $appointment->notes,
            'statusHistory' => $appointment->status_history,
            'cancelledAt'   => $appointment->cancelled_at,
            'cancelReason'  => $appointment->cancel_reason,
            'rating'        => $appointment->rating,
            'review'        => $appointment->review,
            'paymentMethod' => $appointment->payment_method,
            'paymentStatus' => $appointment->payment_status,
            'pet' => $appointment->pet ? [
                'id'      => $appointment->pet->id,
                'name'    => $appointment->pet->name,
                'photo'   => $appointment->pet->photo,
                'species' => $appointment->pet->species,
                'breed'   => $appointment->pet->breed,
            ] : null,
            'service' => $appointment->service ? [
                'id'              => $appointment->service->id,
                'name'            => $appointment->service->name,
                'price'           => $appointment->service->price,
                'durationMinutes' => $appointment->service->duration_minutes,
            ] : null,
        ];

        return response()->json(['success' => true, 'data' => $mappedAppointment], 201);
    }


    public function show(Request $request, $id)
    {
        $appointment = Appointment::with(['pet', 'service', 'user:id,name,email,phone', 'clinicalNotes', 'doctor'])->findOrFail($id);
        $user = $request->user();

        // Seguridad: El usuario debe ser el dueño, el médico asignado o personal administrativo.
        $isClientOwner = $appointment->user_id === $user->id;
        $isAssignedDoc = ($user->role === 'doctor' && $user->doctor?->id !== null && $appointment->doctor_id === $user->doctor?->id);
        $isStaff       = in_array($user->role, ['admin', 'receptionist']);

        if (!$isClientOwner && !$isAssignedDoc && !$isStaff) {
            abort(403, 'No tienes permiso para ver esta cita.');
        }

        $mappedAppointment = [
            'id'            => $appointment->id,
            'date'          => $appointment->date,
            'startTime'     => $appointment->start_time,
            'endTime'       => $appointment->end_time,
            'status'        => $appointment->status,
            'notes'         => $appointment->notes,
            'statusHistory' => $appointment->status_history,
            'cancelledAt'   => $appointment->cancelled_at,
            'cancelReason'  => $appointment->cancel_reason,
            'rating'        => $appointment->rating,
            'review'        => $appointment->review,
            'pet' => $appointment->pet ? [
                'id'        => $appointment->pet->id,
                'name'      => $appointment->pet->name,
                'photo'     => $appointment->pet->photo,
                'species'   => $appointment->pet->species,
                'breed'     => $appointment->pet->breed,
                'gender'    => $appointment->pet->gender,
                'birthdate' => $appointment->pet->birthdate,
                'weight'    => $appointment->pet->weight,
            ] : null,
            'service' => $appointment->service ? [
                'id'              => $appointment->service->id,
                'name'            => $appointment->service->name,
                'price'           => $appointment->service->price,
                'durationMinutes' => $appointment->service->duration_minutes,
            ] : null,
            'user' => $appointment->relationLoaded('user') && $appointment->user ? [
                'id'    => $appointment->user->id,
                'name'  => $appointment->user->name,
                'email' => $appointment->user->email,
                'phone' => $appointment->user->phone,
            ] : null,
            'doctor' => $appointment->doctor ? [
                'id'   => $appointment->doctor->id,
                'name' => $appointment->doctor->name,
            ] : null,
            'clinicalNotesRecords' => $appointment->clinicalNotes->map(fn($cn) => [
                'id'        => $cn->id,
                'note'      => $cn->note,
                'diagnosis' => $cn->diagnosis,
                'treatment' => $cn->treatment,
                'followUp'  => $cn->follow_up,
                'createdAt' => $cn->created_at,
                'updatedAt' => $cn->updated_at,
            ]),
        ];

        return response()->json(['success' => true, 'data' => $mappedAppointment]);
    }

    public function clinicInfo()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'name'    => config('app.name', 'Zoion'),
                'address' => config('clinic.address', ''),
                'phone'   => config('clinic.phone', ''),
                'email'   => config('clinic.email', ''),
                'logo'    => config('clinic.logo', null),
            ]
        ]);
    }

    public function update(Request $request, $id)
    {
        $appointment = Appointment::findOrFail($id);
        $user = $request->user();

        // Seguridad: Verificar autorización
        if ($user->role !== 'admin' && $appointment->user_id !== $user->id) {
            abort(403, 'No autorizado');
        }

        // 🔐 CORRECCIÓN DE SEGURIDAD: Definir campos editables según el rol
        // Los clientes NO pueden cambiar el estado ('status') directamente
        $allowedFields = [
            'notes', 
            'rating', 
            'review', 
            'cancel_reason', 
            'cancelled_at'
        ];

        // Solo el administrador, recepcionista o el médico asignado pueden cambiar el estado.
        // Los médicos necesitan esto para marcar citas como completadas tras la consulta.
        if (in_array($user->role, ['admin', 'receptionist', 'doctor'])) {
            $allowedFields[] = 'status';
        }

        // Solo personal administrativo (admin, recepcionista) puede gestionar pagos.
        // Los médicos no deben tocar la parte financiera de las citas.
        if (in_array($user->role, ['admin', 'receptionist'])) {
            $allowedFields[] = 'payment_method';
            $allowedFields[] = 'payment_status';
            $allowedFields[] = 'payment_amount';
        }

        // Capturar el status ANTES del update — después de update() getOriginal() ya devuelve el nuevo valor
        $originalStatus = $appointment->status;

        // Actualizar solo los campos permitidos
        $appointment->update($request->only($allowedFields));

        if ($request->has('status') && $request->status !== $originalStatus) {
            $history = is_string($appointment->status_history)
                ? json_decode($appointment->status_history, true)
                : $appointment->status_history;
            $history = is_array($history) ? $history : [];

            $appointment->update([
                'status_history' => array_merge(
                    $history,
                    [['status' => $request->status, 'date' => now()->toISOString()]]
                ),
            ]);
        }

        // El frontend manda estos campos en camelCase. La verificación de rol ya cubre
        // payment_method/payment_status en snake_case mediante $allowedFields, pero este
        // bloque los aplicaba sin importar quién era el usuario.
        // Solo administradores y recepcionistas pueden realizar modificaciones financieras.
        if (in_array($user->role, ['admin', 'receptionist'])) {
            if ($request->has('paymentMethod')) $appointment->update(['payment_method' => $request->paymentMethod]);
            if ($request->has('paymentStatus')) $appointment->update(['payment_status' => $request->paymentStatus]);
            if ($request->has('paymentAmount')) $appointment->update(['payment_amount' => $request->paymentAmount]);

            if ($request->has('paymentStatus') && $request->paymentStatus === 'paid' && !$appointment->paid_at) {
                $appointment->update(['paid_at' => now()]);
            }
        }


        if ($user->role === 'admin' && $request->has('status') && $request->status === 'confirmed') {
            \App\Models\Notification::create([
                'user_id' => $appointment->user_id,
                'title'   => 'Cita confirmada',
                'message' => "Tu cita ha sido confirmada para el {$appointment->date} a las {$appointment->start_time}.",
                'type'    => 'appointment_confirmed',
                'data'    => ['appointment_id' => $appointment->id],
            ]);
        }

        $appointment->load(['pet', 'service']);

        $mappedAppointment = [
            'id'            => $appointment->id,
            'date'          => $appointment->date,
            'startTime'     => $appointment->start_time,
            'endTime'       => $appointment->end_time,
            'status'        => $appointment->status,
            'notes'         => $appointment->notes,
            'statusHistory' => $appointment->status_history,
            'cancelledAt'   => $appointment->cancelled_at,
            'cancelReason'  => $appointment->cancel_reason,
            'rating'        => $appointment->rating,
            'review'        => $appointment->review,
            'paymentMethod' => $appointment->payment_method,
            'paymentStatus' => $appointment->payment_status,
            'paymentAmount' => $appointment->payment_amount,
            'paidAt'        => $appointment->paid_at,
            'pet' => $appointment->pet ? [
                'id'      => $appointment->pet->id,
                'name'    => $appointment->pet->name,
                'photo'   => $appointment->pet->photo,
                'species' => $appointment->pet->species,
                'breed'   => $appointment->pet->breed,
            ] : null,
            'service' => $appointment->service ? [
                'id'              => $appointment->service->id,
                'name'            => $appointment->service->name,
                'price'           => $appointment->service->price,
                'durationMinutes' => $appointment->service->duration_minutes,
            ] : null,
        ];

        return response()->json(['success' => true, 'data' => $mappedAppointment]);
    }

    public function rate(Request $request, $id)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'review' => 'nullable|string|max:500',
        ]);

        $appointment = Appointment::findOrFail($id);

        if ($appointment->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($appointment->status !== 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Solo puedes calificar citas completadas.',
            ], 422);
        }

        // Si ya tiene rating, no permitir sobreescribirlo. El cliente podría enviar
        // esta request dos veces (doble click, retry) y terminaríamos con ratings
        // distintos dependiendo del timing. Una calificación es definitiva.
        if (!is_null($appointment->rating)) {
            return response()->json([
                'success' => false,
                'message' => 'Esta cita ya fue calificada.',
            ], 422);
        }

        $appointment->update([
            'rating' => $request->rating,
            'review' => $request->review,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'rating' => $appointment->rating,
                'review' => $appointment->review,
            ],
        ]);
    }

    public function destroy(Request $request, $id)
    {
        // Seguridad: Solo admin puede eliminar
        abort_if($request->user()->role !== 'admin', 403);
        
        Appointment::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
}