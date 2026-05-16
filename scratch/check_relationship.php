<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$user = User::where('email', 'johnnyarondonp2@gmail.com')->with('doctor')->first();
if ($user) {
    echo "User ID: {$user->id}\n";
    echo "Doctor ID via relationship: " . ($user->doctor?->id ?? 'NULL') . "\n";
} else {
    echo "User not found\n";
}
