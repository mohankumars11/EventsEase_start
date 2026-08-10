-- ============================================================
-- Migration 029: the cake catalogue, by occasion.  GENERATED FILE.
--
-- Produced by scripts/generate-cake-catalog.mjs on 2026-08-10 from pexels.
-- Do not hand-edit: change scripts/data/cake-catalog.mjs and re-run.
--
-- Migration 015 gave the shop 51 cakes under ten occasion tags. That covers
-- a greeting-card calendar, not a life: there was nothing for a first
-- birthday, a naming ceremony, an annaprashan, a mundan, a roka, a
-- bride-to-be, a groom-to-be, a haldi, a retirement, a housewarming, Onam,
-- Eid, or the plain "I'm sorry" cake that is a real and frequent order.
--
-- 154 cakes across 48 occasions:
--    10  Birthday
--     9  Milestone Birthday
--     7  Kids & Theme
--     6  First Birthday
--     5  Anniversary
--     4  Bride to Be
--     4  Corporate
--     4  Engagement
--     4  Groom to Be
--     4  Haldi & Mehendi
--     3  Baby Shower
--     3  Christmas
--     3  Congratulations
--     3  Diwali
--     3  Eid
--     3  Father's Day
--     3  Gender Reveal
--     3  Half Birthday
--     3  Housewarming
--     3  Just Because
--     3  Mother's Day
--     3  Naming Ceremony
--     3  New Beginnings
--     3  New Year
--     3  Pet Birthday
--     3  Pongal & Onam
--     3  Proposal
--     3  Rakhi
--     3  Retirement
--     3  Sugar-Free
--     3  Vegan
--     3  Wedding
--     2  Annaprashan
--     2  First Day at School
--     2  Friendship Day
--     2  Ganesh Chaturthi
--     2  Get Well Soon
--     2  Gluten-Free
--     2  Holi
--     2  Mundan
--     2  Navratri
--     2  Roka
--     2  Sangeet
--     2  Sorry
--     2  Teachers Day
--     2  Thank You
--     2  Valentine
--     1  Farewell
--
-- Each row carries its own distinct photograph, deduplicated against every
-- image_url already in the products table — no two products in this shop
-- share a photo (that was migration 017's bug).
--
-- image_source is 'stock' on every row: these are licensed lookalikes and
-- the UI labels them "Representative image". Sambramo is pre-launch with no
-- signed bakery, so no photo here can claim to be the item that will arrive.
-- An admin uploading a real photo via Admin → Catalog flips the row to
-- 'actual'. See migration 023. Do not default-flip that column.
--
-- Prices are benchmarked against the going rate for the equivalent item at
-- established Indian bakery chains, on the same basis as migration 015 —
-- not quoted from any named supplier, because there isn't one yet.
--
-- Every statement is guarded by NOT EXISTS on (name, category), so this file
-- is safe to re-run and safe to apply after a partial run.
--
-- Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- Cakes / First Birthday — First Birthday Smash Cake (0.5kg)
--   query: first birthday smash cake baby dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'First Birthday Smash Cake (0.5kg)', 'Cakes', 'First Birthday',
       'Soft eggless sponge, safe for a one-year-old to demolish', 649, '🎂',
       'https://images.pexels.com/photos/961192/pexels-photo-961192.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Cute baby enjoying a cake smash on white background, capturing innocence and joy.',
       'Photo by Henley Design Studio on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'First Birthday Smash Cake (0.5kg)' AND category = 'Cakes'
);

-- Cakes / First Birthday — One-derful First Birthday Cake (1kg)
--   query: first birthday cake number one topper dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'One-derful First Birthday Cake (1kg)', 'Cakes', 'First Birthday',
       'Fondant "ONE" topper, pastel buttercream', 1249, '1️⃣',
       'https://images.pexels.com/photos/27176379/pexels-photo-27176379.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful first birthday cake setup with cupcakes, perfect for celebrations and events.',
       'Photo by Helena Lopes on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'One-derful First Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / First Birthday — Baby Boy First Birthday Cake (1kg)
--   query: blue gold first birthday cake boy dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Baby Boy First Birthday Cake (1kg)', 'Cakes', 'First Birthday',
       'Blue and gold theme, name piped on top', 1199, '👦',
       'https://images.pexels.com/photos/27176374/pexels-photo-27176374.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully decorated cake with cupcakes for a first birthday celebration.',
       'Photo by Helena Lopes on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Baby Boy First Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / First Birthday — Baby Girl First Birthday Cake (1kg)
--   query: pink gold first birthday cake girl dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Baby Girl First Birthday Cake (1kg)', 'Cakes', 'First Birthday',
       'Pink and gold theme, name piped on top', 1199, '👧',
       'https://images.pexels.com/photos/13321666/pexels-photo-13321666.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Adorable 1st birthday cake with pink decorations, toys, and floral backdrop.',
       'Photo by Xuân Thống Trần on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Baby Girl First Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / First Birthday — Twinkle Twinkle First Birthday Cake (1.5kg)
--   query: star moon themed birthday cake pastel dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Twinkle Twinkle First Birthday Cake (1.5kg)', 'Cakes', 'First Birthday',
       'Star and moon fondant, edible glitter', 1699, '⭐',
       'https://images.pexels.com/photos/11782115/pexels-photo-11782115.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Charming pastel birthday cake with teddy bear decor and bokeh lights.',
       'Photo by Shannon Deans on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Twinkle Twinkle First Birthday Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / First Birthday — First Birthday Two-Tier Cake (2kg)
--   query: two tier first birthday cake celebration dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'First Birthday Two-Tier Cake (2kg)', 'Cakes', 'First Birthday',
       'Two tiers, smash cake on top for the baby', 2399, '🎉',
       'https://images.pexels.com/photos/11281633/pexels-photo-11281633.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully decorated layer cake with a cartoon character topper, perfect for special celebrations.',
       'Photo by Vidal Balielo Jr. on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'First Birthday Two-Tier Cake (2kg)' AND category = 'Cakes'
);

-- Cakes / Half Birthday — Half Birthday Cake — 6 Months (0.5kg)
--   query: half birthday cake six months baby dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Half Birthday Cake — 6 Months (0.5kg)', 'Cakes', 'Half Birthday',
       'Half-round cake marking six months', 749, '🌗',
       'https://images.pexels.com/photos/34636546/pexels-photo-34636546.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Cute baby lying on a fluffy blanket next to a half-year chalkboard and cake. Perfect for birthday themes.',
       'Photo by bigmass media and printing on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Half Birthday Cake — 6 Months (0.5kg)' AND category = 'Cakes'
);

-- Cakes / Half Birthday — Half Rainbow Half Birthday Cake (1kg)
--   query: rainbow half birthday cake pastel dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Half Rainbow Half Birthday Cake (1kg)', 'Cakes', 'Half Birthday',
       'Half a rainbow in buttercream, "1/2" topper', 1149, '🌈',
       'https://images.pexels.com/photos/36982680/pexels-photo-36982680.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A close-up of a cake covered in white icing and colorful sprinkles on a patterned tablecloth.',
       'Photo by Natalia Sevruk on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Half Rainbow Half Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Half Birthday — Half Birthday Photo Cake (1kg)
--   query: edible photo print cake baby dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Half Birthday Photo Cake (1kg)', 'Cakes', 'Half Birthday',
       'Edible print of your six-month photoshoot', 1249, '📸',
       'https://images.pexels.com/photos/2337854/pexels-photo-2337854.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful animal-themed cupcakes decorated with toy horses on a dessert table.',
       'Photo by Vidal Balielo Jr. on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Half Birthday Photo Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Milestone Birthday — Sweet Sixteen Cake (1kg)
--   query: sweet sixteen birthday cake pink gold dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sweet Sixteen Cake (1kg)', 'Cakes', 'Milestone Birthday',
       'Blush and gold, "Sweet 16" topper', 1299, '💖',
       'https://images.pexels.com/photos/12689012/pexels-photo-12689012.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautiful tiered white birthday cake adorned with pink flowers and a ''16'' topper, set in a festive atmosphere.',
       'Photo by Vidal Balielo Jr. on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sweet Sixteen Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Milestone Birthday — 18th Birthday Celebration Cake (1kg)
--   query: 18th birthday cake celebration gold dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT '18th Birthday Celebration Cake (1kg)', 'Cakes', 'Milestone Birthday',
       'Key-to-adulthood fondant detail', 1249, '🔑',
       'https://images.pexels.com/photos/9475871/pexels-photo-9475871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Beautifully decorated pink cake with floral design for an 18th birthday celebration, perfect for parties.',
       'Photo by Sasi selvarajah on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = '18th Birthday Celebration Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Milestone Birthday — 21st Birthday Cake (1.5kg)
--   query: 21st birthday drip cake gold dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT '21st Birthday Cake (1.5kg)', 'Cakes', 'Milestone Birthday',
       'Drip cake with gold "21" topper', 1599, '🥂',
       'https://images.pexels.com/photos/5691261/pexels-photo-5691261.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Stylish yellow birthday cake adorned with macarons and golden accents, perfect for celebrations.',
       'Photo by Itay Weissman on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = '21st Birthday Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Milestone Birthday — 25th Silver Birthday Cake (1kg)
--   query: silver themed birthday cake elegant dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT '25th Silver Birthday Cake (1kg)', 'Cakes', 'Milestone Birthday',
       'Silver accents, quarter-century milestone', 1349, '🥈',
       'https://images.pexels.com/photos/6006320/pexels-photo-6006320.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A cheerful woman holding a birthday cake slice on a plate with a single candle.',
       'Photo by Polina Tankilevitch on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = '25th Silver Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Milestone Birthday — 30th Birthday Cake (1kg)
--   query: 30th birthday cake black gold elegant dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT '30th Birthday Cake (1kg)', 'Cakes', 'Milestone Birthday',
       'Modern monochrome design, "30" topper', 1299, '🎊',
       'https://images.pexels.com/photos/30665208/pexels-photo-30665208.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       '30th birthday cake with candles and champagne for a festive celebration.',
       'Photo by Jonathan Valdes on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = '30th Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Milestone Birthday — 40th Birthday Cake (1kg)
