<?php

namespace App\Models;

use App\Traits\HasUlid;
use Illuminate\Database\Eloquent\Model;

class AppointmentMessage extends Model
{
    use HasUlid;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id', 'appointment_id', 'user_id', 'message', 'created_at', 'is_read_by_client', 'is_read_by_admin'
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function appointment() {
        return $this->belongsTo(Appointment::class);
    }

    public function user() {
        return $this->belongsTo(User::class);
    }
}
