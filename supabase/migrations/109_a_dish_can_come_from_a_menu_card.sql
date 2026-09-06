-- ════════════════════════════════════════════════════════════════════
-- 109 · A DISH CAN COME FROM A MENU CARD
-- ════════════════════════════════════════════════════════════════════
--
-- catalogue_dishes.source has said 'registry' or 'catalogue' since 105:
-- the 144 hand-written rows, and the rest read out of cuisineMenus.js.
--
-- 202 dishes now come from a third place — the names on the printed set
-- menus that the catalogue did not have. They are what makes
-- catalogue_menu_lines.dish_id reachable at all, and they are worth
-- telling apart: they were classified by hand, one at a time, after
-- keyword rules got eight of them wrong. If that classification ever
-- needs re-reading, `source = 'menu_card'` is how you find them.
--
-- Found by 107 failing to apply, which is the constraint doing its job.
--
-- Applied by hand in the SQL editor, before re-running
-- scripts/apply-catalogue-seed.mjs --apply.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.catalogue_dishes
  DROP CONSTRAINT IF EXISTS catalogue_dishes_source_check;

ALTER TABLE public.catalogue_dishes
  ADD CONSTRAINT catalogue_dishes_source_check
  CHECK (source IN ('registry', 'catalogue', 'menu_card'));

COMMENT ON COLUMN public.catalogue_dishes.source IS
  'Where the row came from: registry (the 144 hand-written in dishRegistry.js), catalogue (cuisineMenus.js), menu_card (named on a printed set menu and hand-classified in menuCardDishes.js).';

COMMIT;

-- ── After the seed is applied ───────────────────────────────────────
--   SELECT source, count(*) FROM public.catalogue_dishes GROUP BY source;
--   expects: registry 144 · catalogue ~897 · menu_card 202
