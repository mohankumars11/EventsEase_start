begin;

create table if not exists public.sambramo_trade_packages (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  vendor_service_id uuid not null references public.vendor_services(id) on delete cascade,
  template_id text,
  source text not null default 'PARTNER_CUSTOM'
    check (source in ('SAMBRAMO_TEMPLATE','PARTNER_CUSTOM')),
  name text not null,
  description text,
  commercial_inputs jsonb not null default '{}'::jsonb,
  trade_inputs jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED','APPROVED','LIVE','PAUSED','ARCHIVED')),
  revision_round integer not null default 0 check (revision_round >= 0),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_service_id, name)
);

create index if not exists sambramo_trade_packages_listing_idx
  on public.sambramo_trade_packages(vendor_id, vendor_service_id, status);

create table if not exists public.sambramo_trade_package_addons (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.sambramo_trade_packages(id) on delete cascade,
  name text not null,
  unit text not null,
  rate_paise bigint not null default 0 check (rate_paise >= 0),
  minimum_quantity numeric(12,2) not null default 1 check (minimum_quantity > 0),
  included_quantity numeric(12,2) not null default 0 check (included_quantity >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sambramo_trade_package_addons_package_idx
  on public.sambramo_trade_package_addons(package_id, sort_order);

create table if not exists public.sambramo_trade_price_versions (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.sambramo_trade_packages(id) on delete cascade,
  version integer not null,
  pricing jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','ACTIVE','SUPERSEDED')),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  unique (package_id, version),
  check (effective_to is null or effective_to > effective_from)
);

create index if not exists sambramo_trade_price_versions_package_idx
  on public.sambramo_trade_price_versions(package_id, version desc);

create or replace function public.sambramo_touch_trade_package_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_sambramo_trade_packages_updated on public.sambramo_trade_packages;
create trigger trg_sambramo_trade_packages_updated
before update on public.sambramo_trade_packages
for each row execute function public.sambramo_touch_trade_package_updated_at();

drop trigger if exists trg_sambramo_trade_package_addons_updated on public.sambramo_trade_package_addons;
create trigger trg_sambramo_trade_package_addons_updated
before update on public.sambramo_trade_package_addons
for each row execute function public.sambramo_touch_trade_package_updated_at();

alter table public.sambramo_trade_packages enable row level security;
alter table public.sambramo_trade_package_addons enable row level security;
alter table public.sambramo_trade_price_versions enable row level security;

drop policy if exists sambramo_trade_packages_owner on public.sambramo_trade_packages;
create policy sambramo_trade_packages_owner on public.sambramo_trade_packages
for all to authenticated
using (
  vendor_id in (
    select v.id from public.vendors v where v.profile_id = (select auth.uid())
  )
  and vendor_service_id in (
    select s.id from public.vendor_services s
    where s.id = vendor_service_id
      and s.vendor_id = vendor_id
  )
)
with check (
  vendor_id in (
    select v.id from public.vendors v where v.profile_id = (select auth.uid())
  )
  and vendor_service_id in (
    select s.id from public.vendor_services s
    where s.id = vendor_service_id
      and s.vendor_id = vendor_id
  )
  and status in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED','PAUSED','ARCHIVED')
);

drop policy if exists sambramo_trade_packages_public_live on public.sambramo_trade_packages;
create policy sambramo_trade_packages_public_live on public.sambramo_trade_packages
for select to anon, authenticated
using (status = 'LIVE');

drop policy if exists sambramo_trade_package_addons_owner on public.sambramo_trade_package_addons;
create policy sambramo_trade_package_addons_owner on public.sambramo_trade_package_addons
for all to authenticated
using (exists (
  select 1 from public.sambramo_trade_packages p
  where p.id = package_id
    and p.vendor_id in (
      select v.id from public.vendors v where v.profile_id = (select auth.uid())
    )
))
with check (exists (
  select 1 from public.sambramo_trade_packages p
  where p.id = package_id
    and p.vendor_id in (
      select v.id from public.vendors v where v.profile_id = (select auth.uid())
    )
));

drop policy if exists sambramo_trade_package_addons_public_live on public.sambramo_trade_package_addons;
create policy sambramo_trade_package_addons_public_live on public.sambramo_trade_package_addons
for select to anon, authenticated
using (exists (
  select 1 from public.sambramo_trade_packages p
  where p.id = package_id and p.status = 'LIVE'
));

drop policy if exists sambramo_trade_price_versions_owner on public.sambramo_trade_price_versions;
create policy sambramo_trade_price_versions_owner on public.sambramo_trade_price_versions
for select to authenticated
using (exists (
  select 1 from public.sambramo_trade_packages p
  where p.id = package_id
    and p.vendor_id in (
      select v.id from public.vendors v where v.profile_id = (select auth.uid())
    )
));

drop policy if exists sambramo_trade_price_versions_public_active on public.sambramo_trade_price_versions;
create policy sambramo_trade_price_versions_public_active on public.sambramo_trade_price_versions
for select to anon, authenticated
using (
  status = 'ACTIVE'
  and exists (
    select 1 from public.sambramo_trade_packages p
    where p.id = package_id and p.status = 'LIVE'
  )
);

create or replace function public.save_sambramo_trade_package(
  p_vendor_service_id uuid,
  p_package_id uuid default null,
  p_package jsonb default '{}'::jsonb,
  p_addons jsonb default '[]'::jsonb,
  p_pricing jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor_id uuid;
  v_package_id uuid;
  v_name text := nullif(trim(p_package->>'name'),'');
  v_status text := coalesce(p_package->>'status','DRAFT');
  v_source text := coalesce(p_package->>'source','PARTNER_CUSTOM');
  v_template_id text := nullif(trim(p_package->>'template_id'),'');
  v_description text := nullif(trim(p_package->>'description'),'');
  v_revision integer := greatest(0,coalesce((p_package->>'revision_round')::integer,0));
  v_version integer;
  v_addon jsonb;
begin
  if p_vendor_service_id is null then
    raise exception 'Pricing must belong to a listed service.';
  end if;

  select v.id into v_vendor_id
  from public.vendors v
  join public.vendor_services s on s.vendor_id = v.id
  where s.id = p_vendor_service_id
    and v.profile_id = auth.uid();

  if v_vendor_id is null then
    raise exception 'You can only price a service listed under your own partner account.';
  end if;

  if v_name is null then raise exception 'Give this package a name.'; end if;
  if length(v_name) > 100 then raise exception 'Package names can be up to 100 characters.'; end if;
  if v_source not in ('SAMBRAMO_TEMPLATE','PARTNER_CUSTOM') then raise exception 'Unsupported package source.'; end if;
  if v_status not in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED','PAUSED','ARCHIVED') then
    raise exception 'Partners cannot publish or approve pricing themselves.';
  end if;
  if p_addons is null or jsonb_typeof(p_addons) <> 'array' then raise exception 'Add-ons must be an array.'; end if;
  if p_pricing is null or jsonb_typeof(p_pricing) <> 'object' then raise exception 'Pricing data is invalid.'; end if;

  if p_package_id is not null then
    if not exists (
      select 1 from public.sambramo_trade_packages p
      where p.id = p_package_id
        and p.vendor_id = v_vendor_id
        and p.vendor_service_id = p_vendor_service_id
        and p.status <> 'LIVE'
    ) then
      raise exception 'That package does not belong to this listed service or is already live.';
    end if;

    v_package_id := p_package_id;
    update public.sambramo_trade_packages
    set template_id = v_template_id,
        source = v_source,
        name = v_name,
        description = v_description,
        commercial_inputs = coalesce(p_package->'commercial_inputs','{}'::jsonb),
        trade_inputs = coalesce(p_package->'trade_inputs','{}'::jsonb),
        status = v_status,
        revision_round = v_revision,
        submitted_at = case when v_status = 'UNDER_REVIEW' then now() else submitted_at end
    where id = v_package_id;
  else
    insert into public.sambramo_trade_packages(
      vendor_id,vendor_service_id,template_id,source,name,description,
      commercial_inputs,trade_inputs,status,revision_round,submitted_at
    ) values (
      v_vendor_id,p_vendor_service_id,v_template_id,v_source,v_name,v_description,
      coalesce(p_package->'commercial_inputs','{}'::jsonb),
      coalesce(p_package->'trade_inputs','{}'::jsonb),
      v_status,v_revision,
      case when v_status = 'UNDER_REVIEW' then now() else null end
    ) returning id into v_package_id;
  end if;

  delete from public.sambramo_trade_package_addons where package_id = v_package_id;
  for v_addon in select value from jsonb_array_elements(p_addons) loop
    if coalesce(trim(v_addon->>'name'),'') = '' then raise exception 'Every add-on needs a name.'; end if;
    if coalesce((v_addon->>'rate_paise')::bigint,0) < 0 then raise exception 'Add-on rate cannot be negative.'; end if;
    insert into public.sambramo_trade_package_addons(
      package_id,name,unit,rate_paise,minimum_quantity,included_quantity,active,sort_order
    ) values (
      v_package_id,
      trim(v_addon->>'name'),
      coalesce(nullif(v_addon->>'unit',''),'per_event'),
      greatest(0,coalesce((v_addon->>'rate_paise')::bigint,0)),
      greatest(1,coalesce((v_addon->>'minimum_quantity')::numeric,1)),
      greatest(0,coalesce((v_addon->>'included_quantity')::numeric,0)),
      coalesce((v_addon->>'active')::boolean,true),
      coalesce((v_addon->>'sort_order')::integer,0)
    );
  end loop;

  if v_status = 'UNDER_REVIEW' then
    select coalesce(max(version),0) + 1 into v_version
    from public.sambramo_trade_price_versions where package_id = v_package_id;
    update public.sambramo_trade_price_versions
      set status = 'SUPERSEDED', effective_to = now()
      where package_id = v_package_id and status = 'ACTIVE';
    insert into public.sambramo_trade_price_versions(package_id,version,pricing,status)
    values (v_package_id,v_version,coalesce(p_pricing,'{}'::jsonb),'DRAFT');
  end if;

  return jsonb_build_object(
    'package_id',v_package_id,
    'vendor_service_id',p_vendor_service_id,
    'version',coalesce(v_version,0),
    'status',v_status
  );
end $$;

revoke all on function public.save_sambramo_trade_package(uuid,uuid,jsonb,jsonb,jsonb) from public;
grant execute on function public.save_sambramo_trade_package(uuid,uuid,jsonb,jsonb,jsonb) to authenticated;

commit;
