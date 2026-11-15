-- ════════════════════════════════════════════════════════════════════
-- 204 · The columns 202 and 203 added are the server's. A customer may
--       still write what they always wrote — and nothing else.
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 202, 203.
-- SECURITY FIX — apply before anything reads `state` to dispatch.
--
-- ── What was open ───────────────────────────────────────────────────
-- 190 (line 227) grants `authenticated` INSERT, UPDATE and DELETE on
-- event_plans and event_plan_services, scoped by RLS to the customer's
-- own rows. That was right in 190: the plan was the customer's notebook,
-- and src/customer/lib/eventPlans.js upserts into it directly.
--
-- 202 and 203 then put the SERVER's decisions on those same rows — state,
-- owner, config_version, missing_fields, template_version, the batch
-- stamp — and every one of them inherited the customer's write access.
-- scripts/check-event-spine-live.mjs found it, and a probe on 2026-11-03
-- confirmed, with nothing but the anon key and a customer's own session:
--
--   · INSERT a requirement already `state = 'ready'` with any config —
--     accepted, and sambramo_requirement_is_dispatchable said TRUE.
--     203's validator never ran, so a non-vegetarian dish could go into a
--     pure-vegetarian menu after all.
--   · UPDATE a requirement straight to `ready` — accepted.
--   · Reset a dispatched requirement to `ready` — accepted, so it could be
--     sent to partners a second time. That is the exact duplicate 202
--     exists to prevent.
--   · Rewrite plan_code — accepted.
--
-- Contained to the customer's own rows (RLS held across tenants), and no
-- money was exposed: every line is still priced by resolve_booking. But
-- it voided both guarantees 202 and 203 were written for.
--
-- ── Why a trigger and not REVOKE UPDATE (col) ───────────────────────
-- Column privileges cannot say what is needed here:
--   · An upsert compiles to INSERT … ON CONFLICT DO UPDATE SET <every
--     column sent>, including the conflict keys plan_id and trade_id. So
--     those need UPDATE granted — and then nothing stops a direct update
--     from moving a configured requirement to another trade.
--   · booking_line_id must be settable by the client (linkBookings, after
--     checkout) from null to ONE OF THEIR OWN LINES, and never back. That
--     is a transition, not a permission.
-- So: one guard per table that knows who is calling. It is SECURITY
-- INVOKER on purpose — inside 202/203's definer functions current_user is
-- the function owner, so their writes pass; a PostgREST client is
-- `authenticated` or `anon`, so theirs are checked. (A SECURITY DEFINER
-- guard would see its own owner every time and check nothing.)
--
-- Named trg_00_… so it fires before trg_assign_requirement_code: triggers
-- of the same timing run in name order, and a client-supplied code must
-- be refused before the generator would have filled one in.
-- ════════════════════════════════════════════════════════════════════

begin;

/* Is this booking line finished with — nobody holds it any more? A
   requirement whose line has died may be removed, rebooked or relinked;
   one whose line is alive may not. */
create or replace function public.sambramo_line_is_over(p_line_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status in ('expired', 'cancelled') from public.booking_lines where id = p_line_id), true)
$$;

/* Is the statement being run by a client, rather than by the server or
   by one of the definer functions acting for a client? */
create or replace function public.sambramo_is_client_call() returns boolean
language sql stable security invoker set search_path = public as $$
  select current_user in ('authenticated', 'anon')
$$;

