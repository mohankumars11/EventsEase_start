-- ════════════════════════════════════════════════════════════════════
-- 202 · One event: how it is being organised, who owns each
--       requirement, what each requirement is called, and the one tap
--       that sent a batch of them out.
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 058
-- (booking_requests), 059 (booking_lines), 115 (booking_code), 190
-- (event_plans, event_plan_services) and 20261010_07 (trade registry).
--
-- ── The two halves of an event, and why they were not joined ────────
-- Sambramo already stores an event twice, for good reasons that have now
-- run out:
--
--   event_plans / event_plan_services (190)  what the customer WANTS.
--       Written while they plan, one row per trade, with the decision
--       they made about it. Exists before anyone is asked anything.
--
--   booking_requests / booking_lines (058/059)  what is being BOUGHT.
--       Created by the engine at dispatch. Carries the money, the
--       escrow, the booking_code and the venue.
--
-- Nothing joins them. event_plan_services.booking_line_id points
-- forward once a line is booked, but no column points from a plan to the
-- booking_request it became, so "one celebration" is not a thing the
-- database can state. Every feature in the brief — hybrid ownership, a
-- planner working the same event, "find everything for my celebration",
-- one dashboard — needs it to be.
--
-- So: the PLAN is the event. It is where a requirement exists before it
-- is bought, which is where all the new states live (selected,
-- configured, ready to match). booking_requests stays exactly what it
-- is — the transacting record — and the plan now names it.
--
--   event_plans ──1:1──> booking_requests
--        │                     │
--   event_plan_services ──> booking_lines   (one requirement, once bought)
--
-- ── What this file adds ─────────────────────────────────────────────
--   1. the link, and an event code                 event_plans
--   2. HOW it is being organised                   event_plans.fulfilment_mode
--   3. WHO owns each requirement                   event_plan_services.owner
--   4. WHAT each requirement is called             event_plan_services.requirement_code
--   5. what the customer configured                event_plan_services.config
--   6. the batch one tap created                   sambramo_dispatch_batches
--
-- Every column is additive with a default that describes what the 22
-- existing plans and 169 existing plan services already are. No live row
-- changes meaning, and no money column is touched anywhere in this file.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ═══ 1 · The link, and an event code ═════════════════════════════════
-- A code a human can say. 115 gave booking_requests 'SBM-BKG-0042' for
-- the transaction; this is the celebration itself, which exists earlier
-- and outlives any one booking.
alter table public.event_plans
  add column if not exists plan_code text,
  add column if not exists booking_request_id uuid references public.booking_requests(id) on delete set null;

create sequence if not exists public.event_plan_code_seq;
create unique index if not exists uq_event_plans_plan_code on public.event_plans (plan_code) where plan_code is not null;
create unique index if not exists uq_event_plans_booking_request
  on public.event_plans (booking_request_id) where booking_request_id is not null;

