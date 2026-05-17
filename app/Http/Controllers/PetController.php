<?php

namespace App\Http\Controllers;

use App\Models\Pet;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class PetController extends Controller
{
    /**
     * Devuelve el listado de mascotas del usuario autenticado.
     * El personal clínico (admin, receptionist, doctor) puede filtrar por userId para
     * gestionar mascotas de un cliente específico. Los clientes ordinarios solo acceden
     * a sus propios registros. La respuesta se pagina automáticamente cuando el actor
     * es staff sin filtro explícito, evitando devolver miles de registros sin límite.
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Pet::orderBy('created_at', 'desc');

        // El personal de la clínica puede filtrar por el ID de un cliente específico,
        // lo cual es necesario para agendar citas en su nombre.
        if (in_array($user->role, ['admin', 'receptionist', 'doctor']) && $request->userId) {
            $query->where('user_id', $request->userId);
        } else if (!in_array($user->role, ['admin', 'receptionist', 'doctor'])) {
            // Los clientes normales solo pueden ver sus propios registros
            $query->where('user_id', $user->id);
        }

        if ($request->search) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        // Paginamos por defecto si el usuario es administrador/receptionista/médico y no busca un cliente específico,
        // o si el request solicita explícitamente paginar. Esto evita que la respuesta sea ilimitada (miles de registros).
        $shouldPaginate = $request->has('page') || $request->has('per_page') || 
            (in_array($user->role, ['admin', 'receptionist', 'doctor']) && !$request->userId);

        if ($shouldPaginate) {
            $perPage = $request->input('per_page', 15);
            $paginator = $query->with('user')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data'    => $paginator->getCollection()->map(fn($p) => $this->mapPet($p)),
                'meta'    => [
                    'current_page' => $paginator->currentPage(),
                    'last_page'    => $paginator->lastPage(),
                    'per_page'     => $paginator->perPage(),
                    'total'        => $paginator->total(),
                ]
            ]);
        }

        // En caso de que se solicite un cliente específico o sea un flujo directo de cliente
        // que no sobrecargue la memoria, devolvemos el listado completo para simplificar la integración.
        return response()->json([
            'success' => true, 
            'data'    => $query->with('user')->get()->map(fn($p) => $this->mapPet($p))
        ]);
    }

    /**
     * Mapea un modelo Pet a un array formateado para el frontend.
     * Este helper asegura homogeneidad entre respuestas completas y paginadas.
     */
    private function mapPet(Pet $p): array
    {
        return [
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
        ];
    }

    /**
     * Registra una nueva mascota vinculada al usuario autenticado.
     * Procesa y convierte la foto recibida (base64 o URL) a WebP optimizado antes de
     * persistirla en el disco, validando dimensiones mínimas de 100×100 px.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse  HTTP 201 con la mascota creada.
     */
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

    /**
     * Retorna el detalle completo de una mascota por su ID.
     * Los clientes solo pueden acceder a sus propias mascotas; el personal clínico
     * puede consultar cualquier registro del sistema.
     *
     * @param  string  $id  ULID de la mascota.
     * @return \Illuminate\Http\JsonResponse
     */
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

    /**
     * Actualiza los datos de una mascota existente.
     * Si el payload incluye una nueva foto, el helper processPhoto reemplaza la imagen
     * anterior en disco y elimina el archivo viejo para liberar almacenamiento.
     *
     * @param  string  $id  ULID de la mascota.
     * @return \Illuminate\Http\JsonResponse
     */
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

    /**
     * Elimina una mascota del sistema.
     * Solo el propietario autenticado puede eliminar sus propias mascotas.
     *
     * @param  string  $id  ULID de la mascota.
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Request $request, $id)
    {
        $pet = Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        $pet->delete();
        return response()->json(['success' => true]);
    }

    /**
     * Agrega un registro de vacunación al historial de la mascota.
     * Los datos se almacenan como un arreglo JSON adjunto al campo vaccinations del modelo Pet,
     * permitiendo añadir entradas sin perder el historial previo.
     *
     * @param  string  $id  ULID de la mascota.
     * @return \Illuminate\Http\JsonResponse
     */
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

    /**
     * Registra un nuevo punto de peso en el historial de la mascota.
     * Actualiza tanto el campo weight (peso actual) como el arreglo weight_history
     * (historial de pesos con fecha y valor) de forma atómica en un solo update.
     *
     * @param  string  $id  ULID de la mascota.
     * @return \Illuminate\Http\JsonResponse
     */
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

    /**
     * Devuelve el historial de pesos de una mascota del cliente autenticado.
     *
     * @param  string  $id  ULID de la mascota.
     * @return \Illuminate\Http\JsonResponse
     */
    public function getWeight(Request $request, $id)
    {
        $pet = Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        return response()->json(['success' => true, 'data' => $pet->weight_history ?? []]);
    }

    /**
     * Devuelve el historial de vacunaciones de una mascota del cliente autenticado.
     *
     * @param  string  $id  ULID de la mascota.
     * @return \Illuminate\Http\JsonResponse
     */
    public function getVaccinations(Request $request, $id)
    {
        $pet = Pet::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        return response()->json(['success' => true, 'data' => $pet->vaccinations ?? []]);
    }

    /**
     * Devuelve un resumen de salud completo de la mascota:
     * notas clínicas de todas sus citas (con médico), historial de pesos y vacunaciones.
     * Diseñado para alimentar la vista de ficha médica del portal del cliente y del panel admin.
     *
     * @param  string  $id  ULID de la mascota.
     * @return \Illuminate\Http\JsonResponse
     */
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

    /**
     * Alterna el estado activo/inactivo de la mascota del cliente autenticado.
     * Una mascota inactiva queda oculta por defecto en el listado del portal,
     * sin eliminar su historial médico del sistema.
     *
     * @param  string  $id  ULID de la mascota.
     * @return \Illuminate\Http\JsonResponse
     */
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