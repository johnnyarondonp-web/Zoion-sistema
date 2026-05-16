<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Doctor;
use App\Models\Appointment;

$doctor = Doctor::where('email', 'johnnyarondonp2@gmail.com')->first();

if (!$doctor) {
    die("No se encontró al doctor Johnny Rondón.\n");
}

echo "Asignando todas las citas a: {$doctor->name} (ID: {$doctor->id})\n";

$affected = Appointment::whereNull('doctor_id')
    ->orWhere('doctor_id', '!=', $doctor->id)
    ->update(['doctor_id' => $doctor->id]);

echo "Se han actualizado {$affected} citas exitosamente.\n";