--   query: 40th birthday cake elegant adult dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT '40th Birthday Cake (1kg)', 'Cakes', 'Milestone Birthday',
       'Wine-and-cheese theme for the fortieth', 1299, '🍷',
       'https://images.pexels.com/photos/14940773/pexels-photo-14940773.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Man in formal attire enjoying a slice of rich chocolate cake indoors.',
       'Photo by Tanya Volt on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = '40th Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Milestone Birthday — 50th Golden Birthday Cake (1.5kg)
--   query: 50th birthday cake gold luxury dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT '50th Golden Birthday Cake (1.5kg)', 'Cakes', 'Milestone Birthday',
       'Gold leaf finish, half-century celebration', 1899, '🌟',
       'https://images.pexels.com/photos/7826289/pexels-photo-7826289.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Elegant cake with golden 50th birthday topper and star decorations.',
       'Photo by Nataliya Vaitkevich on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = '50th Golden Birthday Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Milestone Birthday — 60th Shashtiabdapoorthi Cake (2kg)
--   query: traditional indian celebration cake gold marigold dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT '60th Shashtiabdapoorthi Cake (2kg)', 'Cakes', 'Milestone Birthday',
       'Traditional sixtieth celebration, temple-gold styling', 2499, '🪔',
       'https://images.pexels.com/photos/8819838/pexels-photo-8819838.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of hands exchanging a plate of Indian sweets and flowers during Diwali, showcasing cultural richness.',
       'Photo by Yan Krukau on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = '60th Shashtiabdapoorthi Cake (2kg)' AND category = 'Cakes'
);

-- Cakes / Milestone Birthday — 75th Birthday Amrit Mahotsav Cake (1.5kg)
--   query: elegant birthday cake elderly celebration family dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT '75th Birthday Amrit Mahotsav Cake (1.5kg)', 'Cakes', 'Milestone Birthday',
       'Seventy-fifth year, family-photo topper option', 1999, '🏵️',
       'https://images.pexels.com/photos/5729073/pexels-photo-5729073.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Three senior women celebrate a 65th birthday with cake and coffee indoors.',
       'Photo by olia danilevich on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = '75th Birthday Amrit Mahotsav Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Birthday — Bento Birthday Cake (0.3kg)
--   query: bento mini cake lunchbox korean dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Bento Birthday Cake (0.3kg)', 'Cakes', 'Birthday',
       'Mini lunchbox cake for one or two, message hand-piped', 549, '🍱',
       'https://images.pexels.com/photos/37290956/pexels-photo-37290956.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Tasty beef rice bowl with sesame seeds in a cardboard container, ideal for takeout meals.',
       'Photo by FOX ^.ᆽ.^= ∫ on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Bento Birthday Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Birthday — Birthday Cupcake Box (Set of 12)
--   query: box of birthday cupcakes frosted assorted cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Birthday Cupcake Box (Set of 12)', 'Cakes', 'Birthday',
       'A dozen frosted cupcakes, assorted flavours', 899, '🧁',
       'https://images.pexels.com/photos/8525753/pexels-photo-8525753.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Showcase of colorful and decorative cupcakes in a bakery display.',
       'Photo by Tom Fisk on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Birthday Cupcake Box (Set of 12)' AND category = 'Cakes'
);

-- Cakes / Birthday — Jar Cake Trio — Birthday (Set of 3)
--   query: layered dessert cake in a jar food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Jar Cake Trio — Birthday (Set of 3)', 'Cakes', 'Birthday',
       'Three layered dessert jars, spoons included', 549, '🫙',
       'https://images.pexels.com/photos/8783658/pexels-photo-8783658.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a creamy red velvet cake in a jar with spoon, perfect for dessert lovers.',
       'Photo by Ambika on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Jar Cake Trio — Birthday (Set of 3)' AND category = 'Cakes'
);

-- Cakes / Birthday — Midnight Surprise Birthday Cake (1kg)
--   query: birthday cake candles midnight celebration dark dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Midnight Surprise Birthday Cake (1kg)', 'Cakes', 'Birthday',
       'Delivered at 12am sharp with candles and a knife', 999, '🌙',
       'https://images.pexels.com/photos/13063258/pexels-photo-13063258.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a chocolate cake with candles and cookies, perfect for celebrations.',
       'Photo by Shahbaz Ansari on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Midnight Surprise Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Birthday — Bomb Cake — Birthday Surprise (1kg)
--   query: chocolate sphere dessert cracked ganache cake food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Bomb Cake — Birthday Surprise (1kg)', 'Cakes', 'Birthday',
       'Chocolate sphere cracks open over the cake', 1499, '💣',
       'https://images.pexels.com/photos/33674414/pexels-photo-33674414.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delicious chocolate lava cake served with vanilla ice cream and cherries on a white plate.',
       'Photo by pedro furtado on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Bomb Cake — Birthday Surprise (1kg)' AND category = 'Cakes'
);

-- Cakes / Birthday — Tall Cake — Birthday Showstopper (2kg)
--   query: tall single tier celebration cake dramatic dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Tall Cake — Birthday Showstopper (2kg)', 'Cakes', 'Birthday',
       'Extra-tall single tier, dramatic centrepiece', 2799, '🗼',
       'https://images.pexels.com/photos/19651272/pexels-photo-19651272.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A selection of beautifully presented layer cakes on a table with natural lighting. Ideal for food photography and dessert enthusiasts.',
       'Photo by Yulia Oliinychenko on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Tall Cake — Birthday Showstopper (2kg)' AND category = 'Cakes'
);

-- Cakes / Birthday — Fresh Fruit Birthday Cake (1kg)
--   query: fresh fruit cream cake strawberry kiwi dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Fresh Fruit Birthday Cake (1kg)', 'Cakes', 'Birthday',
       'Seasonal fruit, light whipped cream', 949, '🍓',
       'https://images.pexels.com/photos/14198484/pexels-photo-14198484.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful fruit tart with strawberries, kiwis, and berries on wooden table.',
       'Photo by David Levinson on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Fresh Fruit Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Birthday — Gulab Jamun Fusion Cake (1kg)
--   query: indian fusion dessert cake gulab jamun food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Gulab Jamun Fusion Cake (1kg)', 'Cakes', 'Birthday',
       'Sponge layered with gulab jamun and rabri', 1149, '🍮',
       'https://images.pexels.com/photos/29727267/pexels-photo-29727267.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Box of gourmet cupcakes topped with whipped cream, gulab jamun, and nuts alongside colorful flowers.',
       'Photo by Disha on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Gulab Jamun Fusion Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Birthday — Filter Coffee Birthday Cake (1kg)
--   query: coffee mocha layer cake espresso dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Filter Coffee Birthday Cake (1kg)', 'Cakes', 'Birthday',
       'South Indian filter coffee sponge, mocha cream', 999, '☕',
       'https://images.pexels.com/photos/12951749/pexels-photo-12951749.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Rich chocolate cake slice on wooden board with espresso coffee for a sweet treat.',
       'Photo by Marcelo Verfe on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Filter Coffee Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Birthday — Rasmalai Birthday Cake (1kg)
--   query: saffron pistachio cake indian dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Rasmalai Birthday Cake (1kg)', 'Cakes', 'Birthday',
       'Saffron-pistachio sponge soaked in rabri', 1199, '🥛',
       'https://images.pexels.com/photos/30575774/pexels-photo-30575774.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully decorated homemade chocolate cake topped with pistachios in a cozy setting.',
       'Photo by Sena on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Rasmalai Birthday Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Kids & Theme — Farm Animals Theme Cake (1kg)
--   query: farm animal themed birthday cake fondant dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Farm Animals Theme Cake (1kg)', 'Cakes', 'Kids & Theme',
       'Fondant barnyard animals, green pasture base', 1399, '🐄',
       'https://images.pexels.com/photos/20426690/pexels-photo-20426690.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Cute first birthday cake topper with barn and piglet decoration in pastel colors.',
       'Photo by Jonathan Borba on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Farm Animals Theme Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Kids & Theme — Space & Rocket Theme Cake (1kg)
--   query: space galaxy rocket birthday cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Space & Rocket Theme Cake (1kg)', 'Cakes', 'Kids & Theme',
       'Galaxy buttercream with a fondant rocket', 1449, '🚀',
       'https://images.pexels.com/photos/18127546/pexels-photo-18127546.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant blue lollipops arranged in a black container, perfect for party table decor.',
       'Photo by Jonathan Borba on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Space & Rocket Theme Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Kids & Theme — Mermaid Theme Cake (1.5kg)
--   query: mermaid ocean themed birthday cake pastel dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mermaid Theme Cake (1.5kg)', 'Cakes', 'Kids & Theme',
       'Ocean waves, edible pearls and a fondant tail', 1699, '🧜',
       'https://images.pexels.com/photos/10949646/pexels-photo-10949646.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A whimsical mermaid-themed cake adorned with sea-inspired decorations perfect for birthday celebrations.',
       'Photo by Vidal Balielo Jr. on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mermaid Theme Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Kids & Theme — Cricket Theme Cake (1kg)
--   query: cricket themed birthday cake pitch dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Cricket Theme Cake (1kg)', 'Cakes', 'Kids & Theme',
       'Pitch, bat and stumps in fondant', 1349, '🏏',
       'https://images.pexels.com/photos/9189262/pexels-photo-9189262.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A small soccer themed cake with green icing and a fondant soccer ball top. Perfect for birthdays.',
       'Photo by Helena Lopes on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Cricket Theme Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Kids & Theme — Video Game Theme Cake (1kg)
--   query: video game controller themed birthday cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Video Game Theme Cake (1kg)', 'Cakes', 'Kids & Theme',
       'Pixel-art fondant, controller topper', 1399, '🎮',
       'https://images.pexels.com/photos/27175441/pexels-photo-27175441.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful ''Two Fast'' themed cake at a racing birthday party setup.',
       'Photo by Helena Lopes on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Video Game Theme Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Kids & Theme — Ballerina Theme Cake (1kg)
--   query: ballerina tutu themed birthday cake pink dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Ballerina Theme Cake (1kg)', 'Cakes', 'Kids & Theme',
       'Tutu ruffles in buttercream, pastel palette', 1449, '🩰',
       'https://images.pexels.com/photos/7103709/pexels-photo-7103709.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delightful ballerina-themed birthday setup with pink cake, chocolate treats, and decorative jewelry box.',
       'Photo by Ana Paula on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Ballerina Theme Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Kids & Theme — Construction Site Theme Cake (1.5kg)
