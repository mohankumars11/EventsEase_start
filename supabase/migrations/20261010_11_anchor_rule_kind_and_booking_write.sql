-- Two faults the live all-trades booking test found on 2026-10-10.
--
-- 1. Anchor & MC submissions FAIL since 20261010_07: that migration made
--    sambramo_rate_rules.rule_kind NOT NULL, and submit_anchor_listing_version
--    (20261010_03) still writes only `model`. Instead of touching Anchor's RPC,
--    a BEFORE INSERT trigger fills rule_kind from model — every Anchor rule is
--    one of the six time kinds, which are also rule kinds.
--
-- 2. Every INSTANT booking on the new route FAILED at the write:
--    book_partner_line declared a loop variable `x` and also aliased
--    jsonb_array_elements(...) AS x in its INSERT … SELECT, so Postgres raised
--    "column reference x is ambiguous". The variable is now `rv`.
--
-- Re-runnable. Paste after 20261010_10.

begin;

create or replace function public.sambramo_rate_rule_kind_from_model()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.rule_kind is null then new.rule_kind := new.model; end if;
  return new;
end;
$$;
drop trigger if exists trg_rate_rule_kind_from_model on public.sambramo_rate_rules;
create trigger trg_rate_rule_kind_from_model
before insert or update on public.sambramo_rate_rules
for each row execute function public.sambramo_rate_rule_kind_from_model();

-- ═══ Atomic booking write, now with reservations ══════════════════════
-- Same signature and behaviour as 20261010_05 for lines without
-- reservations. With p_line.reservations, every resource is locked and
-- re-checked inside the vendor lock; the day-count capacity is skipped
-- because the resources ARE the capacity.
create or replace function public.book_partner_line(
  p_line jsonb,
  p_vendor_id uuid,
  p_partner_paise bigint,
  p_spec_mode text default 'standard'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid := (p_line->>'request_id')::uuid;
  v_date date; v_avail record; v_found boolean; v_booked integer; v_cap integer;
  v_line_id uuid; v_offer_id uuid;
  v_res jsonb := coalesce(p_line->'reservations', '[]'::jsonb);
  rv jsonb; v_free numeric;
begin
  if p_spec_mode not in ('standard','discuss','quote') then raise exception 'Bad spec mode.'; end if;
  select r.event_date into v_date from booking_requests r where r.id = v_request_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_request'); end if;

  perform 1 from vendors where id = p_vendor_id for update;
  select * into v_avail from vendor_availability where vendor_id = p_vendor_id and slot_date = v_date;
  v_found := found;
  if v_found and v_avail.status = 'BLOCKED' then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  if not v_found and not public.weekday_is_open(p_vendor_id, v_date) then return jsonb_build_object('ok', false, 'reason', 'weekday_closed'); end if;

  if jsonb_array_length(v_res) = 0 then
    select count(*) into v_booked from dispatch_offers o
      join booking_lines l on l.id = o.line_id join booking_requests r on r.id = l.request_id
     where o.vendor_id = p_vendor_id and o.status = 'ACCEPTED' and r.event_date = v_date and l.status not in ('cancelled','expired');
    select coalesce(case when v_found then v_avail.slots_total end, v.max_events_per_day, 1) into v_cap from vendors v where v.id = p_vendor_id;
    if v_booked >= v_cap then return jsonb_build_object('ok', false, 'reason', 'day_full'); end if;
  else
    for rv in select * from jsonb_array_elements(v_res) loop
      perform 1 from sambramo_resources where id = (rv->>'resource_id')::uuid and vendor_id = p_vendor_id for update;
      if not found then return jsonb_build_object('ok', false, 'reason', 'resource_missing'); end if;
      v_free := public.sambramo_resource_free((rv->>'resource_id')::uuid, (rv->>'start_at')::timestamptz, (rv->>'end_at')::timestamptz);
      if coalesce(v_free, 0) < (rv->>'qty')::numeric then
        return jsonb_build_object('ok', false, 'reason', 'resource_full', 'resource_id', rv->>'resource_id');
      end if;
    end loop;
  end if;

  insert into booking_lines (
    request_id, service_id, service_name, trade, spec_mode, customer_note,
    quoted_amount_paise, platform_fee_rate, platform_fee_paise, partner_amount_paise,
    price_basis, pricing_state, pricing_version, pricing_snapshot, status, policy_version
  ) values (
    v_request_id, p_line->>'service_id', p_line->>'service_name', p_line->>'trade', p_spec_mode, p_line->>'customer_note',
    (p_line->>'quoted_amount_paise')::bigint, (p_line->>'platform_fee_rate')::numeric,
    (p_line->>'platform_fee_paise')::bigint, (p_line->>'partner_amount_paise')::bigint,
    coalesce(p_line->'price_basis', '{}'::jsonb), p_line->>'pricing_state', p_line->>'pricing_version',
    coalesce(p_line->'pricing_snapshot', '{}'::jsonb), 'pending', p_line->>'policy_version'
  ) returning id into v_line_id;

  insert into dispatch_offers (line_id, vendor_id, wave, partner_amount_paise, status, offered_at, expires_at, responded_at, accepted_at)
  values (v_line_id, p_vendor_id, 1, p_partner_paise, 'ACCEPTED', now(), now() + interval '1 hour', now(), now())
  returning id into v_offer_id;

  insert into sambramo_resource_reservations (resource_id, vendor_id, booking_line_id, start_at, end_at, qty, status)
  select (x->>'resource_id')::uuid, p_vendor_id, v_line_id, (x->>'start_at')::timestamptz, (x->>'end_at')::timestamptz,
         (x->>'qty')::numeric, 'confirmed'
    from jsonb_array_elements(v_res) x;

  update booking_lines set status = 'accepted', accepted_offer_id = v_offer_id, accepted_at = now() where id = v_line_id;
  return jsonb_build_object('ok', true, 'line_id', v_line_id, 'offer_id', v_offer_id);
end;
$$;
revoke all on function public.book_partner_line(jsonb, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.book_partner_line(jsonb, uuid, bigint, text) to service_role;

commit;
