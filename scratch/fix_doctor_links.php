<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

$doctors = Doctor::whereNull('user_id')->get();
foreach ($doctors as $doctor) {
    $user = User::where('email', $doctor->email)->first();
    if ($user) {
        $doctor->update(['user_id' => $user->id]);
        echo "Linked doctor {$doctor->email} to existing user {$user->id}\n";
        
        // Sync password if cedula exists
        if ($doctor->cedula) {
            $user->update(['password' => Hash::make($doctor->cedula)]);
            echo "Updated password for {$doctor->email} to match cedula {$doctor->cedula}\n";
        }
    } else {
        echo "No user found for {$doctor->email}. Creating one...\n";
        $user = User::create([
            'id'       => (string) \Illuminate\Support\Str::ulid(),
            'name'     => $doctor->name,
            'email'    => $doctor->email,
            'password' => Hash::make($doctor->cedula ?? '123456'), // Usar cédula o default
            'role'     => 'doctor',
        ]);
        $doctor->update(['user_id' => $user->id]);
        echo "Created and linked user {$user->id} for doctor {$doctor->email}\n";
    }
}
