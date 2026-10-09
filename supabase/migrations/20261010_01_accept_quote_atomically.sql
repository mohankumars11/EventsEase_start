-- Accepting a custom quote, made safe.
--
-- api/accept-custom-quote.js did three separate writes from Node:
--   1. INSERT booking_lines (status 'accepted', spec_mode 'quote')
--   2. INSERT dispatch_offers (status 'ACCEPTED')
--   3. UPDATE booking_lines SET accepted_offer_id
-- and it failed or misbehaved in three ways:
--   * spec_mode 'quote' is not allowed by the 059 CHECK ('standard','discuss'),
--     so step 1 always failed.
--   * nothing took the partner row lock accept_offer (133) takes, so a quote
--     acceptance and an instant accept could both land on a full day.
--   * a failure between steps relied on best-effort deletes from Node.
--
-- This function does all of it in one transaction under the same lock and
-- the same calendar checks as accept_offer. Any failure leaves no rows.

begin;

-- 1 · allow 'quote' as a spec mode
do $$
declare c text;
begin
  for c in
    select con.conname from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
     where rel.relname = 'booking_lines' and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%spec_mode%'
  loop
    execute format('alter table public.booking_lines drop constraint %I', c);
  end loop;
end $$;

alter table public.booking_lines
  add constraint booking_lines_spec_mode_check
  check (spec_mode in ('standard', 'discuss', 'quote'));

-- 2 · the atomic accept (service role only; the API route has already
--     authenticated the customer and claimed the quote request)
create or replace function public.book_accepted_quote(
  p_line jsonb,              -- booking_lines columns for the new line
  p_vendor_id uuid,
  p_partner_paise bigint,
  p_offer_expires_at timestamptz,
  p_distance_m integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid := (p_line->>'request_id')::uuid;
  v_date date;
  v_avail record;
  v_found boolean;
  v_booked integer;
  v_cap integer;
  v_line_id uuid;
  v_offer_id uuid;
begin
  select r.event_date into v_date from booking_requests r where r.id = v_request_id;
  if v_request_id is null or not found then
    return jsonb_build_object('ok', false, 'reason', 'no_request');
  end if;

  if v_date is not null then
    -- Same serialisation as accept_offer: one accept per partner at a time.
    perform 1 from vendors where id = p_vendor_id for update;

    select * into v_avail from vendor_availability
     where vendor_id = p_vendor_id and slot_date = v_date;
    v_found := found;

    if v_found and v_avail.status = 'BLOCKED' then
      return jsonb_build_object('ok', false, 'reason', 'blocked', 'event_date', v_date);
    end if;
    if not v_found and not public.weekday_is_open(p_vendor_id, v_date) then
      return jsonb_build_object('ok', false, 'reason', 'weekday_closed', 'event_date', v_date);
    end if;

    select count(*) into v_booked
      from dispatch_offers o
      join booking_lines l    on l.id = o.line_id
      join booking_requests r on r.id = l.request_id
     where o.vendor_id = p_vendor_id
       and o.status = 'ACCEPTED'
       and r.event_date = v_date
       and l.status not in ('cancelled', 'expired');

    select coalesce(case when v_found then v_avail.slots_total end, v.max_events_per_day, 1)
      into v_cap from vendors v where v.id = p_vendor_id;

    if v_booked >= v_cap then
      return jsonb_build_object('ok', false, 'reason', 'day_full', 'event_date', v_date,
        'booked', v_booked, 'capacity', v_cap);
    end if;
  end if;

  insert into booking_lines (
    request_id, service_id, service_name, trade, spec_mode, customer_note, reference_photo_url,
    quoted_amount_paise, platform_fee_rate, platform_fee_paise, partner_amount_paise,
    price_basis, pricing_state, pricing_version, pricing_snapshot, status, policy_version
  ) values (
    v_request_id,
    p_line->>'service_id', p_line->>'service_name', p_line->>'trade', 'quote',
    p_line->>'customer_note', p_line->>'reference_photo_url',
    (p_line->>'quoted_amount_paise')::bigint, (p_line->>'platform_fee_rate')::numeric,
    (p_line->>'platform_fee_paise')::bigint, (p_line->>'partner_amount_paise')::bigint,
    coalesce(p_line->'price_basis', '{}'::jsonb), p_line->>'pricing_state', p_line->>'pricing_version',
    coalesce(p_line->'pricing_snapshot', '{}'::jsonb), 'pending', p_line->>'policy_version'
  ) returning id into v_line_id;

  insert into dispatch_offers (
    line_id, vendor_id, wave, distance_m, partner_amount_paise, status,
    offered_at, expires_at, responded_at, accepted_at
  ) values (
    v_line_id, p_vendor_id, 1, p_distance_m, p_partner_paise, 'ACCEPTED',
    now(), p_offer_expires_at, now(), now()
  ) returning id into v_offer_id;

  update booking_lines
     set status = 'accepted', accepted_offer_id = v_offer_id, accepted_at = now()
   where id = v_line_id;

  return jsonb_build_object('ok', true, 'line_id', v_line_id, 'offer_id', v_offer_id);
end;
$$;

revoke all on function public.book_accepted_quote(jsonb, uuid, bigint, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.book_accepted_quote(jsonb, uuid, bigint, timestamptz, integer) to service_role;

commit;