-- ═══ event_plan_services ═════════════════════════════════════════════
-- What a customer may write, directly, and nothing else:
--   plan_id, trade_id           on insert (immutable afterwards)
--   recommendation_status       the engine's tag, re-sent by savePlan
--   decision                    their answer — until it is dispatched
--   vendor_service_id, notes    their pick and their words
--   booking_line_id             null → one of their OWN lines (checkout)
-- Everything 202/203 added is written only through the definer functions.
create or replace function public.sambramo_guard_plan_service_client_writes() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if not public.sambramo_is_client_call() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- ── Deleting ──────────────────────────────────────────────────────
  -- A dispatched requirement has a partner holding it. Deleting the row
  -- and adding the trade again would produce a fresh requirement that can
  -- be configured and sent a second time — the duplicate 202 prevents.
  -- Live means: claimed by a batch still in flight (dispatched, no line
  -- yet), or linked to a line nobody has let go of.
  if tg_op = 'DELETE' then
    if (old.state = 'dispatched' and old.booking_line_id is null)
       or (old.booking_line_id is not null and not public.sambramo_line_is_over(old.booking_line_id)) then
      raise exception 'this service is already with professionals — cancel it instead of removing it'
        using errcode = '42501';
    end if;
    return old;
  end if;

  -- ── Inserting ─────────────────────────────────────────────────────
  -- Server-owned columns must arrive at their defaults. Refused rather
  -- than silently reset: no build of the app sends them, so a request
  -- that does is not one to accommodate.
  if tg_op = 'INSERT' then
    if new.state is distinct from 'selected'
       or new.owner is distinct from 'marketplace'
       or new.config is distinct from '{}'::jsonb
       or new.config_version is distinct from 0
       or new.missing_fields is distinct from '{}'::text[]
       or new.template_version is not null
       or new.requirement_code is not null
       or new.dispatch_batch_id is not null
       or new.ready_at is not null
       or new.dispatched_at is not null
       or new.config_saved_at is not null
       or new.owner_note is not null then
      raise exception 'that field is set by Sambramo, not by the app' using errcode = '42501';
    end if;
  end if;

  -- ── Updating ──────────────────────────────────────────────────────
  if tg_op = 'UPDATE' then
    if new.plan_id is distinct from old.plan_id or new.trade_id is distinct from old.trade_id then
      raise exception 'a requirement cannot be moved to another event or trade' using errcode = '42501';
    end if;
    if new.state is distinct from old.state
       or new.owner is distinct from old.owner
       or new.owner_note is distinct from old.owner_note
       or new.owner_set_at is distinct from old.owner_set_at
       or new.config is distinct from old.config
       or new.config_version is distinct from old.config_version
       or new.config_saved_at is distinct from old.config_saved_at
       or new.missing_fields is distinct from old.missing_fields
       or new.template_version is distinct from old.template_version
       or new.requirement_code is distinct from old.requirement_code
       or new.dispatch_batch_id is distinct from old.dispatch_batch_id
       or new.ready_at is distinct from old.ready_at
       or new.dispatched_at is distinct from old.dispatched_at then
      raise exception 'that field is set by Sambramo, not by the app' using errcode = '42501';
    end if;
    -- Past dispatch the line owns the truth, and the answer is frozen with
    -- it. KEPT rather than refused: savePlan re-sends `decision` for every
    -- row in one batched upsert, and installed APKs will keep doing so.
    -- One stale answer on one dispatched row must not fail the whole save
    -- — it simply does not win.
    if old.state = 'dispatched' then
      new.decision := old.decision;
    end if;
    -- A linked line stays linked while it is alive. Once it has expired or
    -- been cancelled, checkout may link the customer's NEW booking for the
    -- same service — that is a rebooking, not an unlinking. Never to null.
    if old.booking_line_id is not null and new.booking_line_id is distinct from old.booking_line_id then
      if new.booking_line_id is null or not public.sambramo_line_is_over(old.booking_line_id) then
        raise exception 'a booked service cannot be unlinked' using errcode = '42501';
      end if;
    end if;
  end if;

  -- ── Linking a booked line (checkout → linkBookings) ───────────────
  -- Allowed, from null, to a line on one of the customer's OWN booking
  -- requests — checked under the customer's own RLS, since this function
  -- runs as them. Linking means it is out with a partner, so the state
  -- follows; that is the one server-owned column a client write may move,
  -- and only ever forwards.
  if new.booking_line_id is not null
     and (tg_op = 'INSERT' or new.booking_line_id is distinct from old.booking_line_id) then
    if not exists (select 1 from public.booking_lines l
                     join public.booking_requests r on r.id = l.request_id
                    where l.id = new.booking_line_id and r.customer_id = auth.uid()) then
      raise exception 'that booking is not yours' using errcode = '42501';
    end if;
    new.state := 'dispatched';
    new.dispatched_at := coalesce(new.dispatched_at, now());
  end if;

  return new;
end $$;

drop trigger if exists trg_00_client_write_guard on public.event_plan_services;
create trigger trg_00_client_write_guard
  before insert or update or delete on public.event_plan_services
  for each row execute function public.sambramo_guard_plan_service_client_writes();

