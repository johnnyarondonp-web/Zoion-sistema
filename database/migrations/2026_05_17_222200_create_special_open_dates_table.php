<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('special_open_dates', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->date('date')->unique();
            $table->string('open_time')->default('09:00');
            $table->string('close_time')->default('18:00');
            $table->string('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('special_open_dates');
    }
};
