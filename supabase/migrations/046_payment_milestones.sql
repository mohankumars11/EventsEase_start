-- ============================================================
-- 046 · Payment milestones on event_payments
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 045 FIRST — it closes the
-- self-advance hole on `events`, and a payment schedule keyed off a status
-- a customer can set themselves is not a schedule.
--
-- ── What this adds ───────────────────────────────────────────────────
-- `event_payments` already exists (migration 004) with the right shape —
-- advance / partial / full / vendor_payment / refund, and customers can
-- already read their own. What it has never had is a SCHEDULE: which
-- milestone a payment is, what it was due, and whether the money is
-- KNOWN to have arrived or merely claimed.
--
-- The ladder itself lives in src/config/celebrationPayments.js, not here.
-- Percentages are business policy and change with a sign-off; putting
-- them in a CHECK constraint would mean a migration every time marketing
-- moved a number, and two places to disagree about what was agreed. What
-- IS stored is `schedule_version`, so a change to the ladder can never
-- silently rewrite what a customer already agreed to.
-- ============================================================

BEGIN;

ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS milestone_id       TEXT;
ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS schedule_version   TEXT;
ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS due_at             TIMESTAMPTZ;
ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS claimed_at         TIMESTAMPTZ;
ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS paid_at            TIMESTAMPTZ;
ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS gateway_order_id   TEXT;
ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── Two of the three doors could never have a payment at all ─────────
-- `event_id` is NOT NULL REFERENCES events(id), but the celebration
-- builder and the services cart both write to `service_enquiries` and
-- create no `events` row. So the entire staged-payment feature was
-- structurally unreachable for them. One subject, either column, exactly
-- one of the two set.
ALTER TABLE event_payments ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS enquiry_id UUID
  REFERENCES service_enquiries(id) ON DELETE CASCADE;

ALTER TABLE event_payments DROP CONSTRAINT IF EXISTS event_payments_subject_check;
ALTER TABLE event_payments ADD CONSTRAINT event_payments_subject_check
  CHECK (num_nonnulls(event_id, enquiry_id) = 1);

-- ── GATEWAY_VERIFIED is deliberately not ADMIN_VERIFIED ──────────────
-- One is a signature this server checked; the other is a human who
-- looked at a bank statement. Collapsing them would erase exactly the
-- distinction migrations 034 and 038 spent paragraphs establishing
-- between "claimed" and "confirmed". Both count as money received;
-- only the provenance differs, and provenance is what you want on the
-- day somebody disputes a payment.
ALTER TABLE event_payments DROP CONSTRAINT IF EXISTS event_payments_status_check;
ALTER TABLE event_payments ADD CONSTRAINT event_payments_status_check
  CHECK (status IN ('PENDING','CUSTOMER_CLAIMED_PAID','GATEWAY_VERIFIED',
                    'ADMIN_VERIFIED','CANCELLED','REFUNDED'));

-- Webhook idempotency. A gateway that fires payment.captured twice must
-- not produce two rows, and this is the cheapest possible guarantee of
-- that — enforced by the database rather than by remembering to check.
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_payments_gateway
  ON event_payments (gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;

-- One milestone appears once per celebration.
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_payments_event_milestone
  ON event_payments (event_id, milestone_id) WHERE event_id IS NOT NULL AND milestone_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_payments_enquiry_milestone
  ON event_payments (enquiry_id, milestone_id) WHERE enquiry_id IS NOT NULL AND milestone_id IS NOT NULL;

-- The admin's "what is owed and overdue" queue.
CREATE INDEX IF NOT EXISTS idx_event_payments_due
  ON event_payments (due_at) WHERE status IN ('PENDING','CUSTOMER_CLAIMED_PAID');

DROP TRIGGER IF EXISTS event_payments_updated_at ON event_payments;
CREATE TRIGGER event_payments_updated_at
  BEFORE UPDATE ON event_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE event_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_own_payments" ON event_payments;
DROP POLICY IF EXISTS "customers read own payments" ON event_payments;
CREATE POLICY "customers read own payments"
  ON event_payments FOR SELECT USING (
    (event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_id AND e.customer_id = auth.uid()))
    OR
    (enquiry_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM service_enquiries s WHERE s.id = enquiry_id AND s.customer_id = auth.uid()))
  );

DROP POLICY IF EXISTS "staff manage payments" ON event_payments;
CREATE POLICY "staff manage payments"
  ON event_payments FOR ALL USING (get_my_role() IN ('admin','event_coordinator'));

-- A customer may say "I have paid" and nothing else. They may not create
-- a payment, set an amount, or mark one verified.
DROP POLICY IF EXISTS "customers claim own payment" ON event_payments;
CREATE POLICY "customers claim own payment"
  ON event_payments FOR UPDATE USING (
    (event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_id AND e.customer_id = auth.uid()))
    OR
    (enquiry_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM service_enquiries s WHERE s.id = enquiry_id AND s.customer_id = auth.uid()))
  );

CREATE OR REPLACE FUNCTION enforce_payment_self_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- The service role writes the gateway's verdict — see migration 018 for
  -- why this bypass has to be first.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF get_my_role() IN ('admin','event_coordinator') THEN RETURN NEW; END IF;

  IF OLD.status <> 'PENDING' OR NEW.status <> 'CUSTOMER_CLAIMED_PAID' THEN
    RAISE EXCEPTION 'You can only tell us a payment has been sent.';
  END IF;

  IF NEW.amount        IS DISTINCT FROM OLD.amount
     OR NEW.milestone_id IS DISTINCT FROM OLD.milestone_id
     OR NEW.event_id     IS DISTINCT FROM OLD.event_id
     OR NEW.enquiry_id   IS DISTINCT FROM OLD.enquiry_id
     OR NEW.due_at       IS DISTINCT FROM OLD.due_at
     OR NEW.paid_at      IS DISTINCT FROM OLD.paid_at
     OR NEW.gateway_payment_id IS DISTINCT FROM OLD.gateway_payment_id THEN
    RAISE EXCEPTION 'Only the payment claim may be recorded here.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_self_update ON event_payments;
CREATE TRIGGER trg_enforce_payment_self_update
  BEFORE UPDATE ON event_payments
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_self_update();

-- 045's payment logger keys off `event_id`. Widen it so an enquiry's
-- milestones also reach that celebration's tracker.
CREATE OR REPLACE FUNCTION log_event_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO celebration_events (subject_type, subject_id, kind, from_value, to_value,
                                  visibility, customer_copy, actor_id, actor_role, note)
  VALUES (CASE WHEN NEW.event_id IS NOT NULL THEN 'event' ELSE 'enquiry' END,
          COALESCE(NEW.event_id, NEW.enquiry_id),
          'payment',
          CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, NEW.status,
          'customer',
          CASE NEW.status
            WHEN 'CUSTOMER_CLAIMED_PAID' THEN 'You told us a payment was sent. We are checking it.'
            WHEN 'ADMIN_VERIFIED'        THEN 'Payment received. The work it funds is now released.'
            WHEN 'GATEWAY_VERIFIED'      THEN 'Payment received. The work it funds is now released.'
            WHEN 'REFUNDED'              THEN 'This payment has been refunded.'
            ELSE NULL END,
          auth.uid(), celebration_actor_role(), NEW.milestone_id);
  RETURN NEW;
END;
$$;

COMMIT;
