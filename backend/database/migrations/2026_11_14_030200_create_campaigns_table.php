<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('advertising_cost', 14, 2);
            $table->decimal('marketing_hours', 10, 2);
            $table->decimal('discount_amount', 14, 2);
            $table->decimal('sales_revenue', 14, 2);
            $table->unsignedInteger('customers_acquired');
            $table->date('campaign_date')->index();
            $table->text('notes')->nullable();
            $table->boolean('is_sample')->default(false)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};