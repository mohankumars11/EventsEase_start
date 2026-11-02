-- Close NULL-role authorization bypasses in SECURITY DEFINER RPCs.
-- get_my_role() returns NULL for anonymous/no-profile sessions; PL/pgSQL IF
-- treats a NULL condition as not true. These guards now fail closed.
-- Anonymous execution is revoked; authenticated app users and service_role remain supported.

begin;

CREATE OR REPLACE FUNCTION public.anchor_readiness(p_vendor_service_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s public.vendor_services%rowtype;
  vd public.vendors%rowtype;
  lv public.sambramo_listing_versions%rowtype;
  pending public.sambramo_listing_versions%rowtype;
  items jsonb := '[]'::jsonb;
  ok_profile boolean; ok_cap boolean; ok_loc boolean; ok_pricing boolean;
  ok_cal boolean; ok_rules boolean; ok_payout boolean; pricing_pending boolean;
  v_state text;
begin
  select * into s from public.vendor_services where id = p_vendor_service_id;
  if not found then raise exception 'Service not found.'; end if;
  select * into vd from public.vendors where id = s.vendor_id;
  if vd.profile_id is distinct from auth.uid()
     and not coalesce(public.get_my_role() = 'admin', false)
     and not coalesce(auth.role() = 'service_role', false) then
    raise exception 'Not your listing.';
  end if;

  select * into lv from public.sambramo_listing_versions
   where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is null limit 1;
  select * into pending from public.sambramo_listing_versions
   where vendor_service_id = s.id and status in ('UNDER_REVIEW','ACTION_REQUIRED','DRAFT')
   order by version desc limit 1;

  ok_profile := coalesce(vd.is_verified, false)
    and coalesce(nullif(trim(coalesce(lv.profile, pending.profile)->>'stage_name'), ''), '') <> '';
  ok_cap := jsonb_array_length(coalesce(coalesce(lv.profile, pending.profile)->'events', '[]'::jsonb)) > 0
    and jsonb_array_length(coalesce(coalesce(lv.profile, pending.profile)->'languages', '[]'::jsonb)) > 0;
  ok_loc := vd.location is not null and vd.location_confirmed_at is not null;
  ok_pricing := lv.id is not null and exists (
    select 1 from public.sambramo_trade_packages p where p.listing_version_id = lv.id and p.status = 'LIVE');
  pricing_pending := not ok_pricing and pending.status = 'UNDER_REVIEW';
  ok_cal := exists (select 1 from public.vendor_weekly_rules r where r.vendor_id = vd.id and r.is_available)
         or exists (select 1 from public.vendor_availability a where a.vendor_id = vd.id
                     and a.slot_date >= current_date and a.status in ('OPEN','LIMITED'));
  ok_rules := coalesce(lv.booking_rules, pending.booking_rules) ?& array['advance_pct','cancellation','min_notice_days'];
  ok_payout := exists (select 1 from public.partner_payout_accounts pa
                        where pa.vendor_id = vd.id and pa.route_status = 'activated');

  items := jsonb_build_array(
    jsonb_build_object('id','profile','label','Profile & identity','status', case when ok_profile then 'pass' else 'fail' end,
      'next','Finish your public profile and identity verification.'),
    jsonb_build_object('id','capability','label','Services, languages & capacity','status', case when ok_cap then 'pass' else 'fail' end,
      'next','Choose at least one event type and one language.'),
    jsonb_build_object('id','location','label','Location confirmed','status', case when ok_loc then 'pass' else 'fail' end,
      'next','Confirm your base location on the map.'),
    jsonb_build_object('id','pricing','label','Pricing approved','status',
      case when ok_pricing then 'pass' when pricing_pending then 'pending' else 'fail' end,
      'next', case when pricing_pending then 'Our team is reviewing your packages.' else 'Set your prices and submit them for review.' end),
    jsonb_build_object('id','availability','label','Calendar & booking windows','status', case when ok_cal then 'pass' else 'fail' end,
      'next','Open some dates or set your usual week in Calendar.'),
    jsonb_build_object('id','rules','label','Booking & cancellation rules','status', case when ok_rules then 'pass' else 'fail' end,
      'next','Choose your advance, cancellation policy and minimum notice.'),
    jsonb_build_object('id','payout','label','Razorpay payout account','status', case when ok_payout then 'pass' else 'fail' end,
      'next','Complete your payout setup so Razorpay can pay you.')
  );

  v_state := case
    when not ok_profile then 'PROFILE_INCOMPLETE'
    when not ok_pricing and pricing_pending then 'PRICING_UNDER_REVIEW'
    when not ok_pricing then 'PRICING_INCOMPLETE'
    when not ok_cal then 'AVAILABILITY_INCOMPLETE'
    when not ok_payout then 'PAYOUT_SETUP_PENDING'
    when not (ok_cap and ok_loc and ok_rules) then 'ACTION_REQUIRED'
    when coalesce(lv.booking_rules->>'instant', 'true') = 'false' then 'READY_FOR_CUSTOM_QUOTES'
    else 'READY_FOR_INSTANT_BOOKING'
  end;

  return jsonb_build_object(
    'state', v_state,
    'items', items,
    'quotes_ok', ok_profile and ok_pricing,
    'live_version', lv.version,
    'published_at', lv.published_at,
    'price_locked_until', lv.price_locked_until
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.listing_readiness(p_vendor_service_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s public.vendor_services%rowtype;
  vd public.vendors%rowtype;
  reg public.sambramo_trade_registry%rowtype;
  lv public.sambramo_listing_versions%rowtype;
  pending public.sambramo_listing_versions%rowtype;
  ans jsonb;
  c jsonb;
  missing_docs text[] := '{}';
  pending_docs text[] := '{}';
  k text; v_missing_answers integer := 0;
  ok_profile boolean; ok_answers boolean; ok_loc boolean; ok_pricing boolean; pricing_pending boolean;
  ok_resources boolean; ok_cal boolean; ok_rules boolean; ok_payout boolean; ok_docs boolean;
  items jsonb; v_state text;
begin
  select * into s from public.vendor_services where id = p_vendor_service_id;
  if not found then raise exception 'Service not found.'; end if;
  select * into vd from public.vendors where id = s.vendor_id;
  if vd.profile_id is distinct from auth.uid()
     and not coalesce(public.get_my_role() = 'admin', false)
     and not coalesce(auth.role() = 'service_role', false) then
    raise exception 'Not your listing.';
  end if;
  select * into reg from public.sambramo_trade_registry where id = public.sambramo_trade_id(s.category);
  if not found then
    return jsonb_build_object('state', 'NOT_ON_ENGINE', 'items', '[]'::jsonb, 'quotes_ok', false);
  end if;

  select * into lv from public.sambramo_listing_versions
   where vendor_service_id = s.id and status = 'LIVE' and seasonal_window_id is null limit 1;
  select * into pending from public.sambramo_listing_versions
   where vendor_service_id = s.id and status in ('UNDER_REVIEW','ACTION_REQUIRED','DRAFT')
   order by version desc limit 1;
  ans := coalesce(lv.answers, pending.answers, '{}'::jsonb);

  -- Never onboarded on the new engine: a legacy listing must re-list.
  if lv.id is null and pending.id is null then
    return jsonb_build_object('state', 'RELIST_REQUIRED', 'trade_id', reg.id, 'quotes_ok', false,
      'items', jsonb_build_array(jsonb_build_object('id','relist','label','Re-list with the new flow','status','fail',
        'next','Your old setup cannot be booked any more. Set it up again — it takes a few minutes.')));
  end if;

  foreach k in array reg.required_answers loop
    if coalesce(ans->k, 'null'::jsonb) in ('null'::jsonb, '""'::jsonb, '[]'::jsonb) then v_missing_answers := v_missing_answers + 1; end if;
  end loop;

  for c in select * from jsonb_array_elements(reg.compliance) loop
    if coalesce((c->>'blocks_instant')::boolean, false)
       and (coalesce((c->>'always')::boolean, false) or public.sambramo_cond_holds(c->'when', ans)) then
      if not exists (select 1 from public.vendor_documents d where d.vendor_id = vd.id and d.requirement_id = c->>'doc') then
        missing_docs := missing_docs || (c->>'doc');
      elsif not exists (select 1 from public.vendor_documents d where d.vendor_id = vd.id and d.requirement_id = c->>'doc' and d.status = 'accepted') then
        pending_docs := pending_docs || (c->>'doc');
      end if;
    end if;
  end loop;

  ok_profile := coalesce(vd.is_verified, false);
  ok_answers := v_missing_answers = 0;
  ok_loc := vd.location is not null and vd.location_confirmed_at is not null;
  ok_pricing := lv.id is not null;
  pricing_pending := not ok_pricing and pending.status = 'UNDER_REVIEW';
  ok_resources := reg.archetype in ('TIME_PERFORMER','PROJECT_QUOTE')
               or exists (select 1 from public.sambramo_resources r where r.vendor_service_id = s.id and r.active);
  ok_cal := exists (select 1 from public.vendor_weekly_rules r where r.vendor_id = vd.id and r.is_available)
         or exists (select 1 from public.vendor_availability a where a.vendor_id = vd.id
                     and a.slot_date >= current_date and a.status in ('OPEN','LIMITED'));
  ok_rules := coalesce(lv.booking_rules, pending.booking_rules) ?& array['advance_pct','cancellation','min_notice_days'];
  ok_payout := exists (select 1 from public.partner_payout_accounts pa where pa.vendor_id = vd.id and pa.route_status = 'activated');
  ok_docs := cardinality(missing_docs) = 0 and cardinality(pending_docs) = 0;

  items := jsonb_build_array(
    jsonb_build_object('id','profile','label','Identity verified','status', case when ok_profile then 'pass' else 'fail' end,
      'next','Finish identity verification.'),
    jsonb_build_object('id','capability','label','Service details','status', case when ok_answers then 'pass' else 'fail' end,
      'next','Answer the remaining questions about your service.'),
    jsonb_build_object('id','location','label','Location confirmed','status', case when ok_loc then 'pass' else 'fail' end,
      'next','Confirm your base location on the map.'),
    jsonb_build_object('id','pricing','label','Pricing approved','status',
      case when ok_pricing then 'pass' when pricing_pending then 'pending' else 'fail' end,
      'next', case when pricing_pending then 'Our team is reviewing your listing.' else 'Set your prices and submit them for review.' end),
    jsonb_build_object('id','resources','label','Staff, stock or capacity','status', case when ok_resources then 'pass' else 'fail' end,
      'next','Tell us what you can supply at once, so nothing is double-booked.'),
    jsonb_build_object('id','compliance','label','Licences & documents','status',
      case when ok_docs then 'pass' when cardinality(missing_docs) = 0 then 'pending' else 'fail' end,
      'next', case when cardinality(missing_docs) > 0 then 'Upload the documents this service needs.' else 'We are checking your documents.' end,
      'missing', to_jsonb(missing_docs), 'pending', to_jsonb(pending_docs)),
    jsonb_build_object('id','availability','label','Calendar & booking windows','status', case when ok_cal then 'pass' else 'fail' end,
      'next','Open some dates or set your usual week in Calendar.'),
    jsonb_build_object('id','rules','label','Booking & cancellation rules','status', case when ok_rules then 'pass' else 'fail' end,
      'next','Choose your advance, cancellation policy and minimum notice.'),
    jsonb_build_object('id','payout','label','Razorpay payout account','status', case when ok_payout then 'pass' else 'fail' end,
      'next','Complete your payout setup so Razorpay can pay you.')
  );

  v_state := case
    when not ok_profile then 'PROFILE_INCOMPLETE'
    when not ok_answers then 'ACTION_REQUIRED'
    when not ok_pricing and pricing_pending then 'PRICING_UNDER_REVIEW'
    when not ok_pricing then 'PRICING_INCOMPLETE'
    when not ok_resources then 'AVAILABILITY_INCOMPLETE'
    when not ok_cal then 'AVAILABILITY_INCOMPLETE'
    when not ok_docs then 'VERIFICATION_PENDING'
    when not ok_payout then 'PAYOUT_SETUP_PENDING'
    when not (ok_loc and ok_rules) then 'ACTION_REQUIRED'
    when coalesce(lv.booking_rules->>'instant', 'true') = 'false' then 'READY_FOR_CUSTOM_QUOTES'
    else 'READY_FOR_INSTANT_BOOKING'
  end;

  return jsonb_build_object(
    'state', v_state, 'trade_id', reg.id, 'items', items,
    'quotes_ok', ok_profile and ok_pricing,
    'live_version', lv.version, 'published_at', lv.published_at, 'price_locked_until', lv.price_locked_until);
end;
$function$;
CREATE OR REPLACE FUNCTION public.review_sambramo_listing_version(p_version_id uuid, p_decision text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v public.sambramo_listing_versions%rowtype;
  v_lock_days integer;
  v_now timestamptz := now();
begin
  if not coalesce(public.get_my_role() = 'admin', false)
     and not coalesce(auth.role() = 'service_role', false) then
    raise exception 'Only a Sambramo operator can review listings.';
  end if;
  if p_decision is null or p_decision not in ('approve','request_changes','reject') then
    raise exception 'Unsupported decision.';
  end if;

  select * into v from public.sambramo_listing_versions where id = p_version_id for update;
  if not found then raise exception 'Listing version not found.'; end if;
  if v.status not in ('UNDER_REVIEW','ACTION_REQUIRED') then
    raise exception 'That version is not waiting for review.';
  end if;

  if p_decision <> 'approve' then
    update public.sambramo_listing_versions
       set status = case when p_decision = 'reject' then 'REJECTED' else 'ACTION_REQUIRED' end,
           review_note = p_note, reviewed_at = v_now, reviewed_by = auth.uid(), updated_at = v_now
     where id = v.id;
    update public.sambramo_trade_packages
       set status = 'ACTION_REQUIRED', updated_at = v_now
     where listing_version_id = v.id and status = 'UNDER_REVIEW';
    return jsonb_build_object('ok', true, 'status', case when p_decision = 'reject' then 'REJECTED' else 'ACTION_REQUIRED' end);
  end if;

  select price_lock_days into v_lock_days from public.sambramo_pricing_config limit 1;

  -- An ordinary version replaces the live one. A seasonal version sits beside
  -- it, applying only to its event dates.
  if v.seasonal_window_id is null then
    update public.sambramo_trade_packages p
       set status = 'ARCHIVED', updated_at = v_now
      from public.sambramo_listing_versions old
     where old.vendor_service_id = v.vendor_service_id and old.status = 'LIVE'
       and old.seasonal_window_id is null and p.listing_version_id = old.id and p.status = 'LIVE';
    update public.sambramo_listing_versions
       set status = 'ARCHIVED', updated_at = v_now
     where vendor_service_id = v.vendor_service_id and status = 'LIVE' and seasonal_window_id is null;
  end if;

  update public.sambramo_listing_versions
     set status = 'LIVE', published_at = v_now,
         price_locked_until = case when v.seasonal_window_id is null
                                   then v_now + make_interval(days => coalesce(v_lock_days, 15)) end,
         reviewed_at = v_now, reviewed_by = auth.uid(), review_note = p_note, updated_at = v_now
   where id = v.id;

  update public.sambramo_trade_packages
     set status = 'LIVE', published_at = v_now, updated_at = v_now,
         price_locked_until = case when v.seasonal_window_id is null
                                   then v_now + make_interval(days => coalesce(v_lock_days, 15)) end
   where listing_version_id = v.id and status in ('UNDER_REVIEW','ACTION_REQUIRED','DRAFT');

  update public.sambramo_partner_price_books b
     set status = 'active', effective_from = v_now, updated_at = v_now
    from public.sambramo_trade_packages p
   where p.listing_version_id = v.id and b.offering_id = p.id::text and b.status = 'draft';

  return jsonb_build_object('ok', true, 'status', 'LIVE', 'published_at', v_now);
end;
$function$;
CREATE OR REPLACE FUNCTION public.cancel_line(p_line_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_line  booking_lines%ROWTYPE;
  v_owner UUID;
  v_q     JSONB;
BEGIN
  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT r.customer_id INTO v_owner FROM booking_requests r WHERE r.id = v_line.request_id;

  IF NOT COALESCE(auth.role() = 'service_role', false)
     AND (auth.uid() IS NULL
          OR (v_owner IS DISTINCT FROM auth.uid()
              AND NOT COALESCE(get_my_role() IN ('admin', 'event_coordinator'), false))) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  IF v_line.status IN ('cancelled', 'settled') THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'status', v_line.status);
  END IF;

  -- Work that has been done cannot be un-booked: past `delivered` it is a
  -- dispute (064), with a human in it, not a ladder.
  IF v_line.status IN ('delivered', 'disputed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_late', 'status', v_line.status,
      'scan', 'This one is already done — raise a complaint instead');
  END IF;

  v_q := cancellation_quote(p_line_id);

  -- The money before the status, as 081: a ledger row with a stale status
  -- is recoverable; a cancelled line with no refund recorded is not.
  IF (v_q->>'held_paise')::BIGINT > 0 THEN
    IF (v_q->>'refund_paise')::BIGINT > 0 THEN
      INSERT INTO escrow_ledger (line_id, kind, amount_paise, counterparty, adapter, note)
      VALUES (p_line_id, 'REFUND_CUSTOMER', -((v_q->>'refund_paise')::BIGINT), 'customer', 'ManualPayout',
              format('Cancelled by customer (%s, %s%% back, policy %s)', v_q->>'rung', v_q->>'refund_pct', v_q->>'policy'));
    END IF;
    IF (v_q->>'partner_paise')::BIGINT > 0 THEN
      INSERT INTO escrow_ledger (line_id, kind, amount_paise, counterparty, adapter, note)
      VALUES (p_line_id, 'PENALTY_PARTNER', -((v_q->>'partner_paise')::BIGINT), 'partner', 'ManualPayout',
              format('Customer cancelled (%s) — the master''s share of what is kept', v_q->>'rung'));
    END IF;
    IF (v_q->>'platform_paise')::BIGINT > 0 THEN
      INSERT INTO escrow_ledger (line_id, kind, amount_paise, counterparty, adapter, note)
      VALUES (p_line_id, 'RELEASE_PLATFORM', -((v_q->>'platform_paise')::BIGINT), 'platform', 'ManualPayout',
              format('Customer cancelled (%s) — Sambramo''s share of what is kept', v_q->>'rung'));
    END IF;
  END IF;

  UPDATE booking_lines
     SET status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = 'customer',
         cancellation_reason = p_reason,
         expires_at = NULL
   WHERE id = p_line_id;

  -- Release the master's date: their ACCEPTED offer is what match_partners reads as busy.
  UPDATE dispatch_offers SET status = 'LOST'
   WHERE line_id = p_line_id AND status = 'ACCEPTED';

  RETURN jsonb_build_object('ok', true, 'rung', v_q->>'rung',
    'refunded_paise', (v_q->>'refund_paise')::BIGINT,
    'to_partner_paise', (v_q->>'partner_paise')::BIGINT,
    'to_platform_paise', (v_q->>'platform_paise')::BIGINT);
END;
$function$;
CREATE OR REPLACE FUNCTION public.clear_offer_history(p_vendor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owns BOOLEAN;
  v_n    INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vendors WHERE id = p_vendor_id AND profile_id = auth.uid()
  ) INTO v_owns;

  IF NOT COALESCE(auth.role() = 'service_role', false)
     AND NOT COALESCE(v_owns, false)
     AND NOT COALESCE(get_my_role() IN ('admin', 'event_coordinator'), false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  -- Only what is finished. An OFFERED row is a live job and clearing
  -- history must never take one off the screen.
  UPDATE dispatch_offers
     SET hidden_at = now()
   WHERE vendor_id = p_vendor_id
     AND status IN ('DECLINED', 'LOST', 'EXPIRED')
     AND hidden_at IS NULL;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'hidden', v_n);
END;
$function$;
CREATE OR REPLACE FUNCTION public.mark_line_delivered(p_line_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_line    booking_lines%ROWTYPE;
  v_owns    BOOLEAN;
  v_event   DATE;
BEGIN
  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- The caller must be the master who WON this line. Not merely a master
  -- who was offered it: `uq_offer_one_winner` (060) makes "won" a single
  -- unambiguous row, and this reads that row rather than trusting a
  -- vendor id from the client.
  SELECT EXISTS (
    SELECT 1
    FROM dispatch_offers o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.line_id = p_line_id
      AND o.status = 'ACCEPTED'
      AND v.profile_id = auth.uid()
  ) INTO v_owns;

  IF NOT COALESCE(auth.role() = 'service_role', false)
     AND NOT COALESCE(v_owns, false)
     AND NOT COALESCE(get_my_role() IN ('admin', 'event_coordinator'), false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  -- Already done. Not an error — a master who taps twice on a bad
  -- connection has not made a mistake.
  IF v_line.status IN ('delivered', 'settled') THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'status', v_line.status);
  END IF;

  -- Unpaid work cannot be delivered.
  --
  -- Not pedantry: `delivered` starts the T+24h escrow release clock, and
  -- releasing money that was never held is the exact failure the
  -- solvency trigger in 062 exists to make impossible. Better to refuse
  -- here, where there is a person who can be told why.
  IF v_line.status NOT IN ('paid', 'in_progress') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'not_paid',
      'status', v_line.status,
      'scan', 'The customer has not paid for this yet'
    );
  END IF;

  -- Not before the day itself. A master cannot close a job that has not
  -- happened, and a delivered-then-cancelled line is a dispute nobody
  -- can adjudicate.
  SELECT r.event_date INTO v_event
    FROM booking_requests r WHERE r.id = v_line.request_id;

  IF v_event IS NOT NULL AND v_event > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'too_early',
      'event_date', v_event,
      'scan', 'You can mark this done on the day'
    );
  END IF;

  UPDATE booking_lines
     SET status = 'delivered',
         delivered_at = now()
   WHERE id = p_line_id;

  RETURN jsonb_build_object('ok', true, 'status', 'delivered');
END;
$function$;

revoke execute on function public.anchor_readiness(uuid) from public, anon;
revoke execute on function public.listing_readiness(uuid) from public, anon;
revoke execute on function public.review_sambramo_listing_version(uuid, text, text) from public, anon;
revoke execute on function public.cancel_line(uuid, text) from public, anon;
revoke execute on function public.clear_offer_history(uuid) from public, anon;
revoke execute on function public.mark_line_delivered(uuid) from public, anon;
grant execute on function public.anchor_readiness(uuid) to authenticated, service_role;
grant execute on function public.listing_readiness(uuid) to authenticated, service_role;
grant execute on function public.review_sambramo_listing_version(uuid, text, text) to authenticated, service_role;
grant execute on function public.cancel_line(uuid, text) to authenticated, service_role;
grant execute on function public.clear_offer_history(uuid) to authenticated, service_role;
grant execute on function public.mark_line_delivered(uuid) to authenticated, service_role;

commit;
