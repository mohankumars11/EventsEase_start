-- ══════════════════════════════════════════════════════════════════════
-- 100 · A partner proposed a venue and does not own it
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 094 first.
-- Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT HAPPENED, ON THE LIVE DATABASE
-- ══════════════════════════════════════════════════════════════════════
--
--   venues           TTD kalyana · mantapa · Malleshwaram · pending_review
--   venue_managers   (nothing)
--   venue_spaces     (nothing)
--
-- Somebody added their kalyana mantapa through the partner app. The venue
-- row was written. The row that says it is THEIRS was not.
--
-- `proposeVenue` in src/lib/venues.js did two inserts from the browser:
-- the venue, then the claim. The second one failed and its error was
-- never checked, so the app said "Sent for checking" and moved on.
--
-- The result is a venue nobody owns, invisible to the person who created
-- it -- the claim search only looks at `unclaimed`, and this is
-- `pending_review` -- and unreachable by any other partner. A dead row,
-- and a manager who believes they have listed their venue and has not.
--
-- ══════════════════════════════════════════════════════════════════════
-- TWO WRITES FROM A BROWSER CAN ALWAYS HALF-FAIL
-- ══════════════════════════════════════════════════════════════════════
--
-- Checking the second error would have surfaced this one, and it is
-- being fixed in the client too. But it would not have prevented it: a
-- phone that loses signal between two requests produces exactly this
-- state, and no amount of error handling in the browser makes two
-- statements atomic.
--
-- So proposing a venue becomes one function and one transaction. Either
-- the venue and the claim both exist, or neither does. This is the same
-- reasoning `create_booking_request` already applies to a booking and its
-- point -- see 060.

BEGIN;

-- ── 1 · The orphan, adoptable ────────────────────────────────────────
--
-- `venues` records no author, so there is no way to know who added TTD
-- kalyana. Rather than guess, it is made claimable: a pending venue with
-- no owner is exactly what the claim search should offer, and whoever
-- added it will find it by typing its name.
--
-- Which means the claim search must look at pending_review too. That is
-- a change in src/lib/venues.js; this migration only makes sure the rows
-- it will find are honest ones.

-- Nothing to alter -- the fix is in the client query. This block exists
-- so the reasoning sits next to the function below rather than only in a
-- commit message.

-- ── 2 · One transaction ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.propose_venue(
  p_vendor_id    UUID,
  p_name         TEXT,
  p_venue_kind   TEXT,
  p_area_label   TEXT DEFAULT NULL,
  p_pincode      TEXT DEFAULT NULL,
  p_address_line TEXT DEFAULT NULL,
  p_lat          DOUBLE PRECISION DEFAULT NULL,
  p_lng          DOUBLE PRECISION DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- The caller must own the vendor they are claiming as. SECURITY DEFINER
  -- bypasses RLS, so this check IS the authorisation -- without it any
  -- signed-in person could file a venue under somebody else's business.
  IF NOT EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = p_vendor_id AND v.profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not your business';
  END IF;

  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'a venue needs a name';
  END IF;

  INSERT INTO venues (name, venue_kind, area_label, pincode, address_line,
                      lat, lng, source, status)
  VALUES (btrim(p_name), COALESCE(p_venue_kind, 'hall'), p_area_label,
          NULLIF(btrim(COALESCE(p_pincode, '')), ''),
          NULLIF(btrim(COALESCE(p_address_line, '')), ''),
          p_lat, p_lng, 'partner', 'pending_review')
  RETURNING id INTO v_id;

  INSERT INTO venue_managers (vendor_id, venue_id, role)
  VALUES (p_vendor_id, v_id, 'OWNER');

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.propose_venue(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.propose_venue(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated, service_role;

COMMENT ON FUNCTION public.propose_venue IS
  'Adds a venue and its OWNER claim in one transaction. Two writes from a browser can half-fail, and one already did: TTD kalyana existed with no manager.';

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- WHAT IS LEFT TO THE CLIENT
-- ══════════════════════════════════════════════════════════════════════
--
-- src/lib/venues.js calls this instead of two inserts, and its claim
-- search widens to include `pending_review` venues that nobody owns, so
-- the existing orphan can be picked up by whoever added it.
