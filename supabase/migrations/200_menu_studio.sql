-- 200 — Menu Studio: Sambramo's own menus, the customer's version of one,
-- and partners quoting for exactly it (Mohan, 2026-11-02: "SAMBRAMO creates
-- the menu. Customers customise it. Eligible partners compete to fulfil it.").
--
-- Built ON the existing food catalogue (20261010_12): dishes stay in
-- sambramo_master_dishes (2,742 rows) — this adds the attributes a customer
-- needs to choose from them, and the menus that group them. Quotes stay in
-- sambramo_quote_requests / _responses / _line_items (164, 20261010_02):
-- this adds the menu changes a partner proposes, the questions both sides
-- ask, and the customer's approval of a changed menu.
--
--   sambramo_menu_sections          Welcome Drinks … Special Additions, ordered
--   sambramo_cuisine_families       22 customer-facing families → catalogue cuisines
--   sambramo_master_dishes  (+cols)  description, egg, usual allergens, spice, format
--   sambramo_catalogue_assets       licensed photos with source, licence, attribution
--   sambramo_menu_templates         96 curated menus (no prices, ever)
--   sambramo_menu_template_items    their dishes, by section
--   sambramo_occasion_menu_rules    which menus suit an occasion (template or category)
--   sambramo_customer_menus         the customer's menu — one row per menu
--   sambramo_customer_menu_items    its dishes, every saved version kept
--   save_customer_menu()            one transaction: header + a new version
--   sambramo_quote_menu_changes     a partner's swap / remove / add, per quote
--   sambramo_quote_messages         clarification and revision requests
--   sambramo_menu_approvals         the customer approving a changed menu
--
-- Rows are loaded by scripts/apply-menu-catalogue.mjs (service role, from
-- supabase/seed/menu-catalogue/v1/catalogue.json). Additive; safe to re-run.

begin;

-- ═══ Catalogue ═══════════════════════════════════════════════════════════
create table if not exists public.sambramo_menu_sections (
  id text primary key,
  name text not null,
  sort integer not null default 0,
  active boolean not null default true,
  family_ids text[] not null default '{}'          -- empty = every cuisine
);

create table if not exists public.sambramo_cuisine_families (
  id text primary key,
  name text not null,
  region text,
  line text,
  cuisine_ids text[] not null default '{}',         -- sambramo_cuisines ids (the regional variants)
  variant_labels jsonb not null default '{}'::jsonb, -- {cuisine_id: "Mysore"}
  cities text[] not null default '{}',              -- raises the family for an event there; never hides another
  hero_asset_id text,
  sort integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.sambramo_master_dishes
  add column if not exists description text check (description is null or length(description) <= 240),
  add column if not exists contains_egg boolean,                 -- null = not recorded
  add column if not exists allergens_usual text[],               -- what the dish USUALLY contains; null = not recorded
  add column if not exists allergens_verified boolean not null default false,
  add column if not exists vegan_verified boolean not null default false,  -- never inferred
  add column if not exists jain_verified boolean not null default false,   -- never inferred
  add column if not exists spice_level smallint check (spice_level is null or spice_level between 0 and 3),
  add column if not exists serving_format text,
  add column if not exists image_asset_id text;

create table if not exists public.sambramo_catalogue_assets (
  id text primary key,                               -- e.g. pexels-1640777
  subject_kind text not null check (subject_kind in ('dish', 'menu', 'family', 'section')),
  subject_id text not null,
  url text not null check (url ~ '^https://'),
  alt text,
  source text not null,                              -- pexels | sambramo | partner
  source_page text,
  licence text not null,
  attribution text,
  kind text not null default 'inspiration' check (kind in ('inspiration', 'sambramo_original', 'partner_portfolio')),
  usage_status text not null default 'active' check (usage_status in ('active', 'pending_review', 'retired')),
  created_at timestamptz not null default now()
);
create index if not exists sambramo_catalogue_assets_subject on public.sambramo_catalogue_assets (subject_kind, subject_id);

create table if not exists public.sambramo_menu_templates (
  id text primary key,
  family_id text not null references public.sambramo_cuisine_families(id),
  cuisine_id text,                                   -- the regional variant (sambramo_cuisines id)
  name text not null check (length(trim(name)) > 0),
  line text,
  diet text not null check (diet in ('veg', 'non_veg', 'mixed')),
  meals text[] not null default '{}',
  serve text[] not null default '{}',
  tags text[] not null default '{}',
  hero_asset_id text,
  sort integer not null default 0,
  active boolean not null default true,
  review_status text not null default 'needs_review' check (review_status in ('reviewed', 'needs_review', 'rejected')),
  version integer not null default 1,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
create index if not exists sambramo_menu_templates_family on public.sambramo_menu_templates (family_id) where active;

create table if not exists public.sambramo_menu_template_items (
  template_id text not null references public.sambramo_menu_templates(id) on delete cascade,
  dish_id text not null references public.sambramo_master_dishes(id),
  section_id text not null references public.sambramo_menu_sections(id),
  label text,                                        -- Sambramo's clean name; null = the dish's own
  sort integer not null default 0,
  primary key (template_id, dish_id)
);
create index if not exists sambramo_menu_template_items_dish on public.sambramo_menu_template_items (dish_id);

create table if not exists public.sambramo_occasion_menu_rules (
  id text primary key,
  scope text not null check (scope in ('occasion', 'template', 'category')),
  key text not null,
  tags text[] not null default '{}',
  meals text[] not null default '{}',
  serve text[] not null default '{}',
  avoid text[] not null default '{}',
  note text,
  active boolean not null default true,
  unique (scope, key)
);

-- A template edit bumps its version, so a customer menu records exactly what it started from.
create or replace function public.sambramo_menu_template_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and (new.name, new.line, new.diet, new.meals, new.serve, new.tags, new.active)
     is distinct from (old.name, old.line, old.diet, old.meals, old.serve, old.tags, old.active) then
    new.version := old.version + 1;
  end if;
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;
drop trigger if exists sambramo_menu_template_touch on public.sambramo_menu_templates;
create trigger sambramo_menu_template_touch before update on public.sambramo_menu_templates
  for each row execute function public.sambramo_menu_template_touch();

do $$
declare t text;
begin
  foreach t in array array['sambramo_menu_sections', 'sambramo_cuisine_families', 'sambramo_catalogue_assets',
                           'sambramo_menu_templates', 'sambramo_menu_template_items', 'sambramo_occasion_menu_rules'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.get_my_role() = ''admin'') with check (public.get_my_role() = ''admin'')', t || '_admin', t);
  end loop;
end $$;
create policy sambramo_menu_sections_read on public.sambramo_menu_sections for select to anon, authenticated using (active);
create policy sambramo_cuisine_families_read on public.sambramo_cuisine_families for select to anon, authenticated using (active);
create policy sambramo_catalogue_assets_read on public.sambramo_catalogue_assets for select to anon, authenticated using (usage_status = 'active');
create policy sambramo_menu_templates_read on public.sambramo_menu_templates for select to anon, authenticated using (active and review_status <> 'rejected');
create policy sambramo_menu_template_items_read on public.sambramo_menu_template_items for select to anon, authenticated
  using (exists (select 1 from public.sambramo_menu_templates t where t.id = template_id and t.active and t.review_status <> 'rejected'));
create policy sambramo_occasion_menu_rules_read on public.sambramo_occasion_menu_rules for select to anon, authenticated using (active);

-- ═══ The customer's menu ═════════════════════════════════════════════════
create table if not exists public.sambramo_customer_menus (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_key text not null check (length(client_key) between 8 and 80),   -- the phone's id: a retry never makes a second menu
  occasion_id text,
  event_date date,
  guests integer check (guests is null or guests between 1 and 100000),
  location jsonb not null default '{}'::jsonb,
  template_id text references public.sambramo_menu_templates(id),
  template_version integer,
  family_id text,
  cuisine_id text,
  name text,
  diet text check (diet is null or diet in ('veg', 'non_veg', 'mixed', 'jain', 'vegan', 'eggless')),
  allergies text check (allergies is null or length(allergies) <= 300),
  meal text,
  serve text,
  instructions text check (instructions is null or length(instructions) <= 2000),
  reference_urls text[] not null default '{}' check (cardinality(reference_urls) <= 5),
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'cancelled')),
  current_version integer not null default 1,
  quote_group_id uuid,
  approved_response_id uuid references public.sambramo_quote_responses(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, client_key)
);

create table if not exists public.sambramo_customer_menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.sambramo_customer_menus(id) on delete cascade,
  version integer not null,
  section_id text not null references public.sambramo_menu_sections(id),
  sort integer not null default 0,
  dish_id text references public.sambramo_master_dishes(id),           -- null when the customer typed a dish
  custom_name text check (custom_name is null or length(trim(custom_name)) between 1 and 80),
  replaces_dish_id text references public.sambramo_master_dishes(id),  -- a swap keeps what it replaced
  note text check (note is null or length(note) <= 200),
  check (dish_id is not null or custom_name is not null)
);
create index if not exists sambramo_customer_menu_items_menu on public.sambramo_customer_menu_items (menu_id, version);

