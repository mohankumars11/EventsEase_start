-- Submit any trade's listing version in one transaction, and say whether it
-- is ready to be booked.
--
-- The shared ListingOnboardingFlow sends what the partner entered: the
-- trade questionnaire answers, pricing rules, catalogue items, add-ons,
-- resources and (for tier trades) packages. The SERVER:
--   • checks the trade matches the listing and every required answer is there
--   • allows only the rule kinds that trade prices with (registry.allowed_kinds)
--   • turns each amount into take-home + customer paise with the TRADE's fee,
--     whatever price mode the partner entered it in
--   • writes version + rules + catalogue + add-ons + packages atomically, and
--     replaces the listing's resources
-- Anchor & MC keeps submit_anchor_listing_version (its packages are derived
-- server-side from its time rates); this function refuses it.
--
-- Depends on 20261010_07.

begin;

-- ═══ Does a showWhen / when condition hold for these answers? ═════════
-- Same semantics as holds() in src/data/trades/index.js.
create or replace function public.sambramo_cond_holds(p_cond jsonb, p_answers jsonb)
returns boolean language sql immutable set search_path = public
as $$
  select case
    when p_cond is null or jsonb_typeof(p_cond) <> 'object' then true
    when p_cond ? 'in' then coalesce(p_answers->>(p_cond->>'q'), '') in (select jsonb_array_elements_text(p_cond->'in'))
    when p_cond ? 'includes' then jsonb_typeof(p_answers->(p_cond->>'q')) = 'array'
                                   and (p_answers->(p_cond->>'q')) ? (p_cond->>'includes')
    when p_cond ? 'truthy' then coalesce(p_answers->(p_cond->>'q'), 'null'::jsonb) not in ('null'::jsonb, 'false'::jsonb, '""'::jsonb, '[]'::jsonb, '0'::jsonb)
    else true end
$$;

-- ═══ One amount → take-home + customer, by price mode ═════════════════
--   target_net  partner entered what they keep        → customer = round10(take / (1 - fee))
--   customer    partner entered what the customer pays → take = floor10(customer × (1 - fee))
--   cost_plus   partner entered cost + margin %        → take = round10(cost × (1 + margin))
create or replace function public.sambramo_price_pair(p jsonb, p_trade text)
returns table (take_home_paise bigint, customer_paise bigint, price_mode text)
language plpgsql stable set search_path = public
as $$
declare
  m text := coalesce(nullif(p->>'price_mode', ''), 'target_net');
  t bigint; c bigint;
begin
  if m = 'customer' then
    c := (round(coalesce((p->>'customer_paise')::numeric, 0) / 10) * 10)::bigint;
    t := public.sambramo_take_home_from_customer(c, p_trade);
  elsif m = 'cost_plus' then
    t := (round(coalesce((p->>'cost_paise')::numeric, 0) * (1 + coalesce((p->>'margin_pct')::numeric, 0) / 100) / 10) * 10)::bigint;
    c := public.sambramo_customer_paise_for(t, p_trade);
  elsif m = 'target_net' then
    t := coalesce((p->>'take_home_paise')::bigint, 0);
    c := public.sambramo_customer_paise_for(t, p_trade);
  else
    raise exception 'Unknown price mode %.', m;
  end if;
  return query select t, c, m;
end;
$$;

