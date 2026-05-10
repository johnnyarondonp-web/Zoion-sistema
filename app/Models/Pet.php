<?php

namespace App\Models;

use App\Traits\HasCuid;
use Illuminate\Database\Eloquent\Model;

class Pet extends Model
{
    use HasCuid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'user_id', 'name', 'species', 'breed', 'birthdate',
        'weight', 'photo', 'notes', 'weight_history', 'vaccinations', 'is_active'
    ];

    protected $appends = ['isActive'];

    protected $casts = [
        'weight_history' => 'array',
        'vaccinations' => 'array',
        'is_active' => 'boolean',
    ];

    public function getIsActiveAttribute(): bool
    {
        return (bool) $this->attributes['is_active'];
    }

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function appointments() {
        return $this->hasMany(Appointment::class);
    }
}
