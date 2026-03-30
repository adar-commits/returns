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
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. `https://your-app.vercel.app`) for confirm links and (with production-only staff mode) the staff login link from localhost |
| `NEXT_PUBLIC_STAFF_OAUTH_PRODUCTION_ONLY` | Set to `true` on local `.env.local` so `/staff/login` on localhost does **not** start Google OAuth; you get a link to `NEXT_PUBLIC_APP_URL/staff/login` instead. PKCE requires the OAuth flow to start and finish on the **same origin**, so pointing `redirectTo` at production while on localhost cannot work. |
| `NEXT_PUBLIC_STAFF_OAUTH_REDIRECT_ORIGIN` | (Optional) Override the origin used for `redirectTo` when testing staff OAuth on a host that is whitelisted in Supabase but differs from the browser tab (ignored when production-only mode applies on localhost). |

Many of these can also be set in **Settings** (Admin) in the app.

## OTP bypass (dev/support)

Entering the code **0000** at the OTP step logs the customer in without calling your verify API. Use for testing or support.

## Staff

- **Login:** `/staff/login` — **email + password** (`POST /api/staff/login`) or **Sign in with Google**. Users must exist in `auth.users` and have a row in `staff_roles` (role: `admin`, `csr`, or `store_manager`; `branch_id` required for store_manager). Email/password works on any host (including localhost); Google OAuth follows the same-origin / redirect URL rules described below.
- **Staff entry:** `/staff/login` (not `/login`). Customer portal uses `/` and OTP — separate from staff Google sign-in.
- **Production-only staff OAuth (recommended if localhost redirect URLs are painful):** Set **`NEXT_PUBLIC_STAFF_OAUTH_PRODUCTION_ONLY=true`** in `.env.local`. On localhost, `/staff/login` shows a button to open **`NEXT_PUBLIC_APP_URL/staff/login`**; complete Google sign-in there. In Supabase **Redirect URLs**, you only need your **production** (and preview, if you use them) app callback: `https://your-domain.com/auth/callback` — no localhost entry required for staff.
- **Local dev with localhost OAuth:** Supabase only redirects to URLs listed under **Redirect URLs**. The app sends `redirectTo = <origin>/auth/callback` (no query string); the post-login path (`/staff`) is stored in `sessionStorage` until `/auth/callback` runs. Set **`NEXT_PUBLIC_STAFF_OAUTH_REDIRECT_ORIGIN`** when your tab origin differs from what you whitelisted. On `/staff/login` (dev), the gray box shows the exact callback URL to add in Supabase.
- **Google OAuth setup:** In Supabase Dashboard → Authentication → Providers, enable Google and set Client ID + Client Secret (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)). Under Authentication → URL Configuration, add **Redirect URLs** that match `signInWithOAuth` `redirectTo` exactly for each host where staff will click “Google”: production `https://your-production-domain.com/auth/callback`, and (only if not using production-only mode) `http://localhost:3000/auth/callback` and any **Vercel preview** URLs you use for staff. If a URL is missing, Supabase may fall back to **Site URL** (often `/`) with `Unable to exchange external code` or wrong host after login.
- **PKCE:** OAuth code exchange runs in the **browser** on `/auth/callback` (so the PKCE verifier in local storage matches). The app then calls `POST /api/staff/oauth-session` to set the staff cookie.
- **`redirect_uri_mismatch` (400) from Google:** Google only accepts redirect URIs you list on the OAuth client. For Supabase, you must add **exactly**:
  - `https://<project-ref>.supabase.co/auth/v1/callback`
  - Use **`.supabase.co`** — not `.supabase.co.il` and not your app domain. A typo like `https://bocvfsrhhyxwjakbzdyy.supabase.co.il/auth/v1/callback` will always fail. Remove the bad entry in Google Cloud Console → APIs & Services → Credentials → your Web client → **Authorized redirect URIs**, and save the correct `.supabase.co` URL.
- **Optional:** Remove redirect URIs for old Supabase projects if you no longer use them, so you only whitelist the project tied to `NEXT_PUBLIC_SUPABASE_URL`.
- **Dashboard:** `/staff` — list return requests (filtered by branch for Store Manager).
- **Settings:** `/staff/settings` — Admin only; eligibility days, return reasons, shipping tiers, help banner, etc.

## Database

Run `supabase/migrations/20250226000000_initial_schema.sql` to create `app_settings`, `return_requests`, and `staff_roles`. Seed the first staff user and role in Supabase (Auth + `staff_roles` table).