--   query: construction truck themed birthday cake kids dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Construction Site Theme Cake (1.5kg)', 'Cakes', 'Kids & Theme',
       'Diggers, sand and rubble — all edible', 1649, '🚜',
       'https://images.pexels.com/photos/32370617/pexels-photo-32370617.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant birthday party setup with traffic cones and toy trucks for a child''s celebration.',
       'Photo by Jonathan Borba on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Construction Site Theme Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Pet Birthday — Pawty Dog Birthday Cake (0.5kg)
--   query: dog birthday cake pet celebration dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Pawty Dog Birthday Cake (0.5kg)', 'Cakes', 'Pet Birthday',
       'Pet-safe banana and peanut butter, no sugar or chocolate', 649, '🐶',
       'https://images.pexels.com/photos/37330441/pexels-photo-37330441.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Yorkshire Terrier enjoying a cake with a festive hat, perfect for pet birthday celebrations.',
       'Photo by Keyla Brito on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Pawty Dog Birthday Cake (0.5kg)' AND category = 'Cakes'
);

-- Cakes / Pet Birthday — Cat Birthday Treat Cake (0.3kg)
--   query: cat pet birthday treat celebration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Cat Birthday Treat Cake (0.3kg)', 'Cakes', 'Pet Birthday',
       'Pet-safe tuna and oat cake for cats', 549, '🐱',
       'https://images.pexels.com/photos/34231623/pexels-photo-34231623.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Two cats enjoy a festive birthday party complete with decorations and treats.',
       'Photo by Ivy Marie on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Cat Birthday Treat Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Pet Birthday — Pet Photo Cake (0.5kg)
--   query: dog with birthday cake pet portrait dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Pet Photo Cake (0.5kg)', 'Cakes', 'Pet Birthday',
       'Their face, printed in pet-safe edible ink', 799, '🐾',
       'https://images.pexels.com/photos/15472083/pexels-photo-15472083.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Cute dog wearing birthday hat with cupcakes and human hand on white background.',
       'Photo by Jacob Sierra on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Pet Photo Cake (0.5kg)' AND category = 'Cakes'
);

-- Cakes / Gender Reveal — Gender Reveal Surprise Cake (1kg)
--   query: gender reveal cake pink blue inside dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Gender Reveal Surprise Cake (1kg)', 'Cakes', 'Gender Reveal',
       'Neutral outside, pink or blue inside — we keep the secret', 1299, '🎀',
       'https://images.pexels.com/photos/6461824/pexels-photo-6461824.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a gender reveal cake being sliced with hands visible, surrounded by drinks.',
       'Photo by Tima Miroshnichenko on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Gender Reveal Surprise Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Gender Reveal — Boy or Girl Cupcakes (Box of 12)
--   query: pink and blue gender reveal cupcakes cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Boy or Girl Cupcakes (Box of 12)', 'Cakes', 'Gender Reveal',
       'Half pink, half blue — one has the answer', 899, '🧁',
       'https://images.pexels.com/photos/7508062/pexels-photo-7508062.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant dessert table decorated with blue and pink balloons, flowers, and sweets for a baby shower.',
       'Photo by Mateus Gomes on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Boy or Girl Cupcakes (Box of 12)' AND category = 'Cakes'
);

-- Cakes / Gender Reveal — Gender Reveal Pinata Cake (1kg)
--   query: pinata smash cake chocolate shell colourful dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Gender Reveal Pinata Cake (1kg)', 'Cakes', 'Gender Reveal',
       'Smash the chocolate shell, colour spills out', 1499, '🔨',
       'https://images.pexels.com/photos/6036368/pexels-photo-6036368.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Top view of broken chocolate pieces and kitchen tools on a white surface.',
       'Photo by Anna Tarazevich on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Gender Reveal Pinata Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Baby Shower — Godh Bharai Traditional Cake (1kg)
--   query: indian baby shower godh bharai celebration marigold cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Godh Bharai Traditional Cake (1kg)', 'Cakes', 'Baby Shower',
       'Marigold and mango-leaf fondant, traditional styling', 1199, '🪔',
       'https://images.pexels.com/photos/11883323/pexels-photo-11883323.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant dessert table featuring a cake with strawberries and assorted sweets, perfect for celebrations.',
       'Photo by Boys in Bristol Photography on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Godh Bharai Traditional Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Baby Shower — Baby Elephant Fondant Cake (1.5kg)
--   query: baby elephant fondant cake pastel shower dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Baby Elephant Fondant Cake (1.5kg)', 'Cakes', 'Baby Shower',
       '3D baby elephant topper, pastel base', 1699, '🐘',
       'https://images.pexels.com/photos/2337821/pexels-photo-2337821.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Beautifully decorated mini cakes with floral designs, perfect for elegant occasions.',
       'Photo by Vidal Balielo Jr. on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Baby Elephant Fondant Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Baby Shower — Baby Shower Cupcake Tower (24 pcs)
--   query: baby shower cupcake tower pastel display cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Baby Shower Cupcake Tower (24 pcs)', 'Cakes', 'Baby Shower',
       'Tiered stand, pastel frosting, baby toppers', 1799, '🗼',
       'https://images.pexels.com/photos/30484894/pexels-photo-30484894.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Adorable teddy bear themed baby party setup with cake, cupcakes, and plush toys.',
       'Photo by Th2city Santana on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Baby Shower Cupcake Tower (24 pcs)' AND category = 'Cakes'
);

-- Cakes / Naming Ceremony — Namakaran Name Reveal Cake (1kg)
--   query: baby naming ceremony cake name script pastel dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Namakaran Name Reveal Cake (1kg)', 'Cakes', 'Naming Ceremony',
       'Baby''s name revealed in fondant script', 1249, '📜',
       'https://images.pexels.com/photos/3593428/pexels-photo-3593428.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delightful baby shower table with cake, balloons, and dessert display in an outdoor garden setting.',
       'Photo by Paola Vasquez on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Namakaran Name Reveal Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Naming Ceremony — Cradle Ceremony Cake (1.5kg)
--   query: baby cradle themed cake christening pastel dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Cradle Ceremony Cake (1.5kg)', 'Cakes', 'Naming Ceremony',
       'Fondant cradle topper, traditional colours', 1699, '🛏️',
       'https://images.pexels.com/photos/32488939/pexels-photo-32488939.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delicate pink christening cake featuring an angel topper and floral decorations, perfect for celebrations.',
       'Photo by Bloomture Studio on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Cradle Ceremony Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Naming Ceremony — Baby Name Photo Cake (1kg)
--   query: edible photo print baby celebration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Baby Name Photo Cake (1kg)', 'Cakes', 'Naming Ceremony',
       'Edible print with name, date and birth weight', 1299, '📸',
       'https://images.pexels.com/photos/30484902/pexels-photo-30484902.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Tray of adorable bear and question mark cupcakes for a baby shower.',
       'Photo by Th2city Santana on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Baby Name Photo Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Annaprashan — Annaprashan Rice Ceremony Cake (1kg)
--   query: indian baby rice ceremony celebration cake traditional dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Annaprashan Rice Ceremony Cake (1kg)', 'Cakes', 'Annaprashan',
       'Marks the first solid meal — traditional motifs', 1199, '🍚',
       'https://images.pexels.com/photos/8887050/pexels-photo-8887050.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant Diwali table arrangement showcasing traditional sweets and decor items.',
       'Photo by Lara Jameson on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Annaprashan Rice Ceremony Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Annaprashan — First Bite Celebration Cake (0.5kg)
--   query: small eggless celebration cake baby spoon dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'First Bite Celebration Cake (0.5kg)', 'Cakes', 'Annaprashan',
       'Small eggless cake for the ceremony table', 749, '🥄',
       'https://images.pexels.com/photos/14781509/pexels-photo-14781509.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully decorated naked cake with floral accents, perfect for special occasions or celebrations.',
       'Photo by Sergio Arreola on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'First Bite Celebration Cake (0.5kg)' AND category = 'Cakes'
);

-- Cakes / Mundan — Mundan Ceremony Cake (1kg)
--   query: baby first haircut celebration cake pastel dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mundan Ceremony Cake (1kg)', 'Cakes', 'Mundan',
       'First-haircut celebration, soft pastel design', 1149, '✂️',
       'https://images.pexels.com/photos/7096659/pexels-photo-7096659.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a first birthday cake on a stand with pink decorations in the background.',
       'Photo by Nixx on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mundan Ceremony Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Mundan — First Haircut Photo Cake (0.5kg)
--   query: toddler celebration cake photo print dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'First Haircut Photo Cake (0.5kg)', 'Cakes', 'Mundan',
       'Before-and-after photo print', 849, '💇',
       'https://images.pexels.com/photos/16191763/pexels-photo-16191763.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Cute child with short hair delightfully tastes a blueberry cake outside at a party.',
       'Photo by Kh-ali-l i on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'First Haircut Photo Cake (0.5kg)' AND category = 'Cakes'
);

-- Cakes / First Day at School — First Day at School Cake (1kg)
--   query: back to school themed cake pencil backpack dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'First Day at School Cake (1kg)', 'Cakes', 'First Day at School',
       'Backpack and pencil fondant toppers', 999, '🎒',
       'https://images.pexels.com/photos/28503353/pexels-photo-28503353.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant pens, notebooks, lunch box, and backpack on a lively desk.',
       'Photo by The Design Lady on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'First Day at School Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / First Day at School — ABC Blackboard Cake (1kg)
--   query: alphabet blocks blackboard themed cake school dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'ABC Blackboard Cake (1kg)', 'Cakes', 'First Day at School',
       'Chalkboard finish, alphabet blocks', 1099, '🔤',
       'https://images.pexels.com/photos/12932566/pexels-photo-12932566.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Blackboard with ''Back to School'' written in chalk, ideal for educational themes.',
       'Photo by Atlantic Ambience on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'ABC Blackboard Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Roka — Roka Ceremony Cake (1kg)
--   query: indian engagement ceremony cake ivory marigold dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Roka Ceremony Cake (1kg)', 'Cakes', 'Roka',
       'Two families, one cake — marigold and ivory', 1299, '🤝',
       'https://images.pexels.com/photos/8819771/pexels-photo-8819771.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful Indian sweets on a platter held by a woman in traditional attire, perfect for holiday celebrations.',
       'Photo by Yan Krukau on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Roka Ceremony Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Roka — Ring Ceremony Two-Tier Cake (2kg)
