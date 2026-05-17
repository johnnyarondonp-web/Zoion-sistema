<?php

namespace App\Models;

use App\Traits\HasUlid;
use Illuminate\Database\Eloquent\Model;

class Doctor extends Model
{
    use HasUlid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name', 'cedula', 'email', 'specialty', 
        'phone', 'photo', 'is_active', 'user_id'
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function services()
    {
        return $this->belongsToMany(Service::class, 'doctor_services');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function walkInAppointments()
    {
        return $this->hasMany(WalkInAppointment::class);
    }

    // Convenience scope — most queries only care about active doctors
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