alter table public.sambramo_customer_menus enable row level security;
alter table public.sambramo_customer_menu_items enable row level security;
drop policy if exists customer_menus_own on public.sambramo_customer_menus;
create policy customer_menus_own on public.sambramo_customer_menus for all to authenticated
  using (customer_id = (select auth.uid()) or public.get_my_role() = 'admin')
  with check (customer_id = (select auth.uid()));
drop policy if exists customer_menu_items_own on public.sambramo_customer_menu_items;
create policy customer_menu_items_own on public.sambramo_customer_menu_items for all to authenticated
  using (exists (select 1 from public.sambramo_customer_menus m where m.id = menu_id and (m.customer_id = (select auth.uid()) or public.get_my_role() = 'admin')))
  with check (exists (select 1 from public.sambramo_customer_menus m where m.id = menu_id and m.customer_id = (select auth.uid())));
-- A partner sent this menu reads it (the request carries a snapshot too).
drop policy if exists customer_menus_partner_read on public.sambramo_customer_menus;
create policy customer_menus_partner_read on public.sambramo_customer_menus for select to authenticated
  using (quote_group_id is not null and exists (
    select 1 from public.sambramo_quote_requests qr join public.vendors v on v.id = qr.vendor_id
     where qr.quote_group_id = sambramo_customer_menus.quote_group_id and v.profile_id = (select auth.uid())));