--   query: two tier engagement ring ceremony cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Ring Ceremony Two-Tier Cake (2kg)', 'Cakes', 'Roka',
       'Two tiers with a fondant ring platter', 2599, '💍',
       'https://images.pexels.com/photos/18836820/pexels-photo-18836820.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully decorated two-tier wedding cake featuring elegant floral motifs and intricate details.',
       'Photo by Rajan Pun on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Ring Ceremony Two-Tier Cake (2kg)' AND category = 'Cakes'
);

-- Cakes / Engagement — Engagement Ring Fondant Cake (1.5kg)
--   query: engagement ring fondant cake elegant white dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Engagement Ring Fondant Cake (1.5kg)', 'Cakes', 'Engagement',
       'Oversized fondant ring on a cushion', 1899, '💍',
       'https://images.pexels.com/photos/6258052/pexels-photo-6258052.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a beautifully decorated wedding cake adorned with gold-trimmed white fondant flowers.',
       'Photo by Tiago Galvao on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Engagement Ring Fondant Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Engagement — Save the Date Photo Cake (1kg)
--   query: couple photo engagement cake save the date dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Save the Date Photo Cake (1kg)', 'Cakes', 'Engagement',
       'Couple photo and wedding date printed on top', 1349, '🗓️',
       'https://images.pexels.com/photos/5911185/pexels-photo-5911185.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Crop faceless couple in elegant outfits sitting in restaurant while celebrating birthday with small cupcake with candle at table',
       'Photo by Katerina Holmes on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Save the Date Photo Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Engagement — Engagement Rose Gold Cake (2kg)
--   query: rose gold drip engagement cake roses dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Engagement Rose Gold Cake (2kg)', 'Cakes', 'Engagement',
       'Rose-gold drip, sugar roses, two tiers', 2499, '🌹',
       'https://images.pexels.com/photos/30446145/pexels-photo-30446145.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Luxurious display of assorted cupcakes and pastries on crystal stands, perfect for an upscale event.',
       'Photo by amine photographe on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Engagement Rose Gold Cake (2kg)' AND category = 'Cakes'
);

-- Cakes / Engagement — Engagement Cupcake Box (12 pcs)
--   query: engagement cupcakes ivory heart toppers cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Engagement Cupcake Box (12 pcs)', 'Cakes', 'Engagement',
       'Ring and heart toppers, ivory frosting', 999, '🧁',
       'https://images.pexels.com/photos/7180613/pexels-photo-7180613.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A charming still life of heart-shaped cupcakes on a dining table setting, perfect for Valentine''s decor.',
       'Photo by Pavel Danilyuk on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Engagement Cupcake Box (12 pcs)' AND category = 'Cakes'
);

-- Cakes / Bride to Be — Bride to Be Cake (1kg)
--   query: bride to be cake blush pink bridal shower dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Bride to Be Cake (1kg)', 'Cakes', 'Bride to Be',
       '"Bride to Be" sash in fondant, blush palette', 1399, '👰',
       'https://images.pexels.com/photos/1829423/pexels-photo-1829423.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Beautiful bridal cake with chocolate toppings and caramel drizzle, perfect for celebrations.',
       'Photo by Javon Swaby on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Bride to Be Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Bride to Be — Bridal Shower Dress Cake (1.5kg)
--   query: wedding dress shaped bridal shower cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Bridal Shower Dress Cake (1.5kg)', 'Cakes', 'Bride to Be',
       'Sculpted lehenga or gown, hand-piped detail', 1899, '👗',
       'https://images.pexels.com/photos/34223087/pexels-photo-34223087.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A large, beautifully decorated cupcake with whipped cream frosting, perfect for celebrations.',
       'Photo by Wallace Silva on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Bridal Shower Dress Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Bride to Be — Mehendi Hands Bride Cake (1kg)
--   query: mehendi henna pattern cake indian bridal dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mehendi Hands Bride Cake (1kg)', 'Cakes', 'Bride to Be',
       'Henna patterns piped in royal icing', 1449, '🤲',
       'https://images.pexels.com/photos/21568652/pexels-photo-21568652.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of traditional henna patterns adorning a bride''s foot for an Indian wedding ceremony.',
       'Photo by Vijay Deep Singh on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mehendi Hands Bride Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Bride to Be — Bride Squad Cupcakes (Box of 12)
--   query: bridal shower cupcakes pink squad celebration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Bride Squad Cupcakes (Box of 12)', 'Cakes', 'Bride to Be',
       'One for the bride, eleven for the squad', 1049, '💐',
       'https://images.pexels.com/photos/8665755/pexels-photo-8665755.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up view of pink frosted cupcakes with sprinkles, perfect for dessert indulgence.',
       'Photo by Tom Fisk on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Bride Squad Cupcakes (Box of 12)' AND category = 'Cakes'
);

-- Cakes / Groom to Be — Groom to Be Cake (1kg)
--   query: groom to be cake tuxedo bachelor celebration dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Groom to Be Cake (1kg)', 'Cakes', 'Groom to Be',
       'Sherwani or tuxedo fondant detail', 1399, '🤵',
       'https://images.pexels.com/photos/14396233/pexels-photo-14396233.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully designed wedding cake paired with a bouquet of white roses, perfect for wedding celebrations.',
       'Photo by Asad Photo Maldives on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Groom to Be Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Groom to Be — Bachelor Party Cake (1.5kg)
--   query: bachelor party cake celebration bold dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Bachelor Party Cake (1.5kg)', 'Cakes', 'Groom to Be',
       'Last-night-of-freedom theme, bold colours', 1799, '🎉',
       'https://images.pexels.com/photos/6343189/pexels-photo-6343189.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Rustic cake with chocolate muffins on a wooden board, adorned with green leaves and glass jars, ready for a celebration.',
       'Photo by Arina Krasnikova on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Bachelor Party Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Groom to Be — Groom's Whisky Barrel Cake (1.5kg)
--   query: whisky barrel sculpted novelty cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Groom''s Whisky Barrel Cake (1.5kg)', 'Cakes', 'Groom to Be',
       'Sculpted barrel, edible woodgrain', 1999, '🥃',
       'https://images.pexels.com/photos/30354872/pexels-photo-30354872.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A handbag-shaped cake with intricate design, perfect blend of art and dessert.',
       'Photo by Dian is Light on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Groom''s Whisky Barrel Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Groom to Be — Last Ride Bachelor Cupcakes (Box of 12)
--   query: bachelor party cupcakes dark chocolate celebration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Last Ride Bachelor Cupcakes (Box of 12)', 'Cakes', 'Groom to Be',
       'Twelve cupcakes, one for every groomsman', 1049, '🏍️',
       'https://images.pexels.com/photos/5991651/pexels-photo-5991651.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Six mouthwatering chocolate cupcakes with chocolate frosting in a round plastic container.',
       'Photo by Rony Stephen Chowdhury on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Last Ride Bachelor Cupcakes (Box of 12)' AND category = 'Cakes'
);

-- Cakes / Haldi & Mehendi — Haldi Ceremony Marigold Cake (1kg)
--   query: haldi ceremony turmeric marigold decoration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Haldi Ceremony Marigold Cake (1kg)', 'Cakes', 'Haldi & Mehendi',
       'Turmeric-yellow buttercream, marigold sugar flowers', 1349, '🌼',
       'https://images.pexels.com/photos/33078524/pexels-photo-33078524.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A joyful Indian couple participating in a vibrant Haldi ceremony before their wedding.',
       'Photo by Amodita''s Frame on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Haldi Ceremony Marigold Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Haldi & Mehendi — Haldi Yellow Fondant Cake (1kg)
--   query: yellow fondant celebration cake gold indian dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Haldi Yellow Fondant Cake (1kg)', 'Cakes', 'Haldi & Mehendi',
       'Smooth yellow fondant, gold leaf accents', 1299, '💛',
       'https://images.pexels.com/photos/6808574/pexels-photo-6808574.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a yellow cake with white lily decorations, perfect for celebrations.',
       'Photo by Magda Ehlers on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Haldi Yellow Fondant Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Haldi & Mehendi — Mehendi Night Cake (1.5kg)
--   query: mehendi henna hands indian wedding celebration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mehendi Night Cake (1.5kg)', 'Cakes', 'Haldi & Mehendi',
       'Green and gold, henna motifs piped by hand', 1799, '🌿',
       'https://images.pexels.com/photos/1426310/pexels-photo-1426310.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a woman''s hands holding a bowl of turmeric, showcasing Indian tradition.',
       'Photo by Jayakumar Karunakaran on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mehendi Night Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Haldi & Mehendi — Mehendi Henna Design Cake (2kg)
--   query: two tier henna patterned wedding cake white gold dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mehendi Henna Design Cake (2kg)', 'Cakes', 'Haldi & Mehendi',
       'Two tiers, full henna pattern in royal icing', 2399, '🖌️',
       'https://images.pexels.com/photos/19063535/pexels-photo-19063535.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Sophisticated white wedding cake with delicate floral accents, perfect for elegant celebrations.',
       'Photo by Jonathan Borba on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mehendi Henna Design Cake (2kg)' AND category = 'Cakes'
);

-- Cakes / Sangeet — Sangeet Night Dhol Cake (1.5kg)
--   query: indian sangeet night celebration dhol music cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sangeet Night Dhol Cake (1.5kg)', 'Cakes', 'Sangeet',
       'Sculpted dhol, mirrorwork fondant', 1899, '🥁',
       'https://images.pexels.com/photos/11094777/pexels-photo-11094777.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A lively scene of men playing traditional drums at a cultural festival, wearing colorful attire.',
       'Photo by Swastik Arora on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sangeet Night Dhol Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Sangeet — Sangeet Celebration Cake (2kg)
--   query: indian wedding sangeet celebration cake jewel tones dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sangeet Celebration Cake (2kg)', 'Cakes', 'Sangeet',
       'Two tiers in jewel tones, dancing-couple topper', 2299, '💃',
       'https://images.pexels.com/photos/12927172/pexels-photo-12927172.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant display of assorted cakes adorned with fresh flowers and berries in a bakery.',
       'Photo by Engin Akyurt on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sangeet Celebration Cake (2kg)' AND category = 'Cakes'
);

