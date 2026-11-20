<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recommendation;
use App\Services\Analytics\DeaService;
use App\Services\Analytics\DescriptiveAnalyticsService;
use App\Services\Analytics\PredictiveAnalyticsService;
use App\Services\Analytics\RecommendationService;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function dashboard(
        DeaService $dea,
        DescriptiveAnalyticsService $descriptive,
        PredictiveAnalyticsService $predictive,
    ): array {
        $dea->evaluateIfCampaignsChanged('CCR');

        return [
            'summary' => $descriptive->dashboard(),
            'forecast' => $predictive->forecast(1, false),
            'recommendations' => Recommendation::query()->with('campaign:id,name,is_sample')
                ->where('status', 'open')->orderByDesc('created_at')->limit(8)->get(),
        ];
    }

    public function summary(DeaService $dea, DescriptiveAnalyticsService $descriptive): array
    {
        $dea->evaluate('CCR');

        return $descriptive->dashboard();
    }

    public function forecast(Request $request, PredictiveAnalyticsService $predictive): array
    {
        $data = $request->validate(['months' => ['sometimes', 'integer', 'min:1', 'max:24']]);

        return $predictive->forecast((int) ($data['months'] ?? 3));
    }

    public function dea(Request $request, DeaService $dea): array
    {
        $data = $request->validate(['model' => ['sometimes', 'string', 'in:CCR,BCC,ccr,bcc']]);

        return $dea->evaluate($data['model'] ?? 'CCR');
    }

    public function recommendations(RecommendationService $service)
    {
        return Recommendation::query()->with('campaign:id,name,is_sample')
            ->whereIn('status', ['open', 'actioned', 'dismissed'])
            ->orderByDesc('created_at')->paginate(30);
    }

    public function generateRecommendations(DeaService $dea, RecommendationService $service)
    {
        $dea->evaluate('CCR');

        return $service->generate();
    }

    public function updateRecommendation(Request $request, Recommendation $recommendation): Recommendation
    {
        $data = $request->validate(['status' => ['required', 'in:actioned,dismissed,open']]);
        $recommendation->update($data);

        return $recommendation->refresh();
    }
}
