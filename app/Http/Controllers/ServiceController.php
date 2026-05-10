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

        $services = $query->orderBy('name')->get();
        return response()->json(['success' => true, 'data' => $services]);
    }

    public function store(Request $request)
    {
        abort_if($request->user()->role !== 'admin', 403, 'Admin only');

        $request->validate([
            'name'            => 'required|string',
            'durationMinutes' => 'required|integer|min:1',
            'price'           => 'required|numeric|min:0',
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

        return response()->json(['success' => true, 'data' => $service], 201);
    }

    public function show($id)
    {
        $service = Service::findOrFail($id);
        return response()->json(['success' => true, 'data' => $service]);
    }

    public function update(Request $request, $id)
    {
        abort_if($request->user()->role !== 'admin', 403, 'Admin only');
        $service = Service::findOrFail($id);
        $service->update([
            'name'             => $request->name ? trim($request->name) : $service->name,
            'description'      => $request->description ? trim($request->description) : $service->description,
            'duration_minutes' => $request->durationMinutes ?? $service->duration_minutes,
            'price'            => $request->price ?? $service->price,
            'category'         => $request->category ? trim($request->category) : $service->category,
            'is_active'        => $request->has('isActive') ? (bool) $request->isActive : $service->is_active,
        ]);
        return response()->json(['success' => true, 'data' => $service]);
    }

    public function destroy(Request $request, $id)
    {
        abort_if($request->user()->role !== 'admin', 403, 'Admin only');
        $service = Service::findOrFail($id);
        $service->delete();
        return response()->json(['success' => true]);
    }
}