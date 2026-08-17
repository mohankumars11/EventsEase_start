-- ============================================================
-- Migration 048: A sixth shop category — Heritage & Crafts.
-- Mysore silk, rare handloom weaves, carvings and sculpture,
-- and the Mysuru specialities that are hard to buy anywhere else.
--
-- Run this ONCE in: Supabase Dashboard → SQL Editor
-- Apply 047 first — it is independent, but the shelves read as one
-- range and the resolver run at the end covers both.
-- ============================================================
--
-- ── Why this one IS a category, when 047's shelves were only tags ──────────
-- Migration 047 argued for putting Indian handmade and eco/plants under Gifts
-- as `occasion` tags rather than new categories, because a ₹549 terracotta diya
-- set is a gift and a new category value costs a constraint change, a returns
-- rule and a permanent change to what a past order row means.
--
-- None of that reasoning survives contact with a ₹28,000 bridal Mysore silk
-- saree. This is a different business:
--
--   · The price band is 10–50× the gift shelves. A saree sitting between
--     "Chocolate" and "Dry fruits" in one chip row is not a merchandising
--     choice, it is a mistake somebody will read as the app being unfinished.
--   · The returns condition genuinely differs. A handloom saree comes back
--     unused with its tags and its fall unstitched; a commissioned carving does
--     not come back at all unless it arrived damaged, because it was made for
--     one buyer. `Gifts` promises "7 days, unused" and cannot express that.
--   · It is the only shelf on this platform that is a REASON TO EXIST rather
--     than a convenience. Cakes and balloons are available from twenty apps in
--     Bengaluru. A Molakalmuru silk, a Mysore gesso painting or a rosewood
--     inlay panel are not, and a brand live in exactly Bengaluru and Mysore is
--     the one that should be selling them.
--
-- `/shop/:category` is a generic route and `order_items.category` is an
-- unconstrained snapshot column, so the only schema cost is the CHECK below.
--
-- ── On what these listings claim ───────────────────────────────────────────
-- Sambramo has no signed supplier (see PROJECT_SUMMARY), so `image_source`
-- stays at its 'stock' default from migration 023 and every tile keeps saying
-- "Representative image" until an admin uploads a photograph of the actual
-- piece through Admin → Catalog. That matters more here than anywhere else in
-- the shop: handloom is bought by eye, and two sarees off the same loom differ.
-- The descriptions therefore say what the WEAVE is and never that a specific
-- photographed piece is the one that will arrive.
--
-- No `image_url` is seeded, for the reason migration 024 exists — hand-set
-- URLs give one shelf the same photograph six times. Run
-- `node scripts/resolve-product-images.mjs --only-missing` afterwards.
--
-- Every insert is guarded on (name, category): these files are pasted into a
-- SQL editor by hand, so a second paste is a realistic accident. Re-running
-- this inserts nothing.

-- ── The constraint ─────────────────────────────────────────────────────────
-- Rebuilt rather than added to, because Postgres has no "extend a CHECK".
-- The list is migration 031's list plus one value; dropping and re-adding is
-- exactly what 010 and 031 did.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('Cakes','Gifts','Flowers','Party Essentials','Pooja & Essentials','Heritage & Crafts'));

COMMENT ON CONSTRAINT products_category_check ON products IS
  'Shop categories. Must stay in step with SHOP_CATEGORIES in src/config/shop.js — a value here with no entry there is a product no storefront lists.';


