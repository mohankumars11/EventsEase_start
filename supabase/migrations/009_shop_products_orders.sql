-- ============================================================
-- Migration 009: Shop vertical — products, orders, order_items
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Deliberately separate from cart_items/service_enquiries (the
-- event-planning cart) — shopping orders and event bookings are
-- different business entities that only share the customer.
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  category    TEXT        NOT NULL CHECK (category IN ('Cakes','Gifts','Flowers','Hampers','Party Essentials')),
  description TEXT,
  price       NUMERIC     NOT NULL,
  emoji       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view products"
  ON products FOR SELECT USING (TRUE);

CREATE TABLE IF NOT EXISTS orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'placed'
                             CHECK (status IN ('placed','processing','dispatched','delivered','cancelled')),
  subtotal      NUMERIC     NOT NULL DEFAULT 0,
  delivery_fee  NUMERIC     NOT NULL DEFAULT 0,
  discount      NUMERIC     NOT NULL DEFAULT 0,
  total         NUMERIC     NOT NULL DEFAULT 0,
  address       JSONB       NOT NULL,
  payment_status TEXT       NOT NULL DEFAULT 'pending'
                             CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_ref   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own orders"
  ON orders FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins manage all orders"
  ON orders FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

CREATE TABLE IF NOT EXISTS order_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID        REFERENCES products(id),
  product_name TEXT        NOT NULL,
  unit_price   NUMERIC     NOT NULL,
  qty          INTEGER     NOT NULL DEFAULT 1,
  subtotal     NUMERIC     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own order items"
  ON order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid()));

CREATE POLICY "Admins manage all order items"
  ON order_items FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Seed products
INSERT INTO products (name, category, description, price, emoji) VALUES
  ('Chocolate Truffle Cake (1kg)',      'Cakes', 'Rich chocolate truffle, serves 8-10',            899,  '🍫'),
  ('Red Velvet Cake (1kg)',             'Cakes', 'Classic red velvet with cream cheese frosting',  999,  '🎂'),
  ('Photo Cake (1kg)',                  'Cakes', 'Edible print of your favourite photo',           1099, '📸'),
  ('Pineapple Cake (1kg)',              'Cakes', 'Fresh cream, pineapple chunks',                  749,  '🍍'),
  ('Butterscotch Cake (1kg)',           'Cakes', 'Crunchy praline, butterscotch cream',             849,  '🧈'),
  ('Cupcake Box (Set of 6)',            'Cakes', 'Assorted flavours, individually boxed',           499,  '🧁'),

  ('Personalised Photo Frame',          'Gifts', 'Wooden frame, custom engraving',                  599,  '🖼️'),
  ('Scented Candle Set',                'Gifts', 'Set of 3, lavender/vanilla/sandalwood',           449,  '🕯️'),
  ('Coffee Mug (Custom Print)',         'Gifts', 'Ceramic, dishwasher safe',                        349,  '☕'),
  ('Leather Wallet',                    'Gifts', 'Genuine leather, gift-boxed',                     899,  '👛'),
  ('Wireless Earbuds',                  'Gifts', 'Bluetooth 5.0, 20hr battery',                     1999, '🎧'),
  ('Greeting Card (Handmade)',          'Gifts', 'Handcrafted, personalised message inside',        149,  '💌'),

  ('Fresh Rose Bouquet (12 stems)',     'Flowers', 'Red roses with fillers, wrapped',                599,  '🌹'),
  ('Mixed Flower Basket',               'Flowers', 'Seasonal mixed blooms in a basket',              799,  '💐'),
  ('Orchid Arrangement',                'Flowers', 'Premium orchids, vase included',                 1299, '🌺'),
  ('Sunflower Bunch (10 stems)',        'Flowers', 'Bright sunflowers, hand-tied',                    449,  '🌻'),

  ('Celebration Hamper',                'Hampers', 'Chocolates, cake, candle, greeting card',        1499, '🎁'),
  ('Couple Hamper',                     'Hampers', 'Wine glasses, chocolates, photo frame',          1899, '💑'),
  ('Baby Welcome Hamper',               'Hampers', 'Baby essentials, soft toy, card',                1699, '👶'),
  ('Corporate Gift Hamper',             'Hampers', 'Premium dry fruits, mug, diary',                 2199, '💼'),

  ('Balloon Bunch (20pc, assorted)',    'Party Essentials', 'Latex balloons, assorted colours',       249,  '🎈'),
  ('Birthday Banner (Customisable)',    'Party Essentials', 'Happy Birthday banner, name add-on',     299,  '🎊'),
  ('Party Popper Set (Pack of 6)',      'Party Essentials', 'Confetti poppers',                       199,  '🎉'),
  ('Disposable Party Plates & Cups',    'Party Essentials', 'Set of 20, themed print',                349,  '🍽️')
ON CONFLICT DO NOTHING;
