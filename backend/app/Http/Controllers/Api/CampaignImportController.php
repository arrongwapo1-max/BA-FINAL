<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class CampaignImportController extends Controller
{
    private const HEADERS = [
        'name', 'advertising_cost', 'marketing_hours', 'discount_amount',
        'sales_revenue', 'customers_acquired', 'campaign_date',
    ];

    public function __invoke(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);
        $handle = fopen($request->file('file')->getRealPath(), 'r');
        if ($handle === false) {
            throw ValidationException::withMessages(['file' => ['The uploaded CSV could not be read.']]);
        }

        try {
            $headers = fgetcsv($handle);
            if (! is_array($headers) || array_map('trim', $headers) !== self::HEADERS) {
                throw ValidationException::withMessages([
                    'file' => ['CSV headers must be exactly: '.implode(',', self::HEADERS).'.'],
                ]);
            }

            $rows = [];
            $rowNumber = 1;
            while (($values = fgetcsv($handle)) !== false) {
                $rowNumber++;
                if ($values === [null] || $values === []) {
                    continue;
                }
                if (count($values) !== count(self::HEADERS)) {
                    throw ValidationException::withMessages(['file' => ["CSV row {$rowNumber} has an unexpected number of columns."]]);
                }

                $row = array_combine(self::HEADERS, $values);
                $validator = Validator::make($row, [
                    'name' => ['required', 'string', 'max:255'],
                    'advertising_cost' => ['required', 'numeric', 'min:0'],
                    'marketing_hours' => ['required', 'numeric', 'min:0'],
                    'discount_amount' => ['required', 'numeric', 'min:0'],
                    'sales_revenue' => ['required', 'numeric', 'min:0'],
                    'customers_acquired' => ['required', 'integer', 'min:0'],
                    'campaign_date' => ['required', 'date'],
                ]);

                if ($validator->fails()) {
                    throw ValidationException::withMessages([
                        'file' => ["CSV row {$rowNumber}: ".implode(' ', $validator->errors()->all())],
                    ]);
                }
                $rows[] = $validator->validated();
            }

            if ($rows === []) {
                throw ValidationException::withMessages(['file' => ['The CSV contains no campaign records.']]);
            }

            DB::transaction(function () use ($rows): void {
                foreach ($rows as $row) {
                    Campaign::create($row);
                }
            });
        } finally {
            fclose($handle);
        }

        return response()->json(['imported' => count($rows)], 201);
    }
}