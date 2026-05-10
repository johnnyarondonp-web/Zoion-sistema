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
}