begin;

create table if not exists public.sambramo_catering_packages (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  vendor_service_id uuid not null references public.vendor_services(id) on delete cascade,
  name text not null,
  cuisine_ids text[] not null default '{}',
  kitchen_type text not null default 'pure_veg',
  service_style text not null default 'buffet',
  min_guests integer not null default 1 check (min_guests > 0),
  max_guests integer check (max_guests is null or max_guests >= min_guests),
  service_hours numeric(6,2) not null default 3 check (service_hours > 0),
  included_staff integer not null default 0 check (included_staff >= 0),
  notes text,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','PAUSED','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_service_id, name),
  check (kitchen_type in ('pure_veg','pure_nonveg','both')),
  check (service_style in ('plantain_leaf','buffet','plated','packed_meals','live_counters','mixed','custom'))
);

create index if not exists sambramo_catering_packages_vendor_idx
  on public.sambramo_catering_packages(vendor_id, vendor_service_id, status);

create table if not exists public.sambramo_catering_package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.sambramo_catering_packages(id) on delete cascade,
  dish_id text not null references public.catalogue_dishes(id),
  section text not null,
  selection_type text not null default 'included'
    check (selection_type in ('included','optional','replacement')),
  choice_group text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (package_id, dish_id, selection_type, choice_group)
);

create index if not exists sambramo_catering_package_items_package_idx
  on public.sambramo_catering_package_items(package_id, section, sort_order);

create table if not exists public.sambramo_catering_package_addons (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.sambramo_catering_packages(id) on delete cascade,
  name text not null,
  unit text not null check (unit in ('per_guest','per_counter','per_staff','per_hour','per_event','per_set','per_item','per_trip')),
  rate_paise bigint not null default 0 check (rate_paise >= 0),
  minimum_quantity integer not null default 1 check (minimum_quantity >= 1),
  maximum_quantity integer check (maximum_quantity is null or maximum_quantity >= minimum_quantity),
  included_quantity integer not null default 0 check (included_quantity >= 0),
  notes text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sambramo_catering_package_addons_package_idx
  on public.sambramo_catering_package_addons(package_id, sort_order);

create table if not exists public.sambramo_catering_price_versions (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.sambramo_catering_packages(id) on delete cascade,
  version integer not null,
  supply_rate_paise bigint not null check (supply_rate_paise > 0),
  unit text not null default 'per_guest' check (unit = 'per_guest'),
  minimum_guests integer not null check (minimum_guests > 0),
  maximum_guests integer check (maximum_guests is null or maximum_guests >= minimum_guests),
  service_hours numeric(6,2) not null check (service_hours > 0),
  included_staff integer not null default 0 check (included_staff >= 0),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUPERSEDED','DRAFT')),
  created_at timestamptz not null default now(),
  unique (package_id, version),
  check (effective_to is null or effective_to > effective_from)
);

create index if not exists sambramo_catering_price_versions_package_idx
  on public.sambramo_catering_price_versions(package_id, version desc);

create or replace function public.sambramo_touch_catering_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_sambramo_catering_packages_updated on public.sambramo_catering_packages;
create trigger trg_sambramo_catering_packages_updated before update on public.sambramo_catering_packages
for each row execute function public.sambramo_touch_catering_updated_at();

drop trigger if exists trg_sambramo_catering_addons_updated on public.sambramo_catering_package_addons;
create trigger trg_sambramo_catering_addons_updated before update on public.sambramo_catering_package_addons
for each row execute function public.sambramo_touch_catering_updated_at();

alter table public.sambramo_catering_packages enable row level security;
alter table public.sambramo_catering_package_items enable row level security;
alter table public.sambramo_catering_package_addons enable row level security;
alter table public.sambramo_catering_price_versions enable row level security;

drop policy if exists sambramo_catering_packages_owner on public.sambramo_catering_packages;
create policy sambramo_catering_packages_owner on public.sambramo_catering_packages
for all to authenticated
using (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())))
with check (
  vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid()))
  and vendor_service_id in (
    select s.id from public.vendor_services s
    where s.vendor_id = vendor_id and s.category = 'Catering & Food'
  )
);

drop policy if exists sambramo_catering_packages_public_active on public.sambramo_catering_packages;
create policy sambramo_catering_packages_public_active on public.sambramo_catering_packages
for select to anon, authenticated using (status = 'ACTIVE');

drop policy if exists sambramo_catering_items_owner on public.sambramo_catering_package_items;
create policy sambramo_catering_items_owner on public.sambramo_catering_package_items
for all to authenticated
using (exists (
  select 1 from public.sambramo_catering_packages p
  where p.id = package_id and p.vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid()))
))
with check (exists (
  select 1 from public.sambramo_catering_packages p
  where p.id = package_id and p.vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid()))
));