drop policy if exists customer_menu_items_partner_read on public.sambramo_customer_menu_items;
create policy customer_menu_items_partner_read on public.sambramo_customer_menu_items for select to authenticated
  using (exists (
    select 1 from public.sambramo_customer_menus m join public.sambramo_quote_requests qr on qr.quote_group_id = m.quote_group_id
      join public.vendors v on v.id = qr.vendor_id
     where m.id = menu_id and m.quote_group_id is not null and v.profile_id = (select auth.uid())));

/* Save the menu and a NEW version of its dishes in one transaction.
   p_items: [{section_id, dish_id?, custom_name?, replaces_dish_id?, note?}]
   Idempotent on (customer, client_key). Earlier versions are never touched. */
create or replace function public.save_customer_menu(p_client_key text, p_menu jsonb, p_items jsonb)
returns table (menu_id uuid, version integer)
language plpgsql security invoker set search_path = public
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_version integer;
begin
  if auth.uid() is null then raise exception 'sign in to save a menu' using errcode = '42501'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'a menu needs at least one dish'; end if;
  if jsonb_array_length(p_items) > 120 then raise exception 'too many dishes'; end if;

  insert into public.sambramo_customer_menus as m (customer_id, client_key, occasion_id, event_date, guests, location, template_id, template_version,
      family_id, cuisine_id, name, diet, allergies, meal, serve, instructions, reference_urls, quote_group_id, current_version)
  values (auth.uid(), p_client_key, p_menu->>'occasion_id', nullif(p_menu->>'event_date', '')::date, nullif(p_menu->>'guests', '')::integer,
      coalesce(p_menu->'location', '{}'::jsonb), p_menu->>'template_id', nullif(p_menu->>'template_version', '')::integer,
      p_menu->>'family_id', p_menu->>'cuisine_id', p_menu->>'name', p_menu->>'diet', p_menu->>'allergies', p_menu->>'meal', p_menu->>'serve',
      p_menu->>'instructions', coalesce((select array_agg(x) from jsonb_array_elements_text(p_menu->'reference_urls') x), '{}'),
      nullif(p_menu->>'quote_group_id', '')::uuid, 1)
  on conflict (customer_id, client_key) do update set
      guests = excluded.guests, event_date = excluded.event_date, location = excluded.location, template_id = excluded.template_id,
      template_version = excluded.template_version, family_id = excluded.family_id, cuisine_id = excluded.cuisine_id, name = excluded.name,
      diet = excluded.diet, allergies = excluded.allergies, meal = excluded.meal, serve = excluded.serve, instructions = excluded.instructions,
      reference_urls = excluded.reference_urls, quote_group_id = coalesce(excluded.quote_group_id, m.quote_group_id),
      current_version = m.current_version + 1, updated_at = now()
  returning m.id, m.current_version into v_id, v_version;

  insert into public.sambramo_customer_menu_items (menu_id, version, section_id, sort, dish_id, custom_name, replaces_dish_id, note)
  select v_id, v_version, i->>'section_id', (o - 1)::integer, nullif(i->>'dish_id', ''), nullif(trim(i->>'custom_name'), ''),
         nullif(i->>'replaces_dish_id', ''), nullif(i->>'note', '')
    from jsonb_array_elements(p_items) with ordinality as t(i, o);

  if p_menu ? 'status' and p_menu->>'status' in ('draft', 'sent') then
    update public.sambramo_customer_menus set status = p_menu->>'status' where id = v_id;
  end if;
  return query select v_id, v_version;
end $$;
grant execute on function public.save_customer_menu(text, jsonb, jsonb) to authenticated;

