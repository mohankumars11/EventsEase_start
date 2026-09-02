-- ══════════════════════════════════════════════════════════════════════
-- 098 · What a partner actually does, not just which trade they are in
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 021 first.
-- Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE GAP
-- ══════════════════════════════════════════════════════════════════════
--
-- A partner's listing is a name, a trade and a price. "Catering, quote on
-- request." That is enough to dispatch a job and nothing like enough to
-- dispatch the RIGHT one.
--
-- A caterer who cooks only pure-vegetarian Brahmin food and a caterer
-- running a tandoor are one row apart in this table and are completely
-- different businesses. Sending the first a Punjabi wedding wastes
-- everybody's time, and after two or three of those they stop opening the
-- app -- which is the expensive failure, because supply is the constraint
-- this marketplace runs against, not demand.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY JSONB AND NOT COLUMNS
-- ══════════════════════════════════════════════════════════════════════
--
-- The answers are UI data. src/data/partnerSpecs.js holds 35 question
-- groups across 17 trades and 155 choices, and that list will change as
-- the product learns what actually predicts a good match. A column per
-- choice means a migration every time somebody adds a cuisine, which
-- means the form can never be edited without a database change, which
-- means it stops being edited.
--
-- ── The rule that keeps this honest ─────────────────────────────────
--
-- 094 states it for venue_spaces.attributes and it holds here: anything
-- dispatch DECIDES on gets a real column and a real index. JSONB is for
-- description and for ranking.
--
-- Today `match_partners` filters on trade, distance, availability and
-- rating, and this column changes none of that. It is deliberate, and it
-- is about liquidity rather than laziness: per-line fill rate is already
-- the number that decides whether this product feels like magic or feels
-- broken, and hard-filtering caterers by cuisine on a network this thin
-- would cut the candidate pool for every catering line in the city.
--
-- The right sequence is: capture it, watch what it predicts, then narrow
-- the match when the density supports it. A GIN index is here so that
-- second step is a query change and not a migration under load.

BEGIN;

ALTER TABLE public.vendor_services
  ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.vendor_services.specs IS
  'Answers to data/partnerSpecs.js, keyed by group id. Values are a choice id or an array of them. Descriptive and rankable; NOT what match_partners filters on.';

-- jsonb_path_ops rather than the default operator class: it is smaller
-- and faster for the only question anybody will ask of this column --
-- "does this partner's specs contain X" -- and it gives up the key-exists
-- operators, which nothing here uses.
CREATE INDEX IF NOT EXISTS idx_vendor_services_specs
  ON public.vendor_services USING GIN (specs jsonb_path_ops);

-- A guard against the shape going wrong.
--
-- The form writes an object of group id -> string or array of strings.
-- Nothing stops a future caller writing an array at the top level, and a
-- top-level array would break every `specs->>'cuisines'` read silently
-- rather than loudly. One CHECK closes that.
ALTER TABLE public.vendor_services
  DROP CONSTRAINT IF EXISTS vendor_services_specs_is_object;
ALTER TABLE public.vendor_services
  ADD CONSTRAINT vendor_services_specs_is_object
  CHECK (jsonb_typeof(specs) = 'object');

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- WHAT THIS DOES NOT DO
-- ══════════════════════════════════════════════════════════════════════
--
-- No RLS change. `vendor_services` already scopes reads and writes to the
-- owning partner, and a new column on an existing table inherits every
-- policy on it -- which is the whole reason this is a column rather than
-- a second table that would need its own.
--
-- No backfill. Every existing row gets '{}', which the app reads as "not
-- answered yet" and shows as a prompt rather than as an empty answer.
-- Inventing specs for 221 seeded partners would put invented capabilities
-- in front of real customers.
