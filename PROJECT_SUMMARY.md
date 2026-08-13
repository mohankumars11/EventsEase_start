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
- **Deploy:** Vercel, git-linked to `main`, served at
  **https://sambramoh.vercel.app**. `vercel.json` rewrites all non-`/api`
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
`/dashboard/admin` — 18 views in three groups (see below)
`/dashboard/admin/events/:eventId`

The admin console is one data load (`hooks/useAdminData`) shared by every view,
with every derived number defined once in `lib/analytics`. The sidebar groups
by what you came to do:

| Group | Views |
|---|---|
| **Understand** | Command Center · Activity Inbox · Product Intelligence · Area Demand · Order Lifecycle · Customers |
| **Work the queues** | New Requests · Under Review · Vendor Sourcing · Proposals · Confirmed · Upcoming · Shop Orders · Support |
| **What we sell** | Shop Catalog · Content Studio · Event Services · Dates · Vendors · Reviews |

Two definitions carry the whole console and are kept apart deliberately:
**demand** is every order line a customer placed (cancellations excluded), and
**revenue** is only `payment_status = 'paid'`. Direct UPI has no gateway
callback, so the gap between them is the admin's payment-confirmation backlog —
collapsing them into one number would make an unticked bank statement look like
a customer who never wanted the thing.

Chart colour is a system, not a preference: `config/dataviz.js` holds the one
palette, named by job (categorical / sequential / diverging / status), with the
validator run recorded in its header. Charts with axes live in the lazy
`components/admin/charts/ChartKit`; everything that is a shape beside a number
is hand-drawn SVG in `components/admin/viz/Primitives` and costs nothing.

**The order's own history.** `order_events` (migration 039) records every
status and payment transition via a trigger on `orders` — a trigger rather than
app code, because status is written from four places and an app-side log is one
forgotten call away from a history with holes. That is what makes "how long does
`processing` actually take" answerable at all: `orders` has only `updated_at`,
which is destroyed on the next move. Orders predating the log are marked
reconstructed and excluded from every median.

**Notifications are derived, not stored.** `lib/notifications` builds the admin
feed as a view over orders, returns, complaints, enquiries, events, reviews,
vendors and waitlist rows. There is no notifications table: a copy of something
that already happened gives you two ways to be wrong (a failed insert, or an
insert against a rolled-back transaction) and no way to tell which. The only
thing stored is whether a human has looked — `admin_notification_state`, with a
localStorage fallback.

**Policy lives in `config/policies.js`.** Return windows per shelf, the
cancellation ladder, refund methods and their real timelines, and the terms
themselves. Customer and admin read the same rules, and `POLICY_VERSION` is
stamped on every return request so changing the policy cannot silently rewrite
what past customers agreed to. Perishables are same-day with a photo and are
never collected back; the delivery fee comes back when the fault is ours and
does not when it is not — stated up front rather than discovered at refund time.

**The Content Studio** (migration 040) makes decor themes, decor levels,
cuisines, the eight celebration tiers, festivals and offers editable the way the
shop already was. One table with a `kind` discriminator rather than six tables;
kind-specific fields live in `payload` JSONB. Code stays the pricing authority —
each kind declares `engineOwns`, and the editor prints that warning inline
instead of offering a field whose edit the quote engine would ignore.

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

40 files in `supabase/migrations/`, applied **by hand** in
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
- **Migrations 037, 039 and 040 are not applied automatically.** Each screen
  that needs one says so and keeps working without it: Event Services and the
  Content Studio show the exact SQL file to run, Shop Catalog hides its Retire
  control, order timelines fall back to reconstructed stage times, stage
  durations say they need the log, and notification read state falls back to
  localStorage. Nothing crashes; several things are simply less complete.
- **Content added in the console is admin-side only so far.** Services, decor
  themes, cuisines, tiers, festivals and offers can all be added, photographed,
  reordered and retired — but the customer-facing planner still renders from
  `src/data/*.js`, which is where the quote engine reads `unit`, `base`,
  `scales`, guest ranges and menu allowances. Routing the DB catalogue through
  the quote engine and the planner is the next change, and it is a large one:
  it touches the builder, the tier ladder and every cart total.
- **Two home rails ignore `is_active`.** `ShopPicksRail` and the HomeScreen
  strip select an explicit column list rather than `*`, so they cannot filter on
  a column that may not exist yet. A retired product can still surface there.
  Fix by adding `is_active` to those selects once 037 is applied everywhere.
