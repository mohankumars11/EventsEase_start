# Admin Command Center — technical handover

Required by section 22 of the build brief.

## 1. Repository and branch

`feature/admin-partner-customer-lifecycle`

| | |
|---|---|
| Starting commit | `21db2e2` |
| Latest at time of writing | see `git log` — the work spans `3e7ee03` … onward |

Nothing was deployed. No Vercel, no hosting provider.

## 2. Modules implemented

| Nav | Component | What it reads |
|---|---|---|
| Partner directory | `PartnerDirectory.jsx` | `vendors`, server-side filters, saved views, column picker, CSV |
| Onboarding review | `OnboardingReview.jsx` | typed profile table + `vendor_services.specs` fallback |
| Trade workspaces | `TradeWorkspaces.jsx` | `partner_<trade>_profiles` for 33 trades |
| Media library | `MediaLibrary.jsx` | `partner_work`, `vendor_documents`, `vendor_photos` |
| Payments & revenue | `RevenueConsole.jsx` | `booking_lines`, `escrow_ledger`, `payout_claims` |
| Bookings & orders | `OrdersConsole.jsx` | `booking_lines` lifecycle timestamps |
| Partner 360 registry | `PartnerConsole.jsx` (existing) | now opens full-workspace, not a 512px drawer |

## 3. Trade-specific tables

57 created by migrations **173–178**, all applied and verified:

- 33 `partner_<trade>_profiles` — one per trade with spec questions
- 24 `partner_<trade>_items` — the repeating catalogue sub-forms
- `anchor_mc` excluded: it predates the engine and runs `legacyFlow`

## 4. Mapping coverage

**490 of 490 fields** have a typed column. Verified by
`scripts/check-trade-profile-schema.mjs`, which walks the generated field map and
fails on any gap. Proved capable of failing by injecting a column that does not
exist.

Source of truth is `src/data/trades/*.js`. Everything downstream is generated:

```
src/data/trades/*.js
  → scripts/build-onboarding-field-map.mjs → docs/partner-onboarding-field-map.{md,json}
  → scripts/build-trade-profile-schema.mjs → migrations 173-178 + src/config/tradeProfileSchema.js
```

Regenerate after any spec change. Do not hand-edit the SQL or the runtime config.

## 5. Migration and backfill results

Schema: applied, 57 tables, 490 columns, 0 missing, 0 type mismatches.

Backfill: **not run, deliberately.** Dry run recovered ~7% — 35 of roughly 481
stored keys. The stored answers come from an older questionnaire (`catering:fssai`,
`cooks:team`, `ops:serving:servers_per_100`); 158 distinct keys have no column.

Decision (Mohan, 2026-10-19): leave it. Legacy and synthetic rows are deleted at
launch and the marketplace starts fresh. Until then every screen reads typed
columns **and** falls back to `specs`, labelled as the old format.

`vendor_services.specs` has not been modified by anything in this work.

## 6. Security

`scripts/check-admin-rls.mjs` queries the database with the **anon** key:

- 12 operator-only tables return nothing to anon
- `caller_is_operator()` is not callable by anon — permission denied
- a row planted with the service key is **invisible** to anon

That last check is the one that matters. Most of these tables are empty, and an
empty table returns nothing to everybody, so without a planted row the result
would have been an accident of there being no data.

## 7. What is NOT built

Stated plainly rather than implied by a nav item:

- **Custom inquiries and SLA** (§13) — no screen
- **Admin-created / proxy orders** (§12) — no screen
- **Pricing & packages editing** (§11) — existing `PricingReviewQueue` only
- **Notifications, roles & audit UI, settings** (§5 items 13–15) — no screens
- **Executive analytics** (§6, §7) — existing `ExecutiveOverview` only; not rebuilt
- **Bulk actions, reviewer assignment** (§7.1) — not implemented

No placeholder pages were added to inflate the navigation.

## 8. The honest limit on everything above

Every screen is verified against fixtures, not production rows, because production
has almost no rows:

| Table | Rows |
|---|---|
| `vendors` | 229, of which **221 synthetic** |
| `vendor_services` with answers | 22, all legacy format |
| `partner_<trade>_profiles` | **0** |
| `bookings` | 0 |
| `booking_lines` | 2, both cancelled |
| `escrow_ledger` | 0 |
| `payout_claims` | 0 |

So the typed tables, the onboarding review, the trade workspaces and every money
figure are structurally correct and empty. **One real partner submission in any of
the 33 trades exercises the whole chain** — typed columns, review screen,
completeness maths, approve action — and is worth more than any further UI work.

## 9. Running it

```
npm run build          # the deploy gate; runs the API-bundle staleness check
npx vite --host 0.0.0.0 --port 5173
```

Then `http://127.0.0.1:5173/dashboard/admin`, signed in as an operator.

Checks:

```
node scripts/check-trade-profile-schema.mjs   # 490 columns present
node scripts/check-admin-rls.mjs              # anon sees nothing it should not
node scripts/backfill-trade-profiles.mjs      # dry run; reports what it cannot place
```

## 10. Manual steps outstanding

None. Migrations 173–178 are applied. Everything since is application code.