-- Cakes / Wedding — Four-Tier Grand Wedding Cake (5kg)
--   query: four tier grand wedding cake white flowers dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Four-Tier Grand Wedding Cake (5kg)', 'Cakes', 'Wedding',
       'Four tiers, sugar florals, serves 70+', 7999, '🏰',
       'https://images.pexels.com/photos/28613109/pexels-photo-28613109.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A four-tier white wedding cake surrounded by vibrant floral arrangements on a rustic outdoor table setting.',
       'Photo by Jonathan Borba on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Four-Tier Grand Wedding Cake (5kg)' AND category = 'Cakes'
);

-- Cakes / Wedding — South Indian Temple Wedding Cake (3kg)
--   query: south indian traditional wedding celebration cake gold dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'South Indian Temple Wedding Cake (3kg)', 'Cakes', 'Wedding',
       'Kanjeevaram-silk fondant drape, temple-gold border', 4499, '🛕',
       'https://images.pexels.com/photos/33892074/pexels-photo-33892074.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Beautifully wrapped Brazilian wedding favors with golden ribbons on a decorated table.',
       'Photo by Evandro Paula Alves on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'South Indian Temple Wedding Cake (3kg)' AND category = 'Cakes'
);

-- Cakes / Wedding — Wedding Cupcake Tower (36 pcs)
--   query: wedding cupcake tower ivory gold display cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Wedding Cupcake Tower (36 pcs)', 'Cakes', 'Wedding',
       'Three-tier stand, ivory and gold frosting', 2999, '🗼',
       'https://images.pexels.com/photos/12774946/pexels-photo-12774946.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A rustic outdoor cake and cupcake display set on wooden stands, perfect for weddings.',
       'Photo by Rene Terp on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Wedding Cupcake Tower (36 pcs)' AND category = 'Cakes'
);

-- Cakes / Anniversary — First Anniversary Cake (1kg)
--   query: first anniversary cake couple celebration dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'First Anniversary Cake (1kg)', 'Cakes', 'Anniversary',
       'Paper-anniversary theme, "1 Year" topper', 1099, '1️⃣',
       'https://images.pexels.com/photos/5911187/pexels-photo-5911187.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Young couple in elegant outfits sitting in light restaurant while celebrating birthday and blows in candle on small cupcake at table with wineglasses near brick wall',
       'Photo by Katerina Holmes on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'First Anniversary Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Anniversary — 10th Anniversary Cake (1.5kg)
--   query: tenth anniversary cake gold white elegant dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT '10th Anniversary Cake (1.5kg)', 'Cakes', 'Anniversary',
       'Decade milestone, gold and white', 1699, '🔟',
       'https://images.pexels.com/photos/19499004/pexels-photo-19499004.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a beautifully decorated dessert with pastel floral elements, perfect for festive occasions.',
       'Photo by Valeria Boltneva on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = '10th Anniversary Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Anniversary — Ruby 40th Anniversary Cake (1.5kg)
--   query: ruby red anniversary cake roses elegant dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Ruby 40th Anniversary Cake (1.5kg)', 'Cakes', 'Anniversary',
       'Deep ruby-red finish, sugar roses', 1899, '❤️‍🔥',
       'https://images.pexels.com/photos/31328161/pexels-photo-31328161.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Heart-decorated cake with red bows, candles, and rose petals for a romantic setting.',
       'Photo by Beyza Yalçın on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Ruby 40th Anniversary Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Anniversary — Golden Jubilee 50th Anniversary Cake (2kg)
--   query: golden fiftieth anniversary cake gold leaf dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Golden Jubilee 50th Anniversary Cake (2kg)', 'Cakes', 'Anniversary',
       'Two tiers, gold leaf, fifty years together', 2699, '🏆',
       'https://images.pexels.com/photos/7867778/pexels-photo-7867778.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A couple celebrating their 50th anniversary with a decorative cake, symbolizing a lasting bond.',
       'Photo by RDNE Stock project on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Golden Jubilee 50th Anniversary Cake (2kg)' AND category = 'Cakes'
);

-- Cakes / Anniversary — Anniversary Bento Cake (0.3kg)
--   query: bento mini cake for two romantic dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Anniversary Bento Cake (0.3kg)', 'Cakes', 'Anniversary',
       'Just for the two of you, message hand-piped', 599, '🍱',
       'https://images.pexels.com/photos/20171164/pexels-photo-20171164.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of red velvet mini cakes topped with whipped cream and strawberries on a tray.',
       'Photo by Elina Volkova on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Anniversary Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Valentine — Bento Valentine Cake (0.3kg)
--   query: valentine bento mini cake heart red dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Bento Valentine Cake (0.3kg)', 'Cakes', 'Valentine',
       'Mini cake, your line piped across it', 599, '💌',
       'https://images.pexels.com/photos/4161529/pexels-photo-4161529.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delicious heart-shaped red cakes with white icing, perfect for Valentine''s Day celebrations.',
       'Photo by Lucian Pirvu on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Bento Valentine Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Valentine — Rose Gold Heart Cake (1kg)
--   query: rose gold heart shaped cake drip romantic dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Rose Gold Heart Cake (1kg)', 'Cakes', 'Valentine',
       'Heart tin, rose-gold drip, edible petals', 1249, '💗',
       'https://images.pexels.com/photos/34008841/pexels-photo-34008841.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Heart-shaped desserts with red bows, perfect for weddings or Valentine''s Day.',
       'Photo by Helder Teixeira on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Rose Gold Heart Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Proposal — Will You Marry Me Cake (1kg)
--   query: marriage proposal cake romantic candles roses dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Will You Marry Me Cake (1kg)', 'Cakes', 'Proposal',
       'The question, piped — ring box space in the centre', 1399, '💐',
       'https://images.pexels.com/photos/28657134/pexels-photo-28657134.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Elegant wedding proposal setup with a romantic cake and poolside view in Sapanca, Türkiye.',
       'Photo by Furkan Özavcı on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Will You Marry Me Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Proposal — Proposal Ring Box Cake (0.5kg)
--   query: ring box shaped cake proposal romantic dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Proposal Ring Box Cake (0.5kg)', 'Cakes', 'Proposal',
       'Sculpted ring box that opens', 999, '💍',
       'https://images.pexels.com/photos/6765749/pexels-photo-6765749.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Crop unrecognizable female demonstrating Love engraved silver ring placed into yummy chocolate muffin on Saint Valentine Day',
       'Photo by Michelle Leman on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Proposal Ring Box Cake (0.5kg)' AND category = 'Cakes'
);

-- Cakes / Proposal — Say Yes Bento Cake (0.3kg)
--   query: red bento mini cake romantic heart dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Say Yes Bento Cake (0.3kg)', 'Cakes', 'Proposal',
       'Small, red, and impossible to misread', 649, '❣️',
       'https://images.pexels.com/photos/8170089/pexels-photo-8170089.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Indulge in this delightful chocolate cake topped with heart-shaped chocolates, strawberries, and a golden bow.',
       'Photo by Jonathan Nenemann on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Say Yes Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Friendship Day — Friendship Day Cake (1kg)
--   query: friendship day celebration cake friends colourful dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Friendship Day Cake (1kg)', 'Cakes', 'Friendship Day',
       'Friendship bands in fondant, group-photo option', 949, '🫂',
       'https://images.pexels.com/photos/7254232/pexels-photo-7254232.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a birthday cake with lit candles and two friends celebrating indoors.',
       'Photo by cottonbro studio on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Friendship Day Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Friendship Day — Best Friends Bento Cake (0.3kg)
--   query: bento mini cake friends colourful message dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Best Friends Bento Cake (0.3kg)', 'Cakes', 'Friendship Day',
       'One mini cake, one inside joke', 549, '👯',
       'https://images.pexels.com/photos/38733146/pexels-photo-38733146.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Eye-catching purple cake balls with sprinkles displayed on a wooden tray, ideal for parties.',
       'Photo by Jaime Joel Vargas Huacre on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Best Friends Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Mother's Day — Mother's Day Floral Cake (1kg)
--   query: mothers day floral buttercream cake pastel dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mother''s Day Floral Cake (1kg)', 'Cakes', 'Mother''s Day',
       'Buttercream florals in her favourite colours', 1099, '🌷',
       'https://images.pexels.com/photos/16369857/pexels-photo-16369857.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up view of a beautifully decorated pastel birthday cake with floral details, perfect for celebrations.',
       'Photo by Agung Pandit Wiguna on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mother''s Day Floral Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Mother's Day — Best Mom Photo Cake (1kg)
--   query: mothers day cake photo celebration family dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Best Mom Photo Cake (1kg)', 'Cakes', 'Mother''s Day',
       'Your favourite photo of her, printed', 1199, '👩',
       'https://images.pexels.com/photos/7358423/pexels-photo-7358423.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delicious frosted cupcakes arranged with "MOM" icing, perfect for Mother''s Day celebrations.',
       'Photo by KATRIN  BOLOVTSOVA on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Best Mom Photo Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Mother's Day — Mother's Day Bento Cake (0.3kg)
--   query: bento mini cake flowers pastel mothers day dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mother''s Day Bento Cake (0.3kg)', 'Cakes', 'Mother''s Day',
       'Mini cake with a message only she gets', 599, '💐',
       'https://images.pexels.com/photos/6955477/pexels-photo-6955477.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Pink background with a slice of berry cheesecake and a bouquet of tulips for Mother''s Day.',
       'Photo by alleksana on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mother''s Day Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Father's Day — Father's Day Cake (1kg)
--   query: fathers day cake shirt tie celebration dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Father''s Day Cake (1kg)', 'Cakes', 'Father''s Day',
       'Shirt-and-tie fondant, or his hobby in sugar', 1099, '👨',
       'https://images.pexels.com/photos/2004162/pexels-photo-2004162.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A heart-shaped gingerbread cookie with ''Papa'' icing on a black background, perfect for Father''s Day.',
       'Photo by Markus Spiske on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Father''s Day Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Father's Day — Best Dad Photo Cake (1kg)
--   query: fathers day photo cake family celebration dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Best Dad Photo Cake (1kg)', 'Cakes', 'Father''s Day',
       'Edible print, "Best Dad" message', 1199, '📷',
       'https://images.pexels.com/photos/32397295/pexels-photo-32397295.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A festive blue cake for Father''s Day with chocolate-covered strawberries.',
       'Photo by Dana Garcia on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Best Dad Photo Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Father's Day — Dad's Filter Coffee Cake (1kg)
