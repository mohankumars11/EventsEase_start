-- Seasonal price updates, and one correction to submit_anchor_listing_version.
--
-- 1. submit_anchor_listing_version archived EVERY pending version of the
--    listing, so a seasonal submission threw away an ordinary one waiting
--    for review. It now archives only drafts of the same kind.
-- 2. submit_seasonal_listing_version: the window must be open now and cover
--    this trade; only the pricing models the window permits may change
--    ('packages' and 'addons' are permitted_fields too). Everything else
--    must equal the live version. The new version applies only to the
--    window's event dates and goes to review like any other.

begin;

create or replace function public.submit_anchor_listing_version(
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
  cfg public.sambramo_pricing_config%rowtype;
  v_version integer;
  v_version_id uuid;
  m jsonb := coalesce(p_payload->'models', '{}'::jsonb);
  loc jsonb := coalesce(p_payload->'location', '{}'::jsonb);
  ov jsonb := coalesce(p_payload->'overrides', '{}'::jsonb);
  k text;
  r jsonb;
  v_take bigint;
  v_rule_id uuid;
  rule_ids jsonb := '{}'::jsonb;
  -- package derivation
  e_take bigint; e_hours numeric; e_rule text;
  g_take bigint; g_hours numeric;
  x_take bigint; x_hours numeric; x_rule text;
  v_max_hours numeric;
  t text; v_gen bigint; v_final bigint; v_hours numeric; v_saved jsonb; v_inc jsonb;
  v_pkgs jsonb := '[]'::jsonb;
  a jsonb;
  v_addons jsonb := '[]'::jsonb;
begin
  select * into s from public.vendor_services where id = p_vendor_service_id;
  if not found then raise exception 'Listing not found.'; end if;
  select * into vd from public.vendors where id = s.vendor_id;
  if vd.profile_id is distinct from auth.uid() then raise exception 'You can only submit your own listing.'; end if;
  select * into cfg from public.sambramo_pricing_config limit 1;

  if jsonb_typeof(m) <> 'object' or (select count(*) from jsonb_object_keys(m)) = 0 then
    raise exception 'Choose at least one way you charge.';
  end if;

  -- Validate every enabled model has an exact amount and its limits.
  for k, r in select * from jsonb_each(m) loop
    if k not in ('hour','session','event','half_day','full_day','multi_day') then
      raise exception 'Unknown pricing model %.', k;
    end if;
    v_take := coalesce((r->>'take_home_paise')::bigint, 0);
    if v_take <= 0 then raise exception 'Enter an amount for %.', replace(k, '_', '-'); end if;
    if k = 'hour' and (v_take < cfg.min_take_home_hour_paise or v_take > cfg.max_take_home_hour_paise) then
      raise exception 'Hourly take-home must be between ₹% and ₹%.',
        cfg.min_take_home_hour_paise / 100, cfg.max_take_home_hour_paise / 100;
    end if;
    if k = 'hour' and (coalesce((r->>'min_hours')::numeric, 0) <= 0 or coalesce((r->>'max_hours')::numeric, 0) < (r->>'min_hours')::numeric) then
      raise exception 'Set your minimum and longest hours for hourly bookings.';
    end if;
  end loop;

  select coalesce(max(version), 0) + 1 into v_version
    from public.sambramo_listing_versions where vendor_service_id = s.id;

  -- Earlier unsubmitted or rejected drafts of this listing are replaced.
  -- Only drafts of the SAME kind are replaced: a seasonal submission must
  -- not discard an ordinary version waiting for review, nor the reverse.
  update public.sambramo_trade_packages p set status = 'ARCHIVED', updated_at = now()
    from public.sambramo_listing_versions lv
   where p.listing_version_id = lv.id and lv.vendor_service_id = s.id
     and lv.status in ('DRAFT','ACTION_REQUIRED','UNDER_REVIEW')
     and lv.seasonal_window_id is not distinct from nullif(p_payload->>'seasonal_window_id', '')::uuid
     and p.status in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED');
  update public.sambramo_listing_versions set status = 'ARCHIVED', updated_at = now()
   where vendor_service_id = s.id and status in ('DRAFT','ACTION_REQUIRED','UNDER_REVIEW')
     and seasonal_window_id is not distinct from nullif(p_payload->>'seasonal_window_id', '')::uuid;

  insert into public.sambramo_listing_versions (
    vendor_id, vendor_service_id, trade, version, status, parent_version_id,
    seasonal_window_id, effective_from, effective_to,
    profile, booking_rules, travel_rules, submitted_at
  ) values (
    vd.id, s.id, s.category, v_version, 'UNDER_REVIEW',
    (select id from public.sambramo_listing_versions where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is null limit 1),
    nullif(p_payload->>'seasonal_window_id', '')::uuid,
    nullif(p_payload->>'effective_from', '')::date, nullif(p_payload->>'effective_to', '')::date,
    coalesce(p_payload->'profile', '{}'::jsonb),
    coalesce(p_payload->'booking_rules', '{}'::jsonb),
    coalesce(p_payload->'travel_rules', '{}'::jsonb),
    now()
  ) returning id into v_version_id;

  -- Rate rules
  for k, r in select * from jsonb_each(m) loop
    v_take := (r->>'take_home_paise')::bigint;
    insert into public.sambramo_rate_rules (
      listing_version_id, model, event_categories, included_hours, included_sessions, min_hours, max_hours,
      max_audience, take_home_paise, customer_paise, extra_hour_take_home_paise, extra_session_take_home_paise,
      overtime_step_minutes, overtime_grace_minutes, multi_day, meta
    ) values (
      v_version_id, k,
      coalesce(array(select jsonb_array_elements_text(r->'event_categories')), '{}'),
      nullif(r->>'hours', '')::numeric,
      nullif(r->>'sessions', '')::integer,
      nullif(r->>'min_hours', '')::numeric,
      nullif(r->>'max_hours', '')::numeric,
      nullif(p_payload->'profile'->>'max_audience', '')::integer,
      v_take, public.sambramo_customer_paise(v_take),
      nullif(r->>'extra_hour_take_home_paise', '')::bigint,
      nullif(r->>'extra_session_take_home_paise', '')::bigint,
      nullif(r->>'overtime_step_minutes', '')::integer,
      coalesce(nullif(r->>'overtime_grace_minutes', '')::integer, 0),
      case when k = 'multi_day' then r->'multi_day' end,
      coalesce(r->'meta', '{}'::jsonb)
    ) returning id into v_rule_id;
    rule_ids := rule_ids || jsonb_build_object(k, v_rule_id);
  end loop;

  -- Add-on rules
  for a in select * from jsonb_array_elements(coalesce(p_payload->'addons', '[]'::jsonb)) loop
    v_take := greatest(0, coalesce((a->>'take_home_paise')::bigint, 0));
    insert into public.sambramo_addon_rules (
      listing_version_id, addon_id, label, unit, take_home_paise, customer_paise, event_categories, notice_days, included_in
    ) values (
      v_version_id, a->>'addon_id', a->>'label', coalesce(nullif(a->>'unit', ''), 'per_event'),
      v_take, public.sambramo_customer_paise(v_take),
      coalesce(array(select jsonb_array_elements_text(a->'event_categories')), '{}'),
      coalesce((a->>'notice_days')::integer, 0),
      coalesce(array(select jsonb_array_elements_text(a->'included_in')), '{}')
    );
    v_addons := v_addons || jsonb_build_array(jsonb_build_object(
      'name', a->>'label', 'unit', case coalesce(a->>'unit', 'per_event') when 'per_hour' then 'per_hour' else 'per_event' end,
      'rate_paise', public.sambramo_customer_paise(v_take), 'active', true));
  end loop;

  -- ── Essential ─────────────────────────────────────────────────────────
  if m ? 'hour' then
    e_take := (m->'hour'->>'take_home_paise')::bigint * (m->'hour'->>'min_hours')::numeric;
    e_hours := (m->'hour'->>'min_hours')::numeric; e_rule := 'hour';
  elsif m ? 'session' then
    e_take := (m->'session'->>'take_home_paise')::bigint; e_hours := coalesce((m->'session'->>'hours')::numeric, 2); e_rule := 'session';
  elsif m ? 'event' then
    e_take := (m->'event'->>'take_home_paise')::bigint; e_hours := coalesce((m->'event'->>'hours')::numeric, 4); e_rule := 'event';
  elsif m ? 'half_day' then
    e_take := (m->'half_day'->>'take_home_paise')::bigint; e_hours := coalesce((m->'half_day'->>'hours')::numeric, 4); e_rule := 'half_day';
  elsif m ? 'full_day' then
    e_take := (m->'full_day'->>'take_home_paise')::bigint; e_hours := coalesce((m->'full_day'->>'hours')::numeric, 8); e_rule := 'full_day';
  else
    e_take := (m->'multi_day'->>'take_home_paise')::bigint; e_hours := coalesce((m->'multi_day'->>'hours')::numeric, 8); e_rule := 'multi_day';
  end if;

  v_max_hours := greatest(
    coalesce((m->'hour'->>'max_hours')::numeric, 0),
    coalesce((m->'full_day'->>'hours')::numeric, 0),
    coalesce((m->'event'->>'hours')::numeric, 0),
    coalesce((m->'half_day'->>'hours')::numeric, 0),
    e_hours);

  -- ── Signature ─────────────────────────────────────────────────────────
  g_take := round(e_take * cfg.signature_uplift)::bigint;
  g_hours := least(e_hours * 2, v_max_hours);

  -- ── VIP ───────────────────────────────────────────────────────────────
  if m ? 'full_day' then
    x_take := round((m->'full_day'->>'take_home_paise')::bigint * cfg.vip_factor)::bigint;
    x_hours := coalesce((m->'full_day'->>'hours')::numeric, 8); x_rule := 'full_day';
  elsif m ? 'hour' then
    x_take := round((m->'hour'->>'take_home_paise')::bigint * (m->'hour'->>'max_hours')::numeric * cfg.vip_factor)::bigint;
    x_hours := (m->'hour'->>'max_hours')::numeric; x_rule := 'hour';
  else
    x_take := round(e_take * cfg.vip_factor)::bigint; x_hours := v_max_hours; x_rule := e_rule;
  end if;

  foreach t in array array['ESSENTIAL','SIGNATURE','VIP'] loop
    v_gen := case t when 'ESSENTIAL' then e_take when 'SIGNATURE' then g_take else x_take end;
    v_hours := case t when 'ESSENTIAL' then e_hours when 'SIGNATURE' then g_hours else x_hours end;
    v_final := coalesce(nullif(ov->t->>'take_home_paise', '')::bigint, v_gen);
    if v_final <= 0 then raise exception '% price must be greater than 0.', initcap(t); end if;
    v_hours := coalesce(nullif(ov->t->>'hours', '')::numeric, v_hours);
    v_inc := coalesce(ov->t->'inclusions',
      (select coalesce(jsonb_agg(x->>'addon_id'), '[]'::jsonb)
         from jsonb_array_elements(coalesce(p_payload->'addons', '[]'::jsonb)) x
        where x->'included_in' ? t));

    v_saved := public.save_sambramo_trade_package(
      s.id, null,
      jsonb_build_object(
        'name', initcap(t),
        'description', case t when 'ESSENTIAL' then 'Hosting for your event'
                              when 'SIGNATURE' then 'Hosting with script and planning'
                              else 'Premium full-day hosting' end,
        'status', 'UNDER_REVIEW',
        'source', 'SAMBRAMO_TEMPLATE',
        'template_id', 'anchor_v3:' || lower(t),
        'commercial_inputs', jsonb_build_object(
          'tier', t, 'badge', case when t = 'SIGNATURE' then 'Most popular' end,
          'inclusions', v_inc, 'pricing_unit', 'package',
          'availability_policy', 'instant', 'payment_policy', 'advance'),
        'trade_inputs', jsonb_build_object(
          'duration_hours', v_hours,
          'take_home_paise', v_final,
          'customer_paise', public.sambramo_customer_paise(v_final),
          'generated_take_home_paise', v_gen,
          'edited_by_partner', v_final <> v_gen)
      ),
      v_addons,
      -- The price book holds the SUPPLY rate (what the partner keeps),
      -- as save_sambramo_trade_package's own validation message says.
      jsonb_build_object('base_price', v_final / 100.0, 'pricing_unit', 'package',
                         'minimum_order', 1, 'included_duration', v_hours)
    );

    update public.sambramo_trade_packages
       set listing_version_id = v_version_id,
           rate_rule_id = (rule_ids->>(case t when 'VIP' then x_rule else e_rule end))::uuid,
           calculation_snapshot = jsonb_build_object(
             'engine', 'anchor_v3', 'tier', t, 'version', v_version,
             'platform_fee_rate', cfg.platform_fee_rate,
             'signature_uplift', cfg.signature_uplift, 'vip_factor', cfg.vip_factor,
             'basis', case t when 'VIP' then x_rule else e_rule end,
             'generated_take_home_paise', v_gen, 'final_take_home_paise', v_final,
             'customer_paise', public.sambramo_customer_paise(v_final),
             'edited_by_partner', v_final <> v_gen, 'generated_at', now())
     where id = (v_saved->>'package_id')::uuid;

    v_pkgs := v_pkgs || jsonb_build_array(jsonb_build_object(
      'tier', t, 'id', v_saved->>'package_id', 'hours', v_hours,
      'take_home_paise', v_final, 'customer_paise', public.sambramo_customer_paise(v_final),
      'generated_take_home_paise', v_gen));
  end loop;

  -- Location: the confirmed pin and how far they travel.
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

  return jsonb_build_object('ok', true, 'version_id', v_version_id, 'version', v_version, 'packages', v_pkgs);
end;
$$;

revoke all on function public.submit_anchor_listing_version(uuid, jsonb) from public, anon;
grant execute on function public.submit_anchor_listing_version(uuid, jsonb) to authenticated;

create or replace function public.submit_seasonal_listing_version(
  p_vendor_service_id uuid,
  p_window_id uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.sambramo_seasonal_windows%rowtype;
  s public.vendor_services%rowtype;
  live public.sambramo_listing_versions%rowtype;
  rr record;
  v_new bigint;
  v_payload jsonb := p_payload;
begin
  select * into s from public.vendor_services where id = p_vendor_service_id;
  if not found then raise exception 'Listing not found.'; end if;
  select * into w from public.sambramo_seasonal_windows where id = p_window_id;
  if not found or now() not between w.opens_at and w.closes_at then
    raise exception 'This seasonal price window is not open.';
  end if;
  if cardinality(w.trades) > 0 and not (s.category = any(w.trades)) then
    raise exception 'This seasonal window does not cover your service.';
  end if;
  select * into live from public.sambramo_listing_versions
   where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is null limit 1;
  if not found then raise exception 'Seasonal prices need a live listing first.'; end if;

  -- A model the window does not permit must keep its live take-home.
  for rr in select model, take_home_paise from public.sambramo_rate_rules where listing_version_id = live.id loop
    if not (rr.model = any(w.permitted_fields)) then
      v_new := nullif(p_payload->'models'->rr.model->>'take_home_paise', '')::bigint;
      if v_new is distinct from rr.take_home_paise then
        raise exception 'The % price cannot change in this window.', replace(rr.model, '_', '-');
      end if;
    end if;
  end loop;
  if not ('packages' = any(w.permitted_fields)) then
    v_payload := jsonb_set(v_payload, '{overrides}', '{}'::jsonb);
  end if;

  v_payload := v_payload || jsonb_build_object(
    'seasonal_window_id', w.id, 'effective_from', w.event_from, 'effective_to', w.event_to);
  return public.submit_anchor_listing_version(s.id, v_payload);
end;
$$;

revoke all on function public.submit_seasonal_listing_version(uuid, uuid, jsonb) from public, anon;
grant execute on function public.submit_seasonal_listing_version(uuid, uuid, jsonb) to authenticated;

commit;
