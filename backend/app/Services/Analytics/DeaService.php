<?php

namespace App\Services\Analytics;

use App\Models\Campaign;
use App\Models\DeaResult;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DeaService
{
    private const INPUTS = ['advertising_cost', 'marketing_hours', 'discount_amount'];

    private const OUTPUTS = ['sales_revenue', 'customers_acquired'];

    public function evaluate(string $model = 'CCR'): array
    {
        $model = $this->normalizeModel($model);
        $campaigns = Campaign::query()->orderBy('id')->get();

        $analysis = $this->evaluateCampaigns($model, $campaigns);
        $this->rememberCampaignState($model, $campaigns);

        return $analysis;
    }

    public function evaluateIfCampaignsChanged(string $model = 'CCR'): void
    {
        $model = $this->normalizeModel($model);
        $campaigns = Campaign::query()->orderBy('id')->get();
        $signature = $this->campaignSignature($campaigns);
        $cacheKey = $this->cacheKey($model);
        $cached = Cache::get($cacheKey);
        $resultCount = DeaResult::query()->where('model', $model)->count();

        if (
            is_array($cached)
            && ($cached['signature'] ?? null) === $signature
            && ($cached['result_count'] ?? null) === $resultCount
        ) {
            return;
        }

        $this->evaluateCampaigns($model, $campaigns);
        $this->rememberCampaignState($model, $campaigns);
    }

    private function evaluateCampaigns(string $model, Collection $campaigns): array
    {
        $valid = [];
        $excluded = [];

        foreach ($campaigns as $campaign) {
            $inputs = array_map(fn ($field) => (float) $campaign->{$field}, self::INPUTS);
            $outputs = array_map(fn ($field) => (float) $campaign->{$field}, self::OUTPUTS);

            if (count(array_filter($inputs, fn ($value) => ! is_finite($value) || $value <= 0)) > 0) {
                $excluded[] = [
                    'campaign_id' => $campaign->id,
                    'campaign_name' => $campaign->name,
                    'reason' => 'DEA scores require each input to be finite and strictly greater than zero.',
                ];

                continue;
            }

            if (count(array_filter($outputs, fn ($value) => ! is_finite($value) || $value < 0)) > 0) {
                $excluded[] = [
                    'campaign_id' => $campaign->id,
                    'campaign_name' => $campaign->name,
                    'reason' => 'DEA outputs must be finite and non-negative.',
                ];

                continue;
            }

            $valid[] = ['campaign' => $campaign, 'inputs' => $inputs, 'outputs' => $outputs];
        }

        $evaluatedAt = Carbon::now();
        $results = [];
        foreach ($valid as $unit) {
            $result = $this->score($unit, $valid, $model);
            if ($result['status'] !== 'optimal') {
                $excluded[] = [
                    'campaign_id' => $unit['campaign']->id,
                    'campaign_name' => $unit['campaign']->name,
                    'reason' => 'The DEA linear program was '.$result['status'].'.',
                ];

                continue;
            }

            $score = min(1.0, max(0.0, (float) $result['score']));
            $references = [];
            foreach ($result['variables'] as $index => $weight) {
                if ($weight > 1.0e-6) {
                    $reference = $valid[$index]['campaign'];
                    $references[] = [
                        'campaign_id' => $reference->id,
                        'campaign_name' => $reference->name,
                        'weight' => round($weight, 6),
                    ];
                }
            }

            $results[] = [
                'campaign_id' => $unit['campaign']->id,
                'campaign_name' => $unit['campaign']->name,
                'efficiency_score' => round($score, 6),
                'is_efficient' => $score >= 1.0 - 1.0e-6,
                'reference_set' => $references,
                '_model' => $model,
            ];
        }

        usort($results, fn ($left, $right) => $right['efficiency_score'] <=> $left['efficiency_score']);
        $rank = 0;
        $previousScore = null;
        foreach ($results as $index => &$result) {
            if ($previousScore === null || abs($result['efficiency_score'] - $previousScore) > 1.0e-6) {
                $rank = $index + 1;
                $previousScore = $result['efficiency_score'];
            }
            $result['rank'] = $rank;
        }
        unset($result);

        DB::transaction(function () use ($model, $results, $evaluatedAt): void {
            $validIds = array_column($results, 'campaign_id');
            DeaResult::query()->where('model', $model)->whereNotIn('campaign_id', $validIds)->delete();

            foreach ($results as $result) {
                DeaResult::updateOrCreate(
                    ['campaign_id' => $result['campaign_id'], 'model' => $model],
                    [
                        'efficiency_score' => $result['efficiency_score'],
                        'is_efficient' => $result['is_efficient'],
                        'rank' => $result['rank'],
                        'reference_set' => $result['reference_set'],
                        'calculated_at' => $evaluatedAt,
                    ],
                );
            }
        });

        foreach ($results as &$result) {
            unset($result['_model']);
        }
        unset($result);

        return [
            'model' => $model,
            'orientation' => 'input',
            'returns_to_scale' => $model === 'CCR' ? 'constant' : 'variable',
            'calculated_at' => $evaluatedAt->toISOString(),
            'assumptions' => [
                'Each campaign is one decision-making unit.',
                'Advertising cost, marketing hours, and discount amount are inputs; revenue and acquired customers are outputs.',
                'All inputs must be strictly positive; invalid units are excluded and listed separately.',
                'A score of 1 indicates membership in the observed efficient frontier; lower scores indicate proportional input reduction potential.',
                'Scores measure relative efficiency only for the campaigns and variables supplied; they do not prove causation or account for omitted factors.',
            ],
            'results' => $results,
            'excluded' => $excluded,
        ];
    }

    private function normalizeModel(string $model): string
    {
        $model = strtoupper($model);
        abort_unless(in_array($model, ['CCR', 'BCC'], true), 422, 'DEA model must be CCR or BCC.');

        return $model;
    }

    private function rememberCampaignState(string $model, Collection $campaigns): void
    {
        Cache::forever($this->cacheKey($model), [
            'signature' => $this->campaignSignature($campaigns),
            'result_count' => DeaResult::query()->where('model', $model)->count(),
        ]);
    }

    private function campaignSignature(Collection $campaigns): string
    {
        $data = $campaigns->map(fn (Campaign $campaign) => [
            $campaign->id,
            $campaign->advertising_cost,
            $campaign->marketing_hours,
            $campaign->discount_amount,
            $campaign->sales_revenue,
            $campaign->customers_acquired,
        ])->all();

        return hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
    }

    private function cacheKey(string $model): string
    {
        return 'analytics.dea.'.$model.'.campaign-signature';
    }

    private function score(array $target, array $units, string $model): array
    {
        $unitCount = count($units);
        $thetaIndex = $unitCount;
        $matrix = [];
        $bounds = [];

        foreach (self::INPUTS as $dimension => $_field) {
            $row = [];
            foreach ($units as $unit) {
                $row[] = $unit['inputs'][$dimension];
            }
            $row[] = -$target['inputs'][$dimension];
            $matrix[] = $row;
            $bounds[] = 0.0;
        }

        foreach (self::OUTPUTS as $dimension => $_field) {
            $row = [];
            foreach ($units as $unit) {
                $row[] = -$unit['outputs'][$dimension];
            }
            $row[] = 0.0;
            $matrix[] = $row;
            $bounds[] = -$target['outputs'][$dimension];
        }

        if ($model === 'BCC') {
            $matrix[] = array_merge(array_fill(0, $unitCount, 1.0), [0.0]);
            $bounds[] = 1.0;
            $matrix[] = array_merge(array_fill(0, $unitCount, -1.0), [0.0]);
            $bounds[] = -1.0;
        }

        $objective = array_merge(array_fill(0, $unitCount, 0.0), [-1.0]);
        $solution = (new SimplexSolver($matrix, $bounds, $objective))->solve();

        if ($solution['status'] !== 'optimal') {
            return $solution;
        }

        return [
            'status' => 'optimal',
            'score' => $solution['variables'][$thetaIndex],
            'variables' => array_slice($solution['variables'], 0, $unitCount),
        ];
    }
}
