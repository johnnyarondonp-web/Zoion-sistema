<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Pobla la tabla `services` con el catálogo base de la clínica Zoion.
 * Se ejecuta con idempotencia: si el servicio ya existe (por nombre),
 * actualiza sus datos en lugar de insertar un duplicado.
 */
class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            // ── Consultas ───────────────────────────────────────────────────────
            [
                'name'             => 'Consulta General',
                'description'      => 'Evaluación completa del estado de salud de tu mascota. El veterinario revisa signos vitales, peso, condición corporal y detecta cualquier anomalía temprana.',
                'duration_minutes' => 30,
                'price'            => 20,
                'category'         => 'consulta',
                'is_active'        => true,
            ],
            [
                'name'             => 'Consulta de Seguimiento',
                'description'      => 'Revisión posterior a un tratamiento o diagnóstico previo para verificar la evolución del paciente y ajustar indicaciones si es necesario.',
                'duration_minutes' => 20,
                'price'            => 15,
                'category'         => 'consulta',
                'is_active'        => true,
            ],
            [
                'name'             => 'Consulta Cardiológica',
                'description'      => 'Evaluación especializada del sistema cardiovascular. Se revisa frecuencia cardíaca, presión y se detectan soplos u otras alteraciones del corazón.',
                'duration_minutes' => 30,
                'price'            => 25,
                'category'         => 'consulta',
                'is_active'        => true,
            ],
            [
                'name'             => 'Consulta Dermatológica',
                'description'      => 'Diagnóstico de afecciones de piel, pelo y uñas. Incluye revisión de alergias, hongos, parásitos externos y condiciones crónicas de la piel.',
                'duration_minutes' => 20,
                'price'            => 15,
                'category'         => 'consulta',
                'is_active'        => true,
            ],
            [
                'name'             => 'Consulta Oftalmológica',
                'description'      => 'Examen especializado de los ojos para detectar infecciones, cataratas, glaucoma u otras condiciones que puedan afectar la visión de tu mascota.',
                'duration_minutes' => 20,
                'price'            => 15,
                'category'         => 'consulta',
                'is_active'        => true,
            ],
            [
                'name'             => 'Extracción de cuerpo extraño',
                'description'      => 'Procedimiento para remover objetos ingeridos o incrustados que representen riesgo para la salud o la vida del paciente.',
                'duration_minutes' => 60,
                'price'            => 80,
                'category'         => 'consulta',
                'is_active'        => true,
            ],
            [
                'name'             => 'Tratamiento Ocular',
                'description'      => 'Aplicación de medicamentos y procedimientos terapéuticos para tratar infecciones, úlceras corneales u otras condiciones oculares diagnosticadas.',
                'duration_minutes' => 25,
                'price'            => 20,
                'category'         => 'consulta',
                'is_active'        => true,
            ],

            // ── Cirugías ────────────────────────────────────────────────────────
            [
                'name'             => 'Esterilización (hembra)',
                'description'      => 'Procedimiento quirúrgico para la extirpación de ovarios y útero. Previene enfermedades reproductivas y contribuye al control de la población animal.',
                'duration_minutes' => 60,
                'price'            => 80,
                'category'         => 'cirugia',
                'is_active'        => true,
            ],
            [
                'name'             => 'Castración (macho)',
                'description'      => 'Extirpación quirúrgica de los testículos. Reduce comportamientos agresivos, previene enfermedades prostáticas y contribuye al bienestar del animal.',
                'duration_minutes' => 60,
                'price'            => 80,
                'category'         => 'cirugia',
                'is_active'        => true,
            ],
            [
                'name'             => 'Cirugía de Tejidos Blandos',
                'description'      => 'Intervención quirúrgica sobre órganos internos, piel o músculo. Indicada para tumores, hernias, obstrucciones u otras condiciones que requieren corrección quirúrgica.',
                'duration_minutes' => 60,
                'price'            => 80,
                'category'         => 'cirugia',
                'is_active'        => true,
            ],
            [
                'name'             => 'Extracción Dental',
                'description'      => 'Remoción de piezas dentales dañadas, infectadas o que causan dolor. Se realiza bajo anestesia para garantizar la comodidad del paciente.',
                'duration_minutes' => 40,
                'price'            => 60,
                'category'         => 'cirugia',
                'is_active'        => true,
            ],

            // ── Diagnóstico ─────────────────────────────────────────────────────
            [
                'name'             => 'Revisión Pre-quirúrgica',
                'description'      => 'Evaluación obligatoria antes de cualquier cirugía. Incluye análisis de riesgo anestésico, examen físico y revisión de exámenes de laboratorio.',
                'duration_minutes' => 30,
                'price'            => 20,
                'category'         => 'diagnostico',
                'is_active'        => true,
            ],
            [
                'name'             => 'Electrocardiograma',
                'description'      => 'Registro de la actividad eléctrica del corazón para detectar arritmias, bloqueos o alteraciones cardíacas que requieran seguimiento o tratamiento.',
                'duration_minutes' => 30,
                'price'            => 25,
                'category'         => 'diagnostico',
                'is_active'        => true,
            ],
            [
                'name'             => 'Tratamiento de Piel',
                'description'      => 'Aplicación de terapias específicas para controlar y tratar condiciones dermatológicas como dermatitis, infecciones bacterianas o micóticas.',
                'duration_minutes' => 40,
                'price'            => 30,
                'category'         => 'diagnostico',
                'is_active'        => true,
            ],

            // ── Prevención ──────────────────────────────────────────────────────
            [
                'name'             => 'Vacunación',
                'description'      => 'Aplicación del esquema de vacunas correspondiente según la edad y especie. Protege contra enfermedades infecciosas graves y mantiene al día el carnet sanitario.',
                'duration_minutes' => 10,
                'price'            => 5,
                'category'         => 'prevencion',
                'is_active'        => true,
            ],
            [
                'name'             => 'Desparasitación',
                'description'      => 'Tratamiento interno y/o externo para eliminar parásitos como pulgas, garrapatas, gusanos intestinales y otros que afectan la salud del animal.',
                'duration_minutes' => 20,
                'price'            => 15,
                'category'         => 'prevencion',
                'is_active'        => true,
            ],
            [
                'name'             => 'Limpieza Dental',
                'description'      => 'Remoción de sarro y placa bacteriana bajo anestesia. Previene enfermedades periodontales y mejora la salud bucal general de la mascota.',
                'duration_minutes' => 40,
                'price'            => 30,
                'category'         => 'prevencion',
                'is_active'        => true,
            ],
        ];

        foreach ($services as $data) {
            // Solo se genera un ULID nuevo si el servicio no existe todavía.
            // Nunca se toca el id en el bloque de "update" para respetar
            // las FK que appointments ya tiene apuntando a ese id.
            $exists = Service::where('name', $data['name'])->first();

            if ($exists) {
                $exists->update(array_diff_key($data, ['name' => true]));
            } else {
                Service::create(array_merge($data, ['id' => (string) Str::ulid()]));
            }
        }
    }
}
