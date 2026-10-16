-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisites: 140 (partner_adjustments), 20261012_04, _05, _06.
-- The agreements half is fully independent and may be applied first.
--
-- Paying the partner back, and what they agreed to.
--
-- ── Reimbursement rides on partner_adjustments ─────────────────────
-- 140 already built an append-only, operator-written, positive-amount
-- credit with kind 'reimbursement', a line_id, a reversal index and a
-- money_audit trail, and it already flows into payout_claims and
-- payout_batches. Reinventing payouts beside it would create a second
-- way to move money to a partner, which is the thing that eventually
-- pays somebody twice. So a claim is a REQUEST; the adjustment is the
-- payment; the claim records which adjustment settled it, once.
--
-- ── Agreements are NOT partner_consents ────────────────────────────
-- 150 is DPDP consent: freely given and withdrawable as easily as
-- given, with has_consent() returning the latest row. A term you must
-- accept in order to trade is not freely given, and a contract must not
-- be "withdrawable" by a partner holding a live booking. Contracts are
-- superseded by a new version; consents are withdrawn. Different
-- lifecycles, different tables.
--
-- Rollback:
--   drop table public.procurement_reimbursement_claims cascade;
--   drop function public.has_accepted_agreement(uuid, text, text);
--   drop table public.partner_agreement_acceptances cascade;

begin;

-- ── Reimbursement claims ───────────────────────────────────────────
create table if not exists public.procurement_reimbursement_claims (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.booking_material_requirements(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  line_id uuid not null references public.booking_lines(id) on delete restrict,

  amount_claimed_paise bigint not null check (amount_claimed_paise > 0),
  amount_approved_paise bigint check (amount_approved_paise is null or amount_approved_paise > 0),
  method text not null check (method in ('partner_supplier', 'partner_stock')),
  evidence jsonb not null default '[]'::jsonb,
  partner_note text,

  status text not null check (status in ('submitted', 'under_review', 'approved', 'rejected', 'reversed')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  reject_reason text,

  adjustment_id uuid references public.partner_adjustments(id) on delete restrict,
  reverses_id uuid references public.procurement_reimbursement_claims(id),

  idempotency_key text,
  created_at timestamptz not null default now(),

  -- An approval names a reviewer, a time, an amount no larger than the
  -- claim, and the adjustment that actually pays it.
  constraint claim_approval_is_complete
    check (status <> 'approved'
           or (amount_approved_paise is not null
               and amount_approved_paise <= amount_claimed_paise
               and reviewed_by is not null and reviewed_at is not null
               and adjustment_id is not null)),
  constraint claim_rejection_says_why
    check (status <> 'rejected'
           or (reviewed_at is not null and length(trim(coalesce(reject_reason, ''))) > 3)),
  -- Buying it yourself requires an invoice. Using your own stock is not
  -- a purchase, so it legitimately has none.
  constraint claim_purchase_has_evidence
    check (method <> 'partner_supplier' or jsonb_array_length(evidence) > 0)
);

create unique index if not exists uq_reimbursement_idempotency
  on public.procurement_reimbursement_claims (vendor_id, idempotency_key) where idempotency_key is not null;
-- One adjustment per claim: paying twice is the failure this prevents.
create unique index if not exists uq_reimbursement_one_adjustment
  on public.procurement_reimbursement_claims (adjustment_id) where adjustment_id is not null;
create unique index if not exists uq_reimbursement_one_reversal
  on public.procurement_reimbursement_claims (reverses_id) where reverses_id is not null;
-- One live claim per requirement per partner.
create unique index if not exists uq_reimbursement_one_live
  on public.procurement_reimbursement_claims (requirement_id, vendor_id)
  where status in ('submitted', 'under_review', 'approved');
create index if not exists idx_reimbursement_queue
  on public.procurement_reimbursement_claims (status, created_at)
  where status in ('submitted', 'under_review');

-- ── Versioned contractual acceptance ───────────────────────────────
create table if not exists public.partner_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  agreement text not null check (agreement in
    ('materials_procurement_terms', 'supplier_terms', 'platform_terms')),
  version text not null check (length(trim(version)) > 0),
  -- The BYTES they were shown, not a URL whose contents can change
  -- after the fact.
  document_url text not null,
  document_sha256 text not null check (document_sha256 ~ '^[0-9a-f]{64}$'),
  accepted_at timestamptz not null default now(),    -- server clock, as 150:63 insists
  by_profile uuid not null references public.profiles(id) on delete restrict,
  ip inet,
  user_agent text,
  superseded_by uuid references public.partner_agreement_acceptances(id)
);

create unique index if not exists uq_agreement_once
  on public.partner_agreement_acceptances (vendor_id, agreement, version);
create index if not exists idx_agreement_current
  on public.partner_agreement_acceptances (vendor_id, agreement, accepted_at desc);

create or replace function public.agreement_acceptance_is_append_only()
returns trigger language plpgsql as $$
begin
  if old.superseded_by is null and new.superseded_by is not null
     and new.vendor_id = old.vendor_id and new.agreement = old.agreement
     and new.version = old.version and new.document_sha256 = old.document_sha256
     and new.accepted_at = old.accepted_at then
    return new;
  end if;
  raise exception 'an acceptance is a record of a moment; supersede it, do not edit it';
end $$;

drop trigger if exists agreement_acceptance_append_only on public.partner_agreement_acceptances;
create trigger agreement_acceptance_append_only
  before update on public.partner_agreement_acceptances
  for each row execute function public.agreement_acceptance_is_append_only();

create or replace function public.has_accepted_agreement(
  p_vendor uuid, p_agreement text, p_min_version text default '')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partner_agreement_acceptances a
     where a.vendor_id = p_vendor
       and a.agreement = p_agreement
       and a.version >= coalesce(p_min_version, ''))
