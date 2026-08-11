-- ============================================================
-- Migration 032: Party Essentials — setups, not just supplies.  GENERATED FILE.
--
-- Produced by scripts/generate-catalog.mjs --set party on 2026-08-10 from pexels.
-- Do not hand-edit: change scripts/data/party-catalog.mjs and re-run.
--
-- The category held 60 objects — balloons, banners, plates — and nothing
-- that amounts to a decorated room. That is the gap between selling party
-- supplies and running a celebrations business: a customer does not want
-- 100 loose balloons, they want the wall behind the cake to look like the
-- photo, and they want somebody else to have hung it.
--
-- Most rows below are therefore a setup rather than an item, and the
-- customiser (src/config/customizers/party.js) asks who installs it, what
-- colour theme to match, and what kind of venue it is going into.
--
-- 48 products across 10 occasions:
--     7  Birthday
--     6  Balloon Decor
--     6  Theme Party
--     6  Wedding & Engagement
--     5  Backdrop & Banners
--     5  Tableware
--     4  Anniversary
--     4  Baby Shower
--     3  Housewarming
--     2  Farewell
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
-- 1 item(s) in the source data were skipped as already present:
--   Fairy Light Curtain Backdrop
--
-- Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- Party Essentials / Birthday — Birthday Balloon Arch — Full Setup
--   query: organic balloon arch birthday party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Birthday Balloon Arch — Full Setup', 'Party Essentials', 'Birthday',
       'Organic balloon arch over the cake table, in your colours', 2499, '🎈',
       'https://images.pexels.com/photos/11282245/pexels-photo-11282245.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully decorated pink themed birthday party with floral arrangements and balloon arches.',
       'Photo by Vidal Balielo Jr. on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Birthday Balloon Arch — Full Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Birthday — Birthday Room Decoration — Complete
--   query: decorated birthday party room balloons streamers decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Birthday Room Decoration — Complete', 'Party Essentials', 'Birthday',
       'Walls, ceiling and entrance, styled end to end', 3999, '🎊',
       'https://images.pexels.com/photos/5716814/pexels-photo-5716814.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Festive arrangement with gold, silver balloons and confetti on wooden flooring.',
       'Photo by https://kaboompics.com/ on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Birthday Room Decoration — Complete' AND category = 'Party Essentials'
);

-- Party Essentials / Birthday — Kids Birthday Theme Setup
--   query: kids birthday party theme decoration colourful celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Kids Birthday Theme Setup', 'Party Essentials', 'Birthday',
       'Character backdrop, props and matching table styling', 4499, '🦄',
       'https://images.pexels.com/photos/8050382/pexels-photo-8050382.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A young girl in a rainbow dress stands in front of colorful balloons and streamers at her birthday party.',
       'Photo by Cherry Ann Gonzales on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Kids Birthday Theme Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Birthday — Surprise Birthday Room Fill
--   query: room filled with balloons surprise celebration party decoration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Surprise Birthday Room Fill', 'Party Essentials', 'Birthday',
       'Floor filled with balloons, ready for the door to open', 1999, '🎉',
       'https://images.pexels.com/photos/8652621/pexels-photo-8652621.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A delightful children''s birthday setup with pink balloons and playful decorations in a cozy room.',
       'Photo by Hanna Auramenka on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Surprise Birthday Room Fill' AND category = 'Party Essentials'
);

-- Party Essentials / Birthday — Birthday Photo Wall — 8ft
--   query: birthday photo backdrop wall lights party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Birthday Photo Wall — 8ft', 'Party Essentials', 'Birthday',
       'Instagram wall with name lettering and lights', 2999, '📸',
       'https://images.pexels.com/photos/17840129/pexels-photo-17840129.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Charming baby girl celebrates her first birthday surrounded by colorful balloons.',
       'Photo by Luis angel Alejos espinoza on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Birthday Photo Wall — 8ft' AND category = 'Party Essentials'
);

