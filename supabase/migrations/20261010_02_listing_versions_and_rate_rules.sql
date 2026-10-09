-- Anchor & MC pricing engine: the data the new partner screens read from.
--
-- One LISTING VERSION per submission. Everything the partner configures in
-- the 11-stage flow belongs to a version and is approved, published,
-- locked and archived together, so the Pricing Control Center, the
-- Calendar and checkout can never mix the price of one version with the
-- rules of another.
--
--   sambramo_pricing_config        admin-tunable numbers (fee, uplift, lock days…)
--   sambramo_listing_versions      one row per submitted version of a listing
--   sambramo_rate_rules            per pricing model (hour, session, event, half/full/multi-day)
--   sambramo_addon_rules           per add-on: price, unit, which tiers include it
--   sambramo_seasonal_windows      admin-opened price-update windows
--   sambramo_partner_private       legal name etc., never public
--   sambramo_quote_line_items      structured custom quotes
--   + columns on vendors (confirmed location) and sambramo_trade_packages (version link, lock)
--   + review_sambramo_listing_version()  publish a whole version atomically
--   + anchor_readiness()                 server-computed Instant Book checklist
--
-- Money is integer paise everywhere. take_home_* is what the partner keeps;
-- customer_* is take_home / (1 - fee), computed by the server.

begin;

-- ═══ Config ════════════════════════════════════════════════════════════
create table if not exists public.sambramo_pricing_config (
  id boolean primary key default true check (id),           -- single row
  platform_fee_rate numeric(5,4) not null default 0.08 check (platform_fee_rate >= 0 and platform_fee_rate < 0.5),
  signature_uplift numeric(5,2) not null default 1.75 check (signature_uplift >= 1),
  vip_factor numeric(5,2) not null default 2.00 check (vip_factor >= 1),
  price_lock_days integer not null default 15 check (price_lock_days between 0 and 365),
  min_take_home_hour_paise bigint not null default 50000,     -- ₹500
  max_take_home_hour_paise bigint not null default 50000000,  -- ₹5,00,000
  updated_at timestamptz not null default now()
);
insert into public.sambramo_pricing_config (id) values (true) on conflict do nothing;

alter table public.sambramo_pricing_config enable row level security;
drop policy if exists pricing_config_read on public.sambramo_pricing_config;
create policy pricing_config_read on public.sambramo_pricing_config for select to anon, authenticated using (true);
drop policy if exists pricing_config_admin on public.sambramo_pricing_config;
create policy pricing_config_admin on public.sambramo_pricing_config for update to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- ═══ Seasonal windows ═════════════════════════════════════════════════
create table if not exists public.sambramo_seasonal_windows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,           -- last moment a partner may submit
  event_from date not null,                 -- event dates the new prices apply to
  event_to date not null,
  trades text[] not null default '{}',      -- empty = every trade with a profile
  permitted_fields text[] not null default '{}', -- e.g. {hour,half_day,full_day}
  created_by uuid,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at), check (event_to >= event_from)
);
alter table public.sambramo_seasonal_windows enable row level security;
drop policy if exists seasonal_read on public.sambramo_seasonal_windows;
create policy seasonal_read on public.sambramo_seasonal_windows for select to authenticated using (true);
drop policy if exists seasonal_admin on public.sambramo_seasonal_windows;
create policy seasonal_admin on public.sambramo_seasonal_windows for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- ═══ Listing versions ═════════════════════════════════════════════════
create table if not exists public.sambramo_listing_versions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  vendor_service_id uuid not null references public.vendor_services(id) on delete cascade,
  trade text not null,
  version integer not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED','LIVE','ARCHIVED','REJECTED')),
  parent_version_id uuid references public.sambramo_listing_versions(id) on delete set null,
  seasonal_window_id uuid references public.sambramo_seasonal_windows(id) on delete set null,
  effective_from date,                       -- seasonal versions apply only to these event dates
  effective_to date,
  -- Public profile (stage name, role, tagline, bio, years, media links, events,
  -- languages, styles, audience, formats). Never holds legal or bank data.
  profile jsonb not null default '{}'::jsonb,
  -- Instant on/off, advance %, cancellation, min notice, horizon, quote reply hours,
  -- waiting time, explicit surcharges.
  booking_rules jsonb not null default '{}'::jsonb,
  -- Model (included_radius|flat|per_km|customer_arranged|actuals_capped|custom) + amounts.
  travel_rules jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_note text,
  published_at timestamptz,
  price_locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_service_id, version)
);
create index if not exists sambramo_listing_versions_live_idx
  on public.sambramo_listing_versions (vendor_service_id) where status = 'LIVE';
