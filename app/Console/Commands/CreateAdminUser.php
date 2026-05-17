<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAdminUser extends Command
{
    protected $signature   = 'zoion:admin';
    protected $description = 'Crea o restablece el usuario administrador';

    public function handle(): void
    {
        $email    = $this->ask('Email', env('ADMIN_EMAIL', 'admin@zoion.com'));
        $name     = $this->ask('Nombre', env('ADMIN_NAME', 'Administrador'));
        $password = $this->secret('Contraseña');
        if (empty($password)) {
            $password = env('ADMIN_PASSWORD', 'password');
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name'              => $name,
                'password'          => Hash::make($password),
                'role'              => 'admin',
                'email_verified_at' => now(),
            ]
        );

        $this->info("Admin listo: {$email}");
    }
}
