# Apply 210 — the Event Planner (Mode B)

`supabase/migrations/210_event_planner_mode_b.sql` — paste into **Supabase →
SQL Editor**, run, then:

```
node --env-file=.env scripts/check-planner-mode-b-live.mjs
```

The check runs as four real people — the customer, the planner they asked, a
planner they did not ask, a stranger — with fixture planners it creates and
deletes, and proves the fee-paid trigger on a real payment state change.

## The flow it enables

1. **"Arrange everything for me"** opens the planning brief
   (`/o/:id/planner`): how much the planner should do, an optional budget, what
   is already arranged, what the planner should handle, priorities, theme,
   what must not change. Date, guests and place are read from the event — never
   asked again.
2. **Sent to every planner near the event** who can take it, at once, as
   quote requests in one group (the server takes the group from the brief).
3. **Your planners** (`/o/:id/planners`): each one live — asked → *on it* →
   proposal → accepted, or declined. An acknowledgement is never shown as a
   proposal. Targets come from `sambramo_sla_targets` (2 min / 30 min,
   admin-editable) and are shown as targets, not promises.
4. **A structured proposal**: the planning fee is the only charged line; vendor
   costs are estimates, never added to it, each labelled *Sambramo partner* or
   *their own vendor* (never Sambramo-verified). Approach, timeline, payment
   schedule, staffing, assumptions. Ask a question in place.
5. **Choose** → `accept-custom-quote` (the other planners' requests close) →
   **engagement**, pending until the planning fee is paid → a trigger on the
   payment makes them the event's planner (`fulfilment_mode` → planner, or
   hybrid if the customer already has services with professionals).
6. **The planner's workspace** (partner app, under *Custom work*): their events,
   each brief and requirement; **propose a service** with the same template
   questions a customer answers. It waits as **"Waiting for your yes"** on the
   customer's *My celebration* until they approve or decline. A service the
   customer arranges themselves is refused — no duplicate fulfilment.

## Also changed

- `sambramo_set_requirement_owner` — handing a service to a planner now needs an
  **engaged** planner, not just the mode flag the customer can set in one tap.
- The partner inbox query is `select('*')` so it works before and after 210;
  proposal fields and line `source` are sent only by planners, so every other
  quote is unchanged.

## Not in this step

- Planners **booking marketplace partners on the customer's behalf** for the
  services they own (and the consolidated vendor booking + payment that
  implies). Today a planner proposes and the customer approves; the actual
  vendor bookings are still made by the customer.
- Planner onboarding additions the brief lists beyond what planner listings
  already answer (fee models, explicit SLA, non-wedding event categories).
- Reference photo upload on the brief (text theme only for now).
