-- ══════════════════════════════════════════════════════════════════════
-- 113 · Dispatch reaches the city again
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 101 and 112 first.
-- Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT HAPPENED
-- ══════════════════════════════════════════════════════════════════════
--
-- 101 needed to add one clause to match_partners: dispatch must only
-- match a listing somebody has read. Its own header says so —
--
--     "The one clause added to 060's function. Everything else is
--      unchanged, and is repeated here in full because CREATE OR REPLACE
--      has no way to amend one line."
--
-- The intent was right. The base was wrong. It copied the body from
-- 060 rather than from 086, which had already rewritten the same
-- function. So 101 shipped one deliberate addition and four silent
-- reversions, and has been the live definition ever since.
--
-- Nothing failed. No error was raised, no check went red, no route
-- 500'd. The function simply began offering work to a different — and
-- smaller — set of partners than the one the product had decided on.
-- That is why this went unnoticed: a dispatch regression does not look
-- like a bug, it looks like a quiet week.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE FOUR THINGS THAT CAME BACK, AND WHAT EACH ONE COSTS
-- ══════════════════════════════════════════════════════════════════════
--
-- ── 1 · service_radius_km became a hard filter again ─────────────────
--
--     AND ST_DWithin(v.location, p_point, v.service_radius_km * 1000)
--
-- This is the expensive one. 086 removed it and 088 wrote the decision
-- down in a column comment that is still on the table today:
--
--     "Since migration 086 this does not FILTER dispatch --
--      match_partners reaches the whole city and the real bound is
--      max_dispatch_radius_m()."
--
-- The column stayed as a record of what a partner said when they signed
-- up, on a form most of them filled in once and never opened again.
-- 101 turned that stale self-description back into a veto.
--
-- Measured against the live table on 2026-09-09: 133 of 223 verified
-- partners carry a radius under 12 km, and the platform's own bound is
-- 60 km. A caterer 14 km away who would happily take the job — who
-- takes jobs that far every week — cannot be offered it, because of a
-- number they typed during onboarding and have never seen since.
--
-- ── 2 · Ordering went back to rating-first ───────────────────────────
--
--     ORDER BY rating DESC, distance ASC
--
-- Defensible when the radius was tight: everyone returned was already
-- nearby, so rating was the only thing left to sort on. It stops being
-- defensible the moment the pool is the whole city. Combined with a
-- seeded network generated with uniformly high ratings, rating-first
-- offers a Whitefield decorator a Jayanagar job ahead of the one down
-- the road, on a rating difference that is noise.
--
-- Distance decides who is ASKED first; rating breaks ties, which is
-- what a rating is actually good for.
--
-- ── 3 · The unpaid-hold grace clause was dropped ─────────────────────
--
-- 082 says an acceptance that was never paid for holds the date for
-- unpaid_hold_minutes() — 45 in production — and then lets go. 086 put
-- that into the double-booking guard. 101's copy has the bare version:
--
--     AND o.status = 'ACCEPTED' AND l.status NOT IN ('cancelled','expired')
--
-- So a partner who tapped Accept and never completed payment is held
-- against that date FOREVER. Not for 45 minutes — permanently, for
-- every future job on that date. The hold expiry that 082 built is
-- simply not consulted. This silently retires partners from days they
-- are free for, and the longer it runs the more of them it takes.
--
-- ── 4 · SECURITY DEFINER was lost ────────────────────────────────────
--
-- 086 had it; 101 does not. This one is latent rather than live: the
-- only caller is api/dispatch-waves.js on the service role, which
-- bypasses RLS regardless. But the function is granted to `authenticated`
-- as well, and without SECURITY DEFINER an authenticated caller reads
-- dispatch_offers and booking_lines through their own RLS — where they
-- can see none of it. The NOT EXISTS double-booking guard would find
-- nothing to object to and pass every time.
--
-- A guard that returns "clear" because it cannot see is worse than no
-- guard, and it is one GRANT away from being real. Restored.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT IS KEPT FROM 101
-- ══════════════════════════════════════════════════════════════════════
--
-- The review_status gate, which was the point of 101 and is correct:
-- dispatch only matches a listing an operator has read. It is carried
-- forward here unchanged, along with 101's partial index that supports
-- it. This migration reverses none of 101's intent — only the four
-- things it changed without meaning to.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THE WHOLE BODY IS REPEATED, AGAIN
-- ══════════════════════════════════════════════════════════════════════
--
-- Same reason 101 gave: CREATE OR REPLACE cannot amend one line. That
-- property is exactly what caused this, and it will cause it again.
-- The guard against a third occurrence is that there is now only one
-- correct base to copy — this file — and 086 and 060 are history.
--
-- The signature is unchanged from both 086 and 101, so this REPLACEs in
-- place: no DROP, no dependent object to rebuild, no window in which
-- dispatch has no function to call.

