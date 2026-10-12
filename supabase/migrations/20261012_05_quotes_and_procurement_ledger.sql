-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisites: 059 (booking_lines), 062 (escrow_ledger, for the shape
--                this copies), 20261012_04 (requirements).
-- Safe to apply alone. Needs 04.
--
-- The customer's materials money, and where it goes.
--
-- ══════════════════════════════════════════════════════════════════
-- WHY THIS IS NOT escrow_ledger
-- ══════════════════════════════════════════════════════════════════
-- A materials amount must never become a HOLD on escrow_ledger, and
-- never a second booking_lines row. Four things break if it does, each
-- checked against the code:
--
--  1. booking_lines_accepted_has_offer (059:188-193) forces
--     accepted_offer_id to be set for a line at accepted/paid -- which
--     is exactly the join partner_jobs and partner_earnings use
--     (141:91). A materials line becomes a PHANTOM JOB on the partner's
--     calendar, job list and earnings screen.
--
--  2. routeTransfersForCapture (api/_lib/routeTransfers.js:25-58) pays
--     partner_amount_paise to the partner's Route account ON CAPTURE.
--     A materials line with a partner amount IS an early cash advance,
--     which is the thing this whole workflow exists to avoid.
--
--  3. routeRelease.js:74-78 computes
--        platformPaise = heldPaise - partnerPaise
--     so ANY hold not covered by a Route transfer is booked as
--     RELEASE_PLATFORM. Materials money would silently become platform
--     commission in every report. This is the decisive one.
--
--  4. booking_lines_split_balances (059:179-183) and
--     scripts/check-earnings-math.mjs:57 both enforce
--     customer = commission + share. Materials inside that split breaks
--     both on real data.
--
-- Migration 140 already made this call for the analogous case:
-- "Adjustments NEVER touch escrow_ledger" (140:27-43). So: a parallel
-- ledger, with escrow's own guarantees copied rather than borrowed.
--
-- Rollback (only while the ledger is empty -- the RESTRICT FKs are
-- deliberate, and a written ledger is corrected with a REFUND_CUSTOMER
-- row, never a DELETE):
--   drop view public.procurement_position;
--   drop table public.procurement_ledger, public.procurement_quote_items,
--              public.procurement_quotes cascade;

begin;

-- ── The itemised quote the customer approves ───────────────────────
create table if not exists public.procurement_quotes (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.booking_material_requirements(id) on delete restrict,
  line_id uuid not null references public.booking_lines(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  version integer not null default 1 check (version > 0),

  subtotal_paise bigint not null check (subtotal_paise > 0),
  platform_handling_paise bigint not null default 0 check (platform_handling_paise >= 0),
  tax_paise bigint not null default 0 check (tax_paise >= 0),
  total_paise bigint not null check (total_paise > 0),
  handling_fee_rate numeric(5,4) not null default 0,

  -- What the customer has ALREADY paid for inside the service price.
  -- Shown so the quote can say "you are not being charged twice", and
  -- never added into total_paise.
  already_included_paise bigint not null default 0 check (already_included_paise >= 0),

  status text not null default 'draft'
    check (status in ('draft', 'sent', 'approved', 'declined', 'expired', 'funded', 'settled', 'void')),
  sent_at timestamptz,
  expires_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  declined_at timestamptz,
  decline_reason text,

  terms_version text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),

  constraint quote_total_adds_up
    check (total_paise = subtotal_paise + platform_handling_paise + tax_paise),
  constraint quote_sent_has_an_expiry
    check (status = 'draft' or (sent_at is not null and expires_at is not null)),
  constraint quote_approval_is_recorded
    check (status not in ('approved', 'funded', 'settled')
           or (approved_at is not null and approved_by is not null))
);

-- One live quote per requirement: a second one is a revision, and a
-- revision supersedes rather than coexists.
create unique index if not exists uq_procurement_quote_one_live
  on public.procurement_quotes (requirement_id)
  where status in ('draft', 'sent', 'approved', 'funded');
create unique index if not exists uq_procurement_quote_version
  on public.procurement_quotes (requirement_id, version);
create index if not exists idx_procurement_quotes_expiring
  on public.procurement_quotes (expires_at) where status = 'sent';

create table if not exists public.procurement_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.procurement_quotes(id) on delete cascade,
  material_item_id uuid references public.booking_material_items(id) on delete set null,
  -- Snapshotted. These are the words and numbers somebody agreed to;
  -- the same rule as booking_lines.service_name (059:65).
  name text not null,
  unit text not null,
  qty numeric(14,4) not null check (qty > 0),
  unit_cost_paise bigint not null check (unit_cost_paise > 0),
  amount_paise bigint not null check (amount_paise > 0),
  method text not null check (method in ('platform_supplier', 'partner_supplier', 'partner_stock')),
  sort_order integer not null default 0
);

