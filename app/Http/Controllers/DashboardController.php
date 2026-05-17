<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Pet;
use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    // Las queries que agrupan por mes usan funciones distintas según el motor.
    // Los tests corren en SQLite y producción está en PostgreSQL — sin este
    // switch los tests siempre fallarían aunque la lógica sea correcta.
    private static function monthGroupExpr(): string
    {
        return match (config('database.default')) {
            'pgsql'  => "to_char(date::date, 'YYYY-MM')",
            default  => "strftime('%Y-%m', date)",
        };
    }

    public function index()
    {
        $data = Cache::remember('dashboard_stats', 60, function () {
            $today        = Carbon::today();
            $startOfMonth = Carbon::now()->startOfMonth();
            $now          = Carbon::now();

            $total_clients       = User::where('role', 'client')->count();
            $total_pets          = Pet::count();
            $total_appointments  = Appointment::count();
            $appointments_today  = Appointment::where('date', $today->format('Y-m-d'))->count();
            $appointments_pending   = Appointment::where('status', 'pending')->count();
            $appointments_confirmed = Appointment::where('status', 'confirmed')->count();

            $revenue_month = Appointment::join('services', 'appointments.service_id', '=', 'services.id')
                ->where('appointments.status', 'completed')
                ->where('appointments.date', '>=', $startOfMonth->format('Y-m-d'))
                ->sum('services.price');

            // El eager load de pet no estaba en la versión anterior, lo que provocaba
            // que $apt->pet fuera siempre null en el mapeo del dashboard.
            $recent_appointments = Appointment::with(['user:id,name,email', 'service', 'pet'])
                ->orderBy('date', 'desc')
                ->orderBy('start_time', 'desc')
                ->take(5)
                ->get()
                ->map(function ($apt) {
                    return [
                        'id'        => $apt->id,
                        'date'      => $apt->date,
                        'startTime' => $apt->start_time,
                        'endTime'   => $apt->end_time,
                        'status'    => $apt->status,
                        'pet'       => $apt->pet ? ['id' => $apt->pet->id, 'name' => $apt->pet->name, 'species' => $apt->pet->species, 'breed' => $apt->pet->breed] : null,
                        'user'      => $apt->user ? ['id' => $apt->user->id, 'name' => $apt->user->name, 'email' => $apt->user->email] : null,
                        'service'   => $apt->service ? ['id' => $apt->service->id, 'name' => $apt->service->name, 'durationMinutes' => $apt->service->duration_minutes, 'price' => $apt->service->price] : null,
                    ];
                });

            $appointments_by_status = Appointment::selectRaw('status, count(*) as count')
                ->groupBy('status')
                ->get()
                ->map(fn($item) => ['status' => $item->status, 'count' => $item->count]);

            // En vez de 6 queries individuales (una por mes), traemos el conteo de
            // todos los meses de golpe agrupando por año-mes en SQL.
            $startSixMonths = Carbon::now()->startOfMonth()->subMonths(5)->format('Y-m-d');
            $rawMonthCounts = Appointment::where('date', '>=', $startSixMonths)
                ->selectRaw(self::monthGroupExpr() . ' as ym, count(*) as count')
                ->groupBy('ym')
                ->pluck('count', 'ym');

            $appointments_by_month = [];
            for ($i = 5; $i >= 0; $i--) {
                $monthDate = Carbon::now()->subMonths($i);
                $ym        = $monthDate->format('Y-m');
                $appointments_by_month[] = [
                    'month' => $monthDate->format('M'),
                    'count' => (int) ($rawMonthCounts[$ym] ?? 0),
                ];
            }

            $currentYM  = $now->format('Y-m');
            $previousYM = $now->copy()->subMonth()->format('Y-m');

            $appointmentsThisMonth  = (int) ($rawMonthCounts[$currentYM]  ?? 0);
            $appointmentsLastMonth  = (int) ($rawMonthCounts[$previousYM] ?? 0);

            $cancellationRate = $total_appointments > 0
                ? round((Appointment::where('status', 'cancelled')->count() / $total_appointments) * 100, 1)
                : 0;

            $unreadMessages = \App\Models\AppointmentMessage::where('is_read_by_admin', false)->count();

            $mostRequestedServiceQuery = Appointment::selectRaw('service_id, count(*) as count')
                ->groupBy('service_id')
                ->orderByDesc('count')
                ->with('service')
                ->first();

            $mostRequestedService = null;
            if ($mostRequestedServiceQuery && $mostRequestedServiceQuery->service) {
                $mostRequestedService = [
                    'serviceId' => $mostRequestedServiceQuery->service_id,
                    'name'      => $mostRequestedServiceQuery->service->name,
                    'count'     => $mostRequestedServiceQuery->count,
                ];
            }

            $appointmentsByService = Appointment::selectRaw('service_id, count(*) as count')
                ->groupBy('service_id')
                ->with('service')
                ->get()
                ->map(fn($item) => [
                    'serviceId' => $item->service_id,
                    'name'      => $item->service ? $item->service->name : 'Unknown',
                    'count'     => $item->count,
                ]);

            // Mismo enfoque que para los meses: una sola query que trae los conteos
            // de los últimos 14 días, eliminando el loop de 14 queries independientes.
            $start14Days = Carbon::now()->subDays(13)->format('Y-m-d');
            $rawDayCounts = Appointment::where('date', '>=', $start14Days)
                ->where('date', '<=', Carbon::now()->format('Y-m-d'))
                ->selectRaw('date, count(*) as count')
                ->groupBy('date')
                ->pluck('count', 'date');

            $appointmentsByDay = [];
            for ($i = 13; $i >= 0; $i--) {
                $dayDate = Carbon::now()->subDays($i)->format('Y-m-d');
                $appointmentsByDay[] = [
                    'date'  => $dayDate,
                    'count' => (int) ($rawDayCounts[$dayDate] ?? 0),
                ];
            }

            $petsAttendedThisMonth = Appointment::where('date', '>=', Carbon::now()->startOfMonth()->format('Y-m-d'))
                ->distinct('pet_id')
                ->count('pet_id');

            return [
                'total_clients'           => $total_clients,
                'total_pets'              => $total_pets,
                'total_appointments'      => $total_appointments,
                'appointments_today'      => $appointments_today,
                'appointments_pending'    => $appointments_pending,
                'appointments_confirmed'  => $appointments_confirmed,
                'revenue_month'           => $revenue_month,
                'recent_appointments'     => $recent_appointments,
                'appointments_by_status'  => $appointments_by_status,
                'appointments_by_month'   => $appointments_by_month,
                'appointmentsThisMonth'   => $appointmentsThisMonth,
                'appointmentsLastMonth'   => $appointmentsLastMonth,
                'mostRequestedService'    => $mostRequestedService,
                'unreadMessages'          => $unreadMessages,
                'petsAttendedThisMonth'   => $petsAttendedThisMonth,
                'upcomingToday'           => $appointments_today,
                'cancellationRate'        => $cancellationRate,
                'recentAppointments'      => $recent_appointments,
                'appointmentsByService'   => $appointmentsByService,
                'appointmentsByDay'       => $appointmentsByDay,
            ];
        });

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function reports(Request $request)
    {
        $from = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $to   = $request->input('to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        $query = Appointment::whereBetween('date', [$from, $to]);

        $totalAppointments     = (clone $query)->count();
        $completedAppointments = (clone $query)->where('status', 'completed')->count();

        // Antes calculaba el revenue cargando todas las citas completed en memoria y
        // sumando el price de la relación "service" con una closure de PHP (N+1 oculto).
        // Ahora hacemos un JOIN y sumamos en SQL — una sola query sin importar cuántas citas haya.
        $totalRevenue = (clone $query)
            ->join('services', 'appointments.service_id', '=', 'services.id')
            ->where('appointments.status', 'completed')
            ->sum('services.price');

        $completionRate = $totalAppointments > 0
            ? round(($completedAppointments / $totalAppointments) * 100, 1)
            : 0;

        // La versión anterior hacía 6 queries individuales (una por mes en el loop).
        // Traemos todo de una vez y distribuimos en PHP.
        $startSixMonths = Carbon::now()->startOfMonth()->subMonths(5)->format('Y-m-d');
        $rawMonthCounts = Appointment::where('date', '>=', $startSixMonths)
            ->selectRaw(self::monthGroupExpr() . ' as ym, count(*) as count')
            ->groupBy('ym')
            ->pluck('count', 'ym');

        $appointmentsByMonth = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthDate = Carbon::now()->subMonths($i);
            $ym        = $monthDate->format('Y-m');
            $appointmentsByMonth[] = [
                'month' => $monthDate->format('M Y'),
                'count' => (int) ($rawMonthCounts[$ym] ?? 0),
            ];
        }

        $statusBreakdown_raw = (clone $query)->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->get();

        $statusLabels = [
            'pending'   => 'Pendiente',
            'confirmed' => 'Confirmada',
            'completed' => 'Completada',
            'cancelled' => 'Cancelada',
            'no_show'   => 'No asistió',
        ];

        $statusBreakdown = $statusBreakdown_raw->map(fn($item) => [
            'status' => $item->status,
            'label'  => $statusLabels[$item->status] ?? $item->status,
            'count'  => $item->count,
        ])->values()->all();

        // El problema original: por cada servicio en el top5, lanzaba una query separada
        // para calcular su revenue. Esto es el N+1 clásico — se resuelve haciendo el
        // JOIN y el SUM dentro de la misma query agrupada.
        $topServices = (clone $query)
            ->join('services', 'appointments.service_id', '=', 'services.id')
            ->selectRaw('appointments.service_id, services.name, count(*) as count, sum(case when appointments.status = \'completed\' then services.price else 0 end) as revenue')
            ->groupBy('appointments.service_id', 'services.name')
            ->orderByDesc('count')
            ->take(5)
            ->get()
            ->map(fn($item) => [
                'name'    => $item->name,
                'count'   => $item->count,
                'revenue' => (float) $item->revenue,
            ]);

        // También: la versión anterior usaba LIKE 'Y-m-%' en un campo string para filtrar
        // por mes. Funciona, pero no usa índices. Aquí casteamos a date para que el
        // índice que creamos en la migración de rendimiento sea aprovechado.
        $startClients = Carbon::now()->startOfMonth()->subMonths(5)->format('Y-m-d');
        $createdAtExpr = match (config('database.default')) {
            'pgsql'  => "to_char(created_at, 'YYYY-MM')",
            default  => "strftime('%Y-%m', created_at)",
        };
        $rawClientCounts = User::where('role', 'client')
            ->where('created_at', '>=', $startClients)
            ->selectRaw($createdAtExpr . ' as ym, count(*) as count')
            ->groupBy('ym')
            ->pluck('count', 'ym');

        $newClientsByMonth = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthDate = Carbon::now()->subMonths($i);
            $ym        = $monthDate->format('Y-m');
            $newClientsByMonth[] = [
                'month' => $monthDate->format('M Y'),
                'count' => (int) ($rawClientCounts[$ym] ?? 0),
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'summary' => [
                    'totalRevenue'          => $totalRevenue,
                    'totalAppointments'     => $totalAppointments,
                    'avgPerMonth'           => $totalAppointments,
                    'completionRate'        => $completionRate,
                    'completedAppointments' => $completedAppointments,
                ],
                'appointmentsByMonth' => $appointmentsByMonth,
                'statusBreakdown'     => $statusBreakdown,
                'topServices'         => $topServices,
                'newClientsByMonth'   => $newClientsByMonth,
            ],
        ]);
    }
}
