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
        $pets = Pet::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json(['success' => true, 'data' => $pets]);
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
        $pet = Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        return response()->json(['success' => true, 'data' => $pet]);
    }

    public function update(Request $request, $id)
    {
        $pet = Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        $data = $request->only(['name', 'species', 'breed', 'birthdate', 'weight', 'notes', 'is_active']);

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
        $pet = Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        $vaccinations = $pet->vaccinations ?? [];
        $vaccinations[] = $request->all();
        $pet->update(['vaccinations' => $vaccinations]);
        return response()->json(['success' => true, 'data' => $pet]);
    }

    public function addWeight(Request $request, $id)
    {
        $pet = Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        $history = $pet->weight_history ?? [];
        $history[] = $request->all();
        $pet->update(['weight_history' => $history]);
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
        Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        return response()->json(['success' => true, 'data' => []]);
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

        $image = imagecreatefromstring($imageData);
        if ($image === false) {
            return $oldPhoto;
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