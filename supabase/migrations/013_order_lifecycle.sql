-- ============================================================
-- Migration 013: Order lifecycle — cancellation, return/refund
-- requests, complaints — plus a real RLS hardening pass on
-- orders/service_enquiries (both were previously a blanket
-- FOR ALL on ownership only, meaning a customer could update
-- ANY column, including payment_status, via a direct API call).
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE service_enquiries DROP CONSTRAINT IF EXISTS service_enquiries_status_check;
ALTER TABLE service_enquiries ADD CONSTRAINT service_enquiries_status_check
  CHECK (status IN ('open','responded','closed','cancelled'));

CREATE TABLE IF NOT EXISTS return_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  comment      TEXT,
  status       TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','refunded')),
  admin_notes  TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS complaints (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('order','enquiry','general')),
  order_id     UUID REFERENCES orders(id) ON DELETE SET NULL,
  enquiry_id   UUID REFERENCES service_enquiries(id) ON DELETE SET NULL,
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  admin_reply  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

-- ── RLS: orders — split the old blanket FOR ALL into scoped policies ──
DROP POLICY IF EXISTS "Customers manage own orders" ON orders;

CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers can create own orders"
  ON orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Customers can update own orders"
  ON orders FOR UPDATE USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

-- The real enforcement: a customer's UPDATE may only flip status
-- placed/processing → cancelled. Every other column, and every other
-- transition, is rejected — this is what actually closes the payment-
-- bypass gap, not just hiding the button in the UI.
CREATE OR REPLACE FUNCTION enforce_order_self_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF get_my_role() IN ('admin', 'event_coordinator') THEN
    RETURN NEW;
  END IF;

  IF OLD.status NOT IN ('placed', 'processing') OR NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'You can only cancel an order that has not been dispatched yet.';
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.subtotal      IS DISTINCT FROM OLD.subtotal
     OR NEW.delivery_fee  IS DISTINCT FROM OLD.delivery_fee
     OR NEW.discount      IS DISTINCT FROM OLD.discount
     OR NEW.total         IS DISTINCT FROM OLD.total
     OR NEW.address       IS DISTINCT FROM OLD.address
     OR NEW.payment_ref   IS DISTINCT FROM OLD.payment_ref
     OR NEW.customer_id   IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION 'Only the order status may be changed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_self_update ON orders;
CREATE TRIGGER trg_enforce_order_self_update
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION enforce_order_self_update();

-- ── RLS: service_enquiries — same split + admin now gets UPDATE ──
-- (previously admin had SELECT only — status could never actually
-- reach 'responded'/'closed' from anywhere in the app until now)
DROP POLICY IF EXISTS "customer manages own enquiries" ON service_enquiries;

CREATE POLICY "Customers can view own enquiries"
  ON service_enquiries FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers can create own enquiries"
  ON service_enquiries FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Customers can update own enquiries"
  ON service_enquiries FOR UPDATE USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Admin can update enquiries"
  ON service_enquiries FOR UPDATE USING (get_my_role() IN ('admin', 'event_coordinator'));

CREATE OR REPLACE FUNCTION enforce_enquiry_self_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF get_my_role() IN ('admin', 'event_coordinator') THEN
    RETURN NEW;
  END IF;

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

-- ── RLS: return_requests / complaints ──
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own return requests"
  ON return_requests FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers create own return requests"
  ON return_requests FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Admin manages return requests"
  ON return_requests FOR ALL USING (get_my_role() IN ('admin', 'event_coordinator'));

CREATE POLICY "Customers manage own complaints"
  ON complaints FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers create own complaints"
  ON complaints FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Admin manages complaints"
  ON complaints FOR ALL USING (get_my_role() IN ('admin', 'event_coordinator'));
