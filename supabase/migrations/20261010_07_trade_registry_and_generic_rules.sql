-- 34 trades on one engine: the tables every trade's listing writes to.
--
-- Anchor & MC (20261010_02..06) priced only time. This migration widens the
-- same versioned tables so any trade can be priced, without changing a single
-- Anchor row or behaviour:
--
--   sambramo_trade_registry         the 34 trades (mirrors src/data/trades/registry.js)
--   sambramo_trade_pricing_policy   per-trade fee / uplift / VIP factor (default 8%)
--   sambramo_rate_rules             + rule_kind, unit, quantities, bands, price mode
--   sambramo_addon_rules            + every unit the trade files use; free package keys
--   sambramo_listing_versions       + trade_id, schema_version, answers (trade questionnaire)
--   sambramo_catalogue_items        menus, products, rental items, vehicles, spaces…
--   sambramo_resources              staff, vehicles, equipment, spaces, capacity a listing owns
--   sambramo_resource_reservations  what a booking holds, checked atomically at booking
--   verification_policy             the statutory rows that were missing (if 146 is applied)
--
-- Money is integer paise. take_home_* is what the partner keeps; customer_*
-- is computed by the server from the TRADE's fee. Re-runnable.

begin;

-- ═══ Registry ═════════════════════════════════════════════════════════
create table if not exists public.sambramo_trade_registry (
  id text primary key,
  code text not null unique,
  name text not null unique,                 -- = vendor_services.category
  sort_order integer not null unique,
  archetype text not null check (archetype in ('TIME_PERFORMER','PERSONAL_SERVICE','STAFFING','PER_GUEST_FOOD',
    'CATALOGUE_PRODUCT','RENTAL_INVENTORY','TRIP_VEHICLE','VENUE_SPACE','STORAGE_CAPACITY','PROJECT_QUOTE')),
  tiers boolean not null default false,
  regulated boolean not null default false,
  schema_version integer not null default 1,
  active boolean not null default true
);

insert into public.sambramo_trade_registry (id, code, name, sort_order, archetype, tiers, regulated) values
  ('anchor_mc', 'E16', 'Anchor & MC', 1, 'TIME_PERFORMER', true, false),
  ('bar_beverages', 'E20', 'Bar & Beverages', 2, 'PER_GUEST_FOOD', false, true),
  ('bridal_makeup_hair', 'E08', 'Bridal Makeup & Hair', 3, 'PERSONAL_SERVICE', true, false),
  ('cake_desserts', 'E14', 'Cake & Desserts', 4, 'CATALOGUE_PRODUCT', false, false),
  ('catering_food', 'E01', 'Catering & Food', 5, 'PER_GUEST_FOOD', true, false),
  ('dj_music', 'E06', 'DJ & Music', 6, 'TIME_PERFORMER', true, false),
  ('decoration_floral', 'E04', 'Decoration & Floral', 7, 'PROJECT_QUOTE', true, false),
  ('end_to_end_event_logistics', 'L08', 'End-to-End Event Logistics', 8, 'PROJECT_QUOTE', false, false),
  ('event_equipment_rental', 'L04', 'Event Equipment Rental', 9, 'RENTAL_INVENTORY', false, false),
  ('event_lighting', 'E13', 'Event Lighting', 10, 'RENTAL_INVENTORY', false, false),
  ('event_materials_supplier', 'L07', 'Event Materials Supplier', 11, 'CATALOGUE_PRODUCT', false, false),
  ('gifts_favours', 'E25', 'Gifts & Favours', 12, 'CATALOGUE_PRODUCT', false, false),
  ('guest_services', 'E21', 'Guest Services', 13, 'STAFFING', false, false),
  ('invitation_printing', 'E11', 'Invitation & Printing', 14, 'CATALOGUE_PRODUCT', false, false),
  ('live_entertainment', 'E07', 'Live Entertainment', 15, 'TIME_PERFORMER', true, false),
  ('loading_unloading_crew', 'L05', 'Loading & Unloading Crew', 16, 'STAFFING', false, false),
  ('medium_large_goods_vehicle', 'L02', 'Medium / Large Goods Vehicle', 17, 'TRIP_VEHICLE', false, true),
  ('mehendi_artist', 'E15', 'Mehendi Artist', 18, 'PERSONAL_SERVICE', true, false),
  ('mini_truck_pickup', 'L01', 'Mini Truck / Pickup', 19, 'TRIP_VEHICLE', false, true),
  ('passenger_transport', 'L03', 'Passenger Transport', 20, 'TRIP_VEHICLE', false, true),
  ('photography', 'E02', 'Photography', 21, 'TIME_PERFORMER', true, false),
  ('power_cooling', 'E22', 'Power & Cooling', 22, 'RENTAL_INVENTORY', false, true),
  ('priest_rituals', 'E24', 'Priest & Rituals', 23, 'TIME_PERFORMER', false, false),
  ('safety_facilities', 'E23', 'Safety & Facilities', 24, 'STAFFING', false, true),
  ('security_services', 'E19', 'Security Services', 25, 'STAFFING', false, true),
  ('sound_av', 'E17', 'Sound & AV', 26, 'RENTAL_INVENTORY', false, false),
  ('tent_furniture', 'E10', 'Tent & Furniture', 27, 'RENTAL_INVENTORY', false, false),
  ('transportation', 'E12', 'Transportation', 28, 'TRIP_VEHICLE', false, true),
  ('trousseau_gift_packing', 'E26', 'Trousseau & Gift Packing', 29, 'CATALOGUE_PRODUCT', false, false),
  ('valet_parking', 'E18', 'Valet Parking', 30, 'STAFFING', false, true),
  ('venue', 'E05', 'Venue', 31, 'VENUE_SPACE', false, true),
  ('videography', 'E03', 'Videography', 32, 'TIME_PERFORMER', true, false),
  ('warehouse_storage', 'L06', 'Warehouse / Storage', 33, 'STORAGE_CAPACITY', false, false),
  ('wedding_planning', 'E09', 'Wedding Planning', 34, 'PROJECT_QUOTE', true, false)
