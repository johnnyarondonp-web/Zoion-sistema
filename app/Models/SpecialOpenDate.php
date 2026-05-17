<?php

namespace App\Models;

use App\Traits\HasUlid;
use Illuminate\Database\Eloquent\Model;

class SpecialOpenDate extends Model
{
    use HasUlid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'date', 'open_time', 'close_time', 'reason'];

    public function getDateAttribute($value): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format('Y-m-d') : $value;
    }

    public function getOpenTimeAttribute($value): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format('H:i') : $value;
    }

    public function getCloseTimeAttribute($value): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format('H:i') : $value;
    }
}
