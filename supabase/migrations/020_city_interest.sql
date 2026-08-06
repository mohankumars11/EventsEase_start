-- ============================================================
-- Migration 020: City interest requests (pilot-launch waitlist).
--
-- Sambramo launches in Bengaluru and Mysore only. Everywhere a customer
-- picks a city outside that pilot, the frontend now shows a "notify me"
-- form instead of letting the booking proceed. This table captures those
-- votes so demand can be reviewed per city in the admin dashboard.
--
-- Guests (no account) can register interest, same precedent as the
-- anonymous `events` insert policy in migration 007 — customer_id is
-- nullable, and the check allows either NULL or the caller's own id.
-- Only admins can read the list.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS city_interest_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  city        TEXT NOT NULL,
  source      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE city_interest_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_register_city_interest" ON city_interest_requests FOR INSERT
  WITH CHECK (customer_id IS NULL OR customer_id = auth.uid());

CREATE POLICY "admin_reads_city_interest" ON city_interest_requests FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
