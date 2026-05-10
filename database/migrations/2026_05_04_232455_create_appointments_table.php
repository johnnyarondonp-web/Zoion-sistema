<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id');
            $table->string('pet_id');
            $table->string('service_id');
            $table->string('date');
            $table->string('start_time');
            $table->string('end_time');
            $table->string('status')->default('pending');
            $table->text('status_history')->nullable();
            $table->text('notes')->nullable();
            $table->text('clinical_notes')->nullable();
            $table->integer('rating')->nullable();
            $table->text('review')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('pet_id')->references('id')->on('pets');
            $table->foreign('service_id')->references('id')->on('services');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};