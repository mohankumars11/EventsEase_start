-- ============================================================
-- Migration 039: the order's own history, a return that records what was
-- agreed, and somewhere to keep "the admin has seen this".
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- ── 1. Why order_events exists ───────────────────────────────────────
-- `orders` carries `created_at` and `updated_at` and nothing else about
-- time. That is enough to say "this order is in `processing`" and not
-- enough to answer any of the questions an operator actually asks:
--
--     When was it dispatched?
--     How long did it sit before anyone picked it up?
--     Who confirmed the payment, and when?
--     Did it go placed → processing → dispatched, or did someone jump it
--       straight to delivered to clear the queue?
--
-- The admin Order Lifecycle screen had to say "untouched for N days"
-- (now − updated_at) because that was the only honest thing the schema
-- could support. `updated_at` is also destructive: the moment an order
-- moves again, when it entered the previous stage is gone forever.
--
-- So every transition gets a row. The customer's own order page reads the
-- same table, which is the difference between "Delivered" and a tracking
-- history somebody can actually follow.
--
-- Written by a TRIGGER rather than by the app. Order status is changed
-- from at least four places today (the admin Shop Orders table, the admin
-- Lifecycle queue, the customer cancel button, and the referral trigger's
-- payment_status write), and an app-side log would be one forgotten call
-- away from a history with holes in it. A trigger cannot be forgotten.
--
-- ── 2. Why the returns columns ───────────────────────────────────────
-- `return_requests.reason` is a single TEXT. Real returns have more than
-- one reason ("damaged AND late"), and — more importantly — nothing
-- recorded WHICH policy the customer was shown when they agreed to it.
-- A refund dispute six months from now is unanswerable without that, and
-- a returns policy that is not versioned is a policy you cannot change.
--
-- ── 3. Why notification state is a table and not localStorage ────────
-- Read/unread has to survive the founder opening the dashboard on a phone
-- after triaging on a laptop. One row per admin; the client falls back to
-- localStorage when this table is absent, so the bell works either way.
-- ============================================================

BEGIN;

-- ── 1. The order's history ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- 'status' | 'payment' | 'return' | 'note' — what kind of thing moved.
  kind        TEXT NOT NULL DEFAULT 'status',
  from_value  TEXT,
  to_value    TEXT NOT NULL,

  -- Who did it. NULL for the seed row and for anything a trigger did on
  -- behalf of the system (the referral coupon trigger, for instance).
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role  TEXT,

  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events (order_id, created_at);

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

-- A customer reads the history of their OWN order — this is the tracking
-- timeline on /orders. Nobody writes through the API at all: every row
-- comes from the trigger below, which runs as SECURITY DEFINER and
-- bypasses these policies. No INSERT policy is therefore deliberate, not
-- an omission; it means a client cannot forge a delivery event.
DROP POLICY IF EXISTS "customers_read_own_order_events" ON order_events;
CREATE POLICY "customers_read_own_order_events" ON order_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));

DROP POLICY IF EXISTS "admins_read_order_events" ON order_events;
CREATE POLICY "admins_read_order_events" ON order_events FOR SELECT
  USING (get_my_role() IN ('admin', 'event_coordinator'));

-- get_my_role() is the SECURITY DEFINER helper from migration 006. Never
-- inline an EXISTS against profiles inside a policy — that re-enters
-- profiles RLS and recurses, the bug 006 exists to fix.

CREATE OR REPLACE FUNCTION log_order_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- auth.uid() is NULL when a trigger fires from another trigger or from
  -- the service role; the row still gets written, just unattributed.
  BEGIN
    v_role := get_my_role();
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_events (order_id, kind, from_value, to_value, actor_id, actor_role, note)
    VALUES (NEW.id, 'status', NULL, NEW.status, auth.uid(), v_role, 'Order placed');

    IF NEW.payment_status IS DISTINCT FROM 'pending' THEN
      INSERT INTO order_events (order_id, kind, from_value, to_value, actor_id, actor_role)
      VALUES (NEW.id, 'payment', NULL, NEW.payment_status, auth.uid(), v_role);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_events (order_id, kind, from_value, to_value, actor_id, actor_role, note)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, auth.uid(), v_role,
            CASE WHEN NEW.status = 'cancelled' THEN NEW.cancellation_reason ELSE NULL END);
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO order_events (order_id, kind, from_value, to_value, actor_id, actor_role)
    VALUES (NEW.id, 'payment', OLD.payment_status, NEW.payment_status, auth.uid(), v_role);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_order_event ON orders;
CREATE TRIGGER trg_log_order_event
  AFTER INSERT OR UPDATE OF status, payment_status ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_event();

-- ── Backfill ─────────────────────────────────────────────────────────
-- Existing orders have no history, and an empty timeline on an order that
-- plainly got delivered reads as a broken feature rather than as missing
-- data. Two rows each: it was placed (created_at), and it reached whatever
-- state it is in now (updated_at). Intermediate stages are genuinely
-- unknowable and are NOT invented — `note` says so, so nobody later reads
-- a reconstructed timeline as a recorded one.
INSERT INTO order_events (order_id, kind, from_value, to_value, created_at, note)
SELECT o.id, 'status', NULL, 'placed', o.created_at, 'Reconstructed — predates the event log'
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM order_events e WHERE e.order_id = o.id);

