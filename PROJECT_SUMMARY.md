# Sambramo — Project Summary

> **Celebrations, arranged. Essentials, delivered.**
> A human-assisted concierge celebration service, plus a shop for the things
> you need today. Pilot launch: **Bengaluru & Mysore**.

---

## What this is

Two halves of one business, deliberately:

| | |
|---|---|
| **Concierge** | You describe a celebration. A real coordinator sources vendors, negotiates, and brings back one transparent proposal. Free to enquire; the fee is stated in the proposal. |
| **Shop** | Cakes, gifts, flowers, hampers, party and pooja essentials — ordered and delivered, no planning involved. |

**This is not a marketplace.** Customers never browse and pick vendors themselves;
that was the pre-pivot model and its pages have been removed.

---

## Stack

- **React 18 + Vite 5**, **Tailwind CSS 3**
- **Supabase** — Postgres, Auth (email OTP + Google OAuth), RLS
- **React Router 6** with per-route code splitting
- **recharts** — admin analytics only, lazy-loaded
- **Deploy:** Vercel, git-linked to `main`. `vercel.json` rewrites all non-`/api`
  paths to `index.html` for client-side routing.

---

## Routes

### Public
| Path | Page |
|---|---|
| `/` | Landing |
| `/login`, `/signup`, `/auth/callback` | Auth (email OTP, Google) |
| `/plan` | Plan hub — the two doors |
| `/plan/custom` | 6-step planning wizard |
| `/plan/confirmation` | Request submitted |
| `/services`, `/services/:eventId` | Public service & package catalog |
| `/shop`, `/shop/:category`, `/shop/product/:id`, `/shop/cart` | Shop (cart is public; sign-in is asked at checkout) |
| `/festivals/:id` | Festival detail |

### Customer (`role = customer`)
`/dashboard/customer` · `/events` · `/events/:eventId` · `/orders` · `/requests` · `/cart` · `/services`

### Vendor (`role = vendor`)
`/onboarding/vendor` · `/dashboard/vendor` — profile, service list, availability calendar

### Admin (`role = admin`)
`/dashboard/admin` — 12 operational views incl. sales analytics and Customer 360
`/dashboard/admin/events/:eventId`

### Redirects (kept so old links resolve)
`/dashboard/customer/browse` → `/services`
`/dashboard/customer/vendors/*` → `/services`
`/dashboard/customer/bookings` → `/dashboard/customer/events`
`/dashboard/customer/pooja-items` → `/shop/Pooja & Essentials`

---

## Brand strings — one source

All brand copy lives in **`src/config/sambramo.js`**. Nothing should be typed by hand.

| Field | Use |
|---|---|
| `BRAND.tagline` | Descriptor sentence — `<title>`, footer |
| `BRAND.taglineParts` | The same, as halves for the logo lockup |
| `BRAND.signature` / `signatureParts` | "Your Moment. Our Magic." — hero + auth panels |
| `BRAND.emotion` | Short caption for in-product chrome |
| `BRAND.descriptor` | The one-line "what is this?" |
| `CTA.*` | Button/nav labels, one per role |

**The halves are the source; the sentences are derived by `join()`** so the two
forms cannot drift. Four contradicting versions of the descriptor once existed
across the codebase — one of them still called the product a "marketplace".

`index.html` is the only exception: it ships before any JS, so its `<title>` and
`<meta description>` are copied verbatim and must be updated by hand.

---

## Cities

- `BRAND.pilotCities` — **`['Bengaluru', 'Mysore']`**. The only bookable cities.
  Every city picker and the delivery validator restrict to this list.
- `BRAND.servicedCities` — longer-term roadmap only. **Not a picker source.**
- Anyone outside the pilot gets a waitlist form writing to `city_interest_requests`.

---

## Payments

- **UPI direct** (`VITE_UPI_ID`) — deep links to GPay/PhonePe/Paytm plus a QR.
  No gateway callback exists, so orders sit `payment_status='pending'` until an
  admin confirms receipt in **Admin → Shop Orders**.
- **`testPaymentProvider` is hard-disabled outside dev builds.** It marks orders
  paid on a button press; it was previously reachable whenever `VITE_UPI_ID` was
  unset, which a missing env var on the host would have turned into free
  merchandise. Guarded by `import.meta.env.DEV` and constant-folded out of
  production bundles.
- Production with no payment configured shows an honest "unavailable, message us"
  hand-off — never a fake success button.

---

## Migrations

24 files in `supabase/migrations/`, applied **by hand** in
**Supabase Dashboard → SQL Editor**. There is no CI step and **`git push` does
not run them.**

> **Deploy order matters.** Apply the migration *before* pushing code that needs
> it. Shipping code against a missing table has already caused one closed funnel
> and nearly caused a checkout outage.

Migrations should be re-runnable. `CREATE TABLE` accepts `IF NOT EXISTS` but
`CREATE POLICY` does not — pair each policy with `DROP POLICY IF EXISTS`, or a
half-applied run strands every retry on error `42710`.

---

## Environment

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_UNSPLASH_ACCESS_KEY=   # optional; degrades to emoji tiles
VITE_UPI_ID=                # absent in prod ⇒ payments disabled, not faked
VITE_UPI_PAYEE_NAME=
```

---

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

---

## Known gaps

Honest list — none of these are hidden:

- **No tests.** No runner, no test script. Verification is builds, schema probes
  and bundle greps.
- **No error reporting.** `ErrorBoundary` prevents white screens but only logs to
  console — nobody is notified when a customer hits a crash.
- **Unsplash is rate-limited** to 24 live searches per page load (free tier is
  50/hour, shared site-wide). Beyond that, emoji fallbacks. Pre-resolved
  `products.image_url` values avoid this entirely.
- **Several pages remain unaudited**, notably `AdminEventDetail` (~1,300 lines).