-- Party Essentials / Birthday — Midnight Birthday Surprise Kit
--   query: midnight birthday celebration candles sparklers party decoration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Midnight Birthday Surprise Kit', 'Party Essentials', 'Birthday',
       'Candles, sparklers, balloons and a banner, delivered at 12am', 1299, '🌙',
       'https://images.pexels.com/photos/27176823/pexels-photo-27176823.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Three friends celebrate a birthday with cake and sparklers indoors wearing party hats.',
       'Photo by Helena Lopes on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Midnight Birthday Surprise Kit' AND category = 'Party Essentials'
);

-- Party Essentials / Birthday — Car Boot Birthday Surprise Setup
--   query: car decorated balloons surprise gift celebration party decoration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Car Boot Birthday Surprise Setup', 'Party Essentials', 'Birthday',
       'Balloons and lights arranged in the boot for the reveal', 2299, '🚗',
       'https://images.pexels.com/photos/10921265/pexels-photo-10921265.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Smiling woman holding balloons during a vibrant birthday celebration indoors.',
       'Photo by Ala Ben Brahem on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Car Boot Birthday Surprise Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Baby Shower — Baby Shower Pastel Arch
--   query: baby shower pastel balloon arch greenery party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Baby Shower Pastel Arch', 'Party Essentials', 'Baby Shower',
       'Soft pastel balloon arch with greenery', 2799, '🍼',
       'https://images.pexels.com/photos/12114820/pexels-photo-12114820.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Soft and inviting baby shower setup featuring beige teddy bears and balloon decor.',
       'Photo by Jonathan Nenemann on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Baby Shower Pastel Arch' AND category = 'Party Essentials'
);

-- Party Essentials / Baby Shower — Godh Bharai Traditional Setup
--   query: indian baby shower marigold decoration traditional party celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Godh Bharai Traditional Setup', 'Party Essentials', 'Baby Shower',
       'Marigold, drapes and a seat for the mother-to-be', 3499, '🪔',
       'https://images.pexels.com/photos/19569602/pexels-photo-19569602.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Smiling bride in a red sari enjoying a wedding ritual with flower petals.',
       'Photo by Rohit Photography on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Godh Bharai Traditional Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Baby Shower — Gender Reveal Balloon Box
--   query: gender reveal balloon box pink blue party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Gender Reveal Balloon Box', 'Party Essentials', 'Baby Shower',
       'Black box, coloured balloons, one lid to lift', 1799, '🎀',
       'https://images.pexels.com/photos/6463227/pexels-photo-6463227.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Friends joyfully celebrate a gender reveal with blue balloons indoors.',
       'Photo by Tima Miroshnichenko on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Gender Reveal Balloon Box' AND category = 'Party Essentials'
);

-- Party Essentials / Baby Shower — Baby Shower Photo Corner
--   query: baby shower photo backdrop props pastel party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Baby Shower Photo Corner', 'Party Essentials', 'Baby Shower',
       'Backdrop, props and a "mum to be" sash', 2499, '📷',
       'https://images.pexels.com/photos/17637268/pexels-photo-17637268.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant and festive baby shower setup with balloons and decorations.',
       'Photo by SAULO LEITE on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Baby Shower Photo Corner' AND category = 'Party Essentials'
);

-- Party Essentials / Anniversary — Romantic Candlelight Room Setup
--   query: romantic candlelight room rose petals decoration party celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Romantic Candlelight Room Setup', 'Party Essentials', 'Anniversary',
       'Candles, rose petals and fairy lights, arranged by our team', 3299, '🕯️',
       'https://images.pexels.com/photos/6822851/pexels-photo-6822851.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Beautiful red roses with champagne and candlelight, perfect for romantic occasions.',
       'Photo by Erik G on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Romantic Candlelight Room Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Anniversary — Anniversary Heart Balloon Wall
