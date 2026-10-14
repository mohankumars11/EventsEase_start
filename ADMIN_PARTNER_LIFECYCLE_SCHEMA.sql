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
  entity_type text not null check (entity_type = any (array['partner'::text, 'listing'::text, 'partner_trade'::text, 'document'::text, 'pricing'::text])),
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


-- Job dispatch, settlements, referral and plan audits. This extension intentionally
-- retains only operational statuses, amounts and IDs; raw payout destinations stay out.
alter table public.admin_lifecycle_audit drop constraint if exists admin_lifecycle_audit_entity_type_check;
alter table public.admin_lifecycle_audit add constraint admin_lifecycle_audit_entity_type_check
  check (entity_type = any (array[
    'partner'::text, 'listing'::text, 'partner_trade'::text, 'document'::text, 'pricing'::text,
    'dispatch_offer'::text, 'booking_line'::text, 'payout_claim'::text, 'adjustment'::text,
    'subscription'::text, 'referral'::text, 'referral_invite'::text
  ]));

create or replace function public.audit_dispatch_offer_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb; changed_action text;
begin
  after_data := jsonb_build_object('line_id', new.line_id, 'status', new.status, 'wave', new.wave,
    'partner_amount_paise', new.partner_amount_paise, 'distance_m', new.distance_m,
    'offered_at', new.offered_at, 'expires_at', new.expires_at, 'responded_at', new.responded_at,
    'accepted_at', new.accepted_at, 'hidden_at', new.hidden_at, 'decline_reason', new.decline_reason);
  if tg_op = 'INSERT' then changed_action := 'dispatch.offer_created';
  else
    before_data := jsonb_build_object('line_id', old.line_id, 'status', old.status, 'wave', old.wave,
      'partner_amount_paise', old.partner_amount_paise, 'distance_m', old.distance_m,
      'offered_at', old.offered_at, 'expires_at', old.expires_at, 'responded_at', old.responded_at,
      'accepted_at', old.accepted_at, 'hidden_at', old.hidden_at, 'decline_reason', old.decline_reason);
    if before_data = after_data then return new; end if;
    changed_action := case when old.status is distinct from new.status then 'dispatch.offer_status_changed' else 'dispatch.offer_changed' end;
  end if;
  insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('dispatch_offer', new.id, new.vendor_id, changed_action, before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_dispatch_offer_lifecycle on public.dispatch_offers;
create trigger trg_admin_audit_dispatch_offer_lifecycle
  after insert or update of status, wave, partner_amount_paise, distance_m, expires_at, responded_at, accepted_at, hidden_at, decline_reason
  on public.dispatch_offers for each row execute function public.audit_dispatch_offer_lifecycle();

create or replace function public.audit_booking_line_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb; changed_action text; linked record;
begin
  after_data := jsonb_build_object('status', new.status, 'partner_amount_paise', new.partner_amount_paise,
    'accepted_offer_id', new.accepted_offer_id, 'dispatched_at', new.dispatched_at, 'accepted_at', new.accepted_at,
    'paid_at', new.paid_at, 'delivered_at', new.delivered_at, 'settled_at', new.settled_at,
    'cancelled_at', new.cancelled_at, 'cancellation_reason', new.cancellation_reason,
    'pricing_state', new.pricing_state, 'pricing_version', new.pricing_version);
  if tg_op = 'INSERT' then changed_action := 'booking_line.created';
  else
    before_data := jsonb_build_object('status', old.status, 'partner_amount_paise', old.partner_amount_paise,
      'accepted_offer_id', old.accepted_offer_id, 'dispatched_at', old.dispatched_at, 'accepted_at', old.accepted_at,
      'paid_at', old.paid_at, 'delivered_at', old.delivered_at, 'settled_at', old.settled_at,
      'cancelled_at', old.cancelled_at, 'cancellation_reason', old.cancellation_reason,
      'pricing_state', old.pricing_state, 'pricing_version', old.pricing_version);
    if before_data = after_data then return new; end if;
    changed_action := case when old.status is distinct from new.status then 'booking_line.status_changed'
      when old.settled_at is distinct from new.settled_at then 'booking_line.settlement_changed'
      when old.paid_at is distinct from new.paid_at then 'booking_line.payment_changed'
      else 'booking_line.lifecycle_changed' end;
  end if;
  for linked in select distinct vendor_id from public.dispatch_offers where line_id = new.id loop
    insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('booking_line', new.id, linked.vendor_id, changed_action, before_data, after_data, auth.uid(), public.get_my_role());
  end loop;
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_booking_line_lifecycle on public.booking_lines;
create trigger trg_admin_audit_booking_line_lifecycle
  after insert or update of status, partner_amount_paise, accepted_offer_id, dispatched_at, accepted_at, paid_at,
    delivered_at, settled_at, cancelled_at, cancellation_reason, pricing_state, pricing_version
  on public.booking_lines for each row execute function public.audit_booking_line_lifecycle();

create or replace function public.audit_payout_claim_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb; changed_action text;
begin
  after_data := jsonb_build_object('line_id', new.line_id, 'amount_paise', new.amount_paise, 'method', new.method,
    'status', new.status, 'requested_at', new.requested_at, 'settled_at', new.settled_at,
    'failed_at', new.failed_at, 'failure_code', new.failure_code, 'failure_reason', new.failure_reason,
    'attempt', new.attempt, 'batch_id', new.batch_id);
  if tg_op = 'INSERT' then changed_action := 'payout.claim_created';
  else
    before_data := jsonb_build_object('line_id', old.line_id, 'amount_paise', old.amount_paise, 'method', old.method,
      'status', old.status, 'requested_at', old.requested_at, 'settled_at', old.settled_at,
      'failed_at', old.failed_at, 'failure_code', old.failure_code, 'failure_reason', old.failure_reason,
      'attempt', old.attempt, 'batch_id', old.batch_id);
    if before_data = after_data then return new; end if;
    changed_action := case when old.status is distinct from new.status then 'payout.claim_status_changed' else 'payout.claim_changed' end;
  end if;
  insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('payout_claim', new.id, new.vendor_id, changed_action, before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_payout_claim_lifecycle on public.payout_claims;
create trigger trg_admin_audit_payout_claim_lifecycle
  after insert or update of amount_paise, method, status, settled_at, failed_at, failure_code, failure_reason, attempt, batch_id
  on public.payout_claims for each row execute function public.audit_payout_claim_lifecycle();

create or replace function public.audit_partner_adjustment_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb; changed_action text;
begin
  after_data := jsonb_build_object('line_id', new.line_id, 'kind', new.kind, 'amount_paise', new.amount_paise,
    'reason', new.reason, 'effective_on', new.effective_on, 'settled_claim_id', new.settled_claim_id);
  if tg_op = 'INSERT' then changed_action := 'partner.adjustment_created';
  else
    before_data := jsonb_build_object('line_id', old.line_id, 'kind', old.kind, 'amount_paise', old.amount_paise,
      'reason', old.reason, 'effective_on', old.effective_on, 'settled_claim_id', old.settled_claim_id);
    if before_data = after_data then return new; end if;
    changed_action := 'partner.adjustment_changed';
  end if;
  insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('adjustment', new.id, new.vendor_id, changed_action, before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_partner_adjustment_lifecycle on public.partner_adjustments;
create trigger trg_admin_audit_partner_adjustment_lifecycle
  after insert or update of kind, amount_paise, reason, effective_on, settled_claim_id
  on public.partner_adjustments for each row execute function public.audit_partner_adjustment_lifecycle();

create or replace function public.audit_vendor_subscription_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb; changed_action text;
begin
  after_data := jsonb_build_object('tier', new.tier, 'status', new.status, 'started_at', new.started_at, 'expires_at', new.expires_at);
  if tg_op = 'INSERT' then changed_action := 'partner.subscription_created';
  else
    before_data := jsonb_build_object('tier', old.tier, 'status', old.status, 'started_at', old.started_at, 'expires_at', old.expires_at);
    if before_data = after_data then return new; end if;
    changed_action := 'partner.subscription_changed';
  end if;
  insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('subscription', new.id, new.vendor_id, changed_action, before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_vendor_subscription_lifecycle on public.vendor_subscriptions;
create trigger trg_admin_audit_vendor_subscription_lifecycle
  after insert or update of tier, status, started_at, expires_at
  on public.vendor_subscriptions for each row execute function public.audit_vendor_subscription_lifecycle();

create or replace function public.audit_partner_referral_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb; changed_action text; linked record;
begin
  after_data := jsonb_build_object('referrer_id', new.referrer_id, 'referred_id', new.referred_id,
    'state', new.state, 'reward_status', new.reward_status, 'claimed_at', new.claimed_at,
    'onboarding_completed_at', new.onboarding_completed_at, 'verified_at', new.verified_at,
    'live_at', new.live_at, 'first_event_at', new.first_event_at, 'qualified_at', new.qualified_at, 'paid_at', new.paid_at);
  if tg_op = 'INSERT' then changed_action := 'partner.referral_created';
  else
    before_data := jsonb_build_object('referrer_id', old.referrer_id, 'referred_id', old.referred_id,
      'state', old.state, 'reward_status', old.reward_status, 'claimed_at', old.claimed_at,
      'onboarding_completed_at', old.onboarding_completed_at, 'verified_at', old.verified_at,
      'live_at', old.live_at, 'first_event_at', old.first_event_at, 'qualified_at', old.qualified_at, 'paid_at', old.paid_at);
    if before_data = after_data then return new; end if;
    changed_action := case when old.state is distinct from new.state then 'partner.referral_state_changed' else 'partner.referral_milestone_changed' end;
  end if;
  for linked in select distinct unnest(array[new.referrer_id, new.referred_id]) as vendor_id where unnest is not null loop
    insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
    values ('referral', new.id, linked.vendor_id, changed_action, before_data, after_data, auth.uid(), public.get_my_role());
  end loop;
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_partner_referral_lifecycle on public.partner_referrals;
create trigger trg_admin_audit_partner_referral_lifecycle
  after insert or update of state, reward_status, claimed_at, onboarding_completed_at, verified_at, live_at,
    first_event_at, qualified_at, paid_at on public.partner_referrals
  for each row execute function public.audit_partner_referral_lifecycle();

create or replace function public.audit_partner_referral_invite_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb; changed_action text;
begin
  after_data := jsonb_build_object('trade_id', new.trade_id, 'campaign_id', new.campaign_id,
    'created_at', new.created_at, 'expires_at', new.expires_at, 'claimed_at', new.claimed_at, 'claimed_by', new.claimed_by);
  if tg_op = 'INSERT' then changed_action := 'partner.referral_invite_created';
  else
    before_data := jsonb_build_object('trade_id', old.trade_id, 'campaign_id', old.campaign_id,
      'created_at', old.created_at, 'expires_at', old.expires_at, 'claimed_at', old.claimed_at, 'claimed_by', old.claimed_by);
    if before_data = after_data then return new; end if;
    changed_action := 'partner.referral_invite_changed';
  end if;
  insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('referral_invite', new.id, new.referrer_id, changed_action, before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_partner_referral_invite_lifecycle on public.partner_referral_invites;
create trigger trg_admin_audit_partner_referral_invite_lifecycle
  after insert or update of expires_at, claimed_at, claimed_by
  on public.partner_referral_invites for each row execute function public.audit_partner_referral_invite_lifecycle();

create or replace function public.audit_partner_payout_account_lifecycle()
returns trigger language plpgsql security definer set search_path = public
as $$
declare before_data jsonb; after_data jsonb; changed_action text;
begin
  after_data := jsonb_build_object('kyc_status', new.kyc_status, 'kyc_verified', new.kyc_verified_at is not null,
    'bank_name', new.bank_name, 'account_last4', new.account_last4, 'ifsc', new.ifsc,
    'route_status', new.route_status, 'route_product_id', new.route_product_id,
    'route_stakeholder_id', new.route_stakeholder_id, 'route_updated_at', new.route_updated_at);
  if tg_op = 'INSERT' then changed_action := 'partner.payout_route_created';
  else
    before_data := jsonb_build_object('kyc_status', old.kyc_status, 'kyc_verified', old.kyc_verified_at is not null,
      'bank_name', old.bank_name, 'account_last4', old.account_last4, 'ifsc', old.ifsc,
      'route_status', old.route_status, 'route_product_id', old.route_product_id,
      'route_stakeholder_id', old.route_stakeholder_id, 'route_updated_at', old.route_updated_at);
    if before_data = after_data then return new; end if;
    changed_action := 'partner.payout_route_changed';
  end if;
  insert into public.admin_lifecycle_audit (entity_type, entity_id, vendor_id, action, before_state, after_state, actor_id, actor_role)
  values ('partner', new.vendor_id, new.vendor_id, changed_action, before_data, after_data, auth.uid(), public.get_my_role());
  return new;
end;
$$;
drop trigger if exists trg_admin_audit_partner_payout_account_lifecycle on public.partner_payout_accounts;
create trigger trg_admin_audit_partner_payout_account_lifecycle
  after insert or update of kyc_status, kyc_verified_at, bank_name, account_last4, ifsc, route_status,
    route_product_id, route_stakeholder_id, route_updated_at
  on public.partner_payout_accounts for each row execute function public.audit_partner_payout_account_lifecycle();
