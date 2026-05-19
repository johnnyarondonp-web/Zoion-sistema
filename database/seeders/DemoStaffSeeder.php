<?php

namespace Database\Seeders;

use App\Models\Doctor;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Crea cuentas demo de personal (Doctor y Recepcionista) con credenciales
 * conocidas para facilitar el proceso de evaluación del sistema.
 *
 * Criterios de diseño:
 *  - Idempotente: usa firstOrCreate / updateOrCreate para no duplicar registros.
 *  - El doctor demo se asigna a todos los servicios de la categoría 'consulta'
 *    para que el módulo de booking funcione sin configuración previa.
 *  - Las cuentas de User se marcan con email_verified_at para evitar la
 *    pantalla de verificación al iniciar sesión por primera vez.
 */
class DemoStaffSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Recepcionista Demo ────────────────────────────────────────────
        User::updateOrCreate(
            ['email' => 'recepcion@zoion.app'],
            [
                'id'                => (string) Str::ulid(),
                'name'              => 'Recepcionista Demo',
                'cedula'            => '10000001',
                'phone'             => '+584141000001',
                'email'             => 'recepcion@zoion.app',
                'password'          => Hash::make('password'),
                'role'              => 'receptionist',
                'email_verified_at' => now(),
            ]
        );

        // ── 2. Doctor Demo ───────────────────────────────────────────────────
        // Primero creamos el User de acceso al sistema
        $doctorUser = User::updateOrCreate(
            ['email' => 'doctor@zoion.app'],
            [
                'id'                => (string) Str::ulid(),
                'name'              => 'Dr. Demo Veterinario',
                'cedula'            => '10000002',
                'phone'             => '+584141000002',
                'email'             => 'doctor@zoion.app',
                'password'          => Hash::make('password'),
                'role'              => 'doctor',
                'email_verified_at' => now(),
            ]
        );

        // Luego creamos (o actualizamos) el perfil Doctor vinculado al User
        $doctor = Doctor::updateOrCreate(
            ['email' => 'doctor@zoion.app'],
            [
                'id'        => (string) Str::ulid(),
                'name'      => 'Dr. Demo Veterinario',
                'cedula'    => '10000002',
                'specialty' => 'Medicina General Veterinaria',
                'phone'     => '+584141000002',
                'email'     => 'doctor@zoion.app',
                'is_active' => true,
                'user_id'   => $doctorUser->id,
            ]
        );

        // Asignar todos los servicios de categoría 'consulta' al doctor demo
        $consultaIds = Service::where('category', 'consulta')
            ->where('is_active', true)
            ->pluck('id');

        $doctor->services()->syncWithoutDetaching($consultaIds);
    }
}
