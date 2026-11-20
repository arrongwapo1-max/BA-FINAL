<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPasswordNotification::createUrlUsing(static function (User $user, string $token): string {
            $query = http_build_query([
                'token' => $token,
                'email' => $user->getEmailForPasswordReset(),
            ]);

            return rtrim(config('app.frontend_url'), '/').'/reset-password?'.$query;
        });
    }
}
