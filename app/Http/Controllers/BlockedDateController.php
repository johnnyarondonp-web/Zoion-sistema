<?php

namespace App\Http\Controllers;

use App\Models\BlockedDate;
use App\Models\Appointment;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BlockedDateController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => BlockedDate::orderBy('date')->get()]);
    }

    public function store(Request $request)
    {
        abort_if($request->user()->role !== 'admin', 403);
        $request->validate([
            'date'   => 'required|date_format:Y-m-d|after_or_equal:today',
            'reason' => 'nullable|string|max:200',
        ]);

        $blocked = null;
        DB::transaction(function () use ($request, &$blocked) {
            $blocked = BlockedDate::create([
                'id'     => (string) Str::ulid(),
                'date'   => $request->date,
                'reason' => $request->reason ?? null,
            ]);

            $today = now()->toDateString();
            if ($blocked->date === $today) {
                $appointments = Appointment::where('date', $today)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->with('user')
                    ->get();

                foreach ($appointments as $appointment) {
                    $history = $appointment->status_history ?? [];
                    $history[] = ['status' => 'cancelled', 'date' => now()->toISOString()];
                    $appointment->update([
                        'status'         => 'cancelled',
                        'status_history' => $history,
                        'cancel_reason'  => $request->reason ?? 'Clínica no disponible este día',
                        'cancelled_at'   => now(),
                    ]);

                    try {
                        Notification::create([
                            'user_id' => $appointment->user_id,
                            'title'   => 'Cita cancelada',
                            'message' => 'Tu cita del día de hoy ha sido cancelada. Motivo: ' . ($request->reason ?? 'La clínica no estará disponible hoy') . '. Puedes reagendar cuando quieras.',
                            'type'    => 'appointment_cancelled',
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Error al notificar cancelación de cita ' . $appointment->id . ': ' . $e->getMessage());
                    }
                }
            }
        });

        return response()->json(['success' => true, 'data' => $blocked], 201);
    }

    public function destroy(Request $request, $id)
    {
        abort_if($request->user()->role !== 'admin', 403);
        BlockedDate::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
}