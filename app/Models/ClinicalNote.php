<?php

namespace App\Models;

use App\Traits\HasCuid;
use Illuminate\Database\Eloquent\Model;

class ClinicalNote extends Model
{
    use HasCuid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'appointment_id', 'note', 'diagnosis', 'treatment', 'follow_up'
    ];

    public function appointment() {
        return $this->belongsTo(Appointment::class);
    }
}
