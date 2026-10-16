-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisites: 059 (booking_lines), 140 (partner_adjustments),
--                20261012_02 (sambramo_procurement_policy).
-- Safe to apply alone. One new table, its guard, its RLS, five RPCs.
--
-- The materials advance, the simple way.
--
-- ══════════════════════════════════════════════════════════════════
-- WHAT THIS REPLACES, AND WHY
-- ══════════════════════════════════════════════════════════════════
-- 20261012_03..08 computed material quantities from a Bill of Materials:
-- a recipe per catalogue item, priced per unit, rolled against the guest
-- count. It is correct and it cannot run, because a BOM has to be
-- authored for 26 trades and none exists. At this scale that data is
-- weeks of work for a number a human can simply read off a bill.
--
-- So: the partner buys from his own supplier, uploads the BILL and
-- PHOTOGRAPHS OF THE GOODS, an operator checks the evidence and pays
-- him. Where he has to order a week early and cannot float it, Sambramo
-- advances the money first. Evidence justifies the payment, not
-- arithmetic.
--
-- ══════════════════════════════════════════════════════════════════
-- WHY THE MONEY IS NOT TAKEN OUT OF escrow_ledger
-- ══════════════════════════════════════════════════════════════════
-- Funding the advance by releasing part of the customer's escrow early
-- breaks two things that work today:
--
--   1. uq_escrow_one_partner_release (062:122) permits exactly ONE
--      RELEASE_PARTNER row per line. An early partial release cannot be
--      a second one.
--   2. routeRelease.js:73-77 computes platformPaise = held - partner,
--      where partner is the sum of ROUTE TRANSFERS. Money that left
--      escrow early without being a transfer is therefore booked as
--      RELEASE_PLATFORM -- the customer's flower money would appear as
--      Sambramo's commission in every report.
--
-- Same economics, different mechanism: the advance is a positive
-- partner_adjustments row (kind 'reimbursement'), and a negative
-- 'recovery' row at settlement takes it back out of the payout. The
-- customer's escrowed money still funds it, because the payout comes
-- from that escrow. escrow_ledger and routeRelease are untouched.
--
-- partner_adjustments is already append-only (140:104), operator-write
-- only (140:140), audited through write_money_audit, and already
-- rendered on the partner's Earnings screen by AdjustmentsPanel -- so
-- the money shows up correctly without a line of new UI.
--
-- Rollback: drop table public.materials_advances cascade;
--           plus the five functions by name.

begin;