--   query: heart balloon wall romantic anniversary decoration party celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Anniversary Heart Balloon Wall', 'Party Essentials', 'Anniversary',
       'Heart-shaped balloon wall with photo pegs', 2599, '❤️',
       'https://images.pexels.com/photos/6629590/pexels-photo-6629590.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant red heart-shaped balloons, perfect for Valentine''s Day or romantic celebrations.',
       'Photo by Alesia Talkachova on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Anniversary Heart Balloon Wall' AND category = 'Party Essentials'
);

-- Party Essentials / Anniversary — Terrace Dinner Setup for Two
--   query: rooftop romantic dinner table setup lights party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Terrace Dinner Setup for Two', 'Party Essentials', 'Anniversary',
       'Table, drapes, lights and flowers under the sky', 4999, '🍽️',
       'https://images.pexels.com/photos/33895104/pexels-photo-33895104.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Elegant rooftop dining setting with a view of a historic domed building, perfect for events.',
       'Photo by Dmitry Ovsyannikov on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Terrace Dinner Setup for Two' AND category = 'Party Essentials'
);

-- Party Essentials / Anniversary — Anniversary Photo Timeline Wall
--   query: photo string lights memory wall decoration party celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Anniversary Photo Timeline Wall', 'Party Essentials', 'Anniversary',
       'Every year of the two of you, pegged along a lit string', 2199, '🖼️',
       'https://images.pexels.com/photos/15928649/pexels-photo-15928649.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Outdoor display of photographs hanging from strings on a tree in a garden setting.',
       'Photo by Pew Nguyen on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Anniversary Photo Timeline Wall' AND category = 'Party Essentials'
);

-- Party Essentials / Wedding & Engagement — Engagement Stage Decoration
--   query: indian engagement stage decoration flowers backdrop party celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Engagement Stage Decoration', 'Party Essentials', 'Wedding & Engagement',
       'Backdrop, seating and floral styling for the ring exchange', 8999, '💍',
       'https://images.pexels.com/photos/13156145/pexels-photo-13156145.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Luxurious wedding stage featuring a floral arch and traditional attire, ideal for ceremonies.',
       'Photo by Gursher  Gill on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Engagement Stage Decoration' AND category = 'Party Essentials'
);

-- Party Essentials / Wedding & Engagement — Haldi Ceremony Decor Setup
--   query: haldi ceremony marigold decoration umbrella yellow party celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Haldi Ceremony Decor Setup', 'Party Essentials', 'Wedding & Engagement',
       'Marigold curtains, low seating and umbrellas', 5999, '🌼',
       'https://images.pexels.com/photos/36782322/pexels-photo-36782322.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A traditional Indian wedding with vibrant yellow decor and joyful participation.',
       'Photo by Kanishka M Gunathunga on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Haldi Ceremony Decor Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Wedding & Engagement — Mehendi Night Decor Setup
--   query: mehendi decoration cushions lanterns colourful indian party celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Mehendi Night Decor Setup', 'Party Essentials', 'Wedding & Engagement',
       'Mirrors, cushions, drapes and lanterns', 6499, '🌿',
       'https://images.pexels.com/photos/12343967/pexels-photo-12343967.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Colorful mehendi ceremony setup with smoke effects, featuring yellow and red decor in an outdoor garden setting.',
       'Photo by santosh bhagat on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Mehendi Night Decor Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Wedding & Engagement — Wedding Entrance Floral Arch
--   query: wedding entrance floral arch fresh flowers party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Wedding Entrance Floral Arch', 'Party Essentials', 'Wedding & Engagement',
       'Fresh flower arch for the entrance or mandap', 7499, '💐',
       'https://images.pexels.com/photos/32322727/pexels-photo-32322727.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Charming outdoor wedding setting with beautiful floral décor in pink and red hues.',
       'Photo by Sóc Năng Động on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Wedding Entrance Floral Arch' AND category = 'Party Essentials'
);

