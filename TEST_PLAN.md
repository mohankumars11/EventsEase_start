# Sambramo — End-to-end test plan

> Written against the chrome-unification pass. Sections 1–3 are the regression
> suite for what that pass changed; sections 4–8 are the standing suite for the
> product as a whole.
>
> **There is no test runner in this repo.** Every check below is manual, and
> that is a deliberate statement of where the project is, not a plan to keep it
> there — see §9.

---

## 0. Setup

```bash
npm install
npm run dev            # http://localhost:5173
```

`npm run build` **crashes on this machine** — esbuild's Go binary overflows its
stack in the renamer and the npm wrapper still exits 0, so a "successful" build
locally proves nothing. Verify with the dev server. To check the whole app
compiles, request every module through Vite's transform pipeline; a syntax
error, a bad import or a missing file returns a 500 with an error body:

```bash
find src -type f \( -name '*.jsx' -o -name '*.js' \) | while read f; do
  curl -s "http://localhost:5173/$f" | head -c 600 \
    | grep -qiE "Transform failed|Failed to resolve import|SyntaxError" && echo "FAIL $f"
done
```
Expected: no output. (200 modules at time of writing.)

### Device matrix

| Class | Width | Why it is in the matrix |
|---|---|---|
| Small phone | **360 × 640** | The floor. Every app-bar row must fit: back + title + cart + avatar. |
| Notched phone | **390 × 844** | `pt-safe` / `pb-safe` — the only widths where safe-area insets are non-zero. |
| Large phone | **430 × 932** | Where a two-column grid starts to look sparse. |
| Tablet | **768 × 1024** | `md:` — the tab bar disappears here. Check nothing was only reachable from it. |
| Desktop | **1440 × 900** | `lg:` — the builder's sidebar, the admin tables. |

Test signed **out** and signed **in as a customer** on each; vendor and admin on
desktop only.

---

## 1. Chrome regression suite — the reported faults

Each row is a fault that was live. Walk the route on a **360px** viewport.

| # | Route | Must NOT be present | Must be present |
|---|---|---|---|
| 1.1 | `/services` | Second bottom tab bar under the real one; marigold sub-nav; marketing navbar; "Somewhere else?" city form; floating "Back" row | One plum app bar: back, title, cart, avatar. Search inside the bar. |
| 1.2 | `/shop/product/:id` | **Two** back controls stacked; marketing navbar; city banner; marketing footer | One forest app bar naming the product. |
| 1.3 | `/festivals/:id` | Marketing navbar; city banner; two back controls; marketing footer | One plum app bar naming the festival. |
| 1.4 | `/plan/build` | Marketing navbar; city banner; floating "Back" row above the hero's own back chip; marketing footer | The hero's contextual back ("Back to Birthday"). |
| 1.5 | `/dashboard/customer/orders` | Second bottom tab bar; navbar; city banner; floating "Back" | Plum app bar, "My orders". |
| 1.6 | `/dashboard/customer/requests` | as 1.5 | Plum app bar, "My requests". |
| 1.7 | `/dashboard/customer/events` | as 1.5 | Plum app bar, "My celebrations". |
| 1.8 | `/dashboard/customer/cart` | Second tab bar; **two** back controls | Plum app bar, "My cart", **no** cart icon in the bar. |
| 1.9 | `/dashboard/vendor`, `/dashboard/admin` | City banner ("notify me when you launch in my city" is not addressed to an operator); floating "Back" | Marketing navbar with the profile menu — these two roles have no tab bar. |

**1.10 — The doubled bottom strip.** On *any* screen in the table above, scroll
to the very bottom. The last element must sit directly above the tab bar. There
must be **no empty band** below it, and a screen whose content fits the viewport
must show **no scrollbar at all**. (Shell and page each reserved the tab bar's
strip; the reservation was paid twice.)

**1.11 — One cart, one city, one back.** On every route in the table, count:
exactly one cart affordance, at most one city control, exactly one back control.

