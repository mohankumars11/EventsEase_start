-- ============================================================
-- Migration 010: Pooja items become a real Shop category
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Pooja items are physical, purchasable goods (diyas, kumkum,
-- samagri kits, etc.) — they belong in the real Shop/orders/
-- payment flow like Cakes/Gifts/etc, not the event-services
-- enquiry cart they were awkwardly bolted onto as a pseudo-event.
-- ============================================================

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('Cakes','Gifts','Flowers','Hampers','Party Essentials','Pooja & Essentials'));

INSERT INTO products (name, category, description, price, emoji) VALUES
  ('Diya Set (Oil Lamps, 12pc)',        'Pooja & Essentials', 'Traditional clay oil lamps',                150,  '🪔'),
  ('Agarbatti (Incense Sticks)',        'Pooja & Essentials', 'Assorted fragrance packs',                   50,   '🕯️'),
  ('Kapoor (Camphor Tablets)',          'Pooja & Essentials', 'Pure camphor for aarti',                     40,   '🔥'),
  ('Marigold Garland (Pair)',           'Pooja & Essentials', 'Fresh genda phool garlands',                 100,  '🌼'),
  ('Rose Petals (500g)',                'Pooja & Essentials', 'For decoration & offering',                  80,   '🌹'),
  ('Coconut (Pair)',                    'Pooja & Essentials', 'Fresh coconuts for offering',                40,   '🥥'),
  ('Prasad Sweets Box (1kg)',           'Pooja & Essentials', 'Modak/Ladoo, fresh from local sweet shop',   350,  '🍡'),
  ('Panchamrit Ingredients Kit',        'Pooja & Essentials', 'Milk, curd, ghee, honey, sugar set',         180,  '🥛'),
  ('Pooja Thali Set',                   'Pooja & Essentials', 'Steel/brass thali with accessories',         450,  '🍽️'),
  ('Kalash (Brass Pot with Coconut)',   'Pooja & Essentials', 'Traditional brass kalash',                    600,  '🏺'),
  ('Pooja Bell (Ghanti)',               'Pooja & Essentials', 'Brass ceremonial bell',                       250,  '🔔'),
  ('Kumkum & Turmeric Combo',           'Pooja & Essentials', 'Pure kumkum and haldi powder',                40,   '🔴'),
  ('Chandan (Sandalwood Paste)',        'Pooja & Essentials', 'Pure sandalwood paste',                       90,   '🟤'),
  ('Yagna/Havan Samagri Kit',           'Pooja & Essentials', 'Complete havan kit with kund & ghee',        650,  '🔥'),
  ('Pandit/Priest Booking',             'Pooja & Essentials', 'Experienced purohit for your pooja',         3500, '🙏')
ON CONFLICT DO NOTHING;