--   query: dark chocolate coffee cake ganache dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Dad''s Filter Coffee Cake (1kg)', 'Cakes', 'Father''s Day',
       'Strong coffee sponge, dark chocolate ganache', 1049, '☕',
       'https://images.pexels.com/photos/12118046/pexels-photo-12118046.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a chocolate cake topped with a luscious ganache and chocolate chips on a white plate.',
       'Photo by Bruno Curly on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Dad''s Filter Coffee Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Rakhi — Rakhi Special Chocolate Cake (1kg)
--   query: rakhi raksha bandhan thali indian festival cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Rakhi Special Chocolate Cake (1kg)', 'Cakes', 'Rakhi',
       'Rakhi thali fondant detail, chocolate sponge', 999, '🧿',
       'https://images.pexels.com/photos/18231728/pexels-photo-18231728.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of hands tying a Rakhi bracelet, symbolizing sibling bond in traditional Indian culture.',
       'Photo by Ravi Roshan on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Rakhi Special Chocolate Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Rakhi — Bhai Behen Photo Cake (1kg)
--   query: siblings celebration photo cake indian festival dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Bhai Behen Photo Cake (1kg)', 'Cakes', 'Rakhi',
       'Sibling photo printed in edible ink', 1199, '👫',
       'https://images.pexels.com/photos/34450950/pexels-photo-34450950.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A chocolate layered cake with cherry on top, served elegantly for a birthday celebration.',
       'Photo by Michael Takahashi on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Bhai Behen Photo Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Rakhi — Rakhi Bento Cake (0.3kg)
--   query: bento mini cake gift indian festival dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Rakhi Bento Cake (0.3kg)', 'Cakes', 'Rakhi',
       'Small enough to courier with the rakhi', 599, '🎁',
       'https://images.pexels.com/photos/19986441/pexels-photo-19986441.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Top view of heart-shaped cakes and romantic notes on a white wooden background, perfect for Valentine''s Day.',
       'Photo by hello aesthe on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Rakhi Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Teachers Day — Teachers Day Thank You Cake (1kg)
--   query: teachers day thank you cake blackboard apple dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Teachers Day Thank You Cake (1kg)', 'Cakes', 'Teachers Day',
       'Blackboard finish, class photo option', 949, '🍎',
       'https://images.pexels.com/photos/12526538/pexels-photo-12526538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'An elegant dessert tray featuring sliced cake rolls and colorful pastries, perfect for celebrations.',
       'Photo by Xuân Thống Trần on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Teachers Day Thank You Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Teachers Day — Best Teacher Bento Cake (0.3kg)
--   query: bento mini cake books thank you message dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Best Teacher Bento Cake (0.3kg)', 'Cakes', 'Teachers Day',
       'From one student or the whole class', 549, '📚',
       'https://images.pexels.com/photos/7471079/pexels-photo-7471079.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A berry pie with colorful ''Thank You'' letters and strawberries on a pink surface.',
       'Photo by alleksana on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Best Teacher Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Congratulations — Exam Success Cake (1kg)
--   query: exam success celebration cake congratulations dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Exam Success Cake (1kg)', 'Cakes', 'Congratulations',
       'Results day, marked properly', 999, '📝',
       'https://images.pexels.com/photos/32001529/pexels-photo-32001529.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Two graduates celebrate in front of a bulletin board with a sunflower bouquet and diploma.',
       'Photo by Green odette on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Exam Success Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Congratulations — Convocation Photo Cake (1kg)
--   query: graduation convocation cake cap photo dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Convocation Photo Cake (1kg)', 'Cakes', 'Congratulations',
       'Graduation photo printed, cap topper', 1249, '🎓',
       'https://images.pexels.com/photos/15490423/pexels-photo-15490423.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Black and white photo of graduates in caps and gowns at a ceremony.',
       'Photo by Safari  Consoler on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Convocation Photo Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Congratulations — First Salary Treat Cake (1kg)
--   query: office celebration cake congratulations team dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'First Salary Treat Cake (1kg)', 'Cakes', 'Congratulations',
       'The one they buy for everyone else', 1049, '💸',
       'https://images.pexels.com/photos/8015240/pexels-photo-8015240.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'White cake with red berries, pink envelope, and cups on a festive table.',
       'Photo by Cup of  Couple on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'First Salary Treat Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Corporate — Corporate Logo Cake (2kg)
--   query: corporate logo cake office event professional dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Corporate Logo Cake (2kg)', 'Cakes', 'Corporate',
       'Your logo in edible print or fondant, serves 20', 2799, '🏢',
       'https://images.pexels.com/photos/16140003/pexels-photo-16140003.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of pastry chefs in aprons meticulously decorating gourmet cakes with precision and artistry.',
       'Photo by Doğu Tuncer on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Corporate Logo Cake (2kg)' AND category = 'Cakes'
);

-- Cakes / Corporate — Work Anniversary Cake (1kg)
--   query: work anniversary office celebration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Work Anniversary Cake (1kg)', 'Cakes', 'Corporate',
       'Years-of-service number topper', 1099, '📅',
       'https://images.pexels.com/photos/15229675/pexels-photo-15229675.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautiful anniversary cake with strawberries and cream on a decorative plate.',
       'Photo by Nabill Radita on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Work Anniversary Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Corporate — Team Celebration Cupcakes (Box of 24)
--   query: office team cupcakes box celebration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Team Celebration Cupcakes (Box of 24)', 'Cakes', 'Corporate',
       'Two dozen, branded toppers optional', 1799, '🧁',
       'https://images.pexels.com/photos/7966082/pexels-photo-7966082.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a woman holding a box filled with assorted fresh fruit cupcakes, perfect for dessert.',
       'Photo by Felicity Tai on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Team Celebration Cupcakes (Box of 24)' AND category = 'Cakes'
);

-- Cakes / Corporate — Product Launch Cake (2kg)
--   query: corporate launch event cake celebration modern dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Product Launch Cake (2kg)', 'Cakes', 'Corporate',
       'Launch-day centrepiece, custom edible print', 2599, '🚀',
       'https://images.pexels.com/photos/26617640/pexels-photo-26617640.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Assorted cakes displayed on tables outdoors in Milan, perfect for a sweet gathering.',
       'Photo by Mehmet Akif Acar on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Product Launch Cake (2kg)' AND category = 'Cakes'
);

-- Cakes / Retirement — Retirement Celebration Cake (1.5kg)
--   query: retirement celebration cake congratulations dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Retirement Celebration Cake (1.5kg)', 'Cakes', 'Retirement',
       'Their next chapter, in fondant', 1699, '🎣',
       'https://images.pexels.com/photos/30877722/pexels-photo-30877722.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Closeup of a sparkling 30th birthday cake decorated with colorful confetti and icing.',
       'Photo by Vintage Lenses on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Retirement Celebration Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Retirement — Happy Retirement Photo Cake (1kg)
--   query: retirement party photo cake celebration senior dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Happy Retirement Photo Cake (1kg)', 'Cakes', 'Retirement',
       'Career photo montage, printed', 1249, '📸',
       'https://images.pexels.com/photos/7561057/pexels-photo-7561057.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Smiling woman holding a 60th birthday cake with strawberries indoors.',
       'Photo by Vlada Karpovich on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Happy Retirement Photo Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Retirement — Golden Years Retirement Cake (2kg)
--   query: two tier gold celebration cake elegant senior dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Golden Years Retirement Cake (2kg)', 'Cakes', 'Retirement',
       'Two tiers, gold accents, serves 20', 2299, '🥇',
       'https://images.pexels.com/photos/1869342/pexels-photo-1869342.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A rustic iced cake decorated with pinecones, creating a cozy, warm aesthetic.',
       'Photo by Luis Quintero on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Golden Years Retirement Cake (2kg)' AND category = 'Cakes'
);

-- Cakes / Housewarming — Griha Pravesh Housewarming Cake (1kg)
--   query: housewarming celebration cake home indian dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Griha Pravesh Housewarming Cake (1kg)', 'Cakes', 'Housewarming',
       'Toran and rangoli motifs in fondant', 1149, '🏠',
       'https://images.pexels.com/photos/35241181/pexels-photo-35241181.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Hands decorating a lemon and blueberry cake with fresh fruits on a summer day.',
       'Photo by Giulia Botan on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Griha Pravesh Housewarming Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Housewarming — New Home Fondant Cake (1.5kg)
--   query: house shaped fondant cake new home keys dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'New Home Fondant Cake (1.5kg)', 'Cakes', 'Housewarming',
       'Sculpted house with keys, name plate on top', 1699, '🔑',
       'https://images.pexels.com/photos/20426686/pexels-photo-20426686.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Charming farm-themed birthday cake with barn and pig for a first birthday celebration.',
       'Photo by Jonathan Borba on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'New Home Fondant Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Housewarming — Housewarming Cupcake Box (12 pcs)
--   query: housewarming cupcakes box celebration guests cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Housewarming Cupcake Box (12 pcs)', 'Cakes', 'Housewarming',
       'Easy to hand round a full house', 949, '🧁',
       'https://images.pexels.com/photos/3983706/pexels-photo-3983706.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'From above of crop anonymous female pastry cook garnishing cream tops of delicious cupcakes with cocktail cherries and macaroons serving in box',
       'Photo by Gustavo Fring on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Housewarming Cupcake Box (12 pcs)' AND category = 'Cakes'
);

-- Cakes / New Beginnings — New Car Celebration Cake (1kg)
--   query: new car celebration cake keys fondant dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'New Car Celebration Cake (1kg)', 'Cakes', 'New Beginnings',
       'Car and key fondant, registration number piped', 1099, '🚗',
       'https://images.pexels.com/photos/32370608/pexels-photo-32370608.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant car-themed fondant cake toppers on a red surface, ideal for children''s parties.',
       'Photo by Jonathan Borba on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'New Car Celebration Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / New Beginnings — New Business Launch Cake (1.5kg)
