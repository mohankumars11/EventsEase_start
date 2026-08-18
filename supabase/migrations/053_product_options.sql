-- ============================================================
-- Migration 053: Customisations the admin defines, per product
-- or per shelf, without a code deploy.
--
-- Run this ONCE in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- Nothing depends on it being applied first — see "Before this is
-- applied" at the bottom.
-- ============================================================
--
-- ── The gap ────────────────────────────────────────────────────────────────
-- "What can be changed about this product" has always been a JavaScript file.
-- `src/config/customizers/` holds one builder per category — cakes get weight,
-- flavour, egg preference and a message; hampers get a tier and a wrap; pooja
-- kits get a tradition and a muhurat. They are good, and they are the reason
-- an order reaches the kitchen as an instruction rather than a name.
--
-- But there are exactly four of them, they are keyed by category, and adding a
-- fifth is a deploy. Which means:
--
--   · a shelf the admin created in the Product Studio has NO customisation at
--     all — 'Heritage & Crafts' is the shop's differentiator and a Mysore silk
--     goes into the cart with no blouse-piece question, no fall-and-pico, no
--     gift-box choice, because nobody wrote a builder for it;
--   · one unusual product inside an ordinary shelf cannot have its own
--     question — every cake gets the cake sheet, identical, forever;
--   · the price of an add-on is a number in a file, so changing ₹149 to ₹179
--     is a code change.
--
-- ── The shape, and why it is this shape ────────────────────────────────────
-- Two tables, not a JSONB blob on `products`. The blob was considered and
-- rejected for the same reason migration 051 rejected it for the gallery: an
-- array inside a row cannot be reordered by one UPDATE, cannot be queried
-- ("which products offer gift wrap?"), and turns "raise the price of the
-- premium wrap" into a read-modify-write that two admins on two phones lose.
--
-- The scoping is copied deliberately from `product_faqs` and
-- `product_story_slides` in migration 051, because it is the same problem and
-- an admin should not have to learn a second rule:
--
--   product_id set   → this one product
--   category set     → every product on that shelf
--   both NULL        → every product in the shop
--
-- Most specific wins, and a more specific group REPLACES a broader one with
-- the same `key` rather than rendering beside it — otherwise "Gift wrap"
-- defined shop-wide and refined for hampers would show the customer two gift
-- wrap questions.

-- ============================================================
-- 1. The question
-- ============================================================
CREATE TABLE IF NOT EXISTS product_option_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        REFERENCES products(id) ON DELETE CASCADE,
  category    TEXT,

  -- The stable identity of this question, and it is load-bearing.
  --
  -- `selectionSignature` in config/customizers/engine.js hashes the group keys
  -- to decide whether two configured items are the same cart line. If the key
  -- were the UUID, editing a group's label would change nothing — but deleting
  -- and re-adding it would orphan every cart in every browser holding the old
  -- id. A slug the admin controls ('wrap', 'size') is also what lets a
  -- product-level group override the shelf-level one it refines.
  key         TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  help        TEXT,

  --   single  radio; exactly one answer, always has a default
  --   multi   checkboxes, capped by max_select; may be empty
  --   text    free text, capped by max_length
  --   info    no input at all — a fact the customer needs before choosing
  type        TEXT        NOT NULL DEFAULT 'single'
                            CHECK (type IN ('single', 'multi', 'text', 'info')),

  -- How the answer is written into the order note. Same four roles the engine
  -- already understands, so nothing downstream needs to learn a new word:
  --   spec      part of what the item IS — joined into one line, always recorded
  --   addon     an extra, itemised by name
  --   schedule  when it arrives; recorded last, on its own line
  --   note      free text, quoted first — the thing most often got wrong
  role        TEXT        NOT NULL DEFAULT 'addon'
                            CHECK (role IN ('spec', 'addon', 'schedule', 'note')),

  max_select  INTEGER,
  max_length  INTEGER,
  -- For a 'multi', "at least one". A 'single' always has an answer by
  -- construction, so this is meaningless there and the storefront ignores it.
  required    BOOLEAN     NOT NULL DEFAULT FALSE,

  sort_order  INTEGER     NOT NULL DEFAULT 100,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One group per key per scope. Without this an admin who taps Save twice on a
-- slow connection gets the customer two identical questions, and the
-- override rule ("the product's 'wrap' replaces the shelf's 'wrap'") stops
-- being well defined. Three partial indexes rather than one constraint,
-- because NULL never equals NULL in a UNIQUE and all three scopes are real.
CREATE UNIQUE INDEX IF NOT EXISTS uq_option_group_product
  ON product_option_groups (product_id, key) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_option_group_category
  ON product_option_groups (category, key) WHERE product_id IS NULL AND category IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_option_group_global
  ON product_option_groups (key) WHERE product_id IS NULL AND category IS NULL;

