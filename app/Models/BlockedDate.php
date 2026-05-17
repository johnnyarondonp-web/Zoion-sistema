<?php

namespace App\Models;

use App\Traits\HasCuid;
use Illuminate\Database\Eloquent\Model;

class BlockedDate extends Model
{
    use HasCuid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'date', 'reason'];

    // Normalizamos el formato de fecha bloqueada para que siempre devuelva 'Y-m-d'.
    public function getDateAttribute($value): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format('Y-m-d') : $value;
    }
}
