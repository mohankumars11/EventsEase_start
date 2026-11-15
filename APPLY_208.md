# Apply 208 — experience tiers

`supabase/migrations/208_experience_tiers.sql` — paste into **Supabase → SQL
Editor**, run, then:

```
node --env-file=.env scripts/check-experience-tiers-live.mjs
node --env-file=.env scripts/apply-requirement-templates.mjs --apply   # adds the $tier answer to 8 trades' templates
node --env-file=.env scripts/check-requirement-templates-live.mjs
```

The check runs the **real booking endpoint** in preview (nothing written),
and writes only one inactive fixture row, which it deletes.

## The problem it fixes

Every partner package came from Sambramo's template, where tiers are
**relative to each partner**: Essential = their minimum hours, Signature =
twice that, VIP = their maximum. The engine then picks a package by that
label alone. On your live data:

- **10 of 11 photographers can deliver "Important Moments" (≥ 2 h) only
  through a package not named Essential** — their Essential is 1 hour.
  Matching by label would have sold a 1-hour package as "Important Moments".

## What it adds

- **`sambramo_experience_tiers`** — 24 experiences across 8 trades, using the
  brief's names (Important Moments / Complete Story / Cinematic Experience…).
  Admin-editable; an edit is a new version.
- **`sambramo_package_fit(package, trade, tier, hours)`** — judged on the
  package's **real hours and inclusions, never its label**, returning the
  gaps ("2 h of the 4 h you chose", "no printed album").

## ⚠ Defaults for you to confirm

Minimum hours are mine, chosen for real events, not to fit the test data:

| Trade | Essential | Signature | VIP |
|---|---|---|---|
| Photography | 2 h | 4 h | 6 h + printed album |
| Videography | 2 h | 4 h | 6 h |
| DJ | 2 h | 3 h | 4 h |
| Anchor | 2 h | 4 h | 6 h + custom script |
| Live entertainment / Makeup / Mehendi | 1 h | 2 h | 3 h |
| Décor | intent only — the decorator quotes | | |

**Eligibility on live data (measured after applying, 2026-11-03)** — a
partner delivers an experience through a package that meets it, or — only
when nothing must be included — through their own hourly rate covering the
hours. `scripts/check-experience-e2e.mjs` prints the full table; in short:
photography Important Moments 11/11 (all by package), Complete Story 11/11
(1 package, 10 hourly), **Cinematic Experience 0/11** (no package has 6 h +
album, and a rate cannot promise an album); anchor Signature Host 1/11. The
earlier "1 of 11" figure counted packages only and understated it.

Copy promises **only what is checked** — hours and named inclusions. Packages
carry no team size, edited-photo count or equipment, so no experience claims
those. To say more, the Pricing Studio has to capture them first.

## What changed in the app

- **Service sheet:** "Choose the experience" for the 8 trades. Optional.
  Choosing one lifts the hours to its minimum (never lowers them); photography
  hour chips below it are hidden.
- **Matching (`quote.js`):** only a package that delivers the experience can be
  the quote. A partner with none **drops out** — never quoted for something
  shorter. An hourly rate cannot deliver an experience that requires an
  inclusion.
- **Server (`anchorBook.js`):** before pricing or booking, refuses
  (`NOT_QUALIFIED`) if the package it priced is not the one shown, or does not
  deliver the experience. **Backups are held to the same experience**; one that
  fails is dropped, so a hop never lands on something shorter. The verdict and
  the experience's version are frozen in `pricing_snapshot`.
- **Partner brief:** "Experience: Complete Story (at least 4 h)" leads.
- **Checkout:** a `NOT_QUALIFIED` line shows its reason instead of vanishing.

**Unchanged when no experience is chosen** — verified on the live endpoint:
same path, same package, same price.

## Also fixed: the photography hours bug

The photography sheet stored `"4 hours"`, and `Number("4 hours")` is `NaN`:
the customer's chosen coverage **never reached the price**, while the
partner's brief still said "Coverage: 6 hours". Hours are now parsed
(`hoursOf`: "4 hours" → 4, "Full day" → 8) and stored as numbers. The summary
chip no longer reads "4 hours hours".

## Corrected by 209

See `APPLY_209.md`: the fit function now falls back to the trade name (10
anchor listings have no `trade_id`) and reveals nothing about a package that
is not LIVE.

## Not done yet

- Partners with no qualifying package are dropped rather than shown as a
  **labelled alternative with a custom quote** — the brief's preferred
  behaviour. Needs a section on the live-match screen.
- Restaurant, venue, planner: later items.
