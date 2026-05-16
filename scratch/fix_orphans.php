<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Doctor;
use App\Models\Appointment;

$doctor = Doctor::where('email', 'johnnyarondonp2@gmail.com')->with('services')->first();
echo "Doctor: {$doctor->name}\n";
echo "Services offered: " . implode(", ", $doctor->services->pluck('name')->toArray()) . "\n";

$orphans = Appointment::whereNull('doctor_id')->with('service')->get();
echo "\nOrphaned appointments:\n";
foreach ($orphans as $a) {
    echo "- ID: {$a->id} | Service: {$a->service->name}\n";
    
    // Check if doctor can attend this
    if ($doctor->services->contains('id', $a->service_id)) {
        echo "  -> Doctor CAN attend this. Assigning...\n";
        $a->update(['doctor_id' => $doctor->id]);
    } else {
        echo "  -> Doctor does NOT offer this service.\n";
    }
}
