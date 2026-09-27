-- ══════════════════════════════════════════════════════════════════════
-- 105 · The catalogue gets tables, and everything in it gets an id
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable.
-- Then apply 106, which is the generated data for these tables.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THE CATALOGUE IS COMING INTO THE DATABASE
-- ══════════════════════════════════════════════════════════════════════
--
-- Every dish, menu and cuisine lives in JavaScript. That is still the
-- right place to READ them from — a partner opens the listing screen in
-- a kitchen on a weak connection, and a network round trip for a dish
-- list would be a worse app. 103 said this and it has not changed.
--
-- But nothing in the database can currently POINT at any of it. A
-- booking that says "this customer chose Option 3" stores a string. A
-- caterer who claims a dish stores a string. Nothing can join, nothing
-- can be counted, and no query can answer "how many bookings wanted
-- Bisi Bele Bath" without parsing text.
--
-- So: the files stay the source, and these tables are the database's
-- copy of them, keyed by the same permanent ids. Generated and applied
-- together, never hand-edited — 106 is machine-written for exactly that
-- reason.
--
-- ══════════════════════════════════════════════════════════════════════
-- catalogue_menu_lines IS THE ONE THAT MATTERS
-- ══════════════════════════════════════════════════════════════════════
--
-- "The menu card the customer chose" is a list of LINES, and a line is
-- not the same thing as a dish. A real card says:
--
--     "Paal Payasa OR Sabbakki Mango Payasa (seasonal)"
--     "Aloo Batani Palya OR Aloo Palak Chopse"
--     "Salt"
--
-- One line, two alternatives. Another line that is a condiment. A third
-- that is seasonal. None of those is a row in the dish registry, and
-- pretending otherwise is how a matcher ends up confidently wrong.
--
-- So each line gets its own id and a NULLABLE dish_id beside it. Most
-- are null today and that is the honest state: the line exists, we have
-- not yet decided which dish it is. When menu-card matching is built,
-- filling that column in is the work — and it is a column an operator
-- can fill in one row at a time rather than a rewrite.
--
-- ══════════════════════════════════════════════════════════════════════
-- TEXT PRIMARY KEYS, NOT uuid
-- ══════════════════════════════════════════════════════════════════════
--
-- Deliberate. 'SBM-KA-RA-131' and 'karnataka' are the ids the
-- application already uses, and a uuid beside them would mean two
-- identities for one thing and a translation table nobody maintains.
-- These ids are stable by construction — see dishIds.generated.js.

BEGIN;

