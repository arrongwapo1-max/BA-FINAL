<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'performance' => ['sometimes', 'in:low,medium,high'],
            'sample_only' => ['sometimes', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $query = Campaign::query()->withCount('sales');

        if ($search = trim($filters['search'] ?? '')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $query->when($filters['from'] ?? null, fn ($builder, $date) => $builder->whereDate('campaign_date', '>=', $date));
        $query->when($filters['to'] ?? null, fn ($builder, $date) => $builder->whereDate('campaign_date', '<=', $date));
        $query->when(($filters['sample_only'] ?? false), fn ($builder) => $builder->where('is_sample', true));

        $query->when($filters['performance'] ?? null, function ($builder, $performance) {
            $ratio = '(sales_revenue / nullif(advertising_cost + discount_amount, 0))';

            match ($performance) {
                'low' => $builder->whereRaw("{$ratio} < 1"),
                'medium' => $builder->whereRaw("{$ratio} >= 1 AND {$ratio} < 3"),
                'high' => $builder->whereRaw("{$ratio} >= 3"),
                default => null,
            };
        });

        return $query->orderByDesc('campaign_date')->paginate($filters['per_page'] ?? 15);
    }

    public function store(Request $request): Campaign
    {
        return Campaign::create($this->validatedData($request))->refresh();
    }

    public function show(Campaign $campaign): Campaign
    {
        return $campaign->loadCount('sales')->load('sales.customer');
    }

    public function update(Request $request, Campaign $campaign): Campaign
    {
        $campaign->update($this->validatedData($request, $campaign));

        return $campaign->refresh();
    }

    public function destroy(Campaign $campaign)
    {
        $campaign->delete();

        return response()->noContent();
    }

    private function validatedData(Request $request, ?Campaign $campaign = null): array
    {
        $required = $campaign ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:255'],
            'advertising_cost' => [$required, 'numeric', 'min:0'],
            'marketing_hours' => [$required, 'numeric', 'min:0'],
            'discount_amount' => [$required, 'numeric', 'min:0'],
            'sales_revenue' => [$required, 'numeric', 'min:0'],
            'customers_acquired' => [$required, 'integer', 'min:0'],
            'campaign_date' => [$required, 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ]);
    }
}