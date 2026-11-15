# Apply 209 — three corrections to 208

`supabase/migrations/209_package_fit_hardening.sql`. Applied 2026-11-03.
Changes no data; replaces `sambramo_package_fit` and pins a search_path.

1. **Phone and server disagreed on 10 anchors.** 10 of the 11 live Anchor & MC
   listings have `trade_id` NULL and carry the trade only by name. The app
   matched all 11 to "Host the Key Moments"; the server refused 10 of them as
   "wrong trade". The function now falls back to the registry id for the
   listing's trade name — the rule 206 uses for booking lines. No listing is
   edited. These are the only LIVE listings without a `trade_id` (10 of 345).
2. **A not-LIVE package could reveal its details.** The function went on past
   "not live" to compare hours and inclusions, so a gap could expose an
   unpublished package's duration to anyone with its id. It now answers
   "not live" and nothing else.
3. `sambramo_experience_tier_touch` gets a pinned `search_path`.

Proven by `check-experience-tiers-live.mjs` (25/25) and
`check-experience-e2e.mjs` (48/48 — all three anchor experiences now agree
partner by partner).
