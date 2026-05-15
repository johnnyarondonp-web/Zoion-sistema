<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Appointment;
use Illuminate\Http\Request;

class AdminClientController extends Controller
{
    /**
     * Listar todos los clientes con filtros y paginación.
     */
    public function index(Request $request)
    {
        $query = User::where('role', 'client')
            ->withCount(['pets', 'appointments']);

        // Filtro de búsqueda por nombre o email
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $filter = $request->query('filter', 'todos');
        $thirtyDaysAgo = now()->subDays(30);

        if ($filter === 'archivados') {
            $query->doesntHave('pets')
                  ->doesntHave('appointments')
                  ->where('created_at', '<', $thirtyDaysAgo);
        } else {
            // Excluir archivados de las vistas principales
            $query->where(function($q) use ($thirtyDaysAgo) {
                $q->has('pets')
                  ->orHas('appointments')
                  ->orWhere('created_at', '>=', $thirtyDaysAgo);
            });

            if ($filter === 'activos') {
                $query->has('pets');
            } elseif ($filter === 'leads') {
                $query->doesntHave('pets')->doesntHave('appointments');
            }
        }

        $page  = (int) $request->query('page', 1);
        $limit = (int) $request->query('limit', 15);

        $total   = $query->count();
        $clients = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get(['id', 'name', 'email', 'phone', 'created_at', 'role']);

        // Mapear a formato compatible con frontend
        $clients = $clients->map(function ($client) {
            return [
                'id'        => $client->id,
                'name'      => $client->name,
                'email'     => $client->email,
                'phone'     => $client->phone,
                'createdAt' => $client->created_at,
                'role'      => $client->role,
                '_count'    => [
                    'pets'         => $client->pets_count,
                    'appointments' => $client->appointments_count,
                ],
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => [
                'clients'    => $clients,
                'pagination' => [
                    'page'       => $page,
                    'limit'      => $limit,
                    'total'      => $total,
                    'totalPages' => (int) ceil($total / $limit),
                ],
            ],
        ]);
    }

    /**
     * Obtener un cliente con sus mascotas y citas.
     */
    public function show($id)
    {
        $client = User::where('role', 'client')
            ->withCount(['pets', 'appointments'])
            ->with([
                'pets',
                'appointments' => function ($q) {
                    $q->with(['pet:id,name', 'service:id,name'])
                      ->orderBy('date', 'desc')
                      ->limit(20);
                },
            ])
            ->findOrFail($id);

        $client->totalSpent = Appointment::where('user_id', $id)
            ->where('status', 'completed')
            ->join('services', 'appointments.service_id', '=', 'services.id')
            ->sum('services.price');

        $data = [
            'id'           => $client->id,
            'name'         => $client->name,
            'email'        => $client->email,
            'phone'        => $client->phone,
            'role'         => $client->role,
            'createdAt'    => $client->created_at,
            'totalSpent'   => $client->totalSpent,
            '_count'       => [
                'pets'         => $client->pets_count ?? 0,
                'appointments' => $client->appointments_count ?? 0,
            ],
            'pets'         => $client->pets->map(fn($p) => [
                'id'            => $p->id,
                'name'          => $p->name,
                'species'       => $p->species,
                'breed'         => $p->breed,
                'gender'        => $p->gender,
                'birthdate'     => $p->birthdate,
                'weight'        => $p->weight,
                'photo'         => $p->photo,
                'notes'         => $p->notes,
                'weightHistory' => $p->weight_history,
                'isActive'      => $p->is_active,
                'vaccinations'  => $p->vaccinations,
            ]),
            'appointments' => $client->appointments->map(fn($a) => [
                'id'        => $a->id,
                'date'      => $a->date,
                'startTime' => $a->start_time,
                'endTime'   => $a->end_time,
                'status'    => $a->status,
                'service' => $a->service ? [
                    'name'  => $a->service->name,
                    'price' => $a->service->price,
                ] : [
                    'name'  => 'Servicio eliminado',
                    'price' => 0,
                ],
                'pet'     => $a->pet ? [
                    'name'  => $a->pet->name,
                ] : [
                    'name'  => 'Mascota eliminada',
                ],
            ]),
        ];

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }

    /**
     * Actualizar datos de un cliente.
     */
    public function update(Request $request, $id)
    {
        $client = User::where('role', 'client')->findOrFail($id);

        $validated = $request->validate([
            'name'  => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $id,
            'phone' => 'nullable|string|max:30',
        ]);

        $client->update($validated);

        return response()->json([
            'success' => true,
            'data'    => $client->fresh(['pets']),
        ]);
    }

    /**
     * Eliminar un cliente (solo si no tiene citas activas).
     */
    public function destroy($id)
    {
        $client = User::where('role', 'client')->findOrFail($id);

        $hasActiveAppointments = Appointment::where('user_id', $id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->exists();

        if ($hasActiveAppointments) {
            return response()->json([
                'success' => false,
                'error'   => 'No se puede eliminar un cliente con citas activas pendientes o confirmadas.',
            ], 422);
        }

        $client->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cliente eliminado correctamente.',
        ]);
    }
}