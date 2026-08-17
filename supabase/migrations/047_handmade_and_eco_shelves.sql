-- ============================================================
-- Migration 047: Two new shelves under Gifts — Indian handmade
-- and eco / plants.
--
-- Run this ONCE in: Supabase Dashboard → SQL Editor
-- ============================================================
--
-- ── Why these are occasions and not categories ─────────────────────────────
-- `products.category` is a CHECK-constrained enum that is also a route
-- (`/shop/:category`), an order-history snapshot (order_items.category) and a
-- returns-policy key (CATEGORY_RULES in src/config/policies.js). Adding two
-- values to it means touching the constraint, the router, the returns rules and
-- every historical order row's meaning — for two shelves that are, commercially,
-- gifts.
--
-- `products.occasion` is already the axis the shop filters on and deep-links
-- through (`/shop/Gifts?occasion=Rakhi`), it is free text, and the taxonomy in
-- src/data/shopOccasions.js has a group ("Or by what's inside") that these two
-- belong to exactly — Chocolate and Dry Fruits are already tags that describe
-- what a thing IS rather than which festival it is for.
--
-- So: same category, two new tags. No constraint change, no route change, no
-- retroactive change to what a past order meant.
--
-- ── Every row is image_source 'stock' ──────────────────────────────────────
-- Which is the default from migration 023, so it is not set here. Sambramo has
-- no signed supplier: these are real products at real prices that will be
-- sourced per order, and the customer-facing badge must keep saying
-- "Representative image" until an admin uploads a photo of the actual item
-- through Admin → Catalog. Do not seed image_url here — the resolver
-- (scripts/resolve-product-images.mjs) assigns one photo per product with
-- deduplication against the live catalogue, and hand-set URLs are what
-- migration 024 existed to undo.
--
-- ── Re-running this file is safe ───────────────────────────────────────────
-- Migration 015's header warns that re-running it inserts duplicates, because
-- `products` has no unique key beyond its UUID. Since these migrations are
-- applied by hand out of a SQL editor, a second paste is a realistic accident
-- rather than a hypothetical one — so every insert below is guarded on
-- (name, category). It is idempotent: paste it twice and the second run
-- inserts nothing.

-- ── Indian handmade & handicraft ───────────────────────────────────────────
-- Channapatna lacquerware first, deliberately. It is turned and lacquered on
-- the road between Bengaluru and Mysore — the only two cities this app is live
-- in — so it is the one shelf a national gifting site cannot claim as local.
INSERT INTO products (name, category, occasion, description, price, emoji)
SELECT v.name, v.category, v.occasion, v.description, v.price, v.emoji
FROM (VALUES
  ('Channapatna Wooden Rattle Set',       'Gifts', 'Handmade', 'Lathe-turned, vegetable-dye lacquer. Safe for a baby to chew on.', 649, '🪀'),
  ('Channapatna Spinning Top Pair',        'Gifts', 'Handmade', 'Traditional ivory-wood tops, natural lacquer finish', 449, '🎯'),
  ('Channapatna Wooden Doll',              'Gifts', 'Handmade', 'Hand-turned figure in the Channapatna form, food-safe colour', 899, '🪆'),
  ('Coconut Shell Serving Bowl (Pair)',    'Gifts', 'Handmade', 'Polished shell, food-safe finish. No two are the same shape.', 749, '🥥'),
  ('Coconut Shell Tealight Holders (Set of 4)', 'Gifts', 'Handmade', 'Cut and polished shell halves, brass rims', 599, '🕯️'),
  ('Terracotta Diya Set (Set of 12)',      'Gifts', 'Handmade', 'Hand-thrown, unglazed. Fired in Karnataka.', 399, '🪔'),
  ('Terracotta Water Jug with Lid',        'Gifts', 'Handmade', 'Unglazed clay, keeps water cool without electricity', 899, '🏺'),
  ('Terracotta Planter Trio',              'Gifts', 'Handmade', 'Three hand-thrown pots with drainage, saucers included', 749, '🪴'),
  ('Brass Urli Bowl (8 inch)',             'Gifts', 'Handmade', 'Cast brass floating-flower bowl, hand-polished', 1899, '🪙'),
  ('Brass Diya Lamp with Stand',           'Gifts', 'Handmade', 'Traditional cast brass, weighted base', 1249, '🪔'),
  ('Brass Bell Wind Chime',                'Gifts', 'Handmade', 'Five hand-tuned bells on cotton cord', 849, '🔔'),
  ('Handwoven Jute Gift Basket',           'Gifts', 'Handmade', 'Natural jute, cotton-lined. Reusable as storage.', 549, '🧺'),
  ('Jute Drawstring Pouch (Set of 3)',     'Gifts', 'Handmade', 'Block-printed jute, for the small things in a hamper', 399, '👝'),
  ('Sandalwood Carved Keepsake Box',       'Gifts', 'Handmade', 'Mysore sandalwood, hand-carved lid', 2499, '🪵'),
  ('Bidriware Inlay Coaster Set (Set of 4)', 'Gifts', 'Handmade', 'Blackened alloy with pure silver inlay, from Bidar', 2199, '⚫'),
  ('Kalamkari Hand-Painted Wall Panel',    'Gifts', 'Handmade', 'Natural dyes on cotton, hand-drawn with a kalam', 1799, '🖼️'),
  ('Block-Printed Cotton Table Runner',    'Gifts', 'Handmade', 'Hand-blocked with wooden blocks, natural dye', 999, '🧵'),
  ('Dhokra Brass Figurine',                'Gifts', 'Handmade', 'Lost-wax cast, a 4,000-year-old technique', 1599, '🐘'),
  ('Banana Fibre Woven Tray',              'Gifts', 'Handmade', 'Woven from banana stem fibre, a farm by-product', 649, '🟤'),
  ('Handmade Paper Journal with Cotton Cover', 'Gifts', 'Handmade', 'Cotton-rag paper, upcycled sari binding', 549, '📖')
) AS v(name, category, occasion, description, price, emoji)
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.name = v.name AND p.category = v.category
);

