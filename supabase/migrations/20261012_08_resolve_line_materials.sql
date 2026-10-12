-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisites: 20261012_02 .. _07, all of them.
-- Safe to apply alone. New functions only; no existing function is
-- replaced, so there is nothing to regress.
--
-- Does THIS booking need materials bought for it?
--
-- ══════════════════════════════════════════════════════════════════
-- THE RULE THE WHOLE THING TURNS ON
-- ══════════════════════════════════════════════════════════════════
-- A trade being "procurement-eligible" does not mean every booking in
-- that trade needs a deposit. The booking's own catalogue choices
-- decide, and when they cannot decide, a human does -- never a guess.
--
-- Four answers, and exactly one is chargeable:
--
--   NO_MATERIALS                 carry on; normal checkout, normal payout
--   MATERIALS_INCLUDED_IN_PRICE  make the list, charge nothing more
--   MATERIALS_INCREMENTAL        itemise it and ASK the customer
--   MANUAL_REVIEW                say so honestly; do not invent anything
--
-- The constraint materials_only_incremental_is_chargeable (20261012_04)
-- enforces that in the table, so a bug here cannot bill an included
-- booking.
--
-- ── "paid", not "accepted" ─────────────────────────────────────────
-- 059:36-45 says CONFIRMED means paid. Starting procurement on an
-- accepted-but-unpaid line spends money nobody has sent.
--
-- ── Why cost_paise is used narrowly ────────────────────────────────
-- sambramo_rate_rules.cost_paise is only populated under
-- price_mode='cost_plus'. Under target_net and customer -- the two
-- common modes -- it is NULL and proves nothing. Treating it as a
-- general "materials are included" signal would be wrong, so it is
-- consulted in exactly one rule.
--
-- Rollback:
--   drop function public.open_line_materials(uuid, boolean);
--   drop function public.resolve_line_materials(uuid);
--   drop function public.submit_material_review(uuid, jsonb, text);

begin;

