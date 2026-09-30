-- 164_sambramo_custom_quote_lane.sql
-- Adds the customer/partner custom quote lane without changing instant-book economics.
begin;

alter table public.booking_lines
  add column if not exists pricing_state text not null default 'INSTANT_BOOK',
  add column if not exists pricing_version text,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (select 1 from pg_constraint where conrelid='public.booking_lines'::regclass and conname='booking_lines_pricing_state_check') then
    alter table public.booking_lines drop constraint booking_lines_pricing_state_check;
  end if;
  alter table public.booking_lines add constraint booking_lines_pricing_state_check
    check (pricing_state = any(array[
      'INSTANT_BOOK','INSTANT_QUOTE','PROVISIONAL_QUOTE',
      'VENDOR_QUOTE','QUOTE_ACTION_REQUIRED','UNAVAILABLE'
    ]));
end $$;

alter table public.sambramo_quote_requests
  add column if not exists booking_request_id uuid references public.booking_requests(id) on delete cascade,
  add column if not exists quote_group_id uuid,
  add column if not exists service_name text,
  add column if not exists reference_photo_url text;

do $$
begin
  if exists (select 1 from pg_constraint where conrelid='public.sambramo_quote_requests'::regclass and conname='sambramo_quote_requests_state_check') then
    alter table public.sambramo_quote_requests drop constraint sambramo_quote_requests_state_check;
  end if;
  alter table public.sambramo_quote_requests add constraint sambramo_quote_requests_state_check
    check (state = any(array[
      'INSTANT_BOOK','INSTANT_QUOTE','PROVISIONAL_QUOTE',
      'VENDOR_QUOTE','QUOTE_ACTION_REQUIRED','UNAVAILABLE'
    ]));
end $$;

create table if not exists public.sambramo_quote_responses (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.sambramo_quote_requests(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  partner_amount_paise bigint not null check (partner_amount_paise > 0),
  partner_components jsonb not null default '{}'::jsonb,
  inclusions jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  quote_valid_until timestamptz,
  notes text,
  customer_amount_paise bigint not null check (customer_amount_paise > 0),
  platform_fee_rate numeric not null default 0.15,
  platform_fee_paise bigint not null check (platform_fee_paise >= 0),
  pricing_version text not null default 'sambramo-custom-quote-v1',
  status text not null default 'SUBMITTED'
    check (status = any(array['SUBMITTED','ACCEPTED','WITHDRAWN','EXPIRED','DECLINED'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_request_id, vendor_id)
);

alter table public.sambramo_quote_responses enable row level security;

drop policy if exists "customer reads own quote responses" on public.sambramo_quote_responses;
create policy "customer reads own quote responses"
on public.sambramo_quote_responses for select to authenticated
using (exists (
  select 1 from public.sambramo_quote_requests qr
  where qr.id = quote_request_id and qr.customer_id = (select auth.uid())
));

drop policy if exists "partner reads own submitted quote responses" on public.sambramo_quote_responses;
create policy "partner reads own submitted quote responses"
on public.sambramo_quote_responses for select to authenticated
using (vendor_id in (
  select v.id from public.vendors v where v.profile_id = (select auth.uid())
));

create index if not exists sambramo_quote_requests_group_idx
  on public.sambramo_quote_requests(quote_group_id);
create index if not exists sambramo_quote_requests_booking_request_idx
  on public.sambramo_quote_requests(booking_request_id);
create index if not exists sambramo_quote_requests_vendor_state_idx
  on public.sambramo_quote_requests(vendor_id, state, expires_at);
create index if not exists sambramo_quote_responses_request_status_idx
  on public.sambramo_quote_responses(quote_request_id, status, created_at);

create or replace function public.touch_sambramo_quote_response()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_sambramo_quote_response on public.sambramo_quote_responses;
create trigger trg_touch_sambramo_quote_response
before update on public.sambramo_quote_responses
for each row execute function public.touch_sambramo_quote_response();

commit;
