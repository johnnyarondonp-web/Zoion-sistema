<?php

namespace App\Models;

use App\Traits\HasUlid;
use Illuminate\Database\Eloquent\Model;

class ClinicalNote extends Model
{
    use HasUlid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'appointment_id', 'doctor_id', 'note', 'diagnosis', 'treatment', 'follow_up'
    ];

    public function appointment() {
        return $this->belongsTo(Appointment::class);
    }

    public function doctor() {
        return $this->belongsTo(Doctor::class);
    }
}
