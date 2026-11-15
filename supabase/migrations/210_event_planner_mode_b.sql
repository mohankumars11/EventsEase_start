-- ════════════════════════════════════════════════════════════════════
-- 210 · The Event Planner (Mode B): a brief to every eligible planner,
--       structured proposals, an engagement, and a planner who can work
--       the customer's own event — built on the quote system, not beside it.
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 164/20261010_02
-- (quotes), 190 (event_plans), 202–204 (requirements, owner, guard).
--
-- ── What already exists, and is used as it is ───────────────────────
--   sambramo_quote_requests   one per planner asked; quote_group_id ties a
--                             brief's requests together ("accepting one
--                             closes the rest" — api/accept-custom-quote)
--   sambramo_quote_responses  the planner's answer: fee, inclusions,
--                             exclusions, valid-until
--   sambramo_quote_line_items itemised, with is_estimate — the brief's
--                             "never show an estimate as a confirmed price"
--   sambramo_quote_messages   clarification both ways (200)
--   planner listings          already answer team, years, cities, travel,
--                             scope of services, concurrent events, max
--                             guests, budget band, vendor network
--
-- ── What this adds ──────────────────────────────────────────────────
--   1. the BRIEF — scope, optional budget, what is already arranged,
--      theme, priorities, constraints — once, on the event
--   2. ACKNOWLEDGED is not PROPOSED: a planner can say "on it" before the
--      proposal, and the customer sees both, against targets
--   3. a STRUCTURED proposal: approach, timeline, staffing,
--      responsibilities, payment schedule, assumptions; each line says
--      whether it is the planner's fee, a Sambramo partner or a vendor the
--      planner sourced — the last is never labelled Sambramo-verified
--   4. the ENGAGEMENT, opened only when a proposal is accepted and paid;
--      from then on only THAT planner may own a requirement
--   5. the planner's WORKSPACE: they may propose requirements on the
--      customer's event with the same templates as the customer; each
--      waits as "needs your decision" until the customer approves
--   6. RESPONSE TARGETS per kind of request, admin-editable — the brief's
--      pilot values, as targets, never as promises
-- ════════════════════════════════════════════════════════════════════

begin;

-- ═══ 6 · Targets first (others read them) ════════════════════════════
create table if not exists public.sambramo_sla_targets (
  kind text primary key,
  label text not null,
  ack_minutes integer check (ack_minutes is null or ack_minutes > 0),
  respond_minutes integer not null check (respond_minutes > 0),
  note text,
  updated_at timestamptz not null default now()
);
-- The brief's pilot values (Part 13). Targets: a miss is shown and counted
-- against the partner's reliability, never treated as acceptance.
insert into public.sambramo_sla_targets (kind, label, ack_minutes, respond_minutes, note) values
  ('fixed_package', 'Fixed package', null, 2, 'Accept or decline a fixed-price package'),
  ('standard_quote', 'Standard quote', null, 5, 'A quote for a configured service'),
  ('catering_quote', 'Catering quote', null, 10, 'A price against the customer''s menu'),
  ('venue_availability', 'Venue availability', null, 5, 'Confirm a space is free'),
  ('planner_proposal', 'Event planner', 2, 30, 'Acknowledge within 2 minutes; a proposal within 30')
on conflict (kind) do nothing;

alter table public.sambramo_sla_targets enable row level security;
drop policy if exists sla_targets_read on public.sambramo_sla_targets;
create policy sla_targets_read on public.sambramo_sla_targets for select to anon, authenticated using (true);
drop policy if exists sla_targets_admin on public.sambramo_sla_targets;
create policy sla_targets_admin on public.sambramo_sla_targets for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- ═══ 1 · The brief ═══════════════════════════════════════════════════
-- Everything already on the event (date, guests, place, occasion) is NOT
-- asked again — it is read from event_plans. This is only what a planner
-- needs on top.
create table if not exists public.sambramo_planner_briefs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.event_plans(id) on delete cascade,
  customer_id uuid not null default auth.uid(),
  scope text not null check (scope in ('plan', 'plan_coordinate', 'full')),
  budget_min_paise bigint check (budget_min_paise is null or budget_min_paise >= 0),
  budget_max_paise bigint check (budget_max_paise is null or budget_max_paise >= coalesce(budget_min_paise, 0)),
  arranged_trades text[] not null default '{}',     -- already arranged: never the planner's
  planner_trades text[] not null default '{}',      -- what the customer wants the planner to handle
  theme text check (theme is null or length(theme) <= 300),
  reference_urls text[] not null default '{}' check (cardinality(reference_urls) <= 5),
  priorities text[] not null default '{}' check (cardinality(priorities) <= 8),
  special text check (special is null or length(special) <= 1000),
  must_not_change text check (must_not_change is null or length(must_not_change) <= 500),
  contact_pref text check (contact_pref is null or contact_pref in ('app', 'phone', 'whatsapp', 'email')),
  quote_group_id uuid,
  status text not null default 'draft' check (status in ('draft', 'sent', 'engaged', 'closed')),
  sent_at timestamptz,
  ack_due_at timestamptz,
  proposal_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One open brief per event: a second "find me a planner" edits the first.
