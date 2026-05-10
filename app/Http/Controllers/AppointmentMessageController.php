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
            ->get();

        return response()->json(['success' => true, 'data' => $messages]);
    }

    public function store(Request $request, $appointmentId)
    {
        $appointment = Appointment::findOrFail($appointmentId);
        $user = $request->user();

        if ($user->role !== 'admin' && $appointment->user_id !== $user->id) {
            abort(403);
        }

        $request->validate(['message' => 'required|string']);

        $message = AppointmentMessage::create([
            'id'             => (string) Str::ulid(),
            'appointment_id' => $appointmentId,
            'user_id'        => $user->id,
            'message'        => $request->message,
            'created_at'     => now(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => $message->load('user:id,name,role')
        ], 201);
    }
}