<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeaResult extends Model
{
    protected $fillable = ['campaign_id', 'model', 'efficiency_score', 'is_efficient', 'rank', 'reference_set', 'calculated_at'];

    protected function casts(): array
    {
        return [
            'efficiency_score' => 'decimal:6',
            'is_efficient' => 'boolean',
            'reference_set' => 'array',
            'calculated_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }
}