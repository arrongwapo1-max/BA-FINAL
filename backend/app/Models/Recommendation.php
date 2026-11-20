<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Recommendation extends Model
{
    protected $fillable = ['campaign_id', 'type', 'priority', 'title', 'body', 'evidence', 'status'];

    protected function casts(): array
    {
        return ['evidence' => 'array'];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }
}