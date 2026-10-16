-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisites: 20261012_02 .. _08, all of them.
-- Safe to apply alone. New functions only.
--
-- The verbs. _08 decides; this is how anybody acts on the decision.
--
-- Every one is SECURITY DEFINER and re-checks who is calling, because
-- the partner app is a Capacitor WebView holding an anon key: a rule
-- enforced in a React component is a suggestion (145's header).
--
-- Rollback: drop each function by name.

begin;

-- ── The partner's materials list, ready to show ────────────────────
create or replace function public.my_line_materials(p_line_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_req record; v_owner uuid; v_quote record; v_items jsonb; v_pos record;
begin
  select * into v_req from public.booking_material_requirements
   where line_id = p_line_id and status <> 'void' limit 1;
  if v_req.id is null then return null; end if;

  select v.profile_id into v_owner from public.vendors v where v.id = v_req.vendor_id;
  if v_owner is distinct from auth.uid() and not public.caller_is_operator() then
    return null;
  end if;

  -- The partner sees names, units and quantities. unit_cost_paise is the
  -- platform's buy price and is NOT projected here.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', i.id, 'name', i.name, 'unit', i.unit, 'category', i.category,
           'qty_suggested', i.qty_suggested, 'qty_partner', i.qty_partner,
           'qty_final', i.qty_final, 'reusable', i.reusable, 'source', i.source)
           order by i.sort_order), '[]'::jsonb)
    into v_items from public.booking_material_items i where i.requirement_id = v_req.id;

  select * into v_quote from public.procurement_quotes
   where requirement_id = v_req.id and status <> 'void'
   order by version desc limit 1;

  select * into v_pos from public.procurement_position where quote_id = v_quote.id;

  return jsonb_build_object(
    'requirement_id', v_req.id,
    'decision', v_req.decision,
    'reasons', to_jsonb(v_req.reasons),
    'status', v_req.status,
    'method', v_req.method,
    'method_blockers', to_jsonb(v_req.method_blockers),
    'partner_reviewed_at', v_req.partner_reviewed_at,
    'items', v_items,
    'quote', case when v_quote.id is null then null else jsonb_build_object(
      'id', v_quote.id, 'status', v_quote.status, 'version', v_quote.version,
      'total_paise', v_quote.total_paise, 'expires_at', v_quote.expires_at,
      'approved_at', v_quote.approved_at) end,
    'funded_paise', coalesce(v_pos.held_paise, 0),
    'remaining_paise', coalesce(v_pos.remaining_paise, 0));
end $$;

