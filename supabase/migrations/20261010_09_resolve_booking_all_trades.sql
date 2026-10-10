-- The booking decision engine for every trade, and the atomic write that
-- reserves what a booking uses.
--
-- resolve_booking(service, request) decides INSTANT / QUOTE / NOT_ELIGIBLE
-- against one partner's PUBLISHED listing version, exactly like
-- resolve_anchor_booking (20261010_05) — which it calls for Anchor & MC, so
-- Anchor's behaviour does not change by a paise.
--
-- Shared gates: live version, verified, not paused, notice, horizon, the date.
-- Then one pricer per archetype (time, personal service, staffing, per-guest,
-- catalogue, rental, trip, venue, storage, project), then the partner's
-- declared charges (booking_rules.charges: minimum, fixed fees, overtime,
-- waiting, km beyond, stops, night, early start, deposit), add-ons, travel,
-- and the instant-booking gates. It never invents an amount: anything it
-- cannot price is a QUOTE reason. Each line records its source rule / item.
--
-- What a booking uses (staff, a vehicle, stock, a space, capacity) is returned
-- as `reservations`; book_partner_line now takes them inside the same vendor
-- lock and refuses the booking if any would be over-committed.
--
-- Request (all optional unless the archetype needs it):
--   event_date, end_date, start_time 'HH:MM', hours, days, guests, staff,
--   items [{item_key, qty}], package (key), rule_kind, event_category,
--   addons [id | {id, qty}], lat/lng (venue), pickup {lat,lng}, dropoff {lat,lng},
--   stops, waiting_hours, return, passengers, weight_kg
--
-- Depends on 20261010_05, _07, _08.

begin;

-- ═══ The engine ═══════════════════════════════════════════════════════
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

-- ═══ Atomic booking write, now with reservations ══════════════════════
-- Same signature and behaviour as 20261010_05 for lines without
-- reservations. With p_line.reservations, every resource is locked and
-- re-checked inside the vendor lock; the day-count capacity is skipped
-- because the resources ARE the capacity.
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
  v_res jsonb := coalesce(p_line->'reservations', '[]'::jsonb);
  rv jsonb; v_free numeric;
begin
  if p_spec_mode not in ('standard','discuss','quote') then raise exception 'Bad spec mode.'; end if;
  select r.event_date into v_date from booking_requests r where r.id = v_request_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_request'); end if;

  perform 1 from vendors where id = p_vendor_id for update;
  select * into v_avail from vendor_availability where vendor_id = p_vendor_id and slot_date = v_date;
  v_found := found;
  if v_found and v_avail.status = 'BLOCKED' then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  if not v_found and not public.weekday_is_open(p_vendor_id, v_date) then return jsonb_build_object('ok', false, 'reason', 'weekday_closed'); end if;

  if jsonb_array_length(v_res) = 0 then
    select count(*) into v_booked from dispatch_offers o
      join booking_lines l on l.id = o.line_id join booking_requests r on r.id = l.request_id
     where o.vendor_id = p_vendor_id and o.status = 'ACCEPTED' and r.event_date = v_date and l.status not in ('cancelled','expired');
    select coalesce(case when v_found then v_avail.slots_total end, v.max_events_per_day, 1) into v_cap from vendors v where v.id = p_vendor_id;
    if v_booked >= v_cap then return jsonb_build_object('ok', false, 'reason', 'day_full'); end if;
  else
    for rv in select * from jsonb_array_elements(v_res) loop
      perform 1 from sambramo_resources where id = (rv->>'resource_id')::uuid and vendor_id = p_vendor_id for update;
      if not found then return jsonb_build_object('ok', false, 'reason', 'resource_missing'); end if;
      v_free := public.sambramo_resource_free((rv->>'resource_id')::uuid, (rv->>'start_at')::timestamptz, (rv->>'end_at')::timestamptz);
      if coalesce(v_free, 0) < (rv->>'qty')::numeric then
        return jsonb_build_object('ok', false, 'reason', 'resource_full', 'resource_id', rv->>'resource_id');
      end if;
    end loop;
  end if;

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

  insert into sambramo_resource_reservations (resource_id, vendor_id, booking_line_id, start_at, end_at, qty, status)
  select (x->>'resource_id')::uuid, p_vendor_id, v_line_id, (x->>'start_at')::timestamptz, (x->>'end_at')::timestamptz,
         (x->>'qty')::numeric, 'confirmed'
    from jsonb_array_elements(v_res) x;

  update booking_lines set status = 'accepted', accepted_offer_id = v_offer_id, accepted_at = now() where id = v_line_id;
  return jsonb_build_object('ok', true, 'line_id', v_line_id, 'offer_id', v_offer_id);
