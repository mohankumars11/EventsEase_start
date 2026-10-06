-- ════════════════════════════════════════════════════════════════════
-- 108 · A MENU LINE REACHES A DISH
-- ════════════════════════════════════════════════════════════════════
--
-- catalogue_menu_lines.dish_id was NULL on all 304 rows. That column is
-- the whole of menu-card matching: a customer picks "Option 1", and
-- dispatch has to find the caterers who can cook its lines. A caterer's
-- listing holds dish ids from the picker, so a line that reaches no dish
-- can never be matched by anybody.
--
-- Two things stopped it being filled in.
--
-- ── 1 · One column cannot hold a choice ──────────────────────────────
-- "Paal Payasa OR Sabbakki Mango Payasa" is ONE line offering TWO
-- dishes. dish_id can hold one of them. Picking either silently narrows
-- what the card says — a caterer who makes the sabbakki payasa but not
-- the paal payasa would stop matching a card they can cook.
--
-- So a line with a choice keeps dish_id NULL and lists its dishes in
-- catalogue_menu_line_options. Matching such a line means matching ANY
-- of its options, which is exactly what the card offers.
--
-- ── 2 · NULL meant three different things ────────────────────────────
-- "Salt" will never have a dish_id and that is correct — every caterer
-- has salt, and matching on it would only add noise. "Kaju Mohini" had
-- no dish_id because the catalogue did not know the dish. Both read as
-- NULL, so a real hole and a deliberate blank looked identical and the
-- one that mattered could not be counted.
--
-- kind separates them:
--
--   dish       one dish, in dish_id
--   choice     "A OR B" — the options are alternatives, ANY one matches
--   all        "A, B"   — the options are both served, ALL must match
--   staple     salt, papad, a banana — nobody is matched on it
--   label      a course heading the card writes as a line
--   unresolved a name we have not placed yet, and the only kind that
--              is a defect. The seed asserts there are none.
--
-- choice and all hold the same shape and ask opposite questions. Lumped
-- together, a caterer who cooks one of two REQUIRED dishes would be sent
-- a card they cannot cook.
--
-- Applied by hand in the SQL editor, like every migration here.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── The kind of line ────────────────────────────────────────────────
ALTER TABLE public.catalogue_menu_lines
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'unresolved';

ALTER TABLE public.catalogue_menu_lines
  DROP CONSTRAINT IF EXISTS catalogue_menu_lines_kind_check;
ALTER TABLE public.catalogue_menu_lines
  ADD CONSTRAINT catalogue_menu_lines_kind_check
  CHECK (kind IN ('dish', 'choice', 'all', 'staple', 'label', 'unresolved'));

-- A line of kind 'dish' has a dish; the other kinds do not. Without this
-- the seed could write kind = 'dish' with a NULL dish_id and the hole
-- would be back, wearing a label that says it is filled.
ALTER TABLE public.catalogue_menu_lines
  DROP CONSTRAINT IF EXISTS catalogue_menu_lines_kind_agrees;
ALTER TABLE public.catalogue_menu_lines
  ADD CONSTRAINT catalogue_menu_lines_kind_agrees
  CHECK (
    (kind = 'dish' AND dish_id IS NOT NULL)
    OR (kind <> 'dish' AND dish_id IS NULL)
  );

COMMENT ON COLUMN public.catalogue_menu_lines.kind IS
  'What this line is: dish (one, in dish_id), choice (alternatives in catalogue_menu_line_options, ANY one matches), all (several in the same table, ALL must match), staple (nobody is matched on it), label (a course heading), unresolved (a defect — the seed asserts none exist).';


-- ── The dishes a line offers a choice of ────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogue_menu_line_options (
  id         TEXT PRIMARY KEY,               -- SBM-MLO-001
  line_id    TEXT NOT NULL REFERENCES public.catalogue_menu_lines(id) ON DELETE CASCADE,
  dish_id    TEXT NOT NULL REFERENCES public.catalogue_dishes(id),
  sort_order INTEGER NOT NULL DEFAULT 0,

  UNIQUE (line_id, dish_id)
);

CREATE INDEX IF NOT EXISTS catalogue_menu_line_options_line_idx
  ON public.catalogue_menu_line_options (line_id);
CREATE INDEX IF NOT EXISTS catalogue_menu_line_options_dish_idx
  ON public.catalogue_menu_line_options (dish_id);

COMMENT ON TABLE public.catalogue_menu_line_options IS
  'The dishes one menu line names when it names more than one. Read with catalogue_menu_lines.kind: choice means any one of them satisfies the line, all means every one is served.';

ALTER TABLE public.catalogue_menu_line_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogue_menu_line_options_read ON public.catalogue_menu_line_options;
CREATE POLICY catalogue_menu_line_options_read
  ON public.catalogue_menu_line_options
  FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS catalogue_menu_line_options_write ON public.catalogue_menu_line_options;
CREATE POLICY catalogue_menu_line_options_write
  ON public.catalogue_menu_line_options
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = auth.uid() AND p.role = 'admin'));


-- ── Every dish a line can be satisfied by, in one place ─────────────
-- Matching should not have to know that a plain line reads dish_id and a
-- choice line reads a second table. It asks this view instead.
CREATE OR REPLACE VIEW public.catalogue_menu_line_dishes AS
  SELECT l.id AS line_id, l.menu_id, l.line_no, l.kind, l.dish_id, 0 AS sort_order
    FROM public.catalogue_menu_lines l
   WHERE l.dish_id IS NOT NULL
   UNION ALL
  SELECT o.line_id, l.menu_id, l.line_no, l.kind, o.dish_id, o.sort_order
    FROM public.catalogue_menu_line_options o
    JOIN public.catalogue_menu_lines l ON l.id = o.line_id;

COMMENT ON VIEW public.catalogue_menu_line_dishes IS
  'Every (line, dish) pair a menu card offers, whether the line names one dish or a choice of several. Matching reads this and does not need to know the difference.';

GRANT SELECT ON public.catalogue_menu_line_dishes TO anon, authenticated;

COMMIT;

-- ── After the seed is applied, this should return no rows ───────────
--   SELECT kind, count(*) FROM public.catalogue_menu_lines GROUP BY kind;
--   SELECT * FROM public.catalogue_menu_lines WHERE kind = 'unresolved';
