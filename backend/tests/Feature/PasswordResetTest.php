<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_a_frontend_reset_link_without_revealing_unknown_accounts(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('message', 'If an account exists for that email, a password reset link has been sent.');

        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification) use ($user): bool {
            $mail = $notification->toMail($user);

            $this->assertStringStartsWith('http://localhost:5173/reset-password?', $mail->actionUrl);
            $this->assertStringContainsString('email='.rawurlencode($user->email), $mail->actionUrl);

            return true;
        });

        $this->postJson('/api/auth/forgot-password', ['email' => 'unknown@example.test'])
            ->assertOk()
            ->assertJsonPath('message', 'If an account exists for that email, a password reset link has been sent.');
    }

    public function test_reset_password_updates_the_password_and_consumes_the_token(): void
    {
        $user = User::factory()->create(['password' => 'OriginalPassword123!']);
        $token = Password::createToken($user);

        $payload = [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ];

        $this->postJson('/api/auth/reset-password', $payload)
            ->assertOk()
            ->assertJsonPath('message', 'Your password has been reset.');

        $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));
        $this->postJson('/api/auth/reset-password', $payload)->assertUnprocessable();
    }

    public function test_reset_password_rejects_an_invalid_token(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => 'invalid-token',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertUnprocessable()->assertJsonValidationErrors('token');
    }
}
