<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DoctorController extends Controller
{
    public function index()
    {
        $doctors = Doctor::with('services')
            ->withCount(['appointments' => fn ($q) => $q->whereIn('status', ['pending', 'confirmed'])])
            ->orderBy('name')
            ->get()
            ->map(fn ($d) => [
                'id'                 => $d->id,
                'name'               => $d->name,
                'specialty'          => $d->specialty,
                'phone'              => $d->phone,
                'email'              => $d->email,
                'photo'              => $d->photo,
                'isActive'           => $d->is_active,
                'appointmentsCount'  => $d->appointments_count,
                'services'           => $d->services->map(fn ($s) => [
                    'id'   => $s->id,
                    'name' => $s->name,
                ]),
            ]);

        return response()->json(['success' => true, 'data' => $doctors]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'       => 'required|string|max:255',
            'specialty'  => 'nullable|string|max:255',
            'phone'      => 'nullable|string|max:30',
            'email'      => 'nullable|email|max:150',
            'photo'      => 'nullable|string',
            'isActive'   => 'boolean',
            'serviceIds' => 'nullable|array',
            'serviceIds.*' => 'string|exists:services,id',
        ]);

        $doctor = DB::transaction(function () use ($data) {
            $doctor = Doctor::create([
                'name'      => $data['name'],
                'specialty' => $data['specialty'] ?? null,
                'phone'     => $data['phone'] ?? null,
                'email'     => $data['email'] ?? null,
                'photo'     => $data['photo'] ?? null,
                'is_active' => $data['isActive'] ?? true,
            ]);

            if (!empty($data['serviceIds'])) {
                $doctor->services()->sync($data['serviceIds']);
            }

            return $doctor;
        });

        return response()->json([
            'success' => true,
            'data'    => $this->formatDoctor($doctor->load('services')),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $doctor = Doctor::findOrFail($id);

        $data = $request->validate([
            'name'       => 'sometimes|string|max:255',
            'specialty'  => 'nullable|string|max:255',
            'phone'      => 'nullable|string|max:30',
            'email'      => 'nullable|email|max:150',
            'photo'      => 'nullable|string',
            'isActive'   => 'boolean',
            'serviceIds' => 'nullable|array',
            'serviceIds.*' => 'string|exists:services,id',
        ]);

        DB::transaction(function () use ($doctor, $data) {
            $doctor->update(array_filter([
                'name'      => $data['name'] ?? null,
                'specialty' => $data['specialty'] ?? null,
                'phone'     => $data['phone'] ?? null,
                'email'     => $data['email'] ?? null,
                'photo'     => $data['photo'] ?? null,
                'is_active' => $data['isActive'] ?? null,
            ], fn ($v) => $v !== null));

            if (array_key_exists('serviceIds', $data)) {
                $doctor->services()->sync($data['serviceIds'] ?? []);
            }
        });

        return response()->json([
            'success' => true,
            'data'    => $this->formatDoctor($doctor->fresh('services')),
        ]);
    }

    public function destroy($id)
    {
        $doctor = Doctor::findOrFail($id);

        // No borramos físicamente si el doctor tiene citas asignadas — lo desactivamos.
        if ($doctor->appointments()->whereIn('status', ['pending', 'confirmed'])->exists()) {
            return response()->json([
                'success' => false,
                'error'   => 'El médico tiene citas activas. Desactívalo en lugar de eliminarlo.',
            ], 422);
        }

        $doctor->update(['is_active' => false]);

        return response()->json(['success' => true]);
    }

    public function toggleActive($id)
    {
        $doctor = Doctor::findOrFail($id);
        $doctor->update(['is_active' => !$doctor->is_active]);

        return response()->json([
            'success' => true,
            'data'    => $this->formatDoctor($doctor->fresh('services')),
        ]);
    }

    private function formatDoctor(Doctor $doctor): array
    {
        return [
            'id'        => $doctor->id,
            'name'      => $doctor->name,
            'specialty' => $doctor->specialty,
            'phone'     => $doctor->phone,
            'email'     => $doctor->email,
            'photo'     => $doctor->photo,
            'isActive'  => $doctor->is_active,
            'services'  => $doctor->services->map(fn ($s) => [
                'id'   => $s->id,
                'name' => $s->name,
            ]),
        ];
    }
}
