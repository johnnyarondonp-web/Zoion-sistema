<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Service;
use App\Models\User;
use App\Models\WalkInAppointment;
use App\Models\WalkInClient;
use App\Models\Schedule;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalkInController extends Controller
{
    public function index()
    {
        $walkins = WalkInAppointment::with(['client', 'service', 'doctor'])
            ->orderByDesc('date')
            ->orderByDesc('start_time')
            ->limit(100)
            ->get()
            ->map(fn ($w) => $this->formatWalkIn($w));

        return response()->json(['success' => true, 'data' => $walkins]);
    }

    // Busca por teléfono en usuarios registrados y en clientes walk-in previos.
    // Devuelve lo suficiente para pre-rellenar el formulario sin exponer datos sensibles.
    public function search(Request $request)
    {
        $phone = $request->query('phone');

        if (!$phone || strlen($phone) < 4) {
            return response()->json(['success' => true, 'data' => null]);
        }

        // Primero buscar en walk_in_clients (clientes presenciales frecuentes)
        $walkIn = WalkInClient::where('phone', 'like', "%{$phone}%")->first();
        if ($walkIn) {
            return response()->json([
                'success' => true,
                'data'    => [
                    'type'      => 'walk_in',
                    'ownerName' => $walkIn->owner_name,
                    'phone'     => $walkIn->phone,
                    'email'     => $walkIn->email,
                    'petName'   => $walkIn->pet_name,
                    'petSpecies'=> $walkIn->pet_species,
                    'petBreed'  => $walkIn->pet_breed,
                ],
            ]);
        }

        // Luego buscar en usuarios registrados
        $user = User::where('phone', 'like', "%{$phone}%")->where('role', 'client')->first();
        if ($user) {
            return response()->json([
                'success' => true,
                'data'    => [
                    'type'      => 'user',
                    'ownerName' => $user->name,
                    'phone'     => $user->phone,
                    'email'     => $user->email,
                    'petName'   => null,
                    'petSpecies'=> null,
                    'petBreed'  => null,
                ],
            ]);
        }

        return response()->json(['success' => true, 'data' => null]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'ownerName'     => 'required|string|max:255',
            'phone'         => 'nullable|string|max:30',
            'email'         => 'nullable|email|max:255',
            'petName'       => 'required|string|max:255',
            'petSpecies'    => 'required|string|max:100',
            'petBreed'      => 'nullable|string|max:100',
            'petBirthDate'  => 'nullable|date|before:today',
            'petWeight'     => 'nullable|numeric|min:0.01|max:150',
            'serviceId'     => 'required|string|exists:services,id',
            'startTime'     => 'required|date_format:H:i',
            'paymentMethod' => 'nullable|string|in:cash,transfer,card,pago_movil',
        ]);

        $service = Service::findOrFail($data['serviceId']);
        $today   = Carbon::today()->format('Y-m-d');

        [$sh, $sm] = explode(':', $data['startTime']);
        $startMinutes = (int)$sh * 60 + (int)$sm;
        $endMinutes   = $startMinutes + $service->duration_minutes;
        $endTime      = sprintf('%02d:%02d', intdiv($endMinutes, 60), $endMinutes % 60);

        // Verificar horario laboral
        $dayOfWeek = Carbon::parse($today)->dayOfWeek;
        $schedule  = Schedule::where('day_of_week', $dayOfWeek)->first();

        // Sin horario guardado, aplicar el predeterminado L-V 09:00-18:00.
        if (!$schedule) {
            $isWeekday = $dayOfWeek >= 1 && $dayOfWeek <= 5;
            if (!$isWeekday) {
                return response()->json(['success' => false, 'error' => 'No hay atención este día'], 400);
            }
            $schedule = (object)[
                'is_available' => true,
                'open_time'    => '09:00',
                'close_time'   => '18:00',
            ];
        }

        if (!$schedule->is_available) {
            return response()->json(['success' => false, 'error' => 'No hay horario disponible para este día'], 400);
        }

        [$oh, $om] = explode(':', $schedule->open_time);
        $openMinutes = (int)$oh * 60 + (int)$om;
        
        [$ch, $cm] = explode(':', $schedule->close_time);
        $closeMinutes = (int)$ch * 60 + (int)$cm;

        if ($startMinutes < $openMinutes || $endMinutes > $closeMinutes) {
            return response()->json([
                'success' => false,
                'error'   => "El horario solicitado está fuera del horario de atención ({$schedule->open_time} – {$schedule->close_time})"
            ], 400);
        }

        $slotStart = $data['startTime'];
        $slotEnd   = $endTime;

        // Misma lógica de capacidad que en AvailabilityController para que ambos flujos sean consistentes.
        $doctorIds = DB::table('doctor_services')
            ->join('doctors', 'doctors.id', '=', 'doctor_services.doctor_id')
            ->where('doctor_services.service_id', $data['serviceId'])
            ->where('doctors.is_active', true)
            ->pluck('doctor_services.doctor_id');

        $totalDoctors    = $doctorIds->count();
        $usesDoctorLogic = $totalDoctors > 0;

        if ($usesDoctorLogic) {
            $busyFromAppts = Appointment::where('date', $today)
                ->whereIn('status', ['pending', 'confirmed'])
                ->whereIn('doctor_id', $doctorIds)
                ->where('start_time', '<', $slotEnd)
                ->where('end_time', '>', $slotStart)
                ->distinct('doctor_id')
                ->count('doctor_id');

            $busyFromWalkIns = WalkInAppointment::where('date', $today)
                ->whereIn('status', ['pending', 'confirmed'])
                ->whereIn('doctor_id', $doctorIds)
                ->where('start_time', '<', $slotEnd)
                ->where('end_time', '>', $slotStart)
                ->distinct('doctor_id')
                ->count('doctor_id');

            if (($busyFromAppts + $busyFromWalkIns) >= $totalDoctors) {
                return response()->json([
                    'success' => false,
                    'error'   => 'No hay médicos disponibles en ese horario para este servicio.',
                ], 409);
            }

            // El médico con menor carga en ese momento
            $assignedDoctorId = Doctor::whereHas('services', fn ($q) => $q->where('services.id', $data['serviceId']))
                ->where('is_active', true)
                ->withCount(['appointments as today_count' => fn ($q) => $q
                    ->where('date', $today)
                    ->whereIn('status', ['pending', 'confirmed'])
                ])
                ->orderBy('today_count')
                ->value('id');
        } else {
            $overlap = Appointment::where('date', $today)
                ->whereIn('status', ['pending', 'confirmed'])
                ->where('start_time', '<', $slotEnd)
                ->where('end_time', '>', $slotStart)
                ->exists();

            if ($overlap) {
                return response()->json([
                    'success' => false,
                    'error'   => 'El horario seleccionado ya está ocupado.',
                ], 409);
            }

            $assignedDoctorId = null;
        }

        $result = DB::transaction(function () use ($data, $service, $today, $endTime, $assignedDoctorId) {
            // updateOrCreate para que los datos (incluyendo pet_birth_date) se guarden
            // aunque el cliente ya exista con ese teléfono
            $client = WalkInClient::updateOrCreate(
                ['phone' => $data['phone']],
                [
                    'owner_name'  => $data['ownerName'],
                    'email'       => $data['email'] ?? null,
                    'pet_name'    => $data['petName'],
                    'pet_species' => $data['petSpecies'],
                    'pet_breed'   => $data['petBreed'] ?? null,
                    'pet_birth_date' => $data['petBirthDate'] ?? null,
                    'pet_weight'  => $data['petWeight'] ?? null,
                ]
            );

            $walkin = WalkInAppointment::create([
                'walk_in_client_id' => $client->id,
                'service_id'        => $data['serviceId'],
                'doctor_id'         => $assignedDoctorId,
                'date'              => $today,
                'start_time'        => $data['startTime'],
                'end_time'          => $endTime,
                'status'            => 'confirmed',
                'payment_method'    => $data['paymentMethod'] ?? null,
                'payment_status'    => 'pending',
                'payment_amount'    => $service->price,
            ]);

            return $walkin->load(['client', 'service', 'doctor']);
        });

        return response()->json(['success' => true, 'data' => $this->formatWalkIn($result)], 201);
    }


    public function confirmPayment(Request $request, $id)
    {
        $walkin = WalkInAppointment::findOrFail($id);

        $data = $request->validate([
            'paymentMethod' => 'required|string|in:cash,transfer,card,pago_movil',
            'paymentAmount' => 'required|numeric|min:0',
        ]);

        $walkin->update([
            'payment_method' => $data['paymentMethod'],
            'payment_amount' => $data['paymentAmount'],
            'payment_status' => 'paid',
            'paid_at'        => now(),
            'status'         => 'completed',
        ]);

        return response()->json(['success' => true, 'data' => $this->formatWalkIn($walkin->fresh(['client', 'service', 'doctor']))]);
    }

    private function formatWalkIn(WalkInAppointment $w): array
    {
        return [
            'id'            => $w->id,
            'date'          => $w->date,
            'startTime'     => $w->start_time,
            'endTime'       => $w->end_time,
            'status'        => $w->status,
            'paymentMethod' => $w->payment_method,
            'paymentStatus' => $w->payment_status,
            'paymentAmount' => $w->payment_amount,
            'paidAt'        => $w->paid_at?->toISOString(),
            'client'        => $w->client ? [
                'ownerName'  => $w->client->owner_name,
                'phone'      => $w->client->phone,
                'petName'    => $w->client->pet_name,
                'petSpecies' => $w->client->pet_species,
            ] : null,
            'service'       => $w->service ? ['id' => $w->service->id, 'name' => $w->service->name, 'price' => $w->service->price] : null,
            'doctor'        => $w->doctor ? ['id' => $w->doctor->id, 'name' => $w->doctor->name] : null,
        ];
    }
}