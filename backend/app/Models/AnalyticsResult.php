<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnalyticsResult extends Model
{
    protected $fillable = ['analysis_type', 'metric', 'period', 'value', 'metadata', 'computed_at'];

    protected function casts(): array
    {
        return [
            'period' => 'date',
            'value' => 'decimal:4',
            'metadata' => 'array',
            'computed_at' => 'datetime',
        ];
    }
}