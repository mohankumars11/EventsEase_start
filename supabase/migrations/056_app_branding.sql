-- 056_app_branding.sql
--
-- One row, holding the logo the whole app draws.
--
-- ── Why this exists ──────────────────────────────────────────────────────
-- The monogram in the code is set in a Spencerian face and is close to the
-- brand's artwork, but it is not that artwork: a licensed typeface glyph and
-- a piece of commissioned lettering are different objects, and no amount of
-- tuning turns one into the other. The honest fix is not to keep guessing —
-- it is to let the brand upload the real file and have every surface pick it
-- up. The drawn mark stays as the fallback, which is what renders before the
-- upload exists and if the image ever fails to load.
--
-- ── Why one row and not a settings table ─────────────────────────────────
-- A generic key/value settings table is the tempting shape and it is wrong
-- here: every consumer would have to know a magic key string, and nothing
-- would stop two rows claiming to be the logo. A single row with a CHECKed
-- primary key cannot have a second, so "the logo" is a fact rather than a
-- lookup that might return two answers.
--
-- ── Re-runnable ──────────────────────────────────────────────────────────
-- CREATE TABLE takes IF NOT EXISTS; CREATE POLICY does not, so each policy is
-- paired with a DROP. Same reasoning written out at length in migration 020.

CREATE TABLE IF NOT EXISTS app_branding (
  -- Exactly one row, forever. The CHECK is the whole point.
  id           TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  -- Public URL in the `product-images` bucket, under the brand/ prefix. NULL
  -- means "no upload yet" and the app draws its own mark.
  logo_url     TEXT,
  -- What the mark is of, for screen readers and for the alt text. Rarely
  -- changes; stored so it is not hardcoded beside the image in five places.
  logo_alt     TEXT DEFAULT 'Sambramo',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Seed the singleton so the app has a row to read and the admin has a row to
-- update. ON CONFLICT so re-running does not wipe an uploaded logo.
INSERT INTO app_branding (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_branding ENABLE ROW LEVEL SECURITY;

-- World-readable. It is a logo — it is on every screen including the signed
-- out ones, and gating it behind auth would mean the login page cannot draw
-- the brand it is asking you to log in to.
DROP POLICY IF EXISTS "anyone_reads_branding" ON app_branding;
CREATE POLICY "anyone_reads_branding" ON app_branding FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "admin_updates_branding" ON app_branding;
CREATE POLICY "admin_updates_branding" ON app_branding FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ── Storage ──────────────────────────────────────────────────────────────
-- The file goes into `product-images` under brand/, alongside the decor/ and
-- services/ prefixes already there. That bucket's name is a misnomer left
-- over from the shop, but renaming it would invalidate every stored public
-- URL in the product — so it keeps the name and gains a third tenant.
--
-- Its existing policies key on bucket_id alone, so an admin who can already
-- upload a decor photo can upload this. Nothing further is needed here; this
-- note exists so the next person does not go looking for a missing policy.
