-- ============================================================
-- Migration 030: give the original six cakes an occasion.
--
-- Migration 009 seeded the shop's first six cakes before `occasion` existed
-- (migration 015 added the column). They have been NULL ever since, which
-- didn't matter while ShopCategory showed an "All" chip beside a handful of
-- occasions — the cakes were one tap away either way.
--
-- It matters now. /shop/Cakes navigates by occasion first: 51 tags grouped
-- into eight life stages, and a NULL tag belongs to none of them. These six
-- are reachable only by scrolling the unfiltered grid or searching by name,
-- and they are among the most-ordered items in the category — a plain
-- chocolate truffle cake is what people actually buy.
--
-- 'Birthday' for five of them is not a guess dressed up as data: these are
-- generic celebration cakes with no occasion of their own, and birthday is
-- both the largest bucket and the one a customer browsing them is most
-- likely to be shopping for. The photo cake goes to 'Photo Cake', which is
-- where migration 015 already files its equivalents.
--
-- Guarded on `occasion IS NULL`, so re-running cannot overwrite a tag an
-- admin has since set by hand.
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================

BEGIN;

UPDATE products SET occasion = 'Birthday'
WHERE category = 'Cakes' AND occasion IS NULL
  AND name IN (
    'Chocolate Truffle Cake (1kg)',
    'Red Velvet Cake (1kg)',
    'Pineapple Cake (1kg)',
    'Butterscotch Cake (1kg)',
    'Cupcake Box (Set of 6)'
  );

UPDATE products SET occasion = 'Photo Cake'
WHERE category = 'Cakes' AND occasion IS NULL
  AND name = 'Photo Cake (1kg)';

COMMIT;

-- Verify — this should return no rows once applied:
--   SELECT name FROM products WHERE category = 'Cakes' AND occasion IS NULL;