create unique index if not exists uq_planner_brief_open on public.sambramo_planner_briefs (plan_id)
  where status in ('draft', 'sent');

-- ═══ 2 · Acknowledged is not proposed ════════════════════════════════
alter table public.sambramo_quote_requests
  add column if not exists acknowledged_at timestamptz,
  add column if not exists planner_brief_id uuid references public.sambramo_planner_briefs(id) on delete set null;
create index if not exists sambramo_quote_requests_brief on public.sambramo_quote_requests (planner_brief_id) where planner_brief_id is not null;

-- ═══ 3 · A structured proposal ═══════════════════════════════════════
-- { approach, timeline: [{when, what}], staffing, responsibilities,
--   payment_schedule: [{when, pct}], assumptions: [], vendor_approach,
--   cancellation } — shapes, not free text, so two planners compare.
alter table public.sambramo_quote_responses
  add column if not exists proposal jsonb not null default '{}'::jsonb;
-- Whose money each line is. 'planner_sourced' is a vendor the planner
-- brought: shown as the planner's, never as a Sambramo-verified partner.
alter table public.sambramo_quote_line_items
  add column if not exists source text check (source is null or source in ('planner_fee', 'sambramo_partner', 'planner_sourced'));

-- ═══ 4 · The engagement ══════════════════════════════════════════════
create table if not exists public.sambramo_planner_engagements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.event_plans(id) on delete cascade,
  brief_id uuid references public.sambramo_planner_briefs(id) on delete set null,
  customer_id uuid not null,
  vendor_id uuid not null references public.vendors(id),
  quote_request_id uuid references public.sambramo_quote_requests(id) on delete set null,
  response_id uuid references public.sambramo_quote_responses(id) on delete set null,
  booking_line_id uuid references public.booking_lines(id) on delete set null,
  scope text,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'engaged', 'planning', 'approved', 'execution', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  engaged_at timestamptz,
  updated_at timestamptz not null default now()
);
-- One live planner per event.
create unique index if not exists uq_planner_engagement_live on public.sambramo_planner_engagements (plan_id)
  where status not in ('completed', 'cancelled');

