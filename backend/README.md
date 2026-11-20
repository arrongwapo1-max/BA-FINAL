# Business Analytics System Backend

Laravel 12 REST API for campaign, customer, and sales management; descriptive, predictive, and prescriptive analytics; and input-oriented Data Envelopment Analysis (DEA). The API uses Sanctum bearer tokens and MySQL. SQLite in-memory is used by the automated test suite.

## Requirements

- PHP 8.2 or newer with `pdo_mysql`, `pdo_sqlite`, `mbstring`, `openssl`, and `fileinfo`
- Composer 2
- MySQL 8 or compatible MariaDB (XAMPP is supported)

## Local Setup

1. Start MySQL in XAMPP, or start your compatible MySQL service.
2. Create the database:

```sql
CREATE DATABASE business_analytics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. This project includes a local `.env`; verify its `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` values for your MySQL installation. The defaults use `127.0.0.1:3306`, database `business_analytics`, and the default XAMPP `root` account with an empty password. For a fresh checkout without `.env`, copy `.env.example` first.
4. Install dependencies and initialize the application:

```powershell
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

The API is available at `http://127.0.0.1:8000/api`. The Laravel health endpoint is `http://127.0.0.1:8000/up`.

The seeder creates an admin account using `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` from `.env`. The example password is for local demonstration only; change it before exposing the application. Seeded campaign, customer, and sales records are deterministic simulated data, marked with `is_sample=true` and explanatory notes. Re-running the seeder updates those records rather than duplicating them.

## Authentication And Roles

Registration creates a staff account. Sign in with `POST /api/auth/login` to receive a Sanctum token and send it as `Authorization: Bearer <token>`. Use `POST /api/auth/logout` to revoke the current token. Password recovery uses `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`; set `FRONTEND_URL` to the frontend origin so emailed links return to the correct app. Configure a delivery-capable `MAIL_MAILER` and its credentials to send recovery emails. The example environment uses the `log` mailer, which writes messages to the Laravel log instead of delivering them. The `/api/users` endpoints require the admin role; campaign, customer, sales, analytics, and report endpoints require an authenticated user.

Example login body:

```json
{
  "email": "admin@example.test",
  "password": "ChangeMe123!"
}
```

## API Endpoints

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/user`
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `GET|POST|PUT|PATCH|DELETE /api/campaigns` and `/api/campaigns/{id}`
- `POST /api/campaigns/import` for CSV import; `GET /api/reports/campaigns.csv` for export
- `GET|POST|PUT|PATCH|DELETE /api/customers` and `/api/customers/{id}`
- `GET|POST|PUT|PATCH|DELETE /api/sales` and `/api/sales/{id}`
- `GET /api/dashboard`, `GET /api/analytics/summary`
- `GET /api/analytics/forecast?months=3` (1 to 24 months)
- `GET /api/analytics/dea?model=CCR` (`CCR` or `BCC`)
- `GET /api/analytics/recommendations`, `POST /api/analytics/recommendations/generate`, `PATCH /api/recommendations/{id}`
- `GET /api/reports/{sales|campaigns|descriptive|predictive|dea|recommendations}.csv`
- `GET /api/reports/{sales|campaigns|descriptive|predictive|dea|recommendations}.pdf`
- Admin-only user CRUD at `GET|POST /api/users`, `GET|PUT|PATCH|DELETE /api/users/{id}`

Campaign filters include `search`, `from`, `to`, `performance=low|medium|high`, `sample_only`, and `per_page`. Performance bands use sales revenue divided by advertising cost plus discount amount: low is below 1, medium is 1 to below 3, and high is 3 or greater. Campaign CSV import requires the exact header order `name,advertising_cost,marketing_hours,discount_amount,sales_revenue,customers_acquired,campaign_date`; all rows are validated before the import transaction is committed.

## Analytics Notes

- Descriptive metrics and charts are derived from saved sales and campaign records. The dashboard computes CCR efficiency before returning efficiency summaries.
- Predictive analytics aggregates historical sales by month and fits a simple ordinary least-squares time trend. Missing months inside the observed range are treated as zero. Forecasts are based only on database records and are stored in `analytics_results`. This baseline does not model seasonality, causal effects, or external market changes.
- DEA treats each campaign as a decision-making unit, with advertising cost, marketing hours, and discount amount as inputs, and sales revenue and customers acquired as outputs. The implementation solves the input-oriented envelopment linear program using a two-phase simplex method. CCR assumes constant returns to scale; BCC adds the convexity constraint for variable returns to scale.
- DEA requires all input values to be finite and strictly positive. Invalid campaigns are listed as excluded rather than given artificial scores. A score of 1 is efficient relative to the observed sample; lower scores indicate proportional input-reduction potential under the selected model. DEA is relative, depends on the selected variables and records, and does not establish causation.
- Recommendations compare actual campaign revenue per combined advertising and discount spend against portfolio medians and, when computed, CCR scores. Each recommendation includes the measurements used as evidence.

## Tests

Tests use in-memory SQLite and do not require a running MySQL server:

```powershell
php artisan test
```

The suite covers authentication/roles, API reporting and forecasting, the sample seeder, the simplex solver, and hand-checked CCR scores. To inspect routes, run `php artisan route:list --path=api`.