create unique index if not exists sambramo_listing_versions_one_live
  on public.sambramo_listing_versions (vendor_service_id) where status = 'LIVE' and seasonal_window_id is null;

-- ═══ Rate rules (one per enabled pricing model, per version) ══════════
create table if not exists public.sambramo_rate_rules (
  id uuid primary key default gen_random_uuid(),
  listing_version_id uuid not null references public.sambramo_listing_versions(id) on delete cascade,
  model text not null check (model in ('hour','session','event','half_day','full_day','multi_day')),
  event_categories text[] not null default '{}',       -- empty = all the partner hosts
  included_hours numeric(5,2),
  included_sessions integer check (included_sessions is null or included_sessions > 0),
  min_hours numeric(5,2),
  max_hours numeric(5,2),
  max_audience integer,
  take_home_paise bigint not null check (take_home_paise > 0),
  customer_paise bigint not null check (customer_paise >= take_home_paise),
  extra_hour_take_home_paise bigint check (extra_hour_take_home_paise is null or extra_hour_take_home_paise > 0),
  extra_session_take_home_paise bigint check (extra_session_take_home_paise is null or extra_session_take_home_paise > 0),
  overtime_step_minutes integer check (overtime_step_minutes in (15, 30, 60)),
  overtime_grace_minutes integer not null default 0 check (overtime_grace_minutes between 0 and 120),
  multi_day jsonb,                                     -- {max_days, consecutive_discount_pct, overnight, travel_between_venues}
  meta jsonb not null default '{}'::jsonb,             -- rehearsal_included, breaks_included, …
  unique (listing_version_id, model)
);

-- ═══ Add-on rules ═════════════════════════════════════════════════════
create table if not exists public.sambramo_addon_rules (
  id uuid primary key default gen_random_uuid(),
  listing_version_id uuid not null references public.sambramo_listing_versions(id) on delete cascade,
  addon_id text not null,
  label text not null,
  unit text not null default 'per_event' check (unit in ('per_event','per_hour','per_session','per_day')),
  take_home_paise bigint not null check (take_home_paise >= 0),
  customer_paise bigint not null check (customer_paise >= take_home_paise),
  event_categories text[] not null default '{}',
  notice_days integer not null default 0 check (notice_days between 0 and 90),
  included_in text[] not null default '{}' check (included_in <@ array['ESSENTIAL','SIGNATURE','VIP']),
  unique (listing_version_id, addon_id)
);

-- ═══ Packages belong to a version and carry their lock ═════════════════
alter table public.sambramo_trade_packages
  add column if not exists listing_version_id uuid references public.sambramo_listing_versions(id) on delete set null,
  add column if not exists rate_rule_id uuid references public.sambramo_rate_rules(id) on delete set null,
  add column if not exists published_at timestamptz,
  add column if not exists price_locked_until timestamptz;
create index if not exists sambramo_trade_packages_version_idx on public.sambramo_trade_packages (listing_version_id);

-- ═══ Confirmed base location ══════════════════════════════════════════
alter table public.vendors
  add column if not exists formatted_address text,
  add column if not exists state text,
  add column if not exists location_source text check (location_source is null or location_source in ('gps','map','manual')),
  add column if not exists location_confirmed_at timestamptz,
  add column if not exists travel_scope text;   -- '10'|'25'|'50'|'100'|'state'|'india'|'intl'|'custom'