-- ── Mysore Silk ────────────────────────────────────────────────────────────
-- Mysore silk is a GI-tagged crepe woven with pure gold zari, and "Mysore
-- Reshme" is what it is called locally — reshme being silk in Kannada. Named as
-- the weave rather than as a brand, because the mills that make it are not
-- Sambramo's to claim and a trademark on a listing we cannot yet source is a
-- promise with somebody else's name on it.
INSERT INTO products (name, category, occasion, description, price, emoji)
SELECT v.name, v.category, v.occasion, v.description, v.price, v.emoji
FROM (VALUES
  ('Mysore Silk Crepe Saree — Gold Zari Border',   'Heritage & Crafts', 'Mysore Silk', 'Pure crepe silk with a woven gold zari border. The classic Mysore Reshme drape.', 8900, '🧣'),
  ('Mysore Silk Saree — Temple Border',            'Heritage & Crafts', 'Mysore Silk', 'Traditional gopuram temple border in gold zari on crepe silk', 11500, '🛕'),
  ('Mysore Silk Saree — Plain with Contrast Pallu', 'Heritage & Crafts', 'Mysore Silk', 'Single-colour body, contrast pallu. The one that suits everybody.', 7400, '🧵'),
  ('Mysore Silk Saree — Pastel, Fine Zari',        'Heritage & Crafts', 'Mysore Silk', 'Lighter weave in pastel dye, thin zari. For day functions.', 6900, '🌸'),
  ('Mysore Silk Bridal Saree — Heavy Zari',        'Heritage & Crafts', 'Mysore Silk', 'Full-body zari work on heavyweight crepe. Made for the muhurtham.', 28500, '👰'),
  ('Mysore Silk Saree — Peacock Motif Pallu',      'Heritage & Crafts', 'Mysore Silk', 'Woven peacock pallu, gold zari on deep-dyed crepe', 14900, '🦚'),
  ('Mysore Silk Dupatta — Gold Border',            'Heritage & Crafts', 'Mysore Silk', 'Pure silk dupatta with a woven zari edge', 3400, '🧶'),
  ('Mysore Silk Stole — Hand-Dyed',                'Heritage & Crafts', 'Mysore Silk', 'Lightweight silk stole, small-batch dyed', 2200, '🧣'),
  ('Mysore Silk Blouse Piece — Matched Zari',      'Heritage & Crafts', 'Mysore Silk', 'Unstitched 0.8m piece cut to match a Mysore silk saree', 1400, '✂️')
) AS v(name, category, occasion, description, price, emoji)
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name AND p.category = v.category);


-- ── Rare Weaves ────────────────────────────────────────────────────────────
-- The shelf the brief actually asked for: weaves a customer cannot easily find
-- listed anywhere. Karnataka's own first (Ilkal, Molakalmuru, Udupi — all GI
-- weaves, all under-listed online), then the rare ones from elsewhere. Patan
-- Patola is priced where it genuinely sits: it is double ikat, tied and dyed
-- from both sides, and one saree is months of work by a family that can be
-- counted on two hands.
INSERT INTO products (name, category, occasion, description, price, emoji)
SELECT v.name, v.category, v.occasion, v.description, v.price, v.emoji
FROM (VALUES
  ('Ilkal Saree — Kasuti Border, Karnataka',       'Heritage & Crafts', 'Rare Weaves', 'Cotton body joined to a silk pallu by the traditional tope teni technique', 4200, '🪡'),
  ('Molakalmuru Silk Saree — Karnataka',           'Heritage & Crafts', 'Rare Weaves', 'GI-tagged Chitradurga weave, natural dye. Very few looms still run it.', 16500, '🧵'),
  ('Udupi Cotton Saree — Handloom',                'Heritage & Crafts', 'Rare Weaves', 'Fine coastal Karnataka cotton, revived by a handful of cooperatives', 2900, '🌾'),
  ('Kanjivaram Silk Saree — Contrast Korvai',      'Heritage & Crafts', 'Rare Weaves', 'Body and border woven separately and interlocked by hand', 22500, '🛕'),
  ('Patan Patola Saree — Double Ikat',             'Heritage & Crafts', 'Rare Weaves', 'Tied and dyed from both sides so the pattern is identical on each face. Months of work.', 78000, '💠'),
  ('Paithani Saree — Handwoven Pallu',             'Heritage & Crafts', 'Rare Weaves', 'Tapestry-woven peacock and lotus pallu, no reverse thread', 24500, '🦚'),
  ('Banarasi Katan Silk Saree — Kadhwa',           'Heritage & Crafts', 'Rare Weaves', 'Hand-brocaded motifs woven in, not cut — the slow Banarasi method', 19500, '🪷'),
  ('Muga Silk Saree — Assam',                      'Heritage & Crafts', 'Rare Weaves', 'Wild golden silk that is never dyed and brightens with every wash', 26500, '🟡'),
  ('Jamdani Saree — Dhakai Technique',             'Heritage & Crafts', 'Rare Weaves', 'Supplementary weft picked by hand thread by thread. Reads as floating motifs.', 17800, '☁️'),
  ('Chanderi Silk-Cotton Saree',                   'Heritage & Crafts', 'Rare Weaves', 'Sheer, glossy handloom in silk-cotton. Weighs almost nothing.', 5600, '🕊️'),
  ('Kota Doria Saree — Square Weave',              'Heritage & Crafts', 'Rare Weaves', 'Open khat weave in cotton and silk. Built for a Rajasthan summer.', 3800, '🔲'),
  ('Gadwal Saree — Interlocked Border',            'Heritage & Crafts', 'Rare Weaves', 'Cotton body, silk border and pallu, interlocked by hand', 6400, '🧶'),
  ('Narayanpet Saree — Temple Checks',             'Heritage & Crafts', 'Rare Weaves', 'Telangana handloom with a Maharashtrian temple border', 3200, '◼️'),
  ('Bandhani Saree — Hand-Tied, Kutch',            'Heritage & Crafts', 'Rare Weaves', 'Each dot tied by hand before dyeing. Thousands per saree.', 7200, '⚪'),
  ('Kunbi Saree — Goan Revival Weave',             'Heritage & Crafts', 'Rare Weaves', 'The oldest Goan drape, almost lost. Checked cotton, red ground.', 3400, '🟥'),
  ('Khun Fabric Blouse Piece — Karnataka',         'Heritage & Crafts', 'Rare Weaves', 'North Karnataka khun, traditionally woven only for blouses', 1200, '✂️')
) AS v(name, category, occasion, description, price, emoji)
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name AND p.category = v.category);


