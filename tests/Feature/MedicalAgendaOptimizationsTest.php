<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Doctor;
use App\Models\Pet;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class MedicalAgendaOptimizationsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $doctorUser;
    private Doctor $doctor;
    private User $client;
    private Pet $pet;
    private Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        
        $this->doctorUser = User::factory()->create(['role' => 'doctor']);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'name' => 'Dr. House',
            'specialty' => 'Diagnóstico',
            'is_active' => true,
        ]);
        $this->doctorUser->refresh();

        $this->client = User::factory()->create(['role' => 'client']);
        $this->pet = Pet::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'name' => 'Firulais',
            'species' => 'perro',
            'is_active' => true,
        ]);

        $this->service = Service::create([
            'id' => (string) Str::ulid(),
            'name' => 'Consulta',
            'duration_minutes' => 30,
            'price' => 100,
            'category' => 'consulta',
            'is_active' => true,
        ]);
    }

    /** @test */
    public function test_admin_can_see_assigned_doctor_in_appointments_list()
    {
        $appointment = Appointment::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'pet_id' => $this->pet->id,
            'service_id' => $this->service->id,
            'doctor_id' => $this->doctor->id,
            'date' => now()->format('Y-m-d'),
            'start_time' => '10:00',
            'end_time' => '10:30',
            'status' => 'confirmed',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/appointments');

        $response->assertStatus(200)
            ->assertJsonPath('data.appointments.0.doctor.name', 'Dr. House');
    }

    /** @test */
    public function test_clinical_note_saves_doctor_id_when_created_by_doctor()
    {
        // Asegurarse de que la relación esté cargada/fresca
        $this->doctorUser->refresh();

        $appointment = Appointment::create([
            'id' => (string) Str::ulid(),
            'user_id' => $this->client->id,
            'pet_id' => $this->pet->id,
            'service_id' => $this->service->id,
            'doctor_id' => $this->doctor->id,
            'date' => now()->subDays(1)->format('Y-m-d'),
            'start_time' => '10:00',
            'end_time' => '10:30',
            'status' => 'confirmed',
        ]);

        $response = $this->actingAs($this->doctorUser)->postJson("/api/appointments/{$appointment->id}/clinical-notes", [
            'note' => 'Test clinical note',
            'diagnosis' => 'Healthy',
        ]);

        $response->assertStatus(201);
        
        $this->assertDatabaseHas('clinical_notes', [
            'appointment_id' => $appointment->id,
            'doctor_id' => $this->doctor->id,
            'note' => 'Test clinical note',
        ]);
    }

    /** @test */
    public function test_admin_can_manage_receptionists()
    {
        // 1. List
        $response = $this->actingAs($this->admin)->getJson('/api/admin/receptionists');
        $response->assertStatus(200);

        // 2. Create
        $response = $this->actingAs($this->admin)->postJson('/api/admin/receptionists', [
            'name' => 'Receptionist One',
            'email' => 'reception@example.com',
            'password' => 'password123',
            'phone' => '+584120000000',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Receptionist One');
        
        $receptionistId = $response->json('data.id');

        $this->assertDatabaseHas('users', [
            'email' => 'reception@example.com',
            'role' => 'receptionist',
        ]);

        // 3. Update
        $response = $this->actingAs($this->admin)->patchJson("/api/admin/receptionists/{$receptionistId}", [
            'name' => 'Receptionist Updated',
            'email' => 'reception@example.com',
            'phone' => '+584129999999',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Receptionist Updated');

        // 4. Delete
        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/receptionists/{$receptionistId}");
        $response->assertStatus(200);

        $this->assertDatabaseMissing('users', ['id' => $receptionistId]);
    }
}
