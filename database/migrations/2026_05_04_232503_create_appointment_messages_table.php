<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('appointment_messages', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('appointment_id');
            $table->string('user_id');
            $table->text('message');
            $table->timestamp('created_at')->nullable();

            $table->foreign('appointment_id')->references('id')->on('appointments')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_messages');
    }
};