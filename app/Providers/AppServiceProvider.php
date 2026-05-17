<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $clearCache = function () {
            try {
                \Illuminate\Support\Facades\Cache::forget('dashboard_stats');
            } catch (\Throwable $e) {
                // Evitar romper pruebas unitarias que mockean la fachada Cache
            }
        };

        \App\Models\Appointment::saved($clearCache);
        \App\Models\Appointment::deleted($clearCache);

        \App\Models\WalkInAppointment::saved($clearCache);
        \App\Models\WalkInAppointment::deleted($clearCache);

        \App\Models\Pet::saved($clearCache);
        \App\Models\Pet::deleted($clearCache);

        \App\Models\User::saved($clearCache);
        \App\Models\User::deleted($clearCache);
    }
}
