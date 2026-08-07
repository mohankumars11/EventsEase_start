-- ============================================================
-- Migration 022: Snapshot category/occasion onto order_items.
--
-- Revenue-by-category in the admin dashboard needs a trustworthy history,
-- not a live join to `products` — product_id is nullable and a removed
-- or re-categorized product would silently distort past revenue. This
-- captures category/occasion on the order line at purchase time instead,
-- same reasoning that led migration 019 to snapshot other order-time state.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS occasion TEXT;

-- Backfill existing rows from the current catalog where the product still exists.
UPDATE order_items oi SET category = p.category, occasion = p.occasion
FROM products p
WHERE oi.product_id = p.id AND oi.category IS NULL;