CREATE INDEX IF NOT EXISTS idx_option_groups_product
  ON product_option_groups (product_id, sort_order) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_option_groups_category
  ON product_option_groups (category, sort_order) WHERE category IS NOT NULL;

-- ============================================================
-- 2. The answers to it
-- ============================================================
CREATE TABLE IF NOT EXISTS product_option_values (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES product_option_groups(id) ON DELETE CASCADE,
  key         TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  -- The line under the label. "Larger portions, better brands, gift box" is
  -- what makes a customer pick Premium; the word "Premium" on its own is not.
  note        TEXT,

  -- Added to the base price.
  price       NUMERIC     NOT NULL DEFAULT 0,

  -- REPLACES the base price instead of adding to it, and this distinction is
  -- the one that costs money when it is wrong. A cake's catalogue price is
  -- already the price of a specific weight, so 2 kg must be `absolute` — as an
  -- add-on it would charge base + 2kg. The engine has always supported this;
  -- until now only a code builder could express it.
  absolute    NUMERIC,

  is_default  BOOLEAN     NOT NULL DEFAULT FALSE,
  image_url   TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 100,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_option_value_key
  ON product_option_values (group_id, key);
CREATE INDEX IF NOT EXISTS idx_option_values_group
  ON product_option_values (group_id, sort_order) WHERE is_active;

-- ============================================================
-- 3. Row level security
-- ============================================================
-- Readable by anyone, because the storefront has to price the sheet before
-- there is a session. Written only by staff. Policies are dropped before
-- create — they have no IF NOT EXISTS (42710) — and admin checks go through
-- the get_my_role() SECURITY DEFINER helper from migration 006, never an
-- inline profiles subquery, which recurses.
ALTER TABLE product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view option groups" ON product_option_groups;
CREATE POLICY "Public can view option groups"
  ON product_option_groups FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "Admins manage option groups" ON product_option_groups;
CREATE POLICY "Admins manage option groups"
  ON product_option_groups FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "Public can view option values" ON product_option_values;
CREATE POLICY "Public can view option values"
  ON product_option_values FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "Admins manage option values" ON product_option_values;
CREATE POLICY "Admins manage option values"
  ON product_option_values FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));

-- ============================================================
-- 4. One read for the whole storefront
-- ============================================================
-- The customiser needs "every active question, with its answers, and the scope
-- it came from" — and it needs it before the customer taps ADD, because
-- whether the sheet opens at all depends on whether there are any. One view
-- keeps that a single round trip instead of a query per product.
--
-- `scope_rank` is the precedence rule, computed here so no screen re-derives
-- it: 2 beats 1 beats 0, most specific last.
CREATE OR REPLACE VIEW product_options_resolved AS
SELECT
  g.id,
  g.product_id,
  g.category,
  g.key,
  g.label,
  g.help,
  g.type,
  g.role,
  g.max_select,
  g.max_length,
  g.required,
  g.sort_order,
  CASE WHEN g.product_id IS NOT NULL THEN 2
       WHEN g.category   IS NOT NULL THEN 1
       ELSE 0 END AS scope_rank,
  COALESCE(
    (SELECT jsonb_agg(
              jsonb_build_object(
                'id',      v.key,
                'label',   v.label,
                'note',    v.note,
                'price',   v.price,
                'absolute', v.absolute,
                'default', v.is_default,
                'image_url', v.image_url
              ) ORDER BY v.sort_order, v.label)
     FROM product_option_values v
     WHERE v.group_id = g.id AND v.is_active),
    '[]'::jsonb
  ) AS options
FROM product_option_groups g
WHERE g.is_active;


-- ── Before this is applied ─────────────────────────────────────────────────
-- Nothing breaks, and nothing changes. `src/lib/productOptions.js` treats a
-- missing table (42P01 / PGRST205) as "this feature is not switched on yet"
-- and returns an empty catalogue, so:
--
--   · every product customises exactly as it does today, from the four code
--     builders in src/config/customizers/;
--   · the Product Studio's Options tab opens and shows a banner naming this
--     file rather than an error;
--   · no cart line, no order note and no price changes, because an empty
--     catalogue merges into the code groups as a no-op.
--
-- After applying, the Options tab switches from "Migration 053 pending" to the
-- editor, and anything defined there appears in the customer's sheet on the
-- next page load. Nothing else is required.