on conflict (id) do update set code = excluded.code, name = excluded.name, sort_order = excluded.sort_order,
  archetype = excluded.archetype, tiers = excluded.tiers, regulated = excluded.regulated;

alter table public.sambramo_trade_registry enable row level security;
drop policy if exists trade_registry_read on public.sambramo_trade_registry;
create policy trade_registry_read on public.sambramo_trade_registry for select to anon, authenticated using (true);

-- What the server validates a submission against. Generated from
-- src/data/trades/*.js (scripts/check-trade-configs.mjs keeps them honest);
-- re-run this block when a trade file's kinds, required answers or
-- compliance change.
alter table public.sambramo_trade_registry
  add column if not exists allowed_kinds text[] not null default '{}',
  add column if not exists required_answers text[] not null default '{}',
  add column if not exists resource_model text,
  add column if not exists catalogue_key text,
  add column if not exists compliance jsonb not null default '[]'::jsonb;

update public.sambramo_trade_registry r
   set allowed_kinds = v.kinds, required_answers = v.req, resource_model = v.res,
       catalogue_key = v.cat, compliance = v.comp
  from (values
  ('anchor_mc', array['hour','session','event','half_day','full_day','multi_day']::text[], '{}'::text[], 'staff', null, '[]'::jsonb),
  ('bar_beverages', array['per_guest','per_unit','per_staff_hour','event','fixed','quote']::text[], array['display_name','beverage_types','supply_scope','events','guests_per_hour','bar_stations','bartenders']::text[], 'capacity', 'beverages', '[{"doc":"VER-TRADE-FSSAI","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-LIQUOR","always":false,"when":{"q":"beverage_types","includes":"alcoholic_beverage_service_if_legally_permitted"},"blocks_instant":true}]'::jsonb),
  ('bridal_makeup_hair', array['per_person','per_unit','session','fixed','full_day']::text[], array['services_offered','styles','who','people_per_day']::text[], 'staff', 'services', '[]'::jsonb),
  ('cake_desserts', array['catalogue','per_unit','fixed','quote']::text[], array['product_types','flavours','sizes','lead_days']::text[], 'production', 'products', '[]'::jsonb),
  ('catering_food', array['per_guest','per_unit','fixed','per_staff_hour','quote']::text[], array['food_service','max_guests','min_guests','prep_location','meal_types','service_hours','cleanup']::text[], 'capacity', 'menu', '[{"doc":"VER-TRADE-FSSAI","always":true,"when":null,"blocks_instant":true}]'::jsonb),
  ('dj_music', array['hour','session','event','half_day','full_day','fixed']::text[], array['performance_kinds','event_types','styles','performers','own_equipment','formats','duration_options','setup_minutes']::text[], 'staff', null, '[]'::jsonb),
  ('decoration_floral', array['fixed','per_unit','quote']::text[], array['services','themes','flowers']::text[], 'staff', 'packages', '[]'::jsonb),
  ('end_to_end_event_logistics', array['fixed','full_day','per_trip','per_staff_shift','capacity_period','quote']::text[], array['scope','delivered_by','max_concurrent_projects']::text[], 'staff', null, '[]'::jsonb),
  ('event_equipment_rental', array['rental','fixed']::text[], array['equipment_types','min_period','handover','damage_policy']::text[], 'items', 'items', '[]'::jsonb),
  ('event_lighting', array['rental','fixed','per_staff_hour','event','full_day','quote']::text[], array['service_types','suitability','power_needs']::text[], 'items', 'fixtures', '[{"doc":"VER-TRADE-ELECTRICAL","always":true,"when":null,"blocks_instant":false}]'::jsonb),
  ('event_materials_supplier', array['catalogue']::text[], array['supplies','fulfilment','prep_hours']::text[], 'items', 'products', '[]'::jsonb),
  ('gifts_favours', array['catalogue','quote']::text[], array['gift_types','min_order','prep_days']::text[], 'production', 'products', '[]'::jsonb),
  ('guest_services', array['per_staff_hour','per_staff_shift','per_staff_day','event','fixed']::text[], array['roles']::text[], 'staff', 'role_specs', '[]'::jsonb),
  ('invitation_printing', array['catalogue','fixed']::text[], array['products','languages','revisions']::text[], 'production', 'products', '[]'::jsonb),
  ('live_entertainment', array['per_unit','session','hour','event','full_day','fixed']::text[], array['act_types']::text[], 'staff', 'acts', '[]'::jsonb),
  ('loading_unloading_crew', array['per_staff_hour','per_staff_shift','fixed','per_unit','quote']::text[], array['work','materials','access','max_item_kg','workers','min_crew','min_paid_hours','shifts','travel']::text[], 'staff', null, '[]'::jsonb),
  ('medium_large_goods_vehicle', array['per_trip','per_km','vehicle_hour','vehicle_day','fixed','quote']::text[], array['loads','routes','permit_scope','service_radius_km']::text[], 'vehicles', 'vehicles', '[{"doc":"VER-TRADE-RC","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-INSURANCE","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-DL","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-PERMIT","always":true,"when":null,"blocks_instant":false}]'::jsonb),
  ('mehendi_artist', array['per_unit','per_person','session','event','fixed']::text[], array['who','styles','coverage','cone']::text[], 'staff', 'services', '[]'::jsonb),
  ('mini_truck_pickup', array['per_trip','per_km','vehicle_hour','vehicle_day','fixed','quote']::text[], array['service_radius_km','loads','notice']::text[], 'vehicles', 'vehicles', '[{"doc":"VER-TRADE-RC","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-INSURANCE","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-DL","always":true,"when":null,"blocks_instant":true}]'::jsonb),
  ('passenger_transport', array['per_trip','per_km','vehicle_hour','vehicle_day','fixed','quote','per_unit']::text[], array['vehicle_services','service_radius_km','driver_type']::text[], 'vehicles', 'vehicles', '[{"doc":"VER-TRADE-RC","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-INSURANCE","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-DL","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-PERMIT","always":true,"when":null,"blocks_instant":false}]'::jsonb),
  ('photography', array['hour','session','half_day','full_day','multi_day','fixed']::text[], array['specialties','events','years','portfolio','formats','service_radius_km']::text[], 'staff', 'packages', '[{"doc":"VER-TRADE-DRONE","always":false,"when":{"q":"equipment","includes":"drone_licensed"},"blocks_instant":false}]'::jsonb),
  ('power_cooling', array['rental','hour','full_day','capacity_period','fixed','quote']::text[], array['services','fuel_policy','service_radius_km']::text[], 'items', 'items', '[{"doc":"VER-TRADE-ELECTRICAL","always":true,"when":null,"blocks_instant":true}]'::jsonb),
  ('priest_rituals', array['catalogue','session','full_day','fixed','quote']::text[], array['ceremonies','traditions','languages','materials']::text[], 'staff', 'ceremonies', '[]'::jsonb),
  ('safety_facilities', array['per_staff_hour','per_staff_shift','per_staff_day','per_unit','fixed','quote']::text[], array['subtype','description','sites','max_attendees','staff','shift_hours']::text[], 'staff', null, '[{"doc":"VER-TRADE-SAFETY","always":false,"when":{"q":"subtype","in":["crowd_safety_authorized","site_inspection","emergency_preparedness"]},"blocks_instant":true},{"doc":"VER-TRADE-LIABILITY","always":false,"when":{"q":"subtype","in":["crowd_safety_authorized","site_inspection","emergency_preparedness"]},"blocks_instant":false}]'::jsonb),
  ('security_services', array['per_staff_hour','per_staff_shift','event','per_staff_day','quote']::text[], array['services','venues','max_visitors','guards','supervisors','shifts','uniform']::text[], 'staff', null, '[{"doc":"VER-TRADE-PSARA","always":true,"when":null,"blocks_instant":true}]'::jsonb),
  ('sound_av', array['rental','fixed','event','full_day','quote']::text[], array['groups','max_audience']::text[], 'items', 'items', '[]'::jsonb),
  ('tent_furniture', array['rental','fixed','quote']::text[], array['groups','surfaces','damage_policy']::text[], 'items', 'items', '[]'::jsonb),
  ('transportation', array['per_trip','per_km','vehicle_hour','vehicle_day','fixed','percentage','quote']::text[], array['service_type','operation','routes','vehicles']::text[], 'vehicles', null, '[{"doc":"VER-TRADE-RC","always":false,"when":{"q":"operation","in":["our_own_vehicles","both"]},"blocks_instant":true},{"doc":"VER-TRADE-INSURANCE","always":false,"when":{"q":"operation","in":["our_own_vehicles","both"]},"blocks_instant":true}]'::jsonb),
  ('trousseau_gift_packing', array['catalogue','per_unit','fixed','quote']::text[], array['types','materials','handover']::text[], 'production', 'products', '[]'::jsonb),
  ('valet_parking', array['per_staff_hour','per_staff_shift','event','quote']::text[], array['services','valets','supervisors','cars_per_hour']::text[], 'staff', null, '[{"doc":"VER-TRADE-DL","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-INSURANCE","always":false,"when":{"q":"insurance","truthy":true},"blocks_instant":false}]'::jsonb),
  ('venue', array['space','hour','half_day','full_day','event','quote']::text[], array['venue_name','venue_type','photos','max_capacity','recommended_capacity','parking','catering_rule','decor_rule','sound_cutoff','setup_hours','cleanup_hours','setup_charging']::text[], 'spaces', 'spaces', '[{"doc":"VER-TRADE-PROPERTY","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-FIRE","always":true,"when":null,"blocks_instant":false}]'::jsonb),
  ('videography', array['hour','session','event','half_day','full_day','multi_day','fixed']::text[], array['specialties','events','years','showreel','service_radius_km']::text[], 'staff', 'offerings', '[{"doc":"VER-TRADE-DRONE","always":false,"when":{"q":"equipment","includes":"drone_licensed"},"blocks_instant":false}]'::jsonb),
  ('warehouse_storage', array['capacity_period','per_unit','fixed','quote']::text[], array['item_types','storage_kind','hazardous_excluded','area_sqft','available_sqft','access_hours','security','min_period']::text[], 'capacity', null, '[]'::jsonb),
  ('wedding_planning', array['fixed','event','full_day','percentage','quote']::text[], array['services','cities','years','portfolio','budget_band']::text[], 'projects', 'packages', '[]'::jsonb)
  ) as v(id, kinds, req, res, cat, comp)
 where r.id = v.id;

-- ═══ Per-trade pricing policy ═════════════════════════════════════════
-- NULL columns fall back to sambramo_pricing_config, so the global numbers
-- stay the default and a trade only overrides what it must.
create table if not exists public.sambramo_trade_pricing_policy (
  trade_id text primary key references public.sambramo_trade_registry(id) on delete cascade,
  platform_fee_rate numeric(5,4) check (platform_fee_rate is null or (platform_fee_rate >= 0 and platform_fee_rate < 0.5)),
  signature_uplift numeric(5,2) check (signature_uplift is null or signature_uplift >= 1),
  vip_factor numeric(5,2) check (vip_factor is null or vip_factor >= 1),
  require_payout_for_instant boolean,
  note text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.sambramo_trade_pricing_policy (trade_id, platform_fee_rate)
select id, 0.08 from public.sambramo_trade_registry
on conflict (trade_id) do nothing;

alter table public.sambramo_trade_pricing_policy enable row level security;
drop policy if exists trade_policy_read on public.sambramo_trade_pricing_policy;
create policy trade_policy_read on public.sambramo_trade_pricing_policy for select to anon, authenticated using (true);
drop policy if exists trade_policy_admin on public.sambramo_trade_pricing_policy;
create policy trade_policy_admin on public.sambramo_trade_pricing_policy for update to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- The trade a key names: id, display name or code.
create or replace function public.sambramo_trade_id(p_key text)
returns text language sql stable set search_path = public
as $$
  select id from public.sambramo_trade_registry where id = p_key or name = p_key or code = p_key limit 1
$$;

create or replace function public.sambramo_trade_fee(p_trade text)
returns numeric language sql stable set search_path = public
as $$
  select coalesce(
    (select p.platform_fee_rate from public.sambramo_trade_pricing_policy p where p.trade_id = public.sambramo_trade_id(p_trade)),
    (select c.platform_fee_rate from public.sambramo_pricing_config c limit 1),
    0.08)
$$;

-- customer = round10(take_home / (1 - fee)) with the TRADE's fee.
create or replace function public.sambramo_customer_paise_for(p_take_home bigint, p_trade text)
returns bigint language sql stable set search_path = public
as $$
  select (round(p_take_home / (1 - public.sambramo_trade_fee(p_trade)) / 10) * 10)::bigint
$$;

-- take_home = floor10(customer × (1 - fee)) — for partners who enter the customer price.
create or replace function public.sambramo_take_home_from_customer(p_customer bigint, p_trade text)
returns bigint language sql stable set search_path = public
as $$
  select (floor(p_customer * (1 - public.sambramo_trade_fee(p_trade)) / 10) * 10)::bigint
$$;

revoke all on function public.sambramo_trade_id(text) from public;
revoke all on function public.sambramo_trade_fee(text) from public;
revoke all on function public.sambramo_customer_paise_for(bigint, text) from public;
revoke all on function public.sambramo_take_home_from_customer(bigint, text) from public;
grant execute on function public.sambramo_trade_id(text) to anon, authenticated;
grant execute on function public.sambramo_trade_fee(text) to anon, authenticated;
grant execute on function public.sambramo_customer_paise_for(bigint, text) to anon, authenticated;
grant execute on function public.sambramo_take_home_from_customer(bigint, text) to anon, authenticated;

-- ═══ Listing versions carry the trade questionnaire ═══════════════════
alter table public.sambramo_listing_versions
  add column if not exists trade_id text references public.sambramo_trade_registry(id),
  add column if not exists schema_version integer not null default 1,
  add column if not exists answers jsonb not null default '{}'::jsonb;
update public.sambramo_listing_versions set trade_id = public.sambramo_trade_id(trade) where trade_id is null;
create index if not exists sambramo_listing_versions_trade_idx on public.sambramo_listing_versions (trade_id, status);

-- ═══ Rate rules: any rule kind, not six time models ═══════════════════
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.sambramo_rate_rules'::regclass and contype in ('c','u')
              and pg_get_constraintdef(oid) ~ '\mmodel\M' loop
    execute format('alter table public.sambramo_rate_rules drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.sambramo_rate_rules
  alter column model drop not null,
  add column if not exists rule_kind text,
  add column if not exists unit text,
  add column if not exists label text,
  add column if not exists min_qty numeric(12,2),
  add column if not exists max_qty numeric(12,2),
  add column if not exists included_qty numeric(12,2),
  add column if not exists extra_unit_take_home_paise bigint check (extra_unit_take_home_paise is null or extra_unit_take_home_paise > 0),
  add column if not exists bands jsonb not null default '[]'::jsonb,   -- [{from, to, take_home_paise}] guest / quantity bands
  add column if not exists price_mode text not null default 'target_net',
  add column if not exists cost_paise bigint,
  add column if not exists margin_pct numeric(6,2);

update public.sambramo_rate_rules set rule_kind = model where rule_kind is null;
alter table public.sambramo_rate_rules alter column rule_kind set not null;

alter table public.sambramo_rate_rules drop constraint if exists sambramo_rate_rules_rule_kind_check;
alter table public.sambramo_rate_rules add constraint sambramo_rate_rules_rule_kind_check check (rule_kind in (
  'hour','session','event','half_day','full_day','multi_day','per_person','per_unit','per_guest',
  'per_staff_hour','per_staff_shift','per_staff_day','per_trip','per_km','vehicle_hour','vehicle_day',
  'catalogue','rental','space','capacity_period','fixed','percentage','quote'));
alter table public.sambramo_rate_rules drop constraint if exists sambramo_rate_rules_price_mode_check;
alter table public.sambramo_rate_rules add constraint sambramo_rate_rules_price_mode_check
  check (price_mode in ('customer','target_net','cost_plus'));
alter table public.sambramo_rate_rules drop constraint if exists sambramo_rate_rules_model_check;
alter table public.sambramo_rate_rules add constraint sambramo_rate_rules_model_check
  check (model is null or model = rule_kind);
alter table public.sambramo_rate_rules drop constraint if exists sambramo_rate_rules_qty_check;
alter table public.sambramo_rate_rules add constraint sambramo_rate_rules_qty_check
  check (min_qty is null or max_qty is null or max_qty >= min_qty);

-- Anchor still has one rule per time model; other trades may have several
-- rules of one kind (e.g. per_unit "per hand" and "per design"), told apart by label.
create unique index if not exists sambramo_rate_rules_kind_label_uniq
  on public.sambramo_rate_rules (listing_version_id, rule_kind, coalesce(label, ''));

-- ═══ Add-ons: every unit the trade files use, any package key ═════════
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.sambramo_addon_rules'::regclass and contype = 'c'
              and (pg_get_constraintdef(oid) ~ '\munit\M' or pg_get_constraintdef(oid) ~ 'included_in') loop
    execute format('alter table public.sambramo_addon_rules drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.sambramo_addon_rules add constraint sambramo_addon_rules_unit_check check (unit in (
  'per_event','per_session','per_hour','per_day','per_person','per_guest','per_item','per_piece','per_set',
  'per_box','per_kg','per_km','per_trip','per_staff','per_counter','per_vehicle'));
-- Package keys are the trade's own (ESSENTIAL/SIGNATURE/VIP for Anchor,
-- BRIDAL/PARTY for makeup, …), so only their shape is checked.
create or replace function public.sambramo_valid_package_keys(p text[])
returns boolean language sql immutable set search_path = public
as $$ select coalesce(bool_and(x ~ '^[A-Z0-9_]{1,40}$'), true) from unnest(p) x $$;
alter table public.sambramo_addon_rules add constraint sambramo_addon_rules_included_in_check
  check (public.sambramo_valid_package_keys(included_in));

-- ═══ Catalogue items (version-scoped) ═════════════════════════════════
create table if not exists public.sambramo_catalogue_items (
  id uuid primary key default gen_random_uuid(),
  listing_version_id uuid not null references public.sambramo_listing_versions(id) on delete cascade,
  collection text not null,                         -- the trade's catalogue key: menus, items, vehicles, spaces…
  item_key text not null,                           -- stable within the listing across versions
  sort_order integer not null default 0,
  name text not null check (length(trim(name)) > 0),
  category text,
  unit text not null default 'item',                -- what one quantity means: item, kg, set, guest, day…
  take_home_paise bigint check (take_home_paise is null or take_home_paise >= 0),  -- null = quote only
  customer_paise bigint,
  price_mode text not null default 'target_net' check (price_mode in ('customer','target_net','cost_plus')),
  min_qty numeric(12,2) not null default 1 check (min_qty > 0),
  max_qty numeric(12,2),
  stock_qty integer check (stock_qty is null or stock_qty >= 0),   -- rentals / stocked products
  lead_days integer not null default 0 check (lead_days between 0 and 365),
  qty_bands jsonb not null default '[]'::jsonb,     -- [{from, to, take_home_paise}]
  deposit_paise bigint check (deposit_paise is null or deposit_paise >= 0),  -- refundable, never revenue
  attributes jsonb not null default '{}'::jsonb,    -- every trade-specific field from the questionnaire
  media jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  unique (listing_version_id, collection, item_key),
  check (customer_paise is null or take_home_paise is null or customer_paise >= take_home_paise)
);
create index if not exists sambramo_catalogue_items_version_idx on public.sambramo_catalogue_items (listing_version_id, collection, sort_order);

alter table public.sambramo_catalogue_items enable row level security;
drop policy if exists catalogue_items_access on public.sambramo_catalogue_items;
create policy catalogue_items_access on public.sambramo_catalogue_items for select to anon, authenticated
  using (listing_version_id in (select id from public.sambramo_listing_versions));   -- inherits the version's RLS
drop policy if exists catalogue_items_owner_write on public.sambramo_catalogue_items;
create policy catalogue_items_owner_write on public.sambramo_catalogue_items for all to authenticated
  using (listing_version_id in (select lv.id from public.sambramo_listing_versions lv
          join public.vendors v on v.id = lv.vendor_id
         where v.profile_id = (select auth.uid()) and lv.status in ('DRAFT','ACTION_REQUIRED')))
  with check (listing_version_id in (select lv.id from public.sambramo_listing_versions lv
          join public.vendors v on v.id = lv.vendor_id
         where v.profile_id = (select auth.uid()) and lv.status in ('DRAFT','ACTION_REQUIRED')));

-- ═══ Resources a listing owns (not versioned: the actual guards, vans, rooms) ═══
create table if not exists public.sambramo_resources (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  vendor_service_id uuid not null references public.vendor_services(id) on delete cascade,
  kind text not null check (kind in ('staff','vehicle','equipment','space','capacity','production','project')),
  resource_key text not null,                       -- e.g. catalogue item_key it backs, or 'crew'
  label text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null default 'unit',                -- unit, person, sqft, pallet, set_per_day…
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 1440),
  attributes jsonb not null default '{}'::jsonb,    -- public-safe attributes only
  private_ref jsonb not null default '{}'::jsonb,   -- registration numbers etc.; never in public reads
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (vendor_service_id, resource_key)
);
alter table public.sambramo_resources enable row level security;
drop policy if exists resources_owner on public.sambramo_resources;
create policy resources_owner on public.sambramo_resources for all to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())) or public.get_my_role() = 'admin')
  with check (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())));

create table if not exists public.sambramo_resource_reservations (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.sambramo_resources(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  booking_line_id uuid references public.booking_lines(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  qty numeric(12,2) not null check (qty > 0),
  status text not null default 'confirmed' check (status in ('held','confirmed','released')),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index if not exists sambramo_resource_reservations_window_idx
  on public.sambramo_resource_reservations (resource_id, start_at, end_at) where status <> 'released';
alter table public.sambramo_resource_reservations enable row level security;
drop policy if exists reservations_owner_read on public.sambramo_resource_reservations;
create policy reservations_owner_read on public.sambramo_resource_reservations for select to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())) or public.get_my_role() = 'admin');

-- How much of a resource is free across a window (buffer applied both sides).
create or replace function public.sambramo_resource_free(p_resource_id uuid, p_start timestamptz, p_end timestamptz)
returns numeric language sql stable security definer set search_path = public
as $$
  select r.quantity - coalesce((
    select sum(x.qty) from public.sambramo_resource_reservations x
     where x.resource_id = r.id and x.status <> 'released'
       and x.start_at < p_end + make_interval(mins => r.buffer_minutes)
       and x.end_at > p_start - make_interval(mins => r.buffer_minutes)), 0)
  from public.sambramo_resources r where r.id = p_resource_id and r.active
$$;
revoke all on function public.sambramo_resource_free(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.sambramo_resource_free(uuid, timestamptz, timestamptz) to authenticated, service_role;

-- ═══ Statutory rows that were missing (only if 146 is applied) ════════
do $$
begin
  if to_regclass('public.verification_policy') is null then
    raise notice 'verification_policy not present (146 not applied) — skipping trade policy rows.';
    return;
  end if;
  insert into public.verification_policy (requirement_id, market, trade, service, mandatory_from, note) values
    ('VER-TRADE-FSSAI', null, 'Bar & Beverages', null, date '2026-11-01', 'Serving drinks to the public is food service under the FSS Act 2006.'),
    ('VER-TRADE-DL', null, 'Mini Truck / Pickup', null, date '2026-11-01', 'Driving without a valid licence is an offence under the Motor Vehicles Act.'),
    ('VER-TRADE-RC', null, 'Mini Truck / Pickup', null, date '2026-11-01', 'The vehicle carrying the load must be the registered vehicle.'),
    ('VER-TRADE-INSURANCE', null, 'Mini Truck / Pickup', null, date '2026-11-01', 'Third-party motor cover is compulsory.'),
    ('VER-TRADE-DL', null, 'Medium / Large Goods Vehicle', null, date '2026-11-01', 'Driving without a valid licence is an offence under the Motor Vehicles Act.'),
    ('VER-TRADE-RC', null, 'Medium / Large Goods Vehicle', null, date '2026-11-01', 'The vehicle carrying the load must be the registered vehicle.'),
    ('VER-TRADE-INSURANCE', null, 'Medium / Large Goods Vehicle', null, date '2026-11-01', 'Third-party motor cover is compulsory.'),
    ('VER-TRADE-DL', null, 'Passenger Transport', null, date '2026-11-01', 'Driving without a valid licence is an offence under the Motor Vehicles Act.'),
    ('VER-TRADE-RC', null, 'Passenger Transport', null, date '2026-11-01', 'The vehicle carrying guests must be the registered vehicle.'),
    ('VER-TRADE-INSURANCE', null, 'Passenger Transport', null, date '2026-11-01', 'Third-party motor cover decides whether an injured guest is compensated.'),
    ('VER-TRADE-DL', null, 'Valet Parking', null, date '2026-11-01', 'A valet drives a guest''s car; a valid licence is the minimum.'),
    ('VER-TRADE-PROPERTY', null, 'Venue', null, date '2026-11-01', 'Only someone entitled to let the venue can take a booking for it.'),
    ('VER-TRADE-SAFETY', null, 'Safety & Facilities', null, date '2026-11-01', 'Inspection, emergency preparedness and crowd safety need a checked authorisation.')
  on conflict (coalesce(market, '*'), coalesce(trade, '*'), coalesce(service, '*'), requirement_id)
  do update set mandatory_from = excluded.mandatory_from, note = excluded.note;
end $$;

commit;
