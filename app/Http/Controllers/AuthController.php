<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
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

        $throttleKey = Str::lower($request->input('email')) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return back()->withErrors([
                'email' => "Demasiados intentos fallidos. Por favor, espera {$seconds} segundos antes de intentar de nuevo.",
            ]);
        }

        $remember = $request->boolean('remember');

        if (Auth::attempt($credentials, $remember)) {
            RateLimiter::clear($throttleKey);
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

        RateLimiter::hit($throttleKey, 120); // Bloqueo por 2 minutos (120 seg) si llega al límite

        return back()->withErrors([
            'email' => 'Las credenciales no son correctas.',
        ]);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'min:3', 'max:50', 'regex:/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/'],
            'email'    => ['required', 'email:rfc', 'max:60', 'unique:users'],
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

        $user = User::forceCreate([
            'id'       => (string) \Illuminate\Support\Str::ulid(),
            'name'     => $data['name'],
            'email'    => $data['email'],
            'phone'    => $data['phone'],
            'password' => Hash::make($data['password']),
            'role'     => 'client',
        ]);

        event(new \Illuminate\Auth\Events\Registered($user));

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