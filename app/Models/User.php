<?php

namespace App\Models;

use App\Traits\HasCuid;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class User extends Authenticatable
{
      use HasApiTokens, HasCuid, HasFactory, Notifiable;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name', 'email', 'phone', 'password', 'role', 'favorites', 'email_verified_at',
        'email_notifications', 'appointment_reminders', 'daily_summary', 'theme_preference',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'favorites'             => 'array',
        'email_verified_at'     => 'datetime',
        'email_notifications'   => 'boolean',
        'appointment_reminders' => 'boolean',
        'daily_summary'         => 'boolean',
    ];

    public function pets() {
        return $this->hasMany(Pet::class);
    }

    public function appointments() {
        return $this->hasMany(Appointment::class);
    }

    public function messages() {
        return $this->hasMany(AppointmentMessage::class);
    }
}