<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('doctor_id', 26)->nullable()->after('service_id');
            // 'online' para citas desde el portal, 'admin_booked' cuando las crea
            // el admin manualmente, 'walk_in' para atención presencial
            $table->string('source')->default('online')->after('doctor_id');
            $table->string('payment_method')->nullable()->after('cancel_reason');
            $table->string('payment_status')->default('pending')->after('payment_method');
            $table->decimal('payment_amount', 10, 2)->nullable()->after('payment_status');
            $table->timestamp('paid_at')->nullable()->after('payment_amount');

            $table->foreign('doctor_id')->references('id')->on('doctors')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['doctor_id']);
            $table->dropColumn(['doctor_id', 'source', 'payment_method', 'payment_status', 'payment_amount', 'paid_at']);
        });
    }
};