-- ── Carvings & Sculpture ───────────────────────────────────────────────────
INSERT INTO products (name, category, occasion, description, price, emoji)
SELECT v.name, v.category, v.occasion, v.description, v.price, v.emoji
FROM (VALUES
  ('Rosewood Inlay Wall Panel — Mysuru',           'Heritage & Crafts', 'Carvings & Sculpture', 'Sheesham inlaid with ivory-substitute, bone and contrasting woods. A Mysuru craft.', 18500, '🪵'),
  ('Sandalwood Carved Ganesha (6 inch)',           'Heritage & Crafts', 'Carvings & Sculpture', 'Hand-carved Mysore sandalwood. Scents a room for years.', 24500, '🐘'),
  ('Sandalwood Carved Panel — Dashavatara',        'Heritage & Crafts', 'Carvings & Sculpture', 'Ten avatars in relief, carved from a single block', 42000, '🪔'),
  ('Granite Ganesha — Shilpa Carved (12 inch)',    'Heritage & Crafts', 'Carvings & Sculpture', 'Black granite, carved by hand to Shilpa Shastra proportions', 16500, '🗿'),
  ('Soapstone Nandi — Hand Carved',                'Heritage & Crafts', 'Carvings & Sculpture', 'Soft-stone carving in the Hoysala manner', 6800, '🐂'),
  ('Rosewood Elephant Pair — Mysuru Carved',       'Heritage & Crafts', 'Carvings & Sculpture', 'Trunk-up pair, hand-finished, no veneer', 9400, '🐘'),
  ('Panchaloha Idol — Lost Wax Cast',              'Heritage & Crafts', 'Carvings & Sculpture', 'Five-metal alloy poured into a wax-lost mould, then hand-chased', 34500, '🪙'),
  ('Dhokra Tribal Figurine — Large',               'Heritage & Crafts', 'Carvings & Sculpture', 'Lost-wax brass, a 4,000-year-old unbroken technique', 5200, '🎭'),
  ('Marble Inlay Table Top — Pietra Dura',         'Heritage & Crafts', 'Carvings & Sculpture', 'Semi-precious stone set into white marble by hand', 28500, '⬜'),
  ('Teak Temple Door Frame — Carved',              'Heritage & Crafts', 'Carvings & Sculpture', 'Traditional carved jamb and lintel for a pooja room', 46500, '🚪'),
  ('Wooden Kavad Storytelling Shrine',             'Heritage & Crafts', 'Carvings & Sculpture', 'Folding painted shrine from Rajasthan. Opens into a painted story.', 12500, '📿'),
  ('Terracotta Ayyanar Horse — Large',             'Heritage & Crafts', 'Carvings & Sculpture', 'Village guardian horse, hand-built and fired in one piece', 7800, '🐴')
) AS v(name, category, occasion, description, price, emoji)
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name AND p.category = v.category);


