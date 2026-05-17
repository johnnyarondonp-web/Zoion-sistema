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
        \App\Models\Appointment::observe(\App\Observers\DashboardStatsObserver::class);
        \App\Models\WalkInAppointment::observe(\App\Observers\DashboardStatsObserver::class);
        \App\Models\Pet::observe(\App\Observers\DashboardStatsObserver::class);
        \App\Models\User::observe(\App\Observers\DashboardStatsObserver::class);
    }
}
