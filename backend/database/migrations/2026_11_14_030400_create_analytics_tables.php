<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_results', function (Blueprint $table) {
            $table->id();
            $table->string('analysis_type', 30);
            $table->string('metric', 80);
            $table->date('period')->nullable();
            $table->decimal('value', 20, 4);
            $table->json('metadata')->nullable();
            $table->timestamp('computed_at')->index();
            $table->timestamps();
            $table->index(['analysis_type', 'metric', 'period']);
        });

        Schema::create('dea_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->string('model', 10);
            $table->decimal('efficiency_score', 10, 6);
            $table->boolean('is_efficient');
            $table->unsignedInteger('rank');
            $table->json('reference_set')->nullable();
            $table->timestamp('calculated_at')->index();
            $table->timestamps();
            $table->unique(['campaign_id', 'model']);
        });

        Schema::create('recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 30);
            $table->string('priority', 10);
            $table->string('title');
            $table->text('body');
            $table->json('evidence')->nullable();
            $table->string('status', 20)->default('open')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recommendations');
        Schema::dropIfExists('dea_results');
        Schema::dropIfExists('analytics_results');
    }
};