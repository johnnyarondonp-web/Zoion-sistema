<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Appointments es la tabla más consultada del sistema. Filtramos constantemente
        // por date (vista de agenda, dashboard), status (pendientes, confirmadas) y
        // user_id/doctor_id (vistas de cliente y médico). Sin índices, cada query
        // de listado hace full-table scan, lo que a 1000+ citas empieza a doler.
        Schema::table('appointments', function (Blueprint $table) {
            $table->index('date',      'idx_appointments_date');
            $table->index('status',    'idx_appointments_status');
            $table->index('user_id',   'idx_appointments_user_id');
            $table->index('doctor_id', 'idx_appointments_doctor_id');

            // Índice compuesto para la query de disponibilidad: busca por fecha + estado
            // juntos en hasCapacityFor() y en el listado principal con filtros.
            $table->index(['date', 'status'], 'idx_appointments_date_status');
        });

        Schema::table('pets', function (Blueprint $table) {
            // user_id se filtra en cada carga de "mis mascotas" y en el wizard de citas.
            $table->index('user_id', 'idx_pets_user_id');
        });

        Schema::table('notifications', function (Blueprint $table) {
            // Combinamos user_id con read_at para que el query de "cuántas no leídas
            // tiene este usuario" sea un index scan en lugar de full scan.
            $table->index(['user_id', 'read_at'], 'idx_notifications_user_read');
        });

        Schema::table('walk_in_appointments', function (Blueprint $table) {
            $table->index('date',      'idx_walk_in_date');
            $table->index('status',    'idx_walk_in_status');
            $table->index('doctor_id', 'idx_walk_in_doctor_id');

            $table->index(['date', 'status'], 'idx_walk_in_date_status');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('idx_appointments_date');
            $table->dropIndex('idx_appointments_status');
            $table->dropIndex('idx_appointments_user_id');
            $table->dropIndex('idx_appointments_doctor_id');
            $table->dropIndex('idx_appointments_date_status');
        });

        Schema::table('pets', function (Blueprint $table) {
            $table->dropIndex('idx_pets_user_id');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('idx_notifications_user_read');
        });

        Schema::table('walk_in_appointments', function (Blueprint $table) {
            $table->dropIndex('idx_walk_in_date');
            $table->dropIndex('idx_walk_in_status');
            $table->dropIndex('idx_walk_in_doctor_id');
            $table->dropIndex('idx_walk_in_date_status');
        });
    }
};