-- ═══ event_plans ═════════════════════════════════════════════════════
-- What a customer may write: everything savePlan / ensureEvent upsert
-- (customer_id — pinned to them by 190's WITH CHECK — client_key,
-- occasion_id, context, rule_version, status) and fulfilment_mode, which
-- is advisory by design. Not plan_code, not booking_request_id.
create or replace function public.sambramo_guard_plan_client_writes() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if not public.sambramo_is_client_call() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Deleting a plan cascades to its requirements, and a cascade runs as
  -- the table owner — so the requirement guard above would never see a
  -- client. Deleting the plan and starting the occasion again would then
  -- give every dispatched service a fresh, sendable twin. Refused here,
  -- where the client still is the caller.
  if tg_op = 'DELETE' then
    if exists (select 1 from public.event_plan_services s
                where s.plan_id = old.id
                  and ((s.state = 'dispatched' and s.booking_line_id is null)
                    or (s.booking_line_id is not null and not public.sambramo_line_is_over(s.booking_line_id)))) then
      raise exception 'this event has services with professionals — cancel those first' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' and (new.plan_code is not null or new.booking_request_id is not null) then
    raise exception 'that field is set by Sambramo, not by the app' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and (new.plan_code is distinct from old.plan_code
                           or new.booking_request_id is distinct from old.booking_request_id) then
    raise exception 'that field is set by Sambramo, not by the app' using errcode = '42501';
  end if;

  -- When the mode was chosen is the server's clock, not the phone's.
  if tg_op = 'INSERT' or new.fulfilment_mode is distinct from old.fulfilment_mode then
    new.fulfilment_mode_set_at := case when new.fulfilment_mode is null then null else now() end;
  else
    new.fulfilment_mode_set_at := old.fulfilment_mode_set_at;
  end if;

  return new;
end $$;

drop trigger if exists trg_00_client_write_guard on public.event_plans;
create trigger trg_00_client_write_guard
  before insert or update or delete on public.event_plans
  for each row execute function public.sambramo_guard_plan_client_writes();

-- ═══ When the line dies, the requirement comes back ═════════════════
-- 202 moves a requirement to `dispatched` and stops there, because past
-- that point booking_lines.status is the truth. But nothing moved it back
-- when that truth became "nobody took it" — and with the guard above, a
-- customer can no longer move it back either. Without this, a requirement
-- whose line expired would be stuck: not dispatchable, not removable.
--
--   expired    nobody accepted in time (197's queue ran out). The customer
--              still wants the service and their answers still stand, so
--              it goes back to `ready` — "find everything" may send it again.
--   cancelled  somebody decided against THIS booking — maybe against the
--              service. Back to `selected`, so sending it again is a
--              deliberate choice rather than a side effect of the next tap.
--
-- Only the requirement whose CURRENT line this is: one already relinked
-- to a newer booking is left alone.
create or replace function public.sambramo_reopen_requirement_on_line_end() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is not distinct from old.status or new.status not in ('expired', 'cancelled') then
    return new;
  end if;
  update public.event_plan_services s set
    state = case
      when new.status = 'expired' and s.config_version > 0 and cardinality(s.missing_fields) = 0 then 'ready'
      else 'selected' end,
    ready_at = case
      when new.status = 'expired' and s.config_version > 0 and cardinality(s.missing_fields) = 0 then now()
      else null end,
    dispatch_batch_id = null
   where s.state = 'dispatched'
     and (s.booking_line_id = new.id or (s.id = new.plan_service_id and s.booking_line_id is null));
  return new;
end $$;

drop trigger if exists trg_reopen_requirement_on_line_end on public.booking_lines;
create trigger trg_reopen_requirement_on_line_end after update of status on public.booking_lines
  for each row execute function public.sambramo_reopen_requirement_on_line_end();

-- The new tables never had client writes and do not get them: batches
-- and the ownership history are written only by definer functions and
-- triggers. Stated explicitly so a future blanket GRANT cannot open them.
revoke insert, update, delete on public.sambramo_dispatch_batches from anon, authenticated;
revoke insert, update, delete on public.sambramo_requirement_ownership_audit from anon, authenticated;
revoke insert, update, delete on public.sambramo_requirement_templates from anon;

commit;

-- ════════════════════════════════════════════════════════════════════
-- VERIFY:  node --env-file=.env scripts/check-event-spine-live.mjs
--          node --env-file=.env scripts/check-requirement-templates-live.mjs
-- Both now probe every write this file closes, as a real customer.
-- ════════════════════════════════════════════════════════════════════
-- ── Rollback ────────────────────────────────────────────────────────
-- drop trigger if exists trg_00_client_write_guard on event_plan_services;
-- drop trigger if exists trg_00_client_write_guard on event_plans;
-- drop trigger if exists trg_reopen_requirement_on_line_end on booking_lines;
-- drop function if exists sambramo_guard_plan_service_client_writes(),
--   sambramo_guard_plan_client_writes(), sambramo_is_client_call(),
--   sambramo_line_is_over(uuid), sambramo_reopen_requirement_on_line_end();
