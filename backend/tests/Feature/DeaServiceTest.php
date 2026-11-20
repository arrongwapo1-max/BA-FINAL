<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Services\Analytics\DeaService;
use App\Services\Analytics\RecommendationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeaServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_ccr_ranks_a_dominated_campaign_below_the_frontier(): void
    {
        $efficient = Campaign::create([
            'name' => 'Efficient reference', 'advertising_cost' => 100, 'marketing_hours' => 10,
            'discount_amount' => 20, 'sales_revenue' => 1000, 'customers_acquired' => 10,
            'campaign_date' => '2026-01-01',
        ]);
        $dominated = Campaign::create([
            'name' => 'Dominated campaign', 'advertising_cost' => 200, 'marketing_hours' => 20,
            'discount_amount' => 40, 'sales_revenue' => 1000, 'customers_acquired' => 10,
            'campaign_date' => '2026-02-01',
        ]);

        $analysis = app(DeaService::class)->evaluate('CCR');

        $this->assertSame('CCR', $analysis['model']);
        $this->assertEqualsWithDelta(1.0, $analysis['results'][0]['efficiency_score'], 1.0e-6);
        $this->assertSame($efficient->id, $analysis['results'][0]['campaign_id']);
        $this->assertEqualsWithDelta(0.5, (float) $analysis['results'][1]['efficiency_score'], 1.0e-6);
        $this->assertSame($dominated->id, $analysis['results'][1]['campaign_id']);
        $this->assertDatabaseHas('dea_results', ['campaign_id' => $dominated->id, 'rank' => 2]);
    }

    public function test_zero_input_campaigns_are_excluded_with_an_explanation(): void
    {
        Campaign::create([
            'name' => 'Invalid input', 'advertising_cost' => 0, 'marketing_hours' => 10,
            'discount_amount' => 20, 'sales_revenue' => 1000, 'customers_acquired' => 10,
            'campaign_date' => '2026-01-01',
        ]);

        $analysis = app(DeaService::class)->evaluate();

        $this->assertCount(0, $analysis['results']);
        $this->assertCount(1, $analysis['excluded']);
        $this->assertStringContainsString('strictly greater than zero', $analysis['excluded'][0]['reason']);
    }

    public function test_bcc_produces_relative_efficiency_and_recommendations_with_evidence(): void
    {
        $efficient = Campaign::create([
            'name' => 'Efficient reference', 'advertising_cost' => 100, 'marketing_hours' => 10,
            'discount_amount' => 20, 'sales_revenue' => 1000, 'customers_acquired' => 10,
            'campaign_date' => '2026-01-01',
        ]);
        Campaign::create([
            'name' => 'High spend low return', 'advertising_cost' => 200, 'marketing_hours' => 20,
            'discount_amount' => 40, 'sales_revenue' => 1000, 'customers_acquired' => 10,
            'campaign_date' => '2026-02-01',
        ]);

        $analysis = app(DeaService::class)->evaluate('BCC');
        $recommendations = app(RecommendationService::class)->generate();

        $this->assertEqualsWithDelta(1.0, $analysis['results'][0]['efficiency_score'], 1.0e-6);
        $this->assertSame($efficient->id, $analysis['results'][0]['campaign_id']);
        $this->assertSame('Review spend on High spend low return', $recommendations[0]->title);
        $this->assertEquals(180, $recommendations[0]->evidence['portfolio_median_spend']);
        $this->assertSame(2, count($recommendations));
    }
}