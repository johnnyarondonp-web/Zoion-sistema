<?php

namespace App\Models;

use App\Traits\HasUlid;
use Illuminate\Database\Eloquent\Model;

class WalkInClient extends Model
{
    use HasUlid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'owner_name', 'phone', 'email', 'pet_name', 
        'pet_species', 'pet_breed', 'pet_birth_date', 'pet_weight'
    ];

    public function appointments()
    {
        return $this->hasMany(WalkInAppointment::class);
    }
}
