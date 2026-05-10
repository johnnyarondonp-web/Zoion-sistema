<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_notifications')->default(true)->after('email');
            $table->boolean('appointment_reminders')->default(true)->after('email_notifications');
            $table->boolean('daily_summary')->default(false)->after('appointment_reminders');
            $table->string('theme_preference')->default('system')->after('daily_summary');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['email_notifications', 'appointment_reminders', 'daily_summary', 'theme_preference']);
        });
    }
};