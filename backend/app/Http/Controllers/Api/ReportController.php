<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recommendation;
use App\Services\Analytics\DeaService;
use App\Services\Analytics\DescriptiveAnalyticsService;
use App\Services\Analytics\PredictiveAnalyticsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ReportController extends Controller
{
    public function csv(Request $request, string $type)
    {
        $data = $this->validatedReport($request, $type);
        $rows = $this->rows($type, $data);
        $filename = $type.'-report-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($rows): void {
            $output = fopen('php://output', 'w');
            if ($rows !== []) {
                fputcsv($output, array_keys($rows[0]));
                foreach ($rows as $row) {
                    fputcsv($output, array_map(fn ($value) => $this->csvValue($value), array_values($row)));
                }
            }
            fclose($output);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function pdf(Request $request, string $type)
    {
        $data = $this->validatedReport($request, $type);
        $rows = $this->rows($type, $data);

        return Pdf::loadView('reports.pdf', [
            'title' => Str::headline($type).' Report',
            'generatedAt' => now(),
            'rows' => $rows,
            'summary' => $rows === [] ? null : json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        ])->setPaper('a4', 'landscape')->download($type.'-report.pdf');
    }

    private function validatedReport(Request $request, string $type): array
    {
        abort_unless(in_array($type, ['sales', 'campaigns', 'descriptive', 'predictive', 'dea', 'recommendations'], true), 404);

        return $request->validate([
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'months' => ['sometimes', 'integer', 'min:1', 'max:24'],
            'model' => ['sometimes', 'in:CCR,BCC,ccr,bcc'],
        ]);
    }

    private function rows(string $type, array $parameters): array
    {
        $descriptive = app(DescriptiveAnalyticsService::class);

        return match ($type) {
            'campaigns' => $descriptive->campaignReport(),
            'sales' => $descriptive->salesReport($parameters['from'] ?? null, $parameters['to'] ?? null),
            'descriptive' => $this->descriptiveRows($descriptive),
            'predictive' => $this->predictiveRows((int) ($parameters['months'] ?? 3)),
            'dea' => $this->deaRows($parameters['model'] ?? 'CCR'),
            'recommendations' => Recommendation::query()->with('campaign:id,name,is_sample')->get()
                ->map(fn ($recommendation) => $recommendation->toArray())->all(),
        };
    }

    private function descriptiveRows(DescriptiveAnalyticsService $service): array
    {
        app(DeaService::class)->evaluate('CCR');

        return [$service->dashboard()];
    }

    private function deaRows(string $model): array
    {
        $analysis = app(DeaService::class)->evaluate($model);
        $rows = array_map(fn ($result) => $result + ['status' => 'evaluated', 'model' => $analysis['model']], $analysis['results']);

        foreach ($analysis['excluded'] as $excluded) {
            $rows[] = $excluded + ['status' => 'excluded', 'model' => $analysis['model']];
        }

        return $rows;
    }

    private function predictiveRows(int $months): array
    {
        $forecast = app(PredictiveAnalyticsService::class)->forecast($months, false);
        $rows = [];

        foreach ($forecast['history'] as $actual) {
            $rows[] = [
                'month' => $actual['month'],
                'status' => 'actual',
                'actual_sales_revenue' => $actual['actual_sales_revenue'],
                'actual_customers_acquired' => $actual['actual_customers_acquired'],
                'predicted_sales_revenue' => null,
                'predicted_customers_acquired' => null,
            ];
        }

        foreach ($forecast['predictions'] as $prediction) {
            $rows[] = [
                'month' => $prediction['month'],
                'status' => 'predicted',
                'actual_sales_revenue' => null,
                'actual_customers_acquired' => null,
                'predicted_sales_revenue' => $prediction['predicted_sales_revenue'],
                'predicted_customers_acquired' => $prediction['predicted_customers_acquired'],
            ];
        }

        return $rows;
    }

    private function csvValue(mixed $value): string
    {
        if (is_array($value) || is_object($value)) {
            $value = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        $value = (string) ($value ?? '');

        return preg_match('/^[=+\-@\t\r]/', $value) === 1 ? "'".$value : $value;
    }
}