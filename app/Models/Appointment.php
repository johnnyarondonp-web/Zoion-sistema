<?php

namespace App\Models;

use App\Traits\HasCuid;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasCuid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'user_id', 'pet_id', 'service_id', 'date', 'start_time',
        'end_time', 'status', 'status_history', 'notes', 'clinical_notes',
        'rating', 'review', 'cancelled_at', 'cancel_reason'
    ];

    protected $casts = [
        'status_history' => 'array',
        'cancelled_at' => 'datetime',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function pet() {
        return $this->belongsTo(Pet::class);
    }

    public function service() {
        return $this->belongsTo(Service::class);
    }

    public function clinicalNotes() {
        return $this->hasMany(ClinicalNote::class);
    }

    public function messages() {
        return $this->hasMany(AppointmentMessage::class);
    }
}