---

## 2. The app bar itself

| # | Check | Expected |
|---|---|---|
| 2.1 | 360px, signed in, long title (`/shop/product/:id` for a long product name) | Title truncates with an ellipsis. Cart badge and avatar stay fully on screen. Nothing wraps to a second line. |
| 2.2 | Notched device, scroll down | Bar stays stuck to the top, its tinted area extends *into* the notch, no content renders under the inset. |
| 2.3 | Back from a **cold open** — paste `/shop/product/<id>` into a fresh tab, press back | Goes to `/shop` (the fallback), does **not** exit the site. |
| 2.4 | Back from a **warm** path — `/shop` → `Cakes` → a product, press back | Returns to **Cakes** with its filters intact, not to `/shop`. |
| 2.5 | Signed out | No avatar in the bar. Cart still present. |
| 2.6 | Signed in, open the avatar menu | Dashboard, My Celebrations, Services & packages, My Orders, My Requests, Sign out. *(This menu is now the only route to Orders and Requests — the navbar that used to carry them is gone.)* |
| 2.7 | Tone | Plum on `/services`, `/festivals/:id`, the four customer screens. Forest on `/shop/product/:id`. Cart badge is saffron on plum, chilli-red on forest. |

---

## 3. Festival page funnel

All six calls to action pointed at `/signup`. Signed **out**, on `/festivals/:id`:

| # | Control | Expected destination |
|---|---|---|
| 3.1 | Hero "Plan This *X*" | `/plan/custom?type=festival&festival=<id>` — the wizard, **not** a signup form |
| 3.2 | Package "Request a Quote" | same |
| 3.3 | "Request Custom Menu" | same |
| 3.4 | "Claim This Offer" | same |
| 3.5 | Service chips | `/services?festival=<id>` — catalogue, search pre-seeded |
| 3.6 | "Talk to an expert" | `tel:` — the phone dialer opens |
| 3.7 | Land on 3.1's destination | The wizard opens on step 1 with the festival already applied (it reads `?festival=`). |

**3.8 — Vertical rhythm.** At 360px, sections are ~40px apart, not ~64px. Every
section shares one left edge with the app bar's back arrow.

---

## 4. Core journeys

Run each end to end. A journey fails if any step needs the browser's own back button.

**4.1 Shop → delivery.** `/shop` → category → product → configure → cart →
address in a pilot city → UPI → order lands in `/dashboard/customer/orders`.
Check: cart badge increments in the bar at every step; the checkout shows
`CheckoutHeader`/`CheckoutFooter`, never the marketing chrome.

**4.2 Guest cart survives sign-in.** Signed out, add a product, go to
`/shop/cart`, sign in at checkout. The basket must still be there. *(Gating the
cart page itself is the classic way to lose a basket.)*

**4.3 Concierge.** `/plan` → `/plan/custom` → six steps → sign in at submit →
`/plan/confirmation` → the enquiry appears in `/dashboard/customer/requests`.
Login must be asked at **submit**, never at entry.

**4.4 Priced builder.** `/plan/build` → pick scale → build menu → décor →
watch the estimate move → review → send. On a phone the action bar must clear
both itself and the tab bar; the review board's last row must not sit under it.

**4.5 Occasion.** Home → an occasion card → `/services/:eventId` → tier →
services → send. Page must carry its own bar and `EventFooter`, never the
marketing footer.

**4.6 Single service.** `/service/:serviceId` → add to cart as a **guest** →
sign in at send. The cart icon must point at the basket the item actually went
into.

**4.7 City.** Open the city sheet from any bar → pick Mysore → prices and
delivery copy update → pick a non-pilot city → the control turns amber and says
we do not deliver there, *before* the address field.

---

## 5. Empty, loading and error states

Every list screen has three states; all three are part of the design.

