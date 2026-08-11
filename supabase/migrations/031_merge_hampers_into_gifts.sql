-- ============================================================
-- Migration 031: Hampers becomes part of Gifts.
--
-- "Gifts" and "Hampers" were two shop categories holding one intent:
-- something wrapped, handed to someone, for an occasion. Nobody shopping for
-- their brother at Rakhi first decides whether the thing they want is
-- technically a hamper — but the shop made them, and the cost of that was
-- paid on every occasion page:
--
--     Diwali      →   5 gifts on one page,  6 hampers on another
--     Wedding     →   6 gifts,              5 hampers
--     Corporate   →   5 gifts,              5 hampers
--     Rakhi       →   6 gifts,              5 hampers
--
-- Every occasion looked half as deep as it actually was, and the customer
-- had to visit two pages to see one shelf. Merged, Diwali has eleven.
--
-- ── Direction of the merge ─────────────────────────────────────────────
-- Hampers move INTO 'Gifts' rather than both moving into a new
-- 'Gifts & Hampers' value. The category string is a routing key
-- (/shop/Gifts), a CHECK constraint value, and a snapshot on every historical
-- order line; inventing a third value would break the first, require editing
-- the second twice, and orphan the third. The customer-facing name is a label
-- in src/config/shop.js and now reads "Gifts & Hampers" — which is the only
-- place the word needed to change.
--
-- ── order_items is deliberately NOT rewritten ──────────────────────────
-- Past order lines keep category = 'Hampers'. Migration 022 put that column
-- there precisely so revenue history stops depending on a live join, and
-- rewriting it would restate what was sold last month to match a decision
-- made this month. Admin revenue-by-category will show 'Hampers' as a
-- closed bucket that stops growing, which is the truth.
--
-- ── The app works before AND after this runs ───────────────────────────
-- Migrations here are applied by hand, so the code cannot assume this one
-- has. The Gifts storefront queries category IN ('Gifts','Hampers') and the
-- customiser registry maps both strings to the same builder. Before this
-- migration that query merges the two shelves at read time; after it, the
-- 'Hampers' half simply matches nothing. Neither state shows a broken page.
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================

BEGIN;

-- The constraint has to come off before the UPDATE can land, and the new one
-- can only be validated once no 'Hampers' rows remain.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

UPDATE products SET category = 'Gifts' WHERE category = 'Hampers';

ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('Cakes','Gifts','Flowers','Party Essentials','Pooja & Essentials'));

COMMIT;

-- Verify — the first should return 0, the second should show Gifts at ~122:
--   SELECT count(*) FROM products WHERE category = 'Hampers';
--   SELECT category, count(*) FROM products GROUP BY category ORDER BY category;
