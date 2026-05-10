<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $today = now()->format('Y-m-d');
        $in7Days = now()->addDays(7)->format('Y-m-d');
        $notifications = [];

        if ($user->role === 'admin') {
            // Citas pendientes de confirmar
            $pending = Appointment::with(['pet', 'user:id,name'])
                ->where('status', 'pending')
                ->where('date', '>=', $today)
                ->orderBy('date')->orderBy('start_time')
                ->take(10)->get();

            foreach ($pending as $apt) {
                $notifications[] = [
                    'id'      => 'pending-' . $apt->id,
                    'type'    => 'pending_appointment',
                    'title'   => 'Cita pendiente de confirmación',
                    'message' => "{$apt->pet->name} ({$apt->user->name}) - {$apt->date} {$apt->start_time}",
                    'date'    => $apt->created_at,
                    'data'    => ['appointmentId' => $apt->id],
                ];
            }
        } else {
            // Citas próximas del cliente
            $upcoming = Appointment::with(['pet', 'service'])
                ->where('user_id', $user->id)
                ->whereIn('status', ['pending', 'confirmed'])
                ->whereBetween('date', [$today, $in7Days])
                ->orderBy('date')->orderBy('start_time')
                ->take(5)->get();

            foreach ($upcoming as $apt) {
                $notifications[] = [
                    'id'      => 'upcoming-' . $apt->id,
                    'type'    => 'upcoming_appointment',
                    'title'   => 'Cita próxima',
                    'message' => "{$apt->pet->name} - {$apt->service->name} el {$apt->date} a las {$apt->start_time}",
                    'date'    => $apt->created_at,
                    'data'    => ['appointmentId' => $apt->id],
                ];
            }
        }

        return response()->json(['success' => true, 'data' => $notifications]);
    }
}