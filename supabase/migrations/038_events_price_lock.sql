-- ============================================================
-- Migration 038: the price lock, on the wizard's table too.
--
-- Migration 034 added lock columns to `service_enquiries`, which is what the
-- celebration builder and the enquiry cart write to. The six-step wizard
-- (/plan/custom) writes to `events` instead and finishes on its own
-- confirmation page — so the hold was offered on two of the three endings and
-- had nowhere to be recorded on the third.
--
-- ── Deliberately NOT mirroring 034's trigger ────────────────────────────
-- `service_enquiries` carries enforce_enquiry_self_update(), which allows a
-- customer exactly one narrow update to their own row; 034 had to widen it or
-- the claim would have raised at the last tap. `events` has no such trigger —
-- policy "customers_own_events" (migration 006) is FOR ALL, so an
-- authenticated customer can already update their own event. Nothing to
-- widen, and inventing a trigger here would be a new restriction dressed up
-- as a fix.
--
-- What is worth keeping identical is the vocabulary: 'claimed' is what the
-- customer pressed, 'confirmed' is what an admin saw in the bank. UPI here is
-- a deep link with no callback (lib/payment/upiProvider.js), so the app cannot
-- know a payment arrived, and a column called `paid` would be read as truth by
-- the next person to write a query against it.
--
-- The app degrades without this: PlanConfirmation logs the 42703 and still
-- shows the customer the honest "a person is checking for it" panel. Applying
-- it is what puts the claim somewhere a coordinator can find it.
--
-- Safe to re-run. Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

ALTER TABLE events ADD COLUMN IF NOT EXISTS lock_payment_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE events ADD COLUMN IF NOT EXISTS lock_payment_amount NUMERIC;
ALTER TABLE events ADD COLUMN IF NOT EXISTS lock_payment_ref    TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS lock_claimed_at     TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS lock_confirmed_at   TIMESTAMPTZ;

-- CHECK constraints do not accept IF NOT EXISTS, so drop first — otherwise a
-- re-run strands on 42710, the same trap 034 documents.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_lock_status_check;
ALTER TABLE events ADD CONSTRAINT events_lock_status_check
  CHECK (lock_payment_status IN ('none', 'claimed', 'confirmed', 'refunded'));

-- Admin reconciliation reads "everything waiting to be checked against the
-- bank", which stays a tiny slice of a growing table.
CREATE INDEX IF NOT EXISTS idx_events_lock_pending
  ON events (lock_claimed_at)
  WHERE lock_payment_status = 'claimed';

COMMIT;
