<?php

namespace App\Models;

use App\Traits\HasCuid;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasCuid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name', 'description', 'duration_minutes',
        'price', 'category', 'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function appointments() {
        return $this->hasMany(Appointment::class);
    }
}
