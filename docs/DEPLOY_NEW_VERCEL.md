# Deploying the customer app and API to the new Vercel account

Once this is live, the phones no longer need the laptop's API server on the same Wi-Fi.

**Account:** vercel.com/mohanias2022-3920 (created 31 Oct).
**Never** deploy to the old `sambramoh` project. This folder's `.vercel/project.json` still points there, so it must be relinked first.

## 1. Log in and link (once)

```
npx vercel login                      # sign in as the new account in the browser
rm -rf .vercel                        # forget the old sambramoh link
npx vercel link                       # choose "create a new project", e.g. sambramo-app
```

## 2. Environment variables

Add these in the project's **Settings → Environment Variables** (Production). Copy the values from your `.env`. Only the names are listed here.

| Name | Used for |
|---|---|
| `VITE_SUPABASE_URL` | database URL (app and API) |
| `VITE_SUPABASE_ANON_KEY` | public database key (app and API) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only database key (API) |
| `VITE_RAZORPAY_KEY_ID` | Razorpay key shown to the app |
| `RAZORPAY_KEY_ID` | Razorpay key used by the API |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (API) |
| `RAZORPAY_WEBHOOK_SECRET` | verifies Razorpay webhooks (test) |
| `RAZORPAY_WEBHOOK_SECRET_LIVE` | verifies Razorpay webhooks (live) |
| `RAZORPAY_ROUTE_CATEGORY`, `RAZORPAY_ROUTE_SUBCATEGORY` | partner payouts (Route) |
| `ROUTE_RELEASE_AFTER_HOURS` | when escrow is released to a partner |
| `FIREBASE_SERVICE_ACCOUNT` | push notifications |
| `CRON_SECRET` | protects the two daily cron jobs in vercel.json |

Do **not** set `VITE_SURFACE` on the web project. A hostname that is not a partner or admin host already opens the customer app (src/config/surface.js). Only the APK builds stamp a surface in.

These are optional and should stay **unset in production**: `MOCK_PAYMENTS`, `PAYMENT_TEST_CHARGE_PAISE`, `ALLOW_SYNTHETIC_DISPATCH`, `SYNTHETIC_DEMO_CUSTOMER`, `VERIFY_TRACE`.

## 3. Deploy

```
npx vercel --prod
```

The Hobby plan allows 12 serverless functions, and `api/` has exactly 12. A new endpoint must be folded into an existing one, for example `api/anchor.js?op=…`.

## 4. Point the APK at it

In `.env.android`, set `VITE_API_ORIGIN=https://<your-new-project>.vercel.app`. Then rebuild:

```
node scripts/build-native.mjs customer
cd android && ./gradlew assembleCustomerDebug --no-daemon --max-workers=1 -Dorg.gradle.jvmargs="-Xmx900m -XX:MaxMetaspaceSize=320m" -Dkotlin.compiler.execution.strategy=in-process
```

## 5. Razorpay webhook

In the Razorpay dashboard, point the webhook at `https://<your-new-project>.vercel.app/api/razorpay-webhook`. Use the same secret as `RAZORPAY_WEBHOOK_SECRET`.
