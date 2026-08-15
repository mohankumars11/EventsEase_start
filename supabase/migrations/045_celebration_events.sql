-- ============================================================
-- 045 · celebration_events — the transition log for the concierge side
--
-- APPLY BY HAND in Supabase → SQL Editor, BEFORE deploying code that
-- depends on it. `git push` does not run migrations.
-- Re-runnable: every CREATE POLICY is preceded by DROP POLICY IF EXISTS
-- (CREATE POLICY has no IF NOT EXISTS, and a half-applied run otherwise
-- strands every retry on 42710).
--
-- ── Why ──────────────────────────────────────────────────────────────
-- Migration 039 gave `orders` a trigger-written history, and the customer
-- order tracker is honest because of it. The concierge side — the half of
-- the business that takes five-figure sums — has nothing equivalent:
--
--   · `events` carries only created_at and updated_at, and updated_at is
--     destroyed by the next edit, including a priority change;
--   · `service_enquiries` has no updated_at at all.
--
-- So "when did sourcing start", "when was my plan sent", "when was my
-- decorator confirmed" are unanswerable, and the customer tracker has to
-- print "time not recorded" against every stage but the first.
--
-- ── Written by a TRIGGER, never by the app ───────────────────────────
-- 039's reasoning applies verbatim and more strongly here: status is
-- written from the admin console, from the customer's own cancel action
-- and from the builder, and an app-side log is one forgotten call away
-- from a history with holes in it. A trigger cannot be forgotten. There
-- is deliberately NO INSERT POLICY, so a client cannot forge
-- "your decorator is confirmed".
--
-- ── `visibility` is the point of this table ──────────────────────────
-- The operational detail a customer most wants — vendors being sourced
-- and confirmed — lives in `event_vendor_options` and `event_tasks`,
-- which are admin-only by RLS and carry vendor names, phone numbers and
-- `sambramo_negotiated_amount`. Widening those policies would leak the
-- commercials of the business to every customer.
--
-- Instead the trigger writes TWO kinds of row: an internal one with the
-- detail, and a customer-safe one carrying only the fact and a sentence.
-- "A decorator is confirmed for your celebration" reaches the customer;
-- who it is and what we paid them does not. That is how the tracker shows
-- real sourcing progress without a single rupee or vendor name leaving
-- the console.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS celebration_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Polymorphic because a celebration lives in one of two tables
  -- depending on which door the customer came through, and they are owed
  -- one history either way.
  subject_type  TEXT NOT NULL CHECK (subject_type IN ('event','enquiry')),
  subject_id    UUID NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'status'
                CHECK (kind IN ('status','payment','proposal','service','sourcing','note')),
  from_value    TEXT,
  to_value      TEXT NOT NULL,
  visibility    TEXT NOT NULL DEFAULT 'internal'
                CHECK (visibility IN ('customer','internal')),
  -- The warm sentence, written at trigger time so the client never has to
  -- re-derive it and the two cannot drift. Mirrors CUSTOMER_TIMELINE in
  -- src/config/sambramo.js.
  customer_copy TEXT,
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role    TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_celebration_events_subject
  ON celebration_events (subject_type, subject_id, created_at);

CREATE INDEX IF NOT EXISTS idx_celebration_events_customer
  ON celebration_events (subject_type, subject_id, created_at)
  WHERE visibility = 'customer';

ALTER TABLE celebration_events ENABLE ROW LEVEL SECURITY;

