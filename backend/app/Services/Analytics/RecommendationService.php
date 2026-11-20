<?php

namespace App\Services\Analytics;

use App\Models\Campaign;
use App\Models\DeaResult;
use App\Models\Recommendation;
use Illuminate\Support\Facades\DB;

class RecommendationService
{
    public function generate(): array
    {
        $campaigns = Campaign::query()->orderBy('id')->get();
        $costed = $campaigns->filter(fn ($campaign) => (float) $campaign->advertising_cost + (float) $campaign->discount_amount > 0);
        if ($costed->isEmpty()) {
            return [];
        }

        $spends = $costed->map(fn ($campaign) => (float) $campaign->advertising_cost + (float) $campaign->discount_amount)->sort()->values();
        $returns = $costed->map(fn ($campaign) => (float) $campaign->sales_revenue / ((float) $campaign->advertising_cost + (float) $campaign->discount_amount))->sort()->values();
        $medianSpend = $this->median($spends->all());
        $medianReturn = $this->median($returns->all());
        $deaScores = DeaResult::query()->where('model', 'CCR')->pluck('efficiency_score', 'campaign_id');
        $recommendations = [];

        foreach ($costed as $campaign) {
            $spend = (float) $campaign->advertising_cost + (float) $campaign->discount_amount;
            $roi = (float) $campaign->sales_revenue / $spend;
            $efficiency = isset($deaScores[$campaign->id]) ? (float) $deaScores[$campaign->id] : null;
            $evidence = [
                'advertising_cost' => (float) $campaign->advertising_cost,
                'discount_amount' => (float) $campaign->discount_amount,
                'combined_marketing_spend' => round($spend, 2),
                'sales_revenue' => (float) $campaign->sales_revenue,
                'revenue_per_spend' => round($roi, 4),
                'portfolio_median_spend' => round($medianSpend, 2),
                'portfolio_median_revenue_per_spend' => round($medianReturn, 4),
                'ccr_efficiency_score' => $efficiency,
            ];

            if ($spend >= $medianSpend && $roi < $medianReturn) {
                $recommendations[] = [
                    'campaign_id' => $campaign->id,
                    'type' => 'allocation',
                    'priority' => 'high',
                    'title' => 'Review spend on '.$campaign->name,
                    'body' => 'This campaign spends at or above the portfolio median while generating below-median revenue per unit of spend. Audit its channel mix and test a smaller allocation before scaling again.',
                    'evidence' => $evidence,
                ];
            } elseif (($efficiency !== null && $efficiency >= 0.999999) && $roi >= $medianReturn) {
                $recommendations[] = [
                    'campaign_id' => $campaign->id,
                    'type' => 'maintain',
                    'priority' => 'low',
                    'title' => 'Maintain '.$campaign->name,
                    'body' => 'This campaign is on the current CCR efficiency frontier and returns at least the portfolio median revenue per unit of spend. Preserve its measured input-output mix while monitoring future results.',
                    'evidence' => $evidence,
                ];
            } else {
                $recommendations[] = [
                    'campaign_id' => $campaign->id,
                    'type' => 'improve',
                    'priority' => 'medium',
                    'title' => 'Improve '.$campaign->name,
                    'body' => 'Compare this campaign with the portfolio median and DEA reference campaigns. Test adjustments to advertising, hours, or discounting, then evaluate the next period using the same output measures.',
                    'evidence' => $evidence,
                ];
            }
        }

        DB::transaction(function () use ($recommendations): void {
            Recommendation::query()->where('type', 'analytics_generated')->where('status', 'open')->delete();
            foreach ($recommendations as $recommendation) {
                $recommendation['type'] = 'analytics_generated';
                Recommendation::create($recommendation);
            }
        });

        return Recommendation::query()->with('campaign:id,name,is_sample')
            ->where('type', 'analytics_generated')->where('status', 'open')
            ->orderByRaw("case priority when 'high' then 1 when 'medium' then 2 else 3 end")
            ->get()->all();
    }

    private function median(array $values): float
    {
        sort($values, SORT_NUMERIC);
        $count = count($values);
        $middle = intdiv($count, 2);

        return $count % 2 === 0
            ? ($values[$middle - 1] + $values[$middle]) / 2
            : $values[$middle];
    }
}