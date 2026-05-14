<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    // Verifica que el usuario autenticado tenga alguno de los roles indicados.
    // Se usa como: Route::middleware(['auth', 'role:admin,receptionist'])
    public function handle(Request $request, Closure $next, string ...$roles): mixed
    {
        if (!in_array($request->user()?->role, $roles)) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['error' => 'No autorizado'], 403);
            }
            abort(403, 'No autorizado');
        }

        return $next($request);
    }
}
