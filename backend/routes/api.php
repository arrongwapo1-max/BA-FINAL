<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\CampaignImportController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\UserController;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/dashboard', [AnalyticsController::class, 'dashboard']);
    Route::get('/analytics/summary', [AnalyticsController::class, 'summary']);
    Route::get('/analytics/forecast', [AnalyticsController::class, 'forecast']);
    Route::get('/analytics/dea', [AnalyticsController::class, 'dea']);
    Route::get('/analytics/recommendations', [AnalyticsController::class, 'recommendations']);
    Route::post('/analytics/recommendations/generate', [AnalyticsController::class, 'generateRecommendations']);
    Route::patch('/recommendations/{recommendation}', [AnalyticsController::class, 'updateRecommendation']);
    Route::post('/campaigns/import', CampaignImportController::class);
    Route::get('/reports/{type}.csv', [ReportController::class, 'csv']);
    Route::get('/reports/{type}.pdf', [ReportController::class, 'pdf']);

    Route::apiResource('campaigns', CampaignController::class);
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('sales', SaleController::class);

    Route::middleware('role:admin')->apiResource('users', UserController::class);
});
