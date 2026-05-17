<?php

namespace App\Models;

use App\Traits\HasUlid;
use Illuminate\Database\Eloquent\Model;

class Pet extends Model
{
    use HasUlid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'user_id', 'name', 'species', 'breed', 'gender', 'birthdate',
        'weight', 'photo', 'notes', 'weight_history', 'vaccinations', 'is_active'
    ];



    protected $casts = [
        'weight_history' => 'array',
        'vaccinations' => 'array',
        'is_active' => 'boolean',
    ];



    public function user() {
        return $this->belongsTo(User::class);
    }

    public function appointments() {
        return $this->hasMany(Appointment::class);
    }
}
