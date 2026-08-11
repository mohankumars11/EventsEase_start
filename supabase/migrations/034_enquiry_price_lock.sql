-- ============================================================
-- Migration 034: Let a customer hold a quote with a small payment.
--
-- The celebration builder (/plan/build) produces a priced configuration and
-- offers to hold it for ₹1,000 (LOCK_AMOUNT in src/data/celebrationTiers.js).
-- This adds somewhere to record that, and — the part that is easy to miss —
-- permission for the customer to record it at all.
--
-- ── Why the trigger has to change ───────────────────────────────────────
-- Migration 013 added enforce_enquiry_self_update(), which allows a customer
-- exactly one update to their own enquiry: open → cancelled, with no other
-- column touched. Everything else raises. So adding the columns below without
-- touching the trigger would produce a feature that fails at the last tap,
-- with a raw Postgres exception, at the moment somebody has just paid.
--
-- The rule is widened by exactly one case rather than relaxed: a customer may
-- move lock_payment_status from 'none' to 'claimed' and stamp the claim time,
-- and may change nothing else while doing it. In particular they cannot write
-- 'confirmed' — only an admin who has actually seen the money in the bank can,
-- and that is enforced here rather than in the client.
--
-- ── 'claimed' is not 'paid' ─────────────────────────────────────────────
-- UPI here is a deep link with no callback (see lib/payment/upiProvider.js),
-- so the app genuinely cannot know whether money arrived. 'claimed' means the
-- customer pressed "I've paid". An admin reconciles against the bank and moves
-- it to 'confirmed'. The status names say which is which on purpose: a column
-- called `paid` would be read as truth by the next person to write a query.
--
-- Safe to re-run. Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS lock_payment_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS lock_payment_amount NUMERIC;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS lock_payment_ref    TEXT;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS lock_claimed_at     TIMESTAMPTZ;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS lock_confirmed_at   TIMESTAMPTZ;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS quote_estimate      JSONB;

-- CHECK constraints do not accept IF NOT EXISTS, so drop first — otherwise a
-- re-run strands on 42710, the same trap migration policies fall into.
ALTER TABLE service_enquiries DROP CONSTRAINT IF EXISTS service_enquiries_lock_status_check;
ALTER TABLE service_enquiries ADD CONSTRAINT service_enquiries_lock_status_check
  CHECK (lock_payment_status IN ('none', 'claimed', 'confirmed', 'refunded'));

-- Admin reconciliation reads "everything waiting to be checked against the
-- bank", which is a tiny slice of a growing table.
CREATE INDEX IF NOT EXISTS idx_enquiries_lock_pending
  ON service_enquiries (lock_claimed_at)
  WHERE lock_payment_status = 'claimed';

-- ── The widened self-update rule ──────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_enquiry_self_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF get_my_role() IN ('admin', 'event_coordinator') THEN
    RETURN NEW;
  END IF;

  -- Case 1 (new): claiming the price-lock payment. Status must not move, and
  -- the only permitted transition is none → claimed. A customer cannot mark
  -- their own payment confirmed or refunded.
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.lock_payment_status IS DISTINCT FROM OLD.lock_payment_status THEN

    IF OLD.lock_payment_status <> 'none' OR NEW.lock_payment_status <> 'claimed' THEN
      RAISE EXCEPTION 'This payment has already been recorded.';
    END IF;

    IF NEW.services      IS DISTINCT FROM OLD.services
       OR NEW.packages      IS DISTINCT FROM OLD.packages
       OR NEW.event_date    IS DISTINCT FROM OLD.event_date
       OR NEW.event_name    IS DISTINCT FROM OLD.event_name
       OR NEW.customer_id   IS DISTINCT FROM OLD.customer_id
       OR NEW.quoted_price  IS DISTINCT FROM OLD.quoted_price
       OR NEW.lock_confirmed_at IS DISTINCT FROM OLD.lock_confirmed_at THEN
      RAISE EXCEPTION 'Only the payment claim may be recorded here.';
    END IF;

    RETURN NEW;
  END IF;

  -- Case 2 (unchanged from migration 013): cancelling an untouched request.
  IF OLD.status <> 'open' OR NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'You can only cancel a request that has not been responded to yet.';
  END IF;

  IF NEW.services     IS DISTINCT FROM OLD.services
     OR NEW.packages     IS DISTINCT FROM OLD.packages
     OR NEW.event_date   IS DISTINCT FROM OLD.event_date
     OR NEW.event_name   IS DISTINCT FROM OLD.event_name
     OR NEW.customer_id  IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION 'Only the request status may be changed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_enquiry_self_update ON service_enquiries;
CREATE TRIGGER trg_enforce_enquiry_self_update
  BEFORE UPDATE ON service_enquiries
  FOR EACH ROW EXECUTE FUNCTION enforce_enquiry_self_update();

COMMIT;
