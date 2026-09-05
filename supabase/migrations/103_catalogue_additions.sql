-- ══════════════════════════════════════════════════════════════════════
-- 103 · The catalogue gets a growing edge
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE PROBLEM
-- ══════════════════════════════════════════════════════════════════════
--
-- Every dish, menu and cuisine lives in source code — 840 dishes across
-- 42 groups in src/data/cateringDishes.js, sixteen cuisines in
-- cuisineMenus.js. That is the right place for them: they are read on a
-- screen a partner opens standing in a kitchen on a weak connection, and
-- a network call for a dish list would be a worse app.
--
-- But it means an operator who learns that a caterer makes Kaipuli Gojju
-- cannot add it. It needs an edit, a build, a deploy and an engineer who
-- is free. So the catalogue only grows when somebody technical has time,
-- and the operator who found the gap moves on and forgets.
--
-- Meanwhile specs.dishes_typed fills up with dishes partners typed into
-- the text box, every one of them evidence of something missing from the
-- list, and nothing happens to any of it.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE FIX, AND WHAT IT DELIBERATELY IS NOT
-- ══════════════════════════════════════════════════════════════════════
--
-- One table, read at runtime and MERGED with the code list. The files
-- stay the backbone; this is the growing edge.
--
-- Nothing is migrated out of the files. A table that replaced them would
-- put 840 rows behind a network call on exactly the screen that must not
-- have one, and would make the catalogue unreadable in a code review.
--
-- ── Partners do not write here ──────────────────────────────────────
-- Their typed dishes go to vendor_services.specs.dishes_typed, flagged.
-- An operator reads them and decides whether one becomes a catalogue
-- entry. That decision is the whole reason a curated list is worth more
-- than a free-text field, and handing the pen to everyone would give us
-- "Chiken Biriyani", "chicken biryani" and "Biryani (chicken)" inside a
-- week — three entries no customer search can match against.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY is_active RATHER THAN DELETE
-- ══════════════════════════════════════════════════════════════════════
--
-- A dish that has been ticked by partners is referenced by their listings
-- by NAME. Deleting the row would leave those listings claiming a dish
-- the catalogue no longer offers, which is not visibly broken and cannot
-- be found later. Deactivating stops it being offered to anyone new while
-- leaving what has already been claimed legible.

BEGIN;

CREATE TABLE IF NOT EXISTS public.catalogue_additions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What kind of thing this is. Constrained rather than free text: a
  -- typo'd kind is a row that is read by nothing and looks fine.
  kind        text NOT NULL CHECK (kind IN ('dish', 'menu', 'cuisine', 'course')),

  -- Where it belongs. A dish needs both; a cuisine needs neither.
  cuisine_id  text,
  course_id   text,

  name        text NOT NULL CHECK (length(btrim(name)) > 0),
  note        text,

  added_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  is_active   boolean NOT NULL DEFAULT true,

  -- A dish has to say which cuisine and course it hangs off, or it is a
  -- row nothing can ever render.
  CONSTRAINT dish_needs_a_home CHECK (
    kind <> 'dish' OR (cuisine_id IS NOT NULL AND course_id IS NOT NULL)
  )
);

-- The read the partner app does on every listing screen: active rows for
-- one cuisine. Without this it is a sequential scan on a table that only
-- grows.
CREATE INDEX IF NOT EXISTS catalogue_additions_lookup
  ON public.catalogue_additions (cuisine_id, course_id)
  WHERE is_active;

-- The same dish added twice under one course is one dish. Case- and
-- space-insensitive, because "Bisi Bele Bath" and "bisi bele  bath" are
-- the same thing to everybody except a unique index that is spelled
-- carelessly.
CREATE UNIQUE INDEX IF NOT EXISTS catalogue_additions_no_duplicates
  ON public.catalogue_additions (
    kind,
    coalesce(cuisine_id, ''),
    coalesce(course_id, ''),
    lower(btrim(name))
  );

ALTER TABLE public.catalogue_additions ENABLE ROW LEVEL SECURITY;

-- ── Anyone signed in may READ the active ones ────────────────────────
-- A partner has to see them or the addition was pointless. There is
-- nothing sensitive in a dish name.
DROP POLICY IF EXISTS catalogue_additions_read ON public.catalogue_additions;
CREATE POLICY catalogue_additions_read
  ON public.catalogue_additions
  FOR SELECT
  TO authenticated
  USING (is_active);

-- ── Only an admin may WRITE ──────────────────────────────────────────
-- Deliberately not "any authenticated user". See the note above about
-- three spellings of chicken biryani.
DROP POLICY IF EXISTS catalogue_additions_write ON public.catalogue_additions;
CREATE POLICY catalogue_additions_write
  ON public.catalogue_additions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin')
  );

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- CHECK IT
-- ══════════════════════════════════════════════════════════════════════
--
--   -- the table is there and empty
--   SELECT count(*) FROM public.catalogue_additions;
--
--   -- a dish with no home is refused (expect: ERROR dish_needs_a_home)
--   INSERT INTO public.catalogue_additions (kind, name)
--   VALUES ('dish', 'Kaipuli Gojju');
--
--   -- a proper one is accepted
--   INSERT INTO public.catalogue_additions (kind, cuisine_id, course_id, name)
--   VALUES ('dish', 'karnataka', 'curries', 'Kaipuli Gojju');
--
--   -- and the same dish again, spelled sloppily, is refused
--   -- (expect: ERROR duplicate key ... catalogue_additions_no_duplicates)
--   INSERT INTO public.catalogue_additions (kind, cuisine_id, course_id, name)
--   VALUES ('dish', 'karnataka', 'curries', '  kaipuli   gojju ');
--
-- The third one only fails on the leading/trailing space, NOT the double
-- space in the middle — btrim does not collapse inner whitespace. That is
-- a known gap and it is left as one: collapsing inner space inside an
-- index expression makes the index non-obvious to anyone reading it
-- later, and the admin screen trims and collapses before it writes.
--
--   DELETE FROM public.catalogue_additions WHERE name ILIKE '%kaipuli%';
