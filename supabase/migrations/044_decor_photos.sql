-- ============================================================
-- Migration 044: real photographs for the décor catalogue.
--
-- Independent of 037–043. It creates one table and touches nothing else, so
-- it can be applied at any point in any order.
--
-- ── What this is for ────────────────────────────────────────────────────
-- src/data/decorCatalog.js carries sixty installable décor setups, each with
-- a photograph resolved from Pexels by scripts/resolve-decor-catalog.mjs.
-- Every one of those is a licensed lookalike of the STYLE, badged
-- "Representative image" on the card, because Sambramo is pre-launch and has
-- photographed none of its own work.
--
-- That is honest and it is also a ceiling. The single strongest thing this
-- business will ever own is a photograph of a hall it actually decorated, and
-- until this migration there was no way to put one on the site short of
-- editing a generated JavaScript file and redeploying. This table is the
-- route: the founder finishes an install, photographs it on a phone, opens
-- Admin → Décor Photos, and the card changes for every customer within the
-- second — badge included, from "Representative image" to "Actual setup
-- photo".
--
-- ── Why an overlay and not a copy of the catalogue ──────────────────────
-- The obvious design is a `decor_catalog` table mirroring the whole of
-- decorCatalog.js — name, price, inclusions, the lot — the way
-- `service_catalog` mirrors servicePricing.js. That is the wrong shape here
-- and 037 explains why in its own header: the static file is the authority
-- for anything a computation reads, and copying those values into SQL creates
-- two sources for one number where the code keeps reading the old one.
--
-- The difference is that service_catalog earns its copy — an admin genuinely
-- needs to add a service that has no code behind it. Nobody adds a décor
-- setup from a phone: an entry needs a price researched against the market, a
-- written inclusion list and a photograph, which is a considered piece of work
-- done in the file with the rest of them.
--
-- So this table holds exactly the one field that cannot live in the file —
-- the photograph, which arrives from a camera rather than from a commit. Copy,
-- price and inclusions stay in decorCatalog.js as the single source. An
-- overlay of one column, joined by id.
--
-- ── The app does NOT wait for this migration ────────────────────────────
-- src/lib/decorPhotos.js treats a missing table as "no overrides", exactly as
-- lib/serviceCatalog.js does, and the catalogue then renders the Pexels
-- photographs it shipped with. Nothing crashes and nothing is blank. The admin
-- screen detects the same condition and says so in words rather than throwing
-- a red error at somebody who has done nothing wrong.
--
-- ── Where the files go ──────────────────────────────────────────────────
-- Into the SHOP's `product-images` bucket, under a `decor/` prefix — the same
-- decision 037 made for service photos, for the same reason. Migration 025's
-- storage policies key on `bucket_id` alone, so a prefix inherits public-read
-- and admin-only-write unchanged. One bucket and one set of policies to get
-- right instead of three.
--
-- Safe to re-run. Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- ── 1. The overlay ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decor_photos (
  -- The catalogue item id from decorCatalog.js — 'anniv-candlelight-home',
  -- 'wed-mandap'. TEXT and the primary key, so an upload is an upsert and one
  -- item can never end up with two rows fighting over which photo is current.
  --
  -- No foreign key, because the thing it references is a JavaScript array. The
  -- consequence is that renaming an item id in the file orphans its row, and
  -- that is handled in the only place it can be: the admin screen lists rows
  -- whose id is no longer in the catalogue under "no longer in the catalogue"
  -- and offers to delete them, rather than the orphan silently costing storage
  -- forever.
  item_id          TEXT PRIMARY KEY,

  image_url        TEXT NOT NULL,
  image_alt        TEXT,

  -- Attribution, for a photograph that came from a stock library. NULL on our
  -- own work — there is nobody to credit, and printing "Photo by …" under a
  -- hall we decorated ourselves would be a stranger's byline on our portfolio.
  image_credit     TEXT,

  -- The honesty flag, same three-state model the shop has used since migration
  -- 023 and the same one ImageSourceBadge reads. Defaults to 'actual' rather
  -- than 'stock' because the reason a human stands in a decorated room with a
  -- phone is that it is a room we decorated; a stock replacement is the rare
  -- case and the admin picks it explicitly.
  image_source     TEXT NOT NULL DEFAULT 'actual'
                     CHECK (image_source IN ('stock', 'actual')),

  -- Who and when. Not audit theatre: with more than one coordinator uploading,
  -- "who put this up and when" is the first question asked about a photograph
  -- somebody wants taken down.
  uploaded_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- update_updated_at() is the shared trigger function from the earlier
-- migrations; this table does not define its own.
DROP TRIGGER IF EXISTS trg_decor_photos_updated_at ON decor_photos;
CREATE TRIGGER trg_decor_photos_updated_at
  BEFORE UPDATE ON decor_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. RLS ───────────────────────────────────────────────────────────
-- Public reads everything. There is no `active` column to filter on and there
-- should not be one: a row exists only because somebody deliberately uploaded
-- a photograph, and "hide it again" is `DELETE`, which also frees the storage
-- object the admin screen removes alongside it. A soft-delete flag here would
-- leave orphaned files in the bucket costing money with nothing pointing at
-- them.
--
-- get_my_role() is the SECURITY DEFINER helper from migration 006 — never
-- inline an EXISTS against profiles inside a policy, which re-enters profiles
-- RLS and recurses. That is the bug 006 exists to fix.
--
-- CREATE POLICY has no IF NOT EXISTS (error 42710), so each is paired with a
-- DROP POLICY IF EXISTS — the house rule from PROJECT_SUMMARY.

ALTER TABLE decor_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_reads_decor_photos" ON decor_photos;
CREATE POLICY "public_reads_decor_photos" ON decor_photos FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "admins_manage_decor_photos" ON decor_photos;
CREATE POLICY "admins_manage_decor_photos" ON decor_photos FOR ALL
  USING      (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));


