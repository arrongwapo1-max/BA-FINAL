<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\Customer;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class BusinessAnalyticsSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => env('DEMO_ADMIN_EMAIL', 'admin@example.test')],
            [
                'name' => 'Demo Administrator',
                'password' => env('DEMO_ADMIN_PASSWORD', 'ChangeMe123!'),
                'role' => 'admin',
            ],
        );

        $firstMonth = Carbon::now()->startOfMonth()->subMonths(49);

        for ($index = 0; $index < 50; $index++) {
            $number = $index + 1;
            $date = $firstMonth->copy()->addMonths($index)->day(10);
            $advertisingCost = 800 + (($index * 137) % 1200);
            $marketingHours = 30 + (($index * 7) % 60);
            $discountAmount = 100 + (($index * 53) % 500);
            $customersAcquired = 12 + (($index * 11) % 45);
            $salesRevenue = round(
                $advertisingCost * (2.2 + (($index % 7) * 0.18))
                + $discountAmount * 1.3
                + $customersAcquired * (24 + ($index % 5) * 4),
                2,
            );
            $name = sprintf('Simulated Campaign %02d', $number);
            $customerEmail = sprintf('sample-customer-%02d@example.test', $number);

            $campaign = Campaign::updateOrCreate(
                ['name' => $name],
                [
                    'advertising_cost' => $advertisingCost,
                    'marketing_hours' => $marketingHours,
                    'discount_amount' => $discountAmount,
                    'sales_revenue' => $salesRevenue,
                    'customers_acquired' => $customersAcquired,
                    'campaign_date' => $date->toDateString(),
                    'notes' => 'Simulated demonstration data; not actual company results.',
                    'is_sample' => true,
                ],
            );

            $customer = Customer::updateOrCreate(
                ['email' => $customerEmail],
                [
                    'name' => sprintf('Sample Customer %02d', $number),
                    'company' => sprintf('Sample Company %02d', $number),
                    'notes' => 'Simulated demonstration record; not a real customer.',
                    'is_sample' => true,
                ],
            );

            Sale::updateOrCreate(
                ['campaign_id' => $campaign->id, 'customer_id' => $customer->id],
                [
                    'recorded_by' => $admin->id,
                    'amount' => $salesRevenue,
                    'quantity' => $customersAcquired,
                    'sold_at' => $date->copy()->setTime(12, 0),
                    'notes' => 'Simulated monthly campaign total; not an actual transaction.',
                    'is_sample' => true,
                ],
            );
        }
    }
}