create index if not exists idx_procurement_quote_items
  on public.procurement_quote_items (quote_id, sort_order);

-- Money on a sent quote is a promise. Once it leaves draft the figures
-- are fixed and only the state may advance.
create or replace function public.procurement_quote_is_write_once()
returns trigger language plpgsql as $$
begin
  if old.status = 'draft' then return new; end if;

  if new.subtotal_paise is distinct from old.subtotal_paise
     or new.platform_handling_paise is distinct from old.platform_handling_paise
     or new.tax_paise is distinct from old.tax_paise
     or new.total_paise is distinct from old.total_paise
     or new.requirement_id is distinct from old.requirement_id
     or new.expires_at is distinct from old.expires_at then
    raise exception 'quote % is %; its amounts cannot change. Revise it as a new version.', old.id, old.status;
  end if;

  if new.status = old.status then return new; end if;
  if (old.status, new.status) in (
        ('sent','approved'), ('sent','declined'), ('sent','expired'), ('sent','void'),
        ('approved','funded'), ('approved','void'), ('approved','expired'),
        ('funded','settled'), ('funded','void')) then
    return new;
  end if;
  raise exception 'quote % cannot go from % to %', old.id, old.status, new.status;
end $$;

drop trigger if exists procurement_quote_write_once on public.procurement_quotes;
create trigger procurement_quote_write_once
  before update on public.procurement_quotes
  for each row execute function public.procurement_quote_is_write_once();

-- ── The ledger ─────────────────────────────────────────────────────
create table if not exists public.procurement_ledger (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.procurement_quotes(id) on delete restrict,
  line_id  uuid not null references public.booking_lines(id)      on delete restrict,

  kind text not null check (kind in (
    'HOLD',               -- the customer's materials money arrived
    'SPEND_SUPPLIER',     -- a supplier was paid (method A)
    'REIMBURSE_PARTNER',  -- the partner bought it, or used own stock (B, C)
    'RELEASE_PLATFORM',   -- the handling fee, where there is one
    'REFUND_CUSTOMER'     -- unspent remainder returned
  )),
  amount_paise bigint not null check (amount_paise <> 0),
  counterparty text not null check (counterparty in ('customer', 'partner', 'platform', 'supplier')),

  gateway_payment_id text,
  gateway_refund_id text,
  gateway_transfer_id text,
  manual_reference text,                 -- a UTR typed by hand, as escrow's ManualPayout does
  adapter text not null default 'ManualBankTransfer'
    check (adapter in ('ManualBankTransfer', 'RazorpayRoute', 'RazorpayPayout', 'PartnerAdjustment', 'Razorpay')),

  -- Promoted to real FKs in 20261012_06 / _07.
  supplier_order_id uuid,
  adjustment_id uuid references public.partner_adjustments(id) on delete restrict,

  note text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint procurement_ledger_sign_matches_kind
    check ((kind = 'HOLD' and amount_paise > 0) or (kind <> 'HOLD' and amount_paise < 0))
);

-- Money leaving names what it paid for.
alter table public.procurement_ledger drop constraint if exists procurement_ledger_outflow_is_attributed;
alter table public.procurement_ledger add constraint procurement_ledger_outflow_is_attributed
  check ((kind <> 'REIMBURSE_PARTNER' or adjustment_id is not null)
     and (kind <> 'REFUND_CUSTOMER'   or gateway_refund_id is not null or manual_reference is not null));

-- Idempotency by index, the doctrine stated at 062:112-117 and
-- razorpay-webhook.js:28-33. Callers treat 23505 as success.
create unique index if not exists uq_proc_hold_per_payment_quote
  on public.procurement_ledger (quote_id, gateway_payment_id)
  where kind = 'HOLD' and gateway_payment_id is not null;
create unique index if not exists uq_proc_spend_per_order
  on public.procurement_ledger (supplier_order_id)
  where kind = 'SPEND_SUPPLIER' and supplier_order_id is not null;
create unique index if not exists uq_proc_reimburse_per_adjustment
  on public.procurement_ledger (adjustment_id)
  where kind = 'REIMBURSE_PARTNER' and adjustment_id is not null;
create unique index if not exists uq_proc_one_platform_release
  on public.procurement_ledger (quote_id) where kind = 'RELEASE_PLATFORM';
create unique index if not exists uq_proc_refund_per_gateway
  on public.procurement_ledger (gateway_refund_id) where gateway_refund_id is not null;
