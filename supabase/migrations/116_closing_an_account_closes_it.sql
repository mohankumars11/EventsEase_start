-- ══════════════════════════════════════════════════════════════════════
-- 116 · Closing an account closes it
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 112 first. Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE REPORTED BUG, AND WHY IT IS THREE BUGS
-- ══════════════════════════════════════════════════════════════════════
--
-- An operator closes a partner's account in the console. The partner
-- opens the app and carries on: edits listings, sets their calendar,
-- changes their payout details. Nothing stops them.
--
-- Three separate failures, each sufficient on its own:
--
--   1  The RPC writes `verification_status = 'suspended'`. The partner
--      app checks `vendors.suspended_at`, which the RPC never touches.
--      So the suspension banner does not even render -- the partner is
--      shown "Not verified, no jobs are sent yet", which reads like an
--      onboarding step they have not finished.
--
--   2  Nothing gates the app. ProtectedRoute tests `profiles.role` and
--      nothing else, and VendorDashboard has no suspended branch.
--      `VENDOR_STATUS.SUSPENDED.blocking` is decoration: it decides a
--      margin.
--
--   3  RLS permits every write. `vendor_manages_own_services` is FOR ALL
--      with no status test. So even a perfect UI gate would be one
--      PostgREST call away from being bypassed, and a UI-only fix to a
--      permission problem is not a fix.
--
-- This file is (1) and (3). The gate is in the app, where it belongs.
--
-- ══════════════════════════════════════════════════════════════════════
-- AND ONE THAT NOBODY REPORTED
-- ══════════════════════════════════════════════════════════════════════
--
-- 083 suspends a partner who cancels three paid jobs, by writing
-- `is_verified = FALSE` and leaving `verification_status` alone. 078's
-- BEFORE UPDATE trigger then recomputes, unconditionally:
--
--   NEW.is_verified := (NEW.verification_status = 'approved');
--
-- -- which puts it straight back to TRUE, in the same statement. And
-- `match_partners` gates on `is_verified` and nothing else.
--
-- So the three-strike suspension has never stopped a single offer. 078's
-- own comment says "a suspended partner cannot be matched: is_verified
-- is set FALSE above". That has been false since the day it was written.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · One suspension, one pair of columns
-- ══════════════════════════════════════════════════════════════════════
--
-- Two mechanisms wrote two disjoint column sets and the UI read only
-- one. `verification_status` stays the source of truth -- 078 settled
-- that -- and `suspended_at`/`suspended_reason` become what they always
-- read as: when, and why. Set together or not at all.
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
DECLARE
  v_listings INTEGER := 0;
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
         verified_at         = CASE WHEN p_status = 'approved' THEN now()      ELSE verified_at END,
         -- The pair the partner app actually reads. Stamped on the way
         -- in and cleared on the way out, so "suspended_at IS NOT NULL"
         -- and "verification_status = 'suspended'" can never disagree.
         suspended_at        = CASE WHEN p_status = 'suspended' THEN COALESCE(suspended_at, now()) ELSE NULL END,
         suspended_reason    = CASE WHEN p_status = 'suspended' THEN COALESCE(p_note, suspended_reason) ELSE NULL END,
         -- A closure that has been acted on is no longer a request.
         -- Leaving it set left the partner a "Keep my account" button
         -- that quietly removed them from the operator's queue while
         -- their account stayed shut.
         closure_requested_at = CASE WHEN p_status = 'suspended' THEN NULL ELSE closure_requested_at END,
         closure_reason       = CASE WHEN p_status = 'suspended' THEN NULL ELSE closure_reason END
   WHERE id = p_vendor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF p_status = 'approved' THEN
    UPDATE vendor_services
       SET review_status = 'live',
           reviewed_at   = now()
     WHERE vendor_id = p_vendor_id
       AND review_status = 'under_review';
    GET DIAGNOSTICS v_listings = ROW_COUNT;
  END IF;

  -- Suspending still does NOT touch work already accepted: those lines
  -- are paid for and a family is expecting somebody.
  RETURN jsonb_build_object(
    'ok', true,
    'status', p_status,
    'listings_made_live', v_listings
  );
END $$;

