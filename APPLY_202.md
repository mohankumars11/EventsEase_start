# Apply 202 — the event spine

`supabase/migrations/202_event_spine_ownership_and_batches.sql`

Paste it whole into **Supabase → SQL Editor** and run. Re-runnable; additive;
no money column is touched. Then run the verify block at the bottom of the
file, and:

```
node --env-file=.env scripts/check-event-spine-live.mjs
```

## What it changes

| Table | Added |
|---|---|
| `event_plans` | `plan_code` (`SBM-EVT-0001`), `booking_request_id`, `fulfilment_mode` |
| `event_plan_services` | `requirement_code`, `owner`, `state`, `config`, `config_version`, `missing_fields`, `dispatch_batch_id`, `ready_at`, `dispatched_at` |
| `booking_lines` | `trade_id`, `requirement_code`, `plan_service_id` (mirrors, so the partner's job and the customer's requirement share a name) |
| `sambramo_trade_registry` | `code_ref` (`PHOTO`, `CATER`, …) for all 34 |
| new | `sambramo_dispatch_batches`, `sambramo_requirement_ownership_audit` |

New functions: `sambramo_requirement_is_dispatchable`,
`sambramo_save_requirement_config`, `sambramo_set_requirement_owner`,
`sambramo_open_dispatch_batch` (all `authenticated`), plus
`sambramo_close_dispatch_batch` and `sambramo_link_line_to_requirement`
(service role only — they are the half of the transaction a client is not
trusted with).

## The one decision worth knowing

**The plan is the event.** `event_plans` (190) is where a requirement exists
before anybody is asked anything, so that is where ownership, configuration
and the new states live. `booking_requests` / `booking_lines` stay exactly
what they are — the transacting record that carries the money — and the plan
now names the request it became (`event_plans.booking_request_id`, 1:1).

Before this, nothing joined the two halves, so "one celebration" was not
something the database could state.

## Why nothing breaks before it is pasted

The client reads these columns through `src/customer/lib/eventSpine.js`, which
probes once and falls back to the phone's own plan when the columns are
missing — the same pattern `eventPlans.js` already uses for 190. The review
screen then says "Saved on this phone" instead of claiming a server save.

## Backfill

22 plans get codes and `fulfilment_mode = 'self'`; 169 plan services get
codes, and `state`/`owner` read off the `decision` they already had, so no
existing row changes meaning. All of them land at `config_version = 0`, which
means `sambramo_requirement_is_dispatchable` says no to every one of them —
correct, because none was ever configured through this path.
