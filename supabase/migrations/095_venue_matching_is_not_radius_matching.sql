-- ══════════════════════════════════════════════════════════════════════
-- 095 · Venues are city-wide, and everything else is anchored to them
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 094 first.
-- Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- TWO ENGINES, BECAUSE VENUES AND SERVICES OBEY DIFFERENT GEOGRAPHY
-- ══════════════════════════════════════════════════════════════════════
--
-- A customer in Indiranagar will drive to Yelahanka for the right hall.
-- The same customer will not accept a decorator who has to drive 30 km to
-- hang balloons -- and the decorator will not accept the job.
--
--   THE VENUE ENGINE     venues_available(). No radius argument at all.
--                        Every hall in Bengaluru, filtered by date,
--                        session and capacity.
--
--   THE SERVICE ENGINE   match_partners(), unchanged, EXCEPT that once a
--                        venue is chosen the point it measures from is
--                        the venue's, not the customer's home.
--
-- That second half is the part that is easy to miss and expensive to get
-- wrong. Today a customer whose party is at a resort 14 km away gets
-- decorators matched to their HOUSE. Every one of them is being offered a
-- job they would have to drive across the city for, having been told it
-- was nearby -- which is a no-show, or an acceptance somebody regrets.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE SESSION OVERLAP RULE
-- ══════════════════════════════════════════════════════════════════════
--
-- 'full_day' is not a third session sitting beside morning and evening.
-- It is both of them, and a CHECK constraint cannot express that because
-- it cannot see other rows. So it lives here, in one function, used by
-- both the availability query and the booking path -- one definition, so
-- the two can never disagree about whether a hall is free.

BEGIN;

-- ── 1 · Is this space free? ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.venue_space_free(
  p_space_id UUID,
  p_date     DATE,
  p_session  TEXT DEFAULT 'full_day'
)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM venue_slots s
    WHERE s.space_id  = p_space_id
      AND s.slot_date = p_date
      -- A HELD row whose hold has run out is not holding anything. Without
      -- this, one abandoned checkout takes a Saturday off the market
      -- permanently, and nobody notices until the venue asks why they get
      -- no weekend bookings.
      AND (s.status IN ('BLOCKED', 'BOOKED')
           OR (s.status = 'HELD'
               AND (s.hold_expires_at IS NULL OR s.hold_expires_at > now())))
      -- The overlap rule, stated once.
      AND (s.session = 'full_day' OR p_session = 'full_day' OR s.session = p_session)
  );
$$;

COMMENT ON FUNCTION public.venue_space_free(UUID, DATE, TEXT) IS
  'The single definition of whether a hall is free. full_day overlaps both.';

-- ── 2 · Every hall in Bengaluru that fits ────────────────────────────
--
-- Note what this function does NOT take: a point and a radius. That
-- omission is the feature. Adding them later "for consistency" with
-- match_partners would silently re-introduce the bug this migration
-- exists to remove.

