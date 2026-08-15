# Sambramo — Setup Guide

## Prerequisites

1. **Node.js 18+** — download from https://nodejs.org  
2. **A Supabase project** — create one free at https://supabase.com

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Set up Supabase

### a) Create a project at supabase.com

### b) Run the database migration

Open **Supabase Dashboard → SQL Editor**, paste the contents of  
`supabase/migrations/001_initial_schema.sql` and click **Run**.

This creates all tables, RLS policies, seeds event & service categories,
and adds an auto-profile trigger.

### c) Create your `.env` file

```bash
cp .env.example .env
```

Fill in your values from **Supabase Dashboard → Project Settings → API**:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### d) Allowlist the auth redirect URLs

Email OTP and Google sign-in both redirect back to `window.location.origin`
(see `src/context/AuthContext.jsx`) — Supabase rejects any origin it has not
been told about. In **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** `https://sambramoh.vercel.app`
- **Redirect URLs:** add both
  - `https://sambramoh.vercel.app/**`
  - `http://localhost:5173/**` (for local dev)

Google's own OAuth console keeps pointing at
`https://<project>.supabase.co/auth/v1/callback` — that one does *not* change
with the app's domain.

### e) Razorpay — only for staged celebration payments

Optional. Without it the milestone endpoints return an honest `503` and the
whole app stays on the UPI-deep-link model, where an admin confirms each
payment against the bank by hand. Nothing breaks and nothing fakes a success.

**Where each value comes from**

| Variable | Where |
|---|---|
| `RAZORPAY_KEY_ID` | Dashboard → Settings → API Keys → Generate Key |
| `VITE_RAZORPAY_KEY_ID` | the same value — the browser's copy |
| `RAZORPAY_KEY_SECRET` | shown **once**, at the moment you generate the key |
| `RAZORPAY_WEBHOOK_SECRET` | you invent it (any long random string) and paste the same value into the webhook below |

**Test keys work immediately.** Live keys need completed KYC — PAN, bank
account, address proof, and GSTIN if you are registered — but the entire flow
can be wired and exercised in test mode before that lands.

**Register the webhook** at Dashboard → Settings → Webhooks → Add New Webhook:

- **URL** — `https://sambramoh.vercel.app/api/razorpay-webhook`
- **Secret** — the same string as `RAZORPAY_WEBHOOK_SECRET`
- **Events** — `payment.captured` and `refund.processed`

The webhook is not optional once payments are live. `verify-razorpay-payment`
runs from the browser's success callback, so a customer who pays and closes
the tab leaves a captured payment this app never hears about — charged, with
the database believing otherwise. The webhook is what makes the record
eventually correct regardless of what the browser did.

Set all of these in **Vercel → Project → Settings → Environment Variables**,
then redeploy: environment changes do not apply to an already-built deployment.

> ⚠ **Never put a `VITE_` prefix on either secret.** Anything `VITE_`-prefixed
> is inlined into the JavaScript every visitor downloads. The key *id* is
> publishable and is meant to be public; the secret and the webhook secret are
> not, and leaking either lets somebody forge payments.

**One commercial decision before going live:** Razorpay's MDR on cards and
netbanking (~2% + GST) is larger than `PLATFORM_FEE_RATE` (2%, in
`src/data/celebrationTiers.js`). On a ₹1,00,000 celebration that is roughly
₹2,360 of fees against ₹2,000 of platform margin — the gateway would eat the
whole fee and more. UPI collected through a gateway is typically zero-MDR, so
restrict milestone collection to UPI methods, or reprice the platform fee.

---

## 3. Run the dev server

```bash
npm run dev
```

Open http://localhost:5173

---

## 4. Make someone an admin

After a user signs up, run this in **Supabase SQL Editor**:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@yourdomain.com';
```

---

## 5. Build for production

```bash
npm run build
```

The output is in `dist/` — deploy to Vercel, Netlify, or any static host.

Production is served from **https://sambramoh.vercel.app** (Vercel project
`sambramoh`, git-linked to `main`). If you rename the Vercel project, the
default domain changes with it — update the Supabase redirect allowlist in
step 2(d) at the same time, or sign-in breaks on the new domain.

---

## PWA icons

Add two PNG icons to `public/icons/`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

The app is installable as a PWA once served over HTTPS.
