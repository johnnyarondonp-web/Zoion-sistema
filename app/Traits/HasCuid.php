<?php

namespace App\Traits;

use Illuminate\Support\Str;

trait HasCuid
{
    protected static function bootHasCuid(): void
    {
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::ulid();
            }
        });
    }
}