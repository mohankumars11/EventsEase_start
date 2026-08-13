-- ============================================================
-- Migration 037: an editable event-service catalogue, and a way to
-- retire a product without deleting its order history.
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- ── Why ──────────────────────────────────────────────────────────────
-- Two halves of the business are editable in very different ways.
--
-- The SHOP became editable in migration 025: admins got write policies on
-- `products` and a `product-images` bucket, so a price or a photo can be
-- fixed from the admin Catalog tab.
--
-- EVENT SERVICES never did. All thirty-nine of them live in
-- src/data/servicePricing.js as a JavaScript literal — which means adding
-- "Mehendi artist" or putting a real photograph on "Photography" is a code
-- change, a build and a deploy. That is the wrong shape for a catalogue the
-- founder wants to extend on a Tuesday afternoon.
--
-- This migration gives services the same footing the shop already has:
-- a row per service, an image URL, and admin write access.
--
-- ── The seed is deliberately NOT in this file ────────────────────────
-- servicePricing.js stays the authority for the built-in thirty-nine: it
-- carries the pricing UNIT (fixed / per_guest / per_unit) and the `scales`
-- flag that the quote engine computes with, and duplicating that into SQL
-- would create two sources for one number — exactly the drift PROJECT_SUMMARY
-- calls out for the brand strings. Instead the admin Services screen has a
-- "Sync built-in services" action that upserts them by slug, so the rows are
-- created from the same literal the quote engine reads, and re-running it
-- after a code change is idempotent.
--
-- So: a fresh database gets an EMPTY service_catalog, and that is correct.
-- The admin screen says so and offers the button.
--
-- ── Images reuse the existing bucket ─────────────────────────────────
-- No new storage bucket. The `product-images` bucket from migration 025 is
-- already public-read with admin-only writes, and its policies key on
-- `bucket_id` alone, so a `services/` path prefix inherits them unchanged.
-- One bucket, one set of policies, one thing to get wrong instead of two.
-- ============================================================


-- ── 1. The service catalogue ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Matches servicePricing.js SERVICE_BY_ID for the built-in thirty-nine, so
  -- the sync can upsert instead of duplicating, and so anything that already
  -- refers to a service by its string id keeps working. Custom services get a
  -- slug generated from their name.
  slug          TEXT NOT NULL UNIQUE,

  name          TEXT NOT NULL,
  emoji         TEXT,

  -- The servicePricing group id ('core', 'memories', 'decor', …). Free text
  -- rather than a CHECK: the founder adding a service should not be blocked
  -- by an enum that needs a migration to extend.
  group_id      TEXT,
  description   TEXT,

  -- Pricing. `unit` and `scales` mirror servicePricing.js so a synced row can
  -- round-trip; `base` is the quoted rate for that unit. A custom service that
  -- has no engine behind it can leave these NULL and carry price_hint alone.
  unit          TEXT CHECK (unit IN ('fixed', 'per_guest', 'per_unit')),
  base          NUMERIC CHECK (base IS NULL OR base >= 0),
  scales        BOOLEAN NOT NULL DEFAULT FALSE,
  price_hint    TEXT,

  -- The photograph. Same three-state honesty model the shop uses
  -- (migration 023): 'stock' is a licensed lookalike and the UI badges it as
  -- representative; 'actual' is a photograph of work actually delivered.
  image_url        TEXT,
  image_alt        TEXT,
  image_source     TEXT NOT NULL DEFAULT 'stock'
                     CHECK (image_source IN ('stock', 'actual')),
  image_updated_at TIMESTAMPTZ,

  -- 'seed' rows came from servicePricing.js and the sync may update them;
  -- 'custom' rows were created here and the sync must never touch them.
  source        TEXT NOT NULL DEFAULT 'custom'
                  CHECK (source IN ('seed', 'custom')),

  active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 100,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_catalog_group
  ON service_catalog (group_id, sort_order);

DROP TRIGGER IF EXISTS trg_service_catalog_updated_at ON service_catalog;
CREATE TRIGGER trg_service_catalog_updated_at
  BEFORE UPDATE ON service_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. RLS ───────────────────────────────────────────────────────────
-- Public reads ACTIVE rows only: this is a storefront catalogue and a
-- retired service should stop being visible the moment it is retired, not
-- at the next deploy. Admins read and write everything.
--
-- get_my_role() is the SECURITY DEFINER helper from migration 006 — never
-- inline an EXISTS against profiles here, which re-enters profiles RLS from
-- inside a policy and recurses (the bug 006 exists to fix).
--
-- CREATE POLICY has no IF NOT EXISTS (error 42710), so each is paired with
-- DROP POLICY IF EXISTS — the house rule from PROJECT_SUMMARY.

ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_reads_active_services" ON service_catalog;
CREATE POLICY "public_reads_active_services" ON service_catalog FOR SELECT
  USING (active = TRUE);

DROP POLICY IF EXISTS "admins_manage_service_catalog" ON service_catalog;
CREATE POLICY "admins_manage_service_catalog" ON service_catalog FOR ALL
  USING      (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));


-- ── 3. Retiring a product without losing its history ─────────────────
-- The admin Catalog tab can create products now, which immediately raises
-- the opposite question: how do you take one down?
--
-- DELETE is the wrong answer. `order_items.product_id` references
-- `products(id)` with no ON DELETE clause, so deleting a sold product is
-- either refused by the foreign key or — worse, if that reference is ever
-- relaxed — quietly detaches the line from the catalogue. Migration 022
-- snapshots category and occasion onto the order line precisely so past
-- revenue survives catalogue changes; a flag keeps that intact.
--
-- NOT NULL DEFAULT TRUE so every existing row is on sale, which is what
-- they are today. Storefront listings filter this out client-side (the
-- queries all `select('*')`), so shipping this column before or after the
-- deploy is safe in either order.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_products_active_category
  ON products (category) WHERE is_active;


-- ── 4. Product coverage view, extended ───────────────────────────────
-- The admin Catalog meter reads this. Adding the active/retired split here
-- rather than counting client-side for the same reason 025 gave: the client
-- only ever holds one filtered page, and "48 of 341" has to be true of the
-- whole shop.
CREATE OR REPLACE VIEW product_image_coverage AS
  SELECT
    category,
    COUNT(*)                                                    AS total,
    COUNT(*) FILTER (WHERE image_source = 'actual')             AS actual_photos,
    COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS missing_photos,
    COUNT(*) FILTER (WHERE is_active)                           AS active_products
  FROM products
  GROUP BY category;

REVOKE ALL    ON product_image_coverage FROM anon;
GRANT  SELECT ON product_image_coverage TO authenticated;
