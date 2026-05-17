<?php

namespace App\Http\Controllers;

use App\Models\Pet;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class PetController extends Controller
{
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Pet::orderBy('created_at', 'desc');

        // El staff puede ver mascotas de otro usuario directamente, necesario para
        // que el admin pueda agendar citas en nombre de un cliente.
        if (in_array($user->role, ['admin', 'receptionist', 'doctor']) && $request->userId) {
            $query->where('user_id', $request->userId);
        } else if (!in_array($user->role, ['admin', 'receptionist', 'doctor'])) {
            $query->where('user_id', $user->id);
        }

        if ($request->search) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        return response()->json([
            'success' => true, 
            'data'    => $query->with('user')->get()->map(fn($p) => [
                'id'            => $p->id,
                'name'          => $p->name,
                'species'       => $p->species,
                'breed'         => $p->breed,
                'gender'        => $p->gender,
                'birthdate'     => $p->birthdate,
                'weight'        => $p->weight,
                'photo'         => $p->photo,
                'notes'         => $p->notes,
                'isActive'      => $p->is_active,
                'weightHistory' => $p->weight_history,
                'vaccinations'  => $p->vaccinations,
                'user'          => $p->user ? [
                    'id' => $p->user->id,
                    'name' => $p->user->name,
                    'email' => $p->user->email,
                    'phone' => $p->user->phone,
                ] : null,
            ])
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'    => 'required|string',
            'species' => 'required|string',
        ]);

        $photo = $this->processPhoto($request->photo);

        $pet = Pet::create([
            'id'        => (string) Str::ulid(),
            'user_id'   => $request->user()->id,
            'name'      => trim($request->name),
            'species'   => trim($request->species),
            'breed'     => $request->breed ? trim($request->breed) : null,
            'gender'    => $request->gender ? trim($request->gender) : null,
            'birthdate' => $request->birthdate ?? null,
            'weight'    => $request->weight ? (float) $request->weight : null,
            'photo'     => $photo,
            'notes'     => $request->notes ? trim($request->notes) : null,
            'is_active' => true,
        ]);

        return response()->json(['success' => true, 'data' => $pet], 201);
    }

    public function show(Request $request, $id)
    {
        $pet = Pet::where('id', $id);
        if (!in_array($request->user()->role, ['admin', 'receptionist', 'doctor'])) {
            $pet->where('user_id', $request->user()->id);
        }
        $pet = $pet->firstOrFail();
        return response()->json([
            'success' => true, 
            'data' => [
                'id'            => $pet->id,
                'name'          => $pet->name,
                'species'       => $pet->species,
                'breed'         => $pet->breed,
                'gender'        => $pet->gender,
                'birthdate'     => $pet->birthdate,
                'weight'        => $pet->weight,
                'photo'         => $pet->photo,
                'notes'         => $pet->notes,
                'isActive'      => $pet->is_active,
                'weightHistory' => $pet->weight_history,
                'vaccinations'  => $pet->vaccinations,
            ]
        ]);
    }

    public function update(Request $request, $id)
    {
        $pet = Pet::where('id', $id);
        if (!in_array($request->user()->role, ['admin', 'receptionist', 'doctor'])) {
            $pet->where('user_id', $request->user()->id);
        }
        $pet = $pet->firstOrFail();
        $data = $request->only(['name', 'species', 'breed', 'gender', 'birthdate', 'weight', 'notes', 'is_active']);

        if ($request->has('photo')) {
            $data['photo'] = $this->processPhoto($request->photo, $pet->photo);
        }

        $pet->update($data);
        return response()->json(['success' => true, 'data' => $pet]);
    }

    public function destroy(Request $request, $id)
    {
        $pet = Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        $pet->delete();
        return response()->json(['success' => true]);
    }

    public function addVaccination(Request $request, $id)
    {
        $pet = Pet::where('id', $id);
        if (!in_array($request->user()->role, ['admin', 'receptionist', 'doctor'])) {
            $pet->where('user_id', $request->user()->id);
        }
        $pet = $pet->firstOrFail();
        $vaccinations = $pet->vaccinations ?? [];
        $vaccinations[] = $request->all();
        $pet->update(['vaccinations' => $vaccinations]);
        return response()->json(['success' => true, 'data' => $pet]);
    }

    public function addWeight(Request $request, $id)
    {
        $pet = Pet::where('id', $id);
        if (!in_array($request->user()->role, ['admin', 'receptionist', 'doctor'])) {
            $pet->where('user_id', $request->user()->id);
        }
        $pet = $pet->firstOrFail();

        $history = $pet->weight_history ?? [];
        $history[] = $request->all();
        
        $weight = isset($request->weight) ? (float) $request->weight : $pet->weight;
        $pet->update(['weight_history' => $history, 'weight' => $weight]);
        
        return response()->json(['success' => true, 'data' => $pet]);
    }

    public function getWeight(Request $request, $id)
    {
        $pet = Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        return response()->json(['success' => true, 'data' => $pet->weight_history ?? []]);
    }

    public function getVaccinations(Request $request, $id)
    {
        $pet = Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        return response()->json(['success' => true, 'data' => $pet->vaccinations ?? []]);
    }

    public function healthSummary(Request $request, $id)
    {
        $pet = Pet::where('id', $id);
        if (!in_array($request->user()->role, ['admin', 'receptionist', 'doctor'])) {
            $pet->where('user_id', $request->user()->id);
        }
        $pet = $pet->firstOrFail();

        // Obtener todas las notas clínicas de TODAS las citas de esta mascota
        $notes = \App\Models\ClinicalNote::with('doctor:id,name')->whereHas('appointment', function($q) use ($id) {
            $q->where('pet_id', $id);
        })->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'notes' => $notes,
                'weightHistory' => $pet->weight_history ?? [],
                'vaccinations' => $pet->vaccinations ?? [],
            ]
        ]);
    }

    // ✅ CAMBIO 3: Nuevo método específico para toggle
    public function toggleActive(Request $request, string $id)
    {
        $pet = Pet::where('id', $id)
                  ->where('user_id', auth()->id())
                  ->firstOrFail();
        $pet->update(['is_active' => !$pet->is_active]);
        return response()->json(['success' => true, 'data' => $pet]);
    }

    /**
     * Process photo: convert base64 to WebP, or pass through URLs.
     */
    private function processPhoto(?string $photo, ?string $oldPhoto = null): ?string
    {
        if ($photo === null) {
            if ($oldPhoto) {
                $this->deleteOldPhoto($oldPhoto);
            }
            return null;
        }

        // If it's already a URL, leave it as-is (unless replacing)
        if (str_starts_with($photo, '/storage') || str_starts_with($photo, 'http')) {
            if ($oldPhoto && $photo !== $oldPhoto) {
                $this->deleteOldPhoto($oldPhoto);
            }
            return $photo;
        }

        // Decode base64
        if (str_contains($photo, ',')) {
            $photo = explode(',', $photo)[1];
        }

        $imageData = base64_decode($photo);
        if ($imageData === false) {
            return $oldPhoto;
        }

        // Validate MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_buffer($finfo, $imageData);
        finfo_close($finfo);

        if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'photo' => 'El formato de imagen no es válido. Solo se permiten JPG, PNG y WEBP.'
            ]);
        }

        $image = imagecreatefromstring($imageData);
        if ($image === false) {
            return $oldPhoto;
        }

        // Validación de dimensiones mínimas (100x100)
        $width = imagesx($image);
        $height = imagesy($image);
        if ($width < 100 || $height < 100) {
            imagedestroy($image);
            throw \Illuminate\Validation\ValidationException::withMessages([
                'photo' => 'La imagen debe ser de al menos 100x100 píxeles'
            ]);
        }

        $ulid = (string) Str::ulid();
        $filename = "pets/{$ulid}.webp";
        $tempPath = sys_get_temp_dir() . "/{$ulid}.webp";

        imagewebp($image, $tempPath, 82);
        imagedestroy($image);

        Storage::disk('public')->put($filename, file_get_contents($tempPath));
        unlink($tempPath);

        if ($oldPhoto) {
            $this->deleteOldPhoto($oldPhoto);
        }

        return "/storage/{$filename}";
    }

    /**
     * Delete old photo from disk.
     */
    private function deleteOldPhoto(string $path): void
    {
        if (str_starts_with($path, '/storage/')) {
            $relativePath = str_replace('/storage/', '', $path);
            if (Storage::disk('public')->exists($relativePath)) {
                Storage::disk('public')->delete($relativePath);
            }
        }
    }
}