/* Is a planner engaged on this event — accepted, not merely asked? */
create or replace function public.sambramo_engaged_planner(p_plan_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select vendor_id from public.sambramo_planner_engagements
   where plan_id = p_plan_id and status in ('engaged', 'planning', 'approved', 'execution') limit 1
$$;
grant execute on function public.sambramo_engaged_planner(uuid) to authenticated;

-- ═══ Sending the brief ═══════════════════════════════════════════════
/* The customer sends their brief. The quote requests themselves go out
   through the booking endpoint (api/anchor?op=book, quote: true), one per
   eligible planner, carrying this brief's group and id — this records that
   it went, and when an answer is due. */
create or replace function public.sambramo_send_planner_brief(p_brief_id uuid)
returns table (out_group uuid, out_ack_due timestamptz, out_proposal_due timestamptz)
language plpgsql security definer set search_path = public as $$
declare v public.sambramo_planner_briefs; t public.sambramo_sla_targets;
begin
  select * into v from public.sambramo_planner_briefs where id = p_brief_id and customer_id = auth.uid();
  if not found then raise exception 'not your brief' using errcode = '42501'; end if;
  select * into t from public.sambramo_sla_targets where kind = 'planner_proposal';
  update public.sambramo_planner_briefs set
    status = 'sent', sent_at = coalesce(sent_at, now()), quote_group_id = coalesce(quote_group_id, gen_random_uuid()),
    ack_due_at = coalesce(ack_due_at, now() + make_interval(mins => coalesce(t.ack_minutes, 2))),
    proposal_due_at = coalesce(proposal_due_at, now() + make_interval(mins => coalesce(t.respond_minutes, 30))),
    updated_at = now()
   where id = p_brief_id
   returning quote_group_id, ack_due_at, proposal_due_at into v.quote_group_id, v.ack_due_at, v.proposal_due_at;
  return query select v.quote_group_id, v.ack_due_at, v.proposal_due_at;
end $$;
grant execute on function public.sambramo_send_planner_brief(uuid) to authenticated;

/* A planner says "on it" — before, and separately from, the proposal. */
create or replace function public.sambramo_planner_acknowledge(p_quote_request_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_at timestamptz;
begin
  update public.sambramo_quote_requests q set acknowledged_at = coalesce(q.acknowledged_at, now())
   where q.id = p_quote_request_id
     and exists (select 1 from public.vendors v where v.id = q.vendor_id and v.profile_id = auth.uid())
  returning q.acknowledged_at into v_at;
  if v_at is null then raise exception 'not your request' using errcode = '42501'; end if;
  return v_at;
end $$;
grant execute on function public.sambramo_planner_acknowledge(uuid) to authenticated;

-- ═══ Opening the engagement ══════════════════════════════════════════
/* Called by api/accept-custom-quote when the customer accepts a planner's
   proposal (service role only). Pending until the fee is paid. */
create or replace function public.sambramo_open_planner_engagement(p_quote_request_id uuid, p_response_id uuid, p_booking_line_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare q public.sambramo_quote_requests; b public.sambramo_planner_briefs; v_id uuid;
begin
  select * into q from public.sambramo_quote_requests where id = p_quote_request_id;
  if q.planner_brief_id is null then return null; end if;              -- not a planner brief: nothing to open
  select * into b from public.sambramo_planner_briefs where id = q.planner_brief_id;
  insert into public.sambramo_planner_engagements (plan_id, brief_id, customer_id, vendor_id, quote_request_id, response_id, booking_line_id, scope)
  values (b.plan_id, b.id, b.customer_id, q.vendor_id, q.id, p_response_id, p_booking_line_id, b.scope)
  returning id into v_id;
  update public.sambramo_planner_briefs set status = 'engaged', updated_at = now() where id = b.id;
  return v_id;
end $$;
revoke all on function public.sambramo_open_planner_engagement(uuid, uuid, uuid) from public;
revoke all on function public.sambramo_open_planner_engagement(uuid, uuid, uuid) from anon;
revoke all on function public.sambramo_open_planner_engagement(uuid, uuid, uuid) from authenticated;

/* The fee is paid: the planner is engaged, and the event says so. Hybrid
   when the customer already has services with professionals of their own. */
create or replace function public.sambramo_engage_on_fee_paid() returns trigger
language plpgsql security definer set search_path = public as $$
declare e public.sambramo_planner_engagements;
begin
  if new.status is not distinct from old.status or new.status <> 'paid' then return new; end if;
  update public.sambramo_planner_engagements set status = 'engaged', engaged_at = now(), updated_at = now()
   where booking_line_id = new.id and status = 'pending_payment' returning * into e;
  if e.id is not null then
    update public.event_plans p set
      fulfilment_mode = case when exists (select 1 from public.event_plan_services s
                                           where s.plan_id = p.id and s.owner in ('customer', 'marketplace') and s.state = 'dispatched')
                             then 'hybrid' else 'planner' end
     where p.id = e.plan_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_engage_on_fee_paid on public.booking_lines;
create trigger trg_engage_on_fee_paid after update of status on public.booking_lines
  for each row execute function public.sambramo_engage_on_fee_paid();

-- ═══ 5 · The planner's workspace ═════════════════════════════════════
/* Is the caller the planner engaged on this event? */
create or replace function public.sambramo_is_my_engagement(p_plan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sambramo_planner_engagements e join public.vendors v on v.id = e.vendor_id
                  where e.plan_id = p_plan_id and v.profile_id = auth.uid()
                    and e.status in ('engaged', 'planning', 'approved', 'execution'))
$$;

/* The event, as the engaged planner sees it: its context, the brief, and
   every requirement with its code, owner and state. Nothing about the
   customer beyond what the event needs — their number is released only
   after payment, as for every partner (068/073). */
create or replace function public.sambramo_planner_event(p_plan_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.sambramo_is_my_engagement(p_plan_id) then raise exception 'not your event' using errcode = '42501'; end if;
  return (select jsonb_build_object(
    'plan', jsonb_build_object('id', p.id, 'code', p.plan_code, 'occasion_id', p.occasion_id, 'context', p.context, 'mode', p.fulfilment_mode),
    'brief', (select to_jsonb(b) - 'customer_id' from public.sambramo_planner_briefs b where b.plan_id = p.id order by b.created_at desc limit 1),
    'requirements', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'code', s.requirement_code, 'trade_id', s.trade_id,
        'owner', s.owner, 'state', s.state, 'decision', s.decision, 'config', s.config, 'missing', s.missing_fields, 'note', s.owner_note)
        order by s.requirement_code) from public.event_plan_services s where s.plan_id = p.id), '[]'::jsonb))
    from public.event_plans p where p.id = p_plan_id);
