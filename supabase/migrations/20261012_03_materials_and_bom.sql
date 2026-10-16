-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisites: 20261010_07 (trade registry), 20261010_12 (master dishes),
--                20261010_13 (catering menus), 20261012_02 (policy).
-- Safe to apply alone. Pure addition; the two new columns default null
-- and no existing code selects them.
--
-- What a catalogue item is MADE of.
--
-- ── Why a BOM and not a text field ─────────────────────────────────
-- Catalogue items already carry an `includes` description written for a
-- customer to read. Deriving "buy 42 kg of marigold" from a human
-- sentence is guesswork dressed as arithmetic. A BOM states the driver
-- -- per guest, per plate, per item -- so a quantity can be computed and
-- then explained.
--
-- ── Why prices are frozen into the version ─────────────────────────
-- sambramo_bom_versions.rolled_cost_paise is stored, not computed on
-- read. A decision that re-derives its basis from today's catalogue
-- tells somebody their February booking was priced against August
-- rates. Same reasoning as booking_lines.price_basis (059:110-122).
--
-- ── Why an unpriced material is not free ───────────────────────────
-- sambramo_material_defs.cost_as_of is nullable and the engine refuses
-- to quote on a null. A material nobody has priced produces
-- `material_cost_unknown` and manual review -- never an invented number.
--
-- Rollback:
--   drop table public.sambramo_bom_lines, public.sambramo_bom_versions,
--              public.sambramo_material_defs cascade;
--   (the two added columns are harmless and can stay)

begin;

-- ── Materials ──────────────────────────────────────────────────────
create table if not exists public.sambramo_material_defs (
  id text primary key,                       -- 'MAT-MARIGOLD-KG'
  name text not null check (length(trim(name)) > 0),
  aliases text[] not null default '{}',
  category text not null,                    -- flowers | provisions | puja | packaging | disposables | fuel
  unit text not null,                        -- kg | piece | pack | metre | litre | set
  default_unit_cost_paise bigint check (default_unit_cost_paise is null or default_unit_cost_paise > 0),
  cost_as_of date,                           -- null = never priced; the engine will not quote on it
  hsn_code text,
  perishable boolean not null default false,
  lead_hours integer not null default 0 check (lead_hours between 0 and 8760),
  trade_ids text[] not null default '{}',    -- which trades legitimately consume it
  review_status text not null default 'needs_review'
    check (review_status in ('reviewed', 'needs_review', 'rejected')),
  version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_priced_rows_carry_a_date
    check (default_unit_cost_paise is null or cost_as_of is not null)
);

create index if not exists idx_material_defs_category
  on public.sambramo_material_defs (category) where active;
create index if not exists idx_material_defs_trades
  on public.sambramo_material_defs using gin (trade_ids);

-- ── BOM versions ───────────────────────────────────────────────────
-- A BOM hangs off a dish, a catalogue item, a catering menu, or the
-- trade as a fallback. Four nullable refs plus a CHECK rather than one
-- polymorphic text column, so each keeps a real foreign key.
create table if not exists public.sambramo_bom_versions (
  id uuid primary key default gen_random_uuid(),
  subject_kind text not null
    check (subject_kind in ('master_dish', 'catalogue_item', 'catering_menu', 'trade_default')),
  dish_id  text references public.sambramo_master_dishes(id)   on delete cascade,
  item_id  uuid references public.sambramo_catalogue_items(id) on delete cascade,
  menu_id  uuid references public.sambramo_catering_menus(id)  on delete cascade,
  trade_id text references public.sambramo_trade_registry(id)  on delete cascade,

  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  basis_unit text not null
    check (basis_unit in ('per_guest', 'per_item', 'per_event', 'per_sqft', 'per_hour')),

  rolled_cost_paise bigint not null default 0 check (rolled_cost_paise >= 0),
  costed_as_of date,

  note text,
  published_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),

  constraint bom_names_exactly_one_subject check (
       (subject_kind = 'master_dish'    and dish_id  is not null and item_id is null and menu_id is null and trade_id is null)
    or (subject_kind = 'catalogue_item' and item_id  is not null and dish_id is null and menu_id is null and trade_id is null)
    or (subject_kind = 'catering_menu'  and menu_id  is not null and dish_id is null and item_id is null and trade_id is null)
    or (subject_kind = 'trade_default'  and trade_id is not null and dish_id is null and item_id is null and menu_id is null)),
  constraint bom_active_rows_are_costed
    check (status <> 'active' or (published_at is not null and costed_as_of is not null))
);

