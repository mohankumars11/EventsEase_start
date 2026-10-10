-- Catering & Food, part 1: the shared food catalogue, and drafts that live on
-- the server as well as the phone.
--
--   sambramo_cuisines          cuisine groups + regional styles (multi-select)
--   sambramo_food_categories   taxonomy A–M, each mapped to a menu course group
--   sambramo_master_dishes     curated dish templates (no prices, ever)
--   sambramo_dish_proposals    partner-proposed dishes awaiting review
--   sambramo_listing_drafts    the onboarding draft, synced from the device
--   search_master_dishes()     alias / transliteration aware, paginated search
--
-- The catalogue is DATA: rows are loaded by scripts/import-food-catalogue.mjs
-- from supabase/seed/food-catalogue/v1/*.json (idempotent upsert), so it grows
-- without an app release. Partner dishes stay in sambramo_catalogue_items and
-- only point at a master dish; a partner's price, recipe or serving size never
-- touches the master row.
--
-- Additive and re-runnable.

begin;

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.sambramo_cuisines (
  id text primary key,
  group_id text not null,
  group_name text not null,
  name text not null,
  sort integer not null default 0,
  active boolean not null default true,
  is_custom boolean not null default false,
  review_status text not null default 'reviewed' check (review_status in ('reviewed','needs_review','rejected')),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.sambramo_food_categories (
  id text primary key,
  parent_id text not null,
  parent_name text not null,
  name text not null,
  course_group text not null,           -- menu course group (welcome_drinks, soups, … other)
  sort integer not null default 0,
  active boolean not null default true
);

-- array_to_string is only STABLE, so a generated column cannot call it
-- directly; for text[] it is in fact immutable, which this wrapper declares.
create or replace function public.sambramo_dish_search_text(p_name text, p_aliases text[])
returns text language sql immutable parallel safe
as $$ select pg_catalog.lower(p_name || ' ' || coalesce(pg_catalog.array_to_string(p_aliases, ' '), '')) $$;

create table if not exists public.sambramo_master_dishes (
  id text primary key,                  -- canonical; existing SBM-* ids are kept
  name text not null check (length(trim(name)) > 0),
  aliases text[] not null default '{}', -- spellings and transliterations
  local_names jsonb not null default '{}'::jsonb,   -- {kn, ta, te, ml, hi}
  cuisine_ids text[] not null default '{}',
  category_id text references public.sambramo_food_categories(id),
  suggested_diet text check (suggested_diet is null or suggested_diet in ('veg','non_veg','vegan','jain','egg')),
  variants jsonb not null default '[]'::jsonb,
  provenance text not null default 'sambramo-curated',
  review_status text not null default 'needs_review' check (review_status in ('reviewed','needs_review','rejected')),
  version integer not null default 1,
  active boolean not null default true,
  search_text text generated always as (public.sambramo_dish_search_text(name, aliases)) stored,
  updated_at timestamptz not null default now()
);
create index if not exists sambramo_master_dishes_trgm on public.sambramo_master_dishes using gin (search_text extensions.gin_trgm_ops);
create index if not exists sambramo_master_dishes_cuisines on public.sambramo_master_dishes using gin (cuisine_ids);
create index if not exists sambramo_master_dishes_category on public.sambramo_master_dishes (category_id);

alter table public.sambramo_cuisines enable row level security;
alter table public.sambramo_food_categories enable row level security;
alter table public.sambramo_master_dishes enable row level security;
drop policy if exists cuisines_read on public.sambramo_cuisines;
create policy cuisines_read on public.sambramo_cuisines for select to anon, authenticated using (active or public.get_my_role() = 'admin');
drop policy if exists cuisines_admin on public.sambramo_cuisines;
create policy cuisines_admin on public.sambramo_cuisines for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
drop policy if exists food_categories_read on public.sambramo_food_categories;
create policy food_categories_read on public.sambramo_food_categories for select to anon, authenticated using (true);
drop policy if exists master_dishes_read on public.sambramo_master_dishes;
create policy master_dishes_read on public.sambramo_master_dishes for select to anon, authenticated
  using ((active and review_status <> 'rejected') or public.get_my_role() = 'admin');
drop policy if exists master_dishes_admin on public.sambramo_master_dishes;
create policy master_dishes_admin on public.sambramo_master_dishes for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- ═══ Search: name, aliases, transliterations; filtered; paginated ═════════
create or replace function public.search_master_dishes(
  p_q text default null, p_cuisine text default null, p_category text default null,
  p_course text default null, p_diet text default null, p_limit integer default 30, p_offset integer default 0
) returns table (id text, name text, aliases text[], cuisine_ids text[], category_id text, course_group text,
                 suggested_diet text, review_status text, total bigint)
language sql stable security invoker set search_path = public, extensions
as $$
  with q as (select nullif(lower(trim(coalesce(p_q, ''))), '') as t),
  hits as (
    select d.*, c.course_group,
           case when q.t is null then 0
                when d.search_text like q.t || '%' then 3
                when d.search_text like '%' || q.t || '%' then 2
                else similarity(d.search_text, q.t) end as score
      from public.sambramo_master_dishes d
      left join public.sambramo_food_categories c on c.id = d.category_id, q
     where d.active and d.review_status <> 'rejected'
       and (q.t is null or d.search_text like '%' || q.t || '%' or d.search_text % q.t)
       and (p_cuisine is null or p_cuisine = any(d.cuisine_ids))
       and (p_category is null or d.category_id = p_category)
       and (p_course is null or c.course_group = p_course)
       and (p_diet is null or d.suggested_diet = p_diet)
  )
  select h.id, h.name, h.aliases, h.cuisine_ids, h.category_id, h.course_group, h.suggested_diet, h.review_status,
         count(*) over () as total
    from hits h
   order by h.score desc, h.name
   limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset)
$$;
grant execute on function public.search_master_dishes(text, text, text, text, text, integer, integer) to anon, authenticated;

-- ═══ Proposals: a partner's missing dish, reviewed before it is shared ═════
create table if not exists public.sambramo_dish_proposals (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  aliases text[] not null default '{}',
  cuisine_ids text[] not null default '{}',
  category_id text,
  suggested_diet text,
  note text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','merged')),
  master_dish_id text references public.sambramo_master_dishes(id),
  reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.sambramo_dish_proposals enable row level security;
drop policy if exists dish_proposals_owner on public.sambramo_dish_proposals;
create policy dish_proposals_owner on public.sambramo_dish_proposals for select to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())) or public.get_my_role() = 'admin');
drop policy if exists dish_proposals_insert on public.sambramo_dish_proposals;
create policy dish_proposals_insert on public.sambramo_dish_proposals for insert to authenticated
  with check (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())) and status = 'pending');
drop policy if exists dish_proposals_admin on public.sambramo_dish_proposals;
create policy dish_proposals_admin on public.sambramo_dish_proposals for update to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- ═══ Drafts on the server, so a new phone or a reinstall loses nothing ════
create table if not exists public.sambramo_listing_drafts (
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  draft_key text not null,              -- the same key usePartnerDraft uses on the device
  trade_id text,
  data jsonb not null,
  schema_version integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (vendor_id, draft_key)
);
alter table public.sambramo_listing_drafts enable row level security;
drop policy if exists listing_drafts_owner on public.sambramo_listing_drafts;
create policy listing_drafts_owner on public.sambramo_listing_drafts for all to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())))
  with check (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid())));

commit;