create or replace function public.resolve_line_materials(p_line_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_line        record;
  v_req         record;
  v_policy      record;
  v_lv          record;
  v_reasons     text[] := '{}';
  v_blockers    text[] := '{}';
  v_methods     text[] := '{}';
  v_items       jsonb  := '[]'::jsonb;
  v_estimate    bigint := 0;
  v_included    bigint := 0;
  v_decl_true   integer := 0;
  v_decl_false  integer := 0;
  v_decl_null   integer := 0;
  v_unpriced    integer := 0;
  v_rails_on    boolean;
  v_event_date  date;
  v_guests      numeric;
  v_snapshot    jsonb;
begin
  -- R0 · the line
  select l.*, r.customer_id, r.event_date, r.guest_count, o.vendor_id
    into v_line
    from public.booking_lines l
    join public.booking_requests r on r.id = l.request_id
    left join public.dispatch_offers o on o.id = l.accepted_offer_id
   where l.id = p_line_id;

  if v_line.id is null then
    return jsonb_build_object('ok', false, 'reasons', array['line_not_found']);
  end if;

  -- R1 · confirmed means paid
  if v_line.status not in ('paid', 'in_progress', 'delivered') then
    return jsonb_build_object('ok', false, 'reasons', array['line_not_confirmed'],
      'line_status', v_line.status);
  end if;

  v_event_date := v_line.event_date;
  v_guests := coalesce(v_line.guest_count, 0);

  -- R2 · already resolved
  select * into v_req from public.booking_material_requirements
   where line_id = p_line_id and status <> 'void' limit 1;
  if v_req.id is not null then
    return jsonb_build_object('ok', true, 'decision', v_req.decision,
      'reasons', v_req.reasons || array['already_resolved'],
      'requirement_id', v_req.id, 'estimate_paise', v_req.estimate_paise,
      'engine_version', v_req.engine_version);
  end if;

  -- R3 · money has already moved
  if exists (select 1 from public.procurement_quotes q
              where q.line_id = p_line_id and q.status in ('funded', 'settled')) then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array['already_funded'], 'estimate_paise', 0);
  end if;

  -- R4 · an ACTIVE policy, or nothing happens
  select * into v_policy from public.sambramo_procurement_policy
   where trade_id = v_line.trade_id and status = 'active' limit 1;
  if v_policy.id is null then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array['no_procurement_policy'], 'trade_id', v_line.trade_id,
      'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  -- R5 · this trade never buys materials
  if v_policy.classification = 'never' then
    return jsonb_build_object('ok', true, 'decision', 'NO_MATERIALS',
      'reasons', array['trade_never_procures'], 'trade_id', v_line.trade_id,
      'policy', jsonb_build_object('id', v_policy.id, 'version', v_policy.version),
      'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  -- R6 · a free-text quote has no BOM to match
  if coalesce(v_line.spec_mode, '') = 'quote' then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array['custom_quote_lane'], 'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  -- R7/R8 · the listing version the price came from
  select lv.* into v_lv
    from public.sambramo_listing_versions lv
   where lv.id = nullif(v_line.pricing_snapshot->>'listing_version_id', '')::uuid;
  if v_lv.id is null then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array[case when v_line.pricing_snapshot ? 'listing_version_id'
                            then 'listing_version_gone' else 'no_pricing_snapshot' end],
      'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  -- ── Is it already paid for? ──────────────────────────────────────
  -- R9 · the partner declared it on the listing
  if v_policy.inclusion_signal ? 'included_when'
     and public.sambramo_cond_holds(v_policy.inclusion_signal->'included_when', v_lv.answers) then
    return jsonb_build_object('ok', true, 'decision', 'MATERIALS_INCLUDED_IN_PRICE',
      'reasons', array['declared_included_in_listing'],
      'estimate_paise', 0, 'engine_version', 'mat-1',
      'policy', jsonb_build_object('id', v_policy.id, 'version', v_policy.version));
  end if;

  -- R10/R11/R13/R14 · what the booked items themselves declare
  select count(*) filter (where c.materials_included is true),
         count(*) filter (where c.materials_included is false),
         count(*) filter (where c.materials_included is null)
    into v_decl_true, v_decl_false, v_decl_null
    from public.sambramo_catalogue_items c
   where c.listing_version_id = v_lv.id and c.active;

  if v_decl_true > 0 and v_decl_false = 0 and v_decl_null = 0 then
    return jsonb_build_object('ok', true, 'decision', 'MATERIALS_INCLUDED_IN_PRICE',
      'reasons', array['catalogue_items_declare_included'],
      'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  if v_decl_true > 0 and (v_decl_false > 0 or v_decl_null > 0) then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array['mixed_inclusion_declarations'], 'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  if v_decl_null > 0 and v_decl_false = 0 and v_policy.classification = 'conditional' then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array['inclusion_not_declared'], 'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  v_reasons := array_append(v_reasons, 'materials_not_included_in_listing');

  -- ── What does it need? ───────────────────────────────────────────
  -- R16/R17 · roll up the active BOM for the trade. Catalogue- and
  -- dish-level BOMs are resolved by the caller-supplied selection in a
  -- later revision; the trade default is what exists for every trade
  -- today, and an absent one is an honest escalation rather than a zero.
  select coalesce(jsonb_agg(jsonb_build_object(
           'material_id', m.id, 'name', m.name, 'unit', m.unit, 'category', m.category,
           'qty_suggested', round(
              (bl.qty_per_basis * (1 + bl.wastage_rate)
               * case bv.basis_unit when 'per_guest' then greatest(v_guests, 1) else 1 end)::numeric, 4),
           'unit_cost_paise', coalesce(bl.snapshot_unit_cost_paise, m.default_unit_cost_paise),
           'cost_as_of', coalesce(bl.snapshot_cost_as_of, m.cost_as_of),
           'bom_version_id', bv.id, 'bom_line_id', bl.id,
           'reusable', bl.reusable, 'source', 'bom') order by bl.sort_order), '[]'::jsonb),
         count(*) filter (where coalesce(bl.snapshot_unit_cost_paise, m.default_unit_cost_paise) is null
                             or coalesce(bl.snapshot_cost_as_of, m.cost_as_of) is null)
    into v_items, v_unpriced
    from public.sambramo_bom_versions bv
    join public.sambramo_bom_lines bl on bl.bom_version_id = bv.id
    join public.sambramo_material_defs m on m.id = bl.material_id
   where bv.status = 'active' and bv.trade_id = v_line.trade_id;

  if jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array_append(v_reasons, 'no_bom_for_selection'), 'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  if v_unpriced > 0 then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array_append(v_reasons, 'material_cost_unknown'), 'items', v_items,
      'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  select coalesce(sum(((x->>'qty_suggested')::numeric * (x->>'unit_cost_paise')::bigint))::bigint, 0)
    into v_estimate from jsonb_array_elements(v_items) x;

  -- R18 · it rolls up to nothing
  if v_estimate <= 0 then
    return jsonb_build_object('ok', true, 'decision', 'NO_MATERIALS',
      'reasons', array_append(v_reasons, 'bom_rolls_to_zero'), 'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  -- ── May we quote for it? ─────────────────────────────────────────
  -- R19
  if not v_policy.allow_incremental then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array_append(v_reasons, 'incremental_not_enabled_for_trade'), 'items', v_items,
      'included_estimate_paise', v_estimate, 'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;
  -- R20
  if v_estimate > v_policy.max_auto_quote_paise then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array_append(v_reasons, 'estimate_above_auto_cap'), 'items', v_items,
      'included_estimate_paise', v_estimate, 'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;
  -- R21
  if v_event_date is not null
     and (v_event_date::timestamptz - now()) < make_interval(hours => v_policy.min_lead_hours) then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array_append(v_reasons, 'too_late_to_procure'), 'items', v_items,
      'included_estimate_paise', v_estimate, 'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;
  -- R22 · the partner has to have accepted the terms this runs under
  if v_line.vendor_id is not null
     and not public.has_accepted_agreement(v_line.vendor_id, 'materials_procurement_terms', '') then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array_append(v_reasons, 'partner_has_not_accepted_materials_terms'), 'items', v_items,
      'included_estimate_paise', v_estimate, 'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  -- R23 · is there any way to actually pay for it?
  select route_supplier_enabled into v_rails_on from public.procurement_rails where id;
  if 'platform_supplier' = any (v_policy.allowed_methods) then
    if coalesce(v_rails_on, false) or exists (
         select 1 from public.procurement_suppliers s where s.active) then
      v_methods := array_append(v_methods, 'platform_supplier');
    else
      v_blockers := array_append(v_blockers, 'supplier_payment_rail_unavailable');
    end if;
  end if;
  if 'partner_supplier' = any (v_policy.allowed_methods)
     or 'partner_stock' = any (v_policy.allowed_methods) then
    if v_line.vendor_id is not null
       and exists (select 1 from public.partner_payout_accounts pa where pa.vendor_id = v_line.vendor_id) then
      if 'partner_supplier' = any (v_policy.allowed_methods) then v_methods := array_append(v_methods, 'partner_supplier'); end if;
      if 'partner_stock'    = any (v_policy.allowed_methods) then v_methods := array_append(v_methods, 'partner_stock');    end if;
    else
      v_blockers := array_append(v_blockers, 'partner_has_no_payout_account');
    end if;
  end if;

  if cardinality(v_methods) = 0 then
    return jsonb_build_object('ok', true, 'decision', 'MANUAL_REVIEW',
      'reasons', array_append(v_reasons, 'no_payment_path_for_materials'),
      'method_blockers', to_jsonb(v_blockers), 'items', v_items,
      'included_estimate_paise', v_estimate, 'estimate_paise', 0, 'engine_version', 'mat-1');
  end if;

  -- R24 · itemise it and ask the customer
  v_snapshot := jsonb_build_object(
    'line_id', p_line_id, 'request_id', v_line.request_id, 'trade_id', v_line.trade_id,
    'spec_mode', v_line.spec_mode, 'line_status', v_line.status,
    'event_date', v_event_date, 'guest_count', v_guests,
    'listing_version_id', v_lv.id,
    'policy', to_jsonb(v_policy), 'captured_at', now());

  return jsonb_build_object('ok', true, 'decision', 'MATERIALS_INCREMENTAL',
    'reasons', array_append(v_reasons, 'needs_customer_approval'),
    'trade_id', v_line.trade_id,
    'policy', jsonb_build_object('id', v_policy.id, 'version', v_policy.version,
                                 'classification', v_policy.classification),
    'estimate_paise', v_estimate, 'included_estimate_paise', 0,
    'method_default', v_policy.default_method,
    'methods_available', to_jsonb(v_methods),
    'method_blockers', to_jsonb(v_blockers),
    'items', v_items,
    'inputs_snapshot', v_snapshot,
    'engine_version', 'mat-1');
end $$;

-- The writer. Idempotent through uq_material_requirement_per_line.
create or replace function public.open_line_materials(p_line_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res jsonb;
  v_req_id uuid;
  v_line record;
  v_item jsonb;
begin
  v_res := public.resolve_line_materials(p_line_id);
  if not coalesce((v_res->>'ok')::boolean, false) then return v_res; end if;
  if v_res ? 'requirement_id' then return v_res; end if;      -- already resolved

  select l.id, l.trade_id, o.vendor_id into v_line
    from public.booking_lines l
    left join public.dispatch_offers o on o.id = l.accepted_offer_id
   where l.id = p_line_id;

  insert into public.booking_material_requirements
    (line_id, vendor_id, trade_id, decision, reasons, engine_version,
     policy_id, policy_version, inputs_snapshot,
     estimate_paise, included_estimate_paise, method, method_blockers, status)
  values (
    p_line_id, v_line.vendor_id, v_line.trade_id,
    v_res->>'decision',
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(v_res->'reasons')), '{}'),
    coalesce(v_res->>'engine_version', 'mat-1'),
    nullif(v_res#>>'{policy,id}', '')::uuid,
    nullif(v_res#>>'{policy,version}', '')::integer,
    coalesce(v_res->'inputs_snapshot', '{}'::jsonb),
    case when v_res->>'decision' = 'MATERIALS_INCREMENTAL'
         then coalesce((v_res->>'estimate_paise')::bigint, 0) else 0 end,
    coalesce((v_res->>'included_estimate_paise')::bigint, 0),
    v_res->>'method_default',
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(v_res->'method_blockers')), '{}'),
    case when v_res->>'decision' = 'MATERIALS_INCREMENTAL' then 'partner_review' else 'open' end)
  on conflict do nothing
  returning id into v_req_id;

  if v_req_id is null then
    select id into v_req_id from public.booking_material_requirements
     where line_id = p_line_id and status <> 'void' limit 1;
    return v_res || jsonb_build_object('requirement_id', v_req_id, 'already_existed', true);
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(v_res->'items', '[]'::jsonb)) loop
    insert into public.booking_material_items
      (requirement_id, material_id, name, unit, category, qty_suggested,
       unit_cost_paise, cost_as_of, amount_paise, source, bom_version_id, bom_line_id, reusable)
    values (v_req_id, v_item->>'material_id', v_item->>'name', v_item->>'unit', v_item->>'category',
            (v_item->>'qty_suggested')::numeric,
            nullif(v_item->>'unit_cost_paise', '')::bigint,
            nullif(v_item->>'cost_as_of', '')::date,
            coalesce(round((v_item->>'qty_suggested')::numeric
                     * coalesce(nullif(v_item->>'unit_cost_paise', '')::bigint, 0))::bigint, 0),
            'bom',
            nullif(v_item->>'bom_version_id', '')::uuid,
            nullif(v_item->>'bom_line_id', '')::uuid,
            coalesce((v_item->>'reusable')::boolean, false));
  end loop;

  return v_res || jsonb_build_object('requirement_id', v_req_id);
end $$;

-- The partner adjusts quantities, within the policy, with a reason.
create or replace function public.submit_material_review(
  p_requirement_id uuid, p_items jsonb, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_owner uuid;
  v_item jsonb;
begin
  select * into v_req from public.booking_material_requirements where id = p_requirement_id;
  if v_req.id is null then raise exception 'no such requirement'; end if;

  select v.profile_id into v_owner from public.vendors v where v.id = v_req.vendor_id;
  if v_owner is distinct from auth.uid() then
    raise exception 'only the partner on this booking can review its materials';
  end if;
  if v_req.status not in ('open', 'partner_review') then
    raise exception 'materials for this booking are already %', v_req.status;
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    update public.booking_material_items
       set qty_partner = (v_item->>'qty_partner')::numeric,
           qty_change_reason = v_item->>'reason'
     where id = (v_item->>'id')::uuid and requirement_id = p_requirement_id;
  end loop;

  update public.booking_material_requirements
     set partner_reviewed_at = now(), partner_note = p_note, updated_at = now()
   where id = p_requirement_id;

  return jsonb_build_object('ok', true, 'requirement_id', p_requirement_id);
end $$;

revoke all on function public.resolve_line_materials(uuid) from public, anon;
revoke all on function public.open_line_materials(uuid) from public, anon;
revoke all on function public.submit_material_review(uuid, jsonb, text) from public, anon;
grant execute on function public.resolve_line_materials(uuid) to authenticated, service_role;
grant execute on function public.open_line_materials(uuid) to authenticated, service_role;
grant execute on function public.submit_material_review(uuid, jsonb, text) to authenticated;

commit;
