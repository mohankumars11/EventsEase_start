-- ══════════════════════════════════════════════════════════════════════
-- 082 · An unpaid acceptance must not hold a date for ever
-- ══════════════════════════════════════════════════════════════════════
--
-- `match_partners` excludes a master who already holds an ACCEPTED offer
-- on the event date. That is right: nobody should be offered two jobs on
-- one Saturday.
--
-- But it counted an acceptance the customer never paid for, with no time
-- limit. So a customer who tapped "Find my masters", got an acceptance,
-- and then closed the app took that master's Saturday out of the market
-- permanently — for a booking that does not exist and never will.
--
-- Observed, and it is what "no notifications are coming" turned out to
-- be: the only real photographer in Bengaluru held three accepted,
-- unpaid Photography lines, and was therefore correctly invisible to
-- every booking on those dates. Every part of the system worked exactly
-- as designed, and the result was a marketplace that could not fill a
-- single job.
--
-- ══════════════════════════════════════════════════════════════════════
-- A GRACE PERIOD, NOT A REMOVAL
-- ══════════════════════════════════════════════════════════════════════
--
-- The hold cannot simply be dropped. Between accepting and being paid
-- there is a real window — the customer is entering a UPI PIN — and
-- offering that master another job during it is how two customers end up
-- with the same decorator.
--
-- So an unpaid acceptance holds the date for HOLD_MINUTES and then stops.
-- Long enough to cover a payment somebody is actually making; short
-- enough that an abandoned one costs a master a couple of hours instead
-- of a Saturday.
--
-- A PAID line holds the date with no expiry at all, which is the whole
-- point of paying.
--
-- Re-runnable, like every migration in this series.

BEGIN;

-- 45 minutes. A UPI payment takes under two; the rest is somebody being
-- interrupted, finding their card, or asking their spouse. Past that
-- they are not paying today.
CREATE OR REPLACE FUNCTION public.unpaid_hold_minutes()
RETURNS INT LANGUAGE SQL IMMUTABLE AS $$ SELECT 45 $$;

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
SET search_path = public
AS $$
  SELECT
    v.id,
    ST_Distance(v.location, p_point)::INTEGER AS distance_m,
    COALESCE(v.rating_avg, 0) AS rating
  FROM vendors v
  WHERE v.location IS NOT NULL
    AND v.is_verified = TRUE
    -- The synthetic guard. Default FALSE, so a caller that forgets the
    -- argument gets real partners only — the safe direction to fail.
    AND (p_allow_synthetic OR v.is_synthetic = FALSE)
    AND NOT (v.id = ANY(p_exclude))
    -- Inside the customer's reach…
    AND ST_DWithin(v.location, p_point, p_radius_m)
    -- …and inside the partner's own.
    AND ST_DWithin(v.location, p_point, v.service_radius_km * 1000)
    -- Does this trade at all.
    AND EXISTS (
      SELECT 1 FROM vendor_services s
      WHERE s.vendor_id = v.id AND s.category = p_trade AND s.is_active = TRUE
    )
    -- Not blocked that day. A partner with NO row for the date is
    -- available: `vendor_availability` (021) records exceptions, not a
    -- full calendar, and requiring a row would make every partner who has
    -- never opened the calendar undispatchable.
    AND NOT EXISTS (
      SELECT 1 FROM vendor_availability a
      WHERE a.vendor_id = v.id
        AND a.slot_date = p_date
        AND (a.status = 'BLOCKED'
             OR (a.status = 'LIMITED' AND a.slots_total IS NOT NULL
                 AND a.slots_booked >= a.slots_total))
    )
    -- ── Not already committed that day ─────────────────────────────
    -- The change is the last two lines. A line that is PAID or beyond
    -- holds the date outright. An `accepted` line — accepted but not
    -- funded — holds it only for the grace period, because otherwise a
    -- customer who never pays removes that master from the market for
    -- good.
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

-- ══════════════════════════════════════════════════════════════════════
-- And close the abandoned lines, so both sides stop seeing them
-- ══════════════════════════════════════════════════════════════════════
--
-- The matcher change frees the master. It does not tidy the customer's
-- screen or the partner's job list, both of which would go on showing a
-- booking nobody is going to complete.
--
-- Called by the same cron that widens dispatch waves.
CREATE OR REPLACE FUNCTION public.expire_unpaid_acceptances()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INT;
BEGIN
  WITH stale AS (
    SELECT l.id
    FROM booking_lines l
    WHERE l.status = 'accepted'
      AND COALESCE(l.accepted_at, l.dispatched_at)
          < now() - (unpaid_hold_minutes() || ' minutes')::interval
      -- Never one that has money against it. A HOLD means the webhook
      -- landed even if the status write did not, and cancelling that
      -- would be cancelling a paid booking.
      AND NOT EXISTS (
        SELECT 1 FROM escrow_ledger e WHERE e.line_id = l.id AND e.kind = 'HOLD'
      )
  )
  UPDATE booking_lines l
     SET status = 'expired',
         expires_at = NULL
    FROM stale
   WHERE l.id = stale.id;

  GET DIAGNOSTICS v_n = ROW_COUNT;

  -- Release the offers with them, so the partner's list clears too.
  UPDATE dispatch_offers o
     SET status = 'LOST'
    FROM booking_lines l
   WHERE l.id = o.line_id
     AND o.status = 'ACCEPTED'
     AND l.status = 'expired';

  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_unpaid_acceptances() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_acceptances() TO service_role;

COMMIT;
