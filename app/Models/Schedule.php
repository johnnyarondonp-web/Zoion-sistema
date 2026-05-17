<?php

namespace App\Models;

use App\Traits\HasUlid;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasUlid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'day_of_week', 'open_time', 'close_time', 'is_available'
    ];

    protected $casts = [
        'is_available' => 'boolean',
    ];

    // Normalizamos el formato de hora laborable para que siempre devuelva 'H:i' (ej: '09:00' en lugar de '09:00:00').
    public function getOpenTimeAttribute($value): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format('H:i') : $value;
    }

    public function getCloseTimeAttribute($value): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format('H:i') : $value;
    }
}
