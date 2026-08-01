-- ═══════════════════════════════════════════════════════════════════
-- SAMBRAMO — Migration 006
-- Critical fix: Infinite recursion in RLS policies for profiles
-- Also: missing INSERT policies, anonymous event creation, vendor admin
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. SECURITY DEFINER role helper (breaks recursive RLS cycle) ──
-- Every admin-check policy previously did:
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
-- This triggered profiles RLS while already inside a profiles RLS policy → infinite loop.
-- This SECURITY DEFINER function bypasses RLS to safely read the caller's role.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- ── 2. Fix profiles RLS: drop recursive policy, replace it ───────
DROP POLICY IF EXISTS "Admins can view all profiles"  ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (get_my_role() IN ('admin', 'event_coordinator'));

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (get_my_role() IN ('admin', 'event_coordinator'));

-- ── 3. Fix migration 003 admin policies ──────────────────────────
DROP POLICY IF EXISTS "admin reads subscriptions" ON vendor_subscriptions;
CREATE POLICY "admin reads subscriptions"
  ON vendor_subscriptions FOR SELECT
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admin reads enquiries" ON service_enquiries;
CREATE POLICY "admin reads enquiries"
  ON service_enquiries FOR SELECT
  USING (get_my_role() IN ('admin', 'event_coordinator'));

-- ── 4. Fix migration 004 admin policies (all used recursive subquery) ──

DROP POLICY IF EXISTS "admins_all_events" ON events;
CREATE POLICY "admins_all_events" ON events FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins_all_event_services" ON event_services;
CREATE POLICY "admins_all_event_services" ON event_services FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins_all_vendor_options" ON event_vendor_options;
CREATE POLICY "admins_all_vendor_options" ON event_vendor_options FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins_all_proposals" ON event_proposals;
CREATE POLICY "admins_all_proposals" ON event_proposals FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins_all_proposal_items" ON event_proposal_items;
CREATE POLICY "admins_all_proposal_items" ON event_proposal_items FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins_all_change_requests" ON event_change_requests;
CREATE POLICY "admins_all_change_requests" ON event_change_requests FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins_all_tasks" ON event_tasks;
CREATE POLICY "admins_all_tasks" ON event_tasks FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins_all_issues" ON event_issues;
CREATE POLICY "admins_all_issues" ON event_issues FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins_all_internal_notes" ON event_internal_notes;
CREATE POLICY "admins_all_internal_notes" ON event_internal_notes FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins_all_payments" ON event_payments;
CREATE POLICY "admins_all_payments" ON event_payments FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

-- ── 5. Fix events INSERT: allow anonymous + authenticated ─────────
-- Old FOR ALL USING (auth.uid() = customer_id) → NULL = NULL = false for anon.
-- PlanningWizard is a public page; unauthenticated submissions must work.

DROP POLICY IF EXISTS "customers_own_events"      ON events;
DROP POLICY IF EXISTS "anyone_can_create_event"   ON events;

-- Authenticated customers can SELECT / UPDATE / DELETE their own events
CREATE POLICY "customers_own_events" ON events
  FOR ALL USING (auth.uid() IS NOT NULL AND customer_id = auth.uid());

-- Anyone (logged-in or anonymous) can INSERT an event
-- Authenticated: customer_id must equal their uid
-- Anonymous:     customer_id must be NULL
CREATE POLICY "anyone_can_create_event" ON events FOR INSERT
  WITH CHECK (customer_id IS NULL OR customer_id = auth.uid());

-- ── 6. Add missing customer INSERT on event_services ─────────────
-- Migration 004 only had FOR SELECT for customers.
-- PlanningWizard inserts service rows after creating the event.

DROP POLICY IF EXISTS "customers_insert_event_services" ON event_services;
CREATE POLICY "customers_insert_event_services" ON event_services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE id   = event_id
        AND (customer_id = auth.uid()
             OR (customer_id IS NULL AND auth.uid() IS NULL))
    )
  );

-- ── 7. Vendors table: admin full access + vendor self-insert ──────
DROP POLICY IF EXISTS "admins_all_vendors"  ON vendors;
DROP POLICY IF EXISTS "vendor_insert_own"   ON vendors;

CREATE POLICY "admins_all_vendors" ON vendors FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

CREATE POLICY "vendor_insert_own" ON vendors FOR INSERT
  WITH CHECK (profile_id = auth.uid());