drop policy if exists sambramo_catering_items_public_active on public.sambramo_catering_package_items;
create policy sambramo_catering_items_public_active on public.sambramo_catering_package_items
for select to anon, authenticated using (exists (
  select 1 from public.sambramo_catering_packages p where p.id = package_id and p.status = 'ACTIVE'
));

drop policy if exists sambramo_catering_addons_owner on public.sambramo_catering_package_addons;
create policy sambramo_catering_addons_owner on public.sambramo_catering_package_addons
for all to authenticated
using (exists (
  select 1 from public.sambramo_catering_packages p
  where p.id = package_id and p.vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid()))
))
with check (exists (
  select 1 from public.sambramo_catering_packages p
  where p.id = package_id and p.vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid()))
));

drop policy if exists sambramo_catering_addons_public_active on public.sambramo_catering_package_addons;
create policy sambramo_catering_addons_public_active on public.sambramo_catering_package_addons
for select to anon, authenticated using (exists (
  select 1 from public.sambramo_catering_packages p where p.id = package_id and p.status = 'ACTIVE'
));

drop policy if exists sambramo_catering_versions_owner on public.sambramo_catering_price_versions;
create policy sambramo_catering_versions_owner on public.sambramo_catering_price_versions
for select to authenticated using (exists (
  select 1 from public.sambramo_catering_packages p
  where p.id = package_id and p.vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid()))
));

drop policy if exists sambramo_catering_versions_public_active on public.sambramo_catering_price_versions;
create policy sambramo_catering_versions_public_active on public.sambramo_catering_price_versions
for select to anon, authenticated using (
  status = 'ACTIVE' and exists (
    select 1 from public.sambramo_catering_packages p where p.id = package_id and p.status = 'ACTIVE'
  )
);

