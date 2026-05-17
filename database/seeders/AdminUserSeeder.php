<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@zoion.com');
        $user = User::where('email', $email)->first();

        if ($user) {
            $user->update([
                'name'              => env('ADMIN_NAME', 'Administrador'),
                'password'          => Hash::make(env('ADMIN_PASSWORD', 'password')),
                'role'              => 'admin',
                'email_verified_at' => now(),
            ]);
        } else {
            $user = new User();
            $user->id                = (string) \Illuminate\Support\Str::ulid();
            $user->email             = $email;
            $user->name              = env('ADMIN_NAME', 'Administrador');
            $user->password          = Hash::make(env('ADMIN_PASSWORD', 'password'));
            $user->role              = 'admin';
            $user->email_verified_at = now();
            $user->save();
        }
    }
}
