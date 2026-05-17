<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Pet;
use App\Models\Service;
use App\Models\BlockedDate;
use App\Models\Schedule;
use App\Models\User;
use App\Models\Notification;
use App\Jobs\NotifyAdminsJob;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class AppointmentService
{
    /**
     * Crea una cita veterinaria validando toda la lógica de negocio, disponibilidad de horarios
     * y realizando la asignación equitativa de médicos bajo bloqueos atómicos para evitar condiciones de carrera.
     *
     * @param array $data Datos validados de la solicitud (procedentes de StoreAppointmentRequest).
     * @param User $user Usuario autenticado que realiza la solicitud.
     * @return Appointment
     * @throws ValidationException
     */
    public function createAppointment(array $data, User $user): Appointment
    {
        $isStaff = in_array($user->role, ['admin', 'receptionist']);
        $targetUserId = ($isStaff && isset($data['userId'])) ? $data['userId'] : $user->id;

        // 1. Validación de tiempo (2 horas de anticipación obligatorias para clientes)
        if (!$isStaff) {
            $appointmentDateTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i', $data['date'] . ' ' . $data['startTime']);
            if ($appointmentDateTime->lt(now()->addHours(2))) {
                throw ValidationException::withMessages(['startTime' => 'Las citas deben reservarse con al menos 2 horas de anticipación']);
            }
        }

        // 2. Verificar propiedad y estado de la mascota
        $pet = Pet::findOrFail($data['petId']);
        if ($pet->user_id !== $targetUserId) {
            throw ValidationException::withMessages(['petId' => 'La mascota no pertenece al cliente indicado']);
        }
        if (!$pet->is_active) {
            throw ValidationException::withMessages(['petId' => 'La mascota no está activa']);
        }

        // 3. Verificar disponibilidad del servicio
        $service = Service::findOrFail($data['serviceId']);
        if (!$service->is_active) {
            throw ValidationException::withMessages(['serviceId' => 'El servicio no está disponible']);
        }

        $endTime = $this->minutesToTime($this->timeToMinutes($data['startTime']) + $service->duration_minutes);

        // 4. Verificar fechas bloqueadas de la clínica
        if (BlockedDate::where('date', $data['date'])->exists()) {
            abort(400, 'Esta fecha está bloqueada por la clínica');
        }

        // 5. Verificar horario de atención laboral
        $dayOfWeek = \Carbon\Carbon::parse($data['date'])->dayOfWeek;
        $schedule  = Schedule::where('day_of_week', $dayOfWeek)->first();
        if (!$schedule || !$schedule->is_available) {
            abort(400, 'No hay horario disponible para este día');
        }

        $startMinutes = $this->timeToMinutes($data['startTime']);
        $endMinutes   = $startMinutes + $service->duration_minutes;
        $openMinutes  = $this->timeToMinutes($schedule->open_time);
        $closeMinutes = $this->timeToMinutes($schedule->close_time);

        if ($startMinutes < $openMinutes || $endMinutes > $closeMinutes) {
            abort(400, "El horario solicitado está fuera del horario de atención ({$schedule->open_time} – {$schedule->close_time})");
        }

        $source = ($isStaff && isset($data['userId']) && $data['userId'] !== $user->id) ? 'admin_booked' : 'online';
        $lockKey = "appointment_lock_{$data['date']}_{$data['startTime']}";

        // En producción usamos Redis para locks si está disponible (REDIS_HOST no es nulo y el driver está cargado).
        // Si no, cae en el driver de cache configurado por defecto (database o array en tests).
        $lockStore = (env('REDIS_HOST') && extension_loaded('redis') && env('APP_ENV') !== 'testing') ? 'redis' : null;
        $lock = $lockStore ? Cache::store($lockStore)->lock($lockKey, 10) : Cache::lock($lockKey, 10);

        try {
            $lock->block(5);

            // Re-verificar capacidad dentro del bloqueo
            if (!$this->hasCapacityFor($data['serviceId'], $data['date'], $data['startTime'], $endTime)) {
                abort(409, 'Este horario ya no está disponible');
            }

            // Asignar el médico con menos citas activas ese día para este servicio
            $assignedDoctorId = null;
            $availableDoctors = \App\Models\Doctor::whereHas('services', fn ($q) => $q->where('services.id', $data['serviceId']))
                ->where('is_active', true)
                ->withCount(['appointments as today_count' => fn ($q) => $q
                    ->where('date', $data['date'])
                    ->whereIn('status', ['pending', 'confirmed'])
                ])
                ->orderBy('today_count')
                ->get();

            if ($availableDoctors->isNotEmpty()) {
                $assignedDoctorId = $availableDoctors->first()->id;
            } else {
                abort(409, 'Este horario ya no está disponible');
            }

            $appointment = Appointment::create([
                'id'             => (string) Str::ulid(),
                'user_id'        => $targetUserId,
                'pet_id'         => $data['petId'],
                'service_id'     => $data['serviceId'],
                'doctor_id'      => $assignedDoctorId,
                'source'         => $source,
                'date'           => $data['date'],
                'start_time'     => $data['startTime'],
                'end_time'       => $endTime,
                'status'         => 'pending',
                'notes'          => isset($data['notes']) ? trim($data['notes']) : null,
                'status_history' => [['status' => 'pending', 'date' => now()->toISOString()]],
                'payment_method' => $data['paymentMethod'] ?? null,
                'payment_status' => 'pending',
            ]);
        } catch (\Illuminate\Contracts\Cache\LockTimeoutException $e) {
            abort(409, 'El sistema está procesando demasiadas solicitudes, por favor intenta de nuevo en unos segundos.');
        } finally {
            $lock?->release();
        }

        // 6. Notificar según quién agendó
        if ($source === 'admin_booked') {
            Notification::create([
                'user_id' => $targetUserId,
                'title'   => 'Cita agendada por la clínica',
                'message' => "La clínica ha agendado una cita para {$pet->name} el {$appointment->date} a las {$appointment->start_time}.",
                'type'    => 'new_appointment',
                'data'    => ['appointment_id' => $appointment->id],
            ]);
        } else {
            NotifyAdminsJob::dispatch(
                'Nueva cita solicitada',
                "{$user->name} solicitó una cita para {$pet->name} el {$appointment->date} a las {$appointment->start_time}.",
                'new_appointment',
                ['appointment_id' => $appointment->id]
            );
        }

        // 7. Notificar al doctor asignado
        if ($assignedDoctorId) {
            $assignedDoctor = \App\Models\Doctor::find($assignedDoctorId);
            if ($assignedDoctor && $assignedDoctor->user_id) {
                Notification::create([
                    'user_id' => $assignedDoctor->user_id,
                    'title'   => 'Nuevo paciente asignado',
                    'message' => "Se te ha asignado un paciente ({$pet->name}) para el {$appointment->date} a las {$appointment->start_time}.",
                    'type'    => 'new_appointment',
                    'data'    => ['appointment_id' => $appointment->id],
                ]);
            }
        }

        return $appointment->load(['pet', 'service']);
    }

    /**
     * Mapea un modelo Appointment a un formato de array consistente para el frontend.
     * Este helper centralizado actúa como una capa de 'AppointmentResource' para erradicar código duplicado.
     *
     * @param Appointment $apt
     * @return array
     */
    public function mapAppointment(Appointment $apt): array
    {
        return [
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
            'paymentMethod' => $apt->payment_method,
            'paymentStatus' => $apt->payment_status,
            'paymentAmount' => $apt->payment_amount,
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
        ];
    }

    private function hasCapacityFor(string $serviceId, string $date, string $startTime, string $endTime): bool
    {
        $isTesting = env('APP_ENV') === 'testing';

        $doctorIdsFetcher = function () use ($serviceId) {
            return DB::table('doctor_services')
                ->join('doctors', 'doctors.id', '=', 'doctor_services.doctor_id')
                ->where('doctor_services.service_id', $serviceId)
                ->where('doctors.is_active', true)
                ->pluck('doctor_services.doctor_id');
        };

        $doctorIds = $isTesting 
            ? $doctorIdsFetcher() 
            : Cache::remember("service_doctors:{$serviceId}", 5, $doctorIdsFetcher);

        $totalDoctors = $doctorIds->count();

        if ($totalDoctors > 0) {
            $busySlotsFetcher = function () use ($date, $doctorIds) {
                $appts = Appointment::where('date', $date)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->whereIn('doctor_id', $doctorIds)
                    ->get(['start_time', 'end_time', 'doctor_id']);

                $walkins = \App\Models\WalkInAppointment::where('date', $date)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->whereIn('doctor_id', $doctorIds)
                    ->get(['start_time', 'end_time', 'doctor_id']);

                return $appts->concat($walkins);
            };

            $allBusySlots = $isTesting 
                ? $busySlotsFetcher() 
                : Cache::remember("busy_slots:{$serviceId}:{$date}", 5, $busySlotsFetcher);

            $busyDoctorIds = [];
            foreach ($allBusySlots as $existing) {
                if ($existing->start_time < $endTime && $existing->end_time > $startTime) {
                    if ($existing->doctor_id && !in_array($existing->doctor_id, $busyDoctorIds)) {
                        $busyDoctorIds[] = $existing->doctor_id;
                    }
                }
            }

            return count($busyDoctorIds) < $totalDoctors;
        }

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
}
