<?php

namespace App\Http\Controllers;

use App\Models\AppointmentMessage;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AppointmentMessageController extends Controller
{
    public function index(Request $request, $appointmentId)
    {
        $appointment = Appointment::findOrFail($appointmentId);
        $user = $request->user();

        if ($user->role !== 'admin' && $appointment->user_id !== $user->id) {
            abort(403);
        }

        $messages = AppointmentMessage::with('user:id,name,role')
            ->where('appointment_id', $appointmentId)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn($msg) => [
                'id' => $msg->id,
                'message' => $msg->message,
                'createdAt' => $msg->created_at,
                'isReadByClient' => $msg->is_read_by_client,
                'isReadByAdmin' => $msg->is_read_by_admin,
                'user' => [
                    'id' => $msg->user->id,
                    'name' => $msg->user->name,
                    'role' => $msg->user->role,
                ],
            ]);

        return response()->json(['success' => true, 'data' => $messages]);
    }

    public function store(Request $request, $appointmentId)
    {
        $appointment = Appointment::findOrFail($appointmentId);
        $user = $request->user();

        if ($user->role !== 'admin' && $appointment->user_id !== $user->id) {
            abort(403);
        }

        $request->validate(['message' => 'required|string|max:500']);

        $message = AppointmentMessage::create([
            'id'                => (string) Str::ulid(),
            'appointment_id'    => $appointmentId,
            'user_id'           => $user->id,
            'message'           => $request->message,
            'is_read_by_admin'  => in_array($user->role, ['admin', 'receptionist']),
            'is_read_by_client' => $user->role === 'client',
            'created_at'        => now(),
        ]);

        if ($user->role === 'client') {
            $admins = \App\Models\User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                \App\Models\Notification::create([
                    'user_id' => $admin->id,
                    'title'   => 'Nuevo mensaje de cliente',
                    'message' => "{$user->name} ha enviado un mensaje en la cita.",
                    'type'    => 'new_message',
                    'data'    => ['appointment_id' => $appointmentId],
                ]);
            }
        } else {
            \App\Models\Notification::create([
                'user_id' => $appointment->user_id,
                'title'   => 'Nuevo mensaje de la clínica',
                'message' => "La clínica ha respondido a tu cita.",
                'type'    => 'new_message',
                'data'    => ['appointment_id' => $appointmentId],
            ]);
        }

        $msg = $message->load('user:id,name,role');

        return response()->json([
            'success' => true,
            'data'    => [
                'id' => $msg->id,
                'message' => $msg->message,
                'createdAt' => $msg->created_at,
                'isReadByClient' => $msg->is_read_by_client,
                'isReadByAdmin' => $msg->is_read_by_admin,
                'user' => [
                    'id' => $msg->user->id,
                    'name' => $msg->user->name,
                    'role' => $msg->user->role,
                ],
            ]
        ], 201);
    }

    public function markAsRead(Request $request, $appointmentId)
    {
        $appointment = Appointment::findOrFail($appointmentId);
        $user = $request->user();

        if ($user->role !== 'admin' && $appointment->user_id !== $user->id) {
            abort(403);
        }

        if (in_array($user->role, ['admin', 'receptionist'])) {
            AppointmentMessage::where('appointment_id', $appointmentId)
                ->where('is_read_by_admin', false)
                ->update(['is_read_by_admin' => true]);
        } else {
            AppointmentMessage::where('appointment_id', $appointmentId)
                ->where('is_read_by_client', false)
                ->update(['is_read_by_client' => true]);
        }

        return response()->json(['success' => true]);
    }
}