create table if not exists public.materials_advances (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.booking_lines(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  trade_id text not null references public.sambramo_trade_registry(id) on delete restrict,

  status text not null default 'requested' check (status in (
    'not_needed',        -- the partner says this job needs nothing bought
    'requested',         -- partner has asked for money to place an order
    'advance_approved',  -- operator approved; the money is with the partner
    'purchased',         -- the supplier BILL is uploaded
    'goods_evidenced',   -- PHOTOS of the goods are uploaded
    'under_review',      -- an operator is checking bill + photos
    'approved',          -- evidence accepted
    'paid',              -- the partner has been paid / the advance squared off
    'rejected'           -- evidence not accepted; says why
  )),

  -- ── The optional pre-funding path ───────────────────────────────
  requested_paise bigint check (requested_paise is null or requested_paise > 0),
  request_reason text,
  requested_at timestamptz,
  advance_paise bigint check (advance_paise is null or advance_paise > 0),
  advance_adjustment_id uuid references public.partner_adjustments(id) on delete restrict,
  advance_approved_at timestamptz,
  advance_approved_by uuid references public.profiles(id),

  -- ── The evidence ────────────────────────────────────────────────
  -- storage_path inside the private partner-documents bucket, never a
  -- URL: a URL in a column outlives the permission that made it work.
  bill_path text,
  bill_name text,
  bill_bytes integer,
  bill_amount_paise bigint check (bill_amount_paise is null or bill_amount_paise > 0),
  supplier_name text,
  supplier_id uuid references public.procurement_suppliers(id) on delete set null,
  -- [{ path, at }] -- photographs of what actually arrived
  goods_photos jsonb not null default '[]'::jsonb,

  goods_location text check (goods_location is null or goods_location in ('with_partner', 'at_venue')),
  goods_moved_at timestamptz,

  -- ── The verdict ─────────────────────────────────────────────────
  approved_paise bigint check (approved_paise is null or approved_paise > 0),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  settle_adjustment_id uuid references public.partner_adjustments(id) on delete restrict,
  recovery_adjustment_id uuid references public.partner_adjustments(id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A claim for money names a supplier and carries a bill.
  constraint advance_evidence_is_complete
    check (status not in ('under_review', 'approved', 'paid')
           or (bill_path is not null and bill_amount_paise is not null
               and length(trim(coalesce(supplier_name, ''))) > 1)),
  -- An approval names a reviewer, a time and an amount no larger than
  -- the bill. Approving more than was spent is the failure this stops.
  constraint advance_approval_is_complete
    check (status not in ('approved', 'paid')
           or (approved_paise is not null and reviewed_by is not null
               and reviewed_at is not null
               and approved_paise <= coalesce(bill_amount_paise, approved_paise))),
  constraint advance_rejection_says_why
    check (status <> 'rejected'
           or (reviewed_at is not null and length(trim(coalesce(review_note, ''))) > 3)),
  constraint advance_approved_names_its_money
    check (status <> 'advance_approved'
           or (advance_paise is not null and advance_adjustment_id is not null))
);

-- One live advance per booking line.
create unique index if not exists uq_materials_advance_per_line
  on public.materials_advances (line_id) where status <> 'rejected';
-- The operator's queue: the two states that are waiting on a human.
create index if not exists idx_materials_advance_queue
  on public.materials_advances (status, created_at)
  where status in ('requested', 'under_review');
create index if not exists idx_materials_advance_vendor
  on public.materials_advances (vendor_id, created_at desc);
-- Pay once, recover once.
create unique index if not exists uq_advance_one_advance_adjustment
  on public.materials_advances (advance_adjustment_id) where advance_adjustment_id is not null;
create unique index if not exists uq_advance_one_settle_adjustment
  on public.materials_advances (settle_adjustment_id) where settle_adjustment_id is not null;
create unique index if not exists uq_advance_one_recovery_adjustment
  on public.materials_advances (recovery_adjustment_id) where recovery_adjustment_id is not null;

-- ── The partner owns the row; the verdict is not theirs ────────────
-- Copied from guard_document_self_verify (148:111). The partner may
-- upload, re-upload and correct their own claim. They may not write the
-- amount an operator approved, the reviewer, or the adjustment ids that
-- move money. RLS lets them UPDATE the row; this decides WHAT.
create or replace function public.guard_advance_self_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.caller_is_operator() then
    return new;
  end if;

  if new.advance_paise          is distinct from old.advance_paise
     or new.advance_adjustment_id  is distinct from old.advance_adjustment_id
     or new.advance_approved_at    is distinct from old.advance_approved_at
     or new.advance_approved_by    is distinct from old.advance_approved_by
     or new.approved_paise         is distinct from old.approved_paise
     or new.reviewed_by            is distinct from old.reviewed_by
     or new.reviewed_at            is distinct from old.reviewed_at
     or new.review_note            is distinct from old.review_note
     or new.settle_adjustment_id   is distinct from old.settle_adjustment_id
     or new.recovery_adjustment_id is distinct from old.recovery_adjustment_id then
    raise exception 'a partner cannot write the verdict on their own materials claim'
      using errcode = 'insufficient_privilege';
  end if;

  -- A partner may not promote themselves into a decided state.
  if new.status is distinct from old.status
     and new.status in ('advance_approved', 'approved', 'paid', 'rejected') then
    raise exception 'only Sambramo can move this to %', new.status
      using errcode = 'insufficient_privilege';
  end if;

  -- A new bill is a new claim. The reviewer accepted a different file,
  -- so the verdict cannot carry over -- 093's rule for documents.
  if new.bill_path is distinct from old.bill_path and old.status in ('under_review', 'approved') then
    new.status := 'under_review';
    new.approved_paise := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_advance_self_review on public.materials_advances;
create trigger trg_advance_self_review
  before update on public.materials_advances
  for each row execute function public.guard_advance_self_review();

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.materials_advances enable row level security;

drop policy if exists materials_advance_read on public.materials_advances;
create policy materials_advance_read on public.materials_advances
  for select to authenticated using (
    public.caller_is_operator()
    or vendor_id in (select v.id from public.vendors v where v.profile_id = auth.uid())
    -- The customer sees that materials are being bought for THEIR event.
    or exists (select 1 from public.booking_lines l
                 join public.booking_requests r on r.id = l.request_id
                where l.id = line_id and r.customer_id = auth.uid()));

drop policy if exists materials_advance_operator on public.materials_advances;
create policy materials_advance_operator on public.materials_advances
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

-- ── Is this booking even eligible? ─────────────────────────────────
create or replace function public.advance_eligible(p_trade_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sambramo_procurement_policy p
                  where p.trade_id = p_trade_id
                    and p.status = 'active'
                    and p.classification <> 'never')
$$;

-- ── What the partner sees on a job ─────────────────────────────────
create or replace function public.my_line_advance(p_line_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_line record; v_adv record; v_eligible boolean;
begin
  select l.id, l.status, l.trade, o.vendor_id, r.customer_id
    into v_line
    from public.booking_lines l
    join public.booking_requests r on r.id = l.request_id
    left join public.dispatch_offers o on o.id = l.accepted_offer_id
   where l.id = p_line_id;
  if v_line.id is null then return null; end if;

  -- Either side of the booking, or an operator.
  if not public.caller_is_operator()
     and v_line.customer_id is distinct from auth.uid()
     and not exists (select 1 from public.vendors v
                      where v.id = v_line.vendor_id and v.profile_id = auth.uid()) then
    return null;
  end if;

  select p.trade_id is not null into v_eligible
    from public.sambramo_trade_registry t
    left join public.sambramo_procurement_policy p
      on p.trade_id = t.id and p.status = 'active' and p.classification <> 'never'
   where t.name = v_line.trade;

  select * into v_adv from public.materials_advances
   where line_id = p_line_id and status <> 'rejected' limit 1;

  return jsonb_build_object(
    'line_id', p_line_id,
    'eligible', coalesce(v_eligible, false),
    'line_status', v_line.status,
    'advance', case when v_adv.id is null then null else jsonb_build_object(
      'id', v_adv.id, 'status', v_adv.status,
      'requested_paise', v_adv.requested_paise, 'request_reason', v_adv.request_reason,
      'advance_paise', v_adv.advance_paise,
      'bill_path', v_adv.bill_path, 'bill_name', v_adv.bill_name,
      'bill_amount_paise', v_adv.bill_amount_paise,
      'supplier_name', v_adv.supplier_name,
      'goods_photos', v_adv.goods_photos,
      'goods_location', v_adv.goods_location,
      'approved_paise', v_adv.approved_paise,
      'review_note', v_adv.review_note,
      'reviewed_at', v_adv.reviewed_at,
      'created_at', v_adv.created_at) end);
end $$;

-- ── Partner asks for money to place an order ───────────────────────
create or replace function public.request_materials_advance(
  p_line_id uuid, p_paise bigint, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_line record; v_id uuid;
begin
  select l.id, l.status, l.trade, o.vendor_id into v_line
    from public.booking_lines l
    left join public.dispatch_offers o on o.id = l.accepted_offer_id
   where l.id = p_line_id;
  if v_line.id is null then raise exception 'no such booking'; end if;

  if not exists (select 1 from public.vendors v
                  where v.id = v_line.vendor_id and v.profile_id = auth.uid()) then
    raise exception 'only the partner on this booking can ask for an advance';
  end if;

  -- Nobody buys flowers for a booking that was never paid for.
  if v_line.status not in ('paid', 'in_progress') then
    raise exception 'this booking is % -- an advance opens once it is paid for', v_line.status;
  end if;
  if p_paise is null or p_paise <= 0 then raise exception 'say how much you need'; end if;
  if length(trim(coalesce(p_reason, ''))) < 4 then raise exception 'say what it is for'; end if;

  insert into public.materials_advances
    (line_id, vendor_id, trade_id, status, requested_paise, request_reason, requested_at)
  select p_line_id, v_line.vendor_id, t.id, 'requested', p_paise, p_reason, now()
    from public.sambramo_trade_registry t where t.name = v_line.trade
  returning id into v_id;

  if v_id is null then raise exception 'this trade is not on the register'; end if;
  return jsonb_build_object('ok', true, 'advance_id', v_id);
end $$;

-- ── Operator releases the money ────────────────────────────────────
create or replace function public.approve_materials_advance(
  p_advance_id uuid, p_paise bigint, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_adv record; v_adj jsonb;
begin
  if not public.caller_is_operator() then raise exception 'not permitted'; end if;
  select * into v_adv from public.materials_advances where id = p_advance_id;
  if v_adv.id is null then raise exception 'no such advance'; end if;
  if v_adv.status <> 'requested' then raise exception 'this advance is %', v_adv.status; end if;
  if p_paise is null or p_paise <= 0 then raise exception 'an advance must be a positive amount'; end if;

  -- The money. A positive adjustment is how a partner is paid anything
  -- that no customer paid in; it is append-only and audited, and the
  -- Earnings screen already renders it.
  v_adj := public.add_partner_adjustment(
    v_adv.vendor_id, 'reimbursement', p_paise,
    coalesce(p_note, 'Materials advance to place the order'), v_adv.line_id);
  if not coalesce((v_adj->>'ok')::boolean, false) then
    raise exception 'could not release the advance: %', v_adj->>'reason';
  end if;

  update public.materials_advances
     set status = 'advance_approved',
         advance_paise = p_paise,
         advance_adjustment_id = (v_adj->>'adjustment_id')::uuid,
         advance_approved_at = now(),
         advance_approved_by = auth.uid(),
         updated_at = now()
   where id = p_advance_id;

  return jsonb_build_object('ok', true, 'advance_id', p_advance_id, 'paise', p_paise);
end $$;

-- ── Partner uploads the bill and the photographs ───────────────────
-- Paths only. The objects are already in the private partner-documents
-- bucket, put there by the client, whose RLS keys on the vendor folder.
create or replace function public.submit_advance_evidence(
  p_line_id uuid,
  p_bill_path text, p_bill_name text, p_bill_bytes integer,
  p_bill_amount_paise bigint, p_supplier_name text,
  p_goods_photos jsonb default '[]'::jsonb,
  p_goods_location text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_line record; v_id uuid; v_trade text;
begin
  select l.id, l.status, l.trade, o.vendor_id into v_line
    from public.booking_lines l
    left join public.dispatch_offers o on o.id = l.accepted_offer_id
   where l.id = p_line_id;
  if v_line.id is null then raise exception 'no such booking'; end if;
  if not exists (select 1 from public.vendors v
                  where v.id = v_line.vendor_id and v.profile_id = auth.uid()) then
    raise exception 'only the partner on this booking can send its bills';
  end if;
  if p_bill_path is null then raise exception 'attach the supplier bill'; end if;
  if p_bill_amount_paise is null or p_bill_amount_paise <= 0 then
    raise exception 'what does the bill come to?';
  end if;
  if length(trim(coalesce(p_supplier_name, ''))) < 2 then
    raise exception 'who did you buy from?';
  end if;

  select t.id into v_trade from public.sambramo_trade_registry t where t.name = v_line.trade;

  insert into public.materials_advances
    (line_id, vendor_id, trade_id, status, bill_path, bill_name, bill_bytes,
     bill_amount_paise, supplier_name, goods_photos, goods_location)
  values (p_line_id, v_line.vendor_id, v_trade, 'under_review', p_bill_path, p_bill_name,
          p_bill_bytes, p_bill_amount_paise, p_supplier_name,
          coalesce(p_goods_photos, '[]'::jsonb), p_goods_location)
  on conflict (line_id) where status <> 'rejected'
  do update set
    status = 'under_review',
    bill_path = excluded.bill_path, bill_name = excluded.bill_name,
    bill_bytes = excluded.bill_bytes, bill_amount_paise = excluded.bill_amount_paise,
    supplier_name = excluded.supplier_name,
    goods_photos = excluded.goods_photos,
    goods_location = coalesce(excluded.goods_location, public.materials_advances.goods_location),
    updated_at = now()
  returning id into v_id;

  return jsonb_build_object('ok', true, 'advance_id', v_id);
end $$;

-- ── Operator checks the evidence and settles ───────────────────────
create or replace function public.review_materials_advance(
  p_advance_id uuid, p_verdict text, p_approved_paise bigint default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_adv record; v_adj jsonb; v_rec jsonb; v_owed bigint; v_settle uuid; v_recovery uuid;
begin
  if not public.caller_is_operator() then raise exception 'not permitted'; end if;
  select * into v_adv from public.materials_advances where id = p_advance_id;
  if v_adv.id is null then raise exception 'no such advance'; end if;
  if v_adv.status not in ('under_review', 'purchased', 'goods_evidenced') then
    raise exception 'this claim is %', v_adv.status;
  end if;

  if p_verdict = 'reject' then
    if length(trim(coalesce(p_note, ''))) < 4 then raise exception 'say why it is being sent back'; end if;
    update public.materials_advances
       set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
           review_note = p_note, updated_at = now()
     where id = p_advance_id;
    return jsonb_build_object('ok', true, 'advance_id', p_advance_id, 'verdict', 'rejected');
  end if;

  if p_verdict <> 'approve' then raise exception 'verdict must be approve or reject'; end if;
  if p_approved_paise is null or p_approved_paise <= 0 then
    raise exception 'approve an amount';
  end if;
  if p_approved_paise > coalesce(v_adv.bill_amount_paise, 0) then
    raise exception 'cannot approve more than the bill (% paise)', v_adv.bill_amount_paise;
  end if;

  /* What is actually owed is the bill MINUS whatever was advanced. An
     advance already in the partner's hands is not owed twice -- that is
     the whole reason the recovery row exists. */
  v_owed := p_approved_paise - coalesce(v_adv.advance_paise, 0);

  if v_owed > 0 then
    v_adj := public.add_partner_adjustment(v_adv.vendor_id, 'reimbursement', v_owed,
      coalesce(p_note, 'Materials bill approved'), v_adv.line_id);
    if not coalesce((v_adj->>'ok')::boolean, false) then
      raise exception 'could not pay the balance: %', v_adj->>'reason';
    end if;
    v_settle := (v_adj->>'adjustment_id')::uuid;
  elsif v_owed < 0 then
    -- He was advanced more than he spent. The difference comes back.
    v_rec := public.add_partner_adjustment(v_adv.vendor_id, 'recovery', v_owed,
      'Unspent materials advance returned', v_adv.line_id);
    if not coalesce((v_rec->>'ok')::boolean, false) then
      raise exception 'could not recover the unspent advance: %', v_rec->>'reason';
    end if;
    v_recovery := (v_rec->>'adjustment_id')::uuid;
  end if;

  update public.materials_advances
     set status = 'paid', approved_paise = p_approved_paise,
         reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note,
         settle_adjustment_id = v_settle, recovery_adjustment_id = v_recovery,
         updated_at = now()
   where id = p_advance_id;

  return jsonb_build_object('ok', true, 'advance_id', p_advance_id,
    'approved_paise', p_approved_paise, 'balance_paid_paise', greatest(v_owed, 0),
    'recovered_paise', greatest(-v_owed, 0));
end $$;

revoke all on function public.advance_eligible(text) from public, anon;
revoke all on function public.my_line_advance(uuid) from public, anon;
revoke all on function public.request_materials_advance(uuid, bigint, text) from public, anon;
revoke all on function public.approve_materials_advance(uuid, bigint, text) from public, anon;
revoke all on function public.submit_advance_evidence(uuid, text, text, integer, bigint, text, jsonb, text) from public, anon;
revoke all on function public.review_materials_advance(uuid, text, bigint, text) from public, anon;

grant execute on function public.advance_eligible(text) to authenticated;
grant execute on function public.my_line_advance(uuid) to authenticated;
grant execute on function public.request_materials_advance(uuid, bigint, text) to authenticated;
grant execute on function public.approve_materials_advance(uuid, bigint, text) to authenticated;
grant execute on function public.submit_advance_evidence(uuid, text, text, integer, bigint, text, jsonb, text) to authenticated;
grant execute on function public.review_materials_advance(uuid, text, bigint, text) to authenticated;

commit;
