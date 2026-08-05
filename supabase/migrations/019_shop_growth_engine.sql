-- ============================================================
-- Migration 019: Shop growth engine — coupons, refer & earn,
-- product customization, best-seller tracking, Independence Day
-- catalog. Purely additive; touches no existing column/policy.
-- Run this ONCE in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Coupons ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT        NOT NULL UNIQUE,
  description       TEXT,
  discount_type     TEXT        NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value    NUMERIC     NOT NULL CHECK (discount_value > 0),
  min_order_amount  NUMERIC     NOT NULL DEFAULT 0,
  max_discount      NUMERIC,                          -- cap for percent coupons; null = uncapped
  max_uses          INTEGER,                           -- null = unlimited
  times_used        INTEGER     NOT NULL DEFAULT 0,
  issued_to         UUID        REFERENCES profiles(id) ON DELETE CASCADE, -- null = public code
  active            BOOLEAN     NOT NULL DEFAULT true,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Client reads only to display/validate; all writes go through the
-- SECURITY DEFINER functions below, never a direct client INSERT/UPDATE.
CREATE POLICY "View public or own coupons"
  ON coupons FOR SELECT
  USING (issued_to IS NULL OR issued_to = auth.uid());

-- Read-only check — an abandoned cart never burns a use. Returns
-- jsonb so supabase-js callers don't need typed row handling.
CREATE OR REPLACE FUNCTION validate_coupon(p_code TEXT, p_order_total NUMERIC, p_customer_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_coupon   coupons%ROWTYPE;
  v_discount NUMERIC;
BEGIN
  SELECT * INTO v_coupon FROM coupons
    WHERE code = upper(trim(p_code)) AND active = true
      AND (issued_to IS NULL OR issued_to = p_customer_id)
    LIMIT 1;

  IF v_coupon.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid coupon code.');
  END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon has expired.');
  END IF;
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.times_used >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon has already been used.');
  END IF;
  IF p_order_total < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'message',
      'Add ₹' || (v_coupon.min_order_amount - p_order_total)::TEXT || ' more to use this coupon.');
  END IF;

  v_discount := CASE WHEN v_coupon.discount_type = 'flat' THEN v_coupon.discount_value
                      ELSE p_order_total * v_coupon.discount_value / 100 END;
  IF v_coupon.max_discount IS NOT NULL THEN v_discount := LEAST(v_discount, v_coupon.max_discount); END IF;
  v_discount := LEAST(v_discount, p_order_total);

  RETURN jsonb_build_object('valid', true, 'coupon_id', v_coupon.id, 'code', v_coupon.code,
    'discount_amount', v_discount, 'message', 'Coupon applied!');
END $$;

-- Atomic redemption — only called once an order is actually placed.
-- The WHERE clause re-checks limits so two simultaneous redemptions
-- of a max_uses=1 coupon can't both succeed.
CREATE OR REPLACE FUNCTION redeem_coupon(p_coupon_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE coupons SET times_used = times_used + 1
    WHERE id = p_coupon_id AND active = true
      AND (max_uses IS NULL OR times_used < max_uses)
      AND (expires_at IS NULL OR expires_at > now());
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END $$;

GRANT EXECUTE ON FUNCTION validate_coupon TO anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_coupon   TO anon, authenticated;

-- Launch coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, max_uses)
VALUES
  ('WELCOME10',  'Welcome offer — 10% off your first order',   'percent', 10, 499,  200, NULL),
  ('SAMBRAMO15', '15% off orders above ₹1,499',                'percent', 15, 1499, 400, NULL),
  ('FLAT100',    '₹100 off orders above ₹999',                 'flat',    100, 999, NULL, NULL),
  ('INDEPENDENCE15', '15% off — Independence Day specials',    'percent', 15, 799,  300, NULL)
ON CONFLICT (code) DO NOTHING;


-- ── Refer & earn ─────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE
  DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 6));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

UPDATE profiles SET referral_code = upper(substr(md5(gen_random_uuid()::text), 1, 6))
  WHERE referral_code IS NULL;

-- Narrow lookup — a new signup needs to resolve a ?ref= code to a
-- referrer id, but RLS only lets a customer SELECT their own profile
-- row. This exposes nothing beyond the matching id.
CREATE OR REPLACE FUNCTION resolve_referral_code(p_code TEXT)
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id FROM profiles WHERE referral_code = upper(trim(p_code)) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION resolve_referral_code TO anon, authenticated;

