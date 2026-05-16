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

        // 2. Verificar permisos: Admin, Médico asignado o Dueño de la mascota
        $user = $request->user();
        $isStaff    = $user->role === 'admin' || $user->role === 'receptionist';
        $isAssigned = $user->role === 'doctor' && $appointment->doctor_id === $user->doctor?->id;
        $isOwner    = $appointment->user_id === $user->id;

        if (!$isStaff && !$isAssigned && !$isOwner) {
            abort(403, 'No tienes permiso para ver las notas clínicas de esta cita.');
        }

        // 3. Obtener notas ordenadas
        $notes = ClinicalNote::where('appointment_id', $appointmentId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $notes]);
    }

   
    public function store(Request $request, $appointmentId)
    {
        $appointment = Appointment::findOrFail($appointmentId);
        $user = $request->user();

        // Solo admin y el médico que atiende la cita pueden registrar notas
        $isStaff    = $user->role === 'admin';
        $isAssigned = $user->role === 'doctor' && $appointment->doctor_id === $user->doctor?->id;

        if (!$isStaff && !$isAssigned) {
            abort(403, 'Solo el médico asignado o un administrador pueden registrar notas clínicas.');
        }

        // Restricción de Tiempo: No se pueden poner notas si la cita no ha ocurrido aún
        $appointmentDateTime = \Carbon\Carbon::parse($appointment->date . ' ' . $appointment->start_time);
        if ($appointmentDateTime->isFuture()) {
            return response()->json([
                'success' => false, 
                'error' => 'No puedes registrar notas de una cita que aún no ha ocurrido. Espera a la fecha y hora programada.'
            ], 422);
        }

        $request->validate([
            'note'      => 'required|string|max:500',
            'diagnosis' => 'nullable|string|max:100',
            'treatment' => 'nullable|string|max:150',
            'follow_up' => 'nullable|string|max:150',
        ], [
            'note.max'      => 'La observación no puede exceder los 500 caracteres.',
            'diagnosis.max' => 'El diagnóstico no puede exceder los 100 caracteres.',
            'treatment.max' => 'El tratamiento no puede exceder los 150 caracteres.',
            'follow_up.max' => 'El seguimiento no puede exceder los 150 caracteres.',
        ]);

        $note = ClinicalNote::create([
            'id'             => (string) Str::ulid(),
            'appointment_id' => $appointmentId,
            'doctor_id'      => $user->role === 'doctor' ? $user->doctor?->id : null,
            'note'           => $request->note,
            'diagnosis'      => $request->diagnosis ?? null,
            'treatment'      => $request->treatment ?? null,
            'follow_up'      => $request->follow_up ?? null,
        ]);

        return response()->json(['success' => true, 'data' => $note], 201);
    }

   
    public function update(Request $request, $appointmentId, $id)
    {
        $appointment = Appointment::findOrFail($appointmentId);
        $user = $request->user();

        // Solo admin y el médico asignado pueden editar la nota
        $isStaff    = $user->role === 'admin';
        $isAssigned = $user->role === 'doctor' && $appointment->doctor_id === $user->doctor?->id;

        if (!$isStaff && !$isAssigned) {
            abort(403, 'No tienes permiso para editar esta nota clínica.');
        }

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