create index if not exists idx_proc_ledger_quote on public.procurement_ledger (quote_id, created_at);
create index if not exists idx_proc_ledger_line  on public.procurement_ledger (line_id, created_at);

-- Append-only, exactly as escrow_ledger (062:139-155).
create or replace function public.procurement_ledger_no_update()
returns trigger language plpgsql as $$
begin
  raise exception
    'procurement_ledger is append-only. Correct money with a compensating row, never by editing one.';
end $$;

drop trigger if exists procurement_ledger_no_update on public.procurement_ledger;
create trigger procurement_ledger_no_update
  before update or delete on public.procurement_ledger
  for each row execute function public.procurement_ledger_no_update();

-- The platform cannot spend more on materials than the customer paid
-- for them. A constraint, not a hope -- 062:160-189.
create or replace function public.procurement_ledger_stays_solvent()
returns trigger language plpgsql as $$
declare
  v_balance bigint;
begin
  select coalesce(sum(amount_paise), 0) into v_balance
    from public.procurement_ledger where quote_id = new.quote_id;
  if v_balance < 0 then
    raise exception
      'procurement balance for quote % would go to % paise; materials cannot be overspent',
      new.quote_id, v_balance;
  end if;
  return null;
end $$;

drop trigger if exists procurement_ledger_solvency on public.procurement_ledger;
create constraint trigger procurement_ledger_solvency
  after insert on public.procurement_ledger
  deferrable initially immediate
  for each row execute function public.procurement_ledger_stays_solvent();

-- Defined once, so no screen computes it twice (062:190-193).
create or replace view public.procurement_position as
  select l.quote_id,
         min(l.line_id::text)::uuid as line_id,
         coalesce(sum(l.amount_paise) filter (where l.kind = 'HOLD'), 0)               as held_paise,
         coalesce(-sum(l.amount_paise) filter (where l.kind = 'SPEND_SUPPLIER'), 0)    as spent_supplier_paise,
         coalesce(-sum(l.amount_paise) filter (where l.kind = 'REIMBURSE_PARTNER'), 0) as reimbursed_partner_paise,
         coalesce(-sum(l.amount_paise) filter (where l.kind = 'RELEASE_PLATFORM'), 0)  as handling_paise,
         coalesce(-sum(l.amount_paise) filter (where l.kind = 'REFUND_CUSTOMER'), 0)   as refunded_paise,
         coalesce(sum(l.amount_paise), 0)                                              as remaining_paise
    from public.procurement_ledger l
   group by l.quote_id;

grant select on public.procurement_position to authenticated;

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.procurement_quotes      enable row level security;
alter table public.procurement_quote_items enable row level security;
alter table public.procurement_ledger      enable row level security;

-- The customer sees their own quote. The partner sees the quote on a
-- line they won, because they have to work from the materials list.
drop policy if exists procurement_quotes_read on public.procurement_quotes;
create policy procurement_quotes_read on public.procurement_quotes
  for select to authenticated using (
    public.caller_is_operator()
    or customer_id = auth.uid()
    or exists (select 1 from public.booking_lines l
                 join public.dispatch_offers o on o.id = l.accepted_offer_id
                 join public.vendors v on v.id = o.vendor_id
                where l.id = line_id and v.profile_id = auth.uid()));

drop policy if exists procurement_quotes_operator on public.procurement_quotes;
create policy procurement_quotes_operator on public.procurement_quotes
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

drop policy if exists procurement_quote_items_read on public.procurement_quote_items;
create policy procurement_quote_items_read on public.procurement_quote_items
  for select to authenticated using (
    exists (select 1 from public.procurement_quotes q where q.id = quote_id));

drop policy if exists procurement_quote_items_operator on public.procurement_quote_items;
create policy procurement_quote_items_operator on public.procurement_quote_items
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

-- NO insert policy for anyone, exactly as escrow_ledger (062:241-243).
-- A client that could insert here could mint a HOLD it never paid for.
-- Writes come from SECURITY DEFINER functions and the service role.
drop policy if exists procurement_ledger_read on public.procurement_ledger;
create policy procurement_ledger_read on public.procurement_ledger
  for select to authenticated using (
    public.caller_is_operator()
    or exists (select 1 from public.booking_lines l
                 join public.booking_requests r on r.id = l.request_id
                where l.id = line_id and r.customer_id = auth.uid())
    -- A partner has no business seeing what the platform paid a
    -- supplier; they see the row that pays THEM.
    or (kind = 'REIMBURSE_PARTNER'
        and exists (select 1 from public.booking_lines l
                      join public.dispatch_offers o on o.id = l.accepted_offer_id
                      join public.vendors v on v.id = o.vendor_id
                     where l.id = line_id and v.profile_id = auth.uid())));

commit;
