# Deploying Sambramo to the new Vercel account

For: Mohan, setting up the project on vercel.com/mohanias2022-3920 (31 Oct 2026).
Values come from your own `.env` — this file lists **names only**.

## 1. The project

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Git repository | `mohankumars11/EventsEase_start` (root directory: leave as `/`) |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |
| Node.js version | 20.x |
| Production branch | `feature/customer-app-masters` |

The Hobby plan allows **12 serverless functions** per deployment; `api/` has
exactly 12 (`api/_lib` does not count). A 13th endpoint must be folded into
an existing one. Vercel's Hobby plan is for non-commercial use, so move to Pro
before the public launch.

## 2. Environment variables (Settings → Environment Variables → Production)

**Read by the app at build time.** Anything starting `VITE_` ends up in the
browser bundle, so never put a secret in a `VITE_` name.

| Name | What it is |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_FIREBASE_API_KEY` | Firebase web config, for push notifications |
| `VITE_FIREBASE_AUTH_DOMAIN` | 〃 |
| `VITE_FIREBASE_PROJECT_ID` | 〃 |
| `VITE_FIREBASE_SENDER_ID` | 〃 |
| `VITE_FIREBASE_APP_ID` | 〃 |
| `VITE_FIREBASE_VAPID_KEY` | 〃 (web push key) |
| `VITE_RSVP_ORIGIN` | `https://<your-new-domain>`, so guest RSVP links open the new site |
| `VITE_UPI_ID`, `VITE_UPI_PAYEE_NAME` | Optional |

**Server only** (the `api/` functions). These are secrets: tick only
"Production" (and "Preview" if you test previews), never expose them.

| Name | What it is |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |
| `RAZORPAY_KEY_ID` | Razorpay key id (live `rzp_live_…` for the real-card test) |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret (same mode as the id) |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you set on the webhook in step 3 |
| `FIREBASE_SERVICE_ACCOUNT` | The Firebase service-account JSON, pasted as one line |
| `CRON_SECRET` | Any new long random string — the database cron in step 3 must send the same one |
| `PAYMENT_TEST_CHARGE_PAISE` | `100` → every payment charges **₹1** (the live smoke test). **Delete it before launch.** |

**Do not set:** `MOCK_PAYMENTS`, `ALLOW_SYNTHETIC_DISPATCH`, `VERIFY_TRACE`,
`API_PORT` (local-only switches).

## 3. After the first deploy

1. **Razorpay → Webhooks:** `https://<new-domain>/api/razorpay-webhook`,
   events `payment.captured` and `refund.processed` (plus `transfer.*` if Route
   is on); the secret you choose
   there is `RAZORPAY_WEBHOOK_SECRET`.
2. **Supabase → Authentication → URL configuration:** add the new domain to
   Site URL / Redirect URLs (email OTP links).
3. **Supabase SQL editor:** paste migrations **196** (security) and **197**
   (request → accept → pay), then point the minute cron at the new domain:
   ```sql
   select cron.unschedule('sambramo-dispatch-waves');
   select cron.schedule('sambramo-dispatch-waves', '* * * * *', $job$
     select net.http_post(url := 'https://<new-domain>/api/dispatch-waves',
       headers := '{"content-type": "application/json", "authorization": "Bearer <CRON_SECRET>"}'::jsonb,
       body := '{"source": "pg_cron"}'::jsonb, timeout_milliseconds := 20000);
   $job$);
   ```
4. **APKs:** rebuild the customer and partner apps with
   `VITE_API_ORIGIN=https://<new-domain>` so phones stop needing the laptop.

## 4. The end-to-end test

Customer: sign in → plan → masters → **Send requests** → (partner accepts) →
My Bookings → **Pay ₹1** with the real card → confirmed.
Partner: Offers tab shows **"Request · only you have it"** with the countdown
→ Accept → job appears → (after payment) contact released.
Checks: `node --env-file=.env scripts/check-request-flow-live.mjs`,
`scripts/check-cancel-security-live.mjs`.
