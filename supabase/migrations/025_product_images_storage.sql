-- ============================================================
-- Migration 025: somewhere to put a real photograph, and permission
-- to put it there.
--
-- Until now nobody could change a product. `products` has carried exactly
-- one policy since migration 009 —
--
--     CREATE POLICY "Public can view products" ON products FOR SELECT USING (TRUE);
--
-- — and no INSERT, UPDATE or DELETE policy for anyone, admins included.
-- With RLS enabled and no permissive policy, every write is denied. Adding
-- a product, correcting a price or replacing a photo has therefore meant
-- hand-writing SQL in the Supabase dashboard, which is why the catalogue
-- has been frozen since it was seeded and why every image is still the
-- category-wide stock photo migration 017 assigned.
--
-- There is also nowhere to upload TO. No storage bucket exists in any
-- migration; `vendor_photos(photo_url, is_cover)` has sat unreferenced
-- since migration 001, and VendorDashboard's "Add photos" button opens
-- WhatsApp. Meanwhile src/config/vendor.js:193-206 sells subscription
-- tiers on "Up to 3 photos" / "Up to 15 photos" / "Unlimited photos".
--
-- This migration fixes both halves for the shop catalogue:
--   1. a public-read `product-images` bucket,
--   2. the first write policies `products` has ever had.
--
-- Scope note: admin-only, deliberately. Letting vendors write to the shop
-- catalogue is a different and much larger trust decision (moderation
-- queue, ownership column, approval state) and `products` has no vendor_id
-- to hang it on. The photo quotas in vendor.js remain unimplemented; that
-- belongs on vendor_photos, not here.
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================

-- ── 1. The bucket ────────────────────────────────────────────────────
-- Public read: these are shop photos on an unauthenticated storefront,
-- and signed URLs on a public catalogue buy nothing but latency and a
-- refresh problem. Writes are locked down separately below.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  5242880,  -- 5 MB. The client compresses to WebP ~200KB before upload
            -- (src/lib/productImages.js); this is the backstop for a
            -- direct API call that skips it.
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 2. Storage policies ──────────────────────────────────────────────
-- Policies have no IF NOT EXISTS (error 42710), so drop before create —
-- the house rule from PROJECT_SUMMARY.
--
-- get_my_role() is the SECURITY DEFINER helper from migration 006. Do NOT
-- inline `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() ...)` here:
-- that form re-enters profiles RLS from inside a policy and recurses
-- infinitely, which is the bug 006 exists to fix.

DROP POLICY IF EXISTS "product images are publicly readable" ON storage.objects;
CREATE POLICY "product images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "admins upload product images" ON storage.objects;
CREATE POLICY "admins upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND get_my_role() IN ('admin', 'event_coordinator')
  );

DROP POLICY IF EXISTS "admins update product images" ON storage.objects;
CREATE POLICY "admins update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND get_my_role() IN ('admin', 'event_coordinator')
  );

DROP POLICY IF EXISTS "admins delete product images" ON storage.objects;
CREATE POLICY "admins delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND get_my_role() IN ('admin', 'event_coordinator')
  );

-- ── 3. Write access to products ──────────────────────────────────────
-- FOR ALL with USING and no WITH CHECK: Postgres reuses USING as the
-- check for INSERT and UPDATE, which is the same shape migration 006 used
-- for admins_all_events and the rest.
--
-- The existing public SELECT policy is left untouched — policies are
-- permissive and OR together, so anonymous shoppers keep reading the
-- catalogue exactly as before.
DROP POLICY IF EXISTS "admins_manage_products" ON products;
CREATE POLICY "admins_manage_products" ON products FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

-- ── 4. Catalogue photo coverage ──────────────────────────────────────
-- Feeds the meter at the top of the admin Catalog tab. A view rather than
-- a client-side count because the client only ever holds one filtered
-- page of products, and "48 of 341" has to be true of the whole shop.
CREATE OR REPLACE VIEW product_image_coverage AS
  SELECT
    category,
    COUNT(*)                                                    AS total,
    COUNT(*) FILTER (WHERE image_source = 'actual')             AS actual_photos,
    COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS missing_photos
  FROM products
  GROUP BY category;

-- A view is owned by its creator and bypasses the caller's RLS by default,
-- so restrict it to authenticated roles rather than exposing per-category
-- catalogue stats on the public storefront.
REVOKE ALL   ON product_image_coverage FROM anon;
GRANT  SELECT ON product_image_coverage TO authenticated;
