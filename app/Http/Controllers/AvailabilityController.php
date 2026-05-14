<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\BlockedDate;
use App\Models\Schedule;
use App\Models\Service;
use App\Models\WalkInAppointment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AvailabilityController extends Controller
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
        $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'serviceId' => 'required|string',
        ]);

        $date = $request->date;
        $serviceId = $request->serviceId;

        // 1. Verificar si la fecha está bloqueada
        if (BlockedDate::where('date', $date)->exists()) {
            return response()->json([
                'success' => true,
                'data' => ['available' => false, 'slots' => []]
            ]);
        }

        // 2. Verificar horario del día
        $dayOfWeek = Carbon::parse($date)->dayOfWeek;
        $schedule = Schedule::where('day_of_week', $dayOfWeek)->first();

        if (!$schedule || !$schedule->is_available) {
            return response()->json([
                'success' => true,
                'data' => ['available' => false, 'slots' => []]
            ]);
        }

        // 3. Obtener el servicio
        $service = Service::find($serviceId);
        if (!$service || !$service->is_active) {
            return response()->json([
                'success' => true,
                'data' => ['available' => false, 'slots' => []]
            ]);
        }

        $duration = (int) $service->duration_minutes;
        $openMinutes = $this->timeToMinutes($schedule->open_time);
        $closeMinutes = $this->timeToMinutes($schedule->close_time);

        // 4. Contar médicos activos que atienden este servicio.
        // Si todavía no hay médicos configurados, el sistema funciona como antes: un slot a la vez.
        $doctorIds = DB::table('doctor_services')
            ->join('doctors', 'doctors.id', '=', 'doctor_services.doctor_id')
            ->where('doctor_services.service_id', $serviceId)
            ->where('doctors.is_active', true)
            ->pluck('doctor_services.doctor_id');

        $totalDoctors  = $doctorIds->count();
        $usesDoctorLogic = $totalDoctors > 0;

        // 5. Citas existentes del día que ocupan capacidad médica.
        // Las walk-in también cuentan porque compiten por los mismos médicos.
        $existingAppointments = Appointment::where('date', $date)
            ->whereIn('status', ['pending', 'confirmed'])
            ->when($usesDoctorLogic, fn ($q) => $q->whereIn('doctor_id', $doctorIds))
            ->get(['start_time', 'end_time', 'doctor_id']);

        $existingWalkIns = WalkInAppointment::where('date', $date)
            ->whereIn('status', ['pending', 'confirmed'])
            ->when($usesDoctorLogic, fn ($q) => $q->whereIn('doctor_id', $doctorIds))
            ->get(['start_time', 'end_time', 'doctor_id']);

        $allBusySlots = $existingAppointments->concat($existingWalkIns);

        $slots   = [];
        $current = $openMinutes;

        while ($current + $duration <= $closeMinutes) {
            $slotStart = $this->minutesToTime($current);
            $slotEnd   = $this->minutesToTime($current + $duration);

            if ($usesDoctorLogic) {
                // Un slot queda bloqueado solo cuando todos los médicos están ocupados en ese intervalo.
                $busyDoctorIds = [];
                foreach ($allBusySlots as $existing) {
                    if ($existing->start_time < $slotEnd && $existing->end_time > $slotStart) {
                        if ($existing->doctor_id && !in_array($existing->doctor_id, $busyDoctorIds)) {
                            $busyDoctorIds[] = $existing->doctor_id;
                        }
                    }
                }
                $isOverlapping = count($busyDoctorIds) >= $totalDoctors;
            } else {
                $isOverlapping = false;
                foreach ($allBusySlots as $existing) {
                    if ($existing->start_time < $slotEnd && $existing->end_time > $slotStart) {
                        $isOverlapping = true;
                        break;
                    }
                }
            }

            // No mostrar slots en el pasado si la fecha es hoy (lead time de 2h para clientes)
            if ($date === Carbon::today()->format('Y-m-d')) {
                $nowPlus2h        = Carbon::now()->addHours(2);
                $slotStartDateTime = Carbon::createFromFormat('Y-m-d H:i', "$date $slotStart");

                if ($slotStartDateTime->lt($nowPlus2h)) {
                    $isOverlapping = true;
                }
            }

            if (!$isOverlapping) {
                $h = intdiv($current, 60);
                $m = $current % 60;
                $period = $h >= 12 ? 'PM' : 'AM';
                $h12 = $h % 12 ?: 12;
                $label = sprintf('%d:%02d %s', $h12, $m, $period);

                $slots[] = [
                    'time'  => $slotStart,
                    'label' => $label,
                ];
            }

            $current += $duration;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'available' => count($slots) > 0,
                'slots'     => $slots,
            ]
        ]);
    }

    public function schedule()
    {
        // El cliente solo necesita saber qué días de la semana no están disponibles.
        // No exponemos open_time ni close_time — eso es configuración interna.
        $unavailable = Schedule::where('is_available', false)->pluck('day_of_week');

        return response()->json([
            'success' => true,
            'data' => ['unavailableDays' => $unavailable]
        ]);
    }
}
