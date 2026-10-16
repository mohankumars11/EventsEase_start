-- Catering & Food, part 3: submissions, the catering pricer, public reads.
--
--   submit_listing_version   catering payloads also write menus (→ dish keys),
--                            menu items and live counters, after
--                            sambramo_validate_catering() has checked that every
--                            menu dish is in the same submission, priced menus
--                            and counters say their price and scope, and every
--                            package names menus/counters it actually sends.
--                            Add-ons keep description, minimum and lead time.
--   resolve_catering         prices a menu / package / counters / dishes /
--                            extras exactly from the saved version rows;
--                            included things at ₹0, never charged twice;
--                            child price only where configured; guests, an
--                            event slot, staff and counters reserved.
--   resolve_booking          hands Catering & Food to resolve_catering
--                            (everything else unchanged from 20261010_10).
--   listing_public           + menus by course with diet and allergens,
--                            live counters, catering package details.
--
-- Depends on 20261010_12 and _13. Re-runnable.

begin;

-- ═══ Catering submissions: validate, count, write ═════════════════════
-- Called by submit_listing_version. Menus point at dish item_keys of the SAME
-- submission; a package may only name menus and counters it also sends.
create or replace function public.sambramo_validate_catering(p jsonb)
returns void language plpgsql immutable set search_path = public
as $$
declare
  dishes text[] := array(select x->>'item_key' from jsonb_array_elements(coalesce(p->'catalogue', '[]'::jsonb)) x);
  menus text[] := array(select x->>'menu_key' from jsonb_array_elements(coalesce(p->'menus', '[]'::jsonb)) x);
  counters text[] := array(select x->>'counter_key' from jsonb_array_elements(coalesce(p->'counters', '[]'::jsonb)) x);
  m jsonb; it jsonb; c jsonb; pk jsonb; k text;
begin
  for m in select * from jsonb_array_elements(coalesce(p->'menus', '[]'::jsonb)) loop
    if coalesce(trim(m->>'name'), '') = '' then raise exception 'Every menu needs a name.'; end if;
    if coalesce(m->>'price_model', '') not in ('per_person','fixed','quote') then raise exception 'Choose how "%" is priced.', m->>'name'; end if;
    if m->>'price_model' <> 'quote' and coalesce((m->>'take_home_paise')::bigint, 0) <= 0 then
      raise exception 'Enter the price for menu "%".', m->>'name';
    end if;
    if m->>'price_model' = 'fixed' and (coalesce((m->'fixed_scope'->>'guests')::integer, 0) <= 0 or coalesce((m->'fixed_scope'->>'hours')::numeric, 0) <= 0) then
      raise exception 'Say how many guests and hours the fixed price of "%" covers.', m->>'name';
    end if;
    if jsonb_array_length(coalesce(m->'items', '[]'::jsonb)) = 0 then raise exception 'Menu "%" has no dishes.', m->>'name'; end if;
    for it in select * from jsonb_array_elements(m->'items') loop
      if not ((it->>'dish_key') = any(dishes)) then raise exception 'Menu "%" lists a dish that is not in your catalogue.', m->>'name'; end if;
      if not coalesce((it->>'included')::boolean, true) and coalesce((it->>'extra_take_home_paise')::bigint, 0) <= 0 then
        raise exception 'Set the extra price for each extra-cost dish in "%".', m->>'name';
      end if;
    end loop;
  end loop;
  for c in select * from jsonb_array_elements(coalesce(p->'counters', '[]'::jsonb)) loop
    if c->>'price_model' <> 'quote' and coalesce((c->>'take_home_paise')::bigint, 0) <= 0 then raise exception 'Enter the price for counter "%".', c->>'name'; end if;
    if c->>'price_model' in ('per_event','fixed') and (coalesce((c->>'duration_hours')::numeric, 0) <= 0 or coalesce((c->>'included_servings')::integer, 0) <= 0) then
      raise exception 'Say how many hours and servings counter "%" covers.', c->>'name';
    end if;
    foreach k in array array(select jsonb_array_elements_text(coalesce(c->'dish_keys', '[]'::jsonb))) loop
      if not (k = any(dishes)) then raise exception 'Counter "%" lists a dish that is not in your catalogue.', c->>'name'; end if;
    end loop;
  end loop;
  for pk in select * from jsonb_array_elements(coalesce(p->'packages', '[]'::jsonb)) loop
    if pk->'meta'->>'catering' is null then continue; end if;
    if jsonb_array_length(coalesce(pk->'meta'->'menu_keys', '[]'::jsonb)) = 0 then raise exception 'Package "%" needs at least one menu.', pk->>'name'; end if;
    foreach k in array array(select jsonb_array_elements_text(pk->'meta'->'menu_keys')) loop
      if not (k = any(menus)) then raise exception 'Package "%" names a menu you are not sending.', pk->>'name'; end if;
    end loop;
    foreach k in array array(select jsonb_array_elements_text(coalesce(pk->'meta'->'counter_keys', '[]'::jsonb))) loop
      if not (k = any(counters)) then raise exception 'Package "%" names a counter you are not sending.', pk->>'name'; end if;
    end loop;
  end loop;
end;
$$;

create or replace function public.sambramo_catering_priced(p jsonb)
returns integer language sql immutable set search_path = public
as $$
  select (select count(*)::integer from jsonb_array_elements(coalesce(p->'menus', '[]'::jsonb)) m
           where m->>'price_model' <> 'quote' and coalesce((m->>'take_home_paise')::bigint, 0) > 0)
       + (select count(*)::integer from jsonb_array_elements(coalesce(p->'counters', '[]'::jsonb)) c
           where c->>'price_model' <> 'quote' and coalesce((c->>'take_home_paise')::bigint, 0) > 0)
$$;

