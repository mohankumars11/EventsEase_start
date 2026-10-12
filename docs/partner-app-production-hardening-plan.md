# Partner app production hardening — status

Branch `feature/partner-app-production-ready-procurement`, cut from
`feature/partner-34-trade-onboarding-ready-20261010` @ `3cd117e`.

This is a live checklist, not a report. It says what is done, what is not, and what is
blocked on somebody other than the code.

---

## Premises in the brief that turned out to be wrong

Worth stating first, because several of the brief's instructions were written against them.

| Brief says | Actually |
|---|---|
| React Native | **React 18 + Vite 5** in a Capacitor 8 wrapper. No `react-native` dependency. Every fix is CSS/DOM, not an RN modal layer. |
| advance is 30/50/**80**% | `ADVANCE` was **30/50/100**, and `advance_pct` is a **server-required** key validated by applied SQL and read by all three resolvers. |
| don't expose the 8% | `sambramo_trade_fee` is **granted to `anon`** and returns `0.0800` to the anon key. Probed live. Hiding labels is not enforcement. |
| migrations 144–150 pending | `verification_policy`, `verification_cases`, `partner_consents` all **exist** on the live DB. |

---

## Done

### Safe areas and sheets
- `index.html` had no `viewport-fit=cover`, so **every `env(safe-area-inset-*)` resolved to 0**. That
  single omission is the root cause of most clipping in the reported screenshots. Added, with
  `interactive-widget=resizes-content` so the Android keyboard shrinks the viewport.
- Shared `<Sheet>` (`anchor/ui.jsx`, ~10 call sites incl. the catering dish editor): `88vh` → `88dvh`,
  scroller gains `min-h-0 flex-1 overscroll-contain`, plus an optional pinned `footer` so the one
  action a sheet exists to perform cannot sit several swipes past the last field.
- `VendorDashboard` paid the bottom gap that `PartnerAppShell` already pays — ~144px of dead strip on
  every tab, plus twice the gesture inset once insets started resolving.

### Calendar (§7)
- `AvailabilityRangeSheet`, `DayDetailSheet`, `RecurringAvailability` had **no scroll lock, no Escape,
  no `overscroll-contain`** — the reported bug. New `useSheetLock` hook, once, rather than a fourth
  copy of an effect `CitySheet` and `PairingSheet` each already had. It restores the body's *previous*
  overflow, so stacked sheets don't unlock the page on the way out.
- `DayDetailSheet` is `lg:static` — an inline panel at desktop width — so its lock follows the same
  breakpoint its styles do.
- Backdrops were `z-40`, exactly `PartnerBottomNav`'s, which mounts later and so **painted above the
  dimmer**. Now `z-90/91`.

### Packages (§8.2) — the visible one
One card system, four implementations collapsed into it:

| Surface | Before | After |
|---|---|---|
| Onboarding, Anchor | Embla carousel, tier icons, pencil | the shared `PackageCarousel` |
| Onboarding, 32 trades | a plainer inline-editable stack | same carousel + an edit sheet |
| Pricing tab, Anchor | a 4th hand-rolled snap row | same carousel |
| **Pricing tab, 32 trades** | **`<Line k={name} v={price}/>` — a flat text list** | same carousel, with status chips |

- Tier vocabulary settled; catering's `PREMIUM` is an **alias** of VIP, not a rename — it is already
  stored in submitted listings.
- `suggestPackages()` returned **no inclusions at all** and gave Signature and VIP **the same hours**,
  so for 32 trades the three tiers were one offer at three prices. Now each takes a widening slice of
  the partner's own add-ons, VIP gets real extra time, all marked `generated` for review.
- Anchor's `TIER_DEFAULTS.ESSENTIAL = []` is correct but rendered a card with a price and nothing
  under it. Every tier now names its core deliverable on an always-ticked first line.

### Pricing confidentiality (§5)
- "Customer pays" / "Customer price · you receive" removed from the anchor pricing, extras and profile
  steps, all three catering editors, `PricingRulesEditor`, `PricingTab`, and `TradePricing`'s rules,
  catalogue, add-ons and charges. The headline figure on every partner screen is **the partner's own
  rate**, labelled "Your rate".
- `TradePricing` **derived the fee rate itself** — off `calculation_snapshot`, and by dividing
  take-home by customer price when that was absent — purely to print those totals. Deleted: a rate a
  screen never computes is a rate it cannot leak.
- `instantPricing` rendered `note: ${feeRate*100}%`, putting **"8%" on the partner's own earnings
  sheet**. Note gone, line renamed "Platform & coordination fee". The *amount* stays — a deduction a
  partner cannot see would be worse.

### Advance (§4.1)
- The 30/50/100 segment is gone from all three onboarding steps. `PLATFORM_ADVANCE_PCT = 100` is
  written by all three payload builders: the customer pays in full at booking, money stays on the
  existing completion-based release path, **no partner is paid earlier**.
- The *key* stays in `booking_rules` — removing it is a change to applied SQL and three resolvers.
  Removing the *choice* is not, which is why only the choice went.

### Customer preview (§8.4)
- Only Anchor had a real one. The other 33 had an `<a href>` that full-page-reloads the WebView onto
  the live customer route, gated on `d.live` so a draft had **no preview at all**.
- `TradeListingCard` is the analogue of `AnchorProfileCard`, fed by `listing_public()` — verified
  leak-safe: the SQL strips private keys by regex and emits `customer_paise` only.
- `20261012_01` adds `listing_preview()`: the same projection over the version the **owner** should
  see, null to anyone else. `listing_public` is deliberately **not** widened — a customer-facing
  function that sometimes returns a draft is one `or` away from showing a draft to a customer.

### Procurement (§4) — schema and money path
Seven migrations, `20261012_02` … `_08`. All parse clean including PL/pgSQL bodies (libpg-query).

**Materials money never touches `escrow_ledger`.** Four breakages if it did, each checked in the code
it would break — the decisive one being `routeRelease.js:74-78`, which computes
`platformPaise = held − partner`, so any hold without a matching transfer is booked as
`RELEASE_PLATFORM`: the customer's flower money would silently become platform commission in every
report. So: a parallel `procurement_ledger` with escrow's guarantees copied — append-only trigger,
and a `DEFERRABLE` constraint trigger making "cannot overspend materials" a constraint, not a hope.

**Nothing is armed.** All 34 policy rows seed `status='draft'`, so the engine answers
`no_procurement_policy` and escalates. `route_supplier_enabled` is `false` and a trigger forces every
non-manual supplier payment to `blocked_no_rail`.

`check-materials-no-partner-advance.mjs` — **24/24**, and verified to fail when the violating call is
injected. It asserts an *absence* (a call not made), which is exactly what a future edit restores
without noticing.

### Jobs tab (§10, partial)
- `SubmittedCard` and `ReviewCountdown` both rendered on submit — two cards saying "we are reading it",
  stacked. One card now.
- **There is no header status pill and there never was.** Two comments claimed the clock lived in one;
  `JobsHeader` destructured `reviewDueAt`/`reviewSubmittedAt`/`lifecycle` and rendered none. Props and
  claims removed.
- "Accepted" and "Confirmed" tiles opened the **Calendar**, a month grid showing neither list, while
  `MyJobs` sits on the same tab below. Both now scroll to it.

### Guards that were testing deleted architecture
Four were red before any of this work and are now green or corrected:
- `check-tabs-render` required `[data-add-item-flow]` on a tap. `3cd117e` replaced the inline picker
  with routing, so it had been failing every run. It now asserts the destination — and the marker is
  on all three flows, so the render guards finally cover the two that serve all 34 trades.
- `check-calendar-range` hardcoded `MAX_DAYS_OPENING = 19\d` (six months) and went red when
  `CALENDAR_HORIZON_MONTHS` became 12. Now derived from the config, so moving the horizon moves the
  guard.
- `check-partner-alignment` read the bottom padding off the wrong file, required a header clock that
  never existed, and required `px-4` on the `<header>` tag when the padding is deliberately on the
  inner div. **21/21**, green for the first time.

### Two real defects found while verifying
- `AddItemFlow` returned `null` while the engine probe was in flight, so **tapping a trade showed a
  blank screen** — the one thing that screen exists to do.
- The probe had **no timeout**, so a request that never settled left that state forever. A hanging
  request is routine in a WebView on mobile data.

---

## Not done

| § | Item | Note |
|---|---|---|
| 4 | Procurement **RPCs** — quote send/approve/revise, supplier order place/receive, claim submit/review, quote expiry cron | Schema and engine exist; the operator/customer verbs do not |
| 4 | Procurement **UI** — partner materials list, customer approval screen | |
| 6.3 | **Duplicate-question audit** across all 34 forms | Confirmed: capacity across **11 ids**, hours across **14**, service area in **4 incompatible shapes**. `payload.js:68-69` normalises only a third of the capacity ids |
| 6.2 | Anchor onto the declarative layer | It is still the only trade with `screens: []` and `legacyFlow: 'anchor'` |
| 6.4 | Completion derived from persisted state | `ListingOnboardingFlow.jsx:142,144` still counts `compliance` and `payout` done once merely **seen** — a partner can submit with no licence and no payout account |
| 8.1 | Hide/Unpublish/Delete moved into Pricing | Still only on `?tab=list` |
| 10.2 | Lifecycle / readiness card | `listing_readiness()` already returns the 9 items and the state ladder to drive it |
| 10.3 | Event-day map card | `LiveTracking` + `RouteMap` exist and are reusable |
| 11 | **More tab** — remove duplicate listing management, build the settings hub | |
| 16 | Selenium suites, live e2e | Not re-run on this branch |

### Known-stale, deliberately left
- `check-onboarding-steps` **17/32** — tests the five-step model `3cd117e` deleted.
- `check-onboarding-walk` — imports `src/pages/onboarding/VendorOnboarding`, deleted at `b4f1666`.
- `check-one-partner-ui` **23/25** — asserts 4 tabs; there are 5 (Pricing was added).
- `check-undefined-components` — 9 refs, all pre-existing, mostly dynamic `<Icon>` variables.

### Divergent trade lists — a real gap
Canonical registry **34**, `VENDOR_CATEGORIES` **43**, `TradeChampion` renders **26** from a separate
`PARTNER_TRADES`. So **8 trades cannot be referred at all**. Seven user-facing strings still say
"26 trades". They were deliberately **not** changed to "34" — doing so while the list still renders 26
would make the copy lie. Fix the list, then the copy.

---

## Blocked on somebody else

1. **Razorpay Route third-party supplier payments.** Whether Route can address a supplier who is not a
   linked account, in Sambramo's configuration, is unanswerable from this repo. Built so the answer
   flips one boolean (`procurement_rails.route_supplier_enabled`), which requires a named human and a
   written confirmation. Manual bank transfer with a typed UTR ships meanwhile. **No
   `supplierPayouts.js` stub exists** — a stub that "works later" is what gets switched on by accident.
2. **Legal text.** No privacy policy exists anywhere in the codebase; `legal.js` `ENTITY` and
   `GRIEVANCE` are null TODOs — no legal name, CIN, GSTIN, registered address or named grievance
   officer. `PartnerAccount.jsx:443-454` says this is deliberate, not an oversight. Procurement terms
   need counsel before production use.
3. **The 34-trade procurement classification.** A proposal derived from real questionnaire keys. Which
   trades commonly procure is a business judgement. Seeded all-`draft` so the engine says
   `no_procurement_policy` until signed off.
4. **Identity verification is classification, not verification.** `api/verify-document.js:20-38` is
   explicit: "Nothing here contacts UIDAI, NSDL, GSTN or Parivahan." No "government verified" claim
   has been added.
5. **Every migration is inert until pasted by hand.** `20261012_01` … `_08`, in that order.

---

## Verification actually run

`npm run build` (not `vite build` — the former runs the API-bundle staleness gate) green at every
commit. 13 check scripts pass:

```
check-trade-configs              3968/3968
check-trade-payloads              424/424
check-flow-renders                all 34 trades open
check-tabs-render                 every tab mounts
check-calendar-range               49/49
check-calendar-alerts              59/59
check-calendar-coverage            40/40
check-availability-rules           42/42
check-partner-alignment            21/21
check-materials-no-partner-advance 24/24
check-earnings-math                50/50
check-partner-input-rules         162/162
check-api-syntax                   28 files
```

All 8 `20261012_*` migrations parse clean, PL/pgSQL bodies included, via `libpg-query`.

**Not executed:** Selenium suites, live e2e (`e2e-all-trades-booking`, `e2e-catering-live`), and any
Android build. No APK was produced on this branch, so none is claimed.
