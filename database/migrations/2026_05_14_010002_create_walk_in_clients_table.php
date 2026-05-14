<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('walk_in_clients', function (Blueprint $table) {
            $table->string('id', 26)->primary();
            $table->string('owner_name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('pet_name');
            $table->string('pet_species');
            $table->string('pet_breed')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('walk_in_clients');
    }
};
