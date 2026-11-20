<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query()->withCount('sales');
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($builder) => $builder->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('company', 'like', "%{$search}%"));
        }

        return $query->orderBy('name')->paginate(min($request->integer('per_page', 15), 100));
    }

    public function store(Request $request): Customer
    {
        return Customer::create($this->validatedData($request))->refresh();
    }

    public function show(Customer $customer): Customer
    {
        return $customer->load('sales.campaign');
    }

    public function update(Request $request, Customer $customer): Customer
    {
        $customer->update($this->validatedData($request, $customer));

        return $customer->refresh();
    }

    public function destroy(Customer $customer)
    {
        abort_if($customer->sales()->exists(), 409, 'Customers with sales transactions cannot be deleted.');
        $customer->delete();

        return response()->noContent();
    }

    private function validatedData(Request $request, ?Customer $customer = null): array
    {
        return $request->validate([
            'name' => [$customer ? 'sometimes' : 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('customers', 'email')->ignore($customer?->id)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'company' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ]);
    }
}