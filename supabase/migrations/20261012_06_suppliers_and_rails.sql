-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisites: 20261012_04 (requirements), 20261012_05 (ledger).
-- Safe to apply alone. Needs 04 and 05; promotes their deferred FKs.
--
-- Who the materials are bought from, and how they get paid.
--
-- ══════════════════════════════════════════════════════════════════
-- THE RAIL IS OFF UNTIL SOMEBODY CONFIRMS IT
-- ══════════════════════════════════════════════════════════════════
-- Razorpay Route transfers go to linked accounts created under the
-- platform (api/_lib/razorpayRoute.js). An offline flower mandi has no
-- linked account, and RazorpayX Payouts is a different product with its
-- own onboarding. Whether Route can address a third-party supplier AT
-- ALL in Sambramo's configuration is a question for Razorpay, not for
-- this repo, and it is NOT answered yet.
--
-- So procurement_rails.route_supplier_enabled is false, a trigger
-- forces every non-manual supplier payment to 'blocked_no_rail', and
-- turning it on requires a named human and a written confirmation --
-- the CHECK below enforces that, because a checklist is a thing
-- somebody does once (create-booking-payment.js:96).
--
-- What ships today: adapter='ManualBankTransfer', an operator pays the
-- supplier and types the UTR. That is the ManualPayout precedent from
-- 062:84-95. No api/_lib/supplierPayouts.js is written until the flag
-- can legally be flipped: a stub that "will work later" is the thing
-- that gets switched on by accident.
--
-- Rollback:
--   drop table public.procurement_supplier_payments,
--              public.procurement_supplier_order_items,
--              public.procurement_supplier_orders,
--              public.procurement_suppliers,
--              public.procurement_rails cascade;

begin;

-- ── The rail switch ────────────────────────────────────────────────
create table if not exists public.procurement_rails (
  id boolean primary key default true check (id),      -- exactly one row
  route_supplier_enabled boolean not null default false,
  payout_rail text check (payout_rail is null or payout_rail in ('RazorpayRouteSupplier', 'RazorpayPayout')),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id),
  confirmation_note text,
  updated_at timestamptz not null default now(),
  constraint rail_on_needs_a_named_confirmation
    check (not route_supplier_enabled
           or (payout_rail is not null and confirmed_at is not null and confirmed_by is not null
               and length(trim(coalesce(confirmation_note, ''))) > 10))
);

insert into public.procurement_rails (id) values (true) on conflict (id) do nothing;

-- ── Suppliers ──────────────────────────────────────────────────────
create table if not exists public.procurement_suppliers (
  id uuid primary key default gen_random_uuid(),
  -- Set when the supplier is already a Sambramo partner, typically on
  -- trade 'event_materials_supplier'. NULL = an offline shop an
  -- operator deals with by hand. That trade is a partner CATEGORY;
  -- this row is what makes it usable as a supply chain.
  vendor_id uuid references public.vendors(id) on delete restrict,
  kind text not null check (kind in ('platform_partner', 'offline')),
  name text not null check (length(trim(name)) > 0),
  gstin text,
  contact jsonb not null default '{}'::jsonb,
  material_categories text[] not null default '{}',
  service_pincodes text[] not null default '{}',
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint supplier_kind_matches_vendor
    check ((kind = 'platform_partner' and vendor_id is not null)
        or (kind = 'offline' and vendor_id is null))
);

create unique index if not exists uq_supplier_one_per_vendor
  on public.procurement_suppliers (vendor_id) where vendor_id is not null;
create index if not exists idx_suppliers_cats
  on public.procurement_suppliers using gin (material_categories) where active;