-- Party Essentials / Wedding & Engagement — Sangeet Stage & Lighting
--   query: sangeet stage lighting indian wedding celebration party decoration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Sangeet Stage & Lighting', 'Party Essentials', 'Wedding & Engagement',
       'Stage backdrop with uplighting for the performances', 9999, '🥁',
       'https://images.pexels.com/photos/24334706/pexels-photo-24334706.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Joyful Indian wedding in Delhi with vibrant attire and dazzling fireworks.',
       'Photo by Khaas Photographer on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Sangeet Stage & Lighting' AND category = 'Party Essentials'
);

-- Party Essentials / Wedding & Engagement — Car Decoration for the Couple
--   query: wedding car decorated flowers ribbon party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Car Decoration for the Couple', 'Party Essentials', 'Wedding & Engagement',
       'Fresh flowers and ribbon on the send-off car', 3499, '🚘',
       'https://images.pexels.com/photos/25052924/pexels-photo-25052924.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'White car with elegant ribbons for a wedding celebration. Perfect wedding transportation imagery.',
       'Photo by HONG SON on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Car Decoration for the Couple' AND category = 'Party Essentials'
);

-- Party Essentials / Housewarming — Griha Pravesh Entrance Setup
--   query: indian house entrance decoration marigold toran rangoli party celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Griha Pravesh Entrance Setup', 'Party Essentials', 'Housewarming',
       'Mango-leaf toran, rangoli and marigold at the door', 2999, '🏠',
       'https://images.pexels.com/photos/8887053/pexels-photo-8887053.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Celebratory Diwali table adorned with flowers, garlands, and traditional Indian sweets.',
       'Photo by Lara Jameson on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Griha Pravesh Entrance Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Housewarming — Housewarming Balloon & Banner Kit
--   query: welcome home decoration balloons banner party celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Housewarming Balloon & Banner Kit', 'Party Essentials', 'Housewarming',
       '"Welcome Home" banner with matching balloons', 1499, '🔑',
       'https://images.pexels.com/photos/9628031/pexels-photo-9628031.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Two happy children celebrate a birthday with balloons and party hats indoors.',
       'Photo by Ivan S on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Housewarming Balloon & Banner Kit' AND category = 'Party Essentials'
);

-- Party Essentials / Housewarming — Rangoli Design — Done for You
--   query: colourful rangoli design indian doorstep party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Rangoli Design — Done for You', 'Party Essentials', 'Housewarming',
       'Hand-drawn rangoli at your doorstep, fresh colours', 1999, '🎨',
       'https://images.pexels.com/photos/5491495/pexels-photo-5491495.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Hands creating a vibrant Rangoli pattern with colored powder, symbolizing creativity and celebration.',
       'Photo by Nishant Aneja on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Rangoli Design — Done for You' AND category = 'Party Essentials'
);

-- Party Essentials / Farewell — Farewell Office Decor Kit
--   query: office farewell party decoration banner balloons celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Farewell Office Decor Kit', 'Party Essentials', 'Farewell',
       'Banner, balloons and a signing board for the team', 1799, '👋',
       'https://images.pexels.com/photos/7580801/pexels-photo-7580801.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A joyful office birthday celebration with colleagues surprising a coworker with a banner and decorations.',
       'Photo by RDNE Stock project on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Farewell Office Decor Kit' AND category = 'Party Essentials'
);

-- Party Essentials / Farewell — Retirement Celebration Setup
--   query: retirement party decoration gold celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Retirement Celebration Setup', 'Party Essentials', 'Farewell',
       'Photo timeline, balloons and a gold "thank you" wall', 2999, '🎣',
       'https://images.pexels.com/photos/7867434/pexels-photo-7867434.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Cheerful senior couple celebrating with gold balloons on a vibrant red background.',
       'Photo by RDNE Stock project on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Retirement Celebration Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Theme Party — Neon Glow Party Setup
--   query: neon glow party lights decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Neon Glow Party Setup', 'Party Essentials', 'Theme Party',
       'UV lights, neon props and glow tableware', 4499, '💡',
       'https://images.pexels.com/photos/33602222/pexels-photo-33602222.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Neon sign with ''Happy Birthday'' text and glowing bubbles, perfect for celebrations.',
       'Photo by dumitru B on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Neon Glow Party Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Theme Party — Bollywood Retro Theme Setup