create or replace function public.sambramo_write_catering(p_version uuid, p jsonb, p_trade text)
returns void language plpgsql security definer set search_path = public
as $$
declare m jsonb; it jsonb; c jsonb; v_menu uuid; v_counter uuid; k text; n integer;
begin
  for m in select * from jsonb_array_elements(coalesce(p->'menus', '[]'::jsonb)) loop
    insert into public.sambramo_catering_menus (
      listing_version_id, menu_key, sort_order, name, description, cuisine_ids, diet, service_style, event_types,
      min_guests, max_guests, lead_days, price_model, take_home_paise, customer_paise,
      child_take_home_paise, child_customer_paise, extra_guest_take_home_paise, extra_guest_customer_paise,
      fixed_scope, included_services, status
    ) values (
      p_version, m->>'menu_key', coalesce((m->>'sort_order')::integer, 0), trim(m->>'name'), nullif(m->>'description', ''),
      coalesce(array(select jsonb_array_elements_text(m->'cuisine_ids')), '{}'), coalesce(nullif(m->>'diet', ''), 'veg'),
      nullif(m->>'service_style', ''), coalesce(array(select jsonb_array_elements_text(m->'event_types')), '{}'),
      nullif(m->>'min_guests', '')::integer, nullif(m->>'max_guests', '')::integer, coalesce(nullif(m->>'lead_days', '')::integer, 0),
      m->>'price_model', nullif(m->>'take_home_paise', '')::bigint,
      case when nullif(m->>'take_home_paise', '') is not null then public.sambramo_customer_paise_for((m->>'take_home_paise')::bigint, p_trade) end,
      nullif(m->>'child_take_home_paise', '')::bigint,
      case when nullif(m->>'child_take_home_paise', '') is not null then public.sambramo_customer_paise_for((m->>'child_take_home_paise')::bigint, p_trade) end,
      nullif(m->>'extra_guest_take_home_paise', '')::bigint,
      case when nullif(m->>'extra_guest_take_home_paise', '') is not null then public.sambramo_customer_paise_for((m->>'extra_guest_take_home_paise')::bigint, p_trade) end,
      coalesce(m->'fixed_scope', '{}'::jsonb), coalesce(array(select jsonb_array_elements_text(m->'included_services')), '{}'), 'active'
    ) returning id into v_menu;
    for it in select * from jsonb_array_elements(coalesce(m->'items', '[]'::jsonb)) loop
      insert into public.sambramo_catering_menu_items (menu_id, listing_version_id, dish_key, course_group, sort_order, included,
        extra_take_home_paise, extra_customer_paise, portion, required, choice_group, choice_pick, notes)
      values (v_menu, p_version, it->>'dish_key', coalesce(nullif(it->>'course_group', ''), 'other'), coalesce((it->>'sort_order')::integer, 0),
        coalesce((it->>'included')::boolean, true), nullif(it->>'extra_take_home_paise', '')::bigint,
        case when nullif(it->>'extra_take_home_paise', '') is not null then public.sambramo_customer_paise_for((it->>'extra_take_home_paise')::bigint, p_trade) end,
        nullif(it->>'portion', ''), coalesce((it->>'required')::boolean, true), nullif(it->>'choice_group', ''),
        nullif(it->>'choice_pick', '')::integer, nullif(it->>'notes', ''));
    end loop;
  end loop;
  for c in select * from jsonb_array_elements(coalesce(p->'counters', '[]'::jsonb)) loop
    insert into public.sambramo_live_counters (listing_version_id, counter_key, sort_order, counter_type, name, description, cuisine_ids,
      included_servings, serving_capacity, duration_hours, chefs, equipment, power_water, space_required, setup_minutes, dismantle_minutes,
      indoor_outdoor, lead_days, available_qty, price_model, take_home_paise, customer_paise, extra_serving_take_home_paise, extra_hour_take_home_paise, status)
    values (p_version, c->>'counter_key', coalesce((c->>'sort_order')::integer, 0), coalesce(nullif(c->>'counter_type', ''), 'Custom'), trim(c->>'name'),
      nullif(c->>'description', ''), coalesce(array(select jsonb_array_elements_text(c->'cuisine_ids')), '{}'),
      nullif(c->>'included_servings', '')::integer, nullif(c->>'serving_capacity', '')::integer, nullif(c->>'duration_hours', '')::numeric,
      coalesce(nullif(c->>'chefs', '')::integer, 1), nullif(c->>'equipment', ''), nullif(c->>'power_water', ''), nullif(c->>'space_required', ''),
      coalesce(nullif(c->>'setup_minutes', '')::integer, 0), coalesce(nullif(c->>'dismantle_minutes', '')::integer, 0),
      coalesce(nullif(c->>'indoor_outdoor', ''), 'both'), coalesce(nullif(c->>'lead_days', '')::integer, 0), coalesce(nullif(c->>'available_qty', '')::integer, 1),
      c->>'price_model', nullif(c->>'take_home_paise', '')::bigint,
      case when nullif(c->>'take_home_paise', '') is not null then public.sambramo_customer_paise_for((c->>'take_home_paise')::bigint, p_trade) end,
      nullif(c->>'extra_serving_take_home_paise', '')::bigint, nullif(c->>'extra_hour_take_home_paise', '')::bigint, 'active')
    returning id into v_counter;
    n := 0;
    foreach k in array array(select jsonb_array_elements_text(coalesce(c->'dish_keys', '[]'::jsonb))) loop
      n := n + 1;
      insert into public.sambramo_live_counter_items (counter_id, dish_key, sort_order) values (v_counter, k, n) on conflict do nothing;
    end loop;
  end loop;
end;
$$;
revoke all on function public.sambramo_write_catering(uuid, jsonb, text) from public, anon, authenticated;

-- ═══ The catering pricer ══════════════════════════════════════════════
-- Request: event_date, start_time, hours, adults (or guests), children,
--   menu_key | package (key), menu_extras [dish_key], items [{item_key, qty}]
--   (dishes sold separately), counters [{key, qty, hours, servings}],
--   addons [id | {id, qty, hours}], dietary ['jain','vegan','no_onion_garlic',
--   'veg_only'], lat/lng.
-- Every amount comes from the version's saved menu / package / counter /
-- dish / add-on rows. Anything unpriced or out of scope is a QUOTE reason.
create or replace function public.resolve_catering(p_vendor_service_id uuid, p_req jsonb)
returns jsonb
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
  v_start time := coalesce(nullif(p_req->>'start_time', '')::time, '12:00'::time);
  v_hours numeric := nullif(p_req->>'hours', '')::numeric;
  v_adults integer := coalesce(nullif(p_req->>'adults', '')::integer, nullif(p_req->>'guests', '')::integer, 0);
  v_children integer := coalesce(nullif(p_req->>'children', '')::integer, 0);
  v_total integer;
  v_menu_key text := nullif(p_req->>'menu_key', '');
  v_pkg_key text := upper(nullif(coalesce(p_req->>'package', p_req->>'package_key'), ''));
  hard text[] := '{}'; soft text[] := '{}';
  lines jsonb := '[]'::jsonb; res jsonb := '[]'::jsonb;
  menu public.sambramo_catering_menus%rowtype; pkg record; ctr public.sambramo_live_counters%rowtype;
  it record; ar record; avail record; rs record; x jsonb;
  pm jsonb := '{}'::jsonb;                 -- package trade_inputs (meta)
  v_pkg_id uuid;
  v_found boolean; v_lead integer;
  v_billable integer; v_rate bigint; v_child bigint; v_amt bigint; v_qty numeric; v_extra numeric;
  v_scope_guests integer; v_scope_hours numeric;
  v_inc_counters text[] := '{}'; v_inc_addons text[] := '{}'; v_menus text[] := '{}';
  v_staff_needed integer; v_basis text; v_base bigint;
  v_start_at timestamptz; v_end_at timestamptz; v_day_from timestamptz; v_day_to timestamptz; v_free numeric;
  v_take bigint := 0; v_customer bigint; v_adv integer; v_advance bigint; v_fee numeric; v_require_payout boolean; v_path text;
  v_km numeric; v_scope numeric; diet text; a_id text; a_qty numeric; a_hours numeric; v_cuisines jsonb;