create unique index if not exists uq_bom_one_active_dish
  on public.sambramo_bom_versions (dish_id)  where status = 'active' and dish_id  is not null;
create unique index if not exists uq_bom_one_active_item
  on public.sambramo_bom_versions (item_id)  where status = 'active' and item_id  is not null;
create unique index if not exists uq_bom_one_active_menu
  on public.sambramo_bom_versions (menu_id)  where status = 'active' and menu_id  is not null;
create unique index if not exists uq_bom_one_active_trade
  on public.sambramo_bom_versions (trade_id) where status = 'active' and trade_id is not null;

create table if not exists public.sambramo_bom_lines (
  id uuid primary key default gen_random_uuid(),
  bom_version_id uuid not null references public.sambramo_bom_versions(id) on delete cascade,
  material_id text not null references public.sambramo_material_defs(id) on delete restrict,

  -- Quantity of this material per ONE of the version's basis_unit.
  qty_per_basis numeric(14,4) not null check (qty_per_basis > 0),
  -- Wastage/yield allowance, e.g. 0.10 for 10% over.
  wastage_rate numeric(5,4) not null default 0 check (wastage_rate >= 0 and wastage_rate < 1),
  round_to numeric(10,4) not null default 0.0001 check (round_to > 0),
  min_order_qty numeric(14,4) check (min_order_qty is null or min_order_qty > 0),
  reusable boolean not null default false,

  -- Frozen at publish from sambramo_material_defs, so the version keeps
  -- explaining itself after the master list moves on.
  snapshot_unit_cost_paise bigint check (snapshot_unit_cost_paise is null or snapshot_unit_cost_paise > 0),
  snapshot_cost_as_of date,

  substitutes text[] not null default '{}',
  note text,
  sort_order integer not null default 0,
  unique (bom_version_id, material_id)
);

create index if not exists idx_bom_lines_version
  on public.sambramo_bom_lines (bom_version_id, sort_order);

-- An active BOM is evidence, like an active policy.
create or replace function public.bom_version_is_frozen_once_active()
returns trigger language plpgsql as $$
begin
  if old.status = 'draft' then return new; end if;
  if old.status = 'active' and new.status = 'retired'
     and new.rolled_cost_paise = old.rolled_cost_paise then
    return new;
  end if;
  raise exception 'BOM version % is % and cannot be edited in place; publish a new version instead',
    old.id, old.status;
end $$;

drop trigger if exists bom_version_frozen on public.sambramo_bom_versions;
create trigger bom_version_frozen
  before update on public.sambramo_bom_versions
  for each row execute function public.bom_version_is_frozen_once_active();

-- ── Does the agreed price already include the materials? ───────────
-- null means UNDECLARED, and the engine routes that to manual review
-- rather than assuming either way. That is the whole point of the
-- column: today nothing records the answer for 28 of the 34 trades.
alter table public.sambramo_catalogue_items
  add column if not exists materials_included boolean;
alter table public.sambramo_catering_menus
  add column if not exists materials_included boolean;

comment on column public.sambramo_catalogue_items.materials_included is
  'true = the agreed price already covers materials; false = it does not; null = undeclared, decide by review.';
comment on column public.sambramo_catering_menus.materials_included is
  'true = the agreed price already covers materials; false = it does not; null = undeclared, decide by review.';

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.sambramo_material_defs  enable row level security;
alter table public.sambramo_bom_versions   enable row level security;
alter table public.sambramo_bom_lines      enable row level security;

-- Materials are a shared vocabulary; a signed-in partner may read the
-- reviewed ones so their materials list has names in it.
drop policy if exists material_defs_read on public.sambramo_material_defs;
create policy material_defs_read on public.sambramo_material_defs
  for select to authenticated using (active and review_status <> 'rejected');

drop policy if exists material_defs_operator on public.sambramo_material_defs;
create policy material_defs_operator on public.sambramo_material_defs
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

-- A BOM is the platform's cost model. Exposing it tells every partner
-- what the platform thinks their materials cost, which is margin
-- information. Partners see materials only as their own booking's list.
drop policy if exists bom_versions_operator on public.sambramo_bom_versions;
create policy bom_versions_operator on public.sambramo_bom_versions
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

drop policy if exists bom_lines_operator on public.sambramo_bom_lines;
create policy bom_lines_operator on public.sambramo_bom_lines
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

commit;
