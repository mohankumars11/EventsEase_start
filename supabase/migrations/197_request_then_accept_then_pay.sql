-- ════════════════════════════════════════════════════════════════════
-- 197 · Request → the master accepts → the customer pays
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 060/061/133
-- (offers, accept_offer), 20261010_09/_11 (reservations, book_partner_line)
-- and, for the minute sweep, pg_cron (089 enabled it).
--
-- ── What changes ────────────────────────────────────────────────────
-- Until now an instant booking was ACCEPTED the moment it was written
-- (book_partner_line): the master learnt about a job they had already
-- been given. Mohan, 2026-10-31: the customer sends a REQUEST, the master
-- accepts it (they know their own day and kitchen), and only then does
-- the customer pay.
--
-- ── One master at a time, never a broadcast ─────────────────────────
-- Sending one request to ten caterers and letting the fastest win
-- teaches nine of them that a notification from Sambramo is a race they
-- usually lose — the shortest road to muted alerts and an uninstalled
-- partner app. So every request is EXCLUSIVE: exactly one master holds
-- it, with a visible reply-by time.
--
-- If they decline or let it lapse it moves, by itself, to the next
-- master in the line's queue — the customer's own backups first, then
-- the ones Sambramo picked for them (api/_lib/anchorBook.js rotates
-- those so the same master does not win every time). Every master in the
-- queue was priced and shown to the customer BEFORE the request went
-- out, so a hop never changes the price behind their back. When the
-- queue runs out the line expires and the customer chooses again.
--
-- ── The reply-by time ───────────────────────────────────────────────
--   event within 2 days   30 minutes
--   within a week         2 hours
--   later                 6 hours, and never ending between 22:00 and
--                         08:00 IST — such a window is moved to 09:00,
--                         so nobody loses a job by being asleep.
--
-- ── Who holds the date while a request waits ───────────────────────
-- The asked master's staff/vehicles/stock are reserved as 'held'
-- (sambramo_resource_free already counts them) and released on a hop.
-- The line's own expires_at stays NULL, so the wave dispatcher
-- (lines_awaiting_next_wave, 072) never widens a request line to masters
-- the customer did not see.
-- ════════════════════════════════════════════════════════════════════

-- ── The queue: who is asked, in what order, at what price ───────────
create table if not exists public.sambramo_request_queue (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.booking_lines(id) on delete cascade,
  position smallint not null check (position between 0 and 5),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  service_id text not null,
  service_name text,
  chosen_by text not null default 'customer' check (chosen_by in ('customer','sambramo')),
  quoted_amount_paise bigint not null check (quoted_amount_paise > 0),
  platform_fee_rate numeric,
  platform_fee_paise bigint,
  partner_amount_paise bigint not null check (partner_amount_paise > 0),
  price_basis jsonb not null default '{}'::jsonb,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  reservations jsonb not null default '[]'::jsonb,
  status text not null default 'waiting'
         check (status in ('waiting','asked','accepted','declined','timed_out','skipped')),
  offer_id uuid references public.dispatch_offers(id) on delete set null,
  asked_at timestamptz,
  reply_by timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (line_id, position)
);
-- Set once the asked master (and, on a hop, the customer) has been pushed.
alter table public.sambramo_request_queue add column if not exists notified_at timestamptz;
create index if not exists sambramo_request_queue_offer_idx on public.sambramo_request_queue (offer_id);
create index if not exists sambramo_request_queue_vendor_idx on public.sambramo_request_queue (vendor_id, created_at desc);
-- No policies: it holds each master's take-home. Customers read it
-- through my_request_queue(), which leaves that out.
alter table public.sambramo_request_queue enable row level security;

-- ── When a request must be answered by ──────────────────────────────
create or replace function public.request_reply_by(p_event_date date)
returns timestamptz
language plpgsql stable
set search_path = public
as $$
declare
  v_days integer := p_event_date - (now() at time zone 'Asia/Kolkata')::date;
  v_local timestamp;
begin
  v_local := (now() + case when v_days <= 2 then interval '30 minutes'
                           when v_days <= 7 then interval '2 hours'
                           else interval '6 hours' end) at time zone 'Asia/Kolkata';
  if v_days > 2 and (extract(hour from v_local) >= 22 or extract(hour from v_local) < 8) then
    v_local := date_trunc('day', v_local)
             + case when extract(hour from v_local) >= 22 then interval '1 day' else interval '0 days' end
             + interval '9 hours';
  end if;
  return v_local at time zone 'Asia/Kolkata';
end;
$$;

-- ── Is this master free for this job? (the book_partner_line checks) ─
-- NULL when free, else the reason. Locks the master's vendors row, as
-- book_partner_line and accept_offer do, so two writes serialise.
create or replace function public._request_partner_busy(p_vendor_id uuid, p_date date, p_res jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avail record; v_found boolean; v_booked integer; v_cap integer; rv jsonb; v_free numeric;
begin
  perform 1 from vendors where id = p_vendor_id for update;
  select * into v_avail from vendor_availability where vendor_id = p_vendor_id and slot_date = p_date;
  v_found := found;
  if v_found and v_avail.status = 'BLOCKED' then return 'blocked'; end if;
  if not v_found and not public.weekday_is_open(p_vendor_id, p_date) then return 'weekday_closed'; end if;
  if jsonb_array_length(coalesce(p_res, '[]'::jsonb)) = 0 then
    select count(*) into v_booked from dispatch_offers o
      join booking_lines l on l.id = o.line_id join booking_requests r on r.id = l.request_id
     where o.vendor_id = p_vendor_id and o.status = 'ACCEPTED' and r.event_date = p_date and l.status not in ('cancelled','expired');
    select coalesce(case when v_found then v_avail.slots_total end, v.max_events_per_day, 1) into v_cap from vendors v where v.id = p_vendor_id;
    if v_booked >= v_cap then return 'day_full'; end if;
  else
    for rv in select * from jsonb_array_elements(p_res) loop
      perform 1 from sambramo_resources where id = (rv->>'resource_id')::uuid and vendor_id = p_vendor_id for update;
      if not found then return 'resource_missing'; end if;
      v_free := public.sambramo_resource_free((rv->>'resource_id')::uuid, (rv->>'start_at')::timestamptz, (rv->>'end_at')::timestamptz);
      if coalesce(v_free, 0) < (rv->>'qty')::numeric then return 'resource_full'; end if;
    end loop;
  end if;
  return null;
end;
$$;
revoke all on function public._request_partner_busy(uuid, date, jsonb) from public, anon, authenticated;

-- ── Ask one queued master: the line takes their price, they get the offer ─
create or replace function public._request_ask(p_q public.sambramo_request_queue, p_date date)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_by timestamptz := public.request_reply_by(p_date);
  v_offer uuid;
begin
  update booking_lines set
    service_id = p_q.service_id, service_name = coalesce(p_q.service_name, service_name),
    quoted_amount_paise = p_q.quoted_amount_paise, platform_fee_rate = p_q.platform_fee_rate,
    platform_fee_paise = p_q.platform_fee_paise, partner_amount_paise = p_q.partner_amount_paise,
    price_basis = p_q.price_basis, pricing_snapshot = p_q.pricing_snapshot
  where id = p_q.line_id;

  insert into dispatch_offers (line_id, vendor_id, wave, partner_amount_paise, status, offered_at, expires_at)
  values (p_q.line_id, p_q.vendor_id, p_q.position + 1, p_q.partner_amount_paise, 'OFFERED', now(), v_by)
  returning id into v_offer;

  insert into sambramo_resource_reservations (resource_id, vendor_id, booking_line_id, start_at, end_at, qty, status)
  select (x->>'resource_id')::uuid, p_q.vendor_id, p_q.line_id, (x->>'start_at')::timestamptz, (x->>'end_at')::timestamptz,
         (x->>'qty')::numeric, 'held'
    from jsonb_array_elements(p_q.reservations) x;

  update sambramo_request_queue set status = 'asked', offer_id = v_offer, asked_at = now(), reply_by = v_by where id = p_q.id;
  return v_by;
end;
$$;
revoke all on function public._request_ask(public.sambramo_request_queue, date) from public, anon, authenticated;

-- ── The write: one line, one exclusive offer, the backups queued ────
-- p_line is book_partner_line's shape; p_backups an array of the same
-- pricing fields plus vendor_id, service_id, service_name, chosen_by.
create or replace function public.request_partner_line(
  p_line jsonb,
  p_vendor_id uuid,
  p_partner_paise bigint,
  p_backups jsonb default '[]'::jsonb,
  p_spec_mode text default 'standard'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid := (p_line->>'request_id')::uuid;
  v_date date; v_busy text; v_line_id uuid; v_q public.sambramo_request_queue; v_by timestamptz;
  b jsonb; v_pos smallint := 0;
begin
  if p_spec_mode not in ('standard','discuss','quote') then raise exception 'Bad spec mode.'; end if;
  select r.event_date into v_date from booking_requests r where r.id = v_request_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_request'); end if;

  v_busy := public._request_partner_busy(p_vendor_id, v_date, coalesce(p_line->'reservations', '[]'::jsonb));
  if v_busy is not null then return jsonb_build_object('ok', false, 'reason', v_busy); end if;

  insert into booking_lines (
    request_id, service_id, service_name, trade, spec_mode, customer_note,
    quoted_amount_paise, platform_fee_rate, platform_fee_paise, partner_amount_paise,
    price_basis, pricing_state, pricing_version, pricing_snapshot, status, policy_version
  ) values (
    v_request_id, p_line->>'service_id', p_line->>'service_name', p_line->>'trade', p_spec_mode, p_line->>'customer_note',
    (p_line->>'quoted_amount_paise')::bigint, (p_line->>'platform_fee_rate')::numeric,
    (p_line->>'platform_fee_paise')::bigint, (p_line->>'partner_amount_paise')::bigint,
    coalesce(p_line->'price_basis', '{}'::jsonb), p_line->>'pricing_state', p_line->>'pricing_version',
    coalesce(p_line->'pricing_snapshot', '{}'::jsonb), 'dispatching', p_line->>'policy_version'
  ) returning id into v_line_id;

  insert into sambramo_request_queue (line_id, position, vendor_id, service_id, service_name, chosen_by,
    quoted_amount_paise, platform_fee_rate, platform_fee_paise, partner_amount_paise, price_basis, pricing_snapshot, reservations)
  values (v_line_id, 0, p_vendor_id, p_line->>'service_id', p_line->>'service_name', 'customer',
    (p_line->>'quoted_amount_paise')::bigint, (p_line->>'platform_fee_rate')::numeric, (p_line->>'platform_fee_paise')::bigint,
    p_partner_paise, coalesce(p_line->'price_basis', '{}'::jsonb), coalesce(p_line->'pricing_snapshot', '{}'::jsonb),
    coalesce(p_line->'reservations', '[]'::jsonb))
  returning * into v_q;

  for b in select * from jsonb_array_elements(coalesce(p_backups, '[]'::jsonb)) loop
    exit when v_pos >= 3;                                   -- three backups at most
    continue when (b->>'vendor_id')::uuid = p_vendor_id;    -- never the same master twice
    continue when exists (select 1 from sambramo_request_queue where line_id = v_line_id and vendor_id = (b->>'vendor_id')::uuid);
    v_pos := v_pos + 1;
    insert into sambramo_request_queue (line_id, position, vendor_id, service_id, service_name, chosen_by,
      quoted_amount_paise, platform_fee_rate, platform_fee_paise, partner_amount_paise, price_basis, pricing_snapshot, reservations)
    values (v_line_id, v_pos, (b->>'vendor_id')::uuid, b->>'service_id', b->>'service_name',
      case when b->>'chosen_by' = 'sambramo' then 'sambramo' else 'customer' end,
      (b->>'quoted_amount_paise')::bigint, (b->>'platform_fee_rate')::numeric, (b->>'platform_fee_paise')::bigint,
      (b->>'partner_amount_paise')::bigint, coalesce(b->'price_basis', '{}'::jsonb), coalesce(b->'pricing_snapshot', '{}'::jsonb),
      coalesce(b->'reservations', '[]'::jsonb));
  end loop;

  v_by := public._request_ask(v_q, v_date);
  return jsonb_build_object('ok', true, 'line_id', v_line_id, 'reply_by', v_by, 'backups', v_pos,
    'offer_id', (select offer_id from sambramo_request_queue where id = v_q.id));
end;
$$;
revoke all on function public.request_partner_line(jsonb, uuid, bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.request_partner_line(jsonb, uuid, bigint, jsonb, text) to service_role;

-- ── The hop: the next free master in the queue, or the line expires ─
create or replace function public.route_request_next(p_line_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line record; v_date date; v_q public.sambramo_request_queue; v_busy text; v_by timestamptz;
begin
  select l.id, l.status into v_line from booking_lines l where l.id = p_line_id for update;
  if not found or v_line.status <> 'dispatching' then return jsonb_build_object('ok', false, 'reason', 'not_waiting'); end if;
  if exists (select 1 from dispatch_offers where line_id = p_line_id and status in ('OFFERED','ACCEPTED') and (status = 'ACCEPTED' or expires_at > now())) then
    return jsonb_build_object('ok', true, 'waiting', true);
  end if;
  select r.event_date into v_date from booking_lines l join booking_requests r on r.id = l.request_id where l.id = p_line_id;

  -- The last master's hold goes back.
  update sambramo_resource_reservations set status = 'released' where booking_line_id = p_line_id and status = 'held';

  for v_q in select * from sambramo_request_queue where line_id = p_line_id and status = 'waiting' order by position loop
    v_busy := public._request_partner_busy(v_q.vendor_id, v_date, v_q.reservations);
    if v_busy is not null then
      update sambramo_request_queue set status = 'skipped', answered_at = now() where id = v_q.id;
      continue;
    end if;
    v_by := public._request_ask(v_q, v_date);
    return jsonb_build_object('ok', true, 'asked', v_q.vendor_id, 'position', v_q.position, 'reply_by', v_by);
  end loop;

  -- Nobody left to ask: the customer chooses again.
  update booking_lines set status = 'expired' where id = p_line_id and status = 'dispatching';
  return jsonb_build_object('ok', true, 'exhausted', true);
end;
$$;
revoke all on function public.route_request_next(uuid) from public, anon, authenticated;
grant execute on function public.route_request_next(uuid) to service_role;

-- ── Offers drive the queue ─────────────────────────────────────────
create or replace function public.request_queue_follows_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status <> 'OFFERED' or new.status = old.status then return new; end if;
  if not exists (select 1 from sambramo_request_queue where offer_id = new.id) then return new; end if;
  if new.status = 'ACCEPTED' then
    update sambramo_request_queue set status = 'accepted', answered_at = now() where offer_id = new.id;
    update sambramo_request_queue set status = 'skipped' where line_id = new.line_id and status = 'waiting';
    update sambramo_resource_reservations set status = 'confirmed' where booking_line_id = new.line_id and status = 'held';
  elsif new.status in ('DECLINED','EXPIRED') then
    update sambramo_request_queue set status = case when new.status = 'DECLINED' then 'declined' else 'timed_out' end, answered_at = now()
     where offer_id = new.id;
    perform public.route_request_next(new.line_id);
  end if;
  return new;
end;
$$;
drop trigger if exists request_queue_follows_offer on public.dispatch_offers;
create trigger request_queue_follows_offer after update of status on public.dispatch_offers
  for each row execute function public.request_queue_follows_offer();

-- ── The clock: lapsed requests move on ──────────────────────────────
-- pg_cron runs it every minute; the apps also call it when a screen
-- opens, so a missing scheduler slows a hop down but never strands one.
create or replace function public.sweep_request_timeouts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update dispatch_offers o set status = 'EXPIRED', responded_at = now()
   where o.status = 'OFFERED' and o.expires_at <= now()
     and exists (select 1 from sambramo_request_queue q where q.offer_id = o.id);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.sweep_request_timeouts() from public, anon;
grant execute on function public.sweep_request_timeouts() to authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'sambramo-request-timeouts';
    perform cron.schedule('sambramo-request-timeouts', '* * * * *', 'SELECT public.sweep_request_timeouts()');
  else
    raise notice 'pg_cron is not installed: requests move on when an app calls sweep_request_timeouts().';
  end if;
end $$;

-- ── What the customer may see: names, order, state, reply-by, their price ─
create or replace function public.my_request_queue(p_line_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from booking_lines l join booking_requests r on r.id = l.request_id
     where l.id = p_line_id and r.customer_id = auth.uid()) then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'position', q.position, 'service_id', q.service_id, 'name', q.service_name, 'chosen_by', q.chosen_by,
      'status', q.status, 'asked_at', q.asked_at, 'reply_by', q.reply_by, 'answered_at', q.answered_at,
      'list_paise', nullif(q.pricing_snapshot->>'list_paise', '')::bigint) order by q.position)
    from sambramo_request_queue q where q.line_id = p_line_id), '[]'::jsonb);
end;
$$;
revoke all on function public.my_request_queue(uuid) from public, anon;
grant execute on function public.my_request_queue(uuid) to authenticated;

-- ── What a master sees about their own requests: is it theirs alone, until when ─
create or replace function public.my_request_offers()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('offer_id', q.offer_id, 'reply_by', q.reply_by, 'exclusive', true,
    'status', q.status, 'position', q.position) order by q.asked_at desc), '[]'::jsonb)
  from sambramo_request_queue q
  join vendors v on v.id = q.vendor_id
  where v.profile_id = auth.uid() and q.offer_id is not null and q.asked_at > now() - interval '30 days'
$$;
revoke all on function public.my_request_offers() from public, anon;
grant execute on function public.my_request_offers() to authenticated;

comment on table public.sambramo_request_queue is
  '197: one exclusive request at a time per line; decline/timeout hops to the next queued master (customer backups, then Sambramo picks).';
