<?php

namespace App\Services\Analytics;

use App\Models\AnalyticsResult;
use App\Models\Campaign;
use App\Models\Sale;
use Carbon\CarbonPeriod;
use Illuminate\Support\Carbon;

class PredictiveAnalyticsService
{
    public function forecast(int $months = 3, bool $persist = true): array
    {
        $months = max(1, min($months, 24));
        $saleRows = Sale::query()->orderBy('sold_at')->get(['sold_at', 'amount', 'quantity']);
        $campaignRows = Campaign::query()->orderBy('campaign_date')->get(['campaign_date', 'customers_acquired']);

        $salesByMonth = $saleRows->groupBy(fn ($sale) => $sale->sold_at->format('Y-m'))
            ->map(fn ($rows) => (float) $rows->sum('amount'));
        $customersByMonth = $campaignRows->groupBy(fn ($campaign) => $campaign->campaign_date->format('Y-m'))
            ->map(fn ($rows) => (float) $rows->sum('customers_acquired'));

        $allPeriods = $salesByMonth->keys()->merge($customersByMonth->keys())->sort()->values();
        if ($allPeriods->isEmpty()) {
            return [
                'model' => 'ordinary_least_squares_time_trend',
                'training_months' => 0,
                'message' => 'At least two months of historical database records are required for a forecast.',
                'history' => [],
                'predictions' => [],
            ];
        }

        $firstMonth = Carbon::createFromFormat('Y-m', $allPeriods->first())->startOfMonth();
        $lastMonth = Carbon::createFromFormat('Y-m', $allPeriods->last())->startOfMonth();
        $history = [];
        foreach (CarbonPeriod::create($firstMonth, '1 month', $lastMonth) as $period) {
            $key = $period->format('Y-m');
            $history[] = [
                'month' => $key,
                'actual_sales_revenue' => round((float) $salesByMonth->get($key, 0), 2),
                'actual_customers_acquired' => (int) $customersByMonth->get($key, 0),
            ];
        }

        $revenueFit = $this->linearRegression(array_column($history, 'actual_sales_revenue'));
        $customerFit = $this->linearRegression(array_column($history, 'actual_customers_acquired'));
        $predictions = [];

        if ($revenueFit !== null && $customerFit !== null) {
            for ($offset = 1; $offset <= $months; $offset++) {
                $index = count($history) - 1 + $offset;
                $period = $lastMonth->copy()->addMonths($offset);
                $revenue = max(0, $revenueFit['intercept'] + $revenueFit['slope'] * $index);
                $customers = max(0, $customerFit['intercept'] + $customerFit['slope'] * $index);
                $predictions[] = [
                    'month' => $period->format('Y-m'),
                    'predicted_sales_revenue' => round($revenue, 2),
                    'predicted_customers_acquired' => (int) round($customers),
                ];
            }

            if ($persist) {
                $computedAt = Carbon::now();
                foreach ($predictions as $prediction) {
                    AnalyticsResult::create([
                        'analysis_type' => 'predictive',
                        'metric' => 'sales_revenue_predicted',
                        'period' => $prediction['month'].'-01',
                        'value' => $prediction['predicted_sales_revenue'],
                        'metadata' => ['method' => 'ordinary_least_squares_time_trend', 'training_months' => count($history)],
                        'computed_at' => $computedAt,
                    ]);
                    AnalyticsResult::create([
                        'analysis_type' => 'predictive',
                        'metric' => 'customers_acquired_predicted',
                        'period' => $prediction['month'].'-01',
                        'value' => $prediction['predicted_customers_acquired'],
                        'metadata' => ['method' => 'ordinary_least_squares_time_trend', 'training_months' => count($history)],
                        'computed_at' => $computedAt,
                    ]);
                }
            }
        }

        return [
            'model' => 'ordinary_least_squares_time_trend',
            'training_months' => count($history),
            'message' => $revenueFit === null || $customerFit === null
                ? 'At least two months of historical database records are required for a forecast.'
                : null,
            'history' => $history,
            'predictions' => $predictions,
            'fit' => [
                'sales_revenue_slope_per_month' => $revenueFit['slope'] ?? null,
                'customers_acquired_slope_per_month' => $customerFit['slope'] ?? null,
            ],
            'limitations' => 'This simple linear trend assumes historical patterns continue and does not model seasonality, causal effects, or external market changes.',
        ];
    }

    private function linearRegression(array $values): ?array
    {
        $count = count($values);
        if ($count < 2) {
            return null;
        }

        $meanX = ($count - 1) / 2;
        $meanY = array_sum($values) / $count;
        $covariance = 0.0;
        $variance = 0.0;

        foreach ($values as $index => $value) {
            $covariance += ($index - $meanX) * ($value - $meanY);
            $variance += ($index - $meanX) ** 2;
        }

        $slope = $variance === 0.0 ? 0.0 : $covariance / $variance;

        return ['slope' => $slope, 'intercept' => $meanY - $slope * $meanX];
    }
}