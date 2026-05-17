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
}