--   query: bollywood retro party decoration vintage colourful celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Bollywood Retro Theme Setup', 'Party Essentials', 'Theme Party',
       'Vintage posters, drapes and marquee lettering', 4999, '🎬',
       'https://images.pexels.com/photos/30700749/pexels-photo-30700749.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant multicolor flags decorate an urban alley, creating a festive atmosphere.',
       'Photo by Tito Zzzz on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Bollywood Retro Theme Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Theme Party — Garden Picnic Theme Setup
--   query: garden picnic party low table cushions lanterns decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Garden Picnic Theme Setup', 'Party Essentials', 'Theme Party',
       'Low tables, cushions, rugs and lanterns', 3999, '🧺',
       'https://images.pexels.com/photos/10024440/pexels-photo-10024440.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Beautiful outdoor garden setup with decorations, perfect for a summer party.',
       'Photo by Ron Lach on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Garden Picnic Theme Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Theme Party — Boho Tent Party Setup
--   query: boho teepee tent party sleepover decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Boho Tent Party Setup', 'Party Essentials', 'Theme Party',
       'Teepee tents, fairy lights and floor cushions', 5499, '⛺',
       'https://images.pexels.com/photos/8385012/pexels-photo-8385012.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A joyful child in a unicorn-themed setting enjoys a cozy teepee, surrounded by colorful decorations, embodying fun and imagination.',
       'Photo by RDNE Stock project on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Boho Tent Party Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Theme Party — Cocktail Evening Bar Styling
--   query: home cocktail bar party styling glassware decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Cocktail Evening Bar Styling', 'Party Essentials', 'Theme Party',
       'Bar backdrop, glassware styling and signage', 3799, '🍸',
       'https://images.pexels.com/photos/13723034/pexels-photo-13723034.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A sophisticated bar setup showcasing various liquor bottles for an upscale ambiance.',
       'Photo by Teruo Kondo on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Cocktail Evening Bar Styling' AND category = 'Party Essentials'
);

-- Party Essentials / Theme Party — Cricket Watch Party Setup
--   query: sports watch party decoration jersey colours celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Cricket Watch Party Setup', 'Party Essentials', 'Theme Party',
       'Team colours, jerseys and a scoreboard wall', 2799, '🏏',
       'https://images.pexels.com/photos/36068683/pexels-photo-36068683.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Two enthusiastic Argentinian soccer fans in team jerseys celebrating a victory indoors.',
       'Photo by Kari Alfonso on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Cricket Watch Party Setup' AND category = 'Party Essentials'
);

-- Party Essentials / Balloon Decor — Helium Balloon Bouquet (15 pcs)
--   query: helium balloon bouquet floating colourful party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Helium Balloon Bouquet (15 pcs)', 'Party Essentials', 'Balloon Decor',
       'Floating bouquet, weighted and delivered ready', 1299, '🎈',
       'https://images.pexels.com/photos/3905855/pexels-photo-3905855.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A cluster of colorful pastel balloons floating with a minimalistic white backdrop.',
       'Photo by Polina Tankilevitch on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Helium Balloon Bouquet (15 pcs)' AND category = 'Party Essentials'
);

-- Party Essentials / Balloon Decor — Giant Number Foil Balloons (Pair)
--   query: giant number foil balloon gold party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Giant Number Foil Balloons (Pair)', 'Party Essentials', 'Balloon Decor',
       '40-inch numbers, any age, helium optional', 899, '🔢',
       'https://images.pexels.com/photos/5716815/pexels-photo-5716815.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Two people holding golden 2021 balloons, celebrating a festive New Year event.',
       'Photo by https://kaboompics.com/ on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Giant Number Foil Balloons (Pair)' AND category = 'Party Essentials'
);

