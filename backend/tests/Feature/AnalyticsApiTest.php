<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\Customer;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_always_creates_a_staff_account(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'New Administrator',
            'email' => 'new@example.test',
            'password' => 'CorrectHorse9!',
            'password_confirmation' => 'CorrectHorse9!',
            'role' => 'admin',
        ]);

        $response->assertCreated()->assertJsonPath('user.role', 'staff')->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
        $this->assertDatabaseHas('users', ['email' => 'new@example.test', 'role' => 'staff']);
        $this->assertDatabaseMissing('users', ['email' => 'new@example.test', 'password' => 'CorrectHorse9!']);
    }

    public function test_staff_can_manage_campaigns_but_not_users(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $this->actingAs($staff, 'sanctum')->postJson('/api/campaigns', [
            'name' => 'April Campaign',
            'advertising_cost' => 100,
            'marketing_hours' => 12,
            'discount_amount' => 5,
            'sales_revenue' => 500,
            'customers_acquired' => 8,
            'campaign_date' => '2026-04-01',
        ])->assertCreated()->assertJsonPath('is_sample', false);

        $this->actingAs($staff, 'sanctum')->getJson('/api/users')->assertForbidden();
    }

    public function test_forecasts_are_fitted_from_saved_monthly_records(): void
    {
        $user = User::factory()->create(['role' => 'staff']);

        foreach ([['2026-01-10', 100, 10], ['2026-02-10', 200, 20], ['2026-03-10', 300, 30]] as [$date, $revenue, $customersAcquired]) {
            $customer = Customer::create(['name' => 'Customer '.$date]);
            $campaign = Campaign::create([
                'name' => 'Campaign '.$date,
                'advertising_cost' => 10,
                'marketing_hours' => 5,
                'discount_amount' => 2,
                'sales_revenue' => $revenue,
                'customers_acquired' => $customersAcquired,
                'campaign_date' => $date,
            ]);
            Sale::create([
                'customer_id' => $customer->id,
                'campaign_id' => $campaign->id,
                'recorded_by' => $user->id,
                'amount' => $revenue,
                'quantity' => $customersAcquired,
                'sold_at' => $date,
            ]);
        }

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/analytics/forecast?months=2')
            ->assertOk()
            ->assertJsonPath('training_months', 3)
            ->assertJsonPath('predictions.0.month', '2026-04')
            ->assertJsonPath('predictions.0.predicted_sales_revenue', 400)
            ->assertJsonPath('predictions.0.predicted_customers_acquired', 40);

        $this->assertDatabaseHas('analytics_results', ['metric' => 'sales_revenue_predicted', 'value' => 400]);
    }

    public function test_dashboard_and_csv_and_pdf_reports_are_available_to_authenticated_users(): void
    {
        $user = User::factory()->create(['role' => 'staff']);
        $customer = Customer::create(['name' => 'Sample Buyer']);
        $campaign = Campaign::create([
            'name' => 'Sample Campaign', 'advertising_cost' => 100, 'marketing_hours' => 10,
            'discount_amount' => 5, 'sales_revenue' => 250, 'customers_acquired' => 5,
            'campaign_date' => '2026-03-01',
        ]);
        Sale::create([
            'customer_id' => $customer->id, 'campaign_id' => $campaign->id, 'recorded_by' => $user->id,
            'amount' => 250, 'quantity' => 5, 'sold_at' => '2026-03-01 12:00:00',
        ]);

        $this->actingAs($user, 'sanctum')->getJson('/api/dashboard')
            ->assertOk()->assertJsonPath('summary.totals.sales_revenue', 250);

        $csvResponse = $this->actingAs($user, 'sanctum')->get('/api/reports/campaigns.csv');
        $csvResponse->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('Sample Campaign', $csvResponse->streamedContent());

        $this->actingAs($user, 'sanctum')->get('/api/reports/campaigns.pdf')
            ->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_dashboard_recalculates_dea_only_when_campaign_inputs_change(): void
    {
        $user = User::factory()->create(['role' => 'staff']);
        $campaign = Campaign::create([
            'name' => 'Sample Campaign', 'advertising_cost' => 100, 'marketing_hours' => 10,
            'discount_amount' => 5, 'sales_revenue' => 250, 'customers_acquired' => 5,
            'campaign_date' => '2026-03-01',
        ]);

        try {
            Carbon::setTestNow('2026-03-01 10:00:00');
            $this->actingAs($user, 'sanctum')->getJson('/api/dashboard')->assertOk();
            $this->assertDatabaseHas('dea_results', [
                'campaign_id' => $campaign->id,
                'calculated_at' => '2026-03-01 10:00:00',
            ]);

            Carbon::setTestNow('2026-03-01 10:00:01');
            $this->actingAs($user, 'sanctum')->getJson('/api/dashboard')->assertOk();
            $this->assertDatabaseHas('dea_results', [
                'campaign_id' => $campaign->id,
                'calculated_at' => '2026-03-01 10:00:00',
            ]);

            $campaign->update(['sales_revenue' => 300]);
            Carbon::setTestNow('2026-03-01 10:00:02');
            $this->actingAs($user, 'sanctum')->getJson('/api/dashboard')->assertOk();
            $this->assertDatabaseHas('dea_results', [
                'campaign_id' => $campaign->id,
                'calculated_at' => '2026-03-01 10:00:02',
            ]);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_campaign_csv_import_is_validated_before_rows_are_written(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $headers = 'name,advertising_cost,marketing_hours,discount_amount,sales_revenue,customers_acquired,campaign_date';
        $validRow = 'CSV Campaign,100,10,5,500,8,2026-04-01';

        $this->actingAs($staff, 'sanctum')->withHeader('Accept', 'application/json')->post('/api/campaigns/import', [
            'file' => UploadedFile::fake()->createWithContent('campaigns.csv', $headers."\n".$validRow),
        ])->assertCreated()->assertJsonPath('imported', 1);
        $this->assertDatabaseHas('campaigns', ['name' => 'CSV Campaign', 'is_sample' => false]);

        $invalidCsv = $headers."\n".$validRow."\nInvalid Campaign,-1,10,5,500,8,2026-04-02";
        $this->actingAs($staff, 'sanctum')->withHeader('Accept', 'application/json')->post('/api/campaigns/import', [
            'file' => UploadedFile::fake()->createWithContent('invalid.csv', $invalidCsv),
        ])->assertUnprocessable();
        $this->assertDatabaseCount('campaigns', 1);
    }
}