-- ── Partner sends the list to the customer as a quote ──────────────
create or replace function public.send_procurement_quote(p_requirement_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_req record; v_owner uuid; v_policy record; v_customer uuid;
  v_sub bigint := 0; v_handling bigint; v_total bigint;
  v_quote_id uuid; v_ver integer;
begin
  select * into v_req from public.booking_material_requirements where id = p_requirement_id;
  if v_req.id is null then raise exception 'no such materials requirement'; end if;

  select v.profile_id into v_owner from public.vendors v where v.id = v_req.vendor_id;
  if v_owner is distinct from auth.uid() and not public.caller_is_operator() then
    raise exception 'only the partner on this booking can send its materials list';
  end if;

  -- Only an incremental decision may ever be charged for. The table
  -- enforces this too; refusing here gives a sentence instead of a
  -- constraint violation.
  if v_req.decision <> 'MATERIALS_INCREMENTAL' then
    raise exception 'this booking does not need a materials payment (%)', v_req.decision;
  end if;
  if v_req.partner_reviewed_at is null then
    raise exception 'review the quantities before sending the list';
  end if;

  select * into v_policy from public.sambramo_procurement_policy where id = v_req.policy_id;
  select r.customer_id into v_customer
    from public.booking_lines l join public.booking_requests r on r.id = l.request_id
   where l.id = v_req.line_id;

  -- The amount is built from the ITEMS, never passed in.
  select coalesce(sum(round(coalesce(i.qty_partner, i.qty_suggested)
                            * coalesce(i.unit_cost_paise, 0))::bigint), 0)
    into v_sub from public.booking_material_items i where i.requirement_id = v_req.id;

  if v_sub <= 0 then raise exception 'there is nothing priced to send'; end if;

  v_handling := floor(v_sub * coalesce(v_policy.handling_fee_rate, 0))::bigint;
  v_total := v_sub + v_handling;

  if v_total > coalesce(v_policy.max_auto_quote_paise, 0) then
    raise exception 'this list is above the automatic limit for % and needs an operator', v_req.trade_id;
  end if;

  select coalesce(max(version), 0) + 1 into v_ver
    from public.procurement_quotes where requirement_id = v_req.id;

  insert into public.procurement_quotes
    (requirement_id, line_id, customer_id, version, subtotal_paise,
     platform_handling_paise, total_paise, handling_fee_rate,
     already_included_paise, status, sent_at, expires_at, created_by)
  values (v_req.id, v_req.line_id, v_customer, v_ver, v_sub, v_handling, v_total,
          coalesce(v_policy.handling_fee_rate, 0), v_req.included_estimate_paise,
          'sent', now(), now() + make_interval(hours => coalesce(v_policy.quote_ttl_hours, 48)),
          auth.uid())
  returning id into v_quote_id;

  insert into public.procurement_quote_items
    (quote_id, material_item_id, name, unit, qty, unit_cost_paise, amount_paise, method, sort_order)
  select v_quote_id, i.id, i.name, i.unit,
         coalesce(i.qty_partner, i.qty_suggested),
         coalesce(i.unit_cost_paise, 0),
         round(coalesce(i.qty_partner, i.qty_suggested) * coalesce(i.unit_cost_paise, 0))::bigint,
         coalesce(v_req.method, 'partner_supplier'), i.sort_order
    from public.booking_material_items i
   where i.requirement_id = v_req.id
     and round(coalesce(i.qty_partner, i.qty_suggested) * coalesce(i.unit_cost_paise, 0))::bigint > 0;

  update public.booking_material_requirements
     set status = 'quoted', updated_at = now() where id = v_req.id;

  return jsonb_build_object('ok', true, 'quote_id', v_quote_id,
    'total_paise', v_total, 'version', v_ver);
end $$;

-- ── Customer approves it ───────────────────────────────────────────
create or replace function public.approve_procurement_quote(p_quote_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q record;
begin
  select * into v_q from public.procurement_quotes where id = p_quote_id;
  if v_q.id is null then raise exception 'no such quote'; end if;
  if v_q.customer_id <> auth.uid() then
    raise exception 'only the customer who booked this can approve its materials';
  end if;
  if v_q.status <> 'sent' then raise exception 'this quote is %', v_q.status; end if;
  if v_q.expires_at < now() then
    update public.procurement_quotes set status = 'expired' where id = p_quote_id;
    raise exception 'this quote expired on %', v_q.expires_at;
  end if;

  update public.procurement_quotes
     set status = 'approved', approved_at = now(), approved_by = auth.uid()
   where id = p_quote_id;

  -- Approval is not payment. The money arrives through
  -- api/create-materials-payment + the webhook, and nothing is marked
  -- funded until the ledger has the row.
  return jsonb_build_object('ok', true, 'quote_id', p_quote_id,
    'total_paise', v_q.total_paise, 'next', 'payment');
end $$;

create or replace function public.decline_procurement_quote(p_quote_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q record;
begin
  select * into v_q from public.procurement_quotes where id = p_quote_id;
  if v_q.id is null then raise exception 'no such quote'; end if;
  if v_q.customer_id <> auth.uid() then raise exception 'not your quote'; end if;
  if v_q.status <> 'sent' then raise exception 'this quote is %', v_q.status; end if;

  update public.procurement_quotes
     set status = 'declined', declined_at = now(), decline_reason = p_reason
   where id = p_quote_id;
  update public.booking_material_requirements
     set status = 'partner_review', updated_at = now() where id = v_q.requirement_id;

  return jsonb_build_object('ok', true, 'quote_id', p_quote_id);
end $$;

-- ── What the customer is being asked to approve ────────────────────
create or replace function public.my_procurement_quote(p_quote_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_q record; v_items jsonb; v_trade text;
begin
  select * into v_q from public.procurement_quotes where id = p_quote_id;
  if v_q.id is null then return null; end if;
  if v_q.customer_id <> auth.uid() and not public.caller_is_operator() then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'name', i.name, 'unit', i.unit, 'qty', i.qty,
           'unit_cost_paise', i.unit_cost_paise, 'amount_paise', i.amount_paise)
           order by i.sort_order), '[]'::jsonb)
    into v_items from public.procurement_quote_items i where i.quote_id = p_quote_id;

  select r.trade_id into v_trade
    from public.booking_material_requirements r where r.id = v_q.requirement_id;

  return jsonb_build_object(
    'id', v_q.id, 'status', v_q.status, 'version', v_q.version, 'trade_id', v_trade,
    'subtotal_paise', v_q.subtotal_paise,
    'platform_handling_paise', v_q.platform_handling_paise,
    'tax_paise', v_q.tax_paise, 'total_paise', v_q.total_paise,
    'already_included_paise', v_q.already_included_paise,
    'expires_at', v_q.expires_at, 'sent_at', v_q.sent_at,
    'approved_at', v_q.approved_at, 'items', v_items);
end $$;

-- ── A quote nobody answered is not a live quote ────────────────────
create or replace function public.expire_procurement_quotes()
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  with gone as (
    update public.procurement_quotes set status = 'expired'
     where status = 'sent' and expires_at < now()
    returning requirement_id)
  select count(*) into v_n from gone;

  update public.booking_material_requirements
     set status = 'partner_review', updated_at = now()
   where status = 'quoted'
     and not exists (select 1 from public.procurement_quotes q
                      where q.requirement_id = booking_material_requirements.id
                        and q.status in ('sent', 'approved', 'funded', 'settled'));
  return coalesce(v_n, 0);
end $$;

-- ── Partner asks to be paid back (methods B and C) ─────────────────
create or replace function public.submit_reimbursement_claim(
  p_requirement_id uuid, p_amount_paise bigint, p_method text,
  p_evidence jsonb default '[]'::jsonb, p_note text default null,
  p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_req record; v_owner uuid; v_id uuid; v_funded bigint;
begin
  select * into v_req from public.booking_material_requirements where id = p_requirement_id;
  if v_req.id is null then raise exception 'no such materials requirement'; end if;

  select v.profile_id into v_owner from public.vendors v where v.id = v_req.vendor_id;
  if v_owner is distinct from auth.uid() then
    raise exception 'only the partner on this booking can claim for it';
  end if;

  -- You cannot be reimbursed out of money that never arrived.
  select coalesce(sum(l.amount_paise), 0) into v_funded
    from public.procurement_ledger l
    join public.procurement_quotes q on q.id = l.quote_id
   where q.requirement_id = p_requirement_id and l.kind = 'HOLD';
  if v_funded <= 0 then
    raise exception 'no materials money has been paid for this booking yet';
  end if;
  if p_amount_paise > v_funded then
    raise exception 'claim is more than the % paise funded for materials', v_funded;
  end if;

  insert into public.procurement_reimbursement_claims
    (requirement_id, vendor_id, line_id, amount_claimed_paise, method,
     evidence, partner_note, status, idempotency_key)
  values (p_requirement_id, v_req.vendor_id, v_req.line_id, p_amount_paise, p_method,
          coalesce(p_evidence, '[]'::jsonb), p_note, 'submitted', p_idempotency_key)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'claim_id', v_id);
end $$;

revoke all on function public.my_line_materials(uuid) from public, anon;
revoke all on function public.send_procurement_quote(uuid) from public, anon;
revoke all on function public.approve_procurement_quote(uuid) from public, anon;
revoke all on function public.decline_procurement_quote(uuid, text) from public, anon;
revoke all on function public.my_procurement_quote(uuid) from public, anon;
revoke all on function public.expire_procurement_quotes() from public, anon;
revoke all on function public.submit_reimbursement_claim(uuid, bigint, text, jsonb, text, text) from public, anon;

grant execute on function public.my_line_materials(uuid) to authenticated;
grant execute on function public.send_procurement_quote(uuid) to authenticated;
grant execute on function public.approve_procurement_quote(uuid) to authenticated;
grant execute on function public.decline_procurement_quote(uuid, text) to authenticated;
grant execute on function public.my_procurement_quote(uuid) to authenticated;
grant execute on function public.expire_procurement_quotes() to service_role;
grant execute on function public.submit_reimbursement_claim(uuid, bigint, text, jsonb, text, text) to authenticated;

commit;
