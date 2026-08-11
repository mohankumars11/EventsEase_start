-- ============================================================
-- Migration 033: Pooja & Essentials — complete kits, and traditions beyond one.  GENERATED FILE.
--
-- Produced by scripts/generate-catalog.mjs --set pooja on 2026-08-10 from pexels.
-- Do not hand-edit: change scripts/data/pooja-catalog.mjs and re-run.
--
-- The category held 67 rows that were mostly loose components — a bell, a
-- packet of kumkum, a bag of camphor — and read as a single tradition.
-- Both are real gaps for a shop piloting in Bengaluru and Mysore.
--
-- A family searches for "Satyanarayan Pooja Kit" the night before, not for
-- "Kumkum & Turmeric Combo"; and there was nothing at all for Varalakshmi
-- Vratham, Ayudha Pooja, Ugadi, Onam, Durga Puja or Karthigai Deepam.
--
-- The customiser (src/config/customizers/pooja.js) asks which tradition to
-- assemble for, how complete the kit should be, when the muhurat is, and
-- the name and gotra the purohit needs for the sankalp.
--
-- 43 products across 10 occasions:
--     6  Daily Pooja
--     6  Regional & Other
--     5  Small Functions
--     5  Wedding Pooja
--     4  Diwali
--     4  Ganesh Chaturthi
--     4  Griha Pravesh
--     4  Navratri
--     3  Janmashtami
--     2  Satyanarayan Pooja
--
-- Each row carries its own distinct photograph, deduplicated against every
-- image_url already in the products table — no two products in this shop
-- share a photo (that was migration 017's bug).
--
-- image_source is 'stock' on every row: these are licensed lookalikes and the
-- UI labels them "Representative image". Sambramo is pre-launch with no signed
-- supplier, so no photo here can claim to be the item that will arrive. An
-- admin uploading a real photo via Admin → Catalog flips the row to 'actual'.
-- See migration 023. Do not default-flip that column.
--
-- Every statement is guarded by NOT EXISTS on (name, category), so this file
-- is safe to re-run and safe to apply after a partial run.
--
-- 3 item(s) in the source data were skipped as already present:
--   Satyanarayan Pooja Complete Kit
--   Naming Ceremony Pooja Kit
--   Varalakshmi Vratham Kit
--
-- Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- Pooja & Essentials / Daily Pooja — Daily Pooja Starter Kit
--   query: home puja altar lamp incense brass india indian ritual devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Daily Pooja Starter Kit', 'Pooja & Essentials', 'Daily Pooja',
       'Everything for the morning lamp — a month of supplies', 899, '🪔',
       'https://images.pexels.com/photos/8819208/pexels-photo-8819208.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A man in traditional attire lighting a Diwali lamp, showcasing Indian culture and traditions.',
       'Photo by Yan Krukau on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Daily Pooja Starter Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Daily Pooja — Brass Pooja Mandir Cleaning Set
--   query: polishing brass idols cleaning india indian puja ritual devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Brass Pooja Mandir Cleaning Set', 'Pooja & Essentials', 'Daily Pooja',
       'Tamarind polish, cloths and brush for brass idols', 449, '🧽',
       'https://images.pexels.com/photos/11347092/pexels-photo-11347092.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Detailed view of Ganesha statues showcasing intricate designs under bright sunlight.',
       'Photo by Picas Joe on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Brass Pooja Mandir Cleaning Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Daily Pooja — Cotton Wicks & Ghee Combo (Monthly)
--   query: cotton wicks ghee lamp puja india indian ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Cotton Wicks & Ghee Combo (Monthly)', 'Pooja & Essentials', 'Daily Pooja',
       'Hand-rolled wicks with pure cow ghee', 349, '🕯️',
       'https://images.pexels.com/photos/32170218/pexels-photo-32170218.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A vibrant display of marigold flowers surrounding a lit ghee lamp used in a traditional Indian ceremonial setup.',
       'Photo by SAMPARK FILMS SAMPARKFILMS.COM on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Cotton Wicks & Ghee Combo (Monthly)' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Daily Pooja — Sandalwood Agarbatti Bulk Pack
--   query: incense sticks burning sandalwood smoke indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sandalwood Agarbatti Bulk Pack', 'Pooja & Essentials', 'Daily Pooja',
       '200 sticks, natural sandalwood, low smoke', 299, '🌫️',
       'https://images.pexels.com/photos/34486161/pexels-photo-34486161.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Women performing Chhath Puja with offerings in Lucknow, showcasing vibrant cultural traditions.',
       'Photo by Yash Rai on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sandalwood Agarbatti Bulk Pack' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Daily Pooja — Tulsi Plant with Brass Pot
--   query: tulsi holy basil plant pot indian home puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Tulsi Plant with Brass Pot', 'Pooja & Essentials', 'Daily Pooja',
       'Live tulsi in a traditional brass planter', 749, '🌿',
       'https://images.pexels.com/photos/8819203/pexels-photo-8819203.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully decorated Hindu altar with traditional offerings, featuring a Ganesha figurine and vibrant elements.',
       'Photo by Yan Krukau on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Tulsi Plant with Brass Pot' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Daily Pooja — Pooja Room Fresh Flower Subscription
--   query: fresh flowers offering temple india morning indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Pooja Room Fresh Flower Subscription', 'Pooja & Essentials', 'Daily Pooja',
       'Fresh flowers delivered every morning for a month', 1499, '🌸',
       'https://images.pexels.com/photos/34128369/pexels-photo-34128369.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A traditional Hindu ritual with participants in ceremonial attire by a riverbank.',
       'Photo by Sabarinath B on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Pooja Room Fresh Flower Subscription' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Griha Pravesh — Griha Pravesh Complete Kit
--   query: brass lamp rice grains kalash ceremony home blessing indian puja ritual devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Griha Pravesh Complete Kit', 'Pooja & Essentials', 'Griha Pravesh',
       'Every item for the housewarming rite, checklist included', 2499, '🏠',
       'https://images.pexels.com/photos/11652379/pexels-photo-11652379.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A vibrant display of items for a traditional Indian Hindu religious ceremony, featuring flowers and decorated offerings.',
       'Photo by Charm Andaya on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Griha Pravesh Complete Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Griha Pravesh — Milk Boiling Ceremony Set
--   query: brass vessel milk boiling ceremony indian kitchen puja ritual devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Milk Boiling Ceremony Set', 'Pooja & Essentials', 'Griha Pravesh',
       'Brass vessel, milk, rice and jaggery for the first boil', 899, '🥛',
       'https://images.pexels.com/photos/8819074/pexels-photo-8819074.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Two Indian women engaged in a sacred Diwali ritual at home, surrounded by traditional decor.',
       'Photo by Yan Krukau on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Milk Boiling Ceremony Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Griha Pravesh — Vastu Shanti Havan Kit
--   query: havan kund fire ritual indian ceremony puja brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Vastu Shanti Havan Kit', 'Pooja & Essentials', 'Griha Pravesh',
       'Havan kund, samagri, ghee and wood', 1899, '🔥',
       'https://images.pexels.com/photos/37531063/pexels-photo-37531063.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Traditional Hindu fire ritual setup with vibrant offerings and patterned mats.',
       'Photo by yashwant kashyap on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Vastu Shanti Havan Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Griha Pravesh — Mango Leaf Toran & Rangoli Set
--   query: mango leaf toran door decoration rangoli india indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mango Leaf Toran & Rangoli Set', 'Pooja & Essentials', 'Griha Pravesh',
       'Fresh toran with rangoli colours and stencils', 649, '🍃',
       'https://images.pexels.com/photos/8887074/pexels-photo-8887074.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful Indian sweets and flowers arranged for a traditional festive ritual indoors.',
       'Photo by Lara Jameson on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mango Leaf Toran & Rangoli Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Satyanarayan Pooja — Sheera Prasad Ingredients Kit
--   query: semolina halwa sheera indian sweet prasad puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sheera Prasad Ingredients Kit', 'Pooja & Essentials', 'Satyanarayan Pooja',
       'Semolina, ghee, sugar and banana for the prasad', 549, '🍮',
       'https://images.pexels.com/photos/8887200/pexels-photo-8887200.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of Indian sweets with brass lamps and flowers on a dark background.',
       'Photo by Lara Jameson on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sheera Prasad Ingredients Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Satyanarayan Pooja — Katha Book & Aarti Booklet Set
--   query: hindu prayer book aarti indian devotional puja ritual brass
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Katha Book & Aarti Booklet Set', 'Pooja & Essentials', 'Satyanarayan Pooja',
       'In your chosen language, large print', 249, '📖',
       'https://images.pexels.com/photos/14799094/pexels-photo-14799094.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A man performs a traditional Indian fire aarti ceremony outdoors at night. Illuminated crowd watches.',
       'Photo by ABHIJEET DEV on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Katha Book & Aarti Booklet Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Wedding Pooja — Wedding Mandap Pooja Kit
--   query: indian wedding mandap ritual fire ceremony puja brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Wedding Mandap Pooja Kit', 'Pooja & Essentials', 'Wedding Pooja',
       'Complete samagri for the mandap rites', 4999, '💍',
       'https://images.pexels.com/photos/7685849/pexels-photo-7685849.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A vibrant setup for a traditional Hindu ceremony featuring candles, flowers, and an image of Ganesha.',
       'Photo by RDNE Stock project on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Wedding Mandap Pooja Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Wedding Pooja — Ganesh Pooja Kit (Pre-Wedding)
--   query: ganesh idol puja offerings indian ceremony ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Ganesh Pooja Kit (Pre-Wedding)', 'Pooja & Essentials', 'Wedding Pooja',
       'For the ceremony that opens every wedding', 1299, '🐘',
       'https://images.pexels.com/photos/27904924/pexels-photo-27904924.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A serene Ganesh statue outdoors, adorned with vibrant flowers and natural surroundings.',
       'Photo by Ankit Rainloure on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Ganesh Pooja Kit (Pre-Wedding)' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Wedding Pooja — Kalash & Coconut Set (Set of 5)
--   query: brass kalash coconut mango leaves indian ritual puja devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Kalash & Coconut Set (Set of 5)', 'Pooja & Essentials', 'Wedding Pooja',
       'Five brass kalash with coconuts and mango leaves', 1599, '🏺',
       'https://images.pexels.com/photos/36873238/pexels-photo-36873238.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Intricate traditional offering setup in a Vavuniya temple, Sri Lanka.',
       'Photo by Thilina Alagiyawanna on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Kalash & Coconut Set (Set of 5)' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Wedding Pooja — Nalangu & Haldi Ceremony Set
--   query: turmeric sandalwood paste bowls indian wedding ritual puja brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Nalangu & Haldi Ceremony Set', 'Pooja & Essentials', 'Wedding Pooja',
       'Turmeric, sandal, rosewater and vermilion for the rites', 999, '🌼',
       'https://images.pexels.com/photos/35289805/pexels-photo-35289805.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of hands in traditional attire holding a bowl of turmeric paste, symbolizing Bengali rituals.',
       'Photo by Arpan Adhikary on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Nalangu & Haldi Ceremony Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Wedding Pooja — Mangalsutra Thali Decoration Set
--   query: decorated puja thali indian wedding gold ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mangalsutra Thali Decoration Set', 'Pooja & Essentials', 'Wedding Pooja',
       'Decorated thali for the mangalsutra ceremony', 1199, '📿',
       'https://images.pexels.com/photos/7685993/pexels-photo-7685993.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a decorated puja thali with a lit diya, symbolizing Diwali celebrations.',
       'Photo by RDNE Stock project on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mangalsutra Thali Decoration Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Small Functions — Annaprashan Ceremony Kit
--   query: silver bowl spoon baby rice ceremony indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Annaprashan Ceremony Kit', 'Pooja & Essentials', 'Small Functions',
       'Silver spoon, bowl and samagri for the first feeding', 1299, '🍚',
       'https://images.pexels.com/photos/12936912/pexels-photo-12936912.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a traditional Indian puja plate with diya and red roses, held in hands.',
       'Photo by BANU FILM  ADS on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Annaprashan Ceremony Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Small Functions — Mundan Ceremony Kit
--   query: indian baby head shaving ceremony ritual puja brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mundan Ceremony Kit', 'Pooja & Essentials', 'Small Functions',
       'Samagri for the first-haircut rite', 999, '✂️',
       'https://images.pexels.com/photos/34473104/pexels-photo-34473104.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Women participating in Chhath Puja in Bihar, showcasing traditional Indian attire and rituals.',
       'Photo by Monojit Dutta on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mundan Ceremony Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Small Functions — Birthday Ayushya Homam Kit
--   query: homam fire ritual indian priest offering puja brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Birthday Ayushya Homam Kit', 'Pooja & Essentials', 'Small Functions',
       'For a long-life blessing on a birthday', 1799, '🔥',
       'https://images.pexels.com/photos/13405691/pexels-photo-13405691.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A Hindu priest performing a sacred fire ritual inside a dimly lit room, highlighting spiritual traditions.',
       'Photo by Teja J on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Birthday Ayushya Homam Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Small Functions — Seemantham Ceremony Kit
--   query: colourful glass bangles stack close up indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Seemantham Ceremony Kit', 'Pooja & Essentials', 'Small Functions',
       'Bangles, turmeric and samagri for the baby shower rite', 1699, '🤰',
       'https://images.pexels.com/photos/12431906/pexels-photo-12431906.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A vibrant scene of a traditional ceremony in Tirupati, showcasing colorful attire and rituals.',
       'Photo by BANU FILM  ADS on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Seemantham Ceremony Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Small Functions — Shraddha & Tarpanam Kit
--   query: hands pouring water offering ritual sunrise river indian puja brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Shraddha & Tarpanam Kit', 'Pooja & Essentials', 'Small Functions',
       'Darbha, sesame and vessels for ancestral rites', 899, '🕊️',
       'https://images.pexels.com/photos/19238673/pexels-photo-19238673.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant Chhath Puja celebration in Kolkata with offerings and prayers by the river.',
       'Photo by Dibakar Roy on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Shraddha & Tarpanam Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Diwali — Lakshmi Puja Complete Kit
--   query: lakshmi ganesh idols diwali puja offerings indian ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Lakshmi Puja Complete Kit', 'Pooja & Essentials', 'Diwali',
       'Idols, samagri, chowki and offerings for Diwali night', 1899, '🪔',
       'https://images.pexels.com/photos/20874780/pexels-photo-20874780.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful Hindu figurines in Dharan, Nepal depict religious art surrounded by natural elements.',
       'Photo by Chetan Maskey on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Lakshmi Puja Complete Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Diwali — Diwali Diya Set — Hand Painted (24 pc)
--   query: hand painted terracotta diyas diwali colourful indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Diwali Diya Set — Hand Painted (24 pc)', 'Pooja & Essentials', 'Diwali',
       'Terracotta diyas painted by local artisans', 699, '🎨',
       'https://images.pexels.com/photos/8819210/pexels-photo-8819210.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Hand lighting a decorative diya for an Indian festival celebration.',
       'Photo by Yan Krukau on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Diwali Diya Set — Hand Painted (24 pc)' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Diwali — Chopda Pujan Kit (Account Books)
--   query: ledger book puja indian business ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Chopda Pujan Kit (Account Books)', 'Pooja & Essentials', 'Diwali',
       'For the ledger blessing on Lakshmi Puja', 899, '📒',
       'https://images.pexels.com/photos/7685639/pexels-photo-7685639.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of religious symbols including golden bells and a book on a green placemat.',
       'Photo by RDNE Stock project on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Chopda Pujan Kit (Account Books)' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Diwali — Govardhan & Annakut Pooja Kit
--   query: indian festival food offering temple annakut puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Govardhan & Annakut Pooja Kit', 'Pooja & Essentials', 'Diwali',
       'Samagri for the day after Diwali', 1199, '🍲',
       'https://images.pexels.com/photos/4105330/pexels-photo-4105330.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful Indian ceremonial offering with flowers, fruits, and grains, symbolizing traditional culture.',
       'Photo by Nishant Patel on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Govardhan & Annakut Pooja Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Navratri — Durga Puja Complete Kit
--   query: durga puja idol red hibiscus bengali festival indian ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Durga Puja Complete Kit', 'Pooja & Essentials', 'Navratri',
       'Full samagri with red hibiscus and dhunuchi', 2299, '🌺',
       'https://images.pexels.com/photos/33669866/pexels-photo-33669866.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Traditional Durga Puja idols displayed at Kolkata festival, celebrating Hindu goddess.',
       'Photo by Srijan  Kundu on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Durga Puja Complete Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Navratri — Golu Doll Arrangement Starter Set
--   query: golu dolls display steps south indian navratri puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Golu Doll Arrangement Starter Set', 'Pooja & Essentials', 'Navratri',
       'Steps and starter dolls for the Navratri display', 2999, '🪆',
       'https://images.pexels.com/photos/15599871/pexels-photo-15599871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of vibrant traditional Indian festival decorations featuring colorful ornaments and cultural elements.',
       'Photo by Teja J on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Golu Doll Arrangement Starter Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Navratri — Kanya Pujan Kit (9 Girls)
--   query: indian girls festival ritual offering colourful puja brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Kanya Pujan Kit (9 Girls)', 'Pooja & Essentials', 'Navratri',
       'Gifts, chunri and prasad for nine kanyas', 1499, '👧',
       'https://images.pexels.com/photos/18852967/pexels-photo-18852967.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A vibrant depiction of a traditional Indian ceremony with people in colorful attire in Bokaro Steel City, India.',
       'Photo by Ravi Roshan on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Kanya Pujan Kit (9 Girls)' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Navratri — Dandiya Sticks & Aarti Set
--   query: dandiya sticks garba navratri colourful indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Dandiya Sticks & Aarti Set', 'Pooja & Essentials', 'Navratri',
       'Decorated dandiya pair with an aarti thali', 799, '🪘',
       'https://images.pexels.com/photos/8000319/pexels-photo-8000319.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful Navratri items, including Indian mask and dandiya sticks, on display.',
       'Photo by Sonika Agarwal on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Dandiya Sticks & Aarti Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Ganesh Chaturthi — Eco Ganesh Idol — Clay (12 inch)
--   query: eco friendly clay ganesh idol natural indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Eco Ganesh Idol — Clay (12 inch)', 'Pooja & Essentials', 'Ganesh Chaturthi',
       'Natural clay, dissolves cleanly, seed embedded', 1299, '🐘',
       'https://images.pexels.com/photos/28770110/pexels-photo-28770110.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Magnificent Ganesh idol adorned for the Ganesh Chaturthi festival in Mumbai.',
       'Photo by By - Nilesh RY 🇮🇳 on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Eco Ganesh Idol — Clay (12 inch)' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Ganesh Chaturthi — Ganpati Decoration Kit
--   query: ganpati decoration home mandap flowers lights indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Ganpati Decoration Kit', 'Pooja & Essentials', 'Ganesh Chaturthi',
       'Backdrop, drapes, lights and flowers for the mandap', 1899, '🎊',
       'https://images.pexels.com/photos/36559754/pexels-photo-36559754.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a colorful Ganesh idol, a symbol of wisdom and new beginnings, in Mumbai, India.',
       'Photo by Sonika Agarwal on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Ganpati Decoration Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Ganesh Chaturthi — Modak Making Kit
--   query: modak indian sweet dumpling coconut jaggery puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Modak Making Kit', 'Pooja & Essentials', 'Ganesh Chaturthi',
       'Moulds, rice flour, jaggery and coconut', 649, '🍡',
       'https://images.pexels.com/photos/36619169/pexels-photo-36619169.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Assorted Indian modak sweets and ladoos on a silver platter, symbolizing festive celebrations.',
       'Photo by Sabhyata Sahu on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Modak Making Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Ganesh Chaturthi — Visarjan Day Kit
--   query: ganesh visarjan immersion water ritual india indian puja brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Visarjan Day Kit', 'Pooja & Essentials', 'Ganesh Chaturthi',
       'Offerings and an eco-safe immersion bucket', 549, '🌊',
       'https://images.pexels.com/photos/28770062/pexels-photo-28770062.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A colorful Ganesh Chaturthi procession captures the spirit of Mumbai with a large Ganesh idol surrounded by devotees.',
       'Photo by By - Nilesh RY 🇮🇳 on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Visarjan Day Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Janmashtami — Janmashtami Jhula Decoration Set
--   query: krishna cradle jhula decoration peacock feather indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Janmashtami Jhula Decoration Set', 'Pooja & Essentials', 'Janmashtami',
       'Decorated cradle with peacock feathers and flowers', 1499, '🦚',
       'https://images.pexels.com/photos/18139763/pexels-photo-18139763.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Charming newborn baby wrapped in yellow fabric, adorned with peacock feather and vivid Indian themes.',
       'Photo by Eternal Slayer on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Janmashtami Jhula Decoration Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Janmashtami — Bal Gopal Dress & Ornament Set
--   query: krishna idol dress crown flute ornaments indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Bal Gopal Dress & Ornament Set', 'Pooja & Essentials', 'Janmashtami',
       'Silk dress, crown, flute and jewellery for the idol', 899, '👑',
       'https://images.pexels.com/photos/31727268/pexels-photo-31727268.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant statues of Krishna and Radha adorned with flowers, showcasing rich cultural artistry.',
       'Photo by VipinVihari  Murari Das on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Bal Gopal Dress & Ornament Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Janmashtami — Panjiri & Makhan Mishri Prasad Kit
--   query: indian sweet prasad offering butter sugar puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Panjiri & Makhan Mishri Prasad Kit', 'Pooja & Essentials', 'Janmashtami',
       'Traditional prasad ingredients for the midnight aarti', 549, '🍬',
       'https://images.pexels.com/photos/8819258/pexels-photo-8819258.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A vibrant display of Indian sweets and decorations for Diwali festival, showcasing traditional culture and festivity.',
       'Photo by Yan Krukau on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Panjiri & Makhan Mishri Prasad Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Regional & Other — Ayudha Pooja Kit
--   query: ayudha pooja tools vehicle decoration banana leaves indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Ayudha Pooja Kit', 'Pooja & Essentials', 'Regional & Other',
       'For the tools, books and vehicles — banana, lime and kumkum', 1299, '🛠️',
       'https://images.pexels.com/photos/31008647/pexels-photo-31008647.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful Indian religious ritual setup with flowers on leaves in Kolkata.',
       'Photo by Monojit Dutta on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Ayudha Pooja Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Regional & Other — Onam Pookalam Flower Kit
--   query: marigold petals arranged circular pattern floor indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Onam Pookalam Flower Kit', 'Pooja & Essentials', 'Regional & Other',
       'Loose petals sorted by colour for the floor design', 1499, '🌼',
       'https://images.pexels.com/photos/8818623/pexels-photo-8818623.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Top view of a colorful Diwali rangoli adorned with flower petals and candles on wooden flooring.',
       'Photo by Yan Krukau on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Onam Pookalam Flower Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Regional & Other — Karthigai Deepam Lamp Set
--   query: row of oil lamps south indian festival deepam puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Karthigai Deepam Lamp Set', 'Pooja & Essentials', 'Regional & Other',
       'Agal vilakku lamps with wicks and oil', 1199, '🕯️',
       'https://images.pexels.com/photos/34899896/pexels-photo-34899896.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Elegant brass oil lamps lit for a traditional Indian ceremony indoors.',
       'Photo by Mian Rizwan on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Karthigai Deepam Lamp Set' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Regional & Other — Pongal Celebration Kit
--   query: pongal clay pot sugarcane harvest tamil festival indian puja ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Pongal Celebration Kit', 'Pooja & Essentials', 'Regional & Other',
       'Clay pot, sugarcane, turmeric plant and rice', 1399, '🌾',
       'https://images.pexels.com/photos/35763758/pexels-photo-35763758.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautiful arrangement for Pongal festival featuring a decorated pot, mango leaves, flowers, and bananas in Sri Lanka.',
       'Photo by Dinuka Gunawardana on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Pongal Celebration Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Regional & Other — Chhath Puja Kit
--   query: chhath puja bamboo basket offerings river sunrise indian ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Chhath Puja Kit', 'Pooja & Essentials', 'Regional & Other',
       'Bamboo soop, fruits and offerings for the river rites', 1799, '🌅',
       'https://images.pexels.com/photos/34481838/pexels-photo-34481838.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Women in traditional attire perform a religious ceremony at a river, holding offerings.',
       'Photo by AJAY KUMAR on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Chhath Puja Kit' AND category = 'Pooja & Essentials'
);

-- Pooja & Essentials / Regional & Other — Saraswati Puja Kit
--   query: saraswati puja books yellow flowers indian festival ritual brass devotional
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Saraswati Puja Kit', 'Pooja & Essentials', 'Regional & Other',
       'For Vasant Panchami — books, veena and yellow flowers', 1199, '📚',
       'https://images.pexels.com/photos/34093415/pexels-photo-34093415.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A vibrant Durga Puja scene with worshipper and idols in Kolkata temple.',
       'Photo by Trishik Bose on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Saraswati Puja Kit' AND category = 'Pooja & Essentials'
);

COMMIT;
