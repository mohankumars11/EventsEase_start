-- ============================================================
-- Migration 040: everything a customer can see becomes editable.
--
-- Run this in: Supabase Dashboard → SQL Editor, AFTER 037. Safe to re-run.
--
-- ── The problem 037 only half-solved ─────────────────────────────────
-- 037 gave EVENT SERVICES a table, so the thirty-nine of them could be
-- photographed, rewritten, retired and extended from the admin console.
-- That fixed one shelf and left every other one where it was: in a
-- JavaScript literal, changeable only by a developer with a deploy.
--
-- The ones still stuck, and what each of them is:
--
--   decor themes      89 setups (griha pravesh, mandap, haldi…)  decorThemes.js
--   decor levels      the tiers of decoration                    decorPackages.js
--   cuisines          16 menus, each with its dish lists         cuisineMenus.js
--   celebration tiers the eight scales the whole ladder is built on
--                                                                celebrationTiers.js
--   festivals         the festival landing pages                 festivals.js
--   offers            the coupons and promises on the offers rail
--                                                                celebrationOffers.js
--
-- The founder's ask is simply that all of it behaves like the shop does:
-- add, edit, photograph, reorder, retire.
--
-- ── One table, a `kind` column — not six tables ──────────────────────
-- Six near-identical tables would mean six sets of RLS policies, six
-- image-upload paths and six admin screens that drift apart. Every one of
-- these things is the same shape: a name, an emoji, a blurb, a picture, a
-- price or two, an order, and an on/off. The parts that AREN'T the same —
-- a cuisine's course lists, a tier's guest range, a festival's gradient —
-- go in `payload` JSONB, which is exactly the case JSONB is for: fields
-- that vary by row type and that nothing queries on.
--
-- So `service_catalog` grows a `kind` and becomes the content table. It
-- keeps its name because the table already exists on any database that
-- ran 037, and renaming it would break that deployment for no gain.
-- ============================================================

BEGIN;

-- ── 1. The discriminator ─────────────────────────────────────────────
-- DEFAULT 'service' so every row 037 created keeps working untouched, and
-- so the existing Event Services screen needs no data migration at all.
ALTER TABLE service_catalog ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'service';

-- Free text rather than a CHECK, on purpose. A CHECK here would mean that
-- adding a new kind of content — "venue styles", say — needs a migration
-- before anyone can try it, which is the exact friction this whole file
-- exists to remove. The client owns the registry (lib/contentStudio.js).
COMMENT ON COLUMN service_catalog.kind IS
  'service | decor_theme | decor_level | cuisine | tier | festival | offer — see src/lib/contentStudio.js';

-- ── 2. Slugs are unique PER KIND, not globally ───────────────────────
-- 037 made `slug` globally UNIQUE, which was right when everything was a
-- service and is wrong now: a decor theme called `diwali` and a festival
-- called `diwali` are two different things and both are legitimate. The
-- upsert in the sync targets (kind, slug), so this constraint is what
-- makes the sync idempotent per kind rather than a source of collisions.
ALTER TABLE service_catalog DROP CONSTRAINT IF EXISTS service_catalog_slug_key;
DROP INDEX IF EXISTS service_catalog_kind_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS service_catalog_kind_slug_key
  ON service_catalog (kind, slug);

-- ── 3. The parts that differ by kind ─────────────────────────────────
-- A cuisine's courses, a tier's guest range and menu allowance, a
-- festival's gradient and date, an offer's code and terms. Nothing filters
-- or joins on these — they are read whole, by the editor and by whatever
-- renders that kind — so JSONB is the honest shape rather than forty
-- mostly-NULL columns.
ALTER TABLE service_catalog ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

-- A second price, because most of these are "a fixed amount plus something
-- per guest" and `base` alone could only carry half of that. Decor themes
-- and decor levels both price this way.
ALTER TABLE service_catalog ADD COLUMN IF NOT EXISTS per_guest NUMERIC
  CHECK (per_guest IS NULL OR per_guest >= 0);

-- The one-line hook under the name. Distinct from `description`: a tagline
-- is display copy, a description is what the thing actually is.
ALTER TABLE service_catalog ADD COLUMN IF NOT EXISTS tagline TEXT;

CREATE INDEX IF NOT EXISTS idx_service_catalog_kind
  ON service_catalog (kind, sort_order) WHERE active;

COMMIT;