-- Customers read only customer-visible rows, and only on their own
-- celebration. No INSERT policy at all — see the header.
DROP POLICY IF EXISTS "customers read own celebration events" ON celebration_events;
CREATE POLICY "customers read own celebration events"
  ON celebration_events FOR SELECT USING (
    visibility = 'customer' AND (
      (subject_type = 'event' AND EXISTS (
        SELECT 1 FROM events e WHERE e.id = subject_id AND e.customer_id = auth.uid()))
      OR
      (subject_type = 'enquiry' AND EXISTS (
        SELECT 1 FROM service_enquiries s WHERE s.id = subject_id AND s.customer_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "staff read celebration events" ON celebration_events;
CREATE POLICY "staff read celebration events"
  ON celebration_events FOR SELECT USING (get_my_role() IN ('admin','event_coordinator'));

-- ── The customer voice, in ONE place ─────────────────────────────────
-- The client renders whatever this returns, so the sentence a customer
-- reads is decided here rather than in two places that can disagree.
CREATE OR REPLACE FUNCTION celebration_status_copy(p_status TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_status
    WHEN 'REQUEST_RECEIVED'           THEN 'We have your request.'
    WHEN 'UNDER_REVIEW'               THEN 'A coordinator has picked this up.'
    WHEN 'CONTACTING_VENDORS'         THEN 'We are contacting the masters for your date.'
    WHEN 'QUOTES_COLLECTED'           THEN 'Quotes are in. We are putting your plan together.'
    WHEN 'PROPOSAL_PREPARED'          THEN 'Your plan is being finalised.'
    WHEN 'PROPOSAL_SENT'              THEN 'Your plan is ready for you to review.'
    WHEN 'CUSTOMER_REVIEW'            THEN 'Waiting on you to approve the plan.'
    WHEN 'CUSTOMER_CHANGES_REQUESTED' THEN 'We are working on the changes you asked for.'
    WHEN 'APPROVED'                   THEN 'You approved the plan. We are booking it in.'
    WHEN 'CONFIRMED'                  THEN 'Confirmed. Everything is booked for your date.'
    WHEN 'IN_COORDINATION'            THEN 'We are coordinating the day itself.'
    WHEN 'EVENT_DAY'                  THEN 'It is your day. Your coordinator is on the ground.'
    WHEN 'COMPLETED'                  THEN 'What a beautiful celebration. Thank you.'
    WHEN 'CANCELLED'                  THEN 'This celebration was cancelled.'
    WHEN 'open'                       THEN 'We have your request.'
    WHEN 'responded'                  THEN 'Your plan is ready for you to review.'
    WHEN 'closed'                     THEN 'What a beautiful celebration. Thank you.'
    WHEN 'cancelled'                  THEN 'This request was cancelled.'
    ELSE NULL
  END;
$$;

-- Shared helper: the actor, tolerating a NULL JWT (service role, or one
-- trigger firing from inside another).
CREATE OR REPLACE FUNCTION celebration_actor_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role TEXT;
BEGIN
  BEGIN v_role := get_my_role(); EXCEPTION WHEN OTHERS THEN v_role := NULL; END;
  RETURN v_role;
END;
$$;

-- ── events.status ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_event_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO celebration_events (subject_type, subject_id, kind, to_value,
                                    visibility, customer_copy, actor_id, actor_role)
    VALUES ('event', NEW.id, 'status', NEW.status, 'customer',
            celebration_status_copy(NEW.status), auth.uid(), celebration_actor_role());
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO celebration_events (subject_type, subject_id, kind, from_value, to_value,
                                    visibility, customer_copy, actor_id, actor_role, note)
    VALUES ('event', NEW.id, 'status', OLD.status, NEW.status, 'customer',
            celebration_status_copy(NEW.status), auth.uid(), celebration_actor_role(),
            CASE WHEN NEW.status = 'CANCELLED' THEN NEW.cancellation_reason ELSE NULL END);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_event_status ON events;
CREATE TRIGGER trg_log_event_status
  AFTER INSERT OR UPDATE OF status ON events
  FOR EACH ROW EXECUTE FUNCTION log_event_status();

-- ── service_enquiries: status, the quote, and the price-lock ─────────
CREATE OR REPLACE FUNCTION log_enquiry_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO celebration_events (subject_type, subject_id, kind, to_value,
                                    visibility, customer_copy, actor_id, actor_role)
    VALUES ('enquiry', NEW.id, 'status', NEW.status, 'customer',
            celebration_status_copy(NEW.status), auth.uid(), celebration_actor_role());
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO celebration_events (subject_type, subject_id, kind, from_value, to_value,
                                    visibility, customer_copy, actor_id, actor_role, note)
    VALUES ('enquiry', NEW.id, 'status', OLD.status, NEW.status, 'customer',
            celebration_status_copy(NEW.status), auth.uid(), celebration_actor_role(),
            CASE WHEN NEW.status = 'cancelled' THEN NEW.cancellation_reason ELSE NULL END);
  END IF;

  IF NEW.quoted_at IS DISTINCT FROM OLD.quoted_at AND NEW.quoted_at IS NOT NULL THEN
    INSERT INTO celebration_events (subject_type, subject_id, kind, to_value,
                                    visibility, customer_copy, actor_id, actor_role)
    VALUES ('enquiry', NEW.id, 'proposal', 'quoted', 'customer',
            'Your coordinator has priced this.', auth.uid(), celebration_actor_role());
  END IF;

  IF NEW.lock_payment_status IS DISTINCT FROM OLD.lock_payment_status THEN
    INSERT INTO celebration_events (subject_type, subject_id, kind, from_value, to_value,
                                    visibility, customer_copy, actor_id, actor_role)
    VALUES ('enquiry', NEW.id, 'payment', OLD.lock_payment_status, NEW.lock_payment_status, 'customer',
            CASE NEW.lock_payment_status
              WHEN 'claimed'   THEN 'You told us the hold was paid. We are matching it against the bank.'
              WHEN 'confirmed' THEN 'Your hold is confirmed. Your date is held.'
              WHEN 'refunded'  THEN 'Your hold has been refunded.'
              ELSE NULL END,
            auth.uid(), celebration_actor_role());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_enquiry_status ON service_enquiries;
CREATE TRIGGER trg_log_enquiry_status
  AFTER INSERT OR UPDATE OF status, quoted_at, lock_payment_status ON service_enquiries
  FOR EACH ROW EXECUTE FUNCTION log_enquiry_status();

-- ── Proposals ────────────────────────────────────────────────────────
-- Only SENT and APPROVED are customer-visible. A DRAFT is the
-- coordinator thinking out loud, and showing a customer that their plan
-- has been drafted five times is showing them our workings.
CREATE OR REPLACE FUNCTION log_proposal_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO celebration_events (subject_type, subject_id, kind, from_value, to_value,
                                  visibility, customer_copy, actor_id, actor_role)
  VALUES ('event', NEW.event_id, 'proposal',
          CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, NEW.status,
          CASE WHEN NEW.status IN ('SENT','APPROVED') THEN 'customer' ELSE 'internal' END,
          CASE NEW.status
            WHEN 'SENT'     THEN 'Your plan has been sent to you.'
            WHEN 'APPROVED' THEN 'You approved your plan.'
            ELSE NULL END,
          auth.uid(), celebration_actor_role());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_proposal_status ON event_proposals;
CREATE TRIGGER trg_log_proposal_status
  AFTER INSERT OR UPDATE OF status ON event_proposals
  FOR EACH ROW EXECUTE FUNCTION log_proposal_status();

-- ── Money ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_event_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO celebration_events (subject_type, subject_id, kind, from_value, to_value,
                                  visibility, customer_copy, actor_id, actor_role, note)
  VALUES ('event', NEW.event_id, 'payment',
          CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, NEW.status,
          'customer',
          CASE NEW.status
            WHEN 'CUSTOMER_CLAIMED_PAID' THEN 'You told us a payment was sent. We are checking it.'
            WHEN 'ADMIN_VERIFIED'        THEN 'Payment received. The work it funds is now released.'
            WHEN 'GATEWAY_VERIFIED'      THEN 'Payment received. The work it funds is now released.'
            WHEN 'REFUNDED'              THEN 'This payment has been refunded.'
            ELSE NULL END,
          auth.uid(), celebration_actor_role(), NEW.payment_type);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_event_payment ON event_payments;
CREATE TRIGGER trg_log_event_payment
  AFTER INSERT OR UPDATE OF status ON event_payments
  FOR EACH ROW EXECUTE FUNCTION log_event_payment();

-- ── Per-service confirmation ─────────────────────────────────────────
-- `event_services.status` exists and has never been written by anything.
-- Once the console starts moving it, this makes each move visible.
CREATE OR REPLACE FUNCTION log_event_service_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  INSERT INTO celebration_events (subject_type, subject_id, kind, from_value, to_value,
                                  visibility, customer_copy, actor_id, actor_role)
  VALUES ('event', NEW.event_id, 'service', OLD.status, NEW.status, 'customer',
          NEW.service_name || ' — ' || lower(NEW.status) || '.',
          auth.uid(), celebration_actor_role());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_event_service_status ON event_services;
CREATE TRIGGER trg_log_event_service_status
  AFTER UPDATE OF status ON event_services
  FOR EACH ROW EXECUTE FUNCTION log_event_service_status();

-- ── Sourcing — the one the customer most wants, safely ───────────────
-- THE CUSTOMER-VISIBLE ROW CARRIES THE CATEGORY AND NOTHING ELSE.
-- Never vendor_name, never vendor_phone, never quoted_amount, and never
-- sambramo_negotiated_amount. The internal row beside it keeps the
-- detail for the console.
CREATE OR REPLACE FUNCTION log_vendor_option()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event_id UUID;
  v_trade    TEXT;
BEGIN
  SELECT event_id INTO v_event_id FROM event_services WHERE id = NEW.event_service_id;
  IF v_event_id IS NULL THEN RETURN NEW; END IF;

  v_trade := COALESCE(NULLIF(lower(NEW.vendor_category), ''), 'master');

  -- Internal: the full picture, for the console.
  INSERT INTO celebration_events (subject_type, subject_id, kind, to_value,
                                  visibility, actor_id, actor_role, note)
  VALUES ('event', v_event_id, 'sourcing',
          CASE WHEN NEW.selected THEN 'selected' ELSE lower(COALESCE(NEW.quote_status,'pending')) END,
          'internal', auth.uid(), celebration_actor_role(),
          NEW.vendor_name || ' · ' || COALESCE(NEW.quoted_amount::TEXT, 'no quote'));

  -- Customer: the fact, in one sentence, with no commercials in it.
  IF NEW.selected AND (TG_OP = 'INSERT' OR NEW.selected IS DISTINCT FROM OLD.selected) THEN
    INSERT INTO celebration_events (subject_type, subject_id, kind, to_value,
                                    visibility, customer_copy, actor_id, actor_role)
    VALUES ('event', v_event_id, 'sourcing', 'selected', 'customer',
            'Your ' || v_trade || ' is confirmed for your celebration.',
            auth.uid(), celebration_actor_role());
  ELSIF upper(COALESCE(NEW.quote_status,'')) = 'RECEIVED'
        AND (TG_OP = 'INSERT' OR NEW.quote_status IS DISTINCT FROM OLD.quote_status) THEN
    INSERT INTO celebration_events (subject_type, subject_id, kind, to_value,
                                    visibility, customer_copy, actor_id, actor_role)
    VALUES ('event', v_event_id, 'sourcing', 'quoted', 'customer',
            'A quote is in from a ' || v_trade || ' for your date.',
            auth.uid(), celebration_actor_role());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_vendor_option ON event_vendor_options;
CREATE TRIGGER trg_log_vendor_option
  AFTER INSERT OR UPDATE OF selected, quote_status ON event_vendor_options
  FOR EACH ROW EXECUTE FUNCTION log_vendor_option();

-- ── service_enquiries gains an updated_at ────────────────────────────
-- It never had one, which is why an enquiry tracker cannot even infer
-- "arrived at its current stage at…" the way an order can.
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS service_enquiries_updated_at ON service_enquiries;
CREATE TRIGGER service_enquiries_updated_at
  BEFORE UPDATE ON service_enquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Closing the self-advance hole on `events` ────────────────────────
-- `customers_own_events` (migration 006) is FOR ALL, so a customer can
-- UPDATE their own events row — including `status`. Migration 038 noted
-- this and declined to add a trigger, which was defensible while nothing
-- read the column.
--
-- It is not defensible now. `status` drives a trust-bearing tracker and,
-- from migration 046, a payment schedule — and with the log above, a
-- self-advance would write a trigger-authored history row saying we
-- confirmed something we did not. `service_enquiries` has had exactly
-- this guard since 013; this is its counterpart.
CREATE OR REPLACE FUNCTION enforce_event_self_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Service role (the payment endpoints, per migration 018) and staff.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF get_my_role() IN ('admin','event_coordinator') THEN RETURN NEW; END IF;

  -- A customer claiming the price-lock payment: none → claimed, nothing else.
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.lock_payment_status IS DISTINCT FROM OLD.lock_payment_status THEN
    IF OLD.lock_payment_status <> 'none' OR NEW.lock_payment_status <> 'claimed' THEN
      RAISE EXCEPTION 'This payment has already been recorded.';
    END IF;
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.lock_confirmed_at IS DISTINCT FROM OLD.lock_confirmed_at THEN
      RAISE EXCEPTION 'Only the payment claim may be recorded here.';
    END IF;
    RETURN NEW;
  END IF;

  -- A customer cancelling a request nobody has worked on yet.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'REQUEST_RECEIVED' OR NEW.status <> 'CANCELLED' THEN
      RAISE EXCEPTION 'You can only cancel a request that has not been picked up yet.';
    END IF;
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
      RAISE EXCEPTION 'Only the request status may be changed.';
    END IF;
    RETURN NEW;
  END IF;

  -- Anything else a customer edits on their own event leaves status and
  -- money alone.
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.lock_payment_status IS DISTINCT FROM OLD.lock_payment_status
     OR NEW.lock_confirmed_at IS DISTINCT FROM OLD.lock_confirmed_at THEN
    RAISE EXCEPTION 'That field cannot be changed here.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_event_self_update ON events;
CREATE TRIGGER trg_enforce_event_self_update
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION enforce_event_self_update();

-- ── Backfill ─────────────────────────────────────────────────────────
-- Two rows per existing event, both marked reconstructed. Intermediate
-- stages are genuinely unknowable and are NOT invented — 039's rule, and
-- the client filters on this exact prefix to mark them approximate.
INSERT INTO celebration_events (subject_type, subject_id, kind, to_value, visibility, customer_copy, note, created_at)
SELECT 'event', e.id, 'status', 'REQUEST_RECEIVED', 'customer',
       celebration_status_copy('REQUEST_RECEIVED'),
       'Reconstructed — predates the celebration log', e.created_at
FROM events e
WHERE NOT EXISTS (SELECT 1 FROM celebration_events c WHERE c.subject_type='event' AND c.subject_id=e.id);

INSERT INTO celebration_events (subject_type, subject_id, kind, to_value, visibility, customer_copy, note, created_at)
SELECT 'event', e.id, 'status', e.status, 'customer',
       celebration_status_copy(e.status),
       'Reconstructed — intermediate stages were not recorded',
       GREATEST(e.updated_at, e.created_at)
FROM events e
WHERE e.status <> 'REQUEST_RECEIVED'
  AND NOT EXISTS (
    SELECT 1 FROM celebration_events c
    WHERE c.subject_type='event' AND c.subject_id=e.id AND c.to_value=e.status);

-- Enquiries get ONE row: they had no updated_at before this migration, so
-- a second row would have no timestamp to carry and would be a guess with
-- a date on it.
INSERT INTO celebration_events (subject_type, subject_id, kind, to_value, visibility, customer_copy, note, created_at)
SELECT 'enquiry', s.id, 'status', 'open', 'customer',
       celebration_status_copy('open'),
       'Reconstructed — predates the celebration log', s.created_at
FROM service_enquiries s
WHERE NOT EXISTS (SELECT 1 FROM celebration_events c WHERE c.subject_type='enquiry' AND c.subject_id=s.id);

-- Realtime, so a tracker left open updates itself. Swallowed like 039's,
-- because the publication may not exist on every project.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE celebration_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

COMMIT;
