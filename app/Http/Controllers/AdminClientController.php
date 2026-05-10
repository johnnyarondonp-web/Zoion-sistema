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

        $page  = (int) $request->query('page', 1);
        $limit = (int) $request->query('limit', 15);

        $total   = $query->count();
        $clients = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get(['id', 'name', 'email', 'phone', 'created_at', 'role']);

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
            ->with([
                'pets',
                'appointments' => function ($q) {
                    $q->with(['pet:id,name', 'service:id,name'])
                      ->orderBy('date', 'desc')
                      ->limit(20);
                },
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $client,
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
