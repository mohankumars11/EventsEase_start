-- ══════════════════════════════════════════════════════════════════════
-- 101 · Nothing a partner adds is live until somebody has read it
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 098 first.
-- Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT IS MISSING
-- ══════════════════════════════════════════════════════════════════════
--
-- A partner adds a service and `match_partners` can offer them a job on
-- it immediately. Nobody has read the row. The trade could be wrong, the
-- price could be a typo with an extra zero, the menus could be ticked by
-- somebody who has never cooked them.
--
-- `is_active` exists but means something else: it is the PARTNER hiding
-- a seasonal item. Reusing it for review would take a partner's own
-- switch away from them, and would tell a coordinator that a hidden
-- mango cake and an unchecked listing are the same thing.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THE GUARD IS IN match_partners AND NOT ONLY IN THE UI
-- ══════════════════════════════════════════════════════════════════════
--
-- A badge saying "under review" that does not stop dispatch is a label,
-- not a rule. The row would still be matched, the partner would still be
-- offered the job, and the only thing the badge would achieve is telling
-- them the app was lying to them.
--
-- So the state lives on the row, dispatch reads it, and the badge
-- describes something that is actually true.

BEGIN;

ALTER TABLE public.vendor_services
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'under_review';

ALTER TABLE public.vendor_services
  DROP CONSTRAINT IF EXISTS vendor_services_review_status_valid;
ALTER TABLE public.vendor_services
  ADD CONSTRAINT vendor_services_review_status_valid
  CHECK (review_status IN ('under_review', 'live', 'rejected'));

ALTER TABLE public.vendor_services
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_note TEXT;

COMMENT ON COLUMN public.vendor_services.review_status IS
  'under_review until an operator reads it. match_partners only matches live rows. NOT the same as is_active, which is the partner hiding their own item.';

-- ── Everything that already exists is live ───────────────────────────
--
-- 606 rows are already being matched and some of them have taken real
-- bookings. Defaulting them to under_review would take every partner on
-- the platform offline at once, which is a worse failure than the one
-- being fixed.
UPDATE public.vendor_services
SET review_status = 'live', reviewed_at = now()
WHERE review_status = 'under_review'
  AND created_at < now();

-- ── A partner may not approve themselves ─────────────────────────────
--
-- RLS lets a partner UPDATE their own vendor_services rows, which is
-- correct -- they edit prices and specs. Without this they could also
-- set review_status to 'live', and the review would be a formality
-- anybody could skip. 067 makes the same argument for vendor
-- verification.
CREATE OR REPLACE FUNCTION public.freeze_review_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role is the admin console and the API; it may set anything.
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
    NEW.review_status := OLD.review_status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_freeze_review_status ON public.vendor_services;
CREATE TRIGGER trg_freeze_review_status
  BEFORE UPDATE ON public.vendor_services
  FOR EACH ROW EXECUTE FUNCTION public.freeze_review_status();

-- ── Dispatch only matches what has been read ─────────────────────────
--
-- The one clause added to 060's function. Everything else is unchanged,
-- and is repeated here in full because CREATE OR REPLACE has no way to
-- amend one line.

CREATE OR REPLACE FUNCTION public.match_partners(
  p_trade       TEXT,
  p_point       extensions.geography,
  p_radius_m    INTEGER,
  p_date        DATE,
  p_allow_synthetic BOOLEAN DEFAULT FALSE,
  p_limit       INTEGER DEFAULT 5,
  p_exclude     UUID[] DEFAULT '{}'
)
RETURNS TABLE (vendor_id UUID, distance_m INTEGER, rating NUMERIC)
LANGUAGE sql STABLE
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
    AND ST_DWithin(v.location, p_point, p_radius_m)
    AND ST_DWithin(v.location, p_point, v.service_radius_km * 1000)
    -- Does this trade at all, on a row somebody has READ.
    AND EXISTS (
      SELECT 1 FROM vendor_services s
      WHERE s.vendor_id = v.id
        AND s.category = p_trade
        AND s.is_active = TRUE
        AND s.review_status = 'live'
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
    )
  ORDER BY COALESCE(v.rating_avg, 0) DESC, ST_Distance(v.location, p_point) ASC
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE INDEX IF NOT EXISTS idx_vendor_services_dispatch
  ON public.vendor_services (category, vendor_id)
  WHERE is_active = TRUE AND review_status = 'live';

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- HOW A LISTING GOES LIVE
-- ══════════════════════════════════════════════════════════════════════
--
--   update vendor_services set review_status = 'live', reviewed_at = now()
--   where id = '…';
--
-- From the admin console, or from the SQL editor until the console has a
-- button for it. A rejection takes 'rejected' and a `review_note`, which
-- the partner is shown -- a listing refused with no reason is a partner
-- who submits the same thing again.
