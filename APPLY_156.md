# Migration 156 — telemetry, with a hard privacy gate

```
supabase/migrations/156_what_the_app_is_actually_used_for.sql
```

One table, `partner_events`. Nothing existing changes.

## Why this exists

There is no telemetry in this product at all. No SDK, no event table, no
tracking call anywhere. So nobody can answer:

- did the partner open the notification?
- which reminder actually gets tapped?
- how many partners reach step 4 and stop?

Every one of those has already been guessed at in a design decision.

## First-party, deliberately

A third-party analytics SDK in an app that also holds Aadhaar numbers,
bank accounts and photographs of identity documents is a decision that
cannot be undone — once a payload has left, it has left.

This is one table in the database the data already lives in, readable
only by operators, under the same RLS as everything else.

## Three layers stop anything sensitive reaching it

| | |
|---|---|
| **On the device** | `scrub()` drops a value by **key** *and* by **shape**. The shape check is the one that matters: a key-name rule cannot catch `{ id: '123412341234' }`, and that is exactly how it happens. |
| **In the database** | A `BEFORE INSERT` trigger **rejects** the row rather than stripping it. A silently emptied payload teaches nobody; a failed write gets noticed in development, which is where it should be. |
| **In CI** | `check-analytics-privacy.mjs` reads every `track(...)` call site in the tree and fails on a forbidden prop or a literal event name. |

The client and SQL forbid-lists are asserted against each other, so they
cannot drift into disagreeing about what is safe.

An analytics payload is the easiest place in a codebase for something
sensitive to end up: a free-form bag, added under time pressure at the
end of a task, reviewed less carefully than a form. A key named `pan`
reaching a telemetry table is a data breach wearing a product-metrics hat.

## Reading it

Operator-only. A partner writes their own events and reads nothing —
telemetry is not a partner-facing feature.

```sql
-- what partners actually do
SELECT name, count(*) FROM partner_events
 WHERE created_at > now() - interval '7 days'
 GROUP BY name ORDER BY 2 DESC;

-- does the calendar nudge work?
SELECT
  count(*) FILTER (WHERE name = 'calendar_prompt_viewed')  AS shown,
  count(*) FILTER (WHERE name = 'calendar_prompt_clicked') AS tapped,
  count(*) FILTER (WHERE name = 'calendar_updated')        AS acted
FROM partner_events WHERE created_at > now() - interval '30 days';
```

## Checking it

```
node scripts/check-analytics-privacy.mjs
```

33 assertions. It tries 18 forbidden keys and three identity shapes under
innocent key names, and confirms none survive.
