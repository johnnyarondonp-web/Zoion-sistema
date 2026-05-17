<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            ScheduleSeeder::class,
        ]);

        User::factory()->create([
            'id'                => (string) Str::ulid(),
            'name'              => 'Test User',
            'email'             => 'test@example.com',
            'email_verified_at' => now(),
        ]);
    }
}