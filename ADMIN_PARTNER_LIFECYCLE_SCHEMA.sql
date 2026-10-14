-- Sambramo Partner Lifecycle Control Centre
-- Additive PostgreSQL schema for partner-specific internal notes and state-change history.
-- Remove customer-console audit scaffolding from the earlier draft; this control centre is partner-only.
drop trigger if exists trg_admin_audit_customer_role_lifecycle on public.profiles;
drop function if exists public.audit_customer_role_lifecycle_update();

-- Source of truth remains vendors, vendor_services, partner_listings, vendor_documents,
-- partner_work, vendor_payout_details and the existing pricing tables.
-- This file is a consolidated reference for Supabase SQL tooling; it does not seed demo data.

create table if not exists public.admin_lifecycle_notes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null default 'partner' check (target_type = 'partner'),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  note_kind text not null default 'internal'
    check (note_kind in ('internal', 'follow_up', 'risk', 'support', 'compliance')),
  body text not null check (length(trim(body)) between 1 and 4000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
drop index if exists public.admin_lifecycle_notes_customer_time_idx;
alter table public.admin_lifecycle_notes drop constraint if exists admin_lifecycle_notes_exactly_one_target;
alter table public.admin_lifecycle_notes drop constraint if exists admin_lifecycle_notes_target_type_check;
alter table public.admin_lifecycle_notes drop column if exists customer_id;
alter table public.admin_lifecycle_notes add constraint admin_lifecycle_notes_target_type_check check (target_type = 'partner');
alter table public.admin_lifecycle_notes add constraint admin_lifecycle_notes_exactly_one_target check (target_type = 'partner' and vendor_id is not null);
create index if not exists admin_lifecycle_notes_vendor_time_idx
  on public.admin_lifecycle_notes (vendor_id, created_at desc);
alter table public.admin_lifecycle_notes enable row level security;
drop policy if exists "Operators read lifecycle notes" on public.admin_lifecycle_notes;
create policy "Operators read lifecycle notes" on public.admin_lifecycle_notes
  for select using (public.get_my_role() = any (array['admin'::text, 'event_coordinator'::text]));
drop policy if exists "Operators add lifecycle notes" on public.admin_lifecycle_notes;
create policy "Operators add lifecycle notes" on public.admin_lifecycle_notes
  for insert with check (
    public.get_my_role() = any (array['admin'::text, 'event_coordinator'::text])
    and created_by = auth.uid()
  );

create table if not exists public.admin_lifecycle_audit (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type = any (array['partner'::text, 'listing'::text, 'partner_trade'::text, 'document'::text, 'pricing'::text)),
  entity_id uuid not null,
  vendor_id uuid references public.vendors(id) on delete set null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  note text,
  created_at timestamptz not null default now()
);
drop index if exists public.admin_lifecycle_audit_customer_time_idx;
alter table public.admin_lifecycle_audit drop constraint if exists admin_lifecycle_audit_entity_type_check;
alter table public.admin_lifecycle_audit drop column if exists customer_id;
alter table public.admin_lifecycle_audit add constraint admin_lifecycle_audit_entity_type_check
  check (entity_type = any (array['partner'::text, 'listing'::text, 'partner_trade'::text, 'document'::text, 'pricing'::text]));
create index if not exists admin_lifecycle_audit_vendor_time_idx
  on public.admin_lifecycle_audit (vendor_id, created_at desc) where vendor_id is not null;
create index if not exists admin_lifecycle_audit_entity_time_idx
  on public.admin_lifecycle_audit (entity_type, entity_id, created_at desc);
alter table public.admin_lifecycle_audit enable row level security;
drop policy if exists "Operators read lifecycle audit" on public.admin_lifecycle_audit;
create policy "Operators read lifecycle audit" on public.admin_lifecycle_audit
  for select using (public.get_my_role() = any (array['admin'::text, 'event_coordinator'::text]));

-- All audited fields are operational metadata. Do not save storage paths, raw document
-- numbers, PAN values, bank account numbers or UPI IDs in these JSON snapshots.

create or replace function public.audit_partner_lifecycle_update()
returns trigger language plpgsql security definer set search_path = public
as $$
declare changed_action text; before_data jsonb; after_data jsonb;
begin
  after_data := jsonb_build_object(
    'verification_status', new.verification_status, 'is_verified', new.is_verified,
    'is_featured', new.is_featured, 'accepting_jobs', new.accepting_jobs,
    'onboarding_status', new.onboarding_status, 'closure_requested', new.closure_requested_at is not null,
    'suspended', new.suspended_at is not null, 'city', new.city, 'category', new.category
  );
  if tg_op = 'INSERT' then
    insert into public.admin_lifecycle_audit
      (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('partner', new.id, new.id, 'partner.created', null, after_data, auth.uid(), public.get_my_role());
    return new;
  end if;
  before_data := jsonb_build_object(
    'verification_status', old.verification_status, 'is_verified', old.is_verified,
    'is_featured', old.is_featured, 'accepting_jobs', old.accepting_jobs,
    'onboarding_status', old.onboarding_status, 'closure_requested', old.closure_requested_at is not null,
    'suspended', old.suspended_at is not null, 'city', old.city, 'category', old.category
  );
  if before_data = after_data then return new; end if;
  if old.verification_status is distinct from new.verification_status then changed_action := 'partner.verification_changed';
  elsif old.suspended_at is distinct from new.suspended_at then changed_action := 'partner.suspension_changed';
  elsif old.closure_requested_at is distinct from new.closure_requested_at then changed_action := 'partner.closure_request_changed';
  elsif old.onboarding_status is distinct from new.onboarding_status then changed_action := 'partner.onboarding_changed';
  elsif old.is_featured is distinct from new.is_featured then changed_action := 'partner.featured_changed';
  elsif old.city is distinct from new.city then changed_action := 'partner.location_changed';
  else changed_action := 'partner.availability_changed'; end if;
  insert into public.admin_lifecycle_audit
    (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('partner', new.id, new.id, changed_action, before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_partner_lifecycle on public.vendors;
create trigger trg_admin_audit_partner_lifecycle after update of
  verification_status, is_verified, is_featured, accepting_jobs, onboarding_status,
  closure_requested_at, suspended_at, city, category
  on public.vendors for each row execute function public.audit_partner_lifecycle_update();
drop trigger if exists trg_admin_audit_partner_created on public.vendors;
create trigger trg_admin_audit_partner_created after insert on public.vendors
  for each row execute function public.audit_partner_lifecycle_update();

create or replace function public.audit_vendor_service_lifecycle_update()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb; changed_action text;
begin
  after_data := jsonb_build_object('name', new.name, 'category', new.category, 'price', new.price,
    'is_active', new.is_active, 'review_status', new.review_status, 'listing_code', new.listing_code,
    'specs', new.specs, 'unit', new.unit, 'min_quantity', new.min_quantity);
  if tg_op = 'INSERT' then
    insert into public.admin_lifecycle_audit
      (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('listing', new.id, new.vendor_id, 'listing.created', null, after_data, auth.uid(), public.get_my_role());
    return new;
  end if;
  before_data := jsonb_build_object('name', old.name, 'category', old.category, 'price', old.price,
    'is_active', old.is_active, 'review_status', old.review_status, 'listing_code', old.listing_code,
    'specs', old.specs, 'unit', old.unit, 'min_quantity', old.min_quantity);
  if before_data = after_data then return new; end if;
  if old.review_status is distinct from new.review_status then changed_action := 'listing.review_status_changed';
  elsif old.is_active is distinct from new.is_active then changed_action := 'listing.visibility_changed';
  else changed_action := 'listing.content_changed'; end if;
  insert into public.admin_lifecycle_audit
    (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('listing', new.id, new.vendor_id, changed_action, before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_vendor_service_lifecycle on public.vendor_services;
create trigger trg_admin_audit_vendor_service_lifecycle after update of
  name, category, price, is_active, review_status, listing_code, specs, unit, min_quantity
  on public.vendor_services for each row execute function public.audit_vendor_service_lifecycle_update();
drop trigger if exists trg_admin_audit_vendor_service_created on public.vendor_services;
create trigger trg_admin_audit_vendor_service_created after insert on public.vendor_services
  for each row execute function public.audit_vendor_service_lifecycle_update();

create or replace function public.audit_partner_listing_lifecycle_update()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb;
begin
  after_data := jsonb_build_object('trade', new.trade, 'trade_id', new.trade_id, 'status', new.status, 'review_note', new.review_note);
  if tg_op = 'INSERT' then
    insert into public.admin_lifecycle_audit
      (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('partner_trade', new.id, new.vendor_id, 'partner_trade.created', null, after_data, auth.uid(), public.get_my_role());
    return new;
  end if;
  before_data := jsonb_build_object('trade', old.trade, 'trade_id', old.trade_id, 'status', old.status, 'review_note', old.review_note);
  if before_data = after_data then return new; end if;
  insert into public.admin_lifecycle_audit
    (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('partner_trade', new.id, new.vendor_id, 'partner_trade.status_changed', before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_partner_listing_lifecycle on public.partner_listings;
create trigger trg_admin_audit_partner_listing_lifecycle after update of status, review_note
  on public.partner_listings for each row execute function public.audit_partner_listing_lifecycle_update();
drop trigger if exists trg_admin_audit_partner_listing_created on public.partner_listings;
create trigger trg_admin_audit_partner_listing_created after insert on public.partner_listings
  for each row execute function public.audit_partner_listing_lifecycle_update();

create or replace function public.audit_vendor_document_lifecycle_update()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb;
begin
  after_data := jsonb_build_object('kind', new.kind, 'status', new.status, 'provider_status', new.provider_status,
    'requirement_id', new.requirement_id, 'listing_id', new.listing_id, 'expires_on', new.expires_on,
    'uploaded_at', new.uploaded_at, 'file_name', new.file_name);
  if tg_op = 'INSERT' then
    insert into public.admin_lifecycle_audit
      (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('document', new.id, new.vendor_id, 'document.uploaded', null, after_data, auth.uid(), public.get_my_role());
    return new;
  end if;
  before_data := jsonb_build_object('kind', old.kind, 'status', old.status, 'provider_status', old.provider_status,
    'requirement_id', old.requirement_id, 'listing_id', old.listing_id, 'expires_on', old.expires_on,
    'uploaded_at', old.uploaded_at, 'file_name', old.file_name);
  if before_data = after_data then return new; end if;
  insert into public.admin_lifecycle_audit
    (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('document', new.id, new.vendor_id, 'document.verification_changed', before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_vendor_document_lifecycle on public.vendor_documents;
create trigger trg_admin_audit_vendor_document_lifecycle after update of
  status, provider_status, requirement_id, listing_id, expires_on, file_name
  on public.vendor_documents for each row execute function public.audit_vendor_document_lifecycle_update();
drop trigger if exists trg_admin_audit_vendor_document_created on public.vendor_documents;
create trigger trg_admin_audit_vendor_document_created after insert on public.vendor_documents
  for each row execute function public.audit_vendor_document_lifecycle_update();

create or replace function public.audit_partner_pricing_lifecycle_update()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb;
begin
  after_data := jsonb_build_object('name', new.name, 'status', new.status, 'revision_round', new.revision_round,
    'commercial_inputs', new.commercial_inputs, 'trade_inputs', new.trade_inputs);
  if tg_op = 'INSERT' then
    insert into public.admin_lifecycle_audit
      (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('pricing', new.id, new.vendor_id, 'pricing.package_created', null, after_data, auth.uid(), public.get_my_role());
    return new;
  end if;
  before_data := jsonb_build_object('name', old.name, 'status', old.status, 'revision_round', old.revision_round,
    'commercial_inputs', old.commercial_inputs, 'trade_inputs', old.trade_inputs);
  if before_data = after_data then return new; end if;
  insert into public.admin_lifecycle_audit
    (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('pricing', new.id, new.vendor_id, 'pricing.revision_changed', before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_trade_pricing_lifecycle on public.sambramo_trade_packages;
create trigger trg_admin_audit_trade_pricing_lifecycle after update of
  name, status, revision_round, commercial_inputs, trade_inputs
  on public.sambramo_trade_packages for each row execute function public.audit_partner_pricing_lifecycle_update();
drop trigger if exists trg_admin_audit_trade_pricing_created on public.sambramo_trade_packages;
create trigger trg_admin_audit_trade_pricing_created after insert on public.sambramo_trade_packages
  for each row execute function public.audit_partner_pricing_lifecycle_update();

create or replace function public.audit_catering_package_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb;
begin
  after_data := jsonb_build_object('name', new.name, 'status', new.status, 'sourcing_mode', new.sourcing_mode,
    'rate_bands', new.rate_bands, 'min_guests', new.min_guests, 'max_guests', new.max_guests);
  if tg_op = 'INSERT' then
    insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('pricing', new.id, new.vendor_id, 'pricing.catering_package_created', null, after_data, auth.uid(), public.get_my_role());
    return new;
  end if;
  before_data := jsonb_build_object('name', old.name, 'status', old.status, 'sourcing_mode', old.sourcing_mode,
    'rate_bands', old.rate_bands, 'min_guests', old.min_guests, 'max_guests', old.max_guests);
  if before_data = after_data then return new; end if;
  insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('pricing', new.id, new.vendor_id, 'pricing.catering_package_changed', before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_catering_package_lifecycle on public.sambramo_catering_packages;
create trigger trg_admin_audit_catering_package_lifecycle after insert or update of
  name, status, sourcing_mode, rate_bands, min_guests, max_guests
  on public.sambramo_catering_packages for each row execute function public.audit_catering_package_lifecycle();

create or replace function public.audit_partner_work_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb;
begin
  after_data := jsonb_build_object('kind', new.kind, 'caption', new.caption, 'tag', new.tag,
    'review_status', new.review_status, 'sort_order', new.sort_order);
  if tg_op = 'INSERT' then
    insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('listing', new.id, new.vendor_id, 'portfolio.item_uploaded', null, after_data, auth.uid(), public.get_my_role());
    return new;
  end if;
  before_data := jsonb_build_object('kind', old.kind, 'caption', old.caption, 'tag', old.tag,
    'review_status', old.review_status, 'sort_order', old.sort_order);
  if before_data = after_data then return new; end if;
  insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('listing', new.id, new.vendor_id, 'portfolio.item_changed', before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_partner_work_lifecycle on public.partner_work;
create trigger trg_admin_audit_partner_work_lifecycle after insert or update of
  kind, caption, tag, review_status, sort_order
  on public.partner_work for each row execute function public.audit_partner_work_lifecycle();

create or replace function public.audit_partner_payout_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb;
begin
  after_data := jsonb_build_object('method', new.method, 'verified', new.verified_at is not null);
  if tg_op = 'INSERT' then
    insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('partner', new.vendor_id, new.vendor_id, 'partner.payout_profile_added', null, after_data, auth.uid(), public.get_my_role());
    return new;
  end if;
  before_data := jsonb_build_object('method', old.method, 'verified', old.verified_at is not null);
  if before_data = after_data then return new; end if;
  insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('partner', new.vendor_id, new.vendor_id, 'partner.payout_readiness_changed', before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_partner_payout_lifecycle on public.vendor_payout_details;
create trigger trg_admin_audit_partner_payout_lifecycle after insert or update of method, verified_at
  on public.vendor_payout_details for each row execute function public.audit_partner_payout_lifecycle();


-- Track partner-linked account profile changes by field name only, not raw PII.
create or replace function public.audit_partner_linked_profile_update()
returns trigger language plpgsql security definer set search_path = public
as $$
declare fields_changed text[] := array[]::text[]; partner_row record;
begin
  if old.full_name is distinct from new.full_name then fields_changed := array_append(fields_changed, 'full_name'); end if;
  if old.email is distinct from new.email then fields_changed := array_append(fields_changed, 'email'); end if;
  if old.phone is distinct from new.phone then fields_changed := array_append(fields_changed, 'phone'); end if;
  if old.city is distinct from new.city then fields_changed := array_append(fields_changed, 'city'); end if;
  if old.role is distinct from new.role then fields_changed := array_append(fields_changed, 'role'); end if;
  if cardinality(fields_changed) = 0 then return new; end if;
  for partner_row in select id from public.vendors where profile_id = new.id and is_synthetic = false loop
    insert into public.admin_lifecycle_audit
      (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('partner', partner_row.id, partner_row.id, 'partner.account_profile_changed',
      jsonb_build_object('changed_fields', fields_changed),
      jsonb_build_object('changed_fields', fields_changed),
      auth.uid(), public.get_my_role());
  end loop;
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_partner_linked_profile on public.profiles;
create trigger trg_admin_audit_partner_linked_profile
  after update of full_name, email, phone, city, role on public.profiles
  for each row execute function public.audit_partner_linked_profile_update();
