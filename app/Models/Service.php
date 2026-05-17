<?php

namespace App\Models;

use App\Traits\HasUlid;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasUlid;

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

    public function doctors()
    {
        return $this->belongsToMany(Doctor::class, 'doctor_services');
    }
}