end $$;
grant execute on function public.sambramo_planner_event(uuid) to authenticated;

/* The planner proposes a requirement — the same template, the same
   server checks, as a customer's. It waits as "needs your decision"
   (owner ask_customer) until the customer approves it: a planner adds
   nothing to the customer's event, and commits nothing, on their own.
   Refused for a service the customer is arranging themselves, has
   arranged elsewhere, or already has with professionals — the brief's
   "no duplicate active fulfilment". */
create or replace function public.sambramo_planner_propose_requirement(p_plan_id uuid, p_trade_id text, p_config jsonb, p_note text default null)
returns table (out_id uuid, out_code text, out_state text, out_missing text[])
language plpgsql security definer set search_path = public as $$
declare s public.event_plan_services; v_missing text[]; v_invalid jsonb; v_tv integer; v_id uuid; v_code text; v_state text;
begin
  if not public.sambramo_is_my_engagement(p_plan_id) then raise exception 'not your event' using errcode = '42501'; end if;
  select * into s from public.event_plan_services where plan_id = p_plan_id and trade_id = p_trade_id;
  if found and (s.owner in ('customer', 'arranged') or s.state = 'dispatched') then
    raise exception 'the customer is arranging this one themselves' using errcode = '22023';
  end if;
  select x.missing, x.invalid into v_missing, v_invalid from public.sambramo_validate_requirement(p_trade_id, coalesce(p_config, '{}'::jsonb)) x;
  if jsonb_array_length(coalesce(v_invalid, '[]'::jsonb)) > 0 then
    raise exception 'that choice is not available: %', v_invalid::text using errcode = '22023';
  end if;
  select version into v_tv from public.sambramo_requirement_templates where trade_id = p_trade_id and published limit 1;
  insert into public.event_plan_services (plan_id, trade_id, decision, owner, owner_note, config, config_version, config_saved_at,
      missing_fields, template_version, state, ready_at)
  values (p_plan_id, p_trade_id, 'recommended', 'ask_customer', left(p_note, 300), coalesce(p_config, '{}'::jsonb), 1, now(),
      coalesce(v_missing, '{}'), v_tv, case when cardinality(coalesce(v_missing, '{}')) = 0 then 'ready' else 'configuring' end,
      case when cardinality(coalesce(v_missing, '{}')) = 0 then now() end)
  on conflict (plan_id, trade_id) do update set
      decision = 'recommended', owner = 'ask_customer', owner_note = left(p_note, 300), config = excluded.config,
      config_version = public.event_plan_services.config_version + 1, config_saved_at = now(),
      missing_fields = excluded.missing_fields, template_version = excluded.template_version, state = excluded.state, ready_at = excluded.ready_at
  returning id, requirement_code, state into v_id, v_code, v_state;
  return query select v_id, v_code, v_state, coalesce(v_missing, '{}');
end $$;
grant execute on function public.sambramo_planner_propose_requirement(uuid, text, jsonb, text) to authenticated;

