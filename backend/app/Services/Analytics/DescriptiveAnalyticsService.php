<?php

namespace App\Services\Analytics;

use App\Models\Campaign;
use App\Models\DeaResult;
use App\Models\Sale;

class DescriptiveAnalyticsService
{
    public function dashboard(): array
    {
        $sales = Sale::query();
        $campaigns = Campaign::query();
        $dea = DeaResult::query()->where('model', 'CCR');

        return [
            'totals' => [
                'sales_revenue' => round((float) (clone $sales)->sum('amount'), 2),
                'average_sale' => round((float) (clone $sales)->avg('amount'), 2),
                'advertising_expenses' => round((float) (clone $campaigns)->sum('advertising_cost'), 2),
                'discount_amount' => round((float) (clone $campaigns)->sum('discount_amount'), 2),
                'customers_acquired' => (int) (clone $campaigns)->sum('customers_acquired'),
                'customers' => (int) \App\Models\Customer::query()->count(),
                'campaigns' => (int) (clone $campaigns)->count(),
                'average_campaign_efficiency' => round((float) (clone $dea)->avg('efficiency_score'), 6),
            ],
            'monthly_sales' => $this->monthlySales(),
            'monthly_marketing' => $this->monthlyMarketing(),
            'top_campaigns' => (clone $campaigns)->orderByDesc('sales_revenue')->limit(10)->get([
                'id', 'name', 'advertising_cost', 'sales_revenue', 'customers_acquired', 'campaign_date', 'is_sample',
            ]),
            'efficiency_ranking' => (clone $dea)->with('campaign:id,name,is_sample')
                ->orderByDesc('efficiency_score')->limit(10)->get(),
            'most_efficient_campaign' => (clone $dea)->with('campaign:id,name,is_sample')
                ->orderByDesc('efficiency_score')->first(),
            'sample_data_notice' => Campaign::query()->where('is_sample', true)->exists()
                ? 'Some records are simulated demonstration data and are labeled as sample.'
                : null,
        ];
    }

    public function campaignReport(): array
    {
        return Campaign::query()->orderByDesc('campaign_date')->get([
            'id', 'name', 'advertising_cost', 'marketing_hours', 'discount_amount',
            'sales_revenue', 'customers_acquired', 'campaign_date', 'is_sample',
        ])->map(fn ($campaign) => $campaign->toArray())->all();
    }

    public function salesReport(?string $from = null, ?string $to = null): array
    {
        return Sale::query()->with(['customer:id,name', 'campaign:id,name'])
            ->when($from, fn ($query) => $query->whereDate('sold_at', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('sold_at', '<=', $to))
            ->orderBy('sold_at')->get()->toArray();
    }

    private function monthlySales(): array
    {
        return Sale::query()->selectRaw($this->monthExpression('sold_at').' as month, SUM(amount) as revenue, SUM(quantity) as units')
            ->groupBy('month')->orderBy('month')->get()->map(fn ($row) => [
                'month' => $row->month,
                'revenue' => round((float) $row->revenue, 2),
                'units' => (int) $row->units,
            ])->all();
    }

    private function monthlyMarketing(): array
    {
        return Campaign::query()->selectRaw(
            $this->monthExpression('campaign_date').' as month, SUM(advertising_cost) as advertising_cost, SUM(customers_acquired) as customers_acquired'
        )->groupBy('month')->orderBy('month')->get()->map(fn ($row) => [
            'month' => $row->month,
            'advertising_cost' => round((float) $row->advertising_cost, 2),
            'customers_acquired' => (int) $row->customers_acquired,
        ])->all();
    }

    private function monthExpression(string $column): string
    {
        return match (app('db')->connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM')",
            default => "DATE_FORMAT({$column}, '%Y-%m')",
        };
    }
}