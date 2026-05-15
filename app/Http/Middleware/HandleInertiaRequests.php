<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id'    => $request->user()->id,
                    'name'  => $request->user()->name,
                    'email' => $request->user()->email,
                    'role'  => $request->user()->role,
                    'phone' => $request->user()->phone,
                ] : null,
                'unreadMessages' => $request->user()
                    ? (in_array($request->user()->role, ['admin', 'receptionist'])
                        // Admin: messages sent by clients that the admin hasn't read
                        ? \App\Models\AppointmentMessage::where('is_read_by_admin', false)
                            ->whereHas('user', fn($q) => $q->where('role', 'client'))
                            ->count()
                        // Client: messages sent by admin/receptionist that the client hasn't read
                        : \App\Models\AppointmentMessage::whereHas('appointment', fn($q) => $q->where('user_id', $request->user()->id))
                            ->where('is_read_by_client', false)
                            ->whereHas('user', fn($q) => $q->whereIn('role', ['admin', 'receptionist']))
                            ->count())
                    : 0,
            ],
        ];
    }
}