-- ── Orders ─────────────────────────────────────────────────────────
create table if not exists public.procurement_supplier_orders (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.booking_material_requirements(id) on delete restrict,
  quote_id uuid not null references public.procurement_quotes(id) on delete restrict,
  supplier_id uuid not null references public.procurement_suppliers(id) on delete restrict,
  order_no text not null unique,
  status text not null default 'draft' check (status in
    ('draft', 'placed', 'accepted', 'declined', 'dispatched', 'received', 'short_received', 'cancelled')),
  amount_paise bigint not null check (amount_paise > 0),
  expected_at timestamptz,
  placed_at timestamptz,
  accepted_at timestamptz,
  dispatched_at timestamptz,
  received_at timestamptz,
  received_by uuid references public.profiles(id),
  receipt_evidence jsonb not null default '[]'::jsonb,
  short_reason text,
  decline_reason text,
  idempotency_key text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),

  constraint order_receipt_is_witnessed
    check (status not in ('received', 'short_received')
           or (received_at is not null and received_by is not null)),
  constraint order_short_says_why
    check (status <> 'short_received' or length(trim(coalesce(short_reason, ''))) > 3),
  constraint order_decline_says_why
    check (status <> 'declined' or length(trim(coalesce(decline_reason, ''))) > 3)
);

-- Scoped to the supplier, not global -- 137:107's reasoning.
create unique index if not exists uq_supplier_order_idempotency
  on public.procurement_supplier_orders (supplier_id, idempotency_key) where idempotency_key is not null;
create index if not exists idx_supplier_orders_queue
  on public.procurement_supplier_orders (status, expected_at);

create table if not exists public.procurement_supplier_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.procurement_supplier_orders(id) on delete cascade,
  material_item_id uuid not null references public.booking_material_items(id) on delete restrict,
  qty_ordered numeric(14,4) not null check (qty_ordered > 0),
  qty_received numeric(14,4) check (qty_received is null or qty_received >= 0),
  unit_cost_paise bigint not null check (unit_cost_paise > 0),
  amount_paise bigint not null check (amount_paise > 0),
  unique (order_id, material_item_id)
);

-- ── Supplier payments ──────────────────────────────────────────────
create table if not exists public.procurement_supplier_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.procurement_supplier_orders(id) on delete restrict,
  amount_paise bigint not null check (amount_paise > 0),
  adapter text not null check (adapter in ('ManualBankTransfer', 'RazorpayRouteSupplier', 'RazorpayPayout')),
  status text not null default 'blocked_no_rail'
    check (status in ('blocked_no_rail', 'pending', 'paid', 'failed', 'reversed')),
  rail_blocked_reason text,
  gateway_ref text,
  utr text,
  paid_at timestamptz,
  paid_by uuid references public.profiles(id),
  failure_code text check (failure_code is null or failure_code in
    ('bad_account', 'bank_rejected', 'name_mismatch', 'upi_invalid',
     'insufficient_balance', 'rail_unavailable', 'other')),
  failure_reason text,
  idempotency_key text,
  created_at timestamptz not null default now(),

  constraint supplier_payment_paid_has_a_reference
    check (status <> 'paid' or (paid_at is not null and (utr is not null or gateway_ref is not null))),
  constraint supplier_payment_failure_has_a_code
    check (status <> 'failed' or failure_code is not null),
  constraint supplier_payment_block_says_why
    check (status <> 'blocked_no_rail' or length(trim(coalesce(rail_blocked_reason, ''))) > 3)
);

