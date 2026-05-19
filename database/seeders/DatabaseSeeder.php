<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // Orden obligatorio: primero el admin, luego los servicios,
        // luego el staff (que necesita servicios para la asignación).
        $this->call([
            AdminUserSeeder::class,
            ScheduleSeeder::class,
            ServiceSeeder::class,
            DemoStaffSeeder::class,
        ]);

        // Cliente de prueba para evaluación del portal
        User::updateOrCreate(
            ['email' => 'cliente@zoion.app'],
            [
                'id'                => (string) Str::ulid(),
                'name'              => 'Cliente Demo',
                'email'             => 'cliente@zoion.app',
                'phone'             => '+584141000003',
                'password'          => Hash::make('password'),
                'role'              => 'client',
                'email_verified_at' => now(),
            ]
        );
    }
}