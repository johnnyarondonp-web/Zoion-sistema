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
        $clearCache = function ($model) {
            try {
                \Illuminate\Support\Facades\Cache::forget('dashboard_stats');

                // Si el modelo tiene service_id y date (Appointment/WalkInAppointment),
                // invalidamos la cache de slots ocupados inmediatamente para asegurar consistencia en tiempo real.
                if (isset($model->service_id) && isset($model->date)) {
                    \Illuminate\Support\Facades\Cache::forget("busy_slots:{$model->service_id}:{$model->date}");
                }
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
