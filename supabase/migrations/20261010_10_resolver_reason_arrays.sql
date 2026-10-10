-- Fix: both booking resolvers appended reasons as  arr := arr || 'reason',
-- which Postgres reads as an ARRAY LITERAL ("malformed array literal") — so
-- any partner who was unverified, paused, short-noticed, blocked … made the
-- resolver ERROR instead of answering NOT_ELIGIBLE / QUOTE. Found by the live
-- end-to-end test on 2026-10-10. Every append is now array_append(arr, 'x').
--
-- Re-creates only the two functions (same signatures, same grants); safe to
-- paste after 05 and 09. Nothing else changes.

begin;

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
  if not coalesce(vd.is_verified, false) then hard := array_append(hard, 'partner_not_verified'); end if;
  if coalesce(vd.accepting_jobs, true) = false then hard := array_append(hard, 'partner_paused'); end if;
  if v_event is not null and not (coalesce(prof->'events', '[]'::jsonb) ? v_event) then
    hard := array_append(hard, 'event_not_hosted');
  end if;
  for lang in select lower(jsonb_array_elements_text(coalesce(p_req->'languages', '[]'::jsonb))) loop
    if not exists (select 1 from jsonb_array_elements(coalesce(prof->'languages', '[]'::jsonb)) l where lower(l->>'name') = lang) then
      hard := hard || ('language_' || lang);
    end if;
  end loop;
  v_lead := d - current_date;
  if v_lead < coalesce((br->>'min_notice_days')::integer, 0) then hard := array_append(hard, 'short_notice'); end if;
  if br ? 'horizon_months' and d > current_date + make_interval(months => (br->>'horizon_months')::integer) then
    hard := array_append(hard, 'beyond_booking_window');
  end if;

  -- ── The date ───────────────────────────────────────────────────────
  select * into avail from public.vendor_availability where vendor_id = vd.id and slot_date = d;
  v_found := found;
  if v_found and avail.status = 'BLOCKED' then hard := array_append(hard, 'date_blocked');
  elsif not v_found and not public.weekday_is_open(vd.id, d) then hard := array_append(hard, 'weekday_closed');
  else
    select count(*) into v_booked from dispatch_offers o
      join booking_lines l on l.id = o.line_id join booking_requests r on r.id = l.request_id
     where o.vendor_id = vd.id and o.status = 'ACCEPTED' and r.event_date = d and l.status not in ('cancelled','expired');
    v_cap := coalesce(case when v_found then avail.slots_total end, vd.max_events_per_day, 1);
    if v_booked >= v_cap then hard := array_append(hard, 'date_full'); end if;
  end if;

  if cardinality(hard) > 0 then
    return jsonb_build_object('path','NOT_ELIGIBLE','reasons', hard, 'listing_version_id', lv.id);
  end if;

  -- ── Shape of the event ─────────────────────────────────────────────
  if nullif(prof->>'max_audience', '') is not null and v_guests > (prof->>'max_audience')::integer then
    soft := array_append(soft, 'audience_over_capacity');
  end if;
  if (br->>'max_consecutive_hours') is not null and v_hours > (br->>'max_consecutive_hours')::numeric then
    soft := array_append(soft, 'longer_than_partner_hosts');
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
      soft := array_append(soft, 'multi_day_not_priced');
    end if;
  elsif v_tier is not null then
    select p.id, p.name, p.commercial_inputs, p.trade_inputs into pkg from public.sambramo_trade_packages p
     where p.listing_version_id = lv.id and p.status = 'LIVE' and p.commercial_inputs->>'tier' = v_tier limit 1;
    if not found then
      soft := array_append(soft, 'package_not_found');
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
        soft := array_append(soft, 'no_rule_fits_duration');
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
      soft := array_append(soft, 'extra_hours_not_priced');
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
          soft := array_append(soft, 'outside_travel_area');
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
  if coalesce((br->>'instant')::boolean, true) = false then soft := array_append(soft, 'instant_booking_off'); end if;
  if cfg.require_payout_for_instant and not exists (
       select 1 from public.partner_payout_accounts pa where pa.vendor_id = vd.id and pa.route_account_id is not null) then
    soft := array_append(soft, 'partner_payout_not_active');
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

