-- ════════════════════════════════════════════════════════════════════
-- 133 · An accept cannot overbook
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 061, 131
-- and 132 -- it calls weekday_is_open() and relies on the recount
-- triggers to keep slots_booked true afterwards.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT `uq_offer_one_winner` DOES NOT COVER
-- ══════════════════════════════════════════════════════════════════════
--
-- 061 resolves one race correctly: two partners reaching the SAME LINE
-- together. The partial unique index lets one UPDATE commit and raises
-- 23505 at the other.
--
-- It says nothing at all about one partner and TWO DIFFERENT LINES on
-- the same date. Those are two different rows in dispatch_offers, so the
-- index is not involved, and accept_offer has never looked at the
-- partner's calendar on the way past. A decorator capped at one job a
-- day can accept three Saturday weddings, and every check that should
-- have stopped it -- BLOCKED, LIMITED, the standing week -- is consulted
-- only by `match_partners`, which ran minutes earlier when the offers
-- were sent.
--
-- Matching decides who is ASKED. Only this function decides who is
-- BOOKED, and a guard that lives only in the asking half is not a guard.
--
-- ── The lock, and why it is on `vendors` ────────────────────────────
-- Two accepts by one partner on one date must serialise or they both
-- read "0 booked" and both commit. The row to lock would naturally be
-- the day's vendor_availability row -- except most days have no row, and
-- creating one just to lock it would litter the table with OPEN rows
-- every time an accept was then REFUSED.
--
-- So the lock is taken on the partner's own `vendors` row. It is
-- guaranteed to exist, it is held for microseconds, and it serialises
-- every accept by that partner -- slightly broader than serialising one
-- date, and the difference costs nothing: a partner accepts jobs one tap
-- at a time.
--
-- ── Counted, not read ───────────────────────────────────────────────
-- The guard counts live accepted lines itself rather than trusting
-- `slots_booked`. 132 keeps that column true by trigger, but a guard
-- that depends on a trigger having already fired is a guard with an
-- ordering bug in it. The column is for display; this is for the
-- decision.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.accept_offer(p_offer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_offer   dispatch_offers%ROWTYPE;
  v_line    booking_lines%ROWTYPE;
  v_owner   UUID;
  v_date    DATE;
  v_avail   vendor_availability%ROWTYPE;
  v_cap     INTEGER;
  v_booked  INTEGER;
BEGIN
  SELECT * INTO v_offer FROM dispatch_offers WHERE id = p_offer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- SECURITY DEFINER bypasses RLS, so this function must do by hand the
  -- ownership check that a policy would otherwise have done.
  SELECT profile_id INTO v_owner FROM vendors WHERE id = v_offer.vendor_id;
  IF v_owner IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  IF v_offer.status <> 'OFFERED' THEN
    RETURN jsonb_build_object('ok', false, 'reason', lower(v_offer.status));
  END IF;

  IF v_offer.expires_at <= now() THEN
    UPDATE dispatch_offers
       SET status = 'EXPIRED', responded_at = now()
     WHERE id = p_offer_id AND status = 'OFFERED';
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  SELECT * INTO v_line FROM booking_lines WHERE id = v_offer.line_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'line_gone');
  END IF;

  IF v_line.status NOT IN ('pending','dispatching') THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      CASE WHEN v_line.status IN ('cancelled','expired') THEN v_line.status
           ELSE 'taken' END);
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- THE CALENDAR, CONSULTED AT THE MOMENT IT MATTERS
  -- ══════════════════════════════════════════════════════════════════
  SELECT r.event_date INTO v_date
    FROM booking_requests r WHERE r.id = v_line.request_id;

  IF v_date IS NOT NULL THEN
    -- Serialise this partner's accepts. See the header.
    PERFORM 1 FROM vendors WHERE id = v_offer.vendor_id FOR UPDATE;

    SELECT * INTO v_avail FROM vendor_availability
     WHERE vendor_id = v_offer.vendor_id AND slot_date = v_date;

    -- A day the partner blocked AFTER the offer went out. They are told
    -- plainly rather than silently allowed through, because the whole
    -- point of blocking it was to not be here.
    IF FOUND AND v_avail.status = 'BLOCKED' THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'blocked',
        'event_date', v_date);
    END IF;

    -- The standing week. Outranked by any row above, which is why it is
    -- checked second and only when no row said otherwise.
    IF NOT FOUND AND NOT public.weekday_is_open(v_offer.vendor_id, v_date) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'weekday_closed',
        'event_date', v_date);
    END IF;

    SELECT COUNT(*) INTO v_booked
      FROM dispatch_offers o
      JOIN booking_lines l    ON l.id = o.line_id
      JOIN booking_requests r ON r.id = l.request_id
     WHERE o.vendor_id = v_offer.vendor_id
       AND o.status = 'ACCEPTED'
       AND r.event_date = v_date
       AND l.status NOT IN ('cancelled','expired');

    -- The day's own cap wins; otherwise the partner's standing one.
    -- COALESCE bottoms out at 1 so a NULL on both can never read as
    -- "unlimited" -- an unset cap must not be the permissive case.
    SELECT COALESCE(v_avail.slots_total, v.max_events_per_day, 1)
      INTO v_cap
      FROM vendors v WHERE v.id = v_offer.vendor_id;

    IF v_booked >= v_cap THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'day_full',
        'event_date', v_date, 'booked', v_booked, 'capacity', v_cap);
    END IF;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- THE RACE, RESOLVED (unchanged from 061)
  -- ══════════════════════════════════════════════════════════════════
  BEGIN
    UPDATE dispatch_offers
       SET status = 'ACCEPTED', accepted_at = now(), responded_at = now()
     WHERE id = p_offer_id;
  EXCEPTION WHEN unique_violation THEN
    UPDATE dispatch_offers
       SET status = 'LOST', responded_at = now()
     WHERE id = p_offer_id AND status = 'OFFERED';
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END;

  UPDATE booking_lines
     SET status            = 'accepted',
         accepted_offer_id = p_offer_id,
         accepted_at       = now()
   WHERE id = v_offer.line_id
     AND status IN ('pending','dispatching');

  UPDATE dispatch_offers
     SET status = 'LOST', responded_at = now()
   WHERE line_id = v_offer.line_id
     AND id <> p_offer_id
     AND status = 'OFFERED';

  -- slots_booked is NOT written here. The triggers from 132 have already
  -- recounted it from the UPDATE above, and a second opinion in this
  -- function is how the two would eventually disagree.
  RETURN jsonb_build_object(
    'ok', true,
    'line_id', v_offer.line_id,
    'partner_amount_paise', v_offer.partner_amount_paise,
    'awaiting_payment', true
  );
END;
$$;

COMMENT ON FUNCTION public.accept_offer(UUID) IS
  'Accept a dispatch offer. Refuses with reason blocked / weekday_closed / day_full when the partner''s calendar says so -- matching decides who is asked, this decides who is booked.';

REVOKE ALL ON FUNCTION public.accept_offer(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_offer(UUID) TO authenticated;

COMMIT;
