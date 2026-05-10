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

        return response()->json([
            'success' => true,
            'data'    => [
                'appointments' => $appointments,
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
            'petId'     => 'required|string',
            'serviceId' => 'required|string',
            'date'      => 'required|date_format:Y-m-d',
            'startTime' => 'required|date_format:H:i',
        ]);

        $user = $request->user();

        // Validación de tiempo (2 horas de anticipación)
        $appointmentDateTime = \Carbon\Carbon::createFromFormat(
            'Y-m-d H:i', $request->date . ' ' . $request->startTime
        );

        if ($appointmentDateTime->lt(now()->addHours(2))) {
            return response()->json(['success' => false, 'error' => 'Las citas deben reservarse con al menos 2 horas de anticipación'], 400);
        }

        // Verificar propiedad de la mascota
        $pet = Pet::findOrFail($request->petId);
        if ($pet->user_id !== $user->id) return response()->json(['success' => false, 'error' => 'La mascota no te pertenece'], 403);
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
        $schedule = Schedule::where('day_of_week', $dayOfWeek)->first();
        if (!$schedule || !$schedule->is_available) {
            return response()->json(['success' => false, 'error' => 'No hay horario disponible para este día'], 400);
        }

        $appointment = Appointment::create([
            'id'             => (string) Str::ulid(),
            'user_id'        => $user->id,
            'pet_id'         => $request->petId,
            'service_id'     => $request->serviceId,
            'date'           => $request->date,
            'start_time'     => $request->startTime,
            'end_time'       => $endTime,
            'status'         => 'pending',
            'notes'          => $request->notes ? trim($request->notes) : null,
            'status_history' => [['status' => 'pending', 'date' => now()->toISOString()]],
        ]);

        return response()->json(['success' => true, 'data' => $appointment->load(['pet', 'service'])], 201);
    }

    public function show(Request $request, $id)
    {
        $appointment = Appointment::with(['pet', 'service', 'user:id,name,email,phone', 'clinicalNotes'])->findOrFail($id);
        $user = $request->user();

        // Seguridad: Verificar que sea el dueño o admin
        if ($user->role !== 'admin' && $appointment->user_id !== $user->id) {
            abort(403, 'No autorizado');
        }

        return response()->json(['success' => true, 'data' => $appointment]);
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

        // Solo el administrador puede cambiar el estado de la cita y notas clínicas
        if ($user->role === 'admin') {
            $allowedFields[] = 'status';
            $allowedFields[] = 'clinical_notes';
        }

        // Actualizar solo los campos permitidos
        $appointment->update($request->only($allowedFields));

        return response()->json(['success' => true, 'data' => $appointment]);
    }

    public function destroy(Request $request, $id)
    {
        // Seguridad: Solo admin puede eliminar
        abort_if($request->user()->role !== 'admin', 403);
        
        Appointment::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
}