# Business Analytics Frontend

React, TypeScript, and Vite frontend for the Laravel Business Analytics API.

## Run locally

1. Start the backend from `backend/`:

   ```powershell
   php artisan serve
   ```

   The frontend's Vite development server proxies `/api` requests to `http://127.0.0.1:8000`.
2. Start the frontend from `frontend/`:

   ```powershell
   npm install
   npm run dev
   ```

3. Open the Vite localhost URL and sign in with an API account. Use the backend's registration endpoint to create a staff account, or sign in with an account created by the backend seeder.

Set `VITE_API_URL` in the frontend environment when the API is hosted elsewhere. It should include the API prefix, for example `https://api.example.test/api`.

## Included screens

- Overview dashboard with saved sales, campaigns, and forecast summaries
- Campaign, customer, and sales record management
- Predictive analytics and CCR/BCC campaign efficiency
- Recommendation generation and status updates
- CSV and PDF report downloads
- Admin-only user management

All amounts are shown in the units saved by the API because the backend does not define a currency.