-- ═══ Submit ═══════════════════════════════════════════════════════════
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
      listing_version_id, addon_id, label, unit, take_home_paise, customer_paise, event_categories, notice_days, included_in
    ) values (
      v_version_id, a->>'addon_id', a->>'label', coalesce(nullif(a->>'unit', ''), 'per_event'),
      pr.take_home_paise, pr.customer_paise,
      coalesce(array(select jsonb_array_elements_text(a->'event_categories')), '{}'),
      coalesce((a->>'notice_days')::integer, 0),
      coalesce(array(select upper(jsonb_array_elements_text(a->'included_in'))), '{}')
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
revoke all on function public.sambramo_price_pair(jsonb, text) from public;
grant execute on function public.sambramo_price_pair(jsonb, text) to authenticated;

-- ═══ Readiness, computed for any trade ═════════════════════════════════
-- Anchor keeps anchor_readiness(); every other trade uses this. States are
-- the spec's Part 10 list.
create or replace function public.listing_readiness(p_vendor_service_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.vendor_services%rowtype;
  vd public.vendors%rowtype;
  reg public.sambramo_trade_registry%rowtype;
  lv public.sambramo_listing_versions%rowtype;
  pending public.sambramo_listing_versions%rowtype;
  ans jsonb;
  c jsonb;
  missing_docs text[] := '{}';
  pending_docs text[] := '{}';
  k text; v_missing_answers integer := 0;
  ok_profile boolean; ok_answers boolean; ok_loc boolean; ok_pricing boolean; pricing_pending boolean;
  ok_resources boolean; ok_cal boolean; ok_rules boolean; ok_payout boolean; ok_docs boolean;
  items jsonb; v_state text;
begin
  select * into s from public.vendor_services where id = p_vendor_service_id;
  if not found then raise exception 'Service not found.'; end if;
  select * into vd from public.vendors where id = s.vendor_id;
  if vd.profile_id is distinct from auth.uid() and public.get_my_role() <> 'admin' then
    raise exception 'Not your listing.';
  end if;
  select * into reg from public.sambramo_trade_registry where id = public.sambramo_trade_id(s.category);
  if not found then
    return jsonb_build_object('state', 'NOT_ON_ENGINE', 'items', '[]'::jsonb, 'quotes_ok', false);
  end if;

  select * into lv from public.sambramo_listing_versions
   where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is null limit 1;
  select * into pending from public.sambramo_listing_versions
   where vendor_service_id = s.id and status in ('UNDER_REVIEW','ACTION_REQUIRED','DRAFT')
   order by version desc limit 1;
  ans := coalesce(lv.answers, pending.answers, '{}'::jsonb);

  -- Never onboarded on the new engine: a legacy listing must re-list.
  if lv.id is null and pending.id is null then
    return jsonb_build_object('state', 'RELIST_REQUIRED', 'trade_id', reg.id, 'quotes_ok', false,
      'items', jsonb_build_array(jsonb_build_object('id','relist','label','Re-list with the new flow','status','fail',
        'next','Your old setup cannot be booked any more. Set it up again — it takes a few minutes.')));
  end if;

  foreach k in array reg.required_answers loop
    if coalesce(ans->k, 'null'::jsonb) in ('null'::jsonb, '""'::jsonb, '[]'::jsonb) then v_missing_answers := v_missing_answers + 1; end if;
  end loop;

  for c in select * from jsonb_array_elements(reg.compliance) loop
    if coalesce((c->>'blocks_instant')::boolean, false)
       and (coalesce((c->>'always')::boolean, false) or public.sambramo_cond_holds(c->'when', ans)) then
      if not exists (select 1 from public.vendor_documents d where d.vendor_id = vd.id and d.requirement_id = c->>'doc') then
        missing_docs := missing_docs || (c->>'doc');
      elsif not exists (select 1 from public.vendor_documents d where d.vendor_id = vd.id and d.requirement_id = c->>'doc' and d.status = 'accepted') then
        pending_docs := pending_docs || (c->>'doc');
      end if;
    end if;
  end loop;

  ok_profile := coalesce(vd.is_verified, false);
  ok_answers := v_missing_answers = 0;
  ok_loc := vd.location is not null and vd.location_confirmed_at is not null;
  ok_pricing := lv.id is not null;
  pricing_pending := not ok_pricing and pending.status = 'UNDER_REVIEW';
  ok_resources := reg.archetype in ('TIME_PERFORMER','PROJECT_QUOTE')
               or exists (select 1 from public.sambramo_resources r where r.vendor_service_id = s.id and r.active);
  ok_cal := exists (select 1 from public.vendor_weekly_rules r where r.vendor_id = vd.id and r.is_available)
         or exists (select 1 from public.vendor_availability a where a.vendor_id = vd.id
                     and a.slot_date >= current_date and a.status in ('OPEN','LIMITED'));
  ok_rules := coalesce(lv.booking_rules, pending.booking_rules) ?& array['advance_pct','cancellation','min_notice_days'];
  ok_payout := exists (select 1 from public.partner_payout_accounts pa where pa.vendor_id = vd.id and pa.route_account_id is not null);
  ok_docs := cardinality(missing_docs) = 0 and cardinality(pending_docs) = 0;

  items := jsonb_build_array(
    jsonb_build_object('id','profile','label','Identity verified','status', case when ok_profile then 'pass' else 'fail' end,
      'next','Finish identity verification.'),
    jsonb_build_object('id','capability','label','Service details','status', case when ok_answers then 'pass' else 'fail' end,
      'next','Answer the remaining questions about your service.'),
    jsonb_build_object('id','location','label','Location confirmed','status', case when ok_loc then 'pass' else 'fail' end,
      'next','Confirm your base location on the map.'),
    jsonb_build_object('id','pricing','label','Pricing approved','status',
      case when ok_pricing then 'pass' when pricing_pending then 'pending' else 'fail' end,
      'next', case when pricing_pending then 'Our team is reviewing your listing.' else 'Set your prices and submit them for review.' end),
    jsonb_build_object('id','resources','label','Staff, stock or capacity','status', case when ok_resources then 'pass' else 'fail' end,
      'next','Tell us what you can supply at once, so nothing is double-booked.'),
    jsonb_build_object('id','compliance','label','Licences & documents','status',
      case when ok_docs then 'pass' when cardinality(missing_docs) = 0 then 'pending' else 'fail' end,
      'next', case when cardinality(missing_docs) > 0 then 'Upload the documents this service needs.' else 'We are checking your documents.' end,
      'missing', to_jsonb(missing_docs), 'pending', to_jsonb(pending_docs)),
    jsonb_build_object('id','availability','label','Calendar & booking windows','status', case when ok_cal then 'pass' else 'fail' end,
      'next','Open some dates or set your usual week in Calendar.'),
    jsonb_build_object('id','rules','label','Booking & cancellation rules','status', case when ok_rules then 'pass' else 'fail' end,
      'next','Choose your advance, cancellation policy and minimum notice.'),
    jsonb_build_object('id','payout','label','Razorpay payout account','status', case when ok_payout then 'pass' else 'fail' end,
      'next','Complete your payout setup so Razorpay can pay you.')
  );

  v_state := case
    when not ok_profile then 'PROFILE_INCOMPLETE'
    when not ok_answers then 'ACTION_REQUIRED'
    when not ok_pricing and pricing_pending then 'PRICING_UNDER_REVIEW'
    when not ok_pricing then 'PRICING_INCOMPLETE'
    when not ok_resources then 'AVAILABILITY_INCOMPLETE'
    when not ok_cal then 'AVAILABILITY_INCOMPLETE'
    when not ok_docs then 'VERIFICATION_PENDING'
    when not ok_payout then 'PAYOUT_SETUP_PENDING'
    when not (ok_loc and ok_rules) then 'ACTION_REQUIRED'
    when coalesce(lv.booking_rules->>'instant', 'true') = 'false' then 'READY_FOR_CUSTOM_QUOTES'
    else 'READY_FOR_INSTANT_BOOKING'
  end;

  return jsonb_build_object(
    'state', v_state, 'trade_id', reg.id, 'items', items,
    'quotes_ok', ok_profile and ok_pricing,
    'live_version', lv.version, 'published_at', lv.published_at, 'price_locked_until', lv.price_locked_until);
end;
$$;
revoke all on function public.listing_readiness(uuid) from public;
grant execute on function public.listing_readiness(uuid) to authenticated;

commit;