$$;

-- Self-acceptance only, exactly as set_consent refuses (150:111-120).
-- An operator cannot accept a contract on a partner's behalf.
create or replace function public.accept_partner_agreement(
  p_vendor_id uuid, p_agreement text, p_version text,
  p_document_url text, p_document_sha256 text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_id uuid;
begin
  select v.profile_id into v_owner from public.vendors v where v.id = p_vendor_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'only the partner themselves can accept an agreement';
  end if;

  insert into public.partner_agreement_acceptances
    (vendor_id, agreement, version, document_url, document_sha256, by_profile)
  values (p_vendor_id, p_agreement, p_version, p_document_url, p_document_sha256, auth.uid())
  on conflict (vendor_id, agreement, version) do update set version = excluded.version
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.accept_partner_agreement(uuid, text, text, text, text) from public, anon;
grant execute on function public.accept_partner_agreement(uuid, text, text, text, text) to authenticated;
revoke all on function public.has_accepted_agreement(uuid, text, text) from public, anon;
grant execute on function public.has_accepted_agreement(uuid, text, text) to authenticated, service_role;

-- ── money_audit vocabulary ─────────────────────────────────────────
-- Widening a CHECK never invalidates an existing row, so the validation
-- scan always passes; and 136's money_audit_no_update trigger is a row
-- trigger, which does not fire on DDL.
do $$
declare
  v_con text;
begin
  select conname into v_con from pg_constraint
   where conrelid = 'public.money_audit'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%action%in%';
  if v_con is not null then
    execute format('alter table public.money_audit drop constraint %I', v_con);
  end if;
exception when undefined_table then null;
end $$;

do $$
begin
  alter table public.money_audit add constraint money_audit_action_check
    check (action in ('adjustment_added', 'adjustment_reversed', 'payout_requested',
                      'payout_settled', 'payout_failed', 'batch_settled',
                      'reimbursement_approved', 'reimbursement_reversed',
                      'procurement_quote_approved', 'procurement_spend'));
exception
  when duplicate_object then null;
  when undefined_table then null;
  when check_violation then
    raise notice 'money_audit holds an action outside the new list; leaving its CHECK off';
end $$;

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.procurement_reimbursement_claims enable row level security;
alter table public.partner_agreement_acceptances    enable row level security;

-- The 140:237-245 pair exactly.
drop policy if exists reimbursement_read_own on public.procurement_reimbursement_claims;
create policy reimbursement_read_own on public.procurement_reimbursement_claims
  for select to authenticated using (
    public.caller_is_operator()
    or vendor_id in (select v.id from public.vendors v where v.profile_id = auth.uid()));
drop policy if exists reimbursement_operator on public.procurement_reimbursement_claims;
create policy reimbursement_operator on public.procurement_reimbursement_claims
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

drop policy if exists agreements_read_own on public.partner_agreement_acceptances;
create policy agreements_read_own on public.partner_agreement_acceptances
  for select to authenticated using (
    public.caller_is_operator()
    or vendor_id in (select v.id from public.vendors v where v.profile_id = auth.uid()));
drop policy if exists agreements_operator on public.partner_agreement_acceptances;
create policy agreements_operator on public.partner_agreement_acceptances
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

commit;
