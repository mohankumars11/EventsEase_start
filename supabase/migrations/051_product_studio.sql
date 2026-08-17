-- ============================================================
-- Migration 051: The Product Studio — categories, media, story,
-- FAQs and ratings, all owned by the admin console instead of by
-- a code deploy.
--
-- Run this ONCE in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- Nothing depends on it being applied first — see "Before this is
-- applied" at the bottom.
-- ============================================================
--
-- ── The gap ────────────────────────────────────────────────────────────────
-- `products` (migration 009, extended by 015/016/023/037) holds a name, one
-- category, one price, one description and ONE image. That is a listing, not a
-- product page. Everything that actually sells the thing lived in code or
-- nowhere at all:
--
--   · the shelves themselves    — hard-coded in src/config/shop.js AND pinned
--                                 by a CHECK constraint, so adding a category
--                                 was a code change and a migration
--   · more than one photograph  — impossible; `image_url` is singular
--   · video                     — no column, and the bucket rejects video/*
--   · the questions people ask  — nowhere
--   · why the thing is worth it — nowhere
--   · a rating before launch    — nowhere (see the note on seeding below)
--
-- This migration gives each of those a home the admin console can write to,
-- and leaves `products` itself as the one row everything hangs off.
--
-- ── Who this is for ────────────────────────────────────────────────────────
-- The person running this shop does not write code and is not going to open a
-- SQL editor twice a week. Every shape below is chosen so the console can
-- offer it as a form and as a BULK paste — one row per line, not one product
-- per afternoon. That is why the scoping columns are nullable and why nothing
-- here requires a second insert to be valid on its own.

-- ============================================================
-- 1. Shelves the admin can actually add
-- ============================================================
--
-- `products.category` is a TEXT column pinned by `products_category_check`,
-- last rewritten in migration 048. That CHECK is the reason "let the admin add
-- a category" was never a small change: the console could grow a form, and the
-- database would still refuse the first product filed under the new shelf.
--
-- So the list becomes a table. `id` is the literal string already stored in
-- `products.category`, `order_items.category` (migration 022's snapshot) and
-- every route — 'Cakes', 'Gifts', 'Heritage & Crafts'. Keeping the id as the
-- display-shaped string is deliberate: a numeric or slug id would orphan every
-- historical order line and every bookmarked /shop/:category URL.
CREATE TABLE IF NOT EXISTS shop_categories (
  id             TEXT        PRIMARY KEY,
  label          TEXT        NOT NULL,
  emoji          TEXT,
  tagline        TEXT,
  blurb          TEXT,
  hero_image_url TEXT,
  -- 'shop' is a shelf in the storefront. 'celebration' is a shelf on the
  -- planning side — the same editor, a different surface, so the team has one
  -- place to answer "what do we sell" rather than two consoles to remember.
  kind           TEXT        NOT NULL DEFAULT 'shop'
                               CHECK (kind IN ('shop', 'celebration')),
  sort_order     INTEGER     NOT NULL DEFAULT 100,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed from what is on the shelves today, so the table is never emptier than
-- the shop. Sourced from `products` itself rather than typed out, which means
-- a category that only exists in data (and not in config/shop.js) is captured
-- too instead of silently dropping off the new list.
INSERT INTO shop_categories (id, label, emoji, sort_order)
SELECT DISTINCT category, category, '🛍️', 100
FROM products
WHERE category IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- The six the storefront knows by name, with the copy config/shop.js carries.
-- ON CONFLICT DO UPDATE touches only the presentational columns: if this is
-- re-run after somebody has reordered or retired a shelf in the console, their
-- sort order and their on/off switch survive. A sync that eats your work is a
-- button nobody presses twice (the rule contentStudio.js already follows).
INSERT INTO shop_categories (id, label, emoji, tagline, sort_order) VALUES
  ('Cakes',              'Cakes',              '🎂', 'Made to order for every occasion — pick your size, flavour and extras', 10),
  ('Gifts',              'Gifts & Hampers',    '🎁', 'One gift or a whole hamper — wrapped, carded and delivered',            20),
  ('Flowers',            'Flowers',            '💐', 'Fresh bouquets, delivered same-day',                                    30),
  ('Party Essentials',   'Party Essentials',   '🎈', 'Balloons, banners & party supplies',                                    40),
  ('Pooja & Essentials', 'Pooja & Essentials', '🪔', 'Diyas, samagri, flowers & pandit booking',                              50),
  ('Heritage & Crafts',  'Heritage & Crafts',  '🪆', 'Mysore silk, rare handloom weaves, carvings and the Mysuru specialities', 60)
ON CONFLICT (id) DO UPDATE
  SET label   = EXCLUDED.label,
      emoji   = COALESCE(shop_categories.emoji, EXCLUDED.emoji),
      tagline = COALESCE(shop_categories.tagline, EXCLUDED.tagline);

-- 'Hampers' is a retired shelf (migration 031 merged it into Gifts) but its
-- rows still exist and CATEGORY_ALIASES still reads them. It is registered and
-- switched off, rather than absent: absent would make it invisible to the
-- console while remaining visible in an order history.
UPDATE shop_categories SET is_active = FALSE, sort_order = 900
WHERE id = 'Hampers';

-- ── And now the constraint goes ────────────────────────────────────────────
-- Dropped, not widened. A CHECK listing the categories has to be rewritten by
-- hand for every shelf the admin adds, which is precisely the deploy this
-- migration exists to remove. `shop_categories` is the list now, the console
-- writes the column from a picker fed by it, and the storefront renders what
-- it finds. A foreign key was considered and rejected for the same reason
-- migration 022 snapshots the category onto the order line: retiring a shelf
-- must never be able to fail because five hundred old orders point at it.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

ALTER TABLE shop_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view categories" ON shop_categories;
CREATE POLICY "Public can view categories"
  ON shop_categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins manage categories" ON shop_categories;
CREATE POLICY "Admins manage categories"
  ON shop_categories FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));

-- ============================================================
-- 2. More than one photograph, and video
-- ============================================================
--
-- `products.image_url` stays exactly where it is and keeps meaning what it
-- means: the ONE image the grid tile and every card renders. This table is the
-- gallery behind it — the wrapped box, the detail of the weave, the clip of
-- the hamper being opened.
--
-- Deliberately not a JSONB array on `products`: an array cannot be reordered
-- by a single UPDATE, cannot be indexed, and turns "retire this one photo"
-- into a read-modify-write that two admins on two phones will lose.
CREATE TABLE IF NOT EXISTS product_media (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind        TEXT        NOT NULL DEFAULT 'image'
                            CHECK (kind IN ('image', 'video')),
  url         TEXT        NOT NULL,
  -- A video with no poster is a black rectangle until it buffers. The studio
  -- grabs a frame on upload and puts it here.
  poster_url  TEXT,
  alt         TEXT,
  caption     TEXT,
  -- Where this came from, and it is shown to the customer. Same honesty rule
  -- as `products.image_source` (migration 023): 'actual' is a photograph of
  -- the thing that will arrive, 'stock' is a licensed lookalike, 'ai' is
  -- generated, 'vendor' came from the partner who makes it. A generated clip
  -- rendering unlabelled beside a real one is the failure this prevents.
  source      TEXT        NOT NULL DEFAULT 'actual'
                            CHECK (source IN ('actual', 'stock', 'ai', 'vendor', 'link')),
  credit      TEXT,
  duration_s  NUMERIC,
  sort_order  INTEGER     NOT NULL DEFAULT 100,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every read of this table is "the gallery for one product, in order".
CREATE INDEX IF NOT EXISTS idx_product_media_product
  ON product_media (product_id, sort_order) WHERE is_active;

ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view product media" ON product_media;
CREATE POLICY "Public can view product media"
  ON product_media FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "Admins manage product media" ON product_media;
CREATE POLICY "Admins manage product media"
  ON product_media FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));

-- ============================================================
-- 3. The questions people ask
-- ============================================================
--
-- `product_id` and `category` are both nullable, and that is the whole design.
-- "Is the cake eggless?" is true of every cake and should be written once on
-- the shelf; "does this silk come with a blouse piece?" belongs to one product.
-- A row with both NULL is a shop-wide answer — delivery, returns, payment.
-- The reader unions all three, most specific last.
CREATE TABLE IF NOT EXISTS product_faqs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        REFERENCES products(id) ON DELETE CASCADE,
  category    TEXT,
  question    TEXT        NOT NULL,
  answer      TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 100,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_faqs_product
  ON product_faqs (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_faqs_category
  ON product_faqs (category) WHERE category IS NOT NULL;

ALTER TABLE product_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view faqs" ON product_faqs;
CREATE POLICY "Public can view faqs"
  ON product_faqs FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "Admins manage faqs" ON product_faqs;
CREATE POLICY "Admins manage faqs"
  ON product_faqs FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));

-- The shop-wide answers, seeded once. Written against what is actually true
-- (config/shop.js FULFILMENT): sourced per order, delivered by Sambramo, one
-- number to call. Only inserted when the shop-wide set is empty, so a re-run
-- never duplicates them and never overwrites an edited answer.
INSERT INTO product_faqs (product_id, category, question, answer, sort_order)
SELECT NULL, NULL, v.question, v.answer, v.sort_order
FROM (VALUES
  ('Who actually makes and delivers my order?',
   'Your order is made by one of our partner kitchens, decorators or suppliers, and delivered by Sambramo. We handle the order, the delivery and anything that goes wrong with it — one number to call, whoever made it.',
   10),
  ('How fast can you deliver?',
   'Same-day across Bengaluru and Mysuru for most items when ordered before the cut-off. Anything made to order shows its own preparation time on the product page.',
   20),
  ('Can I change the delivery date or address after ordering?',
   'Yes, until the order moves to dispatched. Open it under Track and use the order journey, or call us.',
   30)
) AS v(question, answer, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM product_faqs WHERE product_id IS NULL AND category IS NULL
);

-- ============================================================
-- 4. The story — what a product page is FOR
-- ============================================================
--
-- A photograph and a price tell somebody what the thing is. They do not tell
-- them what it is like to receive it: the box arriving wrapped, the face of
-- the person it was for, that it can be there this evening. Those are three
-- separate beats and they do not fit in a description field — they are slides.
--
-- Scoped exactly like the FAQs, and for the same reason. The packaging story
-- is true of every hamper on the shelf and should be written once; a
-- particular Mysore silk deserves its own. Product beats category beats the
-- shop-wide default.
--
-- `scene` names the beat so the console can lay the editor out as a storyboard
-- with labelled slots, rather than an anonymous list somebody has to keep in
-- their head:
--   craft     — how it is made, by whom
--   packaging — how it arrives, wrapped
--   moment    — the reaction it is bought for
--   speed     — how fast it can be there
--   promise   — what we do if it goes wrong
--   custom    — anything else the admin wants to say
CREATE TABLE IF NOT EXISTS product_story_slides (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        REFERENCES products(id) ON DELETE CASCADE,
  category    TEXT,
  scene       TEXT        NOT NULL DEFAULT 'custom'
                            CHECK (scene IN ('craft','packaging','moment','speed','promise','custom')),
  kicker      TEXT,
  title       TEXT        NOT NULL,
  body        TEXT,
  image_url   TEXT,
  video_url   TEXT,
  icon        TEXT,
  -- One of the named accents the storefront knows how to paint. Free text
  -- would put an arbitrary hex into a palette that config/dataviz.js exists to
  -- keep honest.
  accent      TEXT        NOT NULL DEFAULT 'saffron'
                            CHECK (accent IN ('saffron','plum','emerald','rose','ink')),
  sort_order  INTEGER     NOT NULL DEFAULT 100,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_product
  ON product_story_slides (product_id, sort_order) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_story_category
  ON product_story_slides (category, sort_order) WHERE category IS NOT NULL;

ALTER TABLE product_story_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view story slides" ON product_story_slides;
CREATE POLICY "Public can view story slides"
  ON product_story_slides FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "Admins manage story slides" ON product_story_slides;
CREATE POLICY "Admins manage story slides"
  ON product_story_slides FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));

-- The shop-wide default story. Every product inherits these three beats from
-- day one, so a brand-new product is never a bare price — and an admin who
-- wants to say something sharper overrides them per shelf or per product.
INSERT INTO product_story_slides (product_id, category, scene, kicker, title, body, icon, accent, sort_order)
SELECT NULL, NULL, v.scene, v.kicker, v.title, v.body, v.icon, v.accent, v.sort_order
FROM (VALUES
  ('packaging', 'Before it leaves us',
   'Wrapped like it matters',
   'Every order is packed by hand — the box, the ribbon, the card in your handwriting. Nothing goes out in a plain carton, because the first thing they see is the wrapping.',
   '🎀', 'plum', 10),
  ('moment', 'The part that is not on the invoice',
   'You are not buying a cake',
   'You are buying the ten seconds after the door opens. We plan backwards from that moment — the timing, the note, the way it is handed over.',
   '💛', 'rose', 20),
  ('speed', 'Same city, same day',
   'Ordered this morning, there this evening',
   'Bengaluru and Mysuru, within hours. Nothing sits in a warehouse — it is made for your order and driven to the door.',
   '⚡', 'saffron', 30)
) AS v(scene, kicker, title, body, icon, accent, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM product_story_slides WHERE product_id IS NULL AND category IS NULL
);

-- ============================================================
-- 5. The merchandising fields on the product itself
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS subtitle   TEXT;
-- Short bullets under the price — "Serves 8–10", "100% eggless", "Hand-woven".
-- JSONB array of strings.
ALTER TABLE products ADD COLUMN IF NOT EXISTS highlights JSONB NOT NULL DEFAULT '[]'::jsonb;
-- The spec table. An object of label → value, so a cake carries weight and
-- flavour while a silk carries loom, district and thread count, without either
-- needing its own column.
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs      JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge      TEXT;
-- The struck-through price. Nullable, and it means nothing when null rather
-- than defaulting to the price and printing a 0% saving on every tile.
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp        NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS same_day   BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS prep_hours INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 100;

-- ── Ratings before there are customers ─────────────────────────────────────
-- Sambramo is pre-launch. `review_aggregates` (migration 012) is correct and
-- empty, and an empty rating on every product reads as "nobody liked this"
-- rather than "nobody has bought this yet".
--
-- These two columns are a LAUNCH BASELINE, and they are kept in their own
-- columns rather than written as rows into `reviews_catalog` on purpose. A
-- fabricated row there is indistinguishable from a customer's — it would carry
-- a name, a date and a comment, and there would afterwards be no way to tell
-- it apart, including for us. Here it is structurally separate, reported
-- separately by the view below, and labelled by the storefront.
--
-- The moment one real review exists, it wins: `product_ratings` stops
-- reporting the seed entirely. The baseline is a starting position, never an
-- average a real rating gets quietly blended into.
ALTER TABLE products ADD COLUMN IF NOT EXISTS seed_rating       NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seed_rating_count INTEGER;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_seed_rating_check;
ALTER TABLE products ADD  CONSTRAINT products_seed_rating_check
  CHECK (seed_rating IS NULL OR (seed_rating >= 1 AND seed_rating <= 5));

COMMENT ON COLUMN products.seed_rating IS
  'Launch baseline, shown only while a product has no real reviews. Never blended with a real average — see the product_ratings view. Rendered as an editorial rating, not as a customer review count.';

CREATE INDEX IF NOT EXISTS idx_products_category_sort
  ON products (category, sort_order);

-- ── One rating per product, and where it came from ─────────────────────────
-- The storefront asks "what do I put next to this product". This answers it
-- once, with the provenance attached, so no screen has to re-derive the
-- precedence rule and get it subtly different.
CREATE OR REPLACE VIEW product_ratings AS
SELECT
  p.id                                   AS product_id,
  COALESCE(a.avg_rating, p.seed_rating)  AS rating,
  COALESCE(a.review_count, 0)            AS review_count,
  CASE WHEN COALESCE(a.review_count, 0) > 0 THEN 'customer'
       WHEN p.seed_rating IS NOT NULL         THEN 'editorial'
       ELSE 'none'
  END                                    AS rating_source
FROM products p
LEFT JOIN review_aggregates a
  ON a.subject_type = 'product' AND a.subject_id = p.id::text;

-- ============================================================
-- 6. The bucket that takes video
-- ============================================================
-- `product-images` (migration 025) caps at 5 MB and its allowed_mime_types
-- rejects video/*. Rather than loosen it — a 5 MB cap is right for a photo and
-- loosening it would quietly let 4 MB phone JPEGs back onto the grid — video
-- gets its own bucket with its own limit.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media',
  'product-media',
  TRUE,
  52428800,  -- 50 MB. A 15-second phone clip at 1080p is ~25 MB; the studio
             -- warns above 20 MB, because a shopper on a Bengaluru mobile
             -- connection has to download whatever gets past this.
  ARRAY['video/mp4', 'video/webm', 'video/quicktime',
        'image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies have no IF NOT EXISTS (error 42710), so drop before create — the
-- house rule from PROJECT_SUMMARY. get_my_role() is the SECURITY DEFINER
-- helper from migration 006; do NOT inline a profiles subquery here, that is
-- the infinite recursion 006 exists to fix.
DROP POLICY IF EXISTS "product media is publicly readable" ON storage.objects;
CREATE POLICY "product media is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-media');

DROP POLICY IF EXISTS "admins upload product media" ON storage.objects;
CREATE POLICY "admins upload product media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-media'
    AND get_my_role() IN ('admin', 'event_coordinator')
  );

DROP POLICY IF EXISTS "admins update product media" ON storage.objects;
CREATE POLICY "admins update product media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-media' AND get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins delete product media" ON storage.objects;
CREATE POLICY "admins delete product media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-media' AND get_my_role() IN ('admin', 'event_coordinator'));


-- ── Before this is applied ─────────────────────────────────────────────────
-- Nothing breaks. `src/lib/productStudio.js` treats a missing table (42P01) and
-- a missing column (42703) as "this feature is not switched on yet" and returns
-- an empty set, so:
--
--   · the storefront renders exactly as it does today — one image, no gallery,
--     no story, no FAQ block, because those sections only appear when there is
--     something in them;
--   · the Product Studio opens, loads the products, and shows a banner naming
--     this file instead of an error;
--   · the category picker falls back to SHOP_CATEGORIES in config/shop.js.
--
-- After applying, the Studio's header switches from "Migration 051 pending" to
-- the live counts. Nothing else is required.
