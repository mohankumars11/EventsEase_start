-- ══════════════════════════════════════════════════════════════════════
-- 106 · The listing tab gets tables, and everything in it gets an id
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable.
-- Apply after 105. Then 107, which is the generated data for both.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT HAD NO IDENTITY
-- ══════════════════════════════════════════════════════════════════════
--
-- The whole listing flow is built out of JavaScript literals, and the
-- database cannot point at any of it:
--
--   TRADES     24 of them, and they are plain STRINGS. "Catering & Food"
--              is the de-facto primary key of the entire flow — it is
--              what vendor_services.category stores, what match_partners
--              filters on, and what twenty files type out by hand.
--              Rename it and every listing under it is orphaned, with no
--              error and nothing to join back.
--
--   SERVICES   62 offerings under those trades.
--
--   QUESTIONS  80 question groups and 362 answers, across trades,
--              per-service specs and the catering operations screens.
--
--   UNITS      8 ways of pricing a thing.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY AN ANSWER ID IS THE POINT OF THIS
-- ══════════════════════════════════════════════════════════════════════
--
-- A partner's answers live in vendor_services.specs as
-- {"servers_per_100": "6"}. That is unqueryable in any useful way: '6'
-- is meaningful only if you already know it came from servers_per_100,
-- inside the serving screen, in the catering flow. Two trades can both
-- have a group called 'team_size' with a choice called 'small' and mean
-- entirely different things.
--
-- So a question is identified by WHERE IT LIVES as well as what it is
-- called — scope is `trade:Catering & Food`, `service:emcee`,
-- `ops:limits` — and every answer gets its own id under it.
--
-- With that, "how many caterers will not cook pork" is a join instead of
-- a JSON scan that has to know the shape in advance.
--
-- ══════════════════════════════════════════════════════════════════════
-- ONE TABLE PER KIND OF THING, NOT ONE PER SERVICE
-- ══════════════════════════════════════════════════════════════════════
--
-- "Separate tables for all services" is read here as a table per ENTITY
-- KIND — trades, services, questions, answers — with a row per service.
--
-- Twenty-four tables, one per trade, would mean a schema migration every
-- time a trade is added, no way to ask a question across trades, and
-- twenty-four copies of the same five columns. The listing flow already
-- treats every trade the same way; the schema should too.
--
-- Where a trade genuinely differs is in its QUESTIONS, and that is
-- exactly what listing_questions holds.

BEGIN;

-- ── Trades ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_trades (
  id          TEXT PRIMARY KEY,            -- SBM-TRD-005
  -- The string the application uses, and what vendor_services.category
  -- stores. Kept as a real unique key rather than retired, because
  -- every existing row points at it.
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Services offered under a trade ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_services (
  id          TEXT PRIMARY KEY,            -- SBM-SVC-001
  service_key TEXT NOT NULL UNIQUE,        -- 'emcee', the app's own key
  trade_id    TEXT NOT NULL REFERENCES public.listing_trades(id),
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS listing_services_by_trade
  ON public.listing_services (trade_id) WHERE is_active;

-- ── Variants under a service ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_service_variants (
  id          TEXT PRIMARY KEY,            -- SBM-VAR-001
  service_id  TEXT NOT NULL REFERENCES public.listing_services(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── Questions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_questions (
  id          TEXT PRIMARY KEY,            -- SBM-SPG-077
  -- Where the question lives. 'trade:Catering & Food', 'service:emcee',
  -- 'ops:limits'. Part of the identity, not a label: the same group id
  -- under two scopes is two different questions.
  scope       TEXT NOT NULL,
  group_key   TEXT NOT NULL,               -- 'servers_per_100'
  question    TEXT NOT NULL,
  hint        TEXT,
  -- 'one' = pick one, 'multi' = pick several. The application's own
  -- vocabulary, not invented here.
  answer_type TEXT NOT NULL DEFAULT 'one' CHECK (answer_type IN ('one', 'multi')),
  -- True when the question also takes a typed number beside the chips —
  -- "or the exact number", which exists because "6 or more" covered a
  -- house function and a wedding identically.
  takes_exact BOOLEAN NOT NULL DEFAULT FALSE,
  exact_unit  TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,

  UNIQUE (scope, group_key)
);

CREATE INDEX IF NOT EXISTS listing_questions_by_scope
  ON public.listing_questions (scope);

-- ── The answers a question offers ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_answers (
  id          TEXT PRIMARY KEY,            -- SBM-SPC-123
  question_id TEXT NOT NULL REFERENCES public.listing_questions(id) ON DELETE CASCADE,
  answer_key  TEXT NOT NULL,               -- what specs actually stores
  label       TEXT NOT NULL,
  scan        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,

  UNIQUE (question_id, answer_key)
);

CREATE INDEX IF NOT EXISTS listing_answers_by_question
  ON public.listing_answers (question_id, sort_order);

-- ── Operations screens (catering) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_operation_screens (
  id          TEXT PRIMARY KEY,            -- SBM-OPS-001
  screen_key  TEXT NOT NULL UNIQUE,        -- 'limits'
  title       TEXT NOT NULL,
  why         TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── How a thing is priced ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_units (
  id             TEXT PRIMARY KEY,         -- SBM-UNT-001
  unit_key       TEXT NOT NULL UNIQUE,     -- 'per event'
  suffix         TEXT,
  quantity_label TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

-- ══════════════════════════════════════════════════════════════════════
-- READ BY ANYONE, WRITTEN BY ADMIN
-- ══════════════════════════════════════════════════════════════════════
--
-- Same reasoning as 105. A partner has to read the questions before they
-- have finished signing up, and there is nothing private in "do you
-- cook pork". Writing is admin-only.

ALTER TABLE public.listing_trades            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_services          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_service_variants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_answers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_operation_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_units             ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'listing_trades', 'listing_services', 'listing_service_variants',
    'listing_questions', 'listing_answers', 'listing_operation_screens',
    'listing_units'
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

COMMENT ON TABLE public.listing_trades IS
  'The 24 trades. `name` is what vendor_services.category stores, so it stays a unique key — the id is what new work should reference.';
COMMENT ON COLUMN public.listing_questions.scope IS
  'Where the question lives: trade:<name>, service:<key>, or ops:<screen>. Part of the identity — the same group_key under two scopes is two different questions with two different answer sets.';

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- CHECK IT
-- ══════════════════════════════════════════════════════════════════════
--
--   -- empty until 107 is applied
--   SELECT
--     (SELECT count(*) FROM listing_trades)    AS trades,
--     (SELECT count(*) FROM listing_services)  AS services,
--     (SELECT count(*) FROM listing_questions) AS questions,
--     (SELECT count(*) FROM listing_answers)   AS answers,
--     (SELECT count(*) FROM listing_units)     AS units;
--
--   -- after 107: 24 · 62 · 80 · 362 · 8
--
--   -- every trade, and how much it asks a partner
--   SELECT t.name,
--          count(DISTINCT s.id) AS services,
--          count(DISTINCT q.id) AS questions
--   FROM listing_trades t
--   LEFT JOIN listing_services s ON s.trade_id = t.id
--   LEFT JOIN listing_questions q ON q.scope = 'trade:' || t.name
--   GROUP BY t.name ORDER BY 3 DESC;
--
--   -- what one question offers
--   SELECT q.question, a.answer_key, a.label
--   FROM listing_questions q
--   JOIN listing_answers a ON a.question_id = q.id
--   WHERE q.scope = 'ops:limits'
--   ORDER BY q.sort_order, a.sort_order;
