-- ══════════════════════════════════════════════════════════════════════
-- 147 · A paused trade stops getting offers
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 144, 145 and 146 first.
--
-- ══════════════════════════════════════════════════════════════════════
-- READ THIS BEFORE PASTING
-- ══════════════════════════════════════════════════════════════════════
--
-- This rebuilds `match_partners`, which decides who gets work. Migration
-- 134's header warns about exactly that, and the warning is earned: 126
-- rebuilt this function from the 082 body and silently dropped two gates
-- that 101 and 113 had added.
--
-- So this file adds ONE clause and changes nothing else. The body below
-- is 134's, copied whole, with a single new condition inside the trade
-- EXISTS. Diff it against 134 before pasting.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE BUG
-- ══════════════════════════════════════════════════════════════════════
--
-- `pauseListing()` (src/lib/partnerListings.js) writes
-- `partner_listings.status = 'paused'`. The partner sees the trade go
-- grey and reasonably concludes they will stop being offered that work.
--
-- `match_partners` has never read `partner_listings`. It tests
-- `vendor_services.category = p_trade AND s.is_active = TRUE` and
-- nothing else. So a partner who paused Catering on Friday because they
-- were away kept getting catering offers all weekend, and declining
-- them counted against their acceptance rate.
--
-- The same gap is where "this partner is not verified for THIS trade"
-- has to live, so both are closed by the same clause.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT THE NEW CLAUSE SAYS
-- ══════════════════════════════════════════════════════════════════════
--
-- A partner is eligible for a trade unless there is a listing row for
-- that trade saying otherwise. Written as NOT EXISTS rather than as a
-- join, deliberately:
--
--   a partner with no partner_listings row at all stays eligible
--
-- 120's own fallback notes that the table may not exist on every
-- database, and `fetchListings` has an "orphan" path for trades with
-- offerings but no container row. A join would silently stop
-- dispatching to every one of those partners the moment this is pasted,
-- which is precisely the kind of change 134 warns about.
--
-- The three statuses that stop work:
--   paused      the PARTNER stepped away from this trade
--   suspended   an operator took it down
--   hidden      not shown to customers, not the partner's doing
--
-- `draft`, `incomplete`, `under_review`, `requires_action` and
-- `rejected` deliberately do NOT stop dispatch here. That would be the
-- `review_status = 'live'` gate 126 dropped, and restoring it inside
-- this migration would change who gets work under cover of a bug fix --
-- the exact thing 134 declined to do. It stays out, and stays written
-- down, until it is its own decision with its own migration.
--
-- Re-runnable.

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
    -- ── NEW IN 147, and the only change from 134 ──────────────────
    -- A listing that is paused, suspended or hidden stops offers for
    -- THAT trade. No row means eligible; see the header.
    AND NOT EXISTS (
      SELECT 1 FROM partner_listings pl
      WHERE pl.vendor_id = v.id
        AND pl.trade = p_trade
        AND pl.status IN ('paused', 'suspended', 'hidden')
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

/**
 * Why is this partner not being offered this trade?
 *
 * The companion an operator needs. `match_partners` returns a list; it
 * cannot say why somebody is absent from it, and "why is Ravi not
 * getting catering jobs" is the commonest support question there is.
 *
 * Read-only, and it answers for one partner and one trade.
 */
CREATE OR REPLACE FUNCTION public.why_not_dispatched(
  p_vendor_id UUID,
  p_trade     TEXT,
  p_date      DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT jsonb_build_object(
    'located',        v.location IS NOT NULL,
    'approved',       v.is_verified,
    'accepting_jobs', v.accepting_jobs,
    'offers_trade',   EXISTS (SELECT 1 FROM vendor_services s
                               WHERE s.vendor_id = v.id AND s.category = p_trade
                                 AND s.is_active = TRUE),
    'listing_stopped', COALESCE((SELECT pl.status FROM partner_listings pl
                                  WHERE pl.vendor_id = v.id AND pl.trade = p_trade
                                    AND pl.status IN ('paused','suspended','hidden')
                                  LIMIT 1), NULL),
    'day_blocked',    p_date IS NOT NULL AND EXISTS (
                        SELECT 1 FROM vendor_availability a
                        WHERE a.vendor_id = v.id AND a.slot_date = p_date
                          AND a.status = 'BLOCKED'),
    'week_open',      p_date IS NULL OR public.weekday_is_open(v.id, p_date)
  )
  FROM vendors v WHERE v.id = p_vendor_id
$$;

REVOKE ALL ON FUNCTION public.why_not_dispatched(UUID, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.why_not_dispatched(UUID, TEXT, DATE) TO authenticated, service_role;

COMMIT;