-- Party Essentials / Balloon Decor — Chrome Balloon Cluster Set
--   query: chrome metallic balloons cluster party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Chrome Balloon Cluster Set', 'Party Essentials', 'Balloon Decor',
       'Metallic chrome balloons in a styled cluster', 1499, '✨',
       'https://images.pexels.com/photos/3371095/pexels-photo-3371095.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A stylish arrangement of metallic balloons in soft colors, perfect for celebrations.',
       'Photo by Natalie Bond on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Chrome Balloon Cluster Set' AND category = 'Party Essentials'
);

-- Party Essentials / Balloon Decor — Balloon Ceiling Cluster with Ribbons
--   query: balloons on ceiling ribbons party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Balloon Ceiling Cluster with Ribbons', 'Party Essentials', 'Balloon Decor',
       'Ceiling filled with balloons and trailing ribbon', 1899, '🎀',
       'https://images.pexels.com/photos/3905885/pexels-photo-3905885.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Vibrant balloons in various colors, perfect for any party or celebration.',
       'Photo by Polina Tankilevitch on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Balloon Ceiling Cluster with Ribbons' AND category = 'Party Essentials'
);

-- Party Essentials / Balloon Decor — Confetti Balloon Set (20 pcs)
--   query: confetti filled clear balloons party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Confetti Balloon Set (20 pcs)', 'Party Essentials', 'Balloon Decor',
       'Clear balloons with confetti inside', 799, '🎊',
       'https://images.pexels.com/photos/5716599/pexels-photo-5716599.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Festive indoor party scene with golden balloons, confetti, and decorations.',
       'Photo by https://kaboompics.com/ on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Confetti Balloon Set (20 pcs)' AND category = 'Party Essentials'
);

-- Party Essentials / Balloon Decor — Balloon Column Pair (6ft)
--   query: balloon column tower entrance party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Balloon Column Pair (6ft)', 'Party Essentials', 'Balloon Decor',
       'Two towers to frame an entrance or stage', 2199, '🏛️',
       'https://images.pexels.com/photos/34708806/pexels-photo-34708806.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Woman in white holding gold bow at an elegant event with ''Bienvenidos'' sign.',
       'Photo by Francisco Medellin on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Balloon Column Pair (6ft)' AND category = 'Party Essentials'
);

-- Party Essentials / Backdrop & Banners — Custom Name Backdrop — 6ft
--   query: custom printed party backdrop name banner decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Custom Name Backdrop — 6ft', 'Party Essentials', 'Backdrop & Banners',
       'Printed backdrop with your name, date and theme', 2299, '🔤',
       'https://images.pexels.com/photos/34213403/pexels-photo-34213403.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Gold name decor with lush green tropical leaves for a jungle-themed event.',
       'Photo by Sonia Antony on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Custom Name Backdrop — 6ft' AND category = 'Party Essentials'
);

-- Party Essentials / Backdrop & Banners — Shimmer Wall Backdrop
--   query: sequin shimmer wall backdrop party photo decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Shimmer Wall Backdrop', 'Party Essentials', 'Backdrop & Banners',
       'Sequin shimmer panel, gold, silver or rose gold', 2799, '💫',
       'https://images.pexels.com/photos/16109603/pexels-photo-16109603.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A striking portrait of a woman surrounded by shimmering lights in a vibrant party setting.',
       'Photo by Karen Irala on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Shimmer Wall Backdrop' AND category = 'Party Essentials'
);

-- Party Essentials / Backdrop & Banners — Flower Wall Backdrop — 8ft
--   query: artificial flower wall backdrop wedding event party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Flower Wall Backdrop — 8ft', 'Party Essentials', 'Backdrop & Banners',
       'Artificial flower wall, reusable, installed by us', 5999, '🌸',
       'https://images.pexels.com/photos/9965895/pexels-photo-9965895.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Luxurious wedding setup featuring a white sofa and floral arrangements. Perfect for celebrations.',
       'Photo by Donna on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Flower Wall Backdrop — 8ft' AND category = 'Party Essentials'
);

