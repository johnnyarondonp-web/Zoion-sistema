<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointment_messages', function (Blueprint $table) {
            $table->boolean('is_read_by_client')->default(false);
            $table->boolean('is_read_by_admin')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointment_messages', function (Blueprint $table) {
            $table->dropColumn(['is_read_by_client', 'is_read_by_admin']);
        });
    }
};