/* The customer's answer to a planner's proposal. */
create or replace function public.sambramo_customer_decide_requirement(p_plan_service_id uuid, p_approve boolean)
returns text language plpgsql security definer set search_path = public as $$
declare s public.event_plan_services;
begin
  select x.* into s from public.event_plan_services x join public.event_plans p on p.id = x.plan_id
   where x.id = p_plan_service_id and p.customer_id = auth.uid();
  if not found then raise exception 'not your requirement' using errcode = '42501'; end if;
  if s.owner <> 'ask_customer' then raise exception 'nothing is waiting for your decision here' using errcode = '22023'; end if;
  if p_approve then
    if public.sambramo_engaged_planner(s.plan_id) is null then raise exception 'no planner is engaged on this event' using errcode = '22023'; end if;
    update public.event_plan_services set owner = 'planner', decision = 'selected' where id = s.id;
    return 'planner';
  end if;
  update public.event_plan_services set owner = 'not_needed', decision = 'removed', state = 'closed' where id = s.id;
  return 'not_needed';
end $$;
grant execute on function public.sambramo_customer_decide_requirement(uuid, boolean) to authenticated;

-- ═══ Who may hand a requirement to a planner ═════════════════════════
/* Replaces 202's version. 202 allowed owner 'planner' whenever the event's
   fulfilment_mode said planner/hybrid — a flag the customer sets with one
   tap, before any planner exists. Now it takes an ENGAGED planner: a
   requirement cannot belong to nobody. Everything else is as 202 wrote it. */
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
  if p_owner = 'planner' and public.sambramo_engaged_planner(v_row.plan_id) is null then
    raise exception 'no planner is running this event yet' using errcode = '22023'; end if;
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

-- ═══ Access ══════════════════════════════════════════════════════════
alter table public.sambramo_planner_briefs enable row level security;
alter table public.sambramo_planner_engagements enable row level security;

-- The customer writes their own brief while it is a draft; once sent, it
-- is the planners' brief too and changes through a new one.
drop policy if exists planner_briefs_own on public.sambramo_planner_briefs;
create policy planner_briefs_own on public.sambramo_planner_briefs for select to authenticated
  using (customer_id = (select auth.uid()) or public.get_my_role() = 'admin');
drop policy if exists planner_briefs_insert on public.sambramo_planner_briefs;
create policy planner_briefs_insert on public.sambramo_planner_briefs for insert to authenticated
  with check (customer_id = (select auth.uid()) and status = 'draft'
    and exists (select 1 from public.event_plans p where p.id = plan_id and p.customer_id = (select auth.uid())));
drop policy if exists planner_briefs_edit_draft on public.sambramo_planner_briefs;
create policy planner_briefs_edit_draft on public.sambramo_planner_briefs for update to authenticated
  using (customer_id = (select auth.uid()) and status = 'draft')
  with check (customer_id = (select auth.uid()) and status = 'draft');
-- A planner reads a brief they were asked about — and only that one.
drop policy if exists planner_briefs_asked on public.sambramo_planner_briefs;
create policy planner_briefs_asked on public.sambramo_planner_briefs for select to authenticated
  using (exists (select 1 from public.sambramo_quote_requests q join public.vendors v on v.id = q.vendor_id
                  where q.planner_brief_id = sambramo_planner_briefs.id and v.profile_id = (select auth.uid())));

drop policy if exists planner_engagements_read on public.sambramo_planner_engagements;
create policy planner_engagements_read on public.sambramo_planner_engagements for select to authenticated
  using (customer_id = (select auth.uid()) or public.get_my_role() = 'admin'
     or exists (select 1 from public.vendors v where v.id = vendor_id and v.profile_id = (select auth.uid())));
-- Engagements are opened by the server (accept-custom-quote) and moved by
-- payment; no client writes them.
revoke insert, update, delete on public.sambramo_planner_engagements from anon, authenticated;

commit;

-- VERIFY:  node --env-file=.env scripts/check-planner-mode-b-live.mjs
-- Rollback: drop the two tables, the trigger trg_engage_on_fee_paid, the
-- functions above, the added columns (acknowledged_at, planner_brief_id,
-- proposal, source) and sambramo_sla_targets; then re-paste 202's
-- sambramo_set_requirement_owner.
