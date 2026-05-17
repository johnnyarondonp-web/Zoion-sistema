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
        'id', 'user_id', 'pet_id', 'service_id', 'doctor_id', 'source',
        'date', 'start_time', 'end_time', 'status', 'status_history',
        'notes', 'clinical_notes', 'rating', 'review',
        'cancelled_at', 'cancel_reason',
        'payment_method', 'payment_status', 'payment_amount', 'paid_at',
    ];

    protected $casts = [
        'status_history' => 'array',
        'cancelled_at'   => 'datetime',
        'paid_at'        => 'datetime',
        'payment_amount' => 'decimal:2',
    ];

    // El campo date está definido como string en la migración original (error de diseño).
    // Lo normalizamos aquí para que siempre devuelva Y-m-d. Si algún día se migra a
    // tipo date real en PostgreSQL, este accessor se puede eliminar sin tocar el resto.
    public function getDateAttribute($value): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format('Y-m-d') : $value;
    }

    public function doctor() {
        return $this->belongsTo(Doctor::class);
    }

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
