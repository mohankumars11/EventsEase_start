-- ════════════════════════════════════════════════════════════════════
-- 134 · The calendar is the matcher
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 126, 131
-- and 132.
--
-- ══════════════════════════════════════════════════════════════════════
-- SUPERSEDED BY 147. DO NOT PASTE THIS AFTER 147.
-- ══════════════════════════════════════════════════════════════════════
--
-- 147 rebuilds `match_partners` from THIS body plus one extra clause
-- (a paused, suspended or hidden listing stops offers for that trade).
-- Both files declare the same signature, so whichever is pasted LAST
-- wins, silently, with no error and no visible difference.
--
-- That has already happened once, on 2026-09-23: 134 was pasted after
-- 147 and dispatch went back to ignoring paused trades. Nothing
-- complained. `why_not_dispatched` still reported "listing_stopped:
-- paused" correctly, because 147 created that function and 134 does not
-- touch it — so the diagnostic said one thing and the matcher did
-- another, which is the worst shape this kind of drift can take.
--
-- If you are pasting a batch: 134 first, then 147. If 147 is already
-- applied, skip this file entirely.
--
-- `scripts/check-dispatch-end-to-end.mjs` catches it either way: it
-- pauses a synthetic partner's listing and checks they stop matching.
--
-- ══════════════════════════════════════════════════════════════════════
-- TWO THINGS MATCHING HAS NEVER KNOWN
-- ══════════════════════════════════════════════════════════════════════
--
-- 1 · THE STANDING WEEK. `weekly_days_off` has existed since 021 and no
--     version of match_partners has ever read it. 131 replaced it with
--     `vendor_weekly_rules` and one function, `weekday_is_open`. This is
--     where that function starts being used.
--
-- 2 · THAT A DAY CAN HOLD MORE THAN ONE JOB. The rule in 126 is a flat
--     NOT EXISTS: one accepted offer on a date and the partner is out of
--     the running entirely. That is right for a decorator and wrong for
--     a photographer with two assistants, and it is why
--     `max_events_per_day` (021) has never done anything -- the
--     NOT EXISTS answers before the cap is ever consulted.
--
--     Replaced below with a COUNT against a cap. The cap is the day's
--     own `slots_total` when the partner set one, their standing
--     `max_events_per_day` otherwise, and 1 if neither is set -- an
--     unset cap must never read as "unlimited".
--
--     This also makes the LIMITED branch real for the first time. 132
--     made `slots_booked` true; this makes something depend on it.
--
-- ── Everything else is preserved exactly ────────────────────────────
-- The synthetic guard, both radius tests, the trade test, the
-- accepting_jobs switch from 126, and the unpaid-hold grace period that
-- stops an unfunded acceptance holding a date for good. `search_path =
-- public, extensions` is load-bearing -- without it PostGIS is invisible
-- to a SECURITY DEFINER function and every call fails with "st_distance
-- does not exist", which reads like a type problem and is a visibility
-- one. See 082.
--
-- ── A divergence this migration does NOT resolve ────────────────────
-- 101 and 113 required `s.review_status = 'live'` on the service, and
-- 086 clamped the radius with `max_dispatch_radius_m()`. 126 rebuilt
-- from the 082 definition and both were lost. They look like accidents
-- rather than decisions, but restoring them here would change who gets
-- dispatched under cover of a calendar change, so they are left out and
-- written down instead.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

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
    AND v.accepting_jobs = TRUE
    AND (p_allow_synthetic OR v.is_synthetic = FALSE)
    AND NOT (v.id = ANY(p_exclude))
    AND ST_DWithin(v.location, p_point, p_radius_m)
    AND ST_DWithin(v.location, p_point, v.service_radius_km * 1000)
    AND EXISTS (
      SELECT 1 FROM vendor_services s
      WHERE s.vendor_id = v.id AND s.category = p_trade AND s.is_active = TRUE
    )
    -- A day the partner blocked outright. Unchanged.
    AND NOT EXISTS (
      SELECT 1 FROM vendor_availability a
      WHERE a.vendor_id = v.id
        AND a.slot_date = p_date
        AND a.status = 'BLOCKED'
    )
    -- ── The standing week ──────────────────────────────────────────
    -- Only consulted when the partner has said nothing about this
    -- specific date. A row -- any row -- is a statement about that day
    -- and outranks the weekly rule, which is what makes "closed
    -- Sundays, but open THIS Sunday" expressible.
    AND (
      EXISTS (
        SELECT 1 FROM vendor_availability a
        WHERE a.vendor_id = v.id AND a.slot_date = p_date
      )
      OR public.weekday_is_open(v.id, p_date)
    )
    -- ── Capacity, counted against a cap ────────────────────────────
    AND (
      SELECT COUNT(*)
        FROM dispatch_offers o
        JOIN booking_lines l    ON l.id = o.line_id
        JOIN booking_requests r ON r.id = l.request_id
       WHERE o.vendor_id = v.id
         AND o.status = 'ACCEPTED'
         AND r.event_date = p_date
         AND l.status NOT IN ('cancelled','expired')
         -- An accepted line nobody paid for stops holding the date once
         -- the grace period lapses. Preserved from 082 exactly.
         AND (
           l.status <> 'accepted'
           OR COALESCE(l.accepted_at, o.responded_at, o.offered_at)
              > now() - (unpaid_hold_minutes() || ' minutes')::interval
         )
    ) < COALESCE(
          (SELECT a.slots_total FROM vendor_availability a
            WHERE a.vendor_id = v.id AND a.slot_date = p_date),
          v.max_events_per_day,
          1)
  ORDER BY rating DESC, distance_m ASC
  LIMIT GREATEST(p_limit, 1)
