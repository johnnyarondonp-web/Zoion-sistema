<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Pet;
use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        
        $total_clients = User::where('role', 'client')->count();
        $total_pets = Pet::count();
        $total_appointments = Appointment::count();
        $appointments_today = Appointment::where('date', $today->format('Y-m-d'))->count();
        $appointments_pending = Appointment::where('status', 'pending')->count();
        $appointments_confirmed = Appointment::where('status', 'confirmed')->count();
        
        $revenue_month = Appointment::where('status', 'completed')
            ->where('date', 'like', $startOfMonth->format('Y-m') . '-%')
            ->with('service')
            ->get()
            ->sum(function ($appointment) {
                return $appointment->service ? $appointment->service->price : 0;
            });

        $recent_appointments = Appointment::with(['user:id,name,email', 'service'])
            ->orderBy('date', 'desc')
            ->orderBy('start_time', 'desc')
            ->take(5)
            ->get()
            ->map(function ($apt) {
                // Return mapped array that matches what Dashboard.tsx expects
                return [
                    'id' => $apt->id,
                    'date' => $apt->date,
                    'startTime' => $apt->start_time,
                    'endTime' => $apt->end_time,
                    'status' => $apt->status,
                    'pet' => $apt->pet ? ['id' => $apt->pet->id, 'name' => $apt->pet->name, 'species' => $apt->pet->species, 'breed' => $apt->pet->breed] : null,
                    'user' => $apt->user ? ['id' => $apt->user->id, 'name' => $apt->user->name, 'email' => $apt->user->email] : null,
                    'service' => $apt->service ? ['id' => $apt->service->id, 'name' => $apt->service->name, 'durationMinutes' => $apt->service->duration_minutes, 'price' => $apt->service->price] : null,
                ];
            });

        $appointments_by_status_raw = Appointment::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->get();
            
        $appointments_by_status = $appointments_by_status_raw->map(function ($item) {
            return [
                'status' => $item->status,
                'count' => $item->count
            ];
        });

        $appointments_by_month = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthDate = Carbon::now()->subMonths($i);
            $count = Appointment::where('date', 'like', $monthDate->format('Y-m') . '-%')
                ->count();
            $appointments_by_month[] = [
                'month' => $monthDate->format('M'),
                'count' => $count
            ];
        }

        // For Dashboard.tsx specifically, it needs some specific fields:
        $appointmentsThisMonth = Appointment::where('date', 'like', Carbon::now()->format('Y-m') . '-%')->count();
        $appointmentsLastMonth = Appointment::where('date', 'like', Carbon::now()->subMonth()->format('Y-m') . '-%')->count();
            
        $cancellationRate = $total_appointments > 0 ? 
            round((Appointment::where('status', 'cancelled')->count() / $total_appointments) * 100, 1) : 0;

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
                'name' => $mostRequestedServiceQuery->service->name,
                'count' => $mostRequestedServiceQuery->count
            ];
        }
        
        $appointmentsByService = Appointment::selectRaw('service_id, count(*) as count')
            ->groupBy('service_id')
            ->with('service')
            ->get()
            ->map(function ($item) {
                return [
                    'serviceId' => $item->service_id,
                    'name' => $item->service ? $item->service->name : 'Unknown',
                    'count' => $item->count
                ];
            });

        $appointmentsByDay = [];
        for ($i = 13; $i >= 0; $i--) {
            $dayDate = Carbon::now()->subDays($i);
            $count = Appointment::where('date', $dayDate->format('Y-m-d'))->count();
            $appointmentsByDay[] = [
                'date' => $dayDate->format('Y-m-d'),
                'count' => $count
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_clients' => $total_clients,
                'total_pets' => $total_pets,
                'total_appointments' => $total_appointments,
                'appointments_today' => $appointments_today,
                'appointments_pending' => $appointments_pending,
                'appointments_confirmed' => $appointments_confirmed,
                'revenue_month' => $revenue_month,
                'recent_appointments' => $recent_appointments,
                'appointments_by_status' => $appointments_by_status,
                'appointments_by_month' => $appointments_by_month,
                // Fields for Dashboard.tsx
                'appointmentsThisMonth' => $appointmentsThisMonth,
                'appointmentsLastMonth' => $appointmentsLastMonth,
                'mostRequestedService' => $mostRequestedService,
                'unreadMessages' => $unreadMessages,
                'petsAttendedThisMonth' => Appointment::where('date', 'like', Carbon::now()->format('Y-m') . '-%')
                    ->distinct('pet_id')
                    ->count(),
                'upcomingToday' => $appointments_today,
                'cancellationRate' => $cancellationRate,
                'recentAppointments' => $recent_appointments,
                'appointmentsByService' => $appointmentsByService,
                'appointmentsByDay' => $appointmentsByDay,
            ]
        ]);
    }

    public function reports(Request $request)
    {
        $from = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $to = $request->input('to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        $query = Appointment::whereBetween('date', [$from, $to]);

        $totalAppointments = (clone $query)->count();
        $completedAppointments = (clone $query)->where('status', 'completed')->count();
        
        $totalRevenue = (clone $query)->where('status', 'completed')->with('service')->get()->sum(function ($apt) {
            return $apt->service ? $apt->service->price : 0;
        });

        $avgPerMonth = $totalAppointments; // Simplified, assuming default is 1 month

        $completionRate = $totalAppointments > 0 ? round(($completedAppointments / $totalAppointments) * 100, 1) : 0;

        $appointmentsByMonth = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthDate = Carbon::now()->subMonths($i);
            $count = Appointment::where('date', 'like', $monthDate->format('Y-m') . '-%')
                ->count();
            $appointmentsByMonth[] = [
                'month' => $monthDate->format('M Y'),
                'count' => $count
            ];
        }

        $statusBreakdown_raw = (clone $query)->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->get();
            
        $statusBreakdown = [];
        $statusLabels = [
            'pending' => 'Pendiente',
            'confirmed' => 'Confirmada',
            'completed' => 'Completada',
            'cancelled' => 'Cancelada',
            'no_show' => 'No asistió',
        ];
        
        foreach ($statusBreakdown_raw as $item) {
            $statusBreakdown[] = [
                'status' => $item->status,
                'label' => $statusLabels[$item->status] ?? $item->status,
                'count' => $item->count
            ];
        }

        $topServicesQuery = (clone $query)->selectRaw('service_id, count(*) as count')
            ->groupBy('service_id')
            ->orderByDesc('count')
            ->take(5)
            ->with('service')
            ->get();
            
        $topServices = $topServicesQuery->map(function ($item) use ($from, $to) {
            $revenue = Appointment::whereBetween('date', [$from, $to])
                ->where('service_id', $item->service_id)
                ->where('status', 'completed')
                ->with('service')
                ->get()
                ->sum(function ($apt) {
                    return $apt->service ? $apt->service->price : 0;
                });
                
            return [
                'name' => $item->service ? $item->service->name : 'Unknown',
                'count' => $item->count,
                'revenue' => $revenue
            ];
        });

        $newClientsByMonth = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthDate = Carbon::now()->subMonths($i);
            $count = User::where('role', 'client')
                ->where('created_at', 'like', $monthDate->format('Y-m') . '-%')
                ->count();
            $newClientsByMonth[] = [
                'month' => $monthDate->format('M Y'),
                'count' => $count
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => [
                    'totalRevenue' => $totalRevenue,
                    'totalAppointments' => $totalAppointments,
                    'avgPerMonth' => $avgPerMonth,
                    'completionRate' => $completionRate,
                    'completedAppointments' => $completedAppointments,
                ],
                'appointmentsByMonth' => $appointmentsByMonth,
                'statusBreakdown' => $statusBreakdown,
                'topServices' => $topServices,
                'newClientsByMonth' => $newClientsByMonth,
            ]
        ]);
    }
}