-- ═══ Partners' replies to a menu ═════════════════════════════════════════
create table if not exists public.sambramo_quote_menu_changes (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.sambramo_quote_requests(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  quote_version integer not null default 1,
  action text not null check (action in ('swap', 'remove', 'add', 'note')),
  section_id text,
  from_dish_id text, from_name text,
  to_dish_id text, to_name text,
  note text check (note is null or length(note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists sambramo_quote_menu_changes_request on public.sambramo_quote_menu_changes (quote_request_id);

create table if not exists public.sambramo_quote_messages (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.sambramo_quote_requests(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'partner')),
  sender_id uuid not null default auth.uid(),
  kind text not null default 'message' check (kind in ('clarification', 'answer', 'revision_request', 'message')),
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  -- Contact details stay inside Sambramo until a booking is paid.
  check (body !~ '(\+?91[ -]?)?[6-9][0-9]{4}[ -]?[0-9]{5}' and body !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}')
);
create index if not exists sambramo_quote_messages_request on public.sambramo_quote_messages (quote_request_id, created_at);

create table if not exists public.sambramo_menu_approvals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid(),
  quote_request_id uuid not null references public.sambramo_quote_requests(id) on delete cascade,
  response_id uuid not null references public.sambramo_quote_responses(id) on delete cascade,
  menu_id uuid references public.sambramo_customer_menus(id) on delete set null,
  changes jsonb not null default '[]'::jsonb,        -- exactly what was approved
  approved_at timestamptz not null default now(),
  unique (response_id)
);

alter table public.sambramo_quote_menu_changes enable row level security;
alter table public.sambramo_quote_messages enable row level security;
alter table public.sambramo_menu_approvals enable row level security;

drop policy if exists quote_menu_changes_parties on public.sambramo_quote_menu_changes;
create policy quote_menu_changes_parties on public.sambramo_quote_menu_changes for select to authenticated
  using (exists (select 1 from public.sambramo_quote_requests qr left join public.vendors v on v.id = qr.vendor_id
    where qr.id = quote_request_id and (qr.customer_id = (select auth.uid()) or v.profile_id = (select auth.uid()))) or public.get_my_role() = 'admin');
drop policy if exists quote_menu_changes_partner_write on public.sambramo_quote_menu_changes;
create policy quote_menu_changes_partner_write on public.sambramo_quote_menu_changes for insert to authenticated
  with check (exists (select 1 from public.sambramo_quote_requests qr join public.vendors v on v.id = qr.vendor_id
    where qr.id = quote_request_id and qr.vendor_id = sambramo_quote_menu_changes.vendor_id and v.profile_id = (select auth.uid())));

drop policy if exists quote_messages_read on public.sambramo_quote_messages;
create policy quote_messages_read on public.sambramo_quote_messages for select to authenticated
  using (exists (select 1 from public.sambramo_quote_requests qr left join public.vendors v on v.id = qr.vendor_id
    where qr.id = quote_request_id and (qr.customer_id = (select auth.uid()) or v.profile_id = (select auth.uid()))) or public.get_my_role() = 'admin');
drop policy if exists quote_messages_write on public.sambramo_quote_messages;
create policy quote_messages_write on public.sambramo_quote_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and exists (
    select 1 from public.sambramo_quote_requests qr left join public.vendors v on v.id = qr.vendor_id
     where qr.id = quote_request_id
       and ((sender_role = 'customer' and qr.customer_id = (select auth.uid()))
         or (sender_role = 'partner' and v.profile_id = (select auth.uid())))));

drop policy if exists menu_approvals_own on public.sambramo_menu_approvals;
create policy menu_approvals_own on public.sambramo_menu_approvals for select to authenticated
  using (customer_id = (select auth.uid()) or public.get_my_role() = 'admin');
-- Written by api/accept-custom-quote.js (service role) as part of accepting.

-- ═══ Photos an admin uploads for a menu, a cuisine or a dish ════════════
-- Public read (customers see them); only admins write. 5 MB, images only.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('menu-catalogue', 'menu-catalogue', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Admins manage menu catalogue photos" on storage.objects;
create policy "Admins manage menu catalogue photos" on storage.objects for all to authenticated
  using (bucket_id = 'menu-catalogue' and public.get_my_role() = 'admin')
  with check (bucket_id = 'menu-catalogue' and public.get_my_role() = 'admin');
drop policy if exists "Menu catalogue photos are readable" on storage.objects;
create policy "Menu catalogue photos are readable" on storage.objects for select to anon, authenticated using (bucket_id = 'menu-catalogue');

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'sambramo_quote_messages') then
    alter publication supabase_realtime add table public.sambramo_quote_messages;
  end if;
exception when undefined_object then null; end $$;

commit;