--   query: business launch celebration cake ribbon success dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'New Business Launch Cake (1.5kg)', 'Cakes', 'New Beginnings',
       'Ribbon-cutting centrepiece, logo optional', 1799, '📈',
       'https://images.pexels.com/photos/8015274/pexels-photo-8015274.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautiful white cake with berries and champagne glasses on wooden table, perfect for celebrations.',
       'Photo by Cup of  Couple on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'New Business Launch Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / New Beginnings — Visa Approved Celebration Cake (1kg)
--   query: travel passport themed celebration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Visa Approved Celebration Cake (1kg)', 'Cakes', 'New Beginnings',
       'Passport and boarding-pass fondant', 1099, '🛂',
       'https://images.pexels.com/photos/6659539/pexels-photo-6659539.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully decorated dessert table featuring a floral wedding cake and various sweets, perfect for celebrations.',
       'Photo by dupriez annick on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Visa Approved Celebration Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Farewell — Office Farewell Cake (1.5kg)
--   query: office farewell goodbye cake colleagues dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Office Farewell Cake (1.5kg)', 'Cakes', 'Farewell',
       'Signed-card design, room for every name', 1499, '📦',
       'https://images.pexels.com/photos/10455239/pexels-photo-10455239.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Three creatively decorated birthday cakes with colorful themes on a wooden table.',
       'Photo by Thi Ngoc Ha  Nguyen on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Office Farewell Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Diwali — Diwali Diya Fondant Cake (1kg)
--   query: diwali diya lamps indian festival celebration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Diwali Diya Fondant Cake (1kg)', 'Cakes', 'Diwali',
       'Edible diyas and rangoli on a gold base', 1249, '🪔',
       'https://images.pexels.com/photos/30604307/pexels-photo-30604307.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of burning diyas arranged in a ceremonial pattern, symbolizing the festival of light.',
       'Photo by Rajesh S  Balouria on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Diwali Diya Fondant Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Diwali — Diwali Dry Fruit Cake (1kg)
--   query: dry fruit nut cake indian festival sweets dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Diwali Dry Fruit Cake (1kg)', 'Cakes', 'Diwali',
       'Kaju, badam and pista sponge — travels well', 1149, '🥜',
       'https://images.pexels.com/photos/10661284/pexels-photo-10661284.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A delicious fruit cake with nuts and candles on a festive table setting.',
       'Photo by Mathew Thomas on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Diwali Dry Fruit Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Diwali — Diwali Bento Cake (0.3kg)
--   query: bento mini cake indian festival gold diwali dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Diwali Bento Cake (0.3kg)', 'Cakes', 'Diwali',
       'Mini cake to send with the mithai box', 649, '✨',
       'https://images.pexels.com/photos/11522869/pexels-photo-11522869.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delightful assortment of colorful mini cakes elegantly arranged on trays, perfect for celebrations.',
       'Photo by Cristian Mihaila on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Diwali Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Christmas — Christmas Plum Cake (1kg)
--   query: christmas plum fruit cake traditional festive dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Christmas Plum Cake (1kg)', 'Cakes', 'Christmas',
       'Fruit soaked since October, traditional recipe', 899, '🎄',
       'https://images.pexels.com/photos/14524823/pexels-photo-14524823.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delicious panettone served with festive Christmas decorations, perfect for holiday celebrations.',
       'Photo by Marcelo Verfe on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Christmas Plum Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Christmas — Santa Theme Cake (1.5kg)
--   query: santa christmas themed cake fondant festive dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Santa Theme Cake (1.5kg)', 'Cakes', 'Christmas',
       'Fondant Santa, snow and gifts', 1699, '🎅',
       'https://images.pexels.com/photos/14769861/pexels-photo-14769861.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful candles and Santa figurines on a festive cake, ideal for holiday celebrations.',
       'Photo by 대정 김 on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Santa Theme Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Christmas — Christmas Tree Cupcakes (Box of 12)
--   query: christmas tree cupcakes green frosting festive cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Christmas Tree Cupcakes (Box of 12)', 'Cakes', 'Christmas',
       'Piped green trees, edible baubles', 949, '🌲',
       'https://images.pexels.com/photos/8210523/pexels-photo-8210523.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delicious cupcakes with green and white icing, decorated with festive red and green sprinkles on white background.',
       'Photo by Sharon  Snider on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Christmas Tree Cupcakes (Box of 12)' AND category = 'Cakes'
);

-- Cakes / New Year — New Year Countdown Cake (1kg)
--   query: new year countdown clock cake gold celebration dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'New Year Countdown Cake (1kg)', 'Cakes', 'New Year',
       'Clock face at midnight, gold sparkle finish', 1149, '🕛',
       'https://images.pexels.com/photos/6024650/pexels-photo-6024650.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Half-eaten cake with 2021 candles on wooden floor, ideal for New Year celebration themes.',
       'Photo by Polina Tankilevitch on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'New Year Countdown Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / New Year — Midnight New Year Cake (1.5kg)
--   query: new year fireworks celebration cake sparkler dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Midnight New Year Cake (1.5kg)', 'Cakes', 'New Year',
       'Delivered at 12am with sparkler candles', 1699, '🎆',
       'https://images.pexels.com/photos/34416998/pexels-photo-34416998.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A captivating sparkler illuminates the night with vibrant sparks, capturing a moment of celebration.',
       'Photo by Marije Kouyzer on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Midnight New Year Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / New Year — New Year Bento Cake (0.3kg)
--   query: bento mini cake gold new year celebration dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'New Year Bento Cake (0.3kg)', 'Cakes', 'New Year',
       'Small cake, big resolution', 649, '🥂',
       'https://images.pexels.com/photos/5716745/pexels-photo-5716745.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Man cutting a festive New Year cake with champagne and decorations. Perfect for party themes.',
       'Photo by https://kaboompics.com/ on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'New Year Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Holi — Holi Colours Cake (1kg)
--   query: holi colours festival celebration cake colourful dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Holi Colours Cake (1kg)', 'Cakes', 'Holi',
       'Splashes of edible colour across white buttercream', 1099, '🎨',
       'https://images.pexels.com/photos/8887061/pexels-photo-8887061.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful Indian sweets on brass platters, ideal for traditional celebrations.',
       'Photo by Lara Jameson on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Holi Colours Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Holi — Holi Gujiya Fusion Cake (1kg)
--   query: indian festival sweets fusion cake colourful dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Holi Gujiya Fusion Cake (1kg)', 'Cakes', 'Holi',
       'Khoya and dry fruit, gujiya-inspired', 1149, '🥟',
       'https://images.pexels.com/photos/20446398/pexels-photo-20446398.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'An array of Indian desserts with vibrant plating on a colorful background, highlighting shahi tukda.',
       'Photo by Jack Baghel on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Holi Gujiya Fusion Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Eid — Eid Mubarak Cake (1kg)
--   query: eid mubarak crescent moon celebration cake gold dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Eid Mubarak Cake (1kg)', 'Cakes', 'Eid',
       'Crescent and star in gold on ivory fondant', 1149, '🌙',
       'https://images.pexels.com/photos/35829604/pexels-photo-35829604.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Top view of beautifully decorated Eid Mubarak cupcakes with vibrant frosting and embellishments.',
       'Photo by Michael Zhafrin on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Eid Mubarak Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Eid — Sheer Khurma Fusion Cake (1kg)
--   query: dates milk dessert cake middle eastern food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sheer Khurma Fusion Cake (1kg)', 'Cakes', 'Eid',
       'Vermicelli, dates and milk — as a cake', 1249, '🥛',
       'https://images.pexels.com/photos/37010324/pexels-photo-37010324.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Top view of a date and nut cake with almonds and caramel in a paper box.',
       'Photo by Grzegorz  Lewandowski on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sheer Khurma Fusion Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Eid — Eid Crescent Moon Cake (1.5kg)
--   query: eid lantern crescent celebration cake festive dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Eid Crescent Moon Cake (1.5kg)', 'Cakes', 'Eid',
       'Sculpted crescent, lantern toppers', 1699, '🕌',
       'https://images.pexels.com/photos/36072694/pexels-photo-36072694.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful Ramadan-themed table setting with sweets, green drink, and decorative elements.',
       'Photo by Muhammad Rasyad Indra Putra on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Eid Crescent Moon Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Pongal & Onam — Pongal Harvest Cake (1kg)
--   query: pongal harvest festival south india celebration cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Pongal Harvest Cake (1kg)', 'Cakes', 'Pongal & Onam',
       'Sugarcane and pot motifs, jaggery sponge', 1099, '🌾',
       'https://images.pexels.com/photos/35763760/pexels-photo-35763760.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a Pongal pot with coconut and incense, Sri Lanka.',
       'Photo by Dinuka Gunawardana on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Pongal Harvest Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Pongal & Onam — Onam Sadya Theme Cake (1.5kg)
--   query: onam pookalam flower carpet kerala festival cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Onam Sadya Theme Cake (1.5kg)', 'Cakes', 'Pongal & Onam',
       'Pookalam design on a banana-leaf base', 1599, '🍛',
       'https://images.pexels.com/photos/38783573/pexels-photo-38783573.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Three children in traditional attire create a flower design for Onam on stone steps in Kerala, India.',
       'Photo by Jithin murali on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Onam Sadya Theme Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Pongal & Onam — Payasam Fusion Cake (1kg)
--   query: coconut jaggery cardamom cake south indian dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Payasam Fusion Cake (1kg)', 'Cakes', 'Pongal & Onam',
       'Coconut, jaggery and cardamom sponge', 1149, '🥥',
       'https://images.pexels.com/photos/5149337/pexels-photo-5149337.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delicious slice of cake topped with coconut flakes on a dark plate, perfect for dessert lovers.',
       'Photo by ROMAN ODINTSOV on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Payasam Fusion Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Ganesh Chaturthi — Modak Fondant Ganesh Cake (1kg)
--   query: ganesh chaturthi modak idol decoration festival cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Modak Fondant Ganesh Cake (1kg)', 'Cakes', 'Ganesh Chaturthi',
       'Fondant modaks around a gold base', 1249, '🐘',
       'https://images.pexels.com/photos/33643272/pexels-photo-33643272.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of traditional modaks with saffron, a popular offering during Ganesh Chaturthi in India.',
       'Photo by Pinaki Panda on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Modak Fondant Ganesh Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Ganesh Chaturthi — Ganpati Bappa Photo Cake (1kg)