$$;

REVOKE ALL ON FUNCTION public.match_partners(TEXT, GEOGRAPHY, INT, DATE, BOOLEAN, INT, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_partners(TEXT, GEOGRAPHY, INT, DATE, BOOLEAN, INT, UUID[]) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- What a customer is allowed to know
-- ══════════════════════════════════════════════════════════════════════
--
-- The customer's date grids offer every one of the next 14 or 21 days as
-- tappable, having asked nobody anything. This is the function that lets
-- them stop doing that.
--
-- It returns A COUNT PER DATE. Not a status, not a note, not a reason,
-- not a vendor id. "Three photographers are free on the 20th" is the
-- most a customer ever needs and the least that is useful, and it cannot
-- be turned back into "Ramesh is at a family function".
--
-- That distinction is load-bearing: 021 left a public SELECT policy on
-- vendor_availability itself (`public_reads_approved_vendor_availability`),
-- so the privacy of a blocking reason cannot rest on the client not
-- asking. It rests on the columns 130 marked partner-facing never
-- appearing in a function granted to anon -- which is this one.
--
-- p_dates is clamped to 62 entries. Anyone may call this; nobody needs
-- two months of it in one round trip.
--
-- ── Latitude and longitude, not a geography ─────────────────────────
-- Every other matching entry point takes a GEOGRAPHY, because it is
-- called from the server where one is already in hand. This one is
-- called from a BROWSER, and PostgREST cannot send a geography — the
-- same trap migration 111 documents for vendor_availability.location and
-- that `vendors` fell into twice. Taking the two numbers and building
-- the point here is what keeps this to one round trip instead of a
-- point_of() call followed by this one.

CREATE OR REPLACE FUNCTION public.partners_free_on(
  p_trade           TEXT,
  p_lat             DOUBLE PRECISION,
  p_lng             DOUBLE PRECISION,
  p_radius_m        INT,
  p_dates           DATE[],
  p_allow_synthetic BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (slot_date DATE, free_count INT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    d::DATE,
    (SELECT COUNT(*)::INT
       FROM public.match_partners(
         p_trade,
         ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
         LEAST(GREATEST(p_radius_m, 1000), 100000),
         d::DATE, p_allow_synthetic, 50, '{}'))
  FROM unnest(p_dates[1:62]) AS d
$$;

COMMENT ON FUNCTION public.partners_free_on(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INT, DATE[], BOOLEAN) IS
  'How many partners of this trade are free on each date. Counts only -- never a status, a note or a reason. The customer-facing read of the partner calendar.';

REVOKE ALL ON FUNCTION public.partners_free_on(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INT, DATE[], BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partners_free_on(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INT, DATE[], BOOLEAN)
  TO anon, authenticated, service_role;

COMMIT;
