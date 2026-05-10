<?php

namespace App\Models;

use App\Traits\HasCuid;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasCuid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'day_of_week', 'open_time', 'close_time', 'is_available'
    ];

    protected $casts = [
        'is_available' => 'boolean',
    ];
}