-- ═══ Private identity (never in a public profile) ══════════════════════
create table if not exists public.sambramo_partner_private (
  vendor_id uuid primary key references public.vendors(id) on delete cascade,
  legal_name text,
  date_of_birth date,
  updated_at timestamptz not null default now()
);
alter table public.sambramo_partner_private enable row level security;
drop policy if exists partner_private_owner on public.sambramo_partner_private;
create policy partner_private_owner on public.sambramo_partner_private for all to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())) or public.get_my_role() = 'admin')
  with check (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())));

-- ═══ Structured custom quotes ═════════════════════════════════════════
create table if not exists public.sambramo_quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.sambramo_quote_requests(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  quote_version integer not null default 1,
  sort_order integer not null default 0,
  description text not null check (length(trim(description)) > 0),
  quantity numeric(8,2) not null default 1 check (quantity > 0),
  unit text not null default 'item',
  unit_take_home_paise bigint not null default 0 check (unit_take_home_paise >= 0),
  charged boolean not null default true,         -- false = included, shown at ₹0
  generated boolean not null default false,      -- pre-filled from the partner's published rates
  generated_unit_paise bigint,                   -- what the engine proposed, kept for audit
  needs_partner boolean not null default false,  -- engine could not price it
  is_estimate boolean not null default false,
  estimate_note text,
  created_at timestamptz not null default now(),
  check (not is_estimate or estimate_note is not null)
);
create index if not exists sambramo_quote_line_items_req_idx on public.sambramo_quote_line_items (quote_request_id, quote_version, sort_order);
alter table public.sambramo_quote_line_items enable row level security;
drop policy if exists quote_lines_partner on public.sambramo_quote_line_items;
create policy quote_lines_partner on public.sambramo_quote_line_items for all to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())))
  with check (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())));
drop policy if exists quote_lines_customer on public.sambramo_quote_line_items;
create policy quote_lines_customer on public.sambramo_quote_line_items for select to authenticated
  using (quote_request_id in (select q.id from public.sambramo_quote_requests q where q.customer_id = (select auth.uid())));

-- ═══ RLS for versions, rules ══════════════════════════════════════════
alter table public.sambramo_listing_versions enable row level security;
alter table public.sambramo_rate_rules enable row level security;
alter table public.sambramo_addon_rules enable row level security;

drop policy if exists listing_versions_owner on public.sambramo_listing_versions;
create policy listing_versions_owner on public.sambramo_listing_versions for select to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())) or public.get_my_role() = 'admin');
drop policy if exists listing_versions_owner_insert on public.sambramo_listing_versions;
create policy listing_versions_owner_insert on public.sambramo_listing_versions for insert to authenticated
  with check (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid()))
              and status in ('DRAFT','UNDER_REVIEW'));