-- ── Eco-friendly & plants ──────────────────────────────────────────────────
-- A living gift is the one thing on this shop that is worth more a year later
-- than on the day it arrives, which is the whole argument for the shelf.
INSERT INTO products (name, category, occasion, description, price, emoji)
SELECT v.name, v.category, v.occasion, v.description, v.price, v.emoji
FROM (VALUES
  ('Money Plant in Ceramic Pot',           'Gifts', 'Eco & Plants', 'Pothos in a glazed pot. Survives a forgetful owner.', 549, '🪴'),
  ('Peace Lily in White Pot',              'Gifts', 'Eco & Plants', 'Flowers indoors in low light, cleans the air', 749, '🌿'),
  ('Lucky Bamboo — Three Stalks',          'Gifts', 'Eco & Plants', 'In water, in a glass vase. Three stalks is for happiness.', 649, '🎍'),
  ('Snake Plant in Terracotta',            'Gifts', 'Eco & Plants', 'Releases oxygen at night. Needs water once a fortnight.', 699, '🌱'),
  ('Jade Plant in Hand-Thrown Pot',        'Gifts', 'Eco & Plants', 'The housewarming plant. Thickens for decades.', 799, '💚'),
  ('Tulsi Plant in Brass-Rimmed Pot',      'Gifts', 'Eco & Plants', 'Holy basil, for the doorway or the pooja corner', 599, '🌿'),
  ('Ficus Bonsai (4 Year)',                'Gifts', 'Eco & Plants', 'Four years of shaping, in a shallow ceramic tray', 2499, '🌳'),
  ('Succulent Trio in Terracotta',         'Gifts', 'Eco & Plants', 'Three varieties, three small pots, one wooden tray', 899, '🌵'),
  ('Areca Palm in Woven Basket',           'Gifts', 'Eco & Plants', 'Floor plant, filters indoor air. Arrives at 2 feet.', 1499, '🌴'),
  ('Air-Purifying Plant Set (Set of 3)',   'Gifts', 'Eco & Plants', 'Snake plant, money plant and peace lily together', 1699, '🪴'),
  ('Seed Paper Greeting Cards (Set of 5)', 'Gifts', 'Eco & Plants', 'Write it, plant it, basil grows out of it', 399, '💌'),
  ('Plantable Seed Rakhi (Set of 2)',      'Gifts', 'Eco & Plants', 'Cotton thread with a seed ball — sow it after the day', 349, '🧿'),
  ('Grow-Your-Own Herb Kit',               'Gifts', 'Eco & Plants', 'Coir pellets, three herb seeds, terracotta pots', 749, '🌱'),
  ('Bamboo Water Bottle (750ml)',          'Gifts', 'Eco & Plants', 'Steel inner, bamboo sleeve. Nothing plastic.', 899, '🎍'),
  ('Bamboo Cutlery Travel Set',            'Gifts', 'Eco & Plants', 'Fork, spoon, knife, straw and a cotton roll', 449, '🥢'),
  ('Beeswax Wrap Set (Set of 3)',          'Gifts', 'Eco & Plants', 'Replaces cling film. Washable, lasts a year.', 649, '🐝'),
  ('Upcycled Sari Gift Wrap (Set of 2)',   'Gifts', 'Eco & Plants', 'Furoshiki-style cloth wrap — the wrapping is the gift', 549, '🎁'),
  ('Cork Yoga Mat',                        'Gifts', 'Eco & Plants', 'Natural cork over natural rubber, no PVC', 2299, '🧘'),
  ('Neem Wood Comb & Brush Set',           'Gifts', 'Eco & Plants', 'Hand-cut neem wood, no plastic, no coating', 449, '🪮'),
  ('Zero-Waste Kitchen Starter Kit',       'Gifts', 'Eco & Plants', 'Coir scrubbers, cotton bags, bamboo brush, beeswax wraps', 1249, '♻️')
) AS v(name, category, occasion, description, price, emoji)
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.name = v.name AND p.category = v.category
);

-- ── After applying this ────────────────────────────────────────────────────
-- Run the photo resolver so each new product gets its own deduplicated
-- photograph instead of falling back to an emoji tile:
--
--   node scripts/resolve-product-images.mjs --only-missing
--
-- and paste the UPDATEs it prints. The two shelf tiles on the home mosaic have
-- their own committed photography already (src/config/generatedShelfPhotos.js),
-- so the mosaic looks finished before this step — but the product grid behind it
-- will not until the resolver has run.
