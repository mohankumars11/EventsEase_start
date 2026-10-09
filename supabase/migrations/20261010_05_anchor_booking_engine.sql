-- The Anchor & MC booking decision engine, and the public reads it needs.
--
-- resolve_anchor_booking(service, request) is the ONE place that decides,
-- for a customer's request against one partner's PUBLISHED listing:
--
--   INSTANT       every charge is known, the partner can do it, the date is
--                 open, and the partner is ready to be booked and paid
--   QUOTE         the partner could do it, but something is outside their
--                 published rules (reason codes say what)
--   NOT_ELIGIBLE  the partner cannot do it (event, language, notice, date)
--
-- It never invents an amount. Anything it cannot price is a QUOTE reason.
-- All money is take-home paise; customer prices come from
-- sambramo_customer_paise() (the single platform fee).
--
-- book_partner_line: the atomic booking write (same lock and calendar
-- checks as accept_offer / book_accepted_quote), for a line the customer
-- booked directly with one partner.
--
-- sambramo_booking_decisions: every resolution is logged with its reasons,
-- so "how much is handled automatically" is measured, not claimed.

begin;

alter table public.sambramo_pricing_config
  add column if not exists require_payout_for_instant boolean not null default true;

create table if not exists public.sambramo_booking_decisions (
  id uuid primary key default gen_random_uuid(),
  vendor_service_id uuid references public.vendor_services(id) on delete set null,
  customer_id uuid,
  path text not null check (path in ('INSTANT','QUOTE','NOT_ELIGIBLE')),
  reasons text[] not null default '{}',
  request jsonb not null default '{}'::jsonb,
  customer_total_paise bigint,
  booking_line_id uuid,
  quote_request_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists sambramo_booking_decisions_path_idx on public.sambramo_booking_decisions (path, created_at desc);
alter table public.sambramo_booking_decisions enable row level security;
drop policy if exists booking_decisions_admin on public.sambramo_booking_decisions;
create policy booking_decisions_admin on public.sambramo_booking_decisions for select to authenticated
  using (public.get_my_role() = 'admin');

-- ═══ The engine ═══════════════════════════════════════════════════════
create or replace function public.resolve_anchor_booking(
  p_vendor_service_id uuid,
  p_req jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  cfg public.sambramo_pricing_config%rowtype;
  s public.vendor_services%rowtype;
  vd public.vendors%rowtype;
  lv public.sambramo_listing_versions%rowtype;
  br jsonb; tr jsonb; prof jsonb;
  d date := nullif(p_req->>'event_date', '')::date;
  v_tier text := upper(nullif(p_req->>'tier', ''));
  v_hours numeric := coalesce(nullif(p_req->>'hours', '')::numeric, 0);
  v_days integer := greatest(1, coalesce(nullif(p_req->>'days', '')::integer, 1));
  v_guests integer := coalesce(nullif(p_req->>'guests', '')::integer, 0);
  v_start text := nullif(p_req->>'start_time', '');
  v_event text := nullif(p_req->>'event_category', '');
  lang text;
  a_id text;
  hard text[] := '{}';     -- NOT_ELIGIBLE reasons
  soft text[] := '{}';     -- QUOTE reasons
  lines jsonb := '[]'::jsonb;
  pkg record; rule record; ar record; avail record;
  v_base bigint; v_inc_hours numeric; v_extra numeric; v_basis text;
  v_rule_id uuid; v_pkg_id uuid; v_pkg_inclusions jsonb := '[]'::jsonb;
  v_take bigint := 0;
  v_km numeric; v_scope numeric;
  v_booked integer; v_cap integer; v_found boolean;
  v_adv integer; v_customer bigint; v_advance bigint;
  v_lead integer;
  v_path text;
begin
  select * into cfg from public.sambramo_pricing_config limit 1;
  select * into s from public.vendor_services where id = p_vendor_service_id;
  if not found then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['listing_not_found']); end if;
  select * into vd from public.vendors where id = s.vendor_id;
  if d is null then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['date_required']); end if;
  if v_hours <= 0 then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['hours_required']); end if;

  -- The version that prices this DATE: an approved seasonal one covering it, else the ordinary live one.
  select * into lv from public.sambramo_listing_versions
   where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is not null
     and d between effective_from and effective_to
   order by version desc limit 1;
  if not found then
    select * into lv from public.sambramo_listing_versions
     where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is null limit 1;
  end if;
  if not found then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['not_live']); end if;
  br := lv.booking_rules; tr := lv.travel_rules; prof := lv.profile;

  -- ── Can this partner do it at all? ─────────────────────────────────
  if not coalesce(vd.is_verified, false) then hard := hard || 'partner_not_verified'; end if;
  if coalesce(vd.accepting_jobs, true) = false then hard := hard || 'partner_paused'; end if;
  if v_event is not null and not (coalesce(prof->'events', '[]'::jsonb) ? v_event) then
    hard := hard || 'event_not_hosted';
  end if;
  for lang in select lower(jsonb_array_elements_text(coalesce(p_req->'languages', '[]'::jsonb))) loop
    if not exists (select 1 from jsonb_array_elements(coalesce(prof->'languages', '[]'::jsonb)) l where lower(l->>'name') = lang) then
      hard := hard || ('language_' || lang);
    end if;
  end loop;
  v_lead := d - current_date;
  if v_lead < coalesce((br->>'min_notice_days')::integer, 0) then hard := hard || 'short_notice'; end if;
  if br ? 'horizon_months' and d > current_date + make_interval(months => (br->>'horizon_months')::integer) then
    hard := hard || 'beyond_booking_window';
  end if;

  -- ── The date ───────────────────────────────────────────────────────
  select * into avail from public.vendor_availability where vendor_id = vd.id and slot_date = d;
  v_found := found;
  if v_found and avail.status = 'BLOCKED' then hard := hard || 'date_blocked';
  elsif not v_found and not public.weekday_is_open(vd.id, d) then hard := hard || 'weekday_closed';
  else
    select count(*) into v_booked from dispatch_offers o
      join booking_lines l on l.id = o.line_id join booking_requests r on r.id = l.request_id
     where o.vendor_id = vd.id and o.status = 'ACCEPTED' and r.event_date = d and l.status not in ('cancelled','expired');
    v_cap := coalesce(case when v_found then avail.slots_total end, vd.max_events_per_day, 1);
    if v_booked >= v_cap then hard := hard || 'date_full'; end if;
  end if;

  if cardinality(hard) > 0 then
    return jsonb_build_object('path','NOT_ELIGIBLE','reasons', hard, 'listing_version_id', lv.id);
  end if;

  -- ── Shape of the event ─────────────────────────────────────────────
  if nullif(prof->>'max_audience', '') is not null and v_guests > (prof->>'max_audience')::integer then
    soft := soft || 'audience_over_capacity';
  end if;
  if (br->>'max_consecutive_hours') is not null and v_hours > (br->>'max_consecutive_hours')::numeric then
    soft := soft || 'longer_than_partner_hosts';
  end if;

  -- ── Base price: one explicit rule, never "cheapest" ────────────────
  if v_days > 1 then
    select * into rule from public.sambramo_rate_rules where listing_version_id = lv.id and model = 'multi_day';
    if found and v_days <= coalesce((rule.multi_day->>'max_days')::integer, 0) and v_hours <= coalesce(rule.included_hours, 24) then
      v_base := round(rule.take_home_paise * v_days * (1 - coalesce((rule.multi_day->>'consecutive_discount_pct')::numeric, 0) / 100.0))::bigint;
      v_basis := 'multi_day'; v_rule_id := rule.id; v_inc_hours := v_hours;
      lines := lines || jsonb_build_array(jsonb_build_object('kind','base','description', v_days || ' days hosting',
        'qty', v_days, 'take_home_paise', v_base));
    else
      soft := soft || 'multi_day_not_priced';
    end if;
  elsif v_tier is not null then
    select p.id, p.name, p.commercial_inputs, p.trade_inputs into pkg from public.sambramo_trade_packages p
     where p.listing_version_id = lv.id and p.status = 'LIVE' and p.commercial_inputs->>'tier' = v_tier limit 1;
    if not found then
      soft := soft || 'package_not_found';
    else
      v_base := (pkg.trade_inputs->>'take_home_paise')::bigint;
      v_inc_hours := (pkg.trade_inputs->>'duration_hours')::numeric;
      v_pkg_id := pkg.id; v_pkg_inclusions := coalesce(pkg.commercial_inputs->'inclusions', '[]'::jsonb);
      v_basis := 'package';
      lines := lines || jsonb_build_array(jsonb_build_object('kind','base','description', pkg.name || ' package',
        'qty', 1, 'take_home_paise', v_base, 'hours', v_inc_hours));
    end if;
  else
    -- No package chosen: hourly first, then the smallest fixed model that fits.
    select * into rule from public.sambramo_rate_rules where listing_version_id = lv.id and model = 'hour';
    if found and v_hours <= coalesce(rule.max_hours, 24) then
      v_inc_hours := greatest(v_hours, coalesce(rule.min_hours, 0));
      v_base := round(rule.take_home_paise * v_inc_hours)::bigint;
      v_basis := 'hour'; v_rule_id := rule.id;
      lines := lines || jsonb_build_array(jsonb_build_object('kind','base','description', v_inc_hours || ' hours hosting',
        'qty', v_inc_hours, 'take_home_paise', v_base));
    else
      select * into rule from public.sambramo_rate_rules
       where listing_version_id = lv.id and model in ('session','event','half_day','full_day')
         and coalesce(included_hours, 0) >= v_hours
       order by included_hours asc, take_home_paise asc limit 1;
      if found then
        v_base := rule.take_home_paise; v_inc_hours := rule.included_hours; v_basis := rule.model; v_rule_id := rule.id;
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','description', replace(initcap(replace(rule.model,'_',' ')), ' ', '-') || ' rate',
          'qty', 1, 'take_home_paise', v_base, 'hours', v_inc_hours));
      else
        soft := soft || 'no_rule_fits_duration';
      end if;
    end if;
  end if;

  -- ── Extra hours beyond what the base includes ──────────────────────
  if v_base is not null and v_hours > coalesce(v_inc_hours, v_hours) then
    v_extra := ceil(v_hours - v_inc_hours);
    select * into rule from public.sambramo_rate_rules
     where listing_version_id = lv.id and extra_hour_take_home_paise is not null
     order by (model = 'hour') desc limit 1;
    if found then
      lines := lines || jsonb_build_array(jsonb_build_object('kind','extra_hours','description', v_extra || ' extra hour' || case when v_extra > 1 then 's' else '' end,
        'qty', v_extra, 'take_home_paise', (rule.extra_hour_take_home_paise * v_extra)::bigint));
    else
      soft := soft || 'extra_hours_not_priced';
    end if;
  end if;

  -- ── Add-ons: included ones at ₹0, never charged twice ──────────────
  for a_id in select jsonb_array_elements_text(coalesce(p_req->'addons', '[]'::jsonb)) loop
    select * into ar from public.sambramo_addon_rules where listing_version_id = lv.id and addon_id = a_id;
    if not found then
      soft := soft || ('addon_not_offered_' || a_id);
    elsif v_pkg_inclusions ? a_id or (v_tier is not null and v_tier = any(ar.included_in)) then
      lines := lines || jsonb_build_array(jsonb_build_object('kind','addon','addon_id', a_id, 'description', ar.label || ' (included)', 'qty', 1, 'take_home_paise', 0));
    elsif ar.notice_days > v_lead then
      soft := soft || ('addon_short_notice_' || a_id);
    else
      lines := lines || jsonb_build_array(jsonb_build_object('kind','addon','addon_id', a_id, 'description', ar.label,
        'qty', case ar.unit when 'per_hour' then v_hours when 'per_day' then v_days else 1 end,
        'take_home_paise', (ar.take_home_paise * case ar.unit when 'per_hour' then ceil(v_hours) when 'per_day' then v_days else 1 end)::bigint));
    end if;
  end loop;

  -- ── Travel, from the partner's base to the venue ───────────────────
  if (p_req ? 'lat') and (p_req ? 'lng') and vd.location is not null then
    v_km := round((ST_Distance(vd.location, public.point_of((p_req->>'lat')::double precision, (p_req->>'lng')::double precision)) / 1000.0)::numeric, 1);
    v_scope := case when coalesce(tr->>'scope', '') ~ '^\d+$' then (tr->>'scope')::numeric end;
    if v_scope is not null and v_km > v_scope then
      case coalesce(tr->>'model', 'custom')
        when 'flat' then
          lines := lines || jsonb_build_array(jsonb_build_object('kind','travel','description','Outstation travel','qty',1,'take_home_paise',(tr->>'flat_take_home_paise')::bigint));
        when 'per_km' then
          lines := lines || jsonb_build_array(jsonb_build_object('kind','travel','description', round(v_km - v_scope) || ' km beyond travel area',
            'qty', round(v_km - v_scope), 'take_home_paise', ((tr->>'per_km_take_home_paise')::bigint * round(v_km - v_scope))::bigint));
        when 'customer_arranged' then
          lines := lines || jsonb_build_array(jsonb_build_object('kind','travel','description','Travel & stay arranged by you','qty',1,'take_home_paise',0));
        else
          soft := soft || 'outside_travel_area';
      end case;
    end if;
  end if;

  -- ── Explicit late-night surcharge (never automatic) ────────────────
  if v_base is not null and br->'surcharge' is not null and jsonb_typeof(br->'surcharge') = 'object'
     and v_start is not null and v_start >= coalesce(br->'surcharge'->>'after', '24:00') then
    lines := lines || jsonb_build_array(jsonb_build_object('kind','surcharge','description','Late-night rate (+' || (br->'surcharge'->>'pct') || '%)',
      'qty', 1, 'take_home_paise', round(v_base * (br->'surcharge'->>'pct')::numeric / 100)::bigint));
  end if;

  -- ── Ready to be booked AND paid instantly? ─────────────────────────
  if coalesce((br->>'instant')::boolean, true) = false then soft := soft || 'instant_booking_off'; end if;
  if cfg.require_payout_for_instant and not exists (
       select 1 from public.partner_payout_accounts pa where pa.vendor_id = vd.id and pa.route_account_id is not null) then
    soft := soft || 'partner_payout_not_active';
  end if;

  select coalesce(sum((x->>'take_home_paise')::bigint), 0) into v_take from jsonb_array_elements(lines) x;
  v_customer := public.sambramo_customer_paise(v_take);
  v_adv := coalesce((br->>'advance_pct')::integer, 100);
  v_advance := least(v_customer, (round(v_customer * v_adv / 100.0 / 10) * 10)::bigint);

  v_path := case when cardinality(soft) > 0 or v_base is null then 'QUOTE' else 'INSTANT' end;
  if v_path = 'QUOTE' and coalesce((br->>'custom_quotes')::boolean, true) = false then
    return jsonb_build_object('path','NOT_ELIGIBLE','reasons', soft || array['custom_quotes_off'], 'listing_version_id', lv.id);
  end if;

  return jsonb_build_object(
    'path', v_path,
    'reasons', soft,
    'vendor_id', vd.id,
    'listing_version_id', lv.id,
    'seasonal', lv.seasonal_window_id is not null,
    'package_id', v_pkg_id,
    'rate_rule_id', v_rule_id,
    'basis', v_basis,
    'lines', (select coalesce(jsonb_agg(x || jsonb_build_object('customer_paise', public.sambramo_customer_paise((x->>'take_home_paise')::bigint))), '[]'::jsonb)
                from jsonb_array_elements(lines) x),
    'take_home_paise', v_take,
    'customer_paise', v_customer,
    'platform_fee_paise', v_customer - v_take,
    'advance_pct', v_adv,
    'advance_paise', v_advance,
    'balance_paise', v_customer - v_advance,
    'distance_km', v_km,
    'cancellation', br->>'cancellation',
    'quote_hours', br->>'quote_hours'
  );
