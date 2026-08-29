-- ══════════════════════════════════════════════════════════════════════
-- 086 · Ask the whole city, nearest first, and let the master decide
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 082 and 084 first.
--
-- Two radii were filtering every search, and both were losing supply
-- that wanted the work.
--
--   the customer's   5 km by default, widened by wave to 10 and 15
--   the master's     service_radius_km, 10 km by default
--
-- A partner was matched only if BOTH held. Measured on a real booking:
-- sariyo eventss in Vijayanagar sits 10.5 km from Koramangala and had
-- set a 10 km radius, so they were invisible for a job they would very
-- likely have driven to. Half a kilometre decided it, and nobody was
-- asked.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A DISTANCE LIMIT IS THE WRONG TOOL HERE
-- ══════════════════════════════════════════════════════════════════════
--
-- It is borrowed from food delivery, where it is correct: a dosa is
-- worth ₹80 and goes cold, so a 5 km cap protects the product.
--
-- An event is neither. A decorator earning ₹12,000 for a Saturday will
-- drive across Bengaluru and be glad of it. A photographer with an empty
-- Tuesday will go further than one who is busy. The willingness is not a
-- property of the distance — it is a property of the job, the day and
-- the money, and only the master knows all three.
--
-- So the radius stops being a FILTER and becomes INFORMATION. Every
-- master in the served area is asked, nearest first, and the offer card
-- already shows the distance. They accept or they pass, which is a
-- decision they are better placed to make than a number in a settings
-- screen they set once.
--
-- ── What still bounds it ────────────────────────────────────────────
-- Serviceability, not geometry. `pincodes.is_active` (085) says where
-- Sambramo operates, and dispatch never reaches beyond it. A hard cap
-- remains as a backstop so a data error cannot offer a Bengaluru job to
-- somebody in Mysuru — but it sits at city scale rather than at
-- neighbourhood scale.
--
-- ══════════════════════════════════════════════════════════════════════
-- WAVES STILL EXIST, AND NOW MEAN SOMETHING BETTER
-- ══════════════════════════════════════════════════════════════════════
--
-- They were "widen the circle". Widening a circle that no longer filters
-- is meaningless, so a wave is now "the next N nearest masters who have
-- not been asked yet".
--
-- That keeps the property waves were for — do not notify two hundred
-- people about one cake — while never excluding anyone. Wave one is the
-- five nearest; if none accepts, wave two is the next ten; and so on
-- outward, until the city is exhausted or somebody says yes.
--
-- Re-runnable, like every migration in this series.

BEGIN;

-- The backstop. City scale, not neighbourhood scale: far enough that no
-- willing master in Bengaluru is excluded, close enough that a corrupt
-- coordinate cannot offer a Koramangala birthday to a decorator in
-- Hyderabad.
CREATE OR REPLACE FUNCTION public.max_dispatch_radius_m()
RETURNS INT LANGUAGE SQL IMMUTABLE AS $$ SELECT 60000 $$;

-- `extensions` is not optional — PostGIS lives there on Supabase, and a
-- SECURITY DEFINER function pins its own search_path. See 082's header.
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
    AND (p_allow_synthetic OR v.is_synthetic = FALSE)
    AND NOT (v.id = ANY(p_exclude))

    -- ── One distance test, and it is a backstop rather than a filter ──
    -- The caller's radius is honoured only as far as the city-scale cap;
    -- a caller asking for 5 km no longer hides a master at 5.5 km who
    -- would have taken the job. The MASTER's own radius is not consulted
    -- at all any more — see the header.
    AND ST_DWithin(v.location, p_point, LEAST(GREATEST(p_radius_m, 1), max_dispatch_radius_m()))

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
    -- Not already committed that day. An unpaid acceptance holds the
    -- date only for the grace period — migration 082.
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

  -- ── Nearest first, rating second ───────────────────────────────────
  -- Reversed, and deliberately.
  --
  -- Rating led while the radius was doing the filtering: everyone
  -- returned was already close, so rating was the only thing left to
  -- sort on. With the whole city in scope, rating-first would offer a
  -- Whitefield decorator a Jayanagar job ahead of the one down the road,
  -- purely because the seeded network was generated with high ratings.
  --
  -- Distance now decides who is ASKED first, and a wave is "the next N
  -- nearest". Rating breaks ties, which is what it is good for.
  ORDER BY distance_m ASC, rating DESC
  LIMIT GREATEST(p_limit, 1)
$$;

REVOKE ALL ON FUNCTION public.match_partners(TEXT, GEOGRAPHY, INT, DATE, BOOLEAN, INT, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_partners(TEXT, GEOGRAPHY, INT, DATE, BOOLEAN, INT, UUID[]) TO authenticated, service_role;

COMMIT;