BEGIN;

CREATE OR REPLACE FUNCTION public.match_partners(
  p_trade           TEXT,
  p_point           extensions.geography,
  p_radius_m        INTEGER,
  p_date            DATE,
  p_allow_synthetic BOOLEAN DEFAULT FALSE,
  p_limit           INTEGER DEFAULT 5,
  p_exclude         UUID[]  DEFAULT '{}'
)
RETURNS TABLE (vendor_id UUID, distance_m INTEGER, rating NUMERIC)
LANGUAGE sql
STABLE
-- Restored from 086. The double-booking guard below reads dispatch_offers
-- and booking_lines; without this it reads them through the caller's RLS.
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
    -- Default FALSE, so a caller that forgets the argument gets real
    -- partners only -- the safe direction to fail.
    AND (p_allow_synthetic OR v.is_synthetic = FALSE)
    AND NOT (v.id = ANY(p_exclude))

    -- ── One distance test, not two ───────────────────────────────────
    -- The caller's radius is honoured, bounded by the city-scale cap so
    -- a wave cannot ask past what the platform actually serves. The
    -- PARTNER's own service_radius_km is deliberately NOT consulted --
    -- see the header, and the comment 088 left on booking_requests.
    AND ST_DWithin(v.location, p_point,
                   LEAST(GREATEST(p_radius_m, 1), max_dispatch_radius_m()))

    -- Does this trade, on a row somebody has READ. (101, kept.)
    AND EXISTS (
      SELECT 1 FROM vendor_services s
      WHERE s.vendor_id = v.id
        AND s.category = p_trade
        AND s.is_active = TRUE
        AND s.review_status = 'live'
    )

    -- Not blocked that day. A partner with NO row for the date is
    -- available: vendor_availability records exceptions, not a full
    -- calendar, and requiring a row would make every partner who has
    -- never opened the calendar undispatchable.
    AND NOT EXISTS (
      SELECT 1 FROM vendor_availability a
      WHERE a.vendor_id = v.id
        AND a.slot_date = p_date
        AND (a.status = 'BLOCKED'
             OR (a.status = 'LIMITED' AND a.slots_total IS NOT NULL
                 AND a.slots_booked >= a.slots_total))
    )

    -- Not already committed that day. An unpaid acceptance holds the
    -- date only for the grace period -- migration 082. Restored from 086.
    AND NOT EXISTS (
      SELECT 1
      FROM dispatch_offers o
      JOIN booking_lines l    ON l.id = o.line_id
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

  -- ── Nearest first, rating second ───────────────────────────────────
  -- With the whole city in scope, distance decides who is ASKED first
  -- and a wave is "the next N nearest". Rating breaks ties.
  --
  -- Still rating and distance only: no paid placement, which
  -- src/config/legal.js records as a standing promise.
  ORDER BY distance_m ASC, rating DESC
  LIMIT GREATEST(p_limit, 1)
$$;

-- 101's index, restated so this file stands alone. It supports the
-- review_status gate above.
CREATE INDEX IF NOT EXISTS idx_vendor_services_dispatch
  ON public.vendor_services (category, vendor_id)
  WHERE is_active = TRUE AND review_status = 'live';

REVOKE ALL ON FUNCTION public.match_partners(TEXT, extensions.geography, INTEGER, DATE, BOOLEAN, INTEGER, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_partners(TEXT, extensions.geography, INTEGER, DATE, BOOLEAN, INTEGER, UUID[]) TO authenticated, service_role;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- AFTERWARDS
-- ══════════════════════════════════════════════════════════════════════
--
-- Two doc comments in the app describe the OLD ordering and are updated
-- in the same change as this file:
--   src/config/partnerPlans.js  · "sorts by rating then distance"
--   src/config/legal.js         · "orders by rating and distance"
-- Neither is code. Both are promises about what is not for sale, and
-- both remain true -- they just now name the right order.
--
-- To see the effect, count who becomes reachable again:
--
--   SELECT count(*) FROM vendors
--    WHERE is_verified AND location IS NOT NULL
--      AND service_radius_km * 1000 < max_dispatch_radius_m();
