# Apply 203 — requirement templates

`supabase/migrations/203_requirement_templates.sql`. **Apply 202 first.**

```
# 1 · paste 203 into Supabase → SQL Editor, run it
# 2 · load the 34 templates
node --env-file=.env scripts/apply-requirement-templates.mjs           # dry run first
node --env-file=.env scripts/apply-requirement-templates.mjs --apply
# 3 · prove it
node --env-file=.env scripts/check-requirement-templates-live.mjs
```

## What it is for

`src/customer/lib/needs.js` already generates every customer question for
all 34 trades from the partner app's own listing definitions. That stays the
source of truth — a customer's option is literally the option a partner
ticked. 203 adds the three things code alone cannot give:

1. **A version to answer against.** A config saved today answered today's
   questions. Without the version stored beside it, editing a question set
   silently rewrites the meaning of every stored answer — and of every
   partner quote given against one.
2. **Server-side checking.** 202's save took the phone's word for what was
   missing. A phone that can say "nothing is missing" can dispatch a
   half-answered requirement — or slip a non-vegetarian dish into a menu a
   caterer quotes against. 203 drops the `p_missing` argument entirely:
   `sambramo_validate_requirement` decides.
3. **One shape a partner can be shown.** The partner app renders a
   requirement from its template rather than interpreting raw JSON.

## The dietary rule

> **Superseded by 205** — vegan/jain dishes, mixed menus and the `_verified`
> flags were handled wrongly here. See `APPLY_204_205.md`.

`sambramo_validate_requirement` refuses a dish in a `veg` / `vegan` / `jain`
menu unless it is **both** `suggested_diet = 'veg'` **and**
`review_status = 'reviewed'`. An unreviewed dish is not vegetarian — 28 dishes
in the catalogue have no diet recorded at all, and `suggested_diet` is a
suggestion until review says otherwise. Enforced in the database, so search,
substitution and a tampered request all hit the same wall.

The rule is one-directional: a non-vegetarian menu is not restricted.

## Breaking change to watch

203 **drops** `sambramo_save_requirement_config(uuid, jsonb, text[])` and
replaces it with `(uuid, jsonb)`. `src/customer/lib/eventSpine.js` has been
updated to the two-argument form; nothing else calls it. The rollback block
at the bottom of the file says to re-paste 202's version if you revert.

## Generated field counts

All 34 trades produce a template. Two worth knowing:

- **`anchor_mc` — 0 fields.** It has its own booking engine and asks nothing
  beyond the event itself (date, hours, languages come from the booking path).
- **`safety_facilities` — 0 required.** Its `required_answers` are all
  partner-operational and sit in `needs.js`'s SKIP set, so the customer is
  never shown them. The generator will not mark a field mandatory that the
  customer is not actually asked — that is the rule working, not a gap.
