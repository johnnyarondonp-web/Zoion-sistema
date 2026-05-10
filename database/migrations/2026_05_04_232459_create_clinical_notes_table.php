<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('clinical_notes', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('appointment_id');
            $table->text('note');
            $table->text('diagnosis')->nullable();
            $table->text('treatment')->nullable();
            $table->text('follow_up')->nullable();
            $table->timestamps();

            $table->foreign('appointment_id')->references('id')->on('appointments')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_notes');
    }
};