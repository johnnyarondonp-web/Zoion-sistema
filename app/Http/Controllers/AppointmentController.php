<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Pet;
use App\Models\Service;
use App\Models\BlockedDate;
use App\Models\Schedule;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AppointmentController extends Controller
{
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
        $query = Appointment::with(['pet', 'service']);

        // Seguridad: Filtrar por usuario si no es admin
        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        } else {
            $query->with(['user:id,name,email,phone']);
        }

        // Filtros opcionales
        if ($request->status)    $query->where('status', $request->status);
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
            'pet' => $apt->pet ? [
                'id'      => $apt->pet->id,
                'name'    => $apt->pet->name,
                'photo'   => $apt->pet->photo,
                'species' => $apt->pet->species,
                'breed'   => $apt->pet->breed,
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

        // Verificar solapamiento
        $overlap = Appointment::where('date', $request->date)
            ->whereIn('status', ['pending', 'confirmed'])
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $request->startTime)
            ->exists();

        if ($overlap) return response()->json(['success' => false, 'error' => 'Este horario coincide con otra cita existente'], 409);

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
        $endMinutes   = $startMinutes + $service->duration_minutes; // endTime ya calculado arriba
        $openMinutes  = $this->timeToMinutes($schedule->open_time);
        $closeMinutes = $this->timeToMinutes($schedule->close_time);

        if ($startMinutes < $openMinutes || $endMinutes > $closeMinutes) {
            return response()->json([
                'success' => false,
                'error'   => "El horario solicitado está fuera del horario de atención ({$schedule->open_time} – {$schedule->close_time})"
            ], 400);
        }

        // Asignar el médico con menos citas activas ese día para este servicio.
        // Si no hay doctores configurados aún, doctor_id queda null (retrocompatible).
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
        }

        $source = ($isStaff && $request->userId && $request->userId !== $user->id) ? 'admin_booked' : 'online';

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

        // Notificar según quién agendó: si el staff agendó para un cliente, el cliente recibe la notificación.
        if ($source === 'admin_booked') {
            \App\Models\Notification::create([
                'user_id' => $targetUserId,
                'title'   => 'Cita agendada por la clínica',
                'message' => "La clínica ha agendado una cita para {$pet->name} el {$appointment->date} a las {$appointment->start_time}.",
                'type'    => 'new_appointment',
            ]);
        } else {
            $admins = \App\Models\User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                \App\Models\Notification::create([
                    'user_id' => $admin->id,
                    'title'   => 'Nueva cita solicitada',
                    'message' => "{$user->name} solicitó una cita para {$pet->name} el {$appointment->date} a las {$appointment->start_time}.",
                    'type'    => 'new_appointment',
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
        $appointment = Appointment::with(['pet', 'service', 'user:id,name,email,phone', 'clinicalNotes'])->findOrFail($id);
        $user = $request->user();

        // Seguridad: Verificar que sea el dueño o admin
        if ($user->role !== 'admin' && $appointment->user_id !== $user->id) {
            abort(403, 'No autorizado');
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
            'user' => $appointment->relationLoaded('user') && $appointment->user ? [
                'id'    => $appointment->user->id,
                'name'  => $appointment->user->name,
                'email' => $appointment->user->email,
                'phone' => $appointment->user->phone,
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

        // Solo el administrador y recepcionista pueden cambiar estado y datos de pago
        if (in_array($user->role, ['admin', 'receptionist'])) {
            $allowedFields[] = 'status';
            $allowedFields[] = 'clinical_notes';
            $allowedFields[] = 'payment_method';
            $allowedFields[] = 'payment_status';
            $allowedFields[] = 'payment_amount';
        }

        // Actualizar solo los campos permitidos
        $appointment->update($request->only($allowedFields));

        // Manejar campos de pago en camelCase que vienen del frontend
        if ($request->has('paymentMethod')) $appointment->update(['payment_method' => $request->paymentMethod]);
        if ($request->has('paymentStatus')) $appointment->update(['payment_status' => $request->paymentStatus]);
        if ($request->has('paymentAmount')) $appointment->update(['payment_amount' => $request->paymentAmount]);

        // Registrar el momento exacto del pago aquí en lugar de confiar en el frontend
        if ($request->has('paymentStatus') && $request->paymentStatus === 'paid' && !$appointment->paid_at) {
            $appointment->update(['paid_at' => now()]);
        }

        if ($user->role === 'admin' && $request->has('status') && $request->status === 'confirmed') {
            \App\Models\Notification::create([
                'user_id' => $appointment->user_id,
                'title'   => 'Cita confirmada',
                'message' => "Tu cita ha sido confirmada para el {$appointment->date} a las {$appointment->start_time}.",
                'type'    => 'appointment_confirmed',
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

        // Solo el dueño de la cita puede calificar
        if ($appointment->user_id !== $request->user()->id) {
            abort(403);
        }

        // Solo se puede calificar una cita completada
        if ($appointment->status !== 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Solo puedes calificar citas completadas.',
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