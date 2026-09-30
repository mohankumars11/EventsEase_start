-- ============================================================
-- 072 · Writing a booking's location, and widening the search
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057–071 FIRST.
-- Re-runnable: functions only, no data touched.
--
-- ── Two things the dispatcher needs and does not have ────────────────
--   1. a way to write `booking_requests.location` — PostgREST cannot
--      send a geography value at all;
--   2. a way to find the lines whose offer window has closed, so the
--      next wave can go out at a wider radius.
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- set_booking_location
-- ══════════════════════════════════════════════════════════════════════
-- The mirror of `set_vendor_location` (070) and for the same reason:
-- PostgREST has no JSON representation for `geography`, so there is no
-- path into that column except a server-side function.
--
-- Which is the good outcome. Every coordinate in this database now goes
-- through `point_of()` and therefore through the India bounding box —
-- there is no second route that skips the validation, because there is
-- no second route.
CREATE OR REPLACE FUNCTION public.set_booking_location(
  p_request_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_point extensions.geography;
  v_owner UUID;
BEGIN
  IF get_my_role() NOT IN ('admin','event_coordinator') THEN
    SELECT customer_id INTO v_owner FROM booking_requests WHERE id = p_request_id;
    IF v_owner IS DISTINCT FROM auth.uid() THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
    END IF;
  END IF;

  v_point := public.point_of(p_lat, p_lng);
  IF v_point IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'out_of_range',
      'detail', 'Coordinate is outside India — check latitude and longitude are the right way round.');
  END IF;

  UPDATE booking_requests SET location = v_point WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_booking_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_booking_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- create_booking_request — insert and locate in ONE statement
-- ══════════════════════════════════════════════════════════════════════
--
-- `set_booking_location` above can only UPDATE a row that already exists,
-- and `booking_requests.location` is NOT NULL. So insert-then-locate
-- cannot work: the insert fails before there is anything to locate.
--
-- The tempting fix is to make the column nullable. That would be wrong.
-- A booking with no location is a booking dispatch cannot serve — it
-- would match nobody, sit there looking like a supply problem, and the
-- NOT NULL is precisely what stops that state existing.
--
-- So the row is created WITH its point, in one statement, and the
-- coordinate still goes through `point_of()` and its India bounding box.
-- `set_booking_location` stays for the case it was written for: a
-- customer correcting the address afterwards.
CREATE OR REPLACE FUNCTION public.create_booking_request(
  p_customer_id   UUID,
  p_occasion_id   TEXT,
  p_occasion_name TEXT,
  p_event_date    DATE,
  p_guest_count   INTEGER,
  p_radius_km     INTEGER,
  p_lat           DOUBLE PRECISION,
  p_lng           DOUBLE PRECISION,
  p_address_text  TEXT,
  p_area_label    TEXT,
  p_city          TEXT,
  p_policy_version TEXT,
  p_time_note     TEXT DEFAULT NULL,
  p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_point extensions.geography;
  v_id    UUID;
BEGIN
  v_point := public.point_of(p_lat, p_lng);
  IF v_point IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'out_of_range',
      'detail', 'Coordinate is outside India — check latitude and longitude are the right way round.');
  END IF;

  INSERT INTO booking_requests (
    customer_id, occasion_id, occasion_name, event_date, time_note,
    location, address_text, area_label, city,
    radius_km, guest_count, policy_version, notes
  ) VALUES (
    p_customer_id, p_occasion_id, p_occasion_name, p_event_date, p_time_note,
    v_point, p_address_text, p_area_label, p_city,
    p_radius_km, p_guest_count, p_policy_version, p_notes
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'request_id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_request(
  UUID, TEXT, TEXT, DATE, INTEGER, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_request(
  UUID, TEXT, TEXT, DATE, INTEGER, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- lines_awaiting_next_wave
-- ══════════════════════════════════════════════════════════════════════
--
-- A line whose 45 seconds have run out with nobody accepting is not
-- finished — it is due a wider search. This returns those lines with
-- everything the dispatcher needs to send the next wave, including which
-- masters have already been asked so they are not buzzed twice about the
-- same job.
--
-- ── Why the exclusion list matters more than it looks ────────────────
-- Re-offering to a master who already declined is the fastest way to
-- teach them the notifications are noise. `uq_offer_one_per_partner_per_wave`
-- (060) stops a duplicate INSIDE a wave; this stops it ACROSS waves,
-- which the index deliberately permits because a genuinely wider search
-- may legitimately re-ask somebody who was busy — but never somebody who
-- said no.
CREATE OR REPLACE FUNCTION public.lines_awaiting_next_wave(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  line_id UUID,
  request_id UUID,
  trade TEXT,
  event_date DATE,
  radius_km INTEGER,
  partner_amount_paise INTEGER,
  location extensions.geography,
  next_wave INTEGER,
  already_asked UUID[]
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    l.id,
    r.id,
    l.trade,
    r.event_date,
    r.radius_km,
    l.partner_amount_paise,
    r.location,
    COALESCE(MAX(o.wave), 0) + 1,
    -- Only DECLINED masters are permanently excluded. Somebody who
    -- simply did not answer in 45 seconds may well answer now — they
    -- were driving, not uninterested.
    COALESCE(
      ARRAY_AGG(o.vendor_id) FILTER (WHERE o.status = 'DECLINED'),
      '{}'::UUID[])
  FROM booking_lines l
  JOIN booking_requests r ON r.id = l.request_id
  LEFT JOIN dispatch_offers o ON o.line_id = l.id
  WHERE l.status = 'dispatching'
    AND l.dispatch_mode = 'window'
    AND l.expires_at IS NOT NULL
    AND l.expires_at <= now()
    AND r.event_date >= CURRENT_DATE
    -- Nobody won it. Belt and braces: `uq_offer_one_winner` already makes
    -- a second winner impossible, and the line status would have moved.
    AND NOT EXISTS (
      SELECT 1 FROM dispatch_offers a WHERE a.line_id = l.id AND a.status = 'ACCEPTED')
  GROUP BY l.id, r.id, l.trade, r.event_date, r.radius_km, l.partner_amount_paise, r.location
  ORDER BY r.event_date ASC, l.created_at ASC
  LIMIT GREATEST(p_limit, 1)
$$;

-- ══════════════════════════════════════════════════════════════════════
-- expire_stale_offers
-- ══════════════════════════════════════════════════════════════════════
-- Offers nobody answered. Marked rather than deleted: who was asked and
-- did not reply is the dataset behind "why did this line not fill", and
-- a response rate per master is what tells you whose notifications are
-- worth sending at all.
CREATE OR REPLACE FUNCTION public.expire_stale_offers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER := 0;
BEGIN
  UPDATE dispatch_offers
     SET status = 'EXPIRED'
   WHERE status = 'OFFERED' AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMIT;
