<?php

namespace App\Http\Controllers;

use App\Models\ClinicalNote;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ClinicalNoteController extends Controller
{
   
    public function index(Request $request, $appointmentId)
    {
        // 1. Buscar la cita
        $appointment = Appointment::findOrFail($appointmentId);

        // 2. Verificar permisos (Admin o Dueño de la cita)
        $user = $request->user();
        if ($user->role !== 'admin' && $appointment->user_id !== $user->id) {
            abort(403, 'No autorizado para ver estas notas clínicas.');
        }

        // 3. Obtener notas ordenadas
        $notes = ClinicalNote::where('appointment_id', $appointmentId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $notes]);
    }

   
    public function store(Request $request, $appointmentId)
    {
        // Solo admins pueden crear notas
        abort_if($request->user()->role !== 'admin', 403, 'Solo administradores pueden crear notas clínicas.');

        $request->validate([
            'note'      => 'required|string',
            'diagnosis' => 'nullable|string',
            'treatment' => 'nullable|string',
            'follow_up' => 'nullable|string',
        ]);

        $note = ClinicalNote::create([
            'id'             => (string) Str::ulid(),
            'appointment_id' => $appointmentId,
            'note'           => $request->note,
            'diagnosis'      => $request->diagnosis ?? null,
            'treatment'      => $request->treatment ?? null,
            'follow_up'      => $request->followUp ?? null,
        ]);

        return response()->json(['success' => true, 'data' => $note], 201);
    }

   
    public function update(Request $request, $appointmentId, $id)
    {
        // Solo admins pueden editar notas
        abort_if($request->user()->role !== 'admin', 403, 'Solo administradores pueden editar notas clínicas.');

        $note = ClinicalNote::where('id', $id)
            ->where('appointment_id', $appointmentId)
            ->firstOrFail();

        $note->update([
            'note'      => $request->note ?? $note->note,
            'diagnosis' => $request->diagnosis ?? $note->diagnosis,
            'treatment' => $request->treatment ?? $note->treatment,
            'follow_up' => $request->followUp ?? $note->follow_up,
        ]);

        return response()->json(['success' => true, 'data' => $note]);
    }

   
    public function destroy(Request $request, $appointmentId, $id)
    {
        // Solo admins pueden eliminar notas
        abort_if($request->user()->role !== 'admin', 403, 'Solo administradores pueden eliminar notas clínicas.');

        ClinicalNote::where('id', $id)
            ->where('appointment_id', $appointmentId)
            ->firstOrFail()
            ->delete();

        return response()->json(['success' => true]);
    }
}