create or replace function public.save_sambramo_catering_package(
  p_vendor_service_id uuid,
  p_package_id uuid default null,
  p_package jsonb default '{}'::jsonb,
  p_items jsonb default '[]'::jsonb,
  p_addons jsonb default '[]'::jsonb,
  p_rate jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor_id uuid;
  v_package_id uuid;
  v_status text := coalesce(p_package->>'status','DRAFT');
  v_name text := nullif(trim(p_package->>'name'),'');
  v_min integer := greatest(1, coalesce((p_package->>'min_guests')::integer, 1));
  v_max integer := nullif(p_package->>'max_guests','')::integer;
  v_hours numeric := coalesce((p_package->>'service_hours')::numeric, 3);
  v_staff integer := greatest(0, coalesce((p_package->>'included_staff')::integer, 0));
  v_rate bigint := coalesce((p_rate->>'supply_rate_paise')::bigint, 0);
  v_version integer;
  v_item jsonb;
  v_addon jsonb;
begin
  select v.id into v_vendor_id
  from public.vendors v
  join public.vendor_services s on s.vendor_id = v.id
  where s.id = p_vendor_service_id and s.category = 'Catering & Food' and v.profile_id = auth.uid();

  if v_vendor_id is null then raise exception 'You can only price your own Catering & Food listing.'; end if;
  if v_status not in ('DRAFT','ACTIVE','PAUSED','ARCHIVED') then raise exception 'Unsupported catering package status.'; end if;
  if v_name is null then raise exception 'Give this menu package a name.'; end if;
  if length(v_name) > 80 then raise exception 'Menu package names can be up to 80 characters.'; end if;
  if v_max is not null and v_max < v_min then raise exception 'Maximum guests cannot be below the minimum.'; end if;
  if v_hours <= 0 or v_hours > 24 then raise exception 'Service duration must be between 0 and 24 hours.'; end if;
  if v_staff < 0 or v_staff > 500 then raise exception 'Included staff is outside the supported range.'; end if;

  if v_status = 'ACTIVE' then
    if v_rate <= 0 then raise exception 'Enter a supply rate greater than zero.'; end if;
    if jsonb_array_length(p_items) = 0 then raise exception 'Add at least one dish before activating this menu.'; end if;
  elsif v_rate < 0 then raise exception 'Supply rate cannot be negative.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Menu dishes must be an array.'; end if;
  if p_addons is null or jsonb_typeof(p_addons) <> 'array' then raise exception 'Menu add-ons must be an array.'; end if;

  if p_package_id is not null then
    if not exists (
      select 1 from public.sambramo_catering_packages p
      where p.id = p_package_id and p.vendor_id = v_vendor_id and p.vendor_service_id = p_vendor_service_id
    ) then raise exception 'That catering package does not belong to this listing.'; end if;
    v_package_id := p_package_id;
    update public.sambramo_catering_packages
       set name = v_name,
           cuisine_ids = coalesce(array(select jsonb_array_elements_text(coalesce(p_package->'cuisine_ids','[]'::jsonb))), '{}'),
           kitchen_type = coalesce(p_package->>'kitchen_type','pure_veg'),
           service_style = coalesce(p_package->>'service_style','buffet'),
           min_guests = v_min,
           max_guests = v_max,
           service_hours = v_hours,
           included_staff = v_staff,
           notes = nullif(trim(coalesce(p_package->>'notes','')), ''),
           status = v_status
     where id = v_package_id;
  else
    insert into public.sambramo_catering_packages(
      vendor_id,vendor_service_id,name,cuisine_ids,kitchen_type,service_style,
      min_guests,max_guests,service_hours,included_staff,notes,status
    ) values (
      v_vendor_id,p_vendor_service_id,v_name,
      coalesce(array(select jsonb_array_elements_text(coalesce(p_package->'cuisine_ids','[]'::jsonb))), '{}'),
      coalesce(p_package->>'kitchen_type','pure_veg'),
      coalesce(p_package->>'service_style','buffet'),
      v_min,v_max,v_hours,v_staff,
      nullif(trim(coalesce(p_package->>'notes','')),''),
      v_status
    ) returning id into v_package_id;
  end if;

  delete from public.sambramo_catering_package_items where package_id = v_package_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(trim(v_item->>'dish_id'),'') = '' then raise exception 'Every menu item needs a dish.'; end if;
    if not exists (select 1 from public.catalogue_dishes d where d.id = v_item->>'dish_id' and coalesce(d.active,true)) then
      raise exception 'One of the selected dishes is no longer available in the catalogue.';
    end if;
    if coalesce(v_item->>'section','') not in ('welcome','starters','soup','salad','breads','mains','curries','rice','accompaniments','sweets','dessert','beverages','live_counter','other') then
      raise exception 'One of the menu sections is not supported.';
    end if;
    if coalesce(v_item->>'selection_type','included') not in ('included','optional','replacement') then
      raise exception 'One of the menu item types is not supported.';
    end if;
    insert into public.sambramo_catering_package_items(package_id,dish_id,section,selection_type,choice_group,sort_order)
    values (
      v_package_id,v_item->>'dish_id',coalesce(v_item->>'section','mains'),
      coalesce(v_item->>'selection_type','included'),nullif(v_item->>'choice_group',''),
      coalesce((v_item->>'sort_order')::integer,0)
    );
  end loop;

  delete from public.sambramo_catering_package_addons where package_id = v_package_id;
  for v_addon in select value from jsonb_array_elements(p_addons) loop
    if coalesce(trim(v_addon->>'name'),'') = '' then raise exception 'Every add-on needs a name.'; end if;
    if coalesce((v_addon->>'rate_paise')::bigint,0) < 0 then raise exception 'An add-on rate cannot be negative.'; end if;
    if coalesce((v_addon->>'minimum_quantity')::integer,1) < 1 then raise exception 'Add-on minimum quantity must be at least 1.'; end if;
    if nullif(v_addon->>'maximum_quantity','') is not null
       and (v_addon->>'maximum_quantity')::integer < (v_addon->>'minimum_quantity')::integer then
      raise exception 'An add-on maximum cannot be below its minimum.';
    end if;
    if coalesce(v_addon->>'unit','') not in ('per_guest','per_counter','per_staff','per_hour','per_event','per_set','per_item','per_trip') then
      raise exception 'One of the add-on units is not supported.';
    end if;
    insert into public.sambramo_catering_package_addons(
      package_id,name,unit,rate_paise,minimum_quantity,maximum_quantity,included_quantity,notes,active,sort_order
    ) values (
      v_package_id,trim(v_addon->>'name'),v_addon->>'unit',
      coalesce((v_addon->>'rate_paise')::bigint,0),
      greatest(1,coalesce((v_addon->>'minimum_quantity')::integer,1)),
      nullif(v_addon->>'maximum_quantity','')::integer,
      greatest(0,coalesce((v_addon->>'included_quantity')::integer,0)),
      nullif(trim(coalesce(v_addon->>'notes','')),''),
      coalesce((v_addon->>'active')::boolean,true),
      coalesce((v_addon->>'sort_order')::integer,0)
    );
  end loop;

  if v_status = 'ACTIVE' and v_rate > 0 then
    select coalesce(max(version),0) + 1 into v_version from public.sambramo_catering_price_versions where package_id = v_package_id;
    update public.sambramo_catering_price_versions set status = 'SUPERSEDED', effective_to = now()
     where package_id = v_package_id and status = 'ACTIVE';
    insert into public.sambramo_catering_price_versions(
      package_id,version,supply_rate_paise,unit,minimum_guests,maximum_guests,service_hours,included_staff,status
    ) values (v_package_id,v_version,v_rate,'per_guest',v_min,v_max,v_hours,v_staff,'ACTIVE');
  end if;

  return jsonb_build_object(
    'package_id',v_package_id,
    'version',coalesce(v_version,(select max(version) from public.sambramo_catering_price_versions where package_id=v_package_id),0),
    'status',v_status
  );
end $$;

revoke all on function public.save_sambramo_catering_package(uuid,uuid,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.save_sambramo_catering_package(uuid,uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;

commit;