end;
$$;
revoke all on function public.book_partner_line(jsonb, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.book_partner_line(jsonb, uuid, bigint, text) to service_role;

-- A cancelled or expired line gives its resources back.
create or replace function public.release_line_reservations()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status in ('cancelled','expired') and old.status is distinct from new.status then
    update public.sambramo_resource_reservations set status = 'released'
     where booking_line_id = new.id and status <> 'released';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_release_line_reservations on public.booking_lines;
create trigger trg_release_line_reservations after update of status on public.booking_lines
for each row execute function public.release_line_reservations();

-- ═══ Public reads for every trade ══════════════════════════════════════
-- Only public fields: profile, public answers, priced catalogue, packages,
-- add-ons, terms. Never answers marked private, never resources' private_ref.
create or replace function public.listing_public(p_vendor_service_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'vendor_service_id', s.id,
    'version_id', lv.id,
    'trade_id', lv.trade_id,
    'profile', lv.profile,
    'answers', lv.answers - coalesce((select array_agg(k) from jsonb_object_keys(lv.answers) k where k ~ '(registration|legal|private|bank|account)'), '{}'),
    'city', coalesce(nullif(v.area, ''), v.city),
    'rating', v.rating_avg,
    'terms', jsonb_build_object(
      'advance_pct', lv.booking_rules->>'advance_pct', 'cancellation', lv.booking_rules->>'cancellation',
      'min_notice_days', lv.booking_rules->>'min_notice_days', 'instant', lv.booking_rules->>'instant',
      'charges', (select coalesce(jsonb_agg(jsonb_build_object('label', c->>'label', 'role', c->>'role',
                    'customer_paise', public.sambramo_customer_paise_for((c->>'take_home_paise')::bigint, lv.trade_id))), '[]'::jsonb)
                  from jsonb_array_elements(coalesce(lv.booking_rules->'charges', '[]'::jsonb)) c),
      'travel_model', lv.travel_rules->>'model', 'travel_scope', lv.travel_rules->>'scope'),
    'packages', (select coalesce(jsonb_agg(jsonb_build_object(
        'key', p.commercial_inputs->>'tier', 'name', p.name, 'description', p.description,
        'hours', nullif(p.trade_inputs->>'duration_hours', '')::numeric,
        'customer_paise', (p.trade_inputs->>'customer_paise')::bigint,
        'inclusions', coalesce(p.commercial_inputs->'inclusions', '[]'::jsonb))
        order by (p.trade_inputs->>'take_home_paise')::bigint), '[]'::jsonb)
      from public.sambramo_trade_packages p where p.listing_version_id = lv.id and p.status = 'LIVE'),
    'catalogue', (select coalesce(jsonb_agg(jsonb_build_object(
        'item_key', c.item_key, 'collection', c.collection, 'name', c.name, 'category', c.category, 'unit', c.unit,
        'customer_paise', c.customer_paise, 'min_qty', c.min_qty, 'max_qty', c.max_qty, 'lead_days', c.lead_days,
        'qty_bands', (select coalesce(jsonb_agg((b || jsonb_build_object('customer_paise',
                        public.sambramo_customer_paise_for((b->>'take_home_paise')::bigint, lv.trade_id))) - 'take_home_paise'), '[]'::jsonb)
                      from jsonb_array_elements(c.qty_bands) b),
        'deposit_paise', c.deposit_paise,
        'attributes', c.attributes - coalesce((select array_agg(k) from jsonb_object_keys(c.attributes) k where k ~ '(registration|private)'), '{}'),
        'media', c.media) order by c.sort_order), '[]'::jsonb)
      from public.sambramo_catalogue_items c where c.listing_version_id = lv.id and c.active),
    'rules', (select coalesce(jsonb_agg(jsonb_build_object('kind', r.rule_kind, 'label', r.label, 'unit', r.unit,
        'customer_paise', r.customer_paise, 'min_qty', r.min_qty, 'max_qty', r.max_qty, 'included_qty', r.included_qty,
        'included_hours', r.included_hours)), '[]'::jsonb)
      from public.sambramo_rate_rules r where r.listing_version_id = lv.id),
    'addons', (select coalesce(jsonb_agg(jsonb_build_object('addon_id', a.addon_id, 'label', a.label, 'unit', a.unit,
        'customer_paise', a.customer_paise, 'included_in', a.included_in)), '[]'::jsonb)
      from public.sambramo_addon_rules a where a.listing_version_id = lv.id)
  )
  from public.vendor_services s
  join public.vendors v on v.id = s.vendor_id
  join public.sambramo_listing_versions lv on lv.vendor_service_id = s.id and lv.status = 'LIVE' and lv.seasonal_window_id is null
  where s.id = p_vendor_service_id
$$;
revoke all on function public.listing_public(uuid) from public;
grant execute on function public.listing_public(uuid) to anon, authenticated;

-- Live listings of a trade near a point, nearest first, with the entry price.
create or replace function public.public_listings(
  p_trade text, p_lat double precision default null, p_lng double precision default null, p_limit integer default 30
) returns table (vendor_service_id uuid, display_name text, avatar_url text, tagline text, city text, rating numeric,
                 from_paise bigint, distance_km numeric)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select s.id, coalesce(lv.profile->>'display_name', lv.profile->>'stage_name', s.name), lv.profile->>'avatar_url', lv.profile->>'tagline',
         coalesce(nullif(v.area, ''), v.city), v.rating_avg,
         (select min(x) from (
            select min((p.trade_inputs->>'customer_paise')::bigint) x from public.sambramo_trade_packages p
             where p.listing_version_id = lv.id and p.status = 'LIVE'
            union all select min(c.customer_paise) from public.sambramo_catalogue_items c where c.listing_version_id = lv.id and c.active
            union all select min(r.customer_paise) from public.sambramo_rate_rules r where r.listing_version_id = lv.id) m),
         case when p_lat is not null and v.location is not null
              then round((ST_Distance(v.location, public.point_of(p_lat, p_lng)) / 1000.0)::numeric, 1) end
    from public.sambramo_listing_versions lv
    join public.vendor_services s on s.id = lv.vendor_service_id
    join public.vendors v on v.id = s.vendor_id
   where lv.status = 'LIVE' and lv.seasonal_window_id is null
     and lv.trade_id = public.sambramo_trade_id(p_trade)
     and coalesce(v.is_verified, false) and coalesce(v.accepting_jobs, true)
   order by 8 nulls last, v.rating_avg desc nulls last
   limit greatest(1, least(p_limit, 100))
$$;
revoke all on function public.public_listings(text, double precision, double precision, integer) from public;
grant execute on function public.public_listings(text, double precision, double precision, integer) to anon, authenticated;

commit;
