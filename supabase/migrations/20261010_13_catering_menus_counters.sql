-- Catering & Food, part 2: menus built from the partner's own dishes, and
-- live counters as services of their own.
--
--   sambramo_catering_menus          a named, priced selection of dishes
--   sambramo_catering_menu_items     menu → dish (by the dish's stable item_key in
--                                    sambramo_catalogue_items of the SAME version;
--                                    never a copy of the dish's text)
--   sambramo_live_counters           a bookable counter: dishes, capacity, duration,
--                                    staff, equipment, its own price model
--   sambramo_live_counter_items      counter → dish
--
-- All version-scoped like every engine row: a published version is immutable,
-- a new submission writes a new version, and a confirmed booking keeps pointing
-- at the version it was priced from.
--
-- Catering packages stay in sambramo_trade_packages (so review / publish /
-- 15-day lock work unchanged); their trade_inputs reference menu_keys and
-- counter_keys of the same version.
--
-- Additive and re-runnable.

begin;

create table if not exists public.sambramo_catering_menus (
  id uuid primary key default gen_random_uuid(),
  listing_version_id uuid not null references public.sambramo_listing_versions(id) on delete cascade,
  menu_key text not null,
  sort_order integer not null default 0,
  name text not null check (length(trim(name)) > 0),
  description text,
  cuisine_ids text[] not null default '{}',
  diet text not null default 'veg' check (diet in ('veg','non_veg','mixed','vegan','jain','egg')),
  service_style text,
  event_types text[] not null default '{}',
  min_guests integer check (min_guests is null or min_guests > 0),
  max_guests integer check (max_guests is null or max_guests > 0),
  season jsonb,                                         -- {from, to} or null
  lead_days integer not null default 0 check (lead_days between 0 and 365),
  price_model text not null check (price_model in ('per_person','fixed','quote')),
  price_mode text not null default 'target_net' check (price_mode in ('customer','target_net')),
  take_home_paise bigint check (take_home_paise is null or take_home_paise > 0),
  customer_paise bigint,
  child_take_home_paise bigint check (child_take_home_paise is null or child_take_home_paise >= 0),
  child_customer_paise bigint,
  child_max_age integer,
  extra_guest_take_home_paise bigint check (extra_guest_take_home_paise is null or extra_guest_take_home_paise > 0),
  extra_guest_customer_paise bigint,
  fixed_scope jsonb not null default '{}'::jsonb,       -- {guests, hours, notes}
  included_services text[] not null default '{}',       -- serving_staff, crockery, setup, …
  status text not null default 'active' check (status in ('active','archived')),
  unique (listing_version_id, menu_key),
  check (min_guests is null or max_guests is null or max_guests >= min_guests),
  check (price_model = 'quote' or take_home_paise is not null)
);

create table if not exists public.sambramo_catering_menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.sambramo_catering_menus(id) on delete cascade,
  listing_version_id uuid not null references public.sambramo_listing_versions(id) on delete cascade,
  dish_key text not null,                               -- sambramo_catalogue_items.item_key, same version
  course_group text not null,
  sort_order integer not null default 0,
  included boolean not null default true,              -- in the menu price
  extra_take_home_paise bigint check (extra_take_home_paise is null or extra_take_home_paise > 0),
  extra_customer_paise bigint,
  portion text,
  required boolean not null default true,
  choice_group text,                                    -- "Choose one rice"
  choice_pick integer check (choice_pick is null or choice_pick > 0),
  notes text,
  unique (menu_id, dish_key),
  check (included or extra_take_home_paise is not null)
);
create index if not exists sambramo_catering_menu_items_menu on public.sambramo_catering_menu_items (menu_id, course_group, sort_order);

create table if not exists public.sambramo_live_counters (
  id uuid primary key default gen_random_uuid(),
  listing_version_id uuid not null references public.sambramo_listing_versions(id) on delete cascade,
  counter_key text not null,
  sort_order integer not null default 0,
  counter_type text not null,
  name text not null check (length(trim(name)) > 0),
  description text,
  cuisine_ids text[] not null default '{}',
  included_servings integer check (included_servings is null or included_servings > 0),
  serving_capacity integer check (serving_capacity is null or serving_capacity > 0),   -- per hour
  duration_hours numeric(5,2) check (duration_hours is null or duration_hours > 0),
  chefs integer not null default 1 check (chefs >= 0),
  equipment text,
  power_water text,
  space_required text,
  setup_minutes integer not null default 0,
  dismantle_minutes integer not null default 0,
  indoor_outdoor text not null default 'both' check (indoor_outdoor in ('indoor','outdoor','both')),
  lead_days integer not null default 0,
  available_qty integer not null default 1 check (available_qty > 0),
  price_model text not null check (price_model in ('per_event','per_hour','per_guest','per_serving','fixed','quote')),
  price_mode text not null default 'target_net' check (price_mode in ('customer','target_net')),
  take_home_paise bigint check (take_home_paise is null or take_home_paise > 0),
  customer_paise bigint,
  extra_serving_take_home_paise bigint,
  extra_hour_take_home_paise bigint,
  status text not null default 'active' check (status in ('active','archived')),
  unique (listing_version_id, counter_key),
  check (price_model = 'quote' or take_home_paise is not null),
  -- A flat counter fee always says what it covers: no unlimited servings.
  check (price_model not in ('per_event','fixed') or (duration_hours is not null and included_servings is not null))
);

create table if not exists public.sambramo_live_counter_items (
  counter_id uuid not null references public.sambramo_live_counters(id) on delete cascade,
  dish_key text not null,
  sort_order integer not null default 0,
  primary key (counter_id, dish_key)
);

-- Read like the rest of a version: whoever can read the version reads these.
alter table public.sambramo_catering_menus enable row level security;
alter table public.sambramo_catering_menu_items enable row level security;
alter table public.sambramo_live_counters enable row level security;
alter table public.sambramo_live_counter_items enable row level security;
drop policy if exists catering_menus_read on public.sambramo_catering_menus;
create policy catering_menus_read on public.sambramo_catering_menus for select to anon, authenticated
  using (listing_version_id in (select id from public.sambramo_listing_versions));
drop policy if exists catering_menu_items_read on public.sambramo_catering_menu_items;
create policy catering_menu_items_read on public.sambramo_catering_menu_items for select to anon, authenticated
  using (listing_version_id in (select id from public.sambramo_listing_versions));
drop policy if exists live_counters_read on public.sambramo_live_counters;
create policy live_counters_read on public.sambramo_live_counters for select to anon, authenticated
  using (listing_version_id in (select id from public.sambramo_listing_versions));
drop policy if exists live_counter_items_read on public.sambramo_live_counter_items;
create policy live_counter_items_read on public.sambramo_live_counter_items for select to anon, authenticated
  using (counter_id in (select id from public.sambramo_live_counters));
-- Writes happen only through submit_listing_version (security definer).

-- ═══ Add-ons carry what a caterer needs to say about them ══════════════
alter table public.sambramo_addon_rules
  add column if not exists description text,
  add column if not exists min_qty numeric(10,2),
  add column if not exists lead_days integer,
  add column if not exists requires jsonb not null default '{}'::jsonb;
alter table public.sambramo_addon_rules drop constraint if exists sambramo_addon_rules_unit_check;
alter table public.sambramo_addon_rules add constraint sambramo_addon_rules_unit_check check (unit in (
  'per_event','per_session','per_hour','per_day','per_person','per_guest','per_item','per_piece','per_set',
  'per_box','per_kg','per_km','per_trip','per_staff','per_counter','per_vehicle','per_staff_hour','per_counter_hour'));

commit;
