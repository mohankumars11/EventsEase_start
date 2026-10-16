-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisites: 059 (booking_lines), 20261012_02 (policy), 20261012_03 (BOM).
-- Safe to apply alone: nothing writes these until 20261012_09.
--
-- What ONE confirmed booking needs bought for it.
--
-- ── One requirement per line, and it remembers why ─────────────────
-- The decision is stored with the inputs it was made from, not just its
-- answer. When a customer asks why they were charged for flowers, the
-- row has to be able to say: this policy version, this BOM version,
-- these quantities, this guest count, at this time.
--
-- ── supplier_id is a bare uuid here, on purpose ────────────────────
-- procurement_suppliers does not exist until 20261012_06, and a forward
-- FK would make this file unapplyable on its own. 20261012_06 promotes
-- it to a real foreign key. This is the same ordering problem 059
-- documents for dispatch_offers (059:245-253).
--
-- Rollback:
--   drop table public.booking_material_items,
--              public.booking_material_requirements cascade;

begin;

create table if not exists public.booking_material_requirements (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.booking_lines(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  trade_id text not null references public.sambramo_trade_registry(id) on delete restrict,

  decision text not null check (decision in
    ('NO_MATERIALS', 'MATERIALS_INCLUDED_IN_PRICE', 'MATERIALS_INCREMENTAL', 'MANUAL_REVIEW')),
  reasons text[] not null default '{}',
  engine_version text not null default 'mat-1',

  policy_id uuid references public.sambramo_procurement_policy(id) on delete restrict,
  policy_version integer,

  -- What the engine read. Keeping it means the decision stays
  -- explainable after the catalogue, the listing and the prices move.
  inputs_snapshot jsonb not null default '{}'::jsonb,

  -- Chargeable, and only ever non-zero for MATERIALS_INCREMENTAL.
  estimate_paise bigint not null default 0 check (estimate_paise >= 0),
  -- Visible for margin work, never chargeable: this is the part the
  -- customer has already paid for inside the service price.
  included_estimate_paise bigint not null default 0 check (included_estimate_paise >= 0),

  method text check (method in ('platform_supplier', 'partner_supplier', 'partner_stock')),
  method_blockers text[] not null default '{}',

  status text not null default 'open'
    check (status in ('open', 'partner_review', 'quoted', 'funded', 'ordered', 'received', 'closed', 'void')),

  partner_reviewed_at timestamptz,
  partner_note text,
  closed_at timestamptz,
  void_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Only an incremental decision may carry a chargeable estimate. This
  -- is the constraint that stops an "included" booking being billed.
  constraint materials_only_incremental_is_chargeable
    check (decision = 'MATERIALS_INCREMENTAL' or estimate_paise = 0),
  -- An included or absent requirement can never reach a money state.
  constraint materials_non_chargeable_states
    check (decision = 'MATERIALS_INCREMENTAL'
           or status in ('open', 'partner_review', 'closed', 'void')),
  constraint materials_void_says_why
    check (status <> 'void' or length(trim(coalesce(void_reason, ''))) > 3)
);

-- One live requirement per line. A second resolve returns the first.
create unique index if not exists uq_material_requirement_per_line
  on public.booking_material_requirements (line_id) where status <> 'void';
create index if not exists idx_material_requirements_queue
  on public.booking_material_requirements (status, created_at)
  where status in ('open', 'partner_review', 'quoted');
create index if not exists idx_material_requirements_vendor
  on public.booking_material_requirements (vendor_id, created_at desc);

create table if not exists public.booking_material_items (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.booking_material_requirements(id) on delete cascade,
  material_id text references public.sambramo_material_defs(id) on delete restrict,

  -- Snapshotted, not joined: these are the words and numbers somebody
  -- was shown. A catalogue rename must not rewrite them.
  name text not null,
  unit text not null,
  category text,

  qty_suggested numeric(14,4) not null check (qty_suggested >= 0),
  qty_partner numeric(14,4) check (qty_partner is null or qty_partner >= 0),
  qty_final numeric(14,4) check (qty_final is null or qty_final >= 0),
  qty_change_reason text,

  unit_cost_paise bigint check (unit_cost_paise is null or unit_cost_paise > 0),
  cost_as_of date,
  amount_paise bigint not null default 0 check (amount_paise >= 0),

  source text not null default 'bom' check (source in ('bom', 'partner_added', 'operator_added')),
  bom_version_id uuid references public.sambramo_bom_versions(id) on delete set null,
  bom_line_id uuid references public.sambramo_bom_lines(id) on delete set null,
  reusable boolean not null default false,

  -- Promoted to a real FK in 20261012_06.
  supplier_id uuid,

  sort_order integer not null default 0,

  -- A partner may adjust a suggested quantity, but a silent adjustment
  -- is indistinguishable from a mistake.
  constraint material_qty_change_says_why
    check (qty_partner is null or qty_partner = qty_suggested
           or length(trim(coalesce(qty_change_reason, ''))) > 3)
);

create index if not exists idx_material_items_requirement
  on public.booking_material_items (requirement_id, sort_order);

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.booking_material_requirements enable row level security;
alter table public.booking_material_items        enable row level security;

-- The partner who won the line, the customer who booked it, operators.
-- Both predicates are lifted verbatim from escrow_ledger (062:218-234).
drop policy if exists material_requirements_read on public.booking_material_requirements;
create policy material_requirements_read on public.booking_material_requirements
  for select to authenticated using (
    public.caller_is_operator()
    or exists (select 1 from public.booking_lines l
                 join public.booking_requests r on r.id = l.request_id
                where l.id = line_id and r.customer_id = auth.uid())
    or exists (select 1 from public.booking_lines l
                 join public.dispatch_offers o on o.id = l.accepted_offer_id
                 join public.vendors v on v.id = o.vendor_id
                where l.id = line_id and v.profile_id = auth.uid()));

drop policy if exists material_requirements_operator on public.booking_material_requirements;
create policy material_requirements_operator on public.booking_material_requirements
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

-- Items inherit the parent's visibility. unit_cost_paise is the
-- platform's buy price, so the partner- and customer-facing surfaces use
-- the view below rather than this table.
drop policy if exists material_items_read on public.booking_material_items;
create policy material_items_read on public.booking_material_items
  for select to authenticated using (
    public.caller_is_operator()
    or exists (select 1 from public.booking_material_requirements q where q.id = requirement_id));

drop policy if exists material_items_operator on public.booking_material_items;
create policy material_items_operator on public.booking_material_items
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

-- The materials list without the platform's buy price.
create or replace view public.booking_material_items_public as
  select i.id, i.requirement_id, i.name, i.unit, i.category,
         i.qty_suggested, i.qty_partner, i.qty_final, i.reusable, i.source, i.sort_order
    from public.booking_material_items i;

grant select on public.booking_material_items_public to authenticated;

commit;
