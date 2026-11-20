<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class BusinessAnalyticsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_at_least_fifty_campaigns_with_explicit_sample_markers(): void
    {
        Artisan::call('db:seed');

        $this->assertDatabaseCount('campaigns', 50);
        $this->assertDatabaseCount('customers', 50);
        $this->assertDatabaseCount('sales', 50);
        $this->assertDatabaseHas('campaigns', ['name' => 'Simulated Campaign 01', 'is_sample' => true]);
        $this->assertDatabaseHas('sales', ['is_sample' => true]);
        $this->assertDatabaseHas('users', ['email' => env('DEMO_ADMIN_EMAIL', 'admin@example.test'), 'role' => 'admin']);

        Artisan::call('db:seed');
        $this->assertDatabaseCount('campaigns', 50);
        $this->assertDatabaseCount('sales', 50);
    }
}