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
        Schema::table('walk_in_clients', function (Blueprint $table) {
            $table->date('pet_birth_date')->nullable()->after('pet_breed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('walk_in_clients', function (Blueprint $table) {
            $table->dropColumn('pet_birth_date');
        });
    }
};
