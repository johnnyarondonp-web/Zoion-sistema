<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || $request->user()->role !== 'admin') {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['error' => 'No autorizado'], 403);
            }
            return redirect('/login');
        }
        
        return $next($request);
    }
}