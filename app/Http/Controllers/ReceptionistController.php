<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ReceptionistController extends Controller
{
    public function index()
    {
        $receptionists = User::where('role', 'receptionist')
            ->orderBy('created_at', 'desc')
            ->get(['id', 'name', 'cedula', 'email', 'phone', 'created_at']);

        return response()->json(['success' => true, 'data' => $receptionists]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|min:4|max:40|regex:/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/',
            'cedula'   => 'required|string|unique:users,cedula|numeric|between:5000000,33000000',
            'email'    => 'required|string|email|max:50|unique:users',
            'password' => 'required|string|min:6',
            'phone'    => 'nullable|string|max:20',
        ]);

        $receptionist = User::create([
            'id'       => (string) Str::ulid(),
            'name'     => $request->name,
            'cedula'   => $request->cedula,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'phone'    => $request->phone,
            'role'     => 'receptionist',
        ]);

        return response()->json([
            'success' => true,
            'data'    => $receptionist->only(['id', 'name', 'cedula', 'email', 'phone', 'created_at'])
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $receptionist = User::where('role', 'receptionist')->findOrFail($id);

        $request->validate([
            'name'   => 'required|string|min:4|max:40|regex:/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/',
            'cedula' => 'required|string|unique:users,cedula,' . $id . '|numeric|between:5000000,33000000',
            'email'  => 'required|string|email|max:50|unique:users,email,' . $id,
            'phone'  => 'nullable|string|max:20',
        ]);

        $receptionist->update([
            'name'   => $request->name,
            'cedula' => $request->cedula,
            'email'  => $request->email,
            'phone'  => $request->phone,
        ]);

        if ($request->filled('password')) {
            $request->validate(['password' => 'string|min:6']);
            $receptionist->update(['password' => Hash::make($request->password)]);
        }

        return response()->json([
            'success' => true,
            'data'    => $receptionist->only(['id', 'name', 'cedula', 'email', 'phone', 'created_at'])
        ]);
    }

    public function destroy($id)
    {
        $receptionist = User::where('role', 'receptionist')->findOrFail($id);
        $receptionist->delete();

        return response()->json(['success' => true]);
    }
}
