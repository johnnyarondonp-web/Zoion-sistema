<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user && $user->role === 'admin';
        $all = $request->query('all') === 'true';

        $query = Service::query();

        if (!$isAdmin || !$all) {
            $query->where('is_active', true);
        }

        if ($request->has('category')) {
            $category = $request->query('category');
            $query->where('category', $category === 'sin-categoria' ? null : $category);
        }

        $services = $query->orderBy('name')->get()->map(function ($s) {
            return [
                'id'              => $s->id,
                'name'            => $s->name,
                'description'     => $s->description,
                'durationMinutes' => $s->duration_minutes,
                'price'           => $s->price,
                'category'        => $s->category,
                'isActive'        => $s->is_active,
            ];
        });
        return response()->json(['success' => true, 'data' => $services]);
    }

    public function store(Request $request)
    {
        abort_if($request->user()->role !== 'admin', 403, 'Admin only');

        $request->validate([
            'name'            => 'required|string|max:50',
            'description'     => 'nullable|string|max:300',
            'durationMinutes' => 'required|integer|min:1|max:360',
            'price'           => 'required|numeric|min:1|max:10000',
            'category'        => 'required|string',
        ]);

        $service = Service::create([
            'id'               => (string) Str::ulid(),
            'name'             => trim($request->name),
            'description'      => $request->description ? trim($request->description) : null,
            'duration_minutes' => $request->durationMinutes,
            'price'            => $request->price,
            'category'         => $request->category ? trim($request->category) : null,
            'is_active'        => $request->has('isActive') ? (bool) $request->isActive : true,
        ]);

        return response()->json([
            'success' => true, 
            'data' => [
                'id'              => $service->id,
                'name'            => $service->name,
                'description'     => $service->description,
                'durationMinutes' => $service->duration_minutes,
                'price'           => $service->price,
                'category'        => $service->category,
                'isActive'        => $service->is_active,
            ]
        ], 201);
    }

    public function show($id)
    {
        $service = Service::findOrFail($id);
        return response()->json([
            'success' => true, 
            'data' => [
                'id'              => $service->id,
                'name'            => $service->name,
                'description'     => $service->description,
                'durationMinutes' => $service->duration_minutes,
                'price'           => $service->price,
                'category'        => $service->category,
                'isActive'        => $service->is_active,
            ]
        ]);
    }

    public function update(Request $request, $id)
    {
        abort_if($request->user()->role !== 'admin', 403, 'Admin only');

        $request->validate([
            'name'            => 'sometimes|required|string|max:50',
            'description'     => 'nullable|string|max:300',
            'durationMinutes' => 'sometimes|required|integer|min:1|max:360',
            'price'           => 'sometimes|required|numeric|min:1|max:10000',
            'category'        => 'sometimes|required|string',
            'isActive'        => 'sometimes|boolean',
        ]);

        $service = Service::findOrFail($id);
        $service->update([
            'name'             => $request->name ? trim($request->name) : $service->name,
            'description'      => $request->description ? trim($request->description) : $service->description,
            'duration_minutes' => $request->durationMinutes ?? $service->duration_minutes,
            'price'            => $request->price ?? $service->price,
            'category'         => $request->category ? trim($request->category) : $service->category,
            'is_active'        => $request->has('isActive') ? filter_var($request->isActive, FILTER_VALIDATE_BOOLEAN) : $service->is_active,
        ]);
        return response()->json([
            'success' => true, 
            'data' => [
                'id'              => $service->id,
                'name'            => $service->name,
                'description'     => $service->description,
                'durationMinutes' => $service->duration_minutes,
                'price'           => $service->price,
                'category'        => $service->category,
                'isActive'        => $service->is_active,
            ]
        ]);
    }

    public function destroy(Request $request, $id)
    {
        abort_if($request->user()->role !== 'admin', 403, 'Admin only');
        $service = Service::findOrFail($id);
        $service->delete();
        return response()->json(['success' => true]);
    }
}