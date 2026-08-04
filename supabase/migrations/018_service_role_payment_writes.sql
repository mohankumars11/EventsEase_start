-- ============================================================
-- Migration 018: Let trusted server-side payment verification
-- write to orders, without reopening the customer self-update hole
-- migration 013 closed.
--
-- The Razorpay integration's serverless functions (api/create-
-- razorpay-order.js, api/verify-razorpay-payment.js) connect using
-- the Supabase service-role key — a Postgres session with NO
-- authenticated user (auth.uid() IS NULL). The existing
-- enforce_order_self_update() trigger didn't account for that: it
-- only bypassed for an authenticated admin, so a service-role
-- connection would fall into the strict "customers can only cancel"
-- branch and reject the payment_status/payment_ref writes those
-- functions need to make. auth.uid() IS NULL is a reliable signal
-- of a trusted backend context — a browser session always carries a
-- JWT, so this can't be spoofed from the client.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_order_self_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- trusted server-side context (service role)
  END IF;

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
