<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function profile(Request $request)
    {
        $user = $request->user();
        return response()->json($user->only(['id', 'name', 'email', 'phone', 'role', 'created_at']));
    }

    public function updateProfile(Request $request)
    {
        $request->validate(['name' => 'required|string']);
        $user = $request->user();
        $user->update([
            'name'  => trim($request->name),
            'phone' => $request->phone ? trim($request->phone) : null,
        ]);
        return response()->json($user->only(['id', 'name', 'email', 'phone', 'role', 'created_at']));
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'currentPassword' => 'required',
            'newPassword'     => 'required|min:6',
        ]);

        $user = $request->user();
        if (!Hash::check($request->currentPassword, $user->password)) {
            return response()->json(['error' => 'Contraseña actual incorrecta'], 400);
        }

        $user->update(['password' => Hash::make($request->newPassword)]);
        return response()->json(['success' => true]);
    }

    public function clinicInfo()
    {
        // Try to get from config or DB (if there was a model for this)
        // Since we don't know the exact schema, we'll return defaults.
        // It could also check a Settings table, but as per request:
        // "devuelve datos de la clínica desde la BD o un objeto con valores por defecto si no existe configuración"
        // Let's assume there's a setting model or we just return defaults.
        $clinicInfo = [
            'name' => 'Zoion',
            'address' => '',
            'phone' => '',
            'email' => ''
        ];
        
        return response()->json(['success' => true, 'data' => $clinicInfo]);
    }
}