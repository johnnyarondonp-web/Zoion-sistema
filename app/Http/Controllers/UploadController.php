<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

/**
 * Controlador para la carga y procesamiento de archivos multimedia en la plataforma.
 */
class UploadController extends Controller
{
    /**
     * Procesa y almacena una imagen (ej. foto de mascota o doctor).
     *
     * Este método valida que el archivo subido sea una imagen válida (JPEG o PNG) de máximo 4MB.
     * Para optimizar el almacenamiento y la velocidad de carga en el frontend:
     * 1. Valida la integridad del archivo leyendo su contenido binario.
     * 2. Convierte la imagen al formato moderno WEBP con una calidad del 82%.
     * 3. Genera un nombre único e impredecible utilizando un identificador ULID.
     * 4. Almacena la imagen final en el disco público y limpia los archivos temporales de forma segura.
     *
     * @param  \Illuminate\Http\Request  $request  Petición HTTP que contiene el archivo en el campo 'file'.
     * @return \Illuminate\Http\JsonResponse  URL pública del recurso almacenado o error de validación.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:jpeg,png|max:4096',
        ]);

        $file = $request->file('file');
        $imageData = file_get_contents($file->getRealPath());

        $image = @imagecreatefromstring($imageData);
        if ($image === false) {
            return response()->json(['success' => false, 'error' => 'Imagen inválida'], 422);
        }

        $ulid = (string) Str::ulid();
        $filename = "pets/{$ulid}.webp";
        $tempPath = sys_get_temp_dir() . "/{$ulid}.webp";

        imagewebp($image, $tempPath, 82);
        imagedestroy($image);

        Storage::disk('public')->put($filename, file_get_contents($tempPath));
        unlink($tempPath);

        return response()->json([
            'success' => true,
            'data' => [
                'url' => "/storage/{$filename}",
            ],
        ]);
    }
}