INSERT INTO order_events (order_id, kind, from_value, to_value, created_at, note)
SELECT o.id, 'status', 'placed', o.status, GREATEST(o.updated_at, o.created_at),
       'Reconstructed — intermediate stages were not recorded'
FROM orders o
WHERE o.status <> 'placed'
  AND NOT EXISTS (
    SELECT 1 FROM order_events e
    WHERE e.order_id = o.id AND e.kind = 'status' AND e.to_value = o.status
  );

INSERT INTO order_events (order_id, kind, from_value, to_value, created_at, note)
SELECT o.id, 'payment', 'pending', o.payment_status, GREATEST(o.updated_at, o.created_at),
       'Reconstructed — predates the event log'
FROM orders o
WHERE o.payment_status <> 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM order_events e
    WHERE e.order_id = o.id AND e.kind = 'payment' AND e.to_value = o.payment_status
  );


-- ── 2. Returns that record what was agreed ───────────────────────────

-- Multiple reasons. `reason` (singular) stays, and stays populated, because
-- Support and the customer's own order list already read it — this is
-- additive, not a rename.
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS reasons           TEXT[] DEFAULT '{}';
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS item_ids          UUID[] DEFAULT '{}';

-- What the customer was shown and ticked. Without a version, changing the
-- policy silently rewrites what every past customer agreed to.
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS policy_version    TEXT;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- The refund itself. `refund_ref` is the UPI/bank reference an admin types
-- in after actually sending the money — the same manual-reconciliation
-- shape the inbound side has, for the same reason: there is no gateway.
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS refund_amount        NUMERIC;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS refund_method        TEXT;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS refund_ref           TEXT;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS refund_initiated_at  TIMESTAMPTZ;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS refund_completed_at  TIMESTAMPTZ;

-- 'approved' existed in 013's CHECK but nothing could reach it, because a
-- return went straight from requested to refunded. The real flow has a
-- middle: approved (we agreed) → refund_pending (money sent, unconfirmed)
-- → refunded (it landed). CHECK constraints take no IF NOT EXISTS, so drop
-- before create or a re-run strands on 42710.
ALTER TABLE return_requests DROP CONSTRAINT IF EXISTS return_requests_status_check;
ALTER TABLE return_requests ADD CONSTRAINT return_requests_status_check
  CHECK (status IN ('requested', 'approved', 'rejected', 'refund_pending', 'refunded'));

ALTER TABLE return_requests DROP CONSTRAINT IF EXISTS return_requests_refund_method_check;
ALTER TABLE return_requests ADD CONSTRAINT return_requests_refund_method_check
  CHECK (refund_method IS NULL OR refund_method IN ('upi', 'bank', 'original', 'store_credit'));

CREATE INDEX IF NOT EXISTS idx_return_requests_open
  ON return_requests (requested_at)
  WHERE status IN ('requested', 'approved', 'refund_pending');

-- Backfill `reasons` from the single reason already stored, so the new
-- array is never empty for a row that plainly had a reason.
UPDATE return_requests
   SET reasons = ARRAY[reason]
 WHERE reason IS NOT NULL AND (reasons IS NULL OR cardinality(reasons) = 0);


-- ── 3. What the admin has already seen ───────────────────────────────
--
-- The notification feed is DERIVED — it is a view over orders, returns,
-- complaints, enquiries and events rather than a copied table of its own,
-- so it can never drift from the thing it reports and no notification can
-- be lost by a failed insert. The only thing that cannot be derived is
-- whether a human has looked at it, which is all this table holds.

CREATE TABLE IF NOT EXISTS admin_notification_state (
  profile_id   UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- Everything older than this is read. One timestamp handles "mark all as
  -- read", which is what actually gets pressed.
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Individually-read items newer than last_seen_at. Bounded in practice
  -- because marking all read collapses them back into the timestamp.
  read_keys    TEXT[] NOT NULL DEFAULT '{}',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_notification_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_own_notification_state" ON admin_notification_state;
CREATE POLICY "admins_manage_own_notification_state" ON admin_notification_state FOR ALL
  USING      (profile_id = auth.uid() AND get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (profile_id = auth.uid() AND get_my_role() IN ('admin', 'event_coordinator'));

DROP TRIGGER IF EXISTS trg_admin_notification_state_updated_at ON admin_notification_state;
CREATE TRIGGER trg_admin_notification_state_updated_at
  BEFORE UPDATE ON admin_notification_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;


-- ── 4. Realtime (optional, outside the transaction) ──────────────────
-- The bell subscribes to postgres_changes so a new order pops while the
-- dashboard is open. Without this the client falls back to polling on the
-- existing refresh, so this block failing is not fatal — it is wrapped
-- precisely because `supabase_realtime` may not exist on every project.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE return_requests;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE service_enquiries;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
