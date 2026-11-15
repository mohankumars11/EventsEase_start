# Apply 211 — Personal Celebrations: the occasion's answers, and the free toolkit

`supabase/migrations/211_occasion_blueprints_and_toolkit.sql` — paste into
**Supabase → SQL Editor** and run. It is `if not exists` throughout, drops
nothing and backfills nothing, so it is safe on the live database.

## What works before it is applied

Everything the customer can see. The 31 blueprints, the questions in Event
Details, the plan screen, the toolkit card, the toggles, the estimate and
Masters all run off the app's own data and the phone's storage — nothing on
this screen waits for 211.

What 211 adds is the **server** half:

| Without 211 | With 211 |
|---|---|
| The occasion's answers live on the phone (`sbm.cx.plan.v1`) | They live on the event (`event_plans.occasion_answers`), so a second phone and the planner see them |
| Invitations, RSVP, chat and the event group work (191 / 192) | unchanged |
| Polls, shared budget and schedule show a lock and say *"opens here once it's switched on"* | They open |

`src/customer/lib/celebration.js` probes for the column once per session and
returns `{ ok: false, reason: 'not-migrated' }` until it is there. Nothing
claims to be saved when it is not — the same contract `eventSpine.js` follows.

## What it creates

**On `event_plans`** — `occasion_answers jsonb` (≤ 16 KB, the customer's own
answers), `blueprint_version integer` (which blueprint produced the plan they
agreed to), `blueprint_category text`.

**Three new tables, for the three free features that did not exist**

- `sambramo_event_polls` + `sambramo_event_poll_votes` — date, venue, food,
  theme, dress code, anything. 2–12 options, single or multi.
- `sambramo_event_contributions` + `sambramo_event_expenses` — who pledged
  what, who has paid, what was actually spent. The **estimate is never
  stored**: it is computed from live partner prices on every render
  (`lib/planBudget.js`), because a stale estimate is worse than none.
- `sambramo_event_updates` — the running order and the changes, seeded from
  the occasion's own before/during/after timeline the first time.

**Two functions, for guests** — `event_polls_view(token)` and
`event_poll_vote(token, poll, choices)`, `security definer`, granted to
`anon`. A guest is not an auth user (191 settled that): they are a row in
`invitation_guests` reached by a token, so a guest can vote without an
account and no policy has to trust an `auth.uid()` that does not exist. The
vote is keyed on the guest the **token** resolved to, never on anything the
caller sent, so a guest can only ever write their own row.

## What it deliberately does not do

- **No second occasion catalogue.** The 31 occasions, their ids and their
  order stay in `src/customer/data/occasions.js`. Copying them into a table
  would give us two truths and one of them would drift.
- **No duplicate invitations, guests or messages.** Four of the seven free
  features are 191's and 192's tables, reused.
- **No stored recommendations.** A plan is derived from the blueprint and the
  answers every time. Only the customer's own answers and choices persist,
  which is what makes a blueprint safe to change.
- **No price column anywhere in it.** A free feature that *can* be billed is
  one schema change away from being billed. This one cannot be.

## After pasting

```
node scripts/check-life-blueprints.mjs
```

prints the catalogue audit and the coverage table for all 31. The live-side
check is still to write — the three new tables have no end-to-end check
against the real database yet, and that is the honest gap.

## Access, in one line

The event's customer owns everything on it, and so does the host of the
invitation it was sent from. Guests reach polls by token and see only the
polls — never the guest list, never the budget, never the plan. A child's
event is reachable only by the organiser and the guardians they invited.
