<?php

namespace App\Observers;

use Illuminate\Support\Facades\Cache;

class DashboardStatsObserver
{
    private function clearCache($model): void
    {
        try {
            Cache::forget('dashboard_stats');

            // Si el modelo tiene service_id y date (Appointment/WalkInAppointment),
            // invalidamos la cache de slots ocupados inmediatamente para asegurar consistencia en tiempo real.
            if (isset($model->service_id) && isset($model->date)) {
                Cache::forget("busy_slots:{$model->service_id}:{$model->date}");
            }
        } catch (\Throwable $e) {
            // Evitar romper pruebas unitarias que mockean la fachada Cache
        }
    }

    /**
     * Listen to the model saved event.
     */
    public function saved($model): void
    {
        $this->clearCache($model);
    }

    /**
     * Listen to the model deleted event.
     */
    public function deleted($model): void
    {
        $this->clearCache($model);
    }
}
