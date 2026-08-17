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
`/dashboard/admin` — 17 screens in six groups (see below)
`/dashboard/admin/events/:eventId`

The admin console is one data load (`hooks/useAdminData`) shared by every
screen, with every derived number defined once in `lib/analytics`. The frame is
`components/admin/AdminShell`; the information architecture is data, in
`config/adminNav`, so the sidebar, the ⌘K palette and the page header cannot
drift.

**Grouped by subject, not by verb.** The rule is that a question should be
answerable without leaving its group:

| Group | Screens |
|---|---|
| **Overview** | Command Center · Activity Inbox |
| **Events** | Event Requests · Enquiries & Quotes · Event Services · Dates & Demand |
| **Orders** | All Orders · Order Lifecycle · Returns & Refunds |
| **Catalogue** | Shop Products · Content Studio |
| **People** | Customers · Complaints · Reviews · Partners |
| **Insight** | Product Intelligence · Area Demand |

Two earlier IA mistakes are worth not repeating. Six of the eighteen slots were
the same events table under six `status` filters — a filter wearing a nav
item's clothes; they are now tabs on one Event Requests screen. And "Support"
grouped returns, complaints and enquiries because they share a shape ("somebody
wrote in") rather than a subject — a return is an order problem, a complaint is
a person problem, an enquiry is an unpriced event, and each now sits with its
own kind.

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

### A celebration is settled in ONE payment

`config/celebrationPayments.js` used to offer four instalment plans (25%×4,
50%×2, 75%+25%, in full) with work released at 25%, 50% and 100% of the money.
It now offers a single settlement of the confirmed quote, and the reasoning is
operational rather than aesthetic:

- **A part-paid celebration is a part-booked celebration.** Three days out with
  half the money, the business either fronts the unfunded half or tells a
  family their décor was never ordered. There is no third position.
- **Every instalment is a due date that can be missed** — a reminder to send, a
  reconciliation to do, and a conversation about money in the week of a wedding.
- **It made the price ambiguous** at the one moment it must not be. "₹18,750
  due" makes the customer work out what the celebration actually costs.

The milestone id stays `pay-100`, because `event_payments.milestone_id` already
holds that value for anybody who paid in full under the old config. `pay-25` /
`pay-50` / `pay-75` are **read as credit and never issued** —
`scripts/check-payment-schedule.mjs` asserts that a customer who paid an
instalment under the old ladder is never charged for it again, which is the
single most expensive thing this change could have got wrong.

The ₹1,000 date hold survives. It is not a part payment of the quote: it is a
pre-quote, refundable hold that comes off the one payment.

`api/create-milestone-payment.js` carries a second copy of these rules (a Vercel
function cannot import from `src/`), and the checker fails if the two drift.

### The payment link sits beside the quoted price

`lib/celebrationPayment.js` opens the Razorpay checkout. It exists because the
old ladder POSTed to the endpoint, got a real order back, and then dispatched a
`sambramo:milestone-payment` window event **that nothing listened for** — so
the button opened no checkout at all. Every piece was present and the path was
dead.

The button is offered twice on one screen, through one code path: beside the
confirmed total on the plan (where somebody is looking at the number they are
agreeing to) and in the settlement panel below it. Neither marks a payment
received — `api/razorpay-webhook.js` is the only witness, and the browser
callback records a CLAIM at most.

---

## Track

`/track` is the customer's whole relationship with us, and the tab is
**permanent** — it never changes identity, because navigation that rearranges
itself breaks the one thing a tab bar is for.

**Locked, not empty.** With nothing ordered, the tab renders grey with a lock
pip and announces "unlocks once you place an event order with us"; the screen
behind it shows the real six-step instrument, greyed, rather than an apology
for being empty. Those are the same message and had to agree.

**Every service, with its own ticks.** `lib/serviceLedger.js` gives each service
on a celebration six steps — asked for, sourcing, on your price, paid for,
booked, delivered — so a wedding reads as eleven bookings rather than one
progress word. A package (the complete wedding package, say) expands into the
services it contains through `tierServicesFor`, the same function that priced
it.

**A green tick is a claim about the real world**, and every one traces to a row
somebody wrote: `event_services` and `event_proposal_items` per line for wizard
events, `quoted_price` all-or-nothing for enquiries (which carry one number
over the whole list, and say so), `event_payments` for funding, and migration
045's log for confirmation. A step with no record stays grey. Nothing is
inferred from elapsed time or from a neighbouring service.

**After payment**, `PaymentReceipt` lists every step on record with its
timestamp and states what happens next — written as what we are doing, never as
a tick, because a tick that runs ahead of the work devalues the ones above it.

**Afterwards**, ratings are captured per service plus one for Sambramo's own
coordination, on the screen the customer already has open. That feeds the
supplier signal `event_vendor_options.quality_rating` was built for and nothing
was filling.

---

## Migrations

50 files in `supabase/migrations/`, applied **by hand** in
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
- **Migration 050 (reviews on celebrations) is not applied automatically.** A
  review written from Track is saved either way — `lib/celebrationReviews.js`
  catches the missing column and retries without it — but until the SQL is
  pasted it is not linked to the celebration it came from, and the panel says
  so on screen rather than hiding it.
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