| Screen | Loading | Empty | Check |
|---|---|---|---|
| My orders | 3 skeleton cards | 🛍️ + "Browse the shop" | Not the bare word "Loading…" left-aligned on an empty page |
| My requests | 3 skeletons | 📋 + "Browse occasions" | " |
| My celebrations | 3 skeletons | ✨ + "Plan My Celebration" → `/plan` | Button goes to the **planner**, not back to home |
| My cart | — | 🛒 + "Browse occasions" | " |
| `/services` search | — | "No occasion matches …" + "Show all" + "Tell us your plan" | Both escape hatches present |
| `/shop/product/<bad id>` | skeletons **with the bar** | 🔍 + "Back to the shop" | Bar present in both — a cold-opened bad link must not be a dead end |
| `/festivals/<bad id>` | — | 🪔 + "Browse occasions" | " |

**5.1** Force a crash inside a page (throw in a component). `ErrorBoundary`
must catch it, the rest of the app must stay usable, and navigating away must
clear it *(the boundary is keyed by pathname)*.

---

## 6. Accessibility

| # | Check |
|---|---|
| 6.1 | Every screen has exactly one `<h1>`. Where the app bar carries the title, the page's `h1` is `sr-only` — the bar is shared chrome, not the document's heading. |
| 6.2 | Tab order: bar controls → page content → tab bar. No focus trap in the city sheet or the customize sheet; Escape closes both. |
| 6.3 | Every icon-only control has an `aria-label` (back, cart, city, clear-search, avatar). |
| 6.4 | Cart announces its count: "Cart, 3 items". |
| 6.5 | Loading lists carry `aria-busy` and a label. |
| 6.6 | Contrast: white-on-plum and white-on-forest bars ≥ 4.5:1. The `text-white/50` subtitle is decorative — never put a fact only there. |
| 6.7 | `prefers-reduced-motion` — rotating search hints and auto-scrolling rails stop. |

---

## 7. Data and money

| # | Check |
|---|---|
| 7.1 | Prices show tax inclusion wherever a number appears. The builder's estimate says "incl. taxes". |
| 7.2 | Only pilot cities (Bengaluru, Mysore) are bookable; every other city routes to the waitlist. |
| 7.3 | `testPaymentProvider` is **absent from the production bundle**. Grep the built lazy chunks, not the main bundle. |
| 7.4 | With no `VITE_UPI_ID` in production, checkout shows the honest "unavailable, message us" hand-off — never a fake success button. |
| 7.5 | No invented social proof anywhere: no vendor counts, no years in business, no testimonials. Sambramo is pre-launch with no signed supplier. |
| 7.6 | Every claim in `EventFooter` is enforced in code (approval gate, refundable lock, pilot cities). If one stops being true, that file changes in the same commit. |

---

## 8. Deploy checks

| # | Check |
|---|---|
| 8.1 | **Apply any migration by hand in Supabase → SQL Editor _before_ pushing code that needs it.** `git push` does not run migrations. |
| 8.2 | After the Vercel deploy, re-run §1 against `https://sambramoh.vercel.app` on a real phone, not a desktop emulator — safe-area insets only exist on the device. |
| 8.3 | Deep-link every route directly (cold open, no history): each must render its bar and offer a way back. |
| 8.4 | Hard refresh on a nested route — `vercel.json` rewrites non-`/api` paths to `index.html`. |

---

## 9. Known gaps

Honest list. None of these are hidden.

- **No automated tests.** No runner, no test script. Everything above is manual.
  The highest-value first automation is §1 — the chrome table is nine routes ×
  three assertions and would be a short Playwright spec.
- **No visual regression harness.** Alignment faults of exactly the kind this
  pass fixed are what screenshot diffing catches and human review misses.
- **`npm run build` cannot be trusted locally** (§0). CI is Vercel's build only.
- **No error reporting.** `ErrorBoundary` prevents white screens but only logs
  to console — nobody is notified when a customer hits a crash.
- **`AdminEventDetail` (~1,300 lines) remains unaudited.**
