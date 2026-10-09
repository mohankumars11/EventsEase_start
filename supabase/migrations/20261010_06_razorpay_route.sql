-- Razorpay Route: partner linked accounts and on-hold transfers.
--
-- 1. guard_kyc_self_verify (065) reset route_account_id on EVERY update by
--    anyone who is not admin/coordinator — including the server's service
--    role, which has no profile. So the API could never store the Route id
--    it was given. Operators (caller_is_operator: admin, coordinator,
--    service role) now pass; partners still cannot set it themselves.
-- 2. Route state on partner_payout_accounts.
-- 3. sambramo_route_transfers: one row per transfer Razorpay creates from a
--    captured payment, held until the job is delivered, then released.
-- 4. A line paid out by Route can never also be claimed through the manual
--    payout path (claim_payment / batches): payout_claims refuses it.

begin;

create or replace function public.guard_kyc_self_verify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if get_my_role() in ('admin','event_coordinator') or public.caller_is_operator() then
    return new;
  end if;
  if new.kyc_status in ('verified','rejected') and new.kyc_status is distinct from old.kyc_status then
    raise exception 'kyc_status % is set by review, not by the partner', new.kyc_status;
  end if;
  new.route_account_id := old.route_account_id;
  new.route_status := old.route_status;
  return new;
end;
$$;

alter table public.partner_payout_accounts
  add column if not exists route_status text
    check (route_status is null or route_status in ('created','under_review','needs_clarification','activated','suspended','rejected')),
  add column if not exists route_product_id text,
  add column if not exists route_stakeholder_id text,
  add column if not exists route_requirements jsonb,
  add column if not exists route_updated_at timestamptz;

create table if not exists public.sambramo_route_transfers (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.booking_lines(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  payment_id text not null,
  route_account_id text not null,
  transfer_id text unique,
  amount_paise bigint not null check (amount_paise > 0),
  status text not null default 'pending'
    check (status in ('pending','on_hold','released','processed','reversed','failed')),
  error text,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (payment_id, line_id)
);
create index if not exists sambramo_route_transfers_line_idx on public.sambramo_route_transfers (line_id, status);
alter table public.sambramo_route_transfers enable row level security;
drop policy if exists route_transfers_partner on public.sambramo_route_transfers;
create policy route_transfers_partner on public.sambramo_route_transfers for select to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.profile_id = (select auth.uid()))
         or public.get_my_role() = 'admin');

create or replace function public.refuse_claim_for_route_line()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.sambramo_route_transfers t
              where t.line_id = new.line_id and t.status <> 'failed') then
    raise exception 'This job is paid out automatically by Razorpay.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_refuse_claim_for_route_line on public.payout_claims;
create trigger trg_refuse_claim_for_route_line
before insert on public.payout_claims
for each row execute function public.refuse_claim_for_route_line();

commit;
