<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $isPgsql = DB::getDriverName() === 'pgsql';

        // 1. Modificar tipos de columna a tipos nativos optimizados
        if ($isPgsql) {
            // En PostgreSQL, para cambiar el tipo de columnas que tienen índices o restricciones asociadas,
            // primero debemos eliminar dichos índices/restricciones para evitar conflictos de bloqueo o tipo.
            Schema::table('appointments', function (Blueprint $table) {
                $table->dropIndex('idx_appointments_date');
                $table->dropIndex('idx_appointments_date_status');
            });

            Schema::table('walk_in_appointments', function (Blueprint $table) {
                $table->dropIndex('idx_walk_in_date');
                $table->dropIndex('idx_walk_in_date_status');
            });

            Schema::table('blocked_dates', function (Blueprint $table) {
                $table->dropUnique('blocked_dates_date_unique');
            });

            // Cambiar de string (VARCHAR) a DATE/TIME nativos. Esto permite realizar comparaciones y filtros
            // por rango horario en SQL sin conversiones implícitas costosas en cada fila.
            // Usamos 'USING column::type' para forzar el cast correcto en registros preexistentes.
            DB::statement('ALTER TABLE appointments ALTER COLUMN date TYPE DATE USING date::DATE');
            DB::statement('ALTER TABLE appointments ALTER COLUMN start_time TYPE TIME USING start_time::TIME');
            DB::statement('ALTER TABLE appointments ALTER COLUMN end_time TYPE TIME USING end_time::TIME');

            // Migrar campos JSON opacos (TEXT) a formato binario estructurado (JSONB) en PostgreSQL.
            // Esto habilita la indexación de atributos internos y búsquedas complejas dentro del JSON.
            DB::statement('ALTER TABLE appointments ALTER COLUMN status_history TYPE JSONB USING status_history::JSONB');

            // Mismo cambio para citas presenciales (walk-ins)
            DB::statement('ALTER TABLE walk_in_appointments ALTER COLUMN date TYPE DATE USING date::DATE');
            DB::statement('ALTER TABLE walk_in_appointments ALTER COLUMN start_time TYPE TIME USING start_time::TIME');
            DB::statement('ALTER TABLE walk_in_appointments ALTER COLUMN end_time TYPE TIME USING end_time::TIME');

            // Migrar historial de vacunas y peso de mascotas a JSONB
            DB::statement('ALTER TABLE pets ALTER COLUMN weight_history TYPE JSONB USING weight_history::JSONB');
            DB::statement('ALTER TABLE pets ALTER COLUMN vaccinations TYPE JSONB USING vaccinations::JSONB');

            // Horarios de atención en TIME real para asegurar integridad y precisión en los minutos laborables
            DB::statement('ALTER TABLE schedules ALTER COLUMN open_time TYPE TIME USING open_time::TIME');
            DB::statement('ALTER TABLE schedules ALTER COLUMN close_time TYPE TIME USING close_time::TIME');

            // Fechas bloqueadas normalizadas como DATE nativo
            DB::statement('ALTER TABLE blocked_dates ALTER COLUMN date TYPE DATE USING date::DATE');

            // Recreamos los índices y restricciones sobre las columnas que ya tienen sus nuevos tipos optimizados.
            Schema::table('appointments', function (Blueprint $table) {
                $table->index('date', 'idx_appointments_date');
                $table->index(['date', 'status'], 'idx_appointments_date_status');
            });

            Schema::table('walk_in_appointments', function (Blueprint $table) {
                $table->index('date', 'idx_walk_in_date');
                $table->index(['date', 'status'], 'idx_walk_in_date_status');
            });

            Schema::table('blocked_dates', function (Blueprint $table) {
                $table->unique('date', 'blocked_dates_date_unique');
            });
        } else {
            // Compatibilidad para SQLite (entorno de pruebas/PHPUnit):
            // SQLite no maneja tipos nativos complejos (todo se guarda internamente como TEXT/INTEGER)
            // pero el Schema Builder emula la modificación de tipos mediante recreación de tablas.
            Schema::table('appointments', function (Blueprint $table) {
                $table->date('date')->change();
                $table->time('start_time')->change();
                $table->time('end_time')->change();
                $table->json('status_history')->nullable()->change();
            });

            Schema::table('walk_in_appointments', function (Blueprint $table) {
                $table->date('date')->change();
                $table->time('start_time')->change();
                $table->time('end_time')->change();
            });

            Schema::table('pets', function (Blueprint $table) {
                $table->json('weight_history')->nullable()->change();
                $table->json('vaccinations')->nullable()->change();
            });

            Schema::table('schedules', function (Blueprint $table) {
                $table->time('open_time')->change();
                $table->time('close_time')->change();
            });

            Schema::table('blocked_dates', function (Blueprint $table) {
                $table->date('date')->change();
            });
        }

        // 2. Agregar índices críticos faltantes para resolver cuellos de botella

        // Cada carga del chat de una cita ejecuta una query por appointment_id.
        // Sin este índice, a medida que el historial de mensajes crece, la consulta se vuelve O(N).
        Schema::table('appointment_messages', function (Blueprint $table) {
            $table->index('appointment_id', 'idx_appointment_messages_appointment_id');
        });

        // La carga de la ficha o historial clínico filtra notas por appointment_id.
        // Agregamos este índice para que pase de un full-table scan a una lectura O(1) indexada.
        Schema::table('clinical_notes', function (Blueprint $table) {
            $table->index('appointment_id', 'idx_clinical_notes_appointment_id');
        });

        // La relación entre médicos y servicios se consulta en CADA proceso de booking a través de hasCapacityFor()
        // filtrando por service_id y opcionalmente doctor_id.
        // Dado que la clave primaria original es (doctor_id, service_id), PostgreSQL no puede usarla de forma
        // eficiente cuando el filtro principal es service_id. Este índice compuesto resuelve ese cuello de botella.
        Schema::table('doctor_services', function (Blueprint $table) {
            $table->index(['service_id', 'doctor_id'], 'idx_doctor_services_service_doctor');
        });
    }

    public function down(): void
    {
        $isPgsql = DB::getDriverName() === 'pgsql';

        // 1. Eliminar índices agregados
        Schema::table('appointment_messages', function (Blueprint $table) {
            $table->dropIndex('idx_appointment_messages_appointment_id');
        });

        Schema::table('clinical_notes', function (Blueprint $table) {
            $table->dropIndex('idx_clinical_notes_appointment_id');
        });

        Schema::table('doctor_services', function (Blueprint $table) {
            $table->dropIndex('idx_doctor_services_service_doctor');
        });

        // 2. Revertir tipos de columnas a string/text original
        if ($isPgsql) {
            Schema::table('appointments', function (Blueprint $table) {
                $table->dropIndex('idx_appointments_date');
                $table->dropIndex('idx_appointments_date_status');
            });

            Schema::table('walk_in_appointments', function (Blueprint $table) {
                $table->dropIndex('idx_walk_in_date');
                $table->dropIndex('idx_walk_in_date_status');
            });

            Schema::table('blocked_dates', function (Blueprint $table) {
                $table->dropUnique('blocked_dates_date_unique');
            });

            DB::statement('ALTER TABLE appointments ALTER COLUMN date TYPE VARCHAR(255)');
            DB::statement('ALTER TABLE appointments ALTER COLUMN start_time TYPE VARCHAR(255)');
            DB::statement('ALTER TABLE appointments ALTER COLUMN end_time TYPE VARCHAR(255)');
            DB::statement('ALTER TABLE appointments ALTER COLUMN status_history TYPE TEXT');

            DB::statement('ALTER TABLE walk_in_appointments ALTER COLUMN date TYPE VARCHAR(255)');
            DB::statement('ALTER TABLE walk_in_appointments ALTER COLUMN start_time TYPE VARCHAR(255)');
            DB::statement('ALTER TABLE walk_in_appointments ALTER COLUMN end_time TYPE VARCHAR(255)');

            DB::statement('ALTER TABLE pets ALTER COLUMN weight_history TYPE TEXT');
            DB::statement('ALTER TABLE pets ALTER COLUMN vaccinations TYPE TEXT');

            DB::statement('ALTER TABLE schedules ALTER COLUMN open_time TYPE VARCHAR(255)');
            DB::statement('ALTER TABLE schedules ALTER COLUMN close_time TYPE VARCHAR(255)');

            DB::statement('ALTER TABLE blocked_dates ALTER COLUMN date TYPE VARCHAR(255)');

            Schema::table('appointments', function (Blueprint $table) {
                $table->index('date', 'idx_appointments_date');
                $table->index(['date', 'status'], 'idx_appointments_date_status');
            });

            Schema::table('walk_in_appointments', function (Blueprint $table) {
                $table->index('date', 'idx_walk_in_date');
                $table->index(['date', 'status'], 'idx_walk_in_date_status');
            });

            Schema::table('blocked_dates', function (Blueprint $table) {
                $table->unique('date', 'blocked_dates_date_unique');
            });
        } else {
            Schema::table('appointments', function (Blueprint $table) {
                $table->string('date')->change();
                $table->string('start_time')->change();
                $table->string('end_time')->change();
                $table->text('status_history')->nullable()->change();
            });

            Schema::table('walk_in_appointments', function (Blueprint $table) {
                $table->string('date')->change();
                $table->string('start_time')->change();
                $table->string('end_time')->change();
            });

            Schema::table('pets', function (Blueprint $table) {
                $table->text('weight_history')->nullable()->change();
                $table->text('vaccinations')->nullable()->change();
            });

            Schema::table('schedules', function (Blueprint $table) {
                $table->string('open_time')->change();
                $table->string('close_time')->change();
            });

            Schema::table('blocked_dates', function (Blueprint $table) {
                $table->string('date')->change();
            });
        }
    }
};
