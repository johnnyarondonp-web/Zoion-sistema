<?php

namespace Database\Seeders;

use App\Models\Schedule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ScheduleSeeder extends Seeder
{
    public function run(): void
    {
        // Solo sembrar si la tabla está completamente vacía.
        if (Schedule::count() > 0) return;

        $defaults = [
            0 => ['open' => '09:00', 'close' => '18:00', 'available' => false], // Domingo
            1 => ['open' => '09:00', 'close' => '18:00', 'available' => true],  // Lunes
            2 => ['open' => '09:00', 'close' => '18:00', 'available' => true],  // Martes
            3 => ['open' => '09:00', 'close' => '18:00', 'available' => true],  // Miércoles
            4 => ['open' => '09:00', 'close' => '18:00', 'available' => true],  // Jueves
            5 => ['open' => '09:00', 'close' => '18:00', 'available' => true],  // Viernes
            6 => ['open' => '09:00', 'close' => '18:00', 'available' => false], // Sábado
        ];

        foreach ($defaults as $day => $config) {
            Schedule::create([
                'id'          => (string) Str::ulid(),
                'day_of_week' => $day,
                'open_time'   => $config['open'],
                'close_time'  => $config['close'],
                'is_available' => $config['available'],
            ]);
        }
    }
}
