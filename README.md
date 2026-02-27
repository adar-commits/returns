# returns

Returns and exchanges hub — Next.js 14 (App Router) + Supabase. TypeScript. RTL Hebrew.

- **Local:** `npm install` then `npm run dev`
- **Vercel:** Connect repo; set env vars in project Settings → Environment Variables
- **Supabase:** Run migrations in `supabase/migrations/` (e.g. via Supabase CLI or SQL in dashboard)

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side; bypasses RLS |
| `SESSION_SECRET` | Secret for signing customer and staff session JWTs (use a long random string in production) |
| `OTP_SEND_URL` | Your API URL: we POST `{ phone }`, you send code (e.g. via WhatsApp) |
| `OTP_VERIFY_URL` | Your API URL: we POST `{ phone, code }`, you return `{ valid }` |
| `ORDERS_WEBHOOK_URL` | We POST `{ phone }`, you return `{ orders, customerDetails }` |
| `SIZES_WEBHOOK_URL` | We POST `{ sku }`, you return `{ sizes }` |
| `BRANCHES_WEBHOOK_URL` | We GET, you return `{ branches }` |
| `FINAL_WEBHOOK_URL` | We POST full return request + `confirm_url` when request is filed |
| `INVOICES_WEBHOOK_URL` | We GET `?ivnum=...`, you return `{ href }` |
| `PAYPLUS_API_URL` | (Optional) Payplus create-payment endpoint; we POST and expect `{ payment_link }` |
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. `https://your-app.vercel.app`) for confirm links |

Many of these can also be set in **Settings** (Admin) in the app.

## OTP bypass (dev/support)

Entering the code **0000** at the OTP step logs the customer in without calling your verify API. Use for testing or support.

## Staff

- **Login:** `/staff/login` — Email/password (Supabase Auth) or **Sign in with Google**. Users must exist in `auth.users` and have a row in `staff_roles` (role: `admin`, `csr`, or `store_manager`; `branch_id` required for store_manager).
- **Google OAuth setup:** In Supabase Dashboard → Authentication → Providers, enable Google and set Client ID + Client Secret (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)). Under Authentication → URL Configuration, add to **Redirect URLs**: `http://localhost:3000/auth/callback` and `https://your-production-domain.com/auth/callback`. If you get **redirect_uri_mismatch (400)** from Google, add Supabase’s callback URL in Google Cloud Console: open your Supabase project → Authentication → URL Configuration, copy the **Site URL** or the redirect URL Supabase shows (e.g. `https://<project-ref>.supabase.co/auth/v1/callback`), then in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth 2.0 Client ID → **Authorized redirect URIs**, add that exact URL.
- **Dashboard:** `/staff` — list return requests (filtered by branch for Store Manager).
- **Settings:** `/staff/settings` — Admin only; eligibility days, return reasons, shipping tiers, help banner, etc.

## Database

Run `supabase/migrations/20250226000000_initial_schema.sql` to create `app_settings`, `return_requests`, and `staff_roles`. Seed the first staff user and role in Supabase (Auth + `staff_roles` table).
