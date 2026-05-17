<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
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
