-- ============================================================
-- 074 · Fix infinite recursion between booking_lines and dispatch_offers
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057–073 FIRST.
--
-- ⚠ WITHOUT THIS, THE CUSTOMER'S MATCHING SCREEN RETURNS NOTHING.
--   Every authenticated read of `booking_lines` fails with
--   "infinite recursion detected in policy for relation booking_lines".
--
-- ══════════════════════════════════════════════════════════════════════
-- HOW IT HAPPENED
-- ══════════════════════════════════════════════════════════════════════
--
-- Two policies, each perfectly reasonable on its own, that reference each
-- other's table:
--
--   booking_lines  · "partners read offered lines"
--       EXISTS (SELECT 1 FROM dispatch_offers o … WHERE o.line_id = id)
--
--   dispatch_offers · "customers read offers on own lines"
--       EXISTS (SELECT 1 FROM booking_lines l … WHERE l.id = line_id)
--
-- Reading a line evaluates its policy, which reads dispatch_offers, which
-- evaluates ITS policy, which reads booking_lines, which evaluates its
-- policy… Postgres detects the cycle and raises rather than hanging.
--
-- This is exactly what migration 006 hit on `profiles` — an admin-check
-- policy that queried `profiles` from inside a `profiles` policy — and
-- the fix is the same one, for the same reason.
--
-- ── Why it was invisible until now ───────────────────────────────────
-- Everything up to this point ran as the SERVICE ROLE, which bypasses
-- RLS entirely. The dispatcher, the seeder, the invariant checks and the
-- scenario runner all worked perfectly and none of them ever evaluated a
-- policy. The recursion only appears for a real signed-in customer —
-- which is to say, in production, for everybody.
--
-- That is worth remembering: a service-role test proves the DATA is
-- right and proves nothing at all about whether a user can read it.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE FIX
-- ══════════════════════════════════════════════════════════════════════
--
-- SECURITY DEFINER helpers answer the ownership questions with RLS
-- bypassed, so a policy never triggers another policy. Each is STABLE
-- and takes only a row id, so the planner can cache it per statement.
--
-- The policies then read as plain English — `line_belongs_to_caller(id)`
-- — which is also the point: a policy nobody can read is a policy nobody
-- can audit.
-- ============================================================

BEGIN;

-- ── Does the caller own the booking this line belongs to? ────────────
CREATE OR REPLACE FUNCTION public.line_belongs_to_caller(p_line_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM booking_lines l
    JOIN booking_requests r ON r.id = l.request_id
    WHERE l.id = p_line_id AND r.customer_id = auth.uid()
  )
$$;

-- ── Was this line offered to the caller's business? ──────────────────
-- Any offer, in any state. A master who was asked and lost still gets to
-- see what they were asked about — their own history is theirs.
CREATE OR REPLACE FUNCTION public.line_offered_to_caller(p_line_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM dispatch_offers o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.line_id = p_line_id AND v.profile_id = auth.uid()
  )
$$;

-- ── Did the caller WIN this line? ────────────────────────────────────
-- Narrower than the above, and used where the answer must be "the master
-- actually doing this job" — escrow, disputes, contact release.
CREATE OR REPLACE FUNCTION public.line_won_by_caller(p_line_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM booking_lines l
    JOIN dispatch_offers o ON o.id = l.accepted_offer_id
    JOIN vendors v ON v.id = o.vendor_id
    WHERE l.id = p_line_id AND v.profile_id = auth.uid()
  )
$$;

-- ── Does the caller own this request? ────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_belongs_to_caller(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM booking_requests r
    WHERE r.id = p_request_id AND r.customer_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.line_belongs_to_caller(UUID)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.line_offered_to_caller(UUID)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.line_won_by_caller(UUID)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_belongs_to_caller(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.line_belongs_to_caller(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.line_offered_to_caller(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.line_won_by_caller(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_belongs_to_caller(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- booking_lines
-- ══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "customers read own booking lines"   ON booking_lines;
CREATE POLICY "customers read own booking lines"
  ON booking_lines FOR SELECT
  USING (request_belongs_to_caller(request_id));

DROP POLICY IF EXISTS "customers create own booking lines" ON booking_lines;
CREATE POLICY "customers create own booking lines"
  ON booking_lines FOR INSERT
  WITH CHECK (request_belongs_to_caller(request_id));

-- This was the recursive one.
DROP POLICY IF EXISTS "partners read offered lines" ON booking_lines;
CREATE POLICY "partners read offered lines"
  ON booking_lines FOR SELECT
  USING (line_offered_to_caller(id));

-- ══════════════════════════════════════════════════════════════════════
-- dispatch_offers
-- ══════════════════════════════════════════════════════════════════════
-- And this was the other half of the cycle.
DROP POLICY IF EXISTS "customers read offers on own lines" ON dispatch_offers;
CREATE POLICY "customers read offers on own lines"
  ON dispatch_offers FOR SELECT
  USING (line_belongs_to_caller(line_id));

-- Unchanged in meaning: `vendors` has no policy that reads
-- dispatch_offers, so this one was never part of a cycle.
DROP POLICY IF EXISTS "partners read own offers" ON dispatch_offers;
CREATE POLICY "partners read own offers"
  ON dispatch_offers FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

-- ══════════════════════════════════════════════════════════════════════
-- escrow_ledger — same cycle, one table further out
-- ══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "customers read own escrow" ON escrow_ledger;
CREATE POLICY "customers read own escrow"
  ON escrow_ledger FOR SELECT
  USING (line_belongs_to_caller(line_id));

DROP POLICY IF EXISTS "partners read own escrow" ON escrow_ledger;
CREATE POLICY "partners read own escrow"
  ON escrow_ledger FOR SELECT
  USING (line_won_by_caller(line_id));

-- ══════════════════════════════════════════════════════════════════════
-- disputes — both sides, both through helpers
-- ══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "parties read own disputes" ON disputes;
CREATE POLICY "parties read own disputes"
  ON disputes FOR SELECT
  USING (
    raiser_id = auth.uid()
    OR line_belongs_to_caller(line_id)
    OR line_won_by_caller(line_id)
  );

DROP POLICY IF EXISTS "parties raise disputes" ON disputes;
CREATE POLICY "parties raise disputes"
  ON disputes FOR INSERT
  WITH CHECK (
    raiser_id = auth.uid()
    AND (
      (raised_by = 'customer' AND line_belongs_to_caller(line_id))
      OR
      (raised_by = 'partner'  AND line_won_by_caller(line_id))
    )
  );

-- ══════════════════════════════════════════════════════════════════════
-- Check it as a real user, not as the service role
-- ══════════════════════════════════════════════════════════════════════
--
-- The service role bypasses RLS, so it can never surface this class of
-- bug. Impersonate instead:
--
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"<a-customer-uuid>","role":"authenticated"}';
--   SELECT count(*) FROM booking_lines;      -- must not raise 42P17
--   SELECT count(*) FROM dispatch_offers;    -- must not raise 42P17
--   RESET ROLE;

COMMIT;