begin
  select * into s from public.vendor_services where id = p_vendor_service_id;
  if not found then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['listing_not_found']); end if;
  select * into reg from public.sambramo_trade_registry where id = 'catering_food';
  select * into cfg from public.sambramo_pricing_config limit 1;
  select * into vd from public.vendors where id = s.vendor_id;
  if d is null then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['date_required']); end if;
  v_total := v_adults + v_children;
  if v_total <= 0 then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['guests_required']); end if;

  select * into lv from public.sambramo_listing_versions
   where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is not null and d between effective_from and effective_to
   order by version desc limit 1;
  if not found then
    select * into lv from public.sambramo_listing_versions where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is null limit 1;
  end if;
  if not found then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', array['relist_required']); end if;
  br := lv.booking_rules; tr := lv.travel_rules; ans := lv.answers;
  v_fee := public.sambramo_trade_fee(reg.id);
  v_cuisines := coalesce(ans->'cuisines', '[]'::jsonb);

  -- ── Partner and date gates ──────────────────────────────────────────
  if not coalesce(vd.is_verified, false) then hard := array_append(hard, 'partner_not_verified'); end if;
  if coalesce(vd.accepting_jobs, true) = false then hard := array_append(hard, 'partner_paused'); end if;
  v_lead := d - current_date;
  if v_lead < coalesce((br->>'min_notice_days')::integer, 0) then hard := array_append(hard, 'short_notice'); end if;
  if br ? 'horizon_months' and d > current_date + make_interval(months => (br->>'horizon_months')::integer) then hard := array_append(hard, 'beyond_booking_window'); end if;
  select * into avail from public.vendor_availability where vendor_id = vd.id and slot_date = d;
  v_found := found;
  if v_found and avail.status = 'BLOCKED' then hard := array_append(hard, 'date_blocked');
  elsif not v_found and not public.weekday_is_open(vd.id, d) then hard := array_append(hard, 'weekday_closed'); end if;
  if cardinality(hard) > 0 then return jsonb_build_object('path','NOT_ELIGIBLE','reasons', hard, 'listing_version_id', lv.id, 'trade_id', reg.id); end if;
  if v_lead < coalesce((br->>'menu_freeze_days')::integer, 0) then soft := array_append(soft, 'inside_menu_freeze'); end if;

  -- ── What is being booked: a package, a menu, or dishes on their own ─
  if v_pkg_key is not null then
    select p.id, p.name, p.trade_inputs into pkg from public.sambramo_trade_packages p
     where p.listing_version_id = lv.id and p.status = 'LIVE' and upper(p.commercial_inputs->>'tier') = v_pkg_key limit 1;
    if not found then soft := array_append(soft, 'package_not_found');
    else
      pm := pkg.trade_inputs; v_pkg_id := pkg.id;
      v_inc_counters := array(select jsonb_array_elements_text(coalesce(pm->'counter_keys', '[]'::jsonb)));
      v_inc_addons := array(select jsonb_array_elements_text(coalesce(pm->'included_addons', '[]'::jsonb)));
      v_menus := array(select jsonb_array_elements_text(coalesce(pm->'menu_keys', '[]'::jsonb)));
      v_menu_key := coalesce(v_menu_key, v_menus[1]);
      if v_menu_key is not null and not (v_menu_key = any(v_menus)) then soft := array_append(soft, 'menu_not_in_package'); end if;
      v_hours := coalesce(v_hours, (pm->>'duration_hours')::numeric);
      v_rate := (pm->>'take_home_paise')::bigint;
      v_child := coalesce(nullif(pm->>'child_take_home_paise', '')::bigint, v_rate);
      if pm->>'price_model' = 'fixed' then
        v_scope_guests := coalesce(nullif(pm->>'guest_max', '')::integer, nullif(pm->>'guest_min', '')::integer);
        v_base := v_rate; v_basis := 'package_fixed';
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','package','source_id', v_pkg_id,
          'description', pkg.name || ' (up to ' || v_scope_guests || ' guests)', 'qty', 1, 'unit', 'package', 'take_home_paise', v_rate));
        if v_total > v_scope_guests then
          if nullif(pm->>'extra_guest_take_home_paise', '') is null then soft := array_append(soft, 'over_package_scope');
          else lines := lines || jsonb_build_array(jsonb_build_object('kind','extra_guests','source','package','source_id', v_pkg_id,
            'description', (v_total - v_scope_guests) || ' extra guests', 'qty', v_total - v_scope_guests, 'unit', 'guest',
            'take_home_paise', (pm->>'extra_guest_take_home_paise')::bigint * (v_total - v_scope_guests)));
          end if;
        end if;
      else
        v_billable := greatest(v_adults, coalesce(nullif(pm->>'guest_min', '')::integer, 0) - v_children, coalesce((br->>'min_billable_guests')::integer, 0) - v_children, 0);
        if nullif(pm->>'guest_max', '') is not null and v_total > (pm->>'guest_max')::integer then
          if nullif(pm->>'extra_guest_take_home_paise', '') is null then soft := array_append(soft, 'over_package_scope'); end if;
        end if;
        v_base := v_rate * v_billable + v_child * v_children; v_basis := 'package_per_guest';
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','package','source_id', v_pkg_id,
          'description', pkg.name || ' × ' || v_billable || ' guests', 'qty', v_billable, 'unit', 'guest', 'take_home_paise', v_rate * v_billable));
        if v_children > 0 then lines := lines || jsonb_build_array(jsonb_build_object('kind','children','source','package','source_id', v_pkg_id,
          'description', v_children || ' children', 'qty', v_children, 'unit', 'child', 'take_home_paise', v_child * v_children)); end if;
      end if;
      if v_hours > coalesce((pm->>'duration_hours')::numeric, v_hours) then
        v_extra := ceil(v_hours - (pm->>'duration_hours')::numeric);
        if nullif(pm->>'overtime_take_home_paise', '') is null then soft := array_append(soft, 'extra_hours_not_priced');
        else lines := lines || jsonb_build_array(jsonb_build_object('kind','extra_hours','source','package','source_id', v_pkg_id,
          'description', v_extra || ' extra hour(s)', 'qty', v_extra, 'unit', 'hour', 'take_home_paise', (pm->>'overtime_take_home_paise')::bigint * v_extra)); end if;
      end if;
      if nullif(pm->>'guest_min', '') is not null and v_total < (pm->>'guest_min')::integer and pm->>'price_model' = 'fixed' then
        null;   -- a fixed price is owed in full for a smaller party
      end if;
      -- The package's menu is described, never charged again.
      if v_menu_key is not null then
        select * into menu from public.sambramo_catering_menus where listing_version_id = lv.id and menu_key = v_menu_key and status = 'active';
        if found then lines := lines || jsonb_build_array(jsonb_build_object('kind','menu','source','menu','source_id', menu.id,
          'description', menu.name || ' (included)', 'qty', 1, 'unit', 'menu', 'take_home_paise', 0)); end if;
      end if;
    end if;
  elsif v_menu_key is not null then
    select * into menu from public.sambramo_catering_menus where listing_version_id = lv.id and menu_key = v_menu_key and status = 'active';
    if not found then soft := array_append(soft, 'menu_not_found');
    elsif menu.price_model = 'quote' then soft := array_append(soft, 'menu_needs_quote');
    else
      if menu.lead_days > v_lead then soft := array_append(soft, 'menu_lead_time'); end if;
      if menu.max_guests is not null and v_total > menu.max_guests then soft := array_append(soft, 'over_menu_capacity'); end if;
      v_child := coalesce(menu.child_take_home_paise, menu.take_home_paise);
      if menu.price_model = 'per_person' then
        -- A smaller party is billed up to the menu's / the partner's minimum (as adults).
        v_billable := greatest(v_adults, coalesce(menu.min_guests, 0) - v_children, coalesce((br->>'min_billable_guests')::integer, 0) - v_children, 0);
        v_base := menu.take_home_paise * v_billable + v_child * v_children; v_basis := 'menu_per_person';
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','menu','source_id', menu.id,
          'description', menu.name || ' × ' || v_billable || ' guests', 'qty', v_billable, 'unit', 'guest',
          'unit_take_home_paise', menu.take_home_paise, 'take_home_paise', menu.take_home_paise * v_billable));
        if v_children > 0 then lines := lines || jsonb_build_array(jsonb_build_object('kind','children','source','menu','source_id', menu.id,
          'description', v_children || ' children', 'qty', v_children, 'unit', 'child', 'take_home_paise', v_child * v_children)); end if;
      else
        v_scope_guests := (menu.fixed_scope->>'guests')::integer; v_scope_hours := (menu.fixed_scope->>'hours')::numeric;
        v_hours := coalesce(v_hours, v_scope_hours);
        v_base := menu.take_home_paise; v_basis := 'menu_fixed';
        lines := lines || jsonb_build_array(jsonb_build_object('kind','base','source','menu','source_id', menu.id,
          'description', menu.name || ' (up to ' || v_scope_guests || ' guests, ' || v_scope_hours || ' h)', 'qty', 1, 'unit', 'menu', 'take_home_paise', menu.take_home_paise));
        if v_total > v_scope_guests then
          if menu.extra_guest_take_home_paise is null then soft := array_append(soft, 'over_fixed_scope');
          else lines := lines || jsonb_build_array(jsonb_build_object('kind','extra_guests','source','menu','source_id', menu.id,
            'description', (v_total - v_scope_guests) || ' extra guests', 'qty', v_total - v_scope_guests, 'unit', 'guest',
            'take_home_paise', menu.extra_guest_take_home_paise * (v_total - v_scope_guests))); end if;
        end if;
        if v_hours > v_scope_hours then soft := array_append(soft, 'over_fixed_hours'); end if;
      end if;
    end if;
  end if;

  -- Extra-cost dishes on the chosen menu: required ones always, optional ones when asked for.
  if menu.id is not null and menu.price_model <> 'quote' then
    for it in select mi.*, ci.name as dish_name from public.sambramo_catering_menu_items mi
               join public.sambramo_catalogue_items ci on ci.listing_version_id = lv.id and ci.item_key = mi.dish_key
              where mi.menu_id = menu.id and not mi.included
                and (mi.required or coalesce(p_req->'menu_extras', '[]'::jsonb) ? mi.dish_key) loop
      lines := lines || jsonb_build_array(jsonb_build_object('kind','menu_extra','source','menu_item','source_id', it.id,
        'description', it.dish_name || ' × ' || v_total, 'qty', v_total, 'unit', 'guest', 'take_home_paise', it.extra_take_home_paise * v_total));
    end loop;
  end if;

  -- Dishes ordered on their own (standalone price only).
  for x in select * from jsonb_array_elements(coalesce(p_req->'items', '[]'::jsonb)) loop
    select * into it from public.sambramo_catalogue_items where listing_version_id = lv.id and item_key = x->>'item_key' and active;
    a_qty := greatest(1, coalesce((x->>'qty')::numeric, 1));
    if not found then soft := soft || ('item_not_offered_' || coalesce(x->>'item_key', '?'));
    elsif it.take_home_paise is null then soft := soft || ('item_quote_only_' || it.item_key);
    else
      if a_qty < it.min_qty then soft := soft || ('below_minimum_' || it.item_key); end if;
      if it.lead_days > v_lead then soft := soft || ('lead_time_' || it.item_key); end if;
      lines := lines || jsonb_build_array(jsonb_build_object('kind','dish','source','item','source_id', it.id,
        'description', it.name || ' × ' || a_qty, 'qty', a_qty, 'unit', it.unit, 'take_home_paise', (it.take_home_paise * a_qty)::bigint));
      v_base := coalesce(v_base, 0) + (it.take_home_paise * a_qty)::bigint; v_basis := coalesce(v_basis, 'dishes');
    end if;
  end loop;
  if v_basis is null and cardinality(soft) = 0 then soft := array_append(soft, 'choose_menu'); end if;
  v_hours := coalesce(v_hours, (ans->>'service_hours')::numeric, 4);
  v_start_at := (d + v_start) at time zone 'Asia/Kolkata';
  v_end_at := v_start_at + make_interval(secs => (v_hours * 3600)::double precision);
  v_day_from := (d::timestamp) at time zone 'Asia/Kolkata';
  v_day_to := ((d + 1)::timestamp) at time zone 'Asia/Kolkata';

  -- ── Live counters: their own price model; included ones at ₹0 ────────
  for x in select * from jsonb_array_elements(coalesce(p_req->'counters', '[]'::jsonb)) loop
    select * into ctr from public.sambramo_live_counters where listing_version_id = lv.id and counter_key = x->>'key' and status = 'active';
    a_qty := greatest(1, coalesce((x->>'qty')::integer, 1));
    a_hours := coalesce(nullif(x->>'hours', '')::numeric, ctr.duration_hours, v_hours);
    if not found then soft := soft || ('counter_not_offered_' || coalesce(x->>'key', '?')); continue; end if;
    if ctr.lead_days > v_lead then soft := soft || ('lead_time_' || ctr.counter_key); end if;
    if (x->>'key') = any(v_inc_counters) then
      lines := lines || jsonb_build_array(jsonb_build_object('kind','counter','source','counter','source_id', ctr.id,
        'description', ctr.name || ' (included)', 'qty', 1, 'unit', 'counter', 'take_home_paise', 0));
      if a_qty > 1 then
        if nullif(pm->>'extra_counter_take_home_paise', '') is not null then
          lines := lines || jsonb_build_array(jsonb_build_object('kind','counter','source','package','source_id', v_pkg_id,
            'description', (a_qty - 1) || ' more ' || ctr.name, 'qty', a_qty - 1, 'unit', 'counter', 'take_home_paise', (pm->>'extra_counter_take_home_paise')::bigint * (a_qty - 1)));
        else soft := soft || ('counter_extra_not_priced_' || ctr.counter_key); end if;
      end if;
    elsif ctr.price_model = 'quote' then soft := soft || ('counter_needs_quote_' || ctr.counter_key);
    else
      v_qty := case ctr.price_model when 'per_hour' then a_qty * greatest(a_hours, coalesce(ctr.duration_hours, 0))
                                    when 'per_guest' then a_qty * v_total
                                    when 'per_serving' then coalesce(nullif(x->>'servings', '')::numeric, v_total)
                                    else a_qty end;
      lines := lines || jsonb_build_array(jsonb_build_object('kind','counter','source','counter','source_id', ctr.id,
        'description', ctr.name || case when a_qty > 1 then ' × ' || a_qty else '' end, 'qty', v_qty, 'unit', ctr.price_model,
        'take_home_paise', (ctr.take_home_paise * v_qty)::bigint));
      if ctr.price_model in ('per_event','fixed') then
        if a_hours > ctr.duration_hours then
          if ctr.extra_hour_take_home_paise is null then soft := soft || ('counter_hours_' || ctr.counter_key);
          else lines := lines || jsonb_build_array(jsonb_build_object('kind','counter_extra','source','counter','source_id', ctr.id,
            'description', ctr.name || ': ' || ceil(a_hours - ctr.duration_hours) || ' extra hour(s)', 'qty', ceil(a_hours - ctr.duration_hours) * a_qty, 'unit', 'hour',
            'take_home_paise', ctr.extra_hour_take_home_paise * ceil(a_hours - ctr.duration_hours) * a_qty)); end if;
        end if;
        if coalesce(nullif(x->>'servings', '')::integer, v_total) > ctr.included_servings * a_qty then
          v_extra := coalesce(nullif(x->>'servings', '')::integer, v_total) - ctr.included_servings * a_qty;
          if ctr.extra_serving_take_home_paise is null then soft := soft || ('counter_servings_' || ctr.counter_key);
          else lines := lines || jsonb_build_array(jsonb_build_object('kind','counter_extra','source','counter','source_id', ctr.id,
            'description', ctr.name || ': ' || v_extra || ' extra servings', 'qty', v_extra, 'unit', 'serving',
            'take_home_paise', ctr.extra_serving_take_home_paise * v_extra)); end if;
        end if;
      end if;
    end if;
    -- The counter itself is reserved, priced or included.
    select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.resource_key = ctr.counter_key;
    if found then
      v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
      if a_qty > coalesce(v_free, 0) then soft := soft || ('counter_unavailable_' || ctr.counter_key);
      else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', a_qty, 'start_at', v_start_at, 'end_at', v_end_at)); end if;
    end if;
  end loop;

  -- ── Dietary requests the partner has declared they can meet ──────────
  for diet in select jsonb_array_elements_text(coalesce(p_req->'dietary', '[]'::jsonb)) loop
    if not (
      (diet = 'veg_only' and coalesce(menu.diet, 'veg') in ('veg','vegan','jain'))
      or (diet = 'jain' and (menu.diet = 'jain' or v_cuisines ? 'sp_jain'))
      or (diet = 'vegan' and (menu.diet = 'vegan' or v_cuisines ? 'sp_vegan'))
      or (diet = 'no_onion_garlic' and (v_cuisines ?| array['sp_no_onion_garlic','sp_jain','sp_satvik']))
    ) then soft := soft || ('dietary_' || diet); end if;
  end loop;

  -- ── Extras: own unit; included in the package at ₹0 ──────────────────
  for x in select * from jsonb_array_elements(coalesce(p_req->'addons', '[]'::jsonb)) loop
    a_id := case jsonb_typeof(x) when 'string' then x #>> '{}' else x->>'id' end;
    a_qty := case jsonb_typeof(x) when 'object' then nullif(x->>'qty', '')::numeric end;
    a_hours := case jsonb_typeof(x) when 'object' then nullif(x->>'hours', '')::numeric end;
    select * into ar from public.sambramo_addon_rules where listing_version_id = lv.id and addon_id = a_id;
    if not found then soft := soft || ('addon_not_offered_' || a_id);
    elsif a_id = any(v_inc_addons) or (v_pkg_key is not null and v_pkg_key = any(ar.included_in)) then
      lines := lines || jsonb_build_array(jsonb_build_object('kind','addon','addon_id', a_id, 'description', ar.label || ' (included)', 'qty', 1, 'take_home_paise', 0));
    elsif coalesce(ar.notice_days, 0) > v_lead then soft := soft || ('addon_short_notice_' || a_id);
    else
      v_qty := case ar.unit
        when 'per_guest' then v_total when 'per_person' then v_total
        when 'per_staff_hour' then coalesce(a_qty, 1) * coalesce(a_hours, v_hours)
        when 'per_counter_hour' then coalesce(a_qty, 1) * coalesce(a_hours, v_hours)
        when 'per_hour' then coalesce(a_qty, ceil(v_hours))
        else coalesce(a_qty, 1) end;
      if ar.min_qty is not null and v_qty < ar.min_qty then v_qty := ar.min_qty; end if;
      lines := lines || jsonb_build_array(jsonb_build_object('kind','addon','addon_id', a_id, 'source','addon','source_id', ar.id,
        'description', ar.label, 'qty', v_qty, 'unit', ar.unit, 'take_home_paise', (ar.take_home_paise * v_qty)::bigint));
    end if;
  end loop;

  -- ── Travel to the venue ─────────────────────────────────────────────
  if (p_req ? 'lat') and (p_req ? 'lng') and vd.location is not null then
    v_km := round((ST_Distance(vd.location, public.point_of((p_req->>'lat')::double precision, (p_req->>'lng')::double precision)) / 1000.0)::numeric, 1);
    v_scope := case when coalesce(tr->>'scope', '') ~ '^\d+$' then (tr->>'scope')::numeric end;
    if v_scope is not null and v_km > v_scope then
      case coalesce(tr->>'model', 'custom')
        when 'flat' then lines := lines || jsonb_build_array(jsonb_build_object('kind','travel','description','Outstation travel','qty',1,'take_home_paise',(tr->>'flat_take_home_paise')::bigint));
        when 'per_km' then lines := lines || jsonb_build_array(jsonb_build_object('kind','travel','description', round(v_km - v_scope) || ' km beyond travel area',
          'qty', round(v_km - v_scope), 'take_home_paise', ((tr->>'per_km_take_home_paise')::bigint * round(v_km - v_scope))::bigint));
        when 'customer_arranged' then lines := lines || jsonb_build_array(jsonb_build_object('kind','travel','description','Travel arranged by you','qty',1,'take_home_paise',0));
        else soft := array_append(soft, 'outside_travel_area');
      end case;
    end if;
  end if;

  -- ── Capacity: guests that day, an event slot, serving staff ─────────
  select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.resource_key = 'guests';
  if found then
    v_free := public.sambramo_resource_free(rs.id, v_day_from, v_day_to);
    if v_total > coalesce(v_free, 0) then soft := array_append(soft, 'over_capacity');
    else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', v_total, 'start_at', v_day_from, 'end_at', v_day_to)); end if;
  else soft := array_append(soft, 'capacity_not_tracked'); end if;
  select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.resource_key = 'events';
  if found then
    v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
    if coalesce(v_free, 0) < 1 then soft := array_append(soft, 'no_event_slot');
    else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', 1, 'start_at', v_start_at, 'end_at', v_end_at)); end if;
  end if;
  v_staff_needed := coalesce(nullif(pm->>'staff', '')::integer, ceil(v_total * coalesce((ans->>'staff_per_100')::numeric, 0) / 100.0)::integer, 0);
  if v_staff_needed > 0 then
    select r.* into rs from public.sambramo_resources r where r.vendor_service_id = s.id and r.active and r.resource_key = 'staff';
    if found then
      v_free := public.sambramo_resource_free(rs.id, v_start_at, v_end_at);
      if v_staff_needed > coalesce(v_free, 0) then soft := array_append(soft, 'not_enough_staff');
      else res := res || jsonb_build_array(jsonb_build_object('resource_id', rs.id, 'qty', v_staff_needed, 'start_at', v_start_at, 'end_at', v_end_at)); end if;
    end if;
  end if;

  -- ── Instant? ────────────────────────────────────────────────────────
  if coalesce((br->>'instant')::boolean, true) = false then soft := array_append(soft, 'instant_booking_off'); end if;
  select coalesce(p.require_payout_for_instant, cfg.require_payout_for_instant, true) into v_require_payout
    from public.sambramo_trade_pricing_policy p where p.trade_id = reg.id;
  if coalesce(v_require_payout, true) and not exists (select 1 from public.partner_payout_accounts pa where pa.vendor_id = vd.id and pa.route_account_id is not null) then
    soft := array_append(soft, 'partner_payout_not_active');
  end if;
  if not exists (select 1 from public.vendor_documents vdoc where vdoc.vendor_id = vd.id and vdoc.requirement_id = 'VER-TRADE-FSSAI' and vdoc.status = 'accepted') then
    soft := array_append(soft, 'licence_pending_fssai');
  end if;

  select coalesce(sum((l->>'take_home_paise')::bigint), 0) into v_take from jsonb_array_elements(lines) l;
  v_customer := (round(v_take / (1 - v_fee) / 10) * 10)::bigint;
  v_adv := coalesce((br->>'advance_pct')::integer, 100);
  v_advance := least(v_customer, (round(v_customer * v_adv / 100.0 / 10) * 10)::bigint);
  v_path := case when cardinality(soft) > 0 or v_basis is null then 'QUOTE' else 'INSTANT' end;
  if v_path = 'QUOTE' and coalesce((br->>'custom_quotes')::boolean, true) = false then
    return jsonb_build_object('path','NOT_ELIGIBLE','reasons', soft || array['custom_quotes_off'], 'listing_version_id', lv.id, 'trade_id', reg.id);
  end if;

  return jsonb_build_object(
    'path', v_path, 'reasons', soft,
    'trade_id', reg.id, 'trade_name', reg.name, 'trade_code', reg.code, 'archetype', reg.archetype,
    'vendor_id', vd.id, 'listing_version_id', lv.id, 'seasonal', lv.seasonal_window_id is not null,
    'package_id', v_pkg_id, 'menu_id', menu.id, 'basis', v_basis,
    'catering', jsonb_build_object('menu_key', v_menu_key, 'package_key', v_pkg_key, 'adults', v_adults, 'children', v_children,
                                   'billable_guests', v_billable, 'hours', v_hours, 'menu_freeze_days', br->'menu_freeze_days',
                                   'guest_confirm_days', br->'guest_confirm_days'),
    'lines', (select coalesce(jsonb_agg(l || jsonb_build_object('customer_paise', (round((l->>'take_home_paise')::bigint / (1 - v_fee) / 10) * 10)::bigint)), '[]'::jsonb)
                from jsonb_array_elements(lines) l),
    'take_home_paise', v_take, 'customer_paise', v_customer, 'platform_fee_rate', v_fee, 'platform_fee_paise', v_customer - v_take,
    'deposit_paise', 0, 'advance_pct', v_adv, 'advance_paise', v_advance, 'balance_paise', v_customer - v_advance,
    'distance_km', v_km, 'reservations', res,
    'window', jsonb_build_object('start_at', v_start_at, 'end_at', v_end_at),
    'cancellation', br->>'cancellation', 'quote_hours', br->>'quote_hours'
  );