-- ── Mysuru Specials ────────────────────────────────────────────────────────
-- The city's own list. Deliberately no sweets: Mysore pak is a perishable and
-- the returns rules in src/config/policies.js key a same-day photo window off
-- perishable CATEGORIES, not off individual products — so one box of sweets in
-- here would either get a 7-day window it cannot honour or drag the window on a
-- ₹78,000 Patola down to same-day. Food belongs in its own category.
INSERT INTO products (name, category, occasion, description, price, emoji)
SELECT v.name, v.category, v.occasion, v.description, v.price, v.emoji
FROM (VALUES
  ('Mysore Traditional Painting — Gesso & Gold Foil', 'Heritage & Crafts', 'Mysuru Specials', 'Built up in gesso and leafed in gold. The Mysore school, still painted by a few families.', 22500, '🖼️'),
  ('Mysore Painting — Small Devotional Panel',     'Heritage & Crafts', 'Mysuru Specials', 'Gesso relief and gold foil on board, framed', 8900, '🪔'),
  ('Mysore Sandalwood Oil (5ml)',                  'Heritage & Crafts', 'Mysuru Specials', 'Steam-distilled from heartwood. Five millilitres is a great deal of tree.', 6500, '💧'),
  ('Mysore Sandalwood Soap — Gift Box of 4',       'Heritage & Crafts', 'Mysuru Specials', 'The bar the city is known for, in a presentation box', 899, '🧼'),
  ('Mysore Agarbathi — Handrolled Gift Set',       'Heritage & Crafts', 'Mysuru Specials', 'Hand-rolled incense in six traditional blends', 749, '🕯️'),
  ('Mysore Rosewood Inlay Jewellery Box',         'Heritage & Crafts', 'Mysuru Specials', 'Inlaid lid, velvet-lined interior, brass clasp', 7400, '💼'),
  ('Mysore Silk Wedding Trousseau Set',           'Heritage & Crafts', 'Mysuru Specials', 'Saree, dupatta and blouse piece in matched Mysore Reshme', 34500, '👰'),
  ('Channapatna Lacquerware Gift Set',            'Heritage & Crafts', 'Mysuru Specials', 'Turned and lacquered on the Bengaluru–Mysuru road. Vegetable dyes only.', 1899, '🪀'),
  ('Bidriware Vase — Silver Inlay',               'Heritage & Crafts', 'Mysuru Specials', 'Blackened zinc alloy with pure silver inlay, from Bidar', 9800, '🏺'),
  ('Kasuti Embroidered Wall Hanging',             'Heritage & Crafts', 'Mysuru Specials', 'North Karnataka counted-thread embroidery, no knots on either face', 4600, '🧵'),
  ('Mysore Palace Brass Replica',                 'Heritage & Crafts', 'Mysuru Specials', 'Cast and hand-finished brass, on a rosewood base', 5400, '🏛️'),
  ('Mysore Silk & Sandalwood Hamper',             'Heritage & Crafts', 'Mysuru Specials', 'A silk stole, sandalwood soap, agarbathi and a Channapatna piece', 4900, '🎁')
) AS v(name, category, occasion, description, price, emoji)
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name AND p.category = v.category);


-- ── Artisan Commissions ────────────────────────────────────────────────────
-- Made to order, and the price is a floor rather than a price. Listed as
-- products because that is the only thing this shop can put in a cart, and the
-- description carries the lead time in every row — a commission that arrives
-- as a surprise six weeks later is a complaint, not a sale. These are the rows
-- an admin will most often edit, because the real quote comes from the artisan.
INSERT INTO products (name, category, occasion, description, price, emoji)
SELECT v.name, v.category, v.occasion, v.description, v.price, v.emoji
FROM (VALUES
  ('Commission — Stone Idol to Your Measurements', 'Heritage & Crafts', 'Artisan Commissions', 'Carved to your height and deity by a Shilpi. From 8 weeks. Price is a starting point — we quote after the drawing is approved.', 45000, '🗿'),
  ('Commission — Sandalwood Carving',              'Heritage & Crafts', 'Artisan Commissions', 'Your subject, carved in Mysore sandalwood. From 10 weeks, priced by weight of wood.', 38000, '🪵'),
  ('Commission — Handloom Saree in Your Colours',  'Heritage & Crafts', 'Artisan Commissions', 'Woven to your colour and border on a chosen loom. From 6 weeks.', 18000, '🧵'),
  ('Commission — Mysore Painting Portrait',        'Heritage & Crafts', 'Artisan Commissions', 'Gesso and gold foil, in the Mysore school, from your reference. From 8 weeks.', 26000, '🖼️'),
  ('Commission — Rosewood Inlay Nameplate',        'Heritage & Crafts', 'Artisan Commissions', 'Your family name inlaid in contrasting woods. From 3 weeks.', 9500, '🪧'),
  ('Commission — Panchaloha Idol',                 'Heritage & Crafts', 'Artisan Commissions', 'Lost-wax cast in five metals to Shastra proportion. From 12 weeks.', 65000, '🪙')
) AS v(name, category, occasion, description, price, emoji)
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name AND p.category = v.category);


-- ── After applying this ────────────────────────────────────────────────────
--   1. node scripts/resolve-product-images.mjs --only-missing
--      then paste the UPDATEs it prints, so each piece gets its own photograph
--      rather than falling back to an emoji tile.
--   2. Admin → Catalog is where every row above is edited, retired or
--      photographed from here on. Nothing in this file needs a second migration
--      to change — that was the point of seeding it as ordinary product rows.
