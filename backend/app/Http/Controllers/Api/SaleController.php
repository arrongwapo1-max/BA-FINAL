<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'customer_id' => ['sometimes', 'integer', 'min:1', 'exists:customers,id'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $query = Sale::query()->with(['customer:id,name,email', 'campaign:id,name']);
        $query->when($filters['from'] ?? null, fn ($builder, $date) => $builder->whereDate('sold_at', '>=', $date));
        $query->when($filters['to'] ?? null, fn ($builder, $date) => $builder->whereDate('sold_at', '<=', $date));
        $query->when($filters['customer_id'] ?? null, fn ($builder, $id) => $builder->where('customer_id', $id));

        return $query->orderByDesc('sold_at')->paginate($filters['per_page'] ?? 15);
    }

    public function store(Request $request): Sale
    {
        return Sale::create($this->validatedData($request) + ['recorded_by' => $request->user()->id])->refresh();
    }

    public function show(Sale $sale): Sale
    {
        return $sale->load(['customer', 'campaign', 'recorder:id,name']);
    }

    public function update(Request $request, Sale $sale): Sale
    {
        $sale->update($this->validatedData($request, true));

        return $sale->refresh()->load(['customer:id,name', 'campaign:id,name']);
    }

    public function destroy(Sale $sale)
    {
        $sale->delete();

        return response()->noContent();
    }

    private function validatedData(Request $request, bool $isUpdate = false): array
    {
        $required = $isUpdate ? 'sometimes' : 'required';

        return $request->validate([
            'customer_id' => [$required, 'integer', 'exists:customers,id'],
            'campaign_id' => ['sometimes', 'nullable', 'integer', 'exists:campaigns,id'],
            'amount' => [$required, 'numeric', 'gt:0'],
            'quantity' => [$required, 'integer', 'min:1'],
            'sold_at' => [$required, 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ]);
    }
}