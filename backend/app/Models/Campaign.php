<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'advertising_cost', 'marketing_hours', 'discount_amount',
        'sales_revenue', 'customers_acquired', 'campaign_date', 'notes', 'is_sample',
    ];

    protected function casts(): array
    {
        return [
            'advertising_cost' => 'decimal:2',
            'marketing_hours' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'sales_revenue' => 'decimal:2',
            'campaign_date' => 'date',
            'is_sample' => 'boolean',
        ];
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }
}