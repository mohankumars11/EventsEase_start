-- ============================================================
-- Migration 018: Complimentary (free gift) flag on cart packages.
--
-- Gift hampers no longer have their own "Add to Cart" button — they're
-- auto-attached (or, for events with multiple tiers, hand-picked as a
-- free gift) alongside a real booking, at zero cost. This column marks
-- which cart_packages rows are that kind of freebie so totals can skip
-- them without ever touching the shared price_min/price_max catalog data.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE cart_packages ADD COLUMN IF NOT EXISTS complimentary BOOLEAN NOT NULL DEFAULT false;
