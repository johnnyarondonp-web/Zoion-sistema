<?php

namespace App\Models;

use App\Traits\HasCuid;
use Illuminate\Database\Eloquent\Model;

class WalkInAppointment extends Model
{
    use HasCuid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'walk_in_client_id', 'service_id', 'doctor_id',
        'date', 'start_time', 'end_time', 'status',
        'payment_method', 'payment_status', 'payment_amount', 'paid_at', 'notes',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'payment_amount' => 'decimal:2',
    ];

    public function client()
    {
        return $this->belongsTo(WalkInClient::class, 'walk_in_client_id');
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }
}
