<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
                'cedula'             => $d->cedula,
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
            'name'         => 'required|string|min:4|max:40|regex:/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/',
            'cedula'       => 'required|integer|between:5000000,33000000|unique:doctors,cedula',
            'specialty'    => 'nullable|string|max:255',
            'phone'        => 'nullable|string|max:30',
            'email'        => 'required|email|max:150|unique:doctors,email|unique:users,email',
            'photo'        => 'nullable|string',
            'isActive'     => 'boolean',
            'serviceIds'   => 'required|array|min:1',
            'serviceIds.*' => 'string|exists:services,id',
        ], [
            'name.regex'     => 'El nombre solo puede contener letras y espacios.',
            'cedula.between' => 'Ingrese una cédula válida entre 5,000,000 y 33,000,000.',
            'serviceIds.min' => 'Debe seleccionar al menos un servicio.',
        ]);

        // Limpieza de espacios en el nombre
        $data['name'] = trim($data['name']);

        $doctor = DB::transaction(function () use ($data) {
            // 1. Crear el Usuario para acceso al sistema
            $user = User::create([
                'id'       => (string) Str::ulid(),
                'name'     => $data['name'],
                'email'    => $data['email'],
                'password' => Hash::make($data['cedula']), // Cédula como contraseña inicial
                'role'     => 'doctor',
                'phone'    => $data['phone'] ?? null,
            ]);

            // 2. Crear el perfil de Doctor vinculado al usuario
            $doctor = Doctor::create([
                'name'      => $data['name'],
                'cedula'    => $data['cedula'],
                'email'     => $data['email'],
                'specialty' => $data['specialty'] ?? null,
                'phone'     => $data['phone'] ?? null,
                'photo'     => $data['photo'] ?? null,
                'is_active' => $data['isActive'] ?? true,
                'user_id'   => $user->id,
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
            'cedula'     => 'sometimes|integer|between:5000000,33000000|unique:doctors,cedula,' . $doctor->id,
            'specialty'  => 'nullable|string|max:255',
            'phone'      => 'nullable|string|max:30',
            'email'      => 'nullable|email|max:150|unique:doctors,email,' . $doctor->id . '|unique:users,email,' . $doctor->user_id,
            'photo'      => 'nullable|string',
            'isActive'   => 'boolean',
            'serviceIds' => 'nullable|array',
            'serviceIds.*' => 'string|exists:services,id',
        ]);

        DB::transaction(function () use ($doctor, $data) {
            $doctor->update(array_filter([
                'name'      => $data['name'] ?? null,
                'cedula'    => $data['cedula'] ?? null,
                'specialty' => $data['specialty'] ?? null,
                'phone'     => $data['phone'] ?? null,
                'email'     => $data['email'] ?? null,
                'photo'     => $data['photo'] ?? null,
                'is_active' => $data['isActive'] ?? null,
            ], fn ($v) => $v !== null));

            // Sincronizamos los datos básicos con el usuario de acceso si existen cambios
            if ($doctor->user_id) {
                $user = User::find($doctor->user_id);
                if ($user) {
                    $userUpdate = [];
                    if (isset($data['name']))   $userUpdate['name']  = $data['name'];
                    if (isset($data['email']))  $userUpdate['email'] = $data['email'];
                    if (isset($data['cedula'])) $userUpdate['password'] = Hash::make($data['cedula']);
                    if (isset($data['phone']))  $userUpdate['phone'] = $data['phone'];

                    if (!empty($userUpdate)) {
                        $user->update($userUpdate);
                    }
                }
            }

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
            'cedula'    => $doctor->cedula,
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
