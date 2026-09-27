-- ══════════════════════════════════════════════════════════════════════
-- 126 · A switch that actually stops the work
-- ══════════════════════════════════════════════════════════════════════
--
-- The Jobs header carries an "Online" pill. Until now there was no
-- column behind it, which is why the header shipped without one: a
-- toggle that changes nothing is worse than no toggle, because a partner
-- who flips it to offline and keeps receiving offers concludes the app
-- is lying to them — and they are right.
--
-- ── Why this is not the same as marking a day busy ───────────────────
-- `vendor_availability` (021) records exceptions to a calendar: "I am
-- not free on the 26th". It is planned, per-date and entered in advance.
--
-- This is the other thing a master needs, and it is the one they need at
-- 6am: "not today". A van broke down, somebody is ill, the previous
-- night ran until four. Asking them to open a calendar and mark today
-- busy while standing next to a broken van is asking too much.
--
-- Both are honoured by `match_partners`, and neither replaces the other.
--
-- ── Defaults TRUE, and nothing sets it FALSE on their behalf ─────────
-- Every existing partner is accepting work today and must keep doing so
-- after this migration. A column that silently took the network offline
-- on deploy would be the worst possible version of this change.

BEGIN;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS accepting_jobs BOOLEAN NOT NULL DEFAULT true;

/* When they last changed it, so an operator looking at a partner who has
   had no work for a fortnight can see whether they switched themselves
   off and forgot. Nullable: never touched is a different fact from
   touched and left on. */
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS accepting_jobs_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.vendors.accepting_jobs IS
  'The Online switch on the Jobs header. FALSE removes this partner from '
  'dispatch immediately, for every trade and every date, until they turn '
  'it back on. Not a substitute for vendor_availability, which is the '
  'planned, per-date version of the same idea.';

/* Stamped here rather than in the client: the app is one caller and the
   admin console is another, and a timestamp written by whoever
   remembered is a timestamp nobody can trust. */
CREATE OR REPLACE FUNCTION public.stamp_accepting_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.accepting_jobs IS DISTINCT FROM OLD.accepting_jobs THEN
    NEW.accepting_jobs_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_accepting_jobs ON public.vendors;
CREATE TRIGGER trg_stamp_accepting_jobs
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.stamp_accepting_jobs();

-- ══════════════════════════════════════════════════════════════════════
-- match_partners honours it
-- ══════════════════════════════════════════════════════════════════════
--
-- Rebuilt from the 082 definition with ONE line added. Everything else
-- is preserved exactly: the synthetic guard, both radius tests, the
-- trade test, the availability test, and the unpaid-hold grace period
-- that stops an unfunded acceptance holding a date for good.
--
-- `search_path = public, extensions` is load-bearing and is why 082
-- exists at all — without it PostGIS is invisible to a SECURITY DEFINER
-- function and every call fails with "st_distance does not exist",
-- which reads like a type problem and is a visibility one.

CREATE OR REPLACE FUNCTION public.match_partners(
  p_trade           TEXT,
  p_point           GEOGRAPHY,
  p_radius_m        INT,
  p_date            DATE,
  p_allow_synthetic BOOLEAN DEFAULT FALSE,
  p_limit           INT     DEFAULT 5,
  p_exclude         UUID[]  DEFAULT '{}'
)
RETURNS TABLE (vendor_id UUID, distance_m INT, rating NUMERIC)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    v.id,
    ST_Distance(v.location, p_point)::INTEGER AS distance_m,
    COALESCE(v.rating_avg, 0) AS rating
  FROM vendors v
  WHERE v.location IS NOT NULL
    AND v.is_verified = TRUE
    -- ── The one new line ───────────────────────────────────────────
    -- The Online switch. Defaults TRUE, so a partner who has never seen
    -- the control is unaffected.
    AND v.accepting_jobs = TRUE
    AND (p_allow_synthetic OR v.is_synthetic = FALSE)
    AND NOT (v.id = ANY(p_exclude))
    AND ST_DWithin(v.location, p_point, p_radius_m)
    AND ST_DWithin(v.location, p_point, v.service_radius_km * 1000)
    AND EXISTS (
      SELECT 1 FROM vendor_services s
      WHERE s.vendor_id = v.id AND s.category = p_trade AND s.is_active = TRUE
    )
    AND NOT EXISTS (
      SELECT 1 FROM vendor_availability a
      WHERE a.vendor_id = v.id
        AND a.slot_date = p_date
        AND (a.status = 'BLOCKED'
             OR (a.status = 'LIMITED' AND a.slots_total IS NOT NULL
                 AND a.slots_booked >= a.slots_total))
    )
    AND NOT EXISTS (
      SELECT 1
      FROM dispatch_offers o
      JOIN booking_lines l  ON l.id = o.line_id
      JOIN booking_requests r ON r.id = l.request_id
      WHERE o.vendor_id = v.id
        AND o.status = 'ACCEPTED'
        AND r.event_date = p_date
        AND l.status NOT IN ('cancelled','expired')
        AND (
          l.status <> 'accepted'
          OR COALESCE(l.accepted_at, o.responded_at, o.offered_at)
             > now() - (unpaid_hold_minutes() || ' minutes')::interval
        )
    )
  ORDER BY rating DESC, distance_m ASC
  LIMIT GREATEST(p_limit, 1)
$$;

REVOKE ALL ON FUNCTION public.match_partners(TEXT, GEOGRAPHY, INT, DATE, BOOLEAN, INT, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_partners(TEXT, GEOGRAPHY, INT, DATE, BOOLEAN, INT, UUID[]) TO authenticated, service_role;

COMMIT;