REVOKE ALL ON FUNCTION public.set_vendor_verification(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_vendor_verification(UUID, TEXT, TEXT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 2 · Three strikes now actually suspends
-- ══════════════════════════════════════════════════════════════════════
--
-- Write the source of truth instead of the column derived from it. 078's
-- trigger then derives is_verified = FALSE rather than reverting it, and
-- match_partners stops returning them on the next dispatch.
CREATE OR REPLACE FUNCTION public.suspend_for_strikes(
  p_vendor_id UUID,
  p_reason    TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE vendors
     SET verification_status = 'suspended',
         suspended_at        = COALESCE(suspended_at, now()),
         suspended_reason    = p_reason,
         verification_note   = p_reason
   WHERE id = p_vendor_id
     AND verification_status <> 'suspended';
$$;

COMMENT ON FUNCTION public.suspend_for_strikes IS
  'The reliability path (083) used to write is_verified = FALSE directly, '
  'which 078''s trigger reverted in the same statement -- so three-strike '
  'suspension never stopped a single offer. Writing verification_status '
  'lets the trigger derive is_verified correctly.';

-- ══════════════════════════════════════════════════════════════════════
-- 3 · A closed account cannot write
-- ══════════════════════════════════════════════════════════════════════
--
-- The screen in the app is the part a partner sees. THIS is the part
-- that makes it true. `vendor_manages_own_services` was FOR ALL with no
-- status test, so a suspended partner with devtools open could add a
-- listing over PostgREST while the app showed them a closed door.
--
-- ── Reads stay open, deliberately ───────────────────────────────────
-- A closed partner may still SEE their listings, their calendar and
-- their documents. Taking the data away as well as the access turns a
-- reversible suspension into something that feels like deletion, and
-- somebody appealing a closure needs to be able to look at what they
-- had. They simply cannot change any of it.
--
-- Split into SELECT (open) and write (gated) rather than one FOR ALL,
-- because FOR ALL cannot express that.

/* A vendor row belonging to the caller that is NOT suspended. One
   predicate, used by all three tables below, so there is one place to
   read and one place to be wrong. */
CREATE OR REPLACE FUNCTION public.owns_active_vendor(p_vendor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vendors
     WHERE id = p_vendor_id
       AND profile_id = auth.uid()
       AND verification_status <> 'suspended'
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_vendor(p_vendor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vendors WHERE id = p_vendor_id AND profile_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.owns_active_vendor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_vendor(UUID)        TO authenticated;

-- ── vendor_services ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "vendor_manages_own_services" ON public.vendor_services;

DROP POLICY IF EXISTS "vendor_reads_own_services" ON public.vendor_services;
CREATE POLICY "vendor_reads_own_services" ON public.vendor_services
  FOR SELECT USING (public.owns_vendor(vendor_id));

DROP POLICY IF EXISTS "active_vendor_writes_own_services" ON public.vendor_services;
CREATE POLICY "active_vendor_writes_own_services" ON public.vendor_services
  FOR INSERT WITH CHECK (public.owns_active_vendor(vendor_id));

DROP POLICY IF EXISTS "active_vendor_updates_own_services" ON public.vendor_services;
CREATE POLICY "active_vendor_updates_own_services" ON public.vendor_services
  FOR UPDATE USING (public.owns_active_vendor(vendor_id))
         WITH CHECK (public.owns_active_vendor(vendor_id));

DROP POLICY IF EXISTS "active_vendor_deletes_own_services" ON public.vendor_services;
CREATE POLICY "active_vendor_deletes_own_services" ON public.vendor_services
  FOR DELETE USING (public.owns_active_vendor(vendor_id));

-- ── vendor_availability ─────────────────────────────────────────────
DROP POLICY IF EXISTS "vendor_manages_own_availability" ON public.vendor_availability;

DROP POLICY IF EXISTS "vendor_reads_own_availability" ON public.vendor_availability;
CREATE POLICY "vendor_reads_own_availability" ON public.vendor_availability
  FOR SELECT USING (public.owns_vendor(vendor_id));

DROP POLICY IF EXISTS "active_vendor_writes_own_availability" ON public.vendor_availability;
CREATE POLICY "active_vendor_writes_own_availability" ON public.vendor_availability
  FOR INSERT WITH CHECK (public.owns_active_vendor(vendor_id));

DROP POLICY IF EXISTS "active_vendor_updates_own_availability" ON public.vendor_availability;
CREATE POLICY "active_vendor_updates_own_availability" ON public.vendor_availability
  FOR UPDATE USING (public.owns_active_vendor(vendor_id))
         WITH CHECK (public.owns_active_vendor(vendor_id));

DROP POLICY IF EXISTS "active_vendor_deletes_own_availability" ON public.vendor_availability;
CREATE POLICY "active_vendor_deletes_own_availability" ON public.vendor_availability
  FOR DELETE USING (public.owns_active_vendor(vendor_id));

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- CHECK IT
-- ══════════════════════════════════════════════════════════════════════
--
--   -- after closing somebody in the console, all three must agree
--   SELECT business_name, verification_status, suspended_at IS NOT NULL AS stamped,
--          closure_requested_at IS NULL AS request_cleared
--     FROM vendors WHERE verification_status = 'suspended';
--
--   -- and, signed in AS that partner, this must write nothing:
--   --   update vendor_services set price = 1 where vendor_id = '<theirs>';