-- ── 3. Coverage, as one number ───────────────────────────────────────
-- How much of the catalogue is our own work rather than a stock lookalike.
--
-- A view rather than a count computed in the browser, because the denominator
-- has to come from somewhere and the browser's copy of it is the JavaScript
-- array — which is fine for the admin screen and useless for anything else
-- that ever wants this figure (a weekly digest, a dashboard tile, a SQL
-- console). The total is passed in by the caller for the same reason the
-- catalogue itself is not mirrored here: the file is the authority for what
-- exists, and this view refuses to guess at it.
DROP VIEW IF EXISTS decor_photo_coverage;
CREATE VIEW decor_photo_coverage AS
  SELECT
    count(*)                                          AS uploaded,
    count(*) FILTER (WHERE image_source = 'actual')   AS actual_photos,
    count(*) FILTER (WHERE image_source = 'stock')    AS stock_replacements,
    max(updated_at)                                   AS last_upload
  FROM decor_photos;

GRANT SELECT ON decor_photo_coverage TO anon, authenticated;

COMMIT;

-- ── Check it landed ─────────────────────────────────────────────────────
-- Run separately, after the COMMIT above.
--
-- An empty table is the CORRECT result until the first real setup has been
-- photographed. The storefront is unaffected either way — every card falls
-- back to the Pexels photograph it shipped with, badged "Representative
-- image", which is exactly what it was doing before this migration.
--
--   SELECT * FROM decor_photo_coverage;
--
--   SELECT item_id, image_source, image_credit, updated_at
--   FROM decor_photos
--   ORDER BY updated_at DESC;
--
-- To find rows whose catalogue item has been renamed or removed, compare this
-- list against the ids in src/data/decorCatalog.js — the admin screen does the
-- same comparison and offers to clean them up:
--
--   SELECT item_id FROM decor_photos ORDER BY item_id;