-- Reward the referrer with a personal 15%-off coupon the moment the
-- referred customer's first order is paid. Fires on INSERT (instant
-- pay) and on UPDATE OF payment_status (UPI pending -> admin-confirmed
-- paid); the OLD.payment_status guard stops a redundant paid->paid
-- save from issuing a second coupon.
CREATE OR REPLACE FUNCTION reward_referrer_on_first_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referred_by       UUID;
  v_prior_paid_count  INTEGER;
BEGIN
  IF NEW.payment_status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status = 'paid' THEN RETURN NEW; END IF;

  SELECT referred_by INTO v_referred_by FROM profiles WHERE id = NEW.customer_id;
  IF v_referred_by IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_prior_paid_count FROM orders
    WHERE customer_id = NEW.customer_id AND payment_status = 'paid' AND id <> NEW.id;
  IF v_prior_paid_count > 0 THEN RETURN NEW; END IF;

  INSERT INTO coupons (code, description, discount_type, discount_value, max_uses, issued_to, expires_at)
  VALUES (
    'REFER' || upper(substr(md5(gen_random_uuid()::text), 1, 6)),
    'Thanks for referring a friend to Sambramo!',
    'percent', 15, 1, v_referred_by, now() + interval '90 days'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reward_referrer ON orders;
CREATE TRIGGER trg_reward_referrer
  AFTER INSERT OR UPDATE OF payment_status ON orders
  FOR EACH ROW EXECUTE FUNCTION reward_referrer_on_first_order();


-- ── Product customization (gift message, carried to the order) ──
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS customization TEXT;


-- ── Best-seller tracking ─────────────────────────────────────
-- order_items RLS scopes SELECT to the owning customer, so a plain
-- view here would only ever sum the querying user's own orders.
-- A SECURITY DEFINER function correctly aggregates across everyone
-- while exposing nothing beyond product_id + a count.
CREATE OR REPLACE FUNCTION get_product_order_counts()
RETURNS TABLE(product_id UUID, total_ordered BIGINT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT product_id, SUM(qty)::BIGINT AS total_ordered
  FROM order_items
  WHERE product_id IS NOT NULL
  GROUP BY product_id;
$$;
GRANT EXECUTE ON FUNCTION get_product_order_counts TO anon, authenticated;


-- ── Independence Day catalog (Aug 15) ────────────────────────
INSERT INTO products (name, category, occasion, description, price, emoji) VALUES
  ('Tricolor Theme Cake (1kg)',              'Cakes',            'Independence Day', 'Saffron, white & green layered sponge', 999,  '🇮🇳'),
  ('Tiranga Fondant Cake (1.5kg)',           'Cakes',            'Independence Day', 'National flag fondant design',           1499, '🎂'),
  ('Ashoka Chakra Photo Cake (1kg)',         'Cakes',            'Independence Day', 'Edible print, patriotic theme',           1199, '📸'),
  ('Independence Day Cupcakes (Box of 6)',   'Cakes',            'Independence Day', 'Tricolor frosted cupcakes',                549,  '🧁'),
  ('Patriotic Celebration Hamper',           'Hampers',          'Independence Day', 'Sweets, flag, dry fruits, greeting card',  1299, '🎁'),
  ('Tiranga Sweets Box',                     'Hampers',          'Independence Day', 'Assorted Indian sweets, tricolor box',     699,  '🍬'),
  ('National Pride Gift Hamper',             'Hampers',          'Independence Day', 'Mug, keychain, notebook — flag themed',    999,  '💼'),
  ('Tricolor Balloon Bunch (30pc)',          'Party Essentials', 'Independence Day', 'Saffron, white & green latex balloons',    349,  '🎈'),
  ('Independence Day Banner (Customisable)', 'Party Essentials', 'Independence Day', '"Happy Independence Day" banner',          349,  '🎊'),
  ('National Flag (Table-top, Set of 5)',    'Party Essentials', 'Independence Day', 'Small table-top Indian flags',             249,  '🏳️'),
  ('Tricolor Buntings & Streamers',          'Party Essentials', 'Independence Day', 'Door/window bunting, 10ft',                 299,  '🎏'),
  ('Patriotic Photo Frame',                  'Gifts',            'Independence Day', 'Tricolor wooden frame, custom engraving',  549,  '🖼️'),
  ('Independence Day Greeting Card',         'Gifts',            'Independence Day', 'Handmade, patriotic message inside',       149,  '💌'),
  ('Tricolor Coffee Mug (Custom Print)',     'Gifts',            'Independence Day', 'Ceramic, flag-themed print',                399,  '☕'),
  ('Marigold & Tricolor Ribbon Bouquet',     'Flowers',          'Independence Day', 'Marigold with saffron-white-green ribbon', 649,  '💐')
ON CONFLICT DO NOTHING;