-- ── Regions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogue_regions (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── Courses ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogue_courses (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  hint        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── Cuisines ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogue_cuisines (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  local_name   TEXT,
  emoji        TEXT,
  region_id    TEXT REFERENCES public.catalogue_regions(id),
  blurb        TEXT,
  base_plate   INTEGER,
  has_non_veg  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Dishes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogue_dishes (
  id          TEXT PRIMARY KEY,            -- SBM-KA-RA-131
  cuisine_id  TEXT NOT NULL REFERENCES public.catalogue_cuisines(id),
  course_id   TEXT NOT NULL REFERENCES public.catalogue_courses(id),
  name        TEXT NOT NULL,
  note        TEXT,
  -- Two values, never null. A blank diet passes `<> 'nonveg'` and puts
  -- mutton on a pure-veg card; that is the one failure a refund does not
  -- settle, so the constraint is here and not only in the application.
  diet        TEXT NOT NULL CHECK (diet IN ('veg', 'nonveg')),
  delta       INTEGER NOT NULL DEFAULT 0,  -- per-plate premium
  -- 'registry' for the 144 hand-written rows, 'catalogue' for the rest.
  source      TEXT NOT NULL DEFAULT 'catalogue' CHECK (source IN ('registry', 'catalogue')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS catalogue_dishes_by_cuisine
  ON public.catalogue_dishes (cuisine_id, course_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS catalogue_dishes_by_diet
  ON public.catalogue_dishes (diet) WHERE is_active;

-- ── Set menus ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogue_menus (
  id          TEXT PRIMARY KEY,            -- SBM-MNU-001
  -- The slug the application still uses. vendor_services.specs.menus
  -- stores these, so it stays a first-class key rather than being
  -- retired the moment a nicer id exists.
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  tier        TEXT,
  scan        TEXT,
  from_price  INTEGER,
  min_pax     INTEGER,
  diet        TEXT NOT NULL CHECK (diet IN ('veg', 'nonveg')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── The lines inside a menu ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogue_menu_lines (
  id          TEXT PRIMARY KEY,            -- SBM-MLN-001
  menu_id     TEXT NOT NULL REFERENCES public.catalogue_menus(id) ON DELETE CASCADE,
  course_id   TEXT REFERENCES public.catalogue_courses(id),
  line_no     INTEGER NOT NULL,
  text        TEXT NOT NULL,

  -- ── The bridge, and it is allowed to be empty ──────────────────────
  -- Null means "this line has not been resolved to a dish yet", which is
  -- the truth for almost all of them today. It does NOT mean the line is
  -- unimportant. A line reading "Paal Payasa OR Sabbakki Mango Payasa"
  -- is two dishes and one choice; resolving it needs a decision, not a
  -- migration.
  dish_id     TEXT REFERENCES public.catalogue_dishes(id),

  -- Set when the line offers alternatives ("A OR B"), so whoever
  -- resolves dish_id later knows this one needs more than a lookup.
  has_choice  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS catalogue_menu_lines_by_menu
  ON public.catalogue_menu_lines (menu_id, line_no);
CREATE INDEX IF NOT EXISTS catalogue_menu_lines_unresolved
  ON public.catalogue_menu_lines (menu_id) WHERE dish_id IS NULL;

-- ── Live counters ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogue_counters (
  id          TEXT PRIMARY KEY,            -- SBM-CTR-001
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  scan        TEXT,
  from_price  INTEGER,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ══════════════════════════════════════════════════════════════════════
-- WHO CAN READ AND WRITE
-- ══════════════════════════════════════════════════════════════════════
--
-- A catalogue is public. A customer browsing before they sign in has to
-- see the menus, and a partner has to see the dishes; there is nothing
-- private in a dish name or a plate price that is already on the site.
--
-- Writing is admin only, for the same reason 103 is: open the pen and
-- within a week the list holds three spellings of chicken biryani, none
-- of which a search can match.

ALTER TABLE public.catalogue_regions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_courses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_cuisines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_dishes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_menus       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_menu_lines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_counters    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'catalogue_regions', 'catalogue_courses', 'catalogue_cuisines',
    'catalogue_dishes', 'catalogue_menus', 'catalogue_menu_lines',
    'catalogue_counters'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_read ON public.%I FOR SELECT TO anon, authenticated USING (TRUE)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_write ON public.%I FOR ALL TO authenticated '
      'USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin'')) '
      'WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))',
      t, t);
  END LOOP;
END $$;

COMMENT ON TABLE public.catalogue_dishes IS
  'The database''s copy of the dish catalogue. The files in src/data are the source; this is generated from them by scripts/generate-catalogue-seed.mjs so that bookings and listings can reference a dish by id.';
COMMENT ON COLUMN public.catalogue_menu_lines.dish_id IS
  'Null until somebody resolves which dish this line is. Most lines are null today. A line offering "A OR B" needs a decision, not a lookup — see has_choice.';

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- CHECK IT
-- ══════════════════════════════════════════════════════════════════════
--
--   -- empty until 106 is applied
--   SELECT
--     (SELECT count(*) FROM catalogue_cuisines)   AS cuisines,
--     (SELECT count(*) FROM catalogue_dishes)     AS dishes,
--     (SELECT count(*) FROM catalogue_menus)      AS menus,
--     (SELECT count(*) FROM catalogue_menu_lines) AS lines,
--     (SELECT count(*) FROM catalogue_counters)   AS counters;
--
--   -- after 106: 16 · 915 · 15 · 304 · 7
--
--   -- how much of the bridge is still to build
--   SELECT count(*) FILTER (WHERE dish_id IS NULL) AS unresolved,
--          count(*) FILTER (WHERE has_choice)      AS need_a_decision,
--          count(*)                                AS total
--   FROM catalogue_menu_lines;
--
--   -- a blank diet is refused (expect: ERROR check constraint)
--   INSERT INTO catalogue_dishes (id, cuisine_id, course_id, name, diet)
--   VALUES ('SBM-XX-XX-001', 'karnataka', 'mains', 'Test', '');
