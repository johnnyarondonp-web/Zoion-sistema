<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmailVerificationController extends Controller
{
    public function notice()
    {
        return Inertia::render('Auth/VerifyEmail');
    }

    public function verify(EmailVerificationRequest $request)
    {
        $request->fulfill();

        $role = $request->user()->role;
        $redirect = '/client/pets';
        
        if ($role === 'admin') $redirect = '/admin/dashboard';
        if ($role === 'doctor') $redirect = '/doctor/agenda';

        return redirect($redirect);
    }

    public function resend(Request $request)
    {
        try {
            $request->user()->sendEmailVerificationNotification();
            return back()->with('status', 'verification-link-sent');
        } catch (\Throwable $e) {
            return back()->withErrors([
                'email' => 'No se pudo enviar el correo de verificación. Por favor, verifica la configuración del servidor SMTP en el archivo .env o cámbialo a MAIL_MAILER=log.',
            ]);
        }
    }
}
