-- ============================================================
--  EventEase — Migration 003
--  Vendor subscriptions, service cart, packages
--  Run AFTER 001_initial_schema.sql and 002_rating_trigger.sql
-- ============================================================

-- ── 1. VENDOR SUBSCRIPTIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  tier        TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','growth','pro')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,                      -- NULL = free (never expires)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id)
);

-- Auto-insert free subscription when a vendor row is created
CREATE OR REPLACE FUNCTION create_free_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM vendor_subscriptions WHERE tier = 'free';
  -- First 500 vendors get free plan
  IF v_count < 500 THEN
    INSERT INTO vendor_subscriptions (vendor_id, tier, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (vendor_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_free_subscription ON vendors;
CREATE TRIGGER trg_vendor_free_subscription
  AFTER INSERT ON vendors
  FOR EACH ROW EXECUTE FUNCTION create_free_subscription();

-- Backfill existing vendors
INSERT INTO vendor_subscriptions (vendor_id, tier, status)
SELECT id, 'free', 'active'
FROM   vendors
WHERE  id NOT IN (SELECT vendor_id FROM vendor_subscriptions)
LIMIT  500
ON CONFLICT (vendor_id) DO NOTHING;

-- ── 2. CUSTOMER CART ITEMS ────────────────────────────────────
-- Persists cart server-side (client also uses localStorage as primary)
CREATE TABLE IF NOT EXISTS cart_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id     TEXT NOT NULL,        -- e.g. 'birthday', 'anniversary'
  event_name   TEXT NOT NULL,
  service_id   TEXT NOT NULL,        -- e.g. 'cake', 'dj'
  service_name TEXT NOT NULL,
  service_emoji TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, event_id, service_id)
);

-- ── 3. CUSTOMER PACKAGE CART ──────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_packages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id     TEXT NOT NULL,
  event_name   TEXT NOT NULL,
  package_id   TEXT NOT NULL,
  package_name TEXT NOT NULL,
  price_min    INTEGER,
  price_max    INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, event_id, package_id)
);

-- ── 4. SERVICE ENQUIRIES (from cart checkout) ─────────────────
-- When a customer submits their cart, we create one enquiry per service/package
CREATE TABLE IF NOT EXISTS service_enquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id        TEXT NOT NULL,
  event_name      TEXT NOT NULL,
  event_date      DATE,
  services        JSONB NOT NULL DEFAULT '[]',   -- array of service objects
  packages        JSONB NOT NULL DEFAULT '[]',
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','responded','closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. RLS POLICIES ───────────────────────────────────────────

ALTER TABLE vendor_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_packages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_enquiries     ENABLE ROW LEVEL SECURITY;

-- Vendors can read their own subscription
CREATE POLICY "vendor reads own subscription"
  ON vendor_subscriptions FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE owner_id = auth.uid()));

-- Customers manage their own cart
CREATE POLICY "customer manages own cart items"
  ON cart_items FOR ALL
  USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

CREATE POLICY "customer manages own cart packages"
  ON cart_packages FOR ALL
  USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

CREATE POLICY "customer manages own enquiries"
  ON service_enquiries FOR ALL
  USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

-- Admins can read all
CREATE POLICY "admin reads subscriptions"
  ON vendor_subscriptions FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin reads enquiries"
  ON service_enquiries FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ── 6. HELPER VIEWS ───────────────────────────────────────────

-- How many free slots are left
CREATE OR REPLACE VIEW free_subscription_slots AS
SELECT
  500                                                       AS total_free_slots,
  COUNT(*)                                                  AS used_free_slots,
  GREATEST(0, 500 - COUNT(*))                              AS remaining_free_slots,
  COUNT(*) < 500                                           AS free_slots_available
FROM vendor_subscriptions
WHERE tier = 'free' AND status = 'active';
