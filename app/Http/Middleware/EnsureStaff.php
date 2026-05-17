<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaff
{
    /**
     * Asegura que el usuario autenticado forme parte del personal administrativo (admin o recepcionista).
     * Reemplaza al middleware EnsureAdmin que estaba mal nombrado, ya que protegía rutas que también
     * corresponden al personal de recepción.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !in_array($request->user()->role, ['admin', 'receptionist'])) {
            if ($request->expectsJson() || $request->is('api/*') || $request->is('api/v1/*')) {
                return response()->json(['error' => 'No autorizado'], 403);
            }
            return redirect('/login');
        }
        
        return $next($request);
    }
}