end;
$$;
revoke all on function public.resolve_anchor_booking(uuid, jsonb) from public;
grant execute on function public.resolve_anchor_booking(uuid, jsonb) to anon, authenticated, service_role;

-- ═══ Atomic booking write for a directly-booked partner ═══════════════
create or replace function public.book_partner_line(
  p_line jsonb,
  p_vendor_id uuid,
  p_partner_paise bigint,
  p_spec_mode text default 'standard'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid := (p_line->>'request_id')::uuid;
  v_date date; v_avail record; v_found boolean; v_booked integer; v_cap integer;
  v_line_id uuid; v_offer_id uuid;
begin
  if p_spec_mode not in ('standard','discuss','quote') then raise exception 'Bad spec mode.'; end if;
  select r.event_date into v_date from booking_requests r where r.id = v_request_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_request'); end if;

  perform 1 from vendors where id = p_vendor_id for update;
  select * into v_avail from vendor_availability where vendor_id = p_vendor_id and slot_date = v_date;
  v_found := found;
  if v_found and v_avail.status = 'BLOCKED' then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  if not v_found and not public.weekday_is_open(p_vendor_id, v_date) then return jsonb_build_object('ok', false, 'reason', 'weekday_closed'); end if;
  select count(*) into v_booked from dispatch_offers o
    join booking_lines l on l.id = o.line_id join booking_requests r on r.id = l.request_id
   where o.vendor_id = p_vendor_id and o.status = 'ACCEPTED' and r.event_date = v_date and l.status not in ('cancelled','expired');
  select coalesce(case when v_found then v_avail.slots_total end, v.max_events_per_day, 1) into v_cap from vendors v where v.id = p_vendor_id;
  if v_booked >= v_cap then return jsonb_build_object('ok', false, 'reason', 'day_full'); end if;

  insert into booking_lines (
    request_id, service_id, service_name, trade, spec_mode, customer_note,
    quoted_amount_paise, platform_fee_rate, platform_fee_paise, partner_amount_paise,
    price_basis, pricing_state, pricing_version, pricing_snapshot, status, policy_version
  ) values (
    v_request_id, p_line->>'service_id', p_line->>'service_name', p_line->>'trade', p_spec_mode, p_line->>'customer_note',
    (p_line->>'quoted_amount_paise')::bigint, (p_line->>'platform_fee_rate')::numeric,
    (p_line->>'platform_fee_paise')::bigint, (p_line->>'partner_amount_paise')::bigint,
    coalesce(p_line->'price_basis', '{}'::jsonb), p_line->>'pricing_state', p_line->>'pricing_version',
    coalesce(p_line->'pricing_snapshot', '{}'::jsonb), 'pending', p_line->>'policy_version'
  ) returning id into v_line_id;

  insert into dispatch_offers (line_id, vendor_id, wave, partner_amount_paise, status, offered_at, expires_at, responded_at, accepted_at)
  values (v_line_id, p_vendor_id, 1, p_partner_paise, 'ACCEPTED', now(), now() + interval '1 hour', now(), now())
  returning id into v_offer_id;

  update booking_lines set status = 'accepted', accepted_offer_id = v_offer_id, accepted_at = now() where id = v_line_id;
  return jsonb_build_object('ok', true, 'line_id', v_line_id, 'offer_id', v_offer_id);
end;
$$;
revoke all on function public.book_partner_line(jsonb, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.book_partner_line(jsonb, uuid, bigint, text) to service_role;

-- ═══ Public reads for the customer page ════════════════════════════════
-- Only public fields: the version profile (no legal name is ever in it),
-- live packages with customer prices, add-ons, and the terms a customer
-- must see before paying.
create or replace function public.anchor_public_listing(p_vendor_service_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'vendor_service_id', s.id,
    'version_id', lv.id,
    'profile', lv.profile,
    'city', coalesce(nullif(v.area, ''), v.city),
    'rating', v.rating_avg,
    'terms', jsonb_build_object(
      'advance_pct', lv.booking_rules->>'advance_pct', 'cancellation', lv.booking_rules->>'cancellation',
      'min_notice_days', lv.booking_rules->>'min_notice_days', 'instant', lv.booking_rules->>'instant',
      'rider', lv.booking_rules->'rider', 'travel_model', lv.travel_rules->>'model', 'travel_scope', lv.travel_rules->>'scope'),
    'packages', (select coalesce(jsonb_agg(jsonb_build_object(
        'tier', p.commercial_inputs->>'tier', 'name', p.name,
        'hours', (p.trade_inputs->>'duration_hours')::numeric,
        'customer_paise', (p.trade_inputs->>'customer_paise')::bigint,
        'inclusions', coalesce(p.commercial_inputs->'inclusions', '[]'::jsonb))
        order by case p.commercial_inputs->>'tier' when 'ESSENTIAL' then 0 when 'SIGNATURE' then 1 else 2 end), '[]'::jsonb)
      from public.sambramo_trade_packages p where p.listing_version_id = lv.id and p.status = 'LIVE'),
    'addons', (select coalesce(jsonb_agg(jsonb_build_object('addon_id', a.addon_id, 'label', a.label, 'unit', a.unit,
        'customer_paise', a.customer_paise, 'included_in', a.included_in)), '[]'::jsonb)
      from public.sambramo_addon_rules a where a.listing_version_id = lv.id)
  )
  from public.vendor_services s
  join public.vendors v on v.id = s.vendor_id
  join public.sambramo_listing_versions lv on lv.vendor_service_id = s.id and lv.status = 'LIVE' and lv.seasonal_window_id is null
  where s.id = p_vendor_service_id
$$;
revoke all on function public.anchor_public_listing(uuid) from public;
grant execute on function public.anchor_public_listing(uuid) to anon, authenticated;

-- Live listings of a trade near a point, nearest first, with the entry price.
create or replace function public.anchor_public_listings(
  p_trade text default 'Anchor & MC', p_lat double precision default null, p_lng double precision default null, p_limit integer default 30
) returns table (vendor_service_id uuid, stage_name text, avatar_url text, tagline text, city text, rating numeric,
                 languages jsonb, from_paise bigint, distance_km numeric)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select s.id, lv.profile->>'stage_name', lv.profile->>'avatar_url', lv.profile->>'tagline',
         coalesce(nullif(v.area, ''), v.city), v.rating_avg, lv.profile->'languages',
         (select min((p.trade_inputs->>'customer_paise')::bigint) from public.sambramo_trade_packages p
           where p.listing_version_id = lv.id and p.status = 'LIVE'),
         case when p_lat is not null and v.location is not null
              then round((ST_Distance(v.location, public.point_of(p_lat, p_lng)) / 1000.0)::numeric, 1) end
    from public.sambramo_listing_versions lv
    join public.vendor_services s on s.id = lv.vendor_service_id
    join public.vendors v on v.id = s.vendor_id
   where lv.status = 'LIVE' and lv.seasonal_window_id is null and s.category = p_trade
     and coalesce(v.is_verified, false) and coalesce(v.accepting_jobs, true)
   order by 9 nulls last, v.rating_avg desc nulls last
   limit greatest(1, least(p_limit, 100))
$$;
revoke all on function public.anchor_public_listings(text, double precision, double precision, integer) from public;
grant execute on function public.anchor_public_listings(text, double precision, double precision, integer) to anon, authenticated;

commit;
