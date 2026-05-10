<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pets', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id');
            $table->string('name');
            $table->string('species');
            $table->string('breed')->nullable();
            $table->string('birthdate')->nullable();
            $table->float('weight')->nullable();
            $table->string('photo')->nullable();
            $table->text('notes')->nullable();
            $table->text('weight_history')->nullable();
            $table->text('vaccinations')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pets');
    }
};