--   query: ganesh idol decoration flowers indian festival cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Ganpati Bappa Photo Cake (1kg)', 'Cakes', 'Ganesh Chaturthi',
       'Edible print of your ghar-cha Ganpati', 1199, '🙏',
       'https://images.pexels.com/photos/10846024/pexels-photo-10846024.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant display of Ganesha idols adorned with flowers and offerings in Mumbai during a Hindu festival.',
       'Photo by Sonika Agarwal on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Ganpati Bappa Photo Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Navratri — Navratri Garba Theme Cake (1.5kg)
--   query: navratri garba dandiya festival celebration colourful cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Navratri Garba Theme Cake (1.5kg)', 'Cakes', 'Navratri',
       'Dandiya sticks and mirrorwork in fondant', 1649, '🪘',
       'https://images.pexels.com/photos/17264037/pexels-photo-17264037.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful display of hands with dandiya sticks celebrating Navratri festival, showcasing Indian culture.',
       'Photo by Teja J on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Navratri Garba Theme Cake (1.5kg)' AND category = 'Cakes'
);

-- Cakes / Navratri — Durga Puja Celebration Cake (1kg)
--   query: durga puja festival celebration red white flowers cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Durga Puja Celebration Cake (1kg)', 'Cakes', 'Navratri',
       'Red-and-white shankha motif, hibiscus sugar flowers', 1199, '🌺',
       'https://images.pexels.com/photos/33865728/pexels-photo-33865728.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Three women in traditional Indian attire sit on stone steps with cultural items.',
       'Photo by Rohit Sharma on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Durga Puja Celebration Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Get Well Soon — Get Well Soon Cake (0.5kg)
--   query: get well soon cake flowers light vanilla dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Get Well Soon Cake (0.5kg)', 'Cakes', 'Get Well Soon',
       'Light vanilla sponge, easy on a recovering appetite', 799, '🤒',
       'https://images.pexels.com/photos/7552332/pexels-photo-7552332.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A hand taking a slice of elegantly frosted cake on a sunny table setting.',
       'Photo by Hanna Pad on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Get Well Soon Cake (0.5kg)' AND category = 'Cakes'
);

-- Cakes / Get Well Soon — Sugar-Free Get Well Cake (1kg)
--   query: sugar free healthy date cake wholesome dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sugar-Free Get Well Cake (1kg)', 'Cakes', 'Get Well Soon',
       'No added sugar, dates and figs instead', 1149, '🩺',
       'https://images.pexels.com/photos/17302469/pexels-photo-17302469.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A detailed view of fresh and organic dried dates perfect for healthy snacking or cooking.',
       'Photo by K on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sugar-Free Get Well Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Sorry — I'm Sorry Bento Cake (0.3kg)
--   query: bento mini cake apology message handwritten dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'I''m Sorry Bento Cake (0.3kg)', 'Cakes', 'Sorry',
       'The apology that gets opened', 549, '🙇',
       'https://images.pexels.com/photos/7333063/pexels-photo-7333063.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Top view of a black mug of tea with a vintage spoon and a mini dessert on a brown wrapper.',
       'Photo by Evgeniy Alekseyev on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'I''m Sorry Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Sorry — Sorry Heart Cake (0.5kg)
--   query: small heart shaped cake red apology romantic dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sorry Heart Cake (0.5kg)', 'Cakes', 'Sorry',
       'Small heart cake, message piped by hand', 849, '💔',
       'https://images.pexels.com/photos/6771400/pexels-photo-6771400.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A delicious heart-shaped cake with raspberry center and pistachio garnish, set on a lace background.',
       'Photo by Son Tung Tran on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sorry Heart Cake (0.5kg)' AND category = 'Cakes'
);

-- Cakes / Thank You — Thank You Cake (1kg)
--   query: thank you cake gratitude flowers elegant dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Thank You Cake (1kg)', 'Cakes', 'Thank You',
       'For the neighbour, the nurse, the friend who showed up', 949, '🙏',
       'https://images.pexels.com/photos/1098556/pexels-photo-1098556.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a hand holding a jar of pink meringue cookies with a ''Thank you'' message.',
       'Photo by Cats Coming on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Thank You Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Thank You — Thank You Bento Cake (0.3kg)
--   query: bento mini cake thank you message flowers dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Thank You Bento Cake (0.3kg)', 'Cakes', 'Thank You',
       'Two bites and a proper thank you', 549, '💐',
       'https://images.pexels.com/photos/1204275/pexels-photo-1204275.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A clear container filled with cookies, featuring a thank you message. Perfect gift idea.',
       'Photo by Cats Coming on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Thank You Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Just Because — Just Because Bento Cake (0.3kg)
--   query: bento mini cake surprise gift cute dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Just Because Bento Cake (0.3kg)', 'Cakes', 'Just Because',
       'No occasion required', 599, '🎁',
       'https://images.pexels.com/photos/35567498/pexels-photo-35567498.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Adorable cute cartoon birthday cake with smiling face and striped candle on a soft surface.',
       'Photo by Pi Pi on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Just Because Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Just Because — Cake in a Jar (Set of 3)
--   query: dessert cake jars layered set spoons food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Cake in a Jar (Set of 3)', 'Cakes', 'Just Because',
       'Three jars, three flavours, spoons included', 549, '🫙',
       'https://images.pexels.com/photos/2350428/pexels-photo-2350428.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Indulgent strawberry dessert in a glass jar, perfect for a sweet treat.',
       'Photo by Gül Işık on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Cake in a Jar (Set of 3)' AND category = 'Cakes'
);

-- Cakes / Just Because — Midnight Surprise Bento Cake (0.3kg)
--   query: midnight surprise mini cake candles dark dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Midnight Surprise Bento Cake (0.3kg)', 'Cakes', 'Just Because',
       'Turns up at 12am for no reason at all', 649, '🌙',
       'https://images.pexels.com/photos/17012852/pexels-photo-17012852.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A woman''s hands holding a small birthday cake with a lit candle, celebrating a special occasion.',
       'Photo by Nadin Sh on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Midnight Surprise Bento Cake (0.3kg)' AND category = 'Cakes'
);

-- Cakes / Sugar-Free — Sugar-Free Vanilla Cake (1kg)
--   query: sugar free vanilla sponge cake healthy dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sugar-Free Vanilla Cake (1kg)', 'Cakes', 'Sugar-Free',
       'Stevia-sweetened, no added sugar', 999, '🍰',
       'https://images.pexels.com/photos/1359334/pexels-photo-1359334.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A freshly baked sponge cake resting on a cooling rack, showcasing its golden crust.',
       'Photo by Cats Coming on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sugar-Free Vanilla Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Sugar-Free — Sugar-Free Chocolate Cake (1kg)
--   query: sugar free dark chocolate cake healthy dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sugar-Free Chocolate Cake (1kg)', 'Cakes', 'Sugar-Free',
       'Dark cocoa, no added sugar', 1099, '🍫',
       'https://images.pexels.com/photos/5702861/pexels-photo-5702861.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A stylish still life of a dark chocolate cake topped with blueberries, surrounded by pine twigs.',
       'Photo by KATRIN  BOLOVTSOVA on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sugar-Free Chocolate Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Sugar-Free — Diabetic-Friendly Date & Walnut Cake (1kg)
--   query: date walnut wholewheat cake healthy sugar free dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Diabetic-Friendly Date & Walnut Cake (1kg)', 'Cakes', 'Sugar-Free',
       'Sweetened only by dates, wholewheat base', 1199, '🌰',
       'https://images.pexels.com/photos/30631337/pexels-photo-30631337.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Tasty dessert in a terracotta bowl with pecans and dates on a black background.',
       'Photo by B_S Media  Production on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Diabetic-Friendly Date & Walnut Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Vegan — Vegan Chocolate Cake (1kg)
--   query: vegan chocolate cake dairy free plant based dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Vegan Chocolate Cake (1kg)', 'Cakes', 'Vegan',
       'No dairy, no egg — coconut-oil ganache', 1199, '🌱',
       'https://images.pexels.com/photos/36203728/pexels-photo-36203728.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of banana slices with rich chocolate spread on a white plate, highlighting textures and contrast.',
       'Photo by Jakub Pabis on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Vegan Chocolate Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Vegan — Vegan Banana Walnut Cake (1kg)
--   query: vegan banana walnut loaf cake plant based dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Vegan Banana Walnut Cake (1kg)', 'Cakes', 'Vegan',
       'Plant-based, naturally sweet', 1099, '🍌',
       'https://images.pexels.com/photos/5419335/pexels-photo-5419335.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Three delicious banana bread slices arranged on a clean white background, perfect for food photography.',
       'Photo by Polina Tankilevitch on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Vegan Banana Walnut Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Vegan — Vegan Red Velvet Cake (1kg)
--   query: vegan red velvet cake cashew frosting dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Vegan Red Velvet Cake (1kg)', 'Cakes', 'Vegan',
       'Beetroot-coloured, cashew cream frosting', 1299, '❤️',
       'https://images.pexels.com/photos/17321239/pexels-photo-17321239.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Close-up of a red velvet cake topped with berries and cream, perfect for celebrations.',
       'Photo by Dmitry  Plain on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Vegan Red Velvet Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Gluten-Free — Gluten-Free Almond Cake (1kg)
--   query: gluten free almond flour cake dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Gluten-Free Almond Cake (1kg)', 'Cakes', 'Gluten-Free',
       'Almond flour base, celiac-safe kitchen', 1349, '🌾',
       'https://images.pexels.com/photos/18232621/pexels-photo-18232621.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A close-up of a delicious berry-topped cake slice on a stylish plate, perfect for pastry lovers.',
       'Photo by Sylwester Ficek on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Gluten-Free Almond Cake (1kg)' AND category = 'Cakes'
);

-- Cakes / Gluten-Free — Gluten-Free Chocolate Brownie Cake (1kg)
--   query: gluten free chocolate brownie cake fudgy dessert food photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Gluten-Free Chocolate Brownie Cake (1kg)', 'Cakes', 'Gluten-Free',
       'Dense, fudgy, no wheat', 1299, '🍫',
       'https://images.pexels.com/photos/16854691/pexels-photo-16854691.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Delicious chocolate brownies topped with raspberries, perfect for dessert lovers.',
       'Photo by Emel Ukav on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Gluten-Free Chocolate Brownie Cake (1kg)' AND category = 'Cakes'
);

COMMIT;
