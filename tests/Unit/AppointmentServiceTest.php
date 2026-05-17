<?php

namespace Tests\Unit;

use App\Services\AppointmentService;
use App\Models\Appointment;
use App\Models\Pet;
use App\Models\Service;
use App\Models\User;
use App\Models\Doctor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentServiceTest extends TestCase
{
    use RefreshDatabase;

    protected AppointmentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AppointmentService();
    }

    /**
     * @test
     * Prueba que el mapeo de Appointment a array (método mapAppointment) devuelva la estructura correcta.
     */
    public function test_map_appointment_returns_correct_structure_and_values()
    {
        $user = User::factory()->create(['name' => 'Juan Pérez', 'role' => 'client']);
        $pet = Pet::create([
            'id' => '01H7X1234567890ABCDEFGH001',
            'user_id' => $user->id,
            'name' => 'Firulais',
            'species' => 'perro',
            'breed' => 'Poodle',
            'gender' => 'macho',
            'birthdate' => '2020-01-01',
            'is_active' => true,
        ]);

        $serviceModel = Service::create([
            'id' => '01H7X1234567890ABCDEFGH002',
            'name' => 'Consulta Vacunación',
            'price' => 45.50,
            'duration_minutes' => 30,
            'is_active' => true,
        ]);

        $doctor = Doctor::create([
            'id' => '01H7X1234567890ABCDEFGH003',
            'name' => 'Dr. House',
            'is_active' => true,
        ]);

        $appointment = Appointment::create([
            'id' => '01H7X1234567890ABCDEFGH004',
            'user_id' => $user->id,
            'pet_id' => $pet->id,
            'service_id' => $serviceModel->id,
            'doctor_id' => $doctor->id,
            'date' => '2026-06-01',
            'start_time' => '10:00',
            'end_time' => '10:30',
            'status' => 'pending',
            'notes' => 'Control de vacunas',
            'payment_method' => 'cash',
            'payment_status' => 'pending',
            'payment_amount' => 45.50,
            'status_history' => [['status' => 'pending', 'date' => now()->toISOString()]],
        ]);

        // Cargar relaciones
        $appointment->load(['pet', 'service', 'user', 'doctor']);

        $mapped = $this->service->mapAppointment($appointment);

        $this->assertEquals('01H7X1234567890ABCDEFGH004', $mapped['id']);
        $this->assertEquals('2026-06-01', $mapped['date']);
        $this->assertEquals('10:00', $mapped['startTime']);
        $this->assertEquals('10:30', $mapped['endTime']);
        $this->assertEquals('pending', $mapped['status']);
        $this->assertEquals('cash', $mapped['paymentMethod']);
        $this->assertEquals('pending', $mapped['paymentStatus']);
        $this->assertEquals(45.50, $mapped['paymentAmount']);

        $this->assertNotNull($mapped['pet']);
        $this->assertEquals('Firulais', $mapped['pet']['name']);
        $this->assertEquals('perro', $mapped['pet']['species']);

        $this->assertNotNull($mapped['service']);
        $this->assertEquals('Consulta Vacunación', $mapped['service']['name']);
        $this->assertEquals(30, $mapped['service']['durationMinutes']);

        $this->assertNotNull($mapped['doctor']);
        $this->assertEquals('Dr. House', $mapped['doctor']['name']);
    }

    /**
     * @test
     * Prueba los métodos privados de conversión de tiempo a través de Reflection para asegurar precisión matemática de slots.
     */
    public function test_time_conversions_are_mathematically_precise()
    {
        $reflection = new \ReflectionClass(AppointmentService::class);

        $timeToMinutes = $reflection->getMethod('timeToMinutes');
        $timeToMinutes->setAccessible(true);

        $minutesToTime = $reflection->getMethod('minutesToTime');
        $minutesToTime->setAccessible(true);

        // Caso 1: 09:30 -> 570 minutos
        $minutes = $timeToMinutes->invokeArgs($this->service, ['09:30']);
        $this->assertEquals(570, $minutes);

        $time = $minutesToTime->invokeArgs($this->service, [570]);
        $this->assertEquals('09:30', $time);

        // Caso 2: 17:00 -> 1020 minutos
        $minutes = $timeToMinutes->invokeArgs($this->service, ['17:00']);
        $this->assertEquals(1020, $minutes);

        $time = $minutesToTime->invokeArgs($this->service, [1020]);
        $this->assertEquals('17:00', $time);

        // Caso 3: 00:00 -> 0 minutos
        $minutes = $timeToMinutes->invokeArgs($this->service, ['00:00']);
        $this->assertEquals(0, $minutes);

        $time = $minutesToTime->invokeArgs($this->service, [0]);
        $this->assertEquals('00:00', $time);
    }

    /**
     * @test
     * Prueba que hasCapacityFor() retorne false cuando no hay médicos asignados al servicio.
     */
    public function test_has_capacity_returns_false_when_no_doctors_assigned()
    {
        $service = Service::create([
            'id' => '01H7X1234567890ABCDEFGH009',
            'name' => 'Servicio Sin Médicos',
            'price' => 20.00,
            'duration_minutes' => 30,
            'is_active' => true,
        ]);

        $reflection = new \ReflectionClass(AppointmentService::class);
        $hasCapacityFor = $reflection->getMethod('hasCapacityFor');
        $hasCapacityFor->setAccessible(true);

        $result = $hasCapacityFor->invokeArgs($this->service, [$service->id, '2026-06-01', '10:00', '10:30']);
        $this->assertFalse($result);
    }

    /**
     * @test
     * Prueba que hasCapacityFor() gestione correctamente la disponibilidad:
     * - Retorna true si hay al menos un médico libre.
     * - Retorna false cuando todos los médicos asignados están ocupados en el rango horario o con overlap parcial.
     */
    public function test_has_capacity_with_doctors_availability_and_overlaps()
    {
        $service = Service::create([
            'id' => '01H7X1234567890ABCDEFGH010',
            'name' => 'Peluquería Canina',
            'price' => 30.00,
            'duration_minutes' => 30,
            'is_active' => true,
        ]);

        // Crear 2 médicos
        $doctorA = Doctor::create(['id' => '01H7X1234567890ABCDEFGH011', 'name' => 'Dr. A', 'is_active' => true]);
        $doctorB = Doctor::create(['id' => '01H7X1234567890ABCDEFGH012', 'name' => 'Dr. B', 'is_active' => true]);

        // Asignar ambos médicos al servicio
        $doctorA->services()->attach($service->id);
        $doctorB->services()->attach($service->id);

        $reflection = new \ReflectionClass(AppointmentService::class);
        $hasCapacityFor = $reflection->getMethod('hasCapacityFor');
        $hasCapacityFor->setAccessible(true);

        // Caso 1: Ambos médicos libres -> debe haber capacidad
        $result = $hasCapacityFor->invokeArgs($this->service, [$service->id, '2026-06-01', '10:00', '10:30']);
        $this->assertTrue($result);

        // Crear cita para Doctor A de 10:00 a 10:30
        $client = User::factory()->create(['role' => 'client']);
        $pet = Pet::create([
            'id' => '01H7X1234567890ABCDEFGH013',
            'user_id' => $client->id,
            'name' => 'Puppy',
            'species' => 'dog',
            'is_active' => true,
        ]);

        Appointment::create([
            'id' => '01H7X1234567890ABCDEFGH014',
            'user_id' => $client->id,
            'pet_id' => $pet->id,
            'service_id' => $service->id,
            'doctor_id' => $doctorA->id,
            'date' => '2026-06-01',
            'start_time' => '10:00',
            'end_time' => '10:30',
            'status' => 'confirmed',
        ]);

        // Caso 2: Doctor A ocupado de 10:00-10:30, pero Doctor B libre -> debe haber capacidad
        $result = $hasCapacityFor->invokeArgs($this->service, [$service->id, '2026-06-01', '10:00', '10:30']);
        $this->assertTrue($result);

        // Caso 3: Overlap parcial. Doctor A ocupado de 10:00-10:30, Doctor B libre.
        // Consultar de 10:15 a 10:45 -> debe haber capacidad porque B sigue libre.
        $result = $hasCapacityFor->invokeArgs($this->service, [$service->id, '2026-06-01', '10:15', '10:45']);
        $this->assertTrue($result);

        // Ahora ocupamos a Doctor B de 10:15 a 10:45
        Appointment::create([
            'id' => '01H7X1234567890ABCDEFGH015',
            'user_id' => $client->id,
            'pet_id' => $pet->id,
            'service_id' => $service->id,
            'doctor_id' => $doctorB->id,
            'date' => '2026-06-01',
            'start_time' => '10:15',
            'end_time' => '10:45',
            'status' => 'confirmed',
        ]);

        // Caso 4: Todos los médicos ocupados (overlap).
        // Doctor A está en cita (10:00 - 10:30).
        // Doctor B está en cita (10:15 - 10:45).
        // Si pedimos un slot de 10:20 a 10:50:
        // - Doctor A solapa (10:20 < 10:30 y 10:50 > 10:00) -> ocupado.
        // - Doctor B solapa (10:20 < 10:45 y 10:50 > 10:15) -> ocupado.
        // Por ende, no debe haber capacidad (retornar false).
        $result = $hasCapacityFor->invokeArgs($this->service, [$service->id, '2026-06-01', '10:20', '10:50']);
        $this->assertFalse($result);
    }
}
