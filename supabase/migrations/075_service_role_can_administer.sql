-- ============================================================
-- 075 · The service role is the platform, and must be able to act as it
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 066, 067 and 070 FIRST.
-- Re-runnable: three CREATE OR REPLACE, no data touched.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE GAP
-- ══════════════════════════════════════════════════════════════════════
--
-- `get_my_role()` (migration 006) answers "what is the caller's role?" by
-- reading `profiles` for `auth.uid()`. For a SERVICE ROLE connection
-- there is no `auth.uid()` — it is not a user, it is the platform — so
-- the function returns NULL.
--
-- Every admin gate in this series is written as
-- `get_my_role() IN ('admin','event_coordinator')`, which NULL fails. So:
--
--   · `set_vendor_verification()` returns not_permitted
--   · `guard_vendor_self_verify()` treats the platform as a partner and
--     silently pins `is_verified` back to its old value
--   · `set_vendor_location()` falls through to the ownership branch and
--     compares NULL to NULL
--
-- The result is that NO server-side automation can approve a partner.
-- Not the onboarding script, not a bulk import, not a cron, not the
-- admin API route this will eventually have. And it fails QUIETLY in the
-- guard's case — the UPDATE succeeds, the row simply does not change,
-- which is the worst possible shape for a permissions bug.
--
-- ── Why widening this is safe ────────────────────────────────────────
-- The service-role key never reaches a browser. It is unprefixed in
-- `.env` precisely so Vite cannot bundle it (only `VITE_` variables are
-- exposed), and anything holding it can already bypass RLS entirely by
-- construction. Recognising it here grants nothing it did not have — it
-- just stops the platform being treated as a stranger to itself.
--
-- `auth.role()` reads the JWT's `role` claim, which Supabase sets to
-- `service_role` for that key and `authenticated` for a signed-in user.
-- A user cannot forge it: the claim is signed.
-- ============================================================

BEGIN;

-- ── One place that answers "is the caller allowed to administer?" ────
-- Replaces the repeated `get_my_role() IN (...)` so a future gate cannot
-- forget the service-role case the way every gate above did.
CREATE OR REPLACE FUNCTION public.caller_is_operator()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(auth.role() = 'service_role', FALSE)
      OR COALESCE(get_my_role() IN ('admin', 'event_coordinator'), FALSE)
$$;

COMMENT ON FUNCTION public.caller_is_operator IS
  'True for an admin, a coordinator, or the platform itself (service role).';

-- ══════════════════════════════════════════════════════════════════════
-- The three functions that were locking the platform out
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_vendor_verification(
  p_vendor_id UUID,
  p_status    TEXT,
  p_note      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  IF p_status NOT IN ('approved','rejected','suspended','submitted','draft') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_status');
  END IF;

  UPDATE vendors
     SET verification_status = p_status,
         is_verified         = (p_status = 'approved'),
         verification_note   = p_note,
         verified_by         = CASE WHEN p_status = 'approved' THEN auth.uid() ELSE verified_by END,
         verified_at         = CASE WHEN p_status = 'approved' THEN now()      ELSE verified_at END
   WHERE id = p_vendor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Suspending does NOT touch work already accepted: those lines are
  -- paid for and a family is expecting somebody. They stop receiving NEW
  -- offers, which match_partners() enforces on the next dispatch.
  RETURN jsonb_build_object('ok', true, 'status', p_status);
END;
$$;

-- The guard. This is the one that failed silently.
CREATE OR REPLACE FUNCTION public.guard_vendor_self_verify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN
    RETURN NEW;
  END IF;

  -- A partner may move draft → submitted, and nothing else.
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT (OLD.verification_status IN ('draft','rejected')
            AND NEW.verification_status = 'submitted') THEN
      RAISE EXCEPTION
        'verification_status % is set by review, not by the partner', NEW.verification_status
        USING HINT = 'A partner may submit for review. Only an operator approves.';
    END IF;
    NEW.submitted_at := now();
  END IF;

  NEW.is_verified  := OLD.is_verified;
  NEW.verified_by  := OLD.verified_by;
  NEW.verified_at  := OLD.verified_at;
  NEW.is_featured  := OLD.is_featured;
  NEW.is_synthetic := OLD.is_synthetic;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_vendor_location(
  p_vendor_id UUID,
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
  IF NOT public.caller_is_operator() THEN
    -- A partner may set their OWN location and nobody else's.
    SELECT profile_id INTO v_owner FROM vendors WHERE id = p_vendor_id;
    -- `IS NOT DISTINCT FROM` would make NULL = NULL true, which for a
    -- synthetic partner (profile_id NULL) and an anonymous caller
    -- (auth.uid() NULL) means anybody could move a seeded business.
    IF v_owner IS NULL OR auth.uid() IS NULL OR v_owner <> auth.uid() THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
    END IF;
  END IF;

  v_point := public.point_of(p_lat, p_lng);
  IF v_point IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'out_of_range',
      'detail', 'Coordinate is outside India — check latitude and longitude are the right way round.');
  END IF;

  UPDATE vendors SET location = v_point WHERE id = p_vendor_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Same NULL-equality hazard on the booking side.
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
  IF NOT public.caller_is_operator() THEN
    SELECT customer_id INTO v_owner FROM booking_requests WHERE id = p_request_id;
    IF v_owner IS NULL OR auth.uid() IS NULL OR v_owner <> auth.uid() THEN
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

REVOKE ALL ON FUNCTION public.caller_is_operator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caller_is_operator() TO authenticated, service_role;

COMMIT;