CREATE OR REPLACE FUNCTION public.venues_available(
  p_date         DATE,
  p_session      TEXT    DEFAULT 'full_day',
  p_min_capacity INTEGER DEFAULT 0,
  p_kinds        TEXT[]  DEFAULT NULL,
  p_limit        INTEGER DEFAULT 60
)
RETURNS TABLE (
  space_id      UUID,
  venue_id      UUID,
  venue_name    TEXT,
  space_name    TEXT,
  venue_kind    TEXT,
  area_label    TEXT,
  floating_capacity INTEGER,
  seated_capacity   INTEGER,
  is_ac         BOOLEAN,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  is_free       BOOLEAN
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    sp.id, v.id, v.name, sp.space_name, v.venue_kind, v.area_label,
    sp.floating_capacity, sp.seated_capacity, sp.is_ac,
    ST_Y(v.location::geometry), ST_X(v.location::geometry),
    public.venue_space_free(sp.id, p_date, p_session)
  FROM venue_spaces sp
  JOIN venues v ON v.id = sp.venue_id
  WHERE sp.is_active = TRUE
    -- Only a claimed venue is bookable. An OSM-seeded row nobody manages
    -- has no calendar and no one to ring, so offering it would be
    -- offering a booking we cannot honour.
    AND v.status = 'claimed'
    AND (p_min_capacity <= 0
         OR COALESCE(sp.floating_capacity, sp.seated_capacity, 0) >= p_min_capacity)
    AND (p_kinds IS NULL OR v.venue_kind = ANY(p_kinds))
  -- Free first, then the tightest fit. A customer with 300 guests should
  -- see the 350-capacity hall before the 1,500-capacity one: the big room
  -- costs more and makes 300 people look like a poor turnout.
  ORDER BY
    public.venue_space_free(sp.id, p_date, p_session) DESC,
    COALESCE(sp.floating_capacity, sp.seated_capacity, 0) ASC
  LIMIT GREATEST(p_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.venues_available(DATE, TEXT, INTEGER, TEXT[], INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.venues_available(DATE, TEXT, INTEGER, TEXT[], INTEGER)
  TO anon, authenticated, service_role;

-- `anon` deliberately. Browsing halls is the top of the funnel and must
-- work before anybody signs in -- and this function returns no personal
-- data: a place, a room, a capacity, and whether it is free.

-- ── 3 · The nearest alternatives when the chosen hall is gone ────────
--
-- A blocked date must not be a dead end. This is the query behind
-- "that one is taken -- these three are free and close to it", ordered by
-- distance FROM THE BLOCKED VENUE, because somebody who picked a hall in
-- Jayanagar wants another hall in Jayanagar.

CREATE OR REPLACE FUNCTION public.venue_alternatives(
  p_space_id UUID,
  p_date     DATE,
  p_session  TEXT DEFAULT 'full_day',
  p_limit    INTEGER DEFAULT 3
)
RETURNS TABLE (
  space_id   UUID,
  venue_name TEXT,
  space_name TEXT,
  area_label TEXT,
  floating_capacity INTEGER,
  distance_m INTEGER
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  WITH target AS (
    SELECT v.location AS loc,
           COALESCE(sp.floating_capacity, sp.seated_capacity, 0) AS cap
    FROM venue_spaces sp JOIN venues v ON v.id = sp.venue_id
    WHERE sp.id = p_space_id
  )
  SELECT
    sp.id, v.name, sp.space_name, v.area_label, sp.floating_capacity,
    ST_Distance(v.location, t.loc)::INTEGER
  FROM venue_spaces sp
  JOIN venues v ON v.id = sp.venue_id
  CROSS JOIN target t
  WHERE sp.id <> p_space_id
    AND sp.is_active = TRUE
    AND v.status = 'claimed'
    AND v.location IS NOT NULL
    -- Comparable, not merely near. Offering a 100-seat room to somebody
    -- who asked for 800 is not an alternative, it is a second rejection.
    AND COALESCE(sp.floating_capacity, sp.seated_capacity, 0) >= (t.cap * 0.7)
    AND public.venue_space_free(sp.id, p_date, p_session)
  ORDER BY ST_Distance(v.location, t.loc)
  LIMIT GREATEST(p_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.venue_alternatives(UUID, DATE, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.venue_alternatives(UUID, DATE, TEXT, INTEGER)
  TO anon, authenticated, service_role;

-- ── 4 · The anchor ───────────────────────────────────────────────────
--
-- Where the OTHER services are measured from. NULL means "the customer's
-- own address", which is what every request looks like today, so nothing
-- changes for a party at home.

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS venue_space_id UUID
  REFERENCES public.venue_spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_booking_requests_venue
  ON public.booking_requests (venue_space_id) WHERE venue_space_id IS NOT NULL;

COMMENT ON COLUMN public.booking_requests.venue_space_id IS
  'Chosen hall. When set, match_partners measures its radius from HERE.';

-- The point dispatch should search around. One function, so the API and
-- any future re-match cannot disagree about where the party is.
CREATE OR REPLACE FUNCTION public.dispatch_origin(p_request_id UUID)
RETURNS extensions.geography
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT COALESCE(
    (SELECT v.location
       FROM booking_requests r
       JOIN venue_spaces sp ON sp.id = r.venue_space_id
       JOIN venues v        ON v.id  = sp.venue_id
      WHERE r.id = p_request_id),
    (SELECT r.location FROM booking_requests r WHERE r.id = p_request_id)
  );
$$;

REVOKE ALL ON FUNCTION public.dispatch_origin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_origin(UUID) TO authenticated, service_role;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- STILL TO DO IN CODE, NOT IN SQL
-- ══════════════════════════════════════════════════════════════════════
--
-- api/dispatch-booking.js must pass dispatch_origin(request_id) instead of
-- the request's own location. Until it does, this column is written and
-- ignored -- which is safe, but it is not the feature.