end;
$$;
revoke all on function public.resolve_catering(uuid, jsonb) from public;
grant execute on function public.resolve_catering(uuid, jsonb) to anon, authenticated, service_role;

create or replace function public.submit_listing_version(
  p_vendor_service_id uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.vendor_services%rowtype;
  vd public.vendors%rowtype;
  reg public.sambramo_trade_registry%rowtype;
  ans jsonb := coalesce(p_payload->'answers', '{}'::jsonb);
  loc jsonb := coalesce(p_payload->'location', '{}'::jsonb);
  v_version integer;
  v_version_id uuid;
  k text; r jsonb; a jsonb; it jsonb; pk jsonb; b jsonb;
  pr record;
  v_t bigint; v_c bigint; v_m text;
  v_priced integer := 0;
  v_prev_to numeric;
  v_saved jsonb;
  v_pkgs jsonb := '[]'::jsonb;
  v_addons jsonb := '[]'::jsonb;
  v_n integer := 0;
begin
  select * into s from public.vendor_services where id = p_vendor_service_id;
  if not found then raise exception 'Listing not found.'; end if;
  select * into vd from public.vendors where id = s.vendor_id;
  if vd.profile_id is distinct from auth.uid() then raise exception 'You can only submit your own listing.'; end if;

  select * into reg from public.sambramo_trade_registry where id = public.sambramo_trade_id(s.category);
  if not found then raise exception 'This listing''s trade (%) is not on the new engine yet.', s.category; end if;
  if reg.id = 'anchor_mc' then raise exception 'Anchor & MC listings are submitted from their own flow.'; end if;
  if coalesce(p_payload->>'trade_id', reg.id) <> reg.id then
    raise exception 'This listing is %, not %.', reg.name, p_payload->>'trade_id';
  end if;

  -- ── Required answers ────────────────────────────────────────────────
  foreach k in array reg.required_answers loop
    if coalesce(ans->k, 'null'::jsonb) in ('null'::jsonb, '""'::jsonb, '[]'::jsonb) then
      raise exception 'Answer "%" before submitting.', replace(k, '_', ' ');
    end if;
  end loop;

  -- ── Rules: allowed kind, exact amount, sane limits ──────────────────
  for r in select * from jsonb_array_elements(coalesce(p_payload->'rules', '[]'::jsonb)) loop
    k := r->>'kind';
    if not (k = any(reg.allowed_kinds)) then
      raise exception '% does not price "%".', reg.name, replace(coalesce(k, '?'), '_', ' ');
    end if;
    if k = 'quote' then continue; end if;
   
    select * into pr from public.sambramo_price_pair(r, reg.id);
    if pr.take_home_paise <= 0 then
      raise exception 'Enter an amount for %.', coalesce(r->>'label', replace(k, '_', ' '));
    end if;
    if nullif(r->>'min_qty', '') is not null and nullif(r->>'max_qty', '') is not null
       and (r->>'max_qty')::numeric < (r->>'min_qty')::numeric then
      raise exception 'The most you take must not be below the least for %.', coalesce(r->>'label', replace(k, '_', ' '));
    end if;
    if k = 'percentage' and (coalesce(r->'meta'->>'base', '') = '' or coalesce(r->'meta'->>'policy', '') = '') then
      raise exception 'A percentage fee needs its base and how it is reconciled.';
    end if;
    -- Bands must ascend without overlapping, each with an amount.
    v_prev_to := null;
    for b in select * from jsonb_array_elements(coalesce(r->'bands', '[]'::jsonb)) order by (value->>'from')::numeric loop
      if coalesce((b->>'take_home_paise')::bigint, 0) <= 0 then raise exception 'Every band needs an amount.'; end if;
      if v_prev_to is not null and (b->>'from')::numeric <= v_prev_to then raise exception 'Bands overlap at %.', b->>'from'; end if;
      v_prev_to := coalesce((b->>'to')::numeric, 1e12);
    end loop;
    v_priced := v_priced + 1;
  end loop;

  -- ── Catalogue: named, priced or explicitly quote-only, stock for rentals ──
  for it in select * from jsonb_array_elements(coalesce(p_payload->'catalogue', '[]'::jsonb)) loop
    if coalesce(trim(it->>'name'), '') = '' then raise exception 'Every % needs a name.', coalesce(reg.catalogue_key, 'item'); end if;
    if reg.archetype = 'RENTAL_INVENTORY' and coalesce((it->>'stock_qty')::integer, 0) <= 0 then
      raise exception 'Enter how many of "%" you have.', it->>'name';
    end if;
    if not coalesce((it->>'quote_only')::boolean, false) then
      select * into pr from public.sambramo_price_pair(it, reg.id);
      if pr.take_home_paise <= 0 then raise exception 'Enter a price for "%".', it->>'name'; end if;
      v_priced := v_priced + 1;
    end if;
  end loop;

  for pk in select * from jsonb_array_elements(coalesce(p_payload->'packages', '[]'::jsonb)) loop
    if coalesce((pk->>'take_home_paise')::bigint, 0) <= 0 then raise exception '"%" needs a price.', pk->>'name'; end if;
    v_priced := v_priced + 1;
  end loop;

  -- Catering: menus, counters and packages are validated and count as prices.
  if reg.id = 'catering_food' then
    perform public.sambramo_validate_catering(p_payload);
    v_priced := v_priced + public.sambramo_catering_priced(p_payload);
  end if;

  -- Nothing priced is only allowed for a partner who chose Custom Quote only.
  if v_priced = 0 and not exists (select 1 from jsonb_array_elements(coalesce(p_payload->'rules', '[]'::jsonb)) x
                                   where x->>'kind' = 'quote') then
    raise exception 'Set at least one price, or choose Custom Quote only.';
  end if;

  -- ── New version (earlier drafts replaced) ───────────────────────────
  select coalesce(max(version), 0) + 1 into v_version
    from public.sambramo_listing_versions where vendor_service_id = s.id;
  update public.sambramo_listing_versions set status = 'ARCHIVED', updated_at = now()
   where vendor_service_id = s.id and status in ('DRAFT','ACTION_REQUIRED','UNDER_REVIEW');
  update public.sambramo_trade_packages p set status = 'ARCHIVED', updated_at = now()
    from public.sambramo_listing_versions lv
   where p.listing_version_id = lv.id and lv.vendor_service_id = s.id and lv.status = 'ARCHIVED'
     and p.status in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED');

  insert into public.sambramo_listing_versions (
    vendor_id, vendor_service_id, trade, trade_id, schema_version, version, status, parent_version_id,
    seasonal_window_id, effective_from, effective_to,
    profile, answers, booking_rules, travel_rules, submitted_at
  ) values (
    vd.id, s.id, s.category, reg.id, coalesce((p_payload->>'schema_version')::integer, reg.schema_version), v_version, 'UNDER_REVIEW',
    (select id from public.sambramo_listing_versions where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is null limit 1),
    nullif(p_payload->>'seasonal_window_id', '')::uuid,
    nullif(p_payload->>'effective_from', '')::date, nullif(p_payload->>'effective_to', '')::date,
    coalesce(p_payload->'profile', '{}'::jsonb), ans,
    coalesce(p_payload->'booking_rules', '{}'::jsonb),
    coalesce(p_payload->'travel_rules', '{}'::jsonb),
    now()
  ) returning id into v_version_id;

  -- ── Rules ───────────────────────────────────────────────────────────
  for r in select * from jsonb_array_elements(coalesce(p_payload->'rules', '[]'::jsonb)) loop
    k := r->>'kind';
    -- 'quote' is a booking rule (custom_quotes), not a priced row.
    if k = 'quote' then continue; end if;
    select * into pr from public.sambramo_price_pair(r, reg.id);
    insert into public.sambramo_rate_rules (
      listing_version_id, model, rule_kind, unit, label, event_categories,
      included_hours, min_hours, max_hours, min_qty, max_qty, included_qty,
      take_home_paise, customer_paise, price_mode, cost_paise, margin_pct,
      extra_hour_take_home_paise, extra_unit_take_home_paise, overtime_step_minutes, overtime_grace_minutes,
      bands, multi_day, meta
    ) values (
      v_version_id,
      case when k in ('hour','session','event','half_day','full_day','multi_day') then k end,
      k, nullif(r->>'unit', ''), nullif(r->>'label', ''),
      coalesce(array(select jsonb_array_elements_text(r->'event_categories')), '{}'),
      nullif(r->>'hours', '')::numeric, nullif(r->>'min_hours', '')::numeric, nullif(r->>'max_hours', '')::numeric,
      nullif(r->>'min_qty', '')::numeric, nullif(r->>'max_qty', '')::numeric, nullif(r->>'included_qty', '')::numeric,
      pr.take_home_paise, pr.customer_paise, pr.price_mode,
      nullif(r->>'cost_paise', '')::bigint, nullif(r->>'margin_pct', '')::numeric,
      nullif(r->>'extra_hour_take_home_paise', '')::bigint, nullif(r->>'extra_unit_take_home_paise', '')::bigint,
      nullif(r->>'overtime_step_minutes', '')::integer, coalesce(nullif(r->>'overtime_grace_minutes', '')::integer, 0),
      coalesce(r->'bands', '[]'::jsonb), case when k = 'multi_day' then r->'multi_day' end,
      coalesce(r->'meta', '{}'::jsonb)
    );
  end loop;

  -- ── Catalogue ───────────────────────────────────────────────────────
  for it in select * from jsonb_array_elements(coalesce(p_payload->'catalogue', '[]'::jsonb)) loop
    v_n := v_n + 1;
    v_t := null; v_c := null; v_m := 'target_net';
    if not coalesce((it->>'quote_only')::boolean, false) then
      select p.take_home_paise, p.customer_paise, p.price_mode into v_t, v_c, v_m from public.sambramo_price_pair(it, reg.id) p;
    end if;
    insert into public.sambramo_catalogue_items (
      listing_version_id, collection, item_key, sort_order, name, category, unit,
      take_home_paise, customer_paise, price_mode, min_qty, max_qty, stock_qty, lead_days,
      qty_bands, deposit_paise, attributes, media
    ) values (
      v_version_id, coalesce(nullif(it->>'collection', ''), reg.catalogue_key, 'items'),
      coalesce(nullif(it->>'item_key', ''), 'item_' || v_n), v_n, trim(it->>'name'), nullif(it->>'category', ''),
      coalesce(nullif(it->>'unit', ''), 'item'),
      v_t, v_c, v_m,
      coalesce(nullif(it->>'min_qty', '')::numeric, 1), nullif(it->>'max_qty', '')::numeric,
      nullif(it->>'stock_qty', '')::integer, coalesce(nullif(it->>'lead_days', '')::integer, 0),
      coalesce(it->'qty_bands', '[]'::jsonb), nullif(it->>'deposit_paise', '')::bigint,
      coalesce(it->'attributes', '{}'::jsonb), coalesce(it->'media', '[]'::jsonb)
    );
  end loop;

  -- ── Add-ons ─────────────────────────────────────────────────────────
  for a in select * from jsonb_array_elements(coalesce(p_payload->'addons', '[]'::jsonb)) loop
    select * into pr from public.sambramo_price_pair(a || jsonb_build_object('take_home_paise', greatest(0, coalesce((a->>'take_home_paise')::bigint, 0))), reg.id);
    insert into public.sambramo_addon_rules (
      listing_version_id, addon_id, label, unit, take_home_paise, customer_paise, event_categories, notice_days, included_in,
      description, min_qty, lead_days, requires
    ) values (
      v_version_id, a->>'addon_id', a->>'label', coalesce(nullif(a->>'unit', ''), 'per_event'),
      pr.take_home_paise, pr.customer_paise,
      coalesce(array(select jsonb_array_elements_text(a->'event_categories')), '{}'),
      coalesce((a->>'notice_days')::integer, 0),
      coalesce(array(select upper(jsonb_array_elements_text(a->'included_in'))), '{}'),
      nullif(a->>'description', ''), nullif(a->>'min_qty', '')::numeric, nullif(a->>'notice_days', '')::integer, coalesce(a->'requires', '{}'::jsonb)
    );
    v_addons := v_addons || jsonb_build_array(jsonb_build_object(
      'name', a->>'label', 'unit', case coalesce(a->>'unit', 'per_event') when 'per_hour' then 'per_hour' else 'per_event' end,
      'rate_paise', pr.customer_paise, 'active', true));
  end loop;

  -- ── Packages (partner-priced; the engine's suggestion kept beside it) ──
  for pk in select * from jsonb_array_elements(coalesce(p_payload->'packages', '[]'::jsonb)) loop
    v_saved := public.save_sambramo_trade_package(
      s.id, null,
      jsonb_build_object(
        'name', pk->>'name',
        'description', coalesce(pk->>'description', ''),
        'status', 'UNDER_REVIEW',
        'source', 'SAMBRAMO_TEMPLATE',
        'template_id', reg.id || ':' || lower(coalesce(pk->>'key', pk->>'name')),
        'commercial_inputs', jsonb_build_object(
          'tier', upper(coalesce(pk->>'key', '')), 'badge', pk->>'badge',
          'inclusions', coalesce(pk->'inclusions', '[]'::jsonb), 'pricing_unit', 'package',
          'availability_policy', 'instant', 'payment_policy', 'advance'),
        'trade_inputs', coalesce(pk->'meta', '{}'::jsonb) || jsonb_build_object(
          'duration_hours', nullif(pk->>'hours', '')::numeric,
          'take_home_paise', (pk->>'take_home_paise')::bigint,
          'customer_paise', public.sambramo_customer_paise_for((pk->>'take_home_paise')::bigint, reg.id),
          'generated_take_home_paise', nullif(pk->>'generated_take_home_paise', '')::bigint,
          'edited_by_partner', nullif(pk->>'generated_take_home_paise', '')::bigint is distinct from (pk->>'take_home_paise')::bigint)
      ),
      v_addons,
      jsonb_build_object('base_price', (pk->>'take_home_paise')::bigint / 100.0, 'pricing_unit', 'package',
                         'minimum_order', 1, 'included_duration', nullif(pk->>'hours', '')::numeric)
    );
    update public.sambramo_trade_packages
       set listing_version_id = v_version_id,
           calculation_snapshot = jsonb_build_object(
             'engine', 'trades_v1', 'trade_id', reg.id, 'key', pk->>'key', 'version', v_version,
             'platform_fee_rate', public.sambramo_trade_fee(reg.id),
             'generated_take_home_paise', nullif(pk->>'generated_take_home_paise', '')::bigint,
             'final_take_home_paise', (pk->>'take_home_paise')::bigint,
             'customer_paise', public.sambramo_customer_paise_for((pk->>'take_home_paise')::bigint, reg.id),
             'generated_at', now())
     where id = (v_saved->>'package_id')::uuid;
    v_pkgs := v_pkgs || jsonb_build_array(jsonb_build_object('key', pk->>'key', 'id', v_saved->>'package_id',
      'take_home_paise', (pk->>'take_home_paise')::bigint,
      'customer_paise', public.sambramo_customer_paise_for((pk->>'take_home_paise')::bigint, reg.id)));
  end loop;

  -- ── Catering: menus (→ dishes by key) and live counters ─────────────
  if reg.id = 'catering_food' then
    perform public.sambramo_write_catering(v_version_id, p_payload, reg.id);
  end if;

  -- ── Resources: the listing's real staff / vehicles / spaces / capacity ──
  if p_payload ? 'resources' then
    update public.sambramo_resources set active = false, updated_at = now()
     where vendor_service_id = s.id
       and resource_key not in (select x->>'resource_key' from jsonb_array_elements(p_payload->'resources') x);
    for it in select * from jsonb_array_elements(p_payload->'resources') loop
      if coalesce((it->>'quantity')::numeric, 0) <= 0 then raise exception 'Enter how many "%" you have.', it->>'label'; end if;
      insert into public.sambramo_resources (vendor_id, vendor_service_id, kind, resource_key, label, quantity, unit,
                                             buffer_minutes, attributes, private_ref, active, updated_at)
      values (vd.id, s.id, it->>'kind', it->>'resource_key', it->>'label', (it->>'quantity')::numeric,
              coalesce(nullif(it->>'unit', ''), 'unit'), coalesce((it->>'buffer_minutes')::integer, 0),
              coalesce(it->'attributes', '{}'::jsonb), coalesce(it->'private_ref', '{}'::jsonb), true, now())
      on conflict (vendor_service_id, resource_key) do update
        set kind = excluded.kind, label = excluded.label, quantity = excluded.quantity, unit = excluded.unit,
            buffer_minutes = excluded.buffer_minutes, attributes = excluded.attributes,
            private_ref = excluded.private_ref, active = true, updated_at = now();
    end loop;
  end if;

  -- ── Location and private legal name (same as Anchor) ────────────────
  if loc ? 'lat' and loc ? 'lng' then
    if coalesce(loc->>'postal_code', '') ~ '^[1-9][0-9]{5}$' then
      perform public.set_partner_location(vd.id, loc->>'postal_code',
        (loc->>'lat')::double precision, (loc->>'lng')::double precision, nullif(loc->>'locality', ''));
    end if;
    update public.vendors
       set formatted_address = nullif(loc->>'formatted_address', ''),
           state = coalesce(nullif(loc->>'state', ''), state),
           location_source = nullif(loc->>'source', ''),
           location_confirmed_at = case when (loc->>'confirmed')::boolean then now() else location_confirmed_at end,
           travel_scope = nullif(loc->>'travel_scope', '')
     where id = vd.id;
  end if;
  if nullif(trim(coalesce(p_payload->>'legal_name', '')), '') is not null then
    insert into public.sambramo_partner_private (vendor_id, legal_name, updated_at)
    values (vd.id, trim(p_payload->>'legal_name'), now())
    on conflict (vendor_id) do update set legal_name = excluded.legal_name, updated_at = now();
  end if;

  return jsonb_build_object('ok', true, 'version_id', v_version_id, 'version', v_version,
                            'trade_id', reg.id, 'packages', v_pkgs);
end;
$$;
revoke all on function public.submit_listing_version(uuid, jsonb) from public, anon;
grant execute on function public.submit_listing_version(uuid, jsonb) to authenticated;

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

  -- Catering prices menus, packages and counters with its own pricer.
  if reg.id = 'catering_food' then
    return public.resolve_catering(p_vendor_service_id, p_req);
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
        if coalesce(v_free, 0) < 1 then soft := array_append(soft, case when rs.kind = 'staff' then 'no_driver_free' else 'vehicle_not_free' end);
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
        'catering', case when p.trade_inputs ? 'catering' then jsonb_build_object('price_model', p.trade_inputs->>'price_model',
          'menu_keys', p.trade_inputs->'menu_keys', 'counter_keys', p.trade_inputs->'counter_keys', 'included_services', p.trade_inputs->'included_services',
          'exclusions', p.trade_inputs->>'exclusions', 'guest_min', p.trade_inputs->'guest_min', 'guest_max', p.trade_inputs->'guest_max',
          'tier', p.trade_inputs->>'tier') end,
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
        'customer_paise', a.customer_paise, 'included_in', a.included_in, 'description', a.description, 'min_qty', a.min_qty)), '[]'::jsonb)
      from public.sambramo_addon_rules a where a.listing_version_id = lv.id),
    -- Catering: menus by course with each dish's diet and allergens; counters.
    'menus', (select coalesce(jsonb_agg(jsonb_build_object(
        'menu_key', m.menu_key, 'name', m.name, 'description', m.description, 'diet', m.diet, 'cuisine_ids', m.cuisine_ids,
        'service_style', m.service_style, 'event_types', m.event_types, 'min_guests', m.min_guests, 'max_guests', m.max_guests,
        'lead_days', m.lead_days, 'price_model', m.price_model, 'customer_paise', m.customer_paise,
        'child_customer_paise', m.child_customer_paise, 'extra_guest_customer_paise', m.extra_guest_customer_paise,
        'fixed_scope', m.fixed_scope, 'included_services', m.included_services,
        'items', (select coalesce(jsonb_agg(jsonb_build_object('dish_key', mi.dish_key, 'course_group', mi.course_group, 'included', mi.included,
            'extra_customer_paise', mi.extra_customer_paise, 'required', mi.required, 'choice_group', mi.choice_group, 'portion', mi.portion,
            'name', ci.name, 'diet', ci.attributes->>'diet', 'allergens', ci.attributes->'allergens', 'description', ci.attributes->>'description')
            order by mi.course_group, mi.sort_order), '[]'::jsonb)
          from public.sambramo_catering_menu_items mi
          join public.sambramo_catalogue_items ci on ci.listing_version_id = lv.id and ci.item_key = mi.dish_key
         where mi.menu_id = m.id)) order by m.sort_order), '[]'::jsonb)
      from public.sambramo_catering_menus m where m.listing_version_id = lv.id and m.status = 'active'),
    'counters', (select coalesce(jsonb_agg(jsonb_build_object('key', c.counter_key, 'name', c.name, 'type', c.counter_type, 'description', c.description,
        'price_model', c.price_model, 'customer_paise', c.customer_paise, 'duration_hours', c.duration_hours, 'included_servings', c.included_servings,
        'indoor_outdoor', c.indoor_outdoor, 'space_required', c.space_required, 'power_water', c.power_water,
        'dishes', (select coalesce(jsonb_agg(ci.name), '[]'::jsonb) from public.sambramo_live_counter_items lci
                    join public.sambramo_catalogue_items ci on ci.listing_version_id = lv.id and ci.item_key = lci.dish_key where lci.counter_id = c.id))
        order by c.sort_order), '[]'::jsonb)
      from public.sambramo_live_counters c where c.listing_version_id = lv.id and c.status = 'active')
  )
  from public.vendor_services s
  join public.vendors v on v.id = s.vendor_id
  join public.sambramo_listing_versions lv on lv.vendor_service_id = s.id and lv.status = 'LIVE' and lv.seasonal_window_id is null
  where s.id = p_vendor_service_id
$$;
revoke all on function public.listing_public(uuid) from public;
grant execute on function public.listing_public(uuid) to anon, authenticated;

-- ═══ Custom quotes: a discount line subtracts (spec Part 19) ══════════
alter table public.sambramo_quote_line_items add column if not exists is_discount boolean not null default false;
comment on column public.sambramo_quote_line_items.is_discount is 'Subtracts from the quote total; api/submit-custom-quote never lets the total go below zero.';


-- ═══ Catering's registry row describes the new flow's answers ═════════
-- (src/data/trades/catering_food.js; submit checks these are present)
update public.sambramo_trade_registry
   set required_answers = array['services','prep_location','service_styles','max_guests','guests_per_day','events_per_day','staff','min_billable_guests','child_policy'],
       allowed_kinds = array['per_guest','fixed','per_unit','quote'],
       resource_model = 'capacity', catalogue_key = 'dishes', schema_version = 2
 where id = 'catering_food';


commit;
