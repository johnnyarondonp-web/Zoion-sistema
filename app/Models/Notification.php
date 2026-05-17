<?php

namespace App\Models;

use App\Traits\HasUlid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasUlid;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'title',
        'message',
        'data',
        'type',
        'read_at',
    ];

    protected static function booted()
    {
        static::created(function ($notification) {
            $userId = $notification->user_id;
            // Pruning automático: mantener solo las últimas 50
            $count = static::where('user_id', $userId)->count();
            if ($count > 50) {
                $idsToKeep = static::where('user_id', $userId)
                    ->orderBy('created_at', 'desc')
                    ->take(50)
                    ->pluck('id');
                
                static::where('user_id', $userId)
                    ->whereNotIn('id', $idsToKeep)
                    ->delete();
            }
        });
    }

    protected $casts = [
        'read_at' => 'datetime',
        'data'    => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
