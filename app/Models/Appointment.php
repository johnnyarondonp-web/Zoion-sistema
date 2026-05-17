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

    // Normalizamos el formato de fecha y hora devueltos por la base de datos.
    // Dado que PostgreSQL nativo almacena y devuelve fechas/horas con variaciones (ej. horas con segundos),
    // garantizamos que la API y la lógica de negocio consuman siempre formatos limpios 'Y-m-d' e 'H:i'.
    public function getDateAttribute($value): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format('Y-m-d') : $value;
    }

    public function getStartTimeAttribute($value): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format('H:i') : $value;
    }

    public function getEndTimeAttribute($value): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format('H:i') : $value;
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