create or replace function public.resolve_booking(
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
  reg public.sambramo_trade_registry%rowtype;
  lv public.sambramo_listing_versions%rowtype;
  br jsonb; tr jsonb; ans jsonb;
  d date := nullif(p_req->>'event_date', '')::date;
  d_end date;
  v_start time := coalesce(nullif(p_req->>'start_time', '')::time, '10:00'::time);
  v_hours numeric := coalesce(nullif(p_req->>'hours', '')::numeric, 0);
  v_days integer := greatest(1, coalesce(nullif(p_req->>'days', '')::integer, 1));
  v_guests integer := coalesce(nullif(p_req->>'guests', '')::integer, 0);
  v_staff integer := coalesce(nullif(p_req->>'staff', '')::integer, 0);
  v_pkg_key text := upper(nullif(coalesce(p_req->>'package', p_req->>'tier'), ''));
  v_kind text := nullif(p_req->>'rule_kind', '');
  v_event text := nullif(p_req->>'event_category', '');
  v_start_at timestamptz; v_end_at timestamptz;
  hard text[] := '{}';
  soft text[] := '{}';
  lines jsonb := '[]'::jsonb;
  res jsonb := '[]'::jsonb;          -- reservations [{resource_id, qty, start_at, end_at}]
  rule record; it record; pkg record; ar record; avail record; rs record; ch jsonb; x jsonb;
  v_found boolean; v_booked integer; v_cap integer; v_lead integer;
  v_base bigint; v_inc_hours numeric; v_extra numeric; v_qty numeric; v_amt bigint; v_periods numeric;
  v_unit_paise bigint; v_band jsonb; v_free numeric; v_min_staff integer;
  v_total_minutes numeric; v_km numeric; v_scope numeric; v_trip_km numeric;
  v_pkg_id uuid; v_pkg_inclusions jsonb := '[]'::jsonb;
  v_take bigint := 0; v_customer bigint; v_adv integer; v_advance bigint; v_deposit bigint := 0;
  v_fee numeric; v_require_payout boolean; v_path text; v_basis text;
  a_id text; a_qty numeric;
  v_item_key text;
begin
  select * into s from public.vendor_services where id = p_vendor_service_id;
  if not found then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['listing_not_found']); end if;
  select * into reg from public.sambramo_trade_registry where id = public.sambramo_trade_id(s.category);
  if not found then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['trade_not_on_engine']); end if;

  -- Anchor & MC keeps its own, unchanged engine.
  if reg.id = 'anchor_mc' then
    return public.resolve_anchor_booking(p_vendor_service_id, p_req)
      || jsonb_build_object('trade_id', reg.id, 'trade_name', reg.name, 'trade_code', reg.code,
                            'platform_fee_rate', public.sambramo_trade_fee(reg.id), 'reservations', '[]'::jsonb);
  end if;

  select * into cfg from public.sambramo_pricing_config limit 1;
  select * into vd from public.vendors where id = s.vendor_id;
  if d is null then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['date_required']); end if;
  d_end := greatest(d, coalesce(nullif(p_req->>'end_date', '')::date, d + (v_days - 1)));
  v_days := (d_end - d) + 1;

  -- The version that prices this DATE: a seasonal one covering it, else the live one.
  select * into lv from public.sambramo_listing_versions
   where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is not null
     and d between effective_from and effective_to order by version desc limit 1;
  if not found then
    select * into lv from public.sambramo_listing_versions
     where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is null limit 1;
  end if;
  -- A legacy listing that never re-listed on the new engine is not bookable.
  if not found then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['relist_required']); end if;
  br := lv.booking_rules; tr := lv.travel_rules; ans := lv.answers;
  v_fee := public.sambramo_trade_fee(reg.id);

  -- The time window the booking occupies (IST).
  v_start_at := (d + v_start) at time zone 'Asia/Kolkata';
  v_end_at := case when v_hours > 0 and v_days = 1 then v_start_at + make_interval(secs => (v_hours * 3600)::double precision)
                   else ((d_end + 1)::timestamp) at time zone 'Asia/Kolkata' end;

  -- ── Can this partner do it at all? ─────────────────────────────────
  if not coalesce(vd.is_verified, false) then hard := array_append(hard, 'partner_not_verified'); end if;
  if coalesce(vd.accepting_jobs, true) = false then hard := array_append(hard, 'partner_paused'); end if;
  if v_event is not null and jsonb_typeof(ans->'events') = 'array' and jsonb_array_length(ans->'events') > 0
     and not (ans->'events' ? v_event) then
    hard := array_append(hard, 'event_not_hosted');
  end if;
  v_lead := d - current_date;
  if v_lead < coalesce((br->>'min_notice_days')::integer, 0) then hard := array_append(hard, 'short_notice'); end if;
  if br ? 'horizon_months' and d > current_date + make_interval(months => (br->>'horizon_months')::integer) then
    hard := array_append(hard, 'beyond_booking_window');
  end if;

  -- ── The date(s) ────────────────────────────────────────────────────
  select * into avail from public.vendor_availability where vendor_id = vd.id and slot_date = d;
  v_found := found;
  if v_found and avail.status = 'BLOCKED' then hard := array_append(hard, 'date_blocked');
  elsif not v_found and not public.weekday_is_open(vd.id, d) then hard := array_append(hard, 'weekday_closed');
  elsif reg.archetype in ('TIME_PERFORMER','PERSONAL_SERVICE')
        and not exists (select 1 from public.sambramo_resources r where r.vendor_service_id = s.id and r.active) then
    -- No declared resources: the day count is the capacity (same rule as Anchor).
    select count(*) into v_booked from dispatch_offers o
      join booking_lines l on l.id = o.line_id join booking_requests r on r.id = l.request_id
     where o.vendor_id = vd.id and o.status = 'ACCEPTED' and r.event_date = d and l.status not in ('cancelled','expired');
    v_cap := coalesce(case when v_found then avail.slots_total end, vd.max_events_per_day, 1);
    if v_booked >= v_cap then hard := array_append(hard, 'date_full'); end if;
  end if;

  if cardinality(hard) > 0 then
    return jsonb_build_object('path','NOT_ELIGIBLE','reasons', hard, 'listing_version_id', lv.id, 'trade_id', reg.id);
  end if;

  -- ══ Base price, by archetype ═══════════════════════════════════════

  -- A named package (tier trades, decoration / planning packages) wins when asked for.
  if v_pkg_key is not null then
    select p.id, p.name, p.commercial_inputs, p.trade_inputs into pkg from public.sambramo_trade_packages p
     where p.listing_version_id = lv.id and p.status = 'LIVE' and upper(p.commercial_inputs->>'tier') = v_pkg_key limit 1;
    if found then
      v_base := (pkg.trade_inputs->>'take_home_paise')::bigint;
      v_inc_hours := nullif(pkg.trade_inputs->>'duration_hours', '')::numeric;
      v_pkg_id := pkg.id; v_pkg_inclusions := coalesce(pkg.commercial_inputs->'inclusions', '[]'::jsonb);
      v_basis := 'package';
      lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','package','source_id', pkg.id,
        'description', pkg.name, 'qty', 1, 'unit', 'package', 'take_home_paise', v_base, 'hours', v_inc_hours));
    else
      soft := array_append(soft, 'package_not_found');
    end if;
  end if;

  if v_basis is null and cardinality(soft) = 0 then
    case reg.archetype

    -- ── People booked for time ─────────────────────────────────────
    when 'TIME_PERFORMER' then
      if v_hours <= 0 then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['hours_required']); end if;
      v_item_key := nullif(p_req->'items'->0->>'item_key', '');
      if v_item_key is not null then
        -- A coverage package / act / ceremony from the partner's catalogue:
        -- its price covers its own hours (or minutes); beyond that is overtime.
        select * into it from public.sambramo_catalogue_items where listing_version_id = lv.id and item_key = v_item_key and active;
        if not found or it.take_home_paise is null then soft := array_append(soft, 'item_not_priced');
        else
          v_base := it.take_home_paise * v_days; v_basis := 'catalogue';
          v_inc_hours := coalesce((it.attributes->>'hours')::numeric, (it.attributes->>'minutes')::numeric / 60.0, v_hours);
          lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','item','source_id', it.id,
            'description', it.name || case when v_days > 1 then ' × ' || v_days || ' days' else '' end,
            'qty', v_days, 'unit', 'package', 'take_home_paise', v_base, 'hours', v_inc_hours));
        end if;
      elsif v_days > 1 then
        select * into rule from public.sambramo_rate_rules where listing_version_id = lv.id and rule_kind = 'multi_day' limit 1;
        if found and v_days <= coalesce((rule.multi_day->>'max_days')::integer, 99) then
          v_base := round(rule.take_home_paise * v_days * (1 - coalesce((rule.multi_day->>'consecutive_discount_pct')::numeric, 0) / 100.0))::bigint;
          v_basis := 'multi_day'; v_inc_hours := v_hours;
          lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','rule','source_id', rule.id,
            'description', v_days || ' days', 'qty', v_days, 'unit', 'day', 'take_home_paise', v_base));
        else
          select * into rule from public.sambramo_rate_rules where listing_version_id = lv.id and rule_kind = 'full_day' limit 1;
          if found then
            v_base := rule.take_home_paise * v_days; v_basis := 'full_day'; v_inc_hours := coalesce(rule.included_hours, 8);
            lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','rule','source_id', rule.id,
              'description', v_days || ' full days', 'qty', v_days, 'unit', 'day', 'take_home_paise', v_base));
          else
            soft := array_append(soft, 'multi_day_not_priced');
          end if;
        end if;
      else
        select * into rule from public.sambramo_rate_rules where listing_version_id = lv.id and rule_kind = 'hour'
           and (v_kind is null or v_kind = 'hour') limit 1;
        if found and v_hours <= coalesce(rule.max_hours, 24) then
          v_inc_hours := greatest(v_hours, coalesce(rule.min_hours, rule.min_qty, 0));
          v_base := round(rule.take_home_paise * v_inc_hours)::bigint; v_basis := 'hour';
          lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','rule','source_id', rule.id,
            'description', v_inc_hours || ' hours', 'qty', v_inc_hours, 'unit', 'hour', 'take_home_paise', v_base));
        else
          select * into rule from public.sambramo_rate_rules
           where listing_version_id = lv.id and rule_kind in ('session','event','half_day','full_day')
             and (v_kind is null or rule_kind = v_kind)
             and coalesce(included_hours, case rule_kind when 'half_day' then 4 when 'full_day' then 8 else 0 end) >= v_hours
           order by coalesce(included_hours, 0), take_home_paise limit 1;
          if found then
            v_base := rule.take_home_paise; v_basis := rule.rule_kind;
            v_inc_hours := coalesce(rule.included_hours, case rule.rule_kind when 'half_day' then 4 when 'full_day' then 8 else v_hours end);
            lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','rule','source_id', rule.id,
              'description', coalesce(rule.label, initcap(replace(rule.rule_kind, '_', ' '))), 'qty', 1, 'unit', rule.rule_kind,
              'take_home_paise', v_base, 'hours', v_inc_hours));
          else
            soft := array_append(soft, 'no_rule_fits_duration');
          end if;
        end if;
      end if;

    -- ── Per person / look / hand, artists × appointment time ───────
    when 'PERSONAL_SERVICE' then
      v_total_minutes := 0; v_base := 0;
      for x in select * from jsonb_array_elements(coalesce(p_req->'items', '[]'::jsonb)) loop
        select * into it from public.sambramo_catalogue_items
         where listing_version_id = lv.id and item_key = x->>'item_key' and active;
        v_qty := greatest(1, coalesce((x->>'qty')::numeric, 1));
        if not found then soft := soft || ('item_not_offered_' || coalesce(x->>'item_key', '?'));
        elsif it.take_home_paise is null then soft := soft || ('item_quote_only_' || it.item_key);
        else
          v_amt := (it.take_home_paise * v_qty)::bigint; v_base := v_base + v_amt;
          v_total_minutes := v_total_minutes + coalesce((it.attributes->>'minutes')::numeric, 0) * v_qty;
          lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','item','source_id', it.id,
            'description', it.name, 'qty', v_qty, 'unit', coalesce(it.attributes->>'price_unit', it.unit), 'take_home_paise', v_amt));
        end if;
      end loop;
      if jsonb_array_length(coalesce(p_req->'items', '[]'::jsonb)) = 0 then
        select * into rule from public.sambramo_rate_rules where listing_version_id = lv.id and rule_kind = 'per_person' limit 1;
        if found and v_guests > 0 then
          v_base := rule.take_home_paise * v_guests;
          lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','rule','source_id', rule.id,
            'description', v_guests || ' people', 'qty', v_guests, 'unit', 'person', 'take_home_paise', v_base));
        else
          soft := array_append(soft, 'choose_services');
        end if;
      end if;
      v_basis := 'personal';
      -- Does the total appointment time fit the window with the artists free?
      select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.kind = 'staff' order by r.quantity desc limit 1;
      if found and v_total_minutes > 0 then
        v_hours := greatest(v_hours, 1);
        v_qty := ceil(v_total_minutes / (v_hours * 60));
        v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
        if v_qty > coalesce(v_free, 0) then soft := array_append(soft, 'schedule_overflow');
        else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', v_qty, 'start_at', v_start_at, 'end_at', v_end_at));
        end if;
      end if;

    -- ── Headcount × hours / shifts / days ──────────────────────────
    when 'STAFFING' then
      v_min_staff := coalesce((br->>'min_staff')::integer, 1);
      if v_staff <= 0 then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['staff_required']); end if;
      v_staff := greatest(v_staff, v_min_staff);
      if v_hours <= 0 then v_hours := 8; end if;
      -- A role from the partner's catalogue carries its own rate and unit.
      v_item_key := nullif(p_req->'items'->0->>'item_key', '');
      if v_item_key is not null then
        select * into it from public.sambramo_catalogue_items where listing_version_id = lv.id and item_key = v_item_key and active;
        if not found or it.take_home_paise is null then soft := array_append(soft, 'role_not_priced');
        else
          v_staff := greatest(v_staff, coalesce(it.min_qty, 1)::integer);
          if it.max_qty is not null and v_staff > it.max_qty then soft := array_append(soft, 'more_staff_than_role_allows'); end if;
          v_qty := v_staff * case lower(coalesce(it.attributes->>'rate_unit', it.unit, 'hour'))
                     when 'shift' then ceil(v_hours / coalesce((it.attributes->>'shift_hours')::numeric, 8))
                     when 'day' then 1 when 'event' then 1 else v_hours end * v_days;
          v_base := (it.take_home_paise * v_qty)::bigint; v_basis := 'role'; v_inc_hours := v_hours;
          lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','item','source_id', it.id,
            'description', v_staff || ' × ' || it.name, 'qty', v_qty, 'unit', coalesce(it.attributes->>'rate_unit', it.unit),
            'take_home_paise', v_base));
        end if;
      end if;
      select * into rule from public.sambramo_rate_rules
       where listing_version_id = lv.id and rule_kind in ('per_staff_hour','per_staff_shift','per_staff_day','event')
         and (v_kind is null or rule_kind = v_kind)
       order by case rule_kind when 'per_staff_hour' then 0 when 'per_staff_shift' then 1 when 'per_staff_day' then 2 else 3 end limit 1;
      if v_basis = 'role' then null;
      elsif not found then soft := array_append(soft, 'no_staff_rate');
      else
        v_qty := case rule.rule_kind
          when 'per_staff_hour' then v_staff * greatest(v_hours, coalesce(rule.min_qty, 0)) * v_days
          when 'per_staff_shift' then v_staff * ceil(v_hours / coalesce(nullif(rule.included_qty, 0), 8)) * v_days
          when 'per_staff_day' then v_staff * v_days
          else 1 end;
        v_inc_hours := case rule.rule_kind when 'per_staff_shift' then ceil(v_hours / coalesce(nullif(rule.included_qty, 0), 8)) * coalesce(nullif(rule.included_qty, 0), 8)
                                           else v_hours end;
        v_base := (rule.take_home_paise * v_qty)::bigint; v_basis := rule.rule_kind;
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','rule','source_id', rule.id,
          'description', v_staff || ' × ' || coalesce(rule.label, replace(rule.rule_kind, '_', ' ')), 'qty', v_qty,
          'unit', rule.unit, 'take_home_paise', v_base));
      end if;
      select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.kind = 'staff' order by r.quantity desc limit 1;
      if not found then soft := array_append(soft, 'no_roster');
      else
        v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
        if v_staff > coalesce(v_free, 0) then soft := array_append(soft, 'not_enough_staff');
        else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', v_staff, 'start_at', v_start_at, 'end_at', v_end_at));
        end if;
      end if;

    -- ── Per guest / plate, menus and bands ─────────────────────────
    when 'PER_GUEST_FOOD' then
      if v_guests <= 0 then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['guests_required']); end if;
      v_item_key := nullif(p_req->'items'->0->>'item_key', '');
      if v_item_key is not null then
        select * into it from public.sambramo_catalogue_items where listing_version_id = lv.id and item_key = v_item_key and active;
        if not found or it.take_home_paise is null then soft := array_append(soft, 'menu_not_priced');
        else
          v_qty := greatest(v_guests, it.min_qty);
          if it.max_qty is not null and v_guests > it.max_qty then soft := array_append(soft, 'over_capacity'); end if;
          select b into v_band from jsonb_array_elements(it.qty_bands) b
           where v_qty >= (b->>'from')::numeric and v_qty <= coalesce((b->>'to')::numeric, 1e12) limit 1;
          v_unit_paise := coalesce((v_band->>'take_home_paise')::bigint, it.take_home_paise);
          v_base := (v_unit_paise * v_qty)::bigint; v_basis := 'menu';
          lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','item','source_id', it.id,
            'description', it.name || ' × ' || v_qty || ' guests', 'qty', v_qty, 'unit', 'guest', 'take_home_paise', v_base));
        end if;
      else
        select * into rule from public.sambramo_rate_rules where listing_version_id = lv.id and rule_kind = 'per_guest' limit 1;
        if not found then soft := array_append(soft, 'choose_menu');
        else
          v_qty := greatest(v_guests, coalesce(rule.min_qty, 0));
          if rule.max_qty is not null and v_guests > rule.max_qty then soft := array_append(soft, 'over_capacity'); end if;
          select b into v_band from jsonb_array_elements(rule.bands) b
           where v_qty >= (b->>'from')::numeric and v_qty <= coalesce((b->>'to')::numeric, 1e12) limit 1;
          v_unit_paise := coalesce((v_band->>'take_home_paise')::bigint, rule.take_home_paise);
          v_base := (v_unit_paise * v_qty)::bigint; v_basis := 'per_guest';
          lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','rule','source_id', rule.id,
            'description', v_qty || ' guests', 'qty', v_qty, 'unit', 'guest', 'take_home_paise', v_base));
        end if;
      end if;
      select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.kind = 'capacity' limit 1;
      if found then
        v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
        if v_guests > coalesce(v_free, 0) then soft := array_append(soft, 'over_capacity');
        else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', v_guests, 'start_at', v_start_at, 'end_at', v_end_at));
        end if;
      end if;

    -- ── Items × quantity, bands, lead time, production capacity ────
    when 'CATALOGUE_PRODUCT' then
      v_base := 0; v_qty := 0;
      if jsonb_array_length(coalesce(p_req->'items', '[]'::jsonb)) = 0 then soft := array_append(soft, 'choose_items'); end if;
      for x in select * from jsonb_array_elements(coalesce(p_req->'items', '[]'::jsonb)) loop
        select * into it from public.sambramo_catalogue_items where listing_version_id = lv.id and item_key = x->>'item_key' and active;
        a_qty := greatest(1, coalesce((x->>'qty')::numeric, 1));
        if not found then soft := soft || ('item_not_offered_' || coalesce(x->>'item_key', '?')); continue; end if;
        if it.take_home_paise is null then soft := soft || ('item_quote_only_' || it.item_key); continue; end if;
        if a_qty < it.min_qty then soft := soft || ('below_minimum_' || it.item_key); end if;
        if it.max_qty is not null and a_qty > it.max_qty then soft := soft || ('above_maximum_' || it.item_key); end if;
        if it.stock_qty is not null and a_qty > it.stock_qty then soft := soft || ('over_stock_' || it.item_key); end if;
        if it.lead_days > v_lead then soft := soft || ('lead_time_' || it.item_key); end if;
        v_band := null;
        select b into v_band from jsonb_array_elements(it.qty_bands) b
         where a_qty >= (b->>'from')::numeric and a_qty <= coalesce((b->>'to')::numeric, 1e12) limit 1;
        v_unit_paise := coalesce((v_band->>'take_home_paise')::bigint, it.take_home_paise);
        v_amt := (v_unit_paise * a_qty)::bigint; v_base := v_base + v_amt; v_qty := v_qty + a_qty;
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','item','source_id', it.id,
          'description', it.name, 'qty', a_qty, 'unit', it.unit, 'unit_take_home_paise', v_unit_paise, 'take_home_paise', v_amt));
      end loop;
      v_basis := 'catalogue';
      select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.kind = 'production' order by r.quantity desc limit 1;
      if found and v_qty > 0 then
        v_free := public.sambramo_resource_free(rs.id, (d::timestamp) at time zone 'Asia/Kolkata', ((d + 1)::timestamp) at time zone 'Asia/Kolkata');
        if v_qty > coalesce(v_free, 0) then soft := array_append(soft, 'over_production_capacity');
        else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', v_qty,
          'start_at', (d::timestamp) at time zone 'Asia/Kolkata', 'end_at', ((d + 1)::timestamp) at time zone 'Asia/Kolkata'));
        end if;
      end if;

    -- ── Items × quantity × rental periods; stock over the whole period ──
    when 'RENTAL_INVENTORY' then
      v_base := 0;
      if jsonb_array_length(coalesce(p_req->'items', '[]'::jsonb)) = 0 then soft := array_append(soft, 'choose_items'); end if;
      for x in select * from jsonb_array_elements(coalesce(p_req->'items', '[]'::jsonb)) loop
        select * into it from public.sambramo_catalogue_items where listing_version_id = lv.id and item_key = x->>'item_key' and active;
        a_qty := greatest(1, coalesce((x->>'qty')::numeric, 1));
        if not found then soft := soft || ('item_not_offered_' || coalesce(x->>'item_key', '?')); continue; end if;
        if it.take_home_paise is null then soft := soft || ('item_quote_only_' || it.item_key); continue; end if;
        v_periods := case lower(coalesce(it.attributes->>'rate_period', 'day'))
          when 'hour' then greatest(1, ceil(case when v_hours > 0 then v_hours else 8 end)) * v_days
          when 'event' then 1
          else v_days end;
        v_amt := (it.take_home_paise * a_qty * v_periods)::bigint; v_base := v_base + v_amt;
        v_deposit := v_deposit + coalesce(it.deposit_paise, 0) * a_qty;
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','item','source_id', it.id,
          'description', it.name || ' × ' || a_qty, 'qty', a_qty * v_periods, 'unit', 'item_' || lower(coalesce(it.attributes->>'rate_period', 'day')),
          'take_home_paise', v_amt));
        select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.resource_key = it.item_key;
        if found then
          v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
        else
          v_free := it.stock_qty;
        end if;
        if a_qty > coalesce(v_free, 0) then soft := soft || ('over_stock_' || it.item_key);
        elsif rs.id is not null then
          res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', a_qty, 'start_at', v_start_at, 'end_at', v_end_at));
        end if;
      end loop;
      v_basis := 'rental';

    -- ── Trips: distance by a fixed policy, vehicle + driver reserved ──
    when 'TRIP_VEHICLE' then
      v_item_key := nullif(p_req->'items'->0->>'item_key', '');
      if reg.catalogue_key is null then
        -- Coordination trades (Transportation) have no fleet of their own to price against.
        soft := array_append(soft, 'route_needs_quote');
      else
      select * into it from public.sambramo_catalogue_items where listing_version_id = lv.id and item_key = v_item_key and active;
      if v_item_key is null or not found then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['choose_vehicle']); end if;
      if coalesce((p_req->>'passengers')::integer, 0) > coalesce((it.attributes->>'seats')::integer, 1e6::integer) then soft := array_append(soft, 'not_enough_seats'); end if;
      if coalesce((p_req->>'weight_kg')::numeric, 0) > coalesce((it.attributes->>'payload_kg')::numeric, 1e9) then soft := array_append(soft, 'over_payload'); end if;
      -- Road km = straight line × 1.25, both legs if returning. Stops without
      -- coordinates cannot be priced deterministically.
      if (p_req->'pickup' ? 'lat') and (p_req->'dropoff' ? 'lat') then
        v_trip_km := round((ST_Distance(
          public.point_of((p_req->'pickup'->>'lat')::double precision, (p_req->'pickup'->>'lng')::double precision),
          public.point_of((p_req->'dropoff'->>'lat')::double precision, (p_req->'dropoff'->>'lng')::double precision)) / 1000.0 * 1.25)::numeric, 1);
        if coalesce((p_req->>'return')::boolean, false) then v_trip_km := v_trip_km * 2; end if;
      end if;
      if coalesce((p_req->>'stops')::integer, 0) > 0 and not exists (select 1 from jsonb_array_elements(br->'charges') c where c->>'role' = 'per_stop') then
        soft := array_append(soft, 'stops_not_priced');
      end if;
      select * into rule from public.sambramo_rate_rules
       where listing_version_id = lv.id and rule_kind in ('per_trip','per_km','vehicle_hour','vehicle_day','fixed')
         and (v_kind is null or rule_kind = v_kind)
         and (label is null or label = it.name or label = it.category)
       order by (label is not null) desc,
                case rule_kind when 'per_trip' then 0 when 'per_km' then 1 when 'vehicle_hour' then 2 when 'vehicle_day' then 3 else 4 end
       limit 1;
      if not found then soft := array_append(soft, 'no_trip_rate');
      elsif rule.rule_kind in ('per_trip','per_km') and v_trip_km is null then soft := array_append(soft, 'route_unresolved');
      else
        v_qty := case rule.rule_kind when 'per_km' then greatest(v_trip_km, coalesce(rule.min_qty, 0))
                                     when 'vehicle_hour' then greatest(case when v_hours > 0 then v_hours else 4 end, coalesce(rule.min_qty, 0))
                                     when 'vehicle_day' then v_days else 1 end;
        v_base := (rule.take_home_paise * v_qty)::bigint; v_basis := rule.rule_kind;
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','rule','source_id', rule.id,
          'description', it.name || ' · ' || coalesce(rule.label, replace(rule.rule_kind, '_', ' ')), 'qty', v_qty, 'unit', rule.rule_kind,
          'take_home_paise', v_base, 'distance_km', v_trip_km));
        -- Kilometres beyond what a per-trip fare includes.
        if rule.rule_kind = 'per_trip' and v_trip_km > coalesce(rule.included_qty, (ans->>'included_km')::numeric, 1e9) then
          select c into ch from jsonb_array_elements(br->'charges') c where c->>'role' = 'km_beyond' limit 1;
          v_extra := ceil(v_trip_km - coalesce(rule.included_qty, (ans->>'included_km')::numeric));
          if ch is null then soft := array_append(soft, 'km_beyond_not_priced');
          else lines := lines || jsonb_build_array(jsonb_build_object('kind','distance','source','charge','source_id', ch->>'id',
            'description', v_extra || ' km beyond the fare', 'qty', v_extra, 'unit', 'km',
            'take_home_paise', ((ch->>'take_home_paise')::bigint * v_extra)::bigint));
          end if;
        end if;
      end if;
      -- The vehicle and a driver for the whole window, plus turnaround.
      if v_hours <= 0 then
        v_end_at := v_start_at + make_interval(secs => (greatest(2, coalesce(v_trip_km, 0) / 25.0 + 1) * 3600)::double precision);
      end if;
      for rs in select r.* from public.sambramo_resources r where r.vendor_service_id = s.id and r.active
                 and (r.resource_key = it.item_key or r.kind = 'staff') loop
        v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
        if coalesce(v_free, 0) < 1 then soft := soft || case when rs.kind = 'staff' then 'no_driver_free' else 'vehicle_not_free' end;
        else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', 1, 'start_at', v_start_at, 'end_at', v_end_at));
        end if;
      end loop;
      if not exists (select 1 from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.resource_key = it.item_key) then
        soft := array_append(soft, 'vehicle_not_tracked');
      end if;
      end if;  -- has a fleet

    -- ── A space for a slot; capacity and overtime ──────────────────
    when 'VENUE_SPACE' then
      v_item_key := nullif(p_req->'items'->0->>'item_key', '');
      select * into it from public.sambramo_catalogue_items where listing_version_id = lv.id and item_key = v_item_key and active;
      if v_item_key is null or not found then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['choose_space']); end if;
      if v_guests > coalesce((it.attributes->>'capacity')::integer, 1e6::integer) then soft := array_append(soft, 'over_capacity'); end if;
      if it.take_home_paise is null then soft := array_append(soft, 'space_not_priced');
      else
        if v_hours <= 0 then v_hours := coalesce((it.attributes->>'included_hours')::numeric, 4); end if;
        v_inc_hours := coalesce((it.attributes->>'included_hours')::numeric, v_hours);
        v_base := it.take_home_paise * v_days; v_basis := 'space';
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','item','source_id', it.id,
          'description', it.name || case when v_days > 1 then ' × ' || v_days || ' days' else '' end,
          'qty', v_days, 'unit', 'slot', 'take_home_paise', v_base, 'hours', v_inc_hours));
      end if;
      -- Setup before and cleanup after are part of the hold.
      v_start_at := v_start_at - make_interval(hours => coalesce((ans->>'setup_hours')::integer, 0));
      v_end_at := greatest(v_end_at, v_start_at + make_interval(secs => (v_hours * 3600)::double precision))
                  + make_interval(hours => coalesce((ans->>'cleanup_hours')::integer, 0));
      select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.resource_key = it.item_key;
      if not found then soft := array_append(soft, 'space_not_tracked');
      else
        v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
        if coalesce(v_free, 0) < 1 then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['space_booked'], 'listing_version_id', lv.id); end if;
        res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', 1, 'start_at', v_start_at, 'end_at', v_end_at));
      end if;

    -- ── Capacity × storage period ──────────────────────────────────
    when 'STORAGE_CAPACITY' then
      v_qty := coalesce(nullif(p_req->>'qty', '')::numeric, nullif(p_req->'items'->0->>'qty', '')::numeric, 0);
      if v_qty <= 0 then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['quantity_required']); end if;
      select * into rule from public.sambramo_rate_rules
       where listing_version_id = lv.id and rule_kind in ('capacity_period','per_unit','fixed') and (v_kind is null or rule_kind = v_kind)
       order by case rule_kind when 'capacity_period' then 0 when 'per_unit' then 1 else 2 end limit 1;
      if not found then soft := array_append(soft, 'no_storage_rate');
      else
        -- Partial periods round up to the partner's period.
        v_periods := case
          when coalesce(rule.label, rule.unit, '') ~* 'month' then ceil(v_days / 30.0)
          when coalesce(rule.label, rule.unit, '') ~* 'week' then ceil(v_days / 7.0)
          else v_days end;
        if v_periods < coalesce(rule.min_qty, 1) then v_periods := coalesce(rule.min_qty, 1); end if;
        v_base := (rule.take_home_paise * v_qty * case when rule.rule_kind = 'fixed' then 1 else v_periods end)::bigint;
        v_basis := rule.rule_kind;
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','rule','source_id', rule.id,
          'description', v_qty || ' × ' || coalesce(rule.label, 'storage') || ' × ' || v_periods, 'qty', v_qty * v_periods,
          'unit', coalesce(rule.unit, 'capacity_period'), 'take_home_paise', v_base));
      end if;
      select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.kind = 'capacity' order by r.quantity desc limit 1;
      if not found then soft := array_append(soft, 'capacity_not_tracked');
      else
        v_start_at := (d::timestamp) at time zone 'Asia/Kolkata';
        v_end_at := ((d_end + 1)::timestamp) at time zone 'Asia/Kolkata';
        v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
        if v_qty > coalesce(v_free, 0) then soft := array_append(soft, 'over_capacity');
        else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', v_qty, 'start_at', v_start_at, 'end_at', v_end_at));
        end if;
      end if;

    -- ── Fixed-scope packages, otherwise a quote ─────────────────────
    else  -- PROJECT_QUOTE
      v_item_key := nullif(p_req->'items'->0->>'item_key', '');
      if v_item_key is not null then
        select * into it from public.sambramo_catalogue_items where listing_version_id = lv.id and item_key = v_item_key and active;
        if found and it.take_home_paise is not null then
          v_base := it.take_home_paise; v_basis := 'project_package';
          lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','item','source_id', it.id,
            'description', it.name, 'qty', 1, 'unit', 'package', 'take_home_paise', v_base));
          if v_guests > coalesce((it.attributes->>'max_guests')::integer, 1e6::integer) then soft := array_append(soft, 'over_package_scope'); end if;
        else
          soft := array_append(soft, 'custom_scope');
        end if;
      else
        soft := array_append(soft, 'custom_scope');
      end if;
    end case;
  end if;

  -- Concurrent projects / events for archetypes that hold the whole day(s).
  if reg.archetype in ('PROJECT_QUOTE','TIME_PERFORMER') then
    select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active
       and r.kind in ('project','staff') order by (r.kind = 'project') desc limit 1;
    if found then
      v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
      if coalesce(v_free, 0) < 1 then soft := array_append(soft, 'no_capacity_left');
      else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', 1, 'start_at', v_start_at, 'end_at', v_end_at));
      end if;
    end if;
  end if;

  -- ══ The partner's declared charges ═════════════════════════════════
  if v_base is not null then
    -- Overtime beyond the hours the base includes.
    if v_hours > coalesce(v_inc_hours, v_hours) then
      v_extra := ceil(v_hours - v_inc_hours);
      select c into ch from jsonb_array_elements(coalesce(br->'charges', '[]'::jsonb)) c where c->>'role' = 'overtime' limit 1;
      if ch is null then
        select * into rule from public.sambramo_rate_rules where listing_version_id = lv.id and extra_hour_take_home_paise is not null limit 1;
        if found then ch := jsonb_build_object('id', 'rule_extra_hour', 'take_home_paise', rule.extra_hour_take_home_paise); end if;
      end if;
      if ch is null then soft := array_append(soft, 'extra_hours_not_priced');
      else lines := lines || jsonb_build_array(jsonb_build_object('kind','extra_hours','source','charge','source_id', ch->>'id',
        'description', v_extra || ' extra hour' || case when v_extra > 1 then 's' else '' end, 'qty', v_extra, 'unit', 'hour',
        'take_home_paise', ((ch->>'take_home_paise')::bigint * v_extra * greatest(1, case when reg.archetype = 'STAFFING' then v_staff else 1 end))::bigint));
      end if;
    end if;

    for ch in select * from jsonb_array_elements(coalesce(br->'charges', '[]'::jsonb)) loop
      case ch->>'role'
        when 'fixed_fee' then
          lines := lines || jsonb_build_array(jsonb_build_object('kind','fee','source','charge','source_id', ch->>'id',
            'description', ch->>'label', 'qty', 1, 'unit', 'booking', 'take_home_paise', (ch->>'take_home_paise')::bigint));
        when 'waiting' then
          if coalesce((p_req->>'waiting_hours')::numeric, 0) > 0 then
            lines := lines || jsonb_build_array(jsonb_build_object('kind','waiting','source','charge','source_id', ch->>'id',
              'description', ceil((p_req->>'waiting_hours')::numeric) || ' h waiting', 'qty', ceil((p_req->>'waiting_hours')::numeric), 'unit', 'hour',
              'take_home_paise', ((ch->>'take_home_paise')::bigint * ceil((p_req->>'waiting_hours')::numeric))::bigint));
          end if;
        when 'per_stop' then
          if coalesce((p_req->>'stops')::integer, 0) > 0 then
            lines := lines || jsonb_build_array(jsonb_build_object('kind','stops','source','charge','source_id', ch->>'id',
              'description', (p_req->>'stops') || ' extra stop(s)', 'qty', (p_req->>'stops')::integer, 'unit', 'stop',
              'take_home_paise', ((ch->>'take_home_paise')::bigint * (p_req->>'stops')::integer)::bigint));
          end if;
        when 'night' then
          if (v_end_at at time zone 'Asia/Kolkata')::time > coalesce(nullif(br->>'night_after', '')::time, '22:00'::time)
             or (v_end_at at time zone 'Asia/Kolkata')::date > d_end then
            lines := lines || jsonb_build_array(jsonb_build_object('kind','surcharge','source','charge','source_id', ch->>'id',
              'description', ch->>'label', 'qty', 1, 'unit', 'booking', 'take_home_paise', (ch->>'take_home_paise')::bigint));
          end if;
        when 'early_start' then
          if v_start < coalesce(nullif(br->>'early_before', '')::time, '07:00'::time) then
            lines := lines || jsonb_build_array(jsonb_build_object('kind','surcharge','source','charge','source_id', ch->>'id',
              'description', ch->>'label', 'qty', 1, 'unit', 'booking', 'take_home_paise', (ch->>'take_home_paise')::bigint));
          end if;
        when 'deposit' then
          v_deposit := v_deposit + (ch->>'take_home_paise')::bigint;
        else null;
      end case;
    end loop;
  end if;

  -- ══ Add-ons: included ones at ₹0, never charged twice ══════════════
  for x in select * from jsonb_array_elements(coalesce(p_req->'addons', '[]'::jsonb)) loop
    a_id := case jsonb_typeof(x) when 'string' then x #>> '{}' else x->>'id' end;
    a_qty := case jsonb_typeof(x) when 'object' then nullif(x->>'qty', '')::numeric end;
    select * into ar from public.sambramo_addon_rules where listing_version_id = lv.id and addon_id = a_id;
    if not found then
      soft := soft || ('addon_not_offered_' || a_id);
    elsif v_pkg_inclusions ? a_id or (v_pkg_key is not null and v_pkg_key = any(ar.included_in)) then
      lines := lines || jsonb_build_array(jsonb_build_object('kind','addon','addon_id', a_id, 'description', ar.label || ' (included)', 'qty', 1, 'take_home_paise', 0));
    elsif ar.notice_days > v_lead then
      soft := soft || ('addon_short_notice_' || a_id);
    else
      v_qty := coalesce(a_qty, case ar.unit
        when 'per_hour' then ceil(greatest(v_hours, 1)) when 'per_day' then v_days
        when 'per_person' then greatest(v_guests, 1) when 'per_guest' then greatest(v_guests, 1)
        when 'per_staff' then greatest(v_staff, 1) when 'per_km' then coalesce(v_trip_km, 0)
        else 1 end);
      lines := lines || jsonb_build_array(jsonb_build_object('kind','addon','addon_id', a_id, 'source','addon','source_id', ar.id,
        'description', ar.label, 'qty', v_qty, 'unit', ar.unit, 'take_home_paise', (ar.take_home_paise * v_qty)::bigint));
    end if;
  end loop;

  -- ══ Travel to the venue (not for trips — distance is the product) ══
  if reg.archetype <> 'TRIP_VEHICLE' and (p_req ? 'lat') and (p_req ? 'lng') and vd.location is not null then
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
          soft := array_append(soft, 'outside_travel_area');
      end case;
    end if;
  end if;

  -- ══ Minimum charge: top up, never silently ════════════════════════
  select coalesce(sum((l->>'take_home_paise')::bigint), 0) into v_take from jsonb_array_elements(lines) l;
  select c into ch from jsonb_array_elements(coalesce(br->'charges', '[]'::jsonb)) c where c->>'role' = 'minimum'
   order by (c->>'take_home_paise')::bigint desc limit 1;
  if v_base is not null and ch is not null and v_take < (ch->>'take_home_paise')::bigint then
    lines := lines || jsonb_build_array(jsonb_build_object('kind','minimum','source','charge','source_id', ch->>'id',
      'description', 'Minimum charge top-up', 'qty', 1, 'unit', 'booking', 'take_home_paise', (ch->>'take_home_paise')::bigint - v_take));
    v_take := (ch->>'take_home_paise')::bigint;
  end if;

  -- ══ Ready to be booked AND paid instantly? ════════════════════════
  if coalesce((br->>'instant')::boolean, true) = false then soft := array_append(soft, 'instant_booking_off'); end if;
  select coalesce(p.require_payout_for_instant, cfg.require_payout_for_instant, true) into v_require_payout
    from public.sambramo_trade_pricing_policy p where p.trade_id = reg.id;
  if coalesce(v_require_payout, true) and not exists (
       select 1 from public.partner_payout_accounts pa where pa.vendor_id = vd.id and pa.route_account_id is not null) then
    soft := array_append(soft, 'partner_payout_not_active');
  end if;
  -- Licences the trade needs before instant booking.
  for x in select * from jsonb_array_elements(reg.compliance) loop
    if coalesce((x->>'blocks_instant')::boolean, false)
       and (coalesce((x->>'always')::boolean, false) or public.sambramo_cond_holds(x->'when', ans))
       and not exists (select 1 from public.vendor_documents vdoc where vdoc.vendor_id = vd.id
                        and vdoc.requirement_id = x->>'doc' and vdoc.status = 'accepted') then
      soft := soft || ('licence_pending_' || lower(replace(x->>'doc', 'VER-TRADE-', '')));
    end if;
  end loop;

  v_customer := (round(v_take / (1 - v_fee) / 10) * 10)::bigint;
  v_adv := coalesce((br->>'advance_pct')::integer, 100);
  v_advance := least(v_customer, (round(v_customer * v_adv / 100.0 / 10) * 10)::bigint);

  v_path := case when cardinality(soft) > 0 or v_base is null then 'QUOTE' else 'INSTANT' end;
  if v_path = 'QUOTE' and coalesce((br->>'custom_quotes')::boolean, true) = false then
    return jsonb_build_object('path','NOT_ELIGIBLE','reasons', soft || array['custom_quotes_off'], 'listing_version_id', lv.id, 'trade_id', reg.id);
  end if;

  return jsonb_build_object(
    'path', v_path,
    'reasons', soft,
    'trade_id', reg.id, 'trade_name', reg.name, 'trade_code', reg.code, 'archetype', reg.archetype,
    'vendor_id', vd.id,
    'listing_version_id', lv.id,
    'seasonal', lv.seasonal_window_id is not null,
    'package_id', v_pkg_id,
    'basis', v_basis,
    'lines', (select coalesce(jsonb_agg(l || jsonb_build_object('customer_paise',
                (round((l->>'take_home_paise')::bigint / (1 - v_fee) / 10) * 10)::bigint)), '[]'::jsonb)
                from jsonb_array_elements(lines) l),
    'take_home_paise', v_take,
    'customer_paise', v_customer,
    'platform_fee_rate', v_fee,
    'platform_fee_paise', v_customer - v_take,
    'deposit_paise', v_deposit,
    'advance_pct', v_adv,
    'advance_paise', v_advance,
    'balance_paise', v_customer - v_advance,
    'distance_km', coalesce(v_trip_km, v_km),
    'reservations', res,
    'window', jsonb_build_object('start_at', v_start_at, 'end_at', v_end_at),
    'cancellation', br->>'cancellation',
    'quote_hours', br->>'quote_hours'
  );
end;
$$;
revoke all on function public.resolve_booking(uuid, jsonb) from public;
grant execute on function public.resolve_booking(uuid, jsonb) to anon, authenticated, service_role;

commit;
