<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Appointment;
use App\Models\Doctor;

$appointments = Appointment::with('service')->get();
echo "Total appointments: " . $appointments->count() . "\n";
foreach ($appointments as $a) {
    echo "ID: {$a->id} | Service: {$a->service->name} | Date: {$a->date} | Doctor ID: " . ($a->doctor_id ?? 'NULL') . "\n";
}

$doctor = Doctor::where('email', 'johnnyarondonp2@gmail.com')->first();
if ($doctor) {
    echo "\nDoctor Johnny Rondón ID: {$doctor->id}\n";
    $assigned = Appointment::where('doctor_id', $doctor->id)->count();
    echo "Appointments explicitly assigned to him: {$assigned}\n";
}
