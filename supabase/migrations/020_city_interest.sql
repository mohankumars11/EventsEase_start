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

-- DROP ... IF EXISTS before each CREATE so the whole file can be re-run.
-- CREATE TABLE takes IF NOT EXISTS but CREATE POLICY does not, so a first
-- attempt that failed partway (a stray line pasted above the SQL, a lost
-- connection) left the table and the first policy behind and then aborted
-- every retry with `42710: policy already exists` — leaving the second
-- policy uncreated and no obvious way forward short of hand-editing the
-- script. A migration you cannot safely run twice is a migration that
-- strands you the first time anything goes wrong.
DROP POLICY IF EXISTS "anyone_can_register_city_interest" ON city_interest_requests;
CREATE POLICY "anyone_can_register_city_interest" ON city_interest_requests FOR INSERT
  WITH CHECK (customer_id IS NULL OR customer_id = auth.uid());

DROP POLICY IF EXISTS "admin_reads_city_interest" ON city_interest_requests;
CREATE POLICY "admin_reads_city_interest" ON city_interest_requests FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
