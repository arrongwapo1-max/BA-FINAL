<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        return User::query()->select(['id', 'name', 'email', 'role', 'created_at'])->orderBy('name')->paginate(25);
    }

    public function store(Request $request): User
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:10'],
            'role' => ['required', Rule::in(['admin', 'staff'])],
        ]);

        return User::create($data);
    }

    public function show(User $user): User
    {
        return $user->makeHidden(['password', 'remember_token']);
    }

    public function update(Request $request, User $user): User
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['sometimes', 'required', 'string', 'min:10'],
            'role' => ['sometimes', 'required', Rule::in(['admin', 'staff'])],
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
            $user->tokens()->delete();
        }

        $user->update($data);

        return $user->refresh()->makeHidden(['password', 'remember_token']);
    }

    public function destroy(Request $request, User $user)
    {
        abort_if($request->user()->is($user), 422, 'You cannot delete your own account.');
        $user->delete();

        return response()->noContent();
    }
}