-- Party Essentials / Backdrop & Banners — Marquee Light-Up Letters (Rental)
--   query: marquee light up letters party rental decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Marquee Light-Up Letters (Rental)', 'Party Essentials', 'Backdrop & Banners',
       'Up to four 3ft letters or numbers, collected next day', 2499, '🅰️',
       'https://images.pexels.com/photos/2695625/pexels-photo-2695625.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Bright marquee letters saying ''YOU HAD ME AT BEER'' against a hedge backdrop.',
       'Photo by Vlad Chețan on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Marquee Light-Up Letters (Rental)' AND category = 'Party Essentials'
);

-- Party Essentials / Backdrop & Banners — Personalised Welcome Board
--   query: welcome sign board easel event personalised party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Personalised Welcome Board', 'Party Essentials', 'Backdrop & Banners',
       'Easel board printed with your message', 999, '🪧',
       'https://images.pexels.com/photos/30740005/pexels-photo-30740005.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Welcome sign for outdoor wedding with trees and heart decor.',
       'Photo by Franco Monsalvo on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Personalised Welcome Board' AND category = 'Party Essentials'
);

-- Party Essentials / Tableware — Themed Tableware Set (12 guests)
--   query: party tableware plates cups napkins themed decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Themed Tableware Set (12 guests)', 'Party Essentials', 'Tableware',
       'Plates, cups, napkins and cutlery, matched to your theme', 1199, '🍽️',
       'https://images.pexels.com/photos/35591597/pexels-photo-35591597.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully arranged dining table with pink napkins, crystal glasses, and gold cutlery, perfect for elegant events.',
       'Photo by bigmass media and printing on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Themed Tableware Set (12 guests)' AND category = 'Party Essentials'
);

-- Party Essentials / Tableware — Cake Table Styling Kit
--   query: styled cake table dessert party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Cake Table Styling Kit', 'Party Essentials', 'Tableware',
       'Runner, stands, drapes and props for the cake table', 1499, '🎂',
       'https://images.pexels.com/photos/10751392/pexels-photo-10751392.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Elegant boho-style cake setup with floral designs and rustic background.',
       'Photo by Rerisson  Hofniel on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Cake Table Styling Kit' AND category = 'Party Essentials'
);

-- Party Essentials / Tableware — Dessert Table Stand Set (5 pcs)
--   query: dessert table tiered stands party display decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Dessert Table Stand Set (5 pcs)', 'Party Essentials', 'Tableware',
       'Tiered stands in graduated heights', 1699, '🧁',
       'https://images.pexels.com/photos/13938381/pexels-photo-13938381.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Elegant three-tier wedding cake adorned with pink roses and greenery in a cozy room.',
       'Photo by Luis Quintero on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Dessert Table Stand Set (5 pcs)' AND category = 'Party Essentials'
);

-- Party Essentials / Tableware — Eco Tableware Set (12 guests)
--   query: eco friendly leaf plates bamboo cutlery party decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Eco Tableware Set (12 guests)', 'Party Essentials', 'Tableware',
       'Areca leaf plates and bamboo cutlery — fully compostable', 1399, '🌿',
       'https://images.pexels.com/photos/29068733/pexels-photo-29068733.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'A beautifully arranged rustic dining table with greenery, candles, and tableware.',
       'Photo by Jonathan Borba on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Eco Tableware Set (12 guests)' AND category = 'Party Essentials'
);

-- Party Essentials / Tableware — Return Gift Bags (Set of 12)
--   query: party return gift bags children colourful decoration celebration photography
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT 'Return Gift Bags (Set of 12)', 'Party Essentials', 'Tableware',
       'Themed bags, filled to your budget', 899, '🎁',
       'https://images.pexels.com/photos/15011370/pexels-photo-15011370.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
       'Pink gift bag featuring a cartoon character on a wooden bench. Perfect for festive occasions.',
       'Photo by Arturo Añez. on Pexels', 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Return Gift Bags (Set of 12)' AND category = 'Party Essentials'
);

COMMIT;
