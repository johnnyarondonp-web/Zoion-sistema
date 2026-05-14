<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('walk_in_appointments', function (Blueprint $table) {
            $table->string('id', 26)->primary();
            $table->string('walk_in_client_id', 26);
            $table->string('service_id', 26);
            $table->string('doctor_id', 26)->nullable();
            $table->string('date');
            $table->string('start_time');
            $table->string('end_time');
            // Presenciales arrancan como confirmed porque el cliente ya está ahí
            $table->string('status')->default('confirmed');
            $table->string('payment_method')->nullable();
            $table->string('payment_status')->default('pending');
            $table->decimal('payment_amount', 10, 2)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('walk_in_client_id')->references('id')->on('walk_in_clients')->onDelete('cascade');
            $table->foreign('service_id')->references('id')->on('services');
            $table->foreign('doctor_id')->references('id')->on('doctors')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('walk_in_appointments');
    }
};