create unique index if not exists uq_supplier_payment_idempotency
  on public.procurement_supplier_payments (order_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists uq_supplier_payment_one_paid
  on public.procurement_supplier_payments (order_id) where status = 'paid';

-- An automated rail cannot be used while it is unconfirmed, whatever
-- the caller asks for.
create or replace function public.supplier_payment_respects_the_rail()
returns trigger language plpgsql as $$
declare
  v_on boolean;
  v_rail text;
begin
  select route_supplier_enabled, payout_rail into v_on, v_rail from public.procurement_rails where id;
  if new.adapter <> 'ManualBankTransfer' and not coalesce(v_on, false) then
    new.status := 'blocked_no_rail';
    new.rail_blocked_reason := 'Supplier payment rail not confirmed with Razorpay';
    new.paid_at := null;
    new.utr := null;
    new.gateway_ref := null;
  end if;
  if new.adapter <> 'ManualBankTransfer' and coalesce(v_on, false)
     and v_rail is distinct from new.adapter then
    raise exception 'supplier payment adapter % is not the confirmed rail (%)', new.adapter, v_rail;
  end if;
  return new;
end $$;

drop trigger if exists supplier_payment_rail_gate on public.procurement_supplier_payments;
create trigger supplier_payment_rail_gate
  before insert or update on public.procurement_supplier_payments
  for each row execute function public.supplier_payment_respects_the_rail();

-- ── Promote the FKs deferred by 04 and 05 ──────────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'booking_material_items_supplier_fk') then
    alter table public.booking_material_items
      add constraint booking_material_items_supplier_fk
      foreign key (supplier_id) references public.procurement_suppliers(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'procurement_ledger_supplier_order_fk') then
    alter table public.procurement_ledger
      add constraint procurement_ledger_supplier_order_fk
      foreign key (supplier_order_id) references public.procurement_supplier_orders(id) on delete restrict;
  end if;
end $$;

-- Now that the FK exists, a SPEND must name its order.
alter table public.procurement_ledger drop constraint if exists procurement_ledger_outflow_is_attributed;
alter table public.procurement_ledger add constraint procurement_ledger_outflow_is_attributed
  check ((kind <> 'SPEND_SUPPLIER'    or supplier_order_id is not null)
     and (kind <> 'REIMBURSE_PARTNER' or adjustment_id    is not null)
     and (kind <> 'REFUND_CUSTOMER'   or gateway_refund_id is not null or manual_reference is not null));

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.procurement_rails                 enable row level security;
alter table public.procurement_suppliers             enable row level security;
alter table public.procurement_supplier_orders       enable row level security;
alter table public.procurement_supplier_order_items  enable row level security;
alter table public.procurement_supplier_payments     enable row level security;

-- The UI needs to know WHY a method is unavailable.
drop policy if exists rails_read on public.procurement_rails;
create policy rails_read on public.procurement_rails
  for select to authenticated using (true);
drop policy if exists rails_operator on public.procurement_rails;
create policy rails_operator on public.procurement_rails
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

-- An offline supplier has no auth identity by construction.
drop policy if exists suppliers_read on public.procurement_suppliers;
create policy suppliers_read on public.procurement_suppliers
  for select to authenticated using (
    public.caller_is_operator()
    or (vendor_id is not null
        and vendor_id in (select v.id from public.vendors v where v.profile_id = auth.uid())));
drop policy if exists suppliers_operator on public.procurement_suppliers;
create policy suppliers_operator on public.procurement_suppliers
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

-- A supplier sees orders addressed to them, once they are addressed: a
-- draft is not yet an order. The BOOKING's partner sees none of this --
-- which supplier the platform used is not their business.
drop policy if exists supplier_orders_read on public.procurement_supplier_orders;
create policy supplier_orders_read on public.procurement_supplier_orders
  for select to authenticated using (
    public.caller_is_operator()
    or (status <> 'draft' and exists (
          select 1 from public.procurement_suppliers s
            join public.vendors v on v.id = s.vendor_id
           where s.id = supplier_id and v.profile_id = auth.uid())));
drop policy if exists supplier_orders_operator on public.procurement_supplier_orders;
create policy supplier_orders_operator on public.procurement_supplier_orders
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

drop policy if exists supplier_order_items_read on public.procurement_supplier_order_items;
create policy supplier_order_items_read on public.procurement_supplier_order_items
  for select to authenticated using (
    exists (select 1 from public.procurement_supplier_orders o where o.id = order_id));
drop policy if exists supplier_order_items_operator on public.procurement_supplier_order_items;
create policy supplier_order_items_operator on public.procurement_supplier_order_items
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

-- UTRs and failure codes are operator data. A supplier seeing their own
-- payment is a later, separate decision.
drop policy if exists supplier_payments_operator on public.procurement_supplier_payments;
create policy supplier_payments_operator on public.procurement_supplier_payments
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

commit;
