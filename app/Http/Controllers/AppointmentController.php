<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Pet;
use App\Models\Service;
use App\Models\BlockedDate;
use App\Models\Schedule;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentRequest;
use App\Services\AppointmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class AppointmentController extends Controller
{
    protected $appointmentService;

    /**
     * Inyección del servicio AppointmentService para encapsular la lógica compleja de negocio.
     */
    public function __construct(AppointmentService $appointmentService)
    {
        $this->appointmentService = $appointmentService;
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

        // Búsquedas y filtros comunes
        if ($request->status) {
            $statuses = is_array($request->status) ? $request->status : explode(',', $request->status);
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

        // Mapeo usando la función centralizada en el servicio (ex-duplicación de recursos)
        $mappedAppointments = $appointments->map(fn($apt) => $this->appointmentService->mapAppointment($apt));

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

    /**
     * Guarda una nueva cita utilizando Form Request para validación y Service Layer para lógica de negocio.
     */
    public function store(StoreAppointmentRequest $request)
    {
        try {
            $appointment = $this->appointmentService->createAppointment($request->validated(), $request->user());

            return response()->json([
                'success' => true,
                'data'    => $this->appointmentService->mapAppointment($appointment)
            ], 201);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], $e->getStatusCode());
        }
    }

    /**
     * Muestra el detalle de una cita específica.
     */
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

        // Mapeo unificado con adición de notas clínicas específicas para la vista detallada
        $mappedAppointment = $this->appointmentService->mapAppointment($appointment);
        $mappedAppointment['clinicalNotesRecords'] = $appointment->clinicalNotes->map(fn($cn) => [
            'id'        => $cn->id,
            'note'      => $cn->note,
            'diagnosis' => $cn->diagnosis,
            'treatment' => $cn->treatment,
            'followUp'  => $cn->follow_up,
            'createdAt' => $cn->created_at,
            'updatedAt' => $cn->updated_at,
        ]);

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

    /**
     * Actualiza los datos de una cita aplicando Form Request y reglas de negocio dinámicas por roles.
     */
    public function update(UpdateAppointmentRequest $request, $id)
    {
        $appointment = Appointment::findOrFail($id);
        $user = $request->user();

        // Seguridad: Verificar autorización básica
        if ($user->role !== 'admin' && $appointment->user_id !== $user->id) {
            abort(403, 'No autorizado');
        }

        // Definir campos editables según el rol del usuario
        $allowedFields = [
            'notes', 
            'rating', 
            'review', 
            'cancel_reason', 
            'cancelled_at'
        ];

        // Solo el administrador, recepcionista o el médico asignado pueden cambiar el estado.
        if (in_array($user->role, ['admin', 'receptionist', 'doctor'])) {
            $allowedFields[] = 'status';
        }

        // Solo personal administrativo (admin, recepcionista) puede gestionar pagos.
        if (in_array($user->role, ['admin', 'receptionist'])) {
            $allowedFields[] = 'payment_method';
            $allowedFields[] = 'payment_status';
            $allowedFields[] = 'payment_amount';
        }

        // Capturar el status antes de la actualización
        $originalStatus = $appointment->status;

        // Actualizar solo los campos permitidos y mapear camelCase a snake_case de forma explícita
        $data = $request->only($allowedFields);
        if (in_array($user->role, ['admin', 'receptionist'])) {
            if ($request->has('paymentMethod')) $data['payment_method'] = $request->paymentMethod;
            if ($request->has('paymentStatus')) $data['payment_status'] = $request->paymentStatus;
            if ($request->has('paymentAmount')) $data['payment_amount'] = $request->paymentAmount;
        }
        if ($request->has('cancelReason'))  $data['cancel_reason']  = $request->cancelReason;

        $appointment->update($data);

        // Registrar cambios de estado en el historial de status
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

        // Registrar la fecha de pago si se actualiza a 'paid'
        if (in_array($user->role, ['admin', 'receptionist'])) {
            if ($request->has('paymentStatus') && $request->paymentStatus === 'paid' && !$appointment->paid_at) {
                $appointment->update(['paid_at' => now()]);
            }
        }

        // Enviar notificación al confirmar una cita
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

        return response()->json([
            'success' => true,
            'data'    => $this->appointmentService->mapAppointment($appointment)
        ]);
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