create or replace function public.assign_plan_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.plan_code is null then
    new.plan_code := 'SBM-EVT-' || lpad(nextval('public.event_plan_code_seq')::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_assign_plan_code on public.event_plans;
create trigger trg_assign_plan_code before insert on public.event_plans
  for each row execute function public.assign_plan_code();

-- ═══ 2 · HOW the event is being organised ════════════════════════════
-- null = the customer has not been asked yet. That is a real state: the
-- occasion and the details are captured before the choice is offered, so
-- a plan sitting at null is mid-journey, not broken.
alter table public.event_plans
  add column if not exists fulfilment_mode text,
  add column if not exists fulfilment_mode_set_at timestamptz;

alter table public.event_plans drop constraint if exists event_plans_fulfilment_mode_check;
alter table public.event_plans add constraint event_plans_fulfilment_mode_check
  check (fulfilment_mode is null or fulfilment_mode in ('self', 'planner', 'hybrid'));

comment on column public.event_plans.fulfilment_mode is
  'self = the customer chooses and books each service; planner = one event planner runs it; hybrid = both inside one event. null = not asked yet. Advisory only: it tells the UI which screen to open, and nothing is enforced against it, because what actually governs a requirement is event_plan_services.owner. That is what makes changing your mind free.';

-- ═══ 3 · WHO owns each requirement ═══════════════════════════════════
--   customer     the customer is arranging this one on Sambramo themselves
--   planner      an engaged event planner owns sourcing and coordination
--   marketplace  Sambramo's dispatch engine owns it — the default lane
--   arranged     already arranged off-platform; never dispatch, still show
--   not_needed   the customer said no; keep the row so the plan remembers
--                the answer and stops re-recommending it
--   ask_customer somebody (usually the planner) needs a decision first
--
-- 190 already stores the customer's answer in `decision`
-- (recommended / selected / removed / arranged / later). That is what they
-- SAID. This is who is ON THE HOOK, which is a different question and the
-- one hybrid mode turns on: a requirement can be `selected` and owned by
-- the planner, or `selected` and owned by the customer, and those lead to
-- completely different screens.
alter table public.event_plan_services
  add column if not exists owner text not null default 'marketplace',
  add column if not exists owner_set_at timestamptz not null default now(),
  add column if not exists owner_note text check (owner_note is null or length(owner_note) <= 300);

alter table public.event_plan_services drop constraint if exists event_plan_services_owner_check;
alter table public.event_plan_services add constraint event_plan_services_owner_check
  check (owner in ('customer', 'planner', 'marketplace', 'arranged', 'not_needed', 'ask_customer'));

-- `decision` and `owner` must not contradict each other. A requirement
-- the customer removed cannot be one the planner is working on.
alter table public.event_plan_services drop constraint if exists event_plan_services_decision_agrees_with_owner;
alter table public.event_plan_services add constraint event_plan_services_decision_agrees_with_owner
  check (
    (decision <> 'removed'  or owner in ('not_needed', 'marketplace'))
    and (decision <> 'arranged' or owner in ('arranged', 'marketplace'))
  );

-- ═══ 4 · The requirement's own lifecycle ═════════════════════════════
-- `decision` is the customer's answer; `state` is where the work is.
-- They are kept apart because a requirement can be `selected` for a week
-- while its configuration is half finished, and the review screen has to
-- tell those two apart to say "DJ — configuration incomplete".
--
-- Past `dispatched` the truth lives on booking_lines.status (059), which
-- is the only thing that may speak about money. `state` is deliberately
-- not a mirror of it: it stops at the point the line takes over.
alter table public.event_plan_services
  add column if not exists state text not null default 'selected',
  add column if not exists ready_at timestamptz,
  add column if not exists dispatched_at timestamptz;

alter table public.event_plan_services drop constraint if exists event_plan_services_state_check;
alter table public.event_plan_services add constraint event_plan_services_state_check
  check (state in ('suggested', 'selected', 'configuring', 'ready', 'dispatched', 'closed'));

comment on column public.event_plan_services.state is
  'suggested (the engine offered it, nobody has acted) · selected (the customer wants it) · configuring (started, mandatory answers still missing) · ready (validated, may be dispatched) · dispatched (a booking_line exists; its status is the truth from here) · closed (arranged elsewhere, not needed, or finished).';

-- ═══ 5 · What the customer actually configured ═══════════════════════
-- The answers a partner needs to quote: duration and deliverables for
-- photography, theme and colours for décor, pickup and passengers for
-- transport. Typed per trade by 203's templates; stored here as the
-- configuration the customer saved, versioned because changing it after
-- partners have quoted must not rewrite what they quoted against.
alter table public.event_plan_services
  add column if not exists config jsonb not null default '{}'::jsonb,
  add column if not exists config_version integer not null default 0,
  add column if not exists config_saved_at timestamptz,
  add column if not exists missing_fields text[] not null default '{}';

comment on column public.event_plan_services.config_version is
  'Starts at 0 — never configured. Every save increments it. A quote, an offer and a booking all record the version they answered, so a later edit is a new version rather than a silent rewrite of history.';

-- ═══ 6 · WHAT each requirement is called ═════════════════════════════
-- A partner on the phone to a customer, an admin reading a complaint and
-- a planner reconciling ten vendor quotes all need to name ONE service
-- out loud. A uuid cannot be read down a phone line, and the event code
-- names the whole celebration, not the photography in it.
--
--   SBM-EVT-0042-PHOTO-01
--   └─ the event ──────┘ └───┘ └┘
--                     trade   nth of that trade in this event
--
-- Derived, stable, unique. It is NOT a secret — the brief says so — and
-- every policy here still keys on auth.uid(). Knowing a code gets you
-- nothing.

-- The readable trade reference. `code` (E01/L04) is the partner-facing
-- registry code and stays exactly as it is; this is the word a human says.
alter table public.sambramo_trade_registry
  add column if not exists code_ref text;

update public.sambramo_trade_registry set code_ref = v.ref from (values
  ('catering_food', 'CATER'), ('cake_desserts', 'CAKE'), ('bar_beverages', 'DRINK'),
  ('venue', 'VENUE'), ('decoration_floral', 'DECOR'), ('tent_furniture', 'TENT'),
  ('event_lighting', 'LIGHT'), ('photography', 'PHOTO'), ('videography', 'VIDEO'),
  ('dj_music', 'DJ'), ('live_entertainment', 'SHOW'), ('anchor_mc', 'ANCHOR'),
  ('sound_av', 'SOUND'), ('bridal_makeup_hair', 'MAKEUP'), ('mehendi_artist', 'MEHENDI'),
  ('priest_rituals', 'PRIEST'), ('trousseau_gift_packing', 'TROUSS'), ('wedding_planning', 'PLAN'),
  ('end_to_end_event_logistics', 'LOGIS'), ('guest_services', 'HOSTS'),
  ('passenger_transport', 'GUESTX'), ('valet_parking', 'VALET'), ('security_services', 'SECURE'),
  ('safety_facilities', 'CLEAN'), ('gifts_favours', 'GIFTS'), ('invitation_printing', 'INVITE'),
  ('event_materials_supplier', 'SUPPLY'), ('event_equipment_rental', 'RENTAL'),
  ('power_cooling', 'POWER'), ('transportation', 'TRANSP'), ('mini_truck_pickup', 'MINITR'),
  ('medium_large_goods_vehicle', 'TRUCK'), ('loading_unloading_crew', 'CREW'),
  ('warehouse_storage', 'STORE')
) as v(id, ref) where sambramo_trade_registry.id = v.id;

-- Fall back to the registry code for anything added later and not named
-- here, so the generator can never produce a code with a hole in it.
update public.sambramo_trade_registry set code_ref = code where code_ref is null;
alter table public.sambramo_trade_registry alter column code_ref set not null;
create unique index if not exists uq_trade_registry_code_ref on public.sambramo_trade_registry (code_ref);

alter table public.event_plan_services
  add column if not exists requirement_code text;
create unique index if not exists uq_event_plan_services_requirement_code
  on public.event_plan_services (requirement_code) where requirement_code is not null;

create or replace function public.sambramo_assign_requirement_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_event text;
  v_ref text;
  v_n integer;
begin
  if new.requirement_code is not null then return new; end if;

  select plan_code into v_event from public.event_plans where id = new.plan_id;
  select code_ref into v_ref from public.sambramo_trade_registry where id = new.trade_id;
  -- A trade not in the registry must never block a plan; the backfill at
  -- the end of this file picks the row up once the registry has it.
  if v_event is null or v_ref is null then return new; end if;

  -- 190 allows one row per (plan, trade), so the sequence is almost always
  -- 01. It is still counted rather than hardcoded, because a deleted row
  -- leaves its number behind — the code was on a quotation — and reusing
  -- it would collide with the unique index and reject the write.
  select count(*) + 1 into v_n from public.event_plan_services
   where plan_id = new.plan_id and trade_id = new.trade_id and id <> new.id;

  loop
    new.requirement_code := v_event || '-' || v_ref || '-' || lpad(v_n::text, 2, '0');
    exit when not exists (select 1 from public.event_plan_services where requirement_code = new.requirement_code);
    v_n := v_n + 1;
  end loop;
  return new;
end $$;

drop trigger if exists trg_assign_requirement_code on public.event_plan_services;
create trigger trg_assign_requirement_code before insert or update on public.event_plan_services
  for each row execute function public.sambramo_assign_requirement_code();

-- ── The same name on the partner's side of the wall ─────────────────
-- A partner reads booking_lines, not the plan. Carrying the requirement
-- code and the stable trade id across means a customer saying
-- "SBM-EVT-0042-PHOTO-01" and a partner looking at their job are talking
-- about one thing. `trade` (the display name) stays untouched: it is
-- snapshotted on purpose, and 059 explains why.
alter table public.booking_lines
  add column if not exists trade_id text references public.sambramo_trade_registry(id),
  add column if not exists requirement_code text,
  add column if not exists plan_service_id uuid references public.event_plan_services(id) on delete set null;

update public.booking_lines l set trade_id = r.id
  from public.sambramo_trade_registry r where r.name = l.trade and l.trade_id is null;

create index if not exists booking_lines_trade_id on public.booking_lines (trade_id);
create index if not exists booking_lines_plan_service on public.booking_lines (plan_service_id);
create index if not exists booking_lines_requirement_code on public.booking_lines (requirement_code);

-- ── Ownership history ───────────────────────────────────────────────
-- PART 12 of the brief: changing who runs a service must be auditable,
-- because the question after any dispute is "who was supposed to arrange
-- the cake, and since when?".
create table if not exists public.sambramo_requirement_ownership_audit (
  id uuid primary key default gen_random_uuid(),
  plan_service_id uuid not null references public.event_plan_services(id) on delete cascade,
  plan_id uuid not null references public.event_plans(id) on delete cascade,
  from_owner text,
  to_owner text not null,
  changed_by uuid,
  changed_by_role text check (changed_by_role is null or changed_by_role in ('customer', 'planner', 'partner', 'admin', 'system')),
  reason text check (reason is null or length(reason) <= 300),
  state_at_change text,
  created_at timestamptz not null default now()
);
create index if not exists sambramo_req_ownership_audit_svc on public.sambramo_requirement_ownership_audit (plan_service_id, created_at desc);
create index if not exists sambramo_req_ownership_audit_plan on public.sambramo_requirement_ownership_audit (plan_id, created_at desc);

create or replace function public.sambramo_audit_requirement_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner is not distinct from old.owner then return new; end if;
  new.owner_set_at := now();
  insert into public.sambramo_requirement_ownership_audit
    (plan_service_id, plan_id, from_owner, to_owner, changed_by, changed_by_role, state_at_change)
  values (new.id, new.plan_id, old.owner, new.owner, auth.uid(),
          case when auth.uid() is null then 'system' end, new.state);
  return new;
end $$;

drop trigger if exists trg_audit_requirement_owner on public.event_plan_services;
create trigger trg_audit_requirement_owner before update of owner on public.event_plan_services
  for each row execute function public.sambramo_audit_requirement_owner();

-- ═══ 7 · The batch one tap created ═══════════════════════════════════
-- "Find everything for my celebration" is one customer action over five
-- requirements. Each keeps its own eligible partner set, its own SLA and
-- its own offers — 059's rule, unchanged, and 197's one-master-at-a-time
-- rule with it. What the batch adds is the ability to answer "what did
-- that tap actually do?", which is the question behind every "nothing is
-- happening" support call.
--
-- One failing service must not stop the other four, so the batch records
-- per-requirement outcomes rather than a single pass or fail.
create table if not exists public.sambramo_dispatch_batches (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.event_plans(id) on delete cascade,
  customer_id uuid not null,
  client_key text not null check (length(client_key) between 8 and 80),
  launched_by text not null default 'customer' check (launched_by in ('customer', 'planner', 'admin')),
  launched_by_id uuid,
  status text not null default 'running' check (status in ('running', 'done', 'partial', 'empty', 'failed')),
  requested_ids uuid[] not null default '{}',     -- every requirement considered
  dispatched_ids uuid[] not null default '{}',    -- the ones that actually went out
  skipped jsonb not null default '[]'::jsonb,     -- [{plan_service_id, requirement_code, reason}]
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (customer_id, client_key)                -- a retried tap is the same batch
);
create index if not exists sambramo_dispatch_batches_plan on public.sambramo_dispatch_batches (plan_id, created_at desc);

alter table public.event_plan_services
  add column if not exists dispatch_batch_id uuid references public.sambramo_dispatch_batches(id) on delete set null;
create index if not exists event_plan_services_batch on public.event_plan_services (dispatch_batch_id);

-- ═══ 8 · What may be dispatched, and once only ═══════════════════════
-- The brief's hardest requirement here: a customer who sent photography
-- on its own an hour ago and now taps "find everything" must not have
-- photography sent twice.
--
-- "Already sent" is not a flag somebody has to remember to set — it is
-- `state = 'dispatched'`, which is set in the same statement that stamps
-- the batch. Reading it off the state is what makes the guarantee hold
-- for the immediate path, the batch path, a planner asking the
-- marketplace and an admin doing it by hand, without any of them
-- knowing about each other.
create or replace function public.sambramo_requirement_is_dispatchable(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select s.owner in ('customer', 'marketplace')
     and s.state = 'ready'
     and s.decision not in ('removed', 'arranged')
     and s.config_version > 0
    from public.event_plan_services s where s.id = p_id
$$;
grant execute on function public.sambramo_requirement_is_dispatchable(uuid) to authenticated;

comment on function public.sambramo_requirement_is_dispatchable is
  'The single answer to "may this requirement be sent to partners now?". Owned by the customer or the marketplace, validated (state = ready), not removed or arranged elsewhere, and actually configured. Anything already sent is state = dispatched and so is refused.';

-- Why the next three are SECURITY DEFINER: 059 gives a customer SELECT
-- and INSERT on booking_lines and no UPDATE at all, because the line
-- carries quoted_amount_paise and a client that could update it could
-- name its own price. That rule stays. These functions each re-check
-- ownership against auth.uid() themselves — which is why they are safe —
-- and none of them touches a money column.

/* Save one requirement's configuration, as a new version.

   p_config is the typed answers for the trade (203 validates them against
   the template; until then the shape is whatever the screen saved).
   p_missing lists the mandatory answers still outstanding: empty means the
   requirement is ready to match, which is what the review screen reads. */
create or replace function public.sambramo_save_requirement_config(
  p_plan_service_id uuid, p_config jsonb, p_missing text[] default '{}')
returns table (out_code text, out_state text, out_version integer)
language plpgsql security definer set search_path = public as $$
declare
  v_row public.event_plan_services;
  v_code text; v_state text; v_version integer;
begin
  if auth.uid() is null then raise exception 'sign in to save a requirement' using errcode = '42501'; end if;

  select s.* into v_row from public.event_plan_services s
    join public.event_plans p on p.id = s.plan_id
   where s.id = p_plan_service_id and p.customer_id = auth.uid();
  if not found then raise exception 'not your requirement' using errcode = '42501'; end if;

  -- Past dispatch the line owns the truth, and a quote was given against
  -- the version that went out. Editing then is a revision, not a save.
  if v_row.state = 'dispatched' then
    raise exception 'this requirement is already with partners — ask for a revision instead' using errcode = '22023';
  end if;

  update public.event_plan_services s set
    config = coalesce(p_config, '{}'::jsonb),
    missing_fields = coalesce(p_missing, '{}'),
    config_version = s.config_version + 1,
    config_saved_at = now(),
    decision = case when s.decision in ('recommended', 'later') then 'selected' else s.decision end,
    state = case when coalesce(cardinality(p_missing), 0) = 0 then 'ready' else 'configuring' end,
    ready_at = case when coalesce(cardinality(p_missing), 0) = 0 then now() else null end
   where s.id = p_plan_service_id
   returning s.requirement_code, s.state, s.config_version into v_code, v_state, v_version;

  return query select v_code, v_state, v_version;
end $$;
grant execute on function public.sambramo_save_requirement_config(uuid, jsonb, text[]) to authenticated;

/* The customer moving a requirement: "I've already arranged this",
   "I don't need it", "my planner is doing it", "I'll do it myself".

   Refuses anything already dispatched — that is a cancellation, which has
   its own ladder (081/195) and its own refund rules, and must not be
   reachable by relabelling a row. */
create or replace function public.sambramo_set_requirement_owner(
  p_plan_service_id uuid, p_owner text, p_note text default null)
returns table (out_code text, out_owner text, out_state text)
language plpgsql security definer set search_path = public as $$
declare
  v_row public.event_plan_services;
  v_state text;
begin
  if auth.uid() is null then raise exception 'sign in' using errcode = '42501'; end if;
  if p_owner not in ('customer', 'marketplace', 'planner', 'arranged', 'not_needed') then
    raise exception 'unknown owner %', p_owner using errcode = '22023'; end if;

  select s.* into v_row from public.event_plan_services s
    join public.event_plans p on p.id = s.plan_id
   where s.id = p_plan_service_id and p.customer_id = auth.uid();
  if not found then raise exception 'not your requirement' using errcode = '42501'; end if;

  if v_row.state = 'dispatched' then
    raise exception 'this service is already with partners — cancel it instead' using errcode = '22023'; end if;

  -- Handing a requirement to a planner needs a planner. Said here rather
  -- than trusted to the screen, because the screen is not the boundary.
  if p_owner = 'planner' and not exists (
       select 1 from public.event_plans p where p.id = v_row.plan_id and p.fulfilment_mode in ('planner', 'hybrid'))
    then raise exception 'no planner is running this event yet' using errcode = '22023'; end if;

  v_state := case when p_owner in ('arranged', 'not_needed') then 'closed'
                  when v_row.state = 'closed' then 'selected'
                  else v_row.state end;

  update public.event_plan_services s set
    owner = p_owner, owner_note = p_note, state = v_state,
    decision = case when p_owner = 'arranged' then 'arranged'
                    when p_owner = 'not_needed' then 'removed'
                    when s.decision in ('removed', 'arranged') then 'selected'
                    else s.decision end
   where s.id = p_plan_service_id;

  return query select v_row.requirement_code, p_owner, v_state;
end $$;
grant execute on function public.sambramo_set_requirement_owner(uuid, text, text) to authenticated;

/* Open a dispatch batch for every ready requirement on one event.

   This does NOT dispatch and does NOT touch money: 059 is explicit that
   amounts are written by the server, so the caller
   (api/anchor?op=dispatch-batch) sends each returned requirement through
   the existing per-line path. What has to be atomic, and is, is the
   bookkeeping: decide what is eligible, record what is not and why, and
   mark the eligible ones dispatched in the same statement that stamps the
   batch — so a second tap, a double-tap or a retry cannot pick them up.

   Idempotent on (customer, client_key): a retried tap returns the first
   batch untouched rather than opening a second one. */
create or replace function public.sambramo_open_dispatch_batch(p_plan_id uuid, p_client_key text)
returns table (out_batch_id uuid, out_status text, out_ready uuid[], out_skipped jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_batch public.sambramo_dispatch_batches;
  v_ready uuid[];
  v_skipped jsonb;
  v_all uuid[];
begin
  if auth.uid() is null then raise exception 'sign in to find professionals' using errcode = '42501'; end if;
  if not exists (select 1 from public.event_plans p where p.id = p_plan_id and p.customer_id = auth.uid())
    then raise exception 'not your event' using errcode = '42501'; end if;

  select * into v_batch from public.sambramo_dispatch_batches
   where customer_id = auth.uid() and client_key = p_client_key;
  if found then
    return query select v_batch.id, v_batch.status, v_batch.dispatched_ids, v_batch.skipped;
    return;
  end if;

  select coalesce(array_agg(s.id), '{}') into v_all
    from public.event_plan_services s where s.plan_id = p_plan_id;

  select coalesce(array_agg(s.id), '{}') into v_ready
    from public.event_plan_services s
   where s.plan_id = p_plan_id and public.sambramo_requirement_is_dispatchable(s.id);

  -- Everything staying behind, with the reason the customer will be shown.
  select coalesce(jsonb_agg(jsonb_build_object(
           'plan_service_id', s.id, 'requirement_code', s.requirement_code, 'trade_id', s.trade_id,
           'reason', case
             when s.owner = 'arranged' then 'already_arranged'
             when s.owner = 'not_needed' then 'not_required'
             when s.owner = 'planner' then 'planner_managed'
             when s.owner = 'ask_customer' then 'needs_your_decision'
             when s.state = 'dispatched' then 'already_sent'
             when s.state = 'suggested' then 'not_selected'
             when s.config_version = 0 then 'not_configured'
             when cardinality(s.missing_fields) > 0 then 'configuration_incomplete'
             else 'not_ready' end,
           'missing', to_jsonb(s.missing_fields))), '[]'::jsonb)
    into v_skipped
    from public.event_plan_services s
   where s.plan_id = p_plan_id and not public.sambramo_requirement_is_dispatchable(s.id);

  insert into public.sambramo_dispatch_batches
    (plan_id, customer_id, client_key, launched_by, launched_by_id, requested_ids, skipped, status)
  values (p_plan_id, auth.uid(), p_client_key, 'customer', auth.uid(), v_all, v_skipped,
          case when cardinality(v_ready) = 0 then 'empty' else 'running' end)
  returning * into v_batch;

  -- The one statement that both claims the requirements and closes them
  -- to any other dispatcher.
  if cardinality(v_ready) > 0 then
    update public.event_plan_services
       set dispatch_batch_id = v_batch.id, state = 'dispatched', dispatched_at = now()
     where id = any(v_ready);
  end if;

  return query select v_batch.id, v_batch.status, v_ready, v_skipped;
end $$;
grant execute on function public.sambramo_open_dispatch_batch(uuid, text) to authenticated;

/* Close the batch, and put back anything that did not make it.

   The opener claims every eligible requirement optimistically, because
   claiming is the only way to stop a second tap racing it. The cost is
   that a requirement whose dispatch then failed — no partner nearby, the
   engine said NOT_ELIGIBLE, the request threw — would sit at
   `dispatched` with no line behind it, which is the one state the
   dashboard cannot explain. So the close is also the rollback: anything
   claimed and not dispatched goes back to `ready`, free to be sent again.

   Server only (service role). It is the half of the transaction the
   client is not trusted with, in both directions. */
create or replace function public.sambramo_close_dispatch_batch(p_batch_id uuid, p_dispatched uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_batch public.sambramo_dispatch_batches;
  v_sent uuid[] := coalesce(p_dispatched, '{}');
begin
  select * into v_batch from public.sambramo_dispatch_batches where id = p_batch_id;
  if not found then raise exception 'no such batch' using errcode = '22023'; end if;

  update public.event_plan_services
     set state = 'ready', dispatched_at = null, dispatch_batch_id = null
   where dispatch_batch_id = p_batch_id and not (id = any(v_sent));

  update public.sambramo_dispatch_batches set
    dispatched_ids = v_sent,
    finished_at = now(),
    status = case
      when cardinality(v_sent) = 0 then 'failed'
      when cardinality(v_sent) < cardinality(requested_ids) - jsonb_array_length(skipped) then 'partial'
      else 'done' end
  where id = p_batch_id;
end $$;
revoke all on function public.sambramo_close_dispatch_batch(uuid, uuid[]) from public;
revoke all on function public.sambramo_close_dispatch_batch(uuid, uuid[]) from anon;
revoke all on function public.sambramo_close_dispatch_batch(uuid, uuid[]) from authenticated;

/* Tie a dispatched booking_line back to the requirement it came from, so
   the customer's code and the partner's job are the same thing. Server
   only, for the same reason as above. */
create or replace function public.sambramo_link_line_to_requirement(p_line_id uuid, p_plan_service_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_code text; v_trade text;
begin
  select requirement_code, trade_id into v_code, v_trade
    from public.event_plan_services where id = p_plan_service_id;
  update public.booking_lines
     set plan_service_id = p_plan_service_id,
         requirement_code = coalesce(requirement_code, v_code),
         trade_id = coalesce(trade_id, v_trade)
   where id = p_line_id;
  update public.event_plan_services
     set booking_line_id = p_line_id, state = 'dispatched', dispatched_at = coalesce(dispatched_at, now())
   where id = p_plan_service_id;
end $$;
revoke all on function public.sambramo_link_line_to_requirement(uuid, uuid) from public;
revoke all on function public.sambramo_link_line_to_requirement(uuid, uuid) from anon;
revoke all on function public.sambramo_link_line_to_requirement(uuid, uuid) from authenticated;

-- ═══ 9 · Access ══════════════════════════════════════════════════════
-- The two new tables only. event_plans, event_plan_services,
-- booking_requests and booking_lines keep the policies they already have
-- (190, 058/059/074) — this file adds columns to them and must not change
-- who can read them.
alter table public.sambramo_dispatch_batches enable row level security;
alter table public.sambramo_requirement_ownership_audit enable row level security;

drop policy if exists dispatch_batches_own on public.sambramo_dispatch_batches;
create policy dispatch_batches_own on public.sambramo_dispatch_batches for select to authenticated
  using (customer_id = (select auth.uid()) or public.get_my_role() = 'admin');

-- Nobody inserts or updates a batch from a client: both are done by the
-- definer functions above, which check the event is yours first.

-- History is readable by the customer whose event it is, and by admins.
-- It is written only by the trigger, which is security definer.
drop policy if exists req_ownership_audit_read on public.sambramo_requirement_ownership_audit;
create policy req_ownership_audit_read on public.sambramo_requirement_ownership_audit for select to authenticated
  using (public.get_my_role() = 'admin'
     or exists (select 1 from public.event_plans p where p.id = plan_id and p.customer_id = (select auth.uid())));

-- ═══ 10 · Backfill what already exists ═══════════════════════════════
-- 22 plans and 169 plan services predate this file. The triggers only
-- fire on write, so they get one pass each.

update public.event_plans
   set plan_code = 'SBM-EVT-' || lpad(nextval('public.event_plan_code_seq')::text, 4, '0')
 where plan_code is null;

-- Every existing plan is self-organised: that is the only mode that has
-- ever existed, and no planner has ever been engaged.
update public.event_plans set fulfilment_mode = 'self', fulfilment_mode_set_at = now()
 where fulfilment_mode is null;

-- `decision` already records what the customer said; `state` and `owner`
-- are read off it so no existing row changes meaning.
update public.event_plan_services s set
  state = case
    when s.booking_line_id is not null then 'dispatched'
    when s.decision in ('removed', 'arranged') then 'closed'
    when s.decision = 'recommended' then 'suggested'
    else 'selected' end,
  owner = case
    when s.decision = 'arranged' then 'arranged'
    when s.decision = 'removed' then 'not_needed'
    else 'marketplace' end
 where s.state = 'selected' and s.owner = 'marketplace';

with numbered as (
  select s.id, p.plan_code, g.code_ref,
         row_number() over (partition by s.plan_id, s.trade_id order by s.created_at, s.id) as n
    from public.event_plan_services s
    join public.event_plans p on p.id = s.plan_id
    join public.sambramo_trade_registry g on g.id = s.trade_id
   where s.requirement_code is null and p.plan_code is not null
)
update public.event_plan_services s
   set requirement_code = n.plan_code || '-' || n.code_ref || '-' || lpad(n.n::text, 2, '0')
  from numbered n where n.id = s.id;

-- Lines that came from a plan service get the same code on their side.
update public.booking_lines l
   set plan_service_id = s.id, requirement_code = coalesce(l.requirement_code, s.requirement_code)
  from public.event_plan_services s
 where s.booking_line_id = l.id and l.plan_service_id is null;

commit;

-- ════════════════════════════════════════════════════════════════════
-- VERIFY — paste after the commit. Every count should be 0.
-- ════════════════════════════════════════════════════════════════════
-- select count(*) as plans_without_code       from event_plans where plan_code is null;
-- select count(*) as plans_without_mode       from event_plans where fulfilment_mode is null;
-- select count(*) as trades_without_ref       from sambramo_trade_registry where code_ref is null;
-- select count(*) as reqs_without_code        from event_plan_services s
--   join event_plans p on p.id = s.plan_id where s.requirement_code is null and p.plan_code is not null;
-- select count(*) as lines_without_trade_id   from booking_lines where trade_id is null;
--
-- -- decision and owner never contradict each other
-- select count(*) as contradictions from event_plan_services
--  where (decision = 'removed'  and owner not in ('not_needed','marketplace'))
--     or (decision = 'arranged' and owner not in ('arranged','marketplace'));
--
-- -- what the codes look like, and the guard's verdict on each requirement
-- select requirement_code, trade_id, decision, owner, state, config_version,
--        sambramo_requirement_is_dispatchable(id) as dispatchable
--   from event_plan_services order by requirement_code limit 20;
--
-- -- nothing is claimed by a batch that never finished
-- select count(*) as orphan_claims from event_plan_services s
--   join sambramo_dispatch_batches b on b.id = s.dispatch_batch_id
--  where s.state = 'dispatched' and s.booking_line_id is null and b.finished_at is not null;
--
-- ── Rollback (drops only what this file added) ───────────────────────
-- drop trigger if exists trg_assign_requirement_code on event_plan_services;
-- drop trigger if exists trg_audit_requirement_owner on event_plan_services;
-- drop trigger if exists trg_assign_plan_code on event_plans;
-- drop function if exists sambramo_assign_requirement_code(), sambramo_audit_requirement_owner(),
--   assign_plan_code(), sambramo_requirement_is_dispatchable(uuid),
--   sambramo_save_requirement_config(uuid,jsonb,text[]), sambramo_set_requirement_owner(uuid,text,text),
--   sambramo_open_dispatch_batch(uuid,text), sambramo_close_dispatch_batch(uuid,uuid[]),
--   sambramo_link_line_to_requirement(uuid,uuid);
-- alter table event_plan_services drop column if exists owner, drop column if exists owner_set_at,
--   drop column if exists owner_note, drop column if exists state, drop column if exists ready_at,
--   drop column if exists dispatched_at, drop column if exists config, drop column if exists config_version,
--   drop column if exists config_saved_at, drop column if exists missing_fields,
--   drop column if exists requirement_code, drop column if exists dispatch_batch_id;
-- alter table event_plans drop column if exists plan_code, drop column if exists booking_request_id,
--   drop column if exists fulfilment_mode, drop column if exists fulfilment_mode_set_at;
-- alter table booking_lines drop column if exists trade_id, drop column if exists requirement_code,
--   drop column if exists plan_service_id;
-- drop table if exists sambramo_requirement_ownership_audit, sambramo_dispatch_batches;
-- drop sequence if exists event_plan_code_seq;
-- alter table sambramo_trade_registry drop column if exists code_ref;
