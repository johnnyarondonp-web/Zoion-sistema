<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    public function showRegister()
    {
        return Inertia::render('Auth/Register');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();

            $user = Auth::user();

            $redirects = [
                'admin'        => '/admin/dashboard',
                'receptionist' => '/admin/appointments',
                'doctor'       => '/doctor/agenda',
                'client'       => '/client/pets',
            ];

            return redirect()->intended($redirects[$user->role] ?? '/client/pets');
        }

        return back()->withErrors([
            'email' => 'Las credenciales no son correctas.',
        ]);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'min:3', 'max:50', 'regex:/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/'],
            'email'    => ['required', 'email', 'max:60', 'regex:/.com$/', 'unique:users'],
            'phone'    => ['required', 'string', 'regex:/^\+58\d{9}$/'],
            'password' => ['required', 'min:6', 'max:30', 'confirmed'],
        ], [
            'name.regex'  => 'El nombre solo debe contener letras.',
            'name.min'    => 'El nombre debe tener al menos 3 caracteres.',
            'name.max'    => 'El nombre no puede exceder los 50 caracteres.',
            'email.max'   => 'El correo no puede exceder los 60 caracteres.',
            'email.regex' => 'El correo debe terminar en .com.',
            'phone.regex' => 'El teléfono debe tener el formato +58 seguido de 9 dígitos.',
            'password.min' => 'La contraseña debe tener al menos 6 caracteres.',
            'password.max' => 'La contraseña no puede exceder los 30 caracteres.',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'phone'    => $data['phone'],
            'password' => Hash::make($data['password']),
            'role'     => 'client',
        ]);

        Auth::login($user);

        return redirect('/client/pets');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}