drop policy if exists listing_versions_owner_update on public.sambramo_listing_versions;
create policy listing_versions_owner_update on public.sambramo_listing_versions for update to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())) and status in ('DRAFT','ACTION_REQUIRED'))
  with check (status in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED'));
drop policy if exists listing_versions_public_live on public.sambramo_listing_versions;
create policy listing_versions_public_live on public.sambramo_listing_versions for select to anon, authenticated
  using (status = 'LIVE');

drop policy if exists rate_rules_access on public.sambramo_rate_rules;
create policy rate_rules_access on public.sambramo_rate_rules for select to anon, authenticated
  using (listing_version_id in (select id from public.sambramo_listing_versions));   -- inherits the version's RLS
drop policy if exists rate_rules_owner_write on public.sambramo_rate_rules;
create policy rate_rules_owner_write on public.sambramo_rate_rules for all to authenticated
  using (listing_version_id in (select lv.id from public.sambramo_listing_versions lv
          join public.vendors v on v.id = lv.vendor_id
         where v.profile_id = (select auth.uid()) and lv.status in ('DRAFT','ACTION_REQUIRED')))
  with check (listing_version_id in (select lv.id from public.sambramo_listing_versions lv
          join public.vendors v on v.id = lv.vendor_id
         where v.profile_id = (select auth.uid()) and lv.status in ('DRAFT','ACTION_REQUIRED')));

drop policy if exists addon_rules_access on public.sambramo_addon_rules;
create policy addon_rules_access on public.sambramo_addon_rules for select to anon, authenticated
  using (listing_version_id in (select id from public.sambramo_listing_versions));
drop policy if exists addon_rules_owner_write on public.sambramo_addon_rules;
create policy addon_rules_owner_write on public.sambramo_addon_rules for all to authenticated
  using (listing_version_id in (select lv.id from public.sambramo_listing_versions lv
          join public.vendors v on v.id = lv.vendor_id
         where v.profile_id = (select auth.uid()) and lv.status in ('DRAFT','ACTION_REQUIRED')))
  with check (listing_version_id in (select lv.id from public.sambramo_listing_versions lv
          join public.vendors v on v.id = lv.vendor_id
         where v.profile_id = (select auth.uid()) and lv.status in ('DRAFT','ACTION_REQUIRED')));

-- ═══ The 15-day price lock ════════════════════════════════════════════
-- A new ordinary version cannot be SUBMITTED while the live one is locked.
-- A seasonal version can, if its window is open now and covers this trade.
create or replace function public.guard_listing_version_lock()
returns trigger language plpgsql security invoker set search_path = public
as $$
declare
  v_locked timestamptz;
  v_win public.sambramo_seasonal_windows%rowtype;
begin
  if new.status <> 'UNDER_REVIEW' then
    return new;
  end if;
  -- OLD only exists on UPDATE; never read it on INSERT.
  if tg_op = 'UPDATE' then
    if old.status = 'UNDER_REVIEW' then return new; end if;
  end if;
  select price_locked_until into v_locked
    from public.sambramo_listing_versions
   where vendor_service_id = new.vendor_service_id and status = 'LIVE' and seasonal_window_id is null
   limit 1;
  if v_locked is null or v_locked <= now() then
    return new;
  end if;
  if new.seasonal_window_id is not null then
    select * into v_win from public.sambramo_seasonal_windows where id = new.seasonal_window_id;
    if found and now() between v_win.opens_at and v_win.closes_at
       and (cardinality(v_win.trades) = 0 or new.trade = any(v_win.trades)) then
      return new;
    end if;
  end if;
  raise exception 'Your prices are protected until %. You can submit new prices after that date.',
    to_char(v_locked at time zone 'Asia/Kolkata', 'DD Mon YYYY');
end;
$$;

drop trigger if exists trg_guard_listing_version_lock on public.sambramo_listing_versions;
create trigger trg_guard_listing_version_lock
before insert or update on public.sambramo_listing_versions
for each row execute function public.guard_listing_version_lock();

-- ═══ Publish a whole version (admin) ══════════════════════════════════
create or replace function public.review_sambramo_listing_version(
  p_version_id uuid,
  p_decision text,            -- 'approve' | 'request_changes' | 'reject'
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.sambramo_listing_versions%rowtype;
  v_lock_days integer;
  v_now timestamptz := now();
begin
  if public.get_my_role() <> 'admin' then
    raise exception 'Only a Sambramo operator can review listings.';
  end if;
  if p_decision not in ('approve','request_changes','reject') then
    raise exception 'Unsupported decision.';
  end if;

  select * into v from public.sambramo_listing_versions where id = p_version_id for update;
  if not found then raise exception 'Listing version not found.'; end if;
  if v.status not in ('UNDER_REVIEW','ACTION_REQUIRED') then
    raise exception 'That version is not waiting for review.';
  end if;

  if p_decision <> 'approve' then
    update public.sambramo_listing_versions
       set status = case when p_decision = 'reject' then 'REJECTED' else 'ACTION_REQUIRED' end,
           review_note = p_note, reviewed_at = v_now, reviewed_by = auth.uid(), updated_at = v_now
     where id = v.id;
    update public.sambramo_trade_packages
       set status = 'ACTION_REQUIRED', updated_at = v_now
     where listing_version_id = v.id and status = 'UNDER_REVIEW';
    return jsonb_build_object('ok', true, 'status', case when p_decision = 'reject' then 'REJECTED' else 'ACTION_REQUIRED' end);
  end if;

  select price_lock_days into v_lock_days from public.sambramo_pricing_config limit 1;

  -- An ordinary version replaces the live one. A seasonal version sits beside
  -- it, applying only to its event dates.
  if v.seasonal_window_id is null then
    update public.sambramo_trade_packages p
       set status = 'ARCHIVED', updated_at = v_now
      from public.sambramo_listing_versions old
     where old.vendor_service_id = v.vendor_service_id and old.status = 'LIVE'
       and old.seasonal_window_id is null and p.listing_version_id = old.id and p.status = 'LIVE';
    update public.sambramo_listing_versions
       set status = 'ARCHIVED', updated_at = v_now
     where vendor_service_id = v.vendor_service_id and status = 'LIVE' and seasonal_window_id is null;
  end if;

  update public.sambramo_listing_versions
     set status = 'LIVE', published_at = v_now,
         price_locked_until = case when v.seasonal_window_id is null
                                   then v_now + make_interval(days => coalesce(v_lock_days, 15)) end,
         reviewed_at = v_now, reviewed_by = auth.uid(), review_note = p_note, updated_at = v_now
   where id = v.id;

  update public.sambramo_trade_packages
     set status = 'LIVE', published_at = v_now, updated_at = v_now,
         price_locked_until = case when v.seasonal_window_id is null
                                   then v_now + make_interval(days => coalesce(v_lock_days, 15)) end
   where listing_version_id = v.id and status in ('UNDER_REVIEW','ACTION_REQUIRED','DRAFT');

  update public.sambramo_partner_price_books b
     set status = 'active', effective_from = v_now, updated_at = v_now
    from public.sambramo_trade_packages p
   where p.listing_version_id = v.id and b.offering_id = p.id::text and b.status = 'draft';

  return jsonb_build_object('ok', true, 'status', 'LIVE', 'published_at', v_now);
end;
$$;
revoke all on function public.review_sambramo_listing_version(uuid, text, text) from public;
grant execute on function public.review_sambramo_listing_version(uuid, text, text) to authenticated;

-- ═══ Readiness, computed — never self-declared ════════════════════════
create or replace function public.anchor_readiness(p_vendor_service_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.vendor_services%rowtype;
  vd public.vendors%rowtype;
  lv public.sambramo_listing_versions%rowtype;
  pending public.sambramo_listing_versions%rowtype;
  items jsonb := '[]'::jsonb;
  ok_profile boolean; ok_cap boolean; ok_loc boolean; ok_pricing boolean;
  ok_cal boolean; ok_rules boolean; ok_payout boolean; pricing_pending boolean;
  v_state text;
begin
  select * into s from public.vendor_services where id = p_vendor_service_id;
  if not found then raise exception 'Service not found.'; end if;
  select * into vd from public.vendors where id = s.vendor_id;
  if vd.profile_id is distinct from auth.uid() and public.get_my_role() <> 'admin' then
    raise exception 'Not your listing.';
  end if;

  select * into lv from public.sambramo_listing_versions
   where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is null limit 1;
  select * into pending from public.sambramo_listing_versions
   where vendor_service_id = s.id and status in ('UNDER_REVIEW','ACTION_REQUIRED','DRAFT')
   order by version desc limit 1;

  ok_profile := coalesce(vd.is_verified, false)
    and coalesce(nullif(trim(coalesce(lv.profile, pending.profile)->>'stage_name'), ''), '') <> '';
  ok_cap := jsonb_array_length(coalesce(coalesce(lv.profile, pending.profile)->'events', '[]'::jsonb)) > 0
    and jsonb_array_length(coalesce(coalesce(lv.profile, pending.profile)->'languages', '[]'::jsonb)) > 0;
  ok_loc := vd.location is not null and vd.location_confirmed_at is not null;
  ok_pricing := lv.id is not null and exists (
    select 1 from public.sambramo_trade_packages p where p.listing_version_id = lv.id and p.status = 'LIVE');
  pricing_pending := not ok_pricing and pending.status = 'UNDER_REVIEW';
  ok_cal := exists (select 1 from public.vendor_weekly_rules r where r.vendor_id = vd.id and r.is_available)
         or exists (select 1 from public.vendor_availability a where a.vendor_id = vd.id
                     and a.slot_date >= current_date and a.status in ('OPEN','LIMITED'));
  ok_rules := coalesce(lv.booking_rules, pending.booking_rules) ?& array['advance_pct','cancellation','min_notice_days'];
  ok_payout := exists (select 1 from public.partner_payout_accounts pa
                        where pa.vendor_id = vd.id and pa.route_account_id is not null);

  items := jsonb_build_array(
    jsonb_build_object('id','profile','label','Profile & identity','status', case when ok_profile then 'pass' else 'fail' end,
      'next','Finish your public profile and identity verification.'),
    jsonb_build_object('id','capability','label','Services, languages & capacity','status', case when ok_cap then 'pass' else 'fail' end,
      'next','Choose at least one event type and one language.'),
    jsonb_build_object('id','location','label','Location confirmed','status', case when ok_loc then 'pass' else 'fail' end,
      'next','Confirm your base location on the map.'),
    jsonb_build_object('id','pricing','label','Pricing approved','status',
      case when ok_pricing then 'pass' when pricing_pending then 'pending' else 'fail' end,
      'next', case when pricing_pending then 'Our team is reviewing your packages.' else 'Set your prices and submit them for review.' end),
    jsonb_build_object('id','availability','label','Calendar & booking windows','status', case when ok_cal then 'pass' else 'fail' end,
      'next','Open some dates or set your usual week in Calendar.'),
    jsonb_build_object('id','rules','label','Booking & cancellation rules','status', case when ok_rules then 'pass' else 'fail' end,
      'next','Choose your advance, cancellation policy and minimum notice.'),
    jsonb_build_object('id','payout','label','Razorpay payout account','status', case when ok_payout then 'pass' else 'fail' end,
      'next','Complete your payout setup so Razorpay can pay you.')
  );

  v_state := case
    when not ok_profile then 'PROFILE_INCOMPLETE'
    when not ok_pricing and pricing_pending then 'PRICING_UNDER_REVIEW'
    when not ok_pricing then 'PRICING_INCOMPLETE'
    when not ok_cal then 'AVAILABILITY_INCOMPLETE'
    when not ok_payout then 'PAYOUT_SETUP_PENDING'
    when not (ok_cap and ok_loc and ok_rules) then 'ACTION_REQUIRED'
    when coalesce(lv.booking_rules->>'instant', 'true') = 'false' then 'READY_FOR_CUSTOM_QUOTES'
    else 'READY_FOR_INSTANT_BOOKING'
  end;

  return jsonb_build_object(
    'state', v_state,
    'items', items,
    'quotes_ok', ok_profile and ok_pricing,
    'live_version', lv.version,
    'published_at', lv.published_at,
    'price_locked_until', lv.price_locked_until
  );
end;
$$;
revoke all on function public.anchor_readiness(uuid) from public;
grant execute on function public.anchor_readiness(uuid) to authenticated;

commit;
