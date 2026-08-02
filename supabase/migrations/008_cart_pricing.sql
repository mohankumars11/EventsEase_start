-- ============================================================
-- Migration 008: Real pricing + quantity on the cart, so it can
-- actually be checked out instead of being a UI-only stub.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS qty INTEGER NOT NULL DEFAULT 1;
