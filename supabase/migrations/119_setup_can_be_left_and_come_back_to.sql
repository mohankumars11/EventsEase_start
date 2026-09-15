-- ══════════════════════════════════════════════════════════════════════
-- 119 · Setup can be left, and come back to
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable.
--
-- The app works WITHOUT this file. lib/partnerStage.js infers the stage
-- from what is already on the row — no vendors row means "not started",
-- no listings means "never picked a trade" — and reads the columns below
-- only when they are present. Applying this makes two things true that
-- inference cannot get at, and nothing else changes.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT INFERENCE CANNOT ANSWER
-- ══════════════════════════════════════════════════════════════════════
--
-- 1 · "Complete Later" is a decision, and it is invisible.
--
--     A partner who tapped it and a partner who closed the app mid-form
--     leave identical rows behind. Both are greeted as new on the next
--     sign-in, and being asked to start something you deliberately
--     paused is how a half-finished profile becomes an abandoned one.
--
-- 2 · Which step they were on.
--
--     Inference can say "they have no listings". It cannot say they were
--     four screens into Catering when the bus arrived. Resuming at the
--     start of a flow somebody was most of the way through is the same
--     cost as not resuming at all.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY ON vendors AND NOT A NEW TABLE
-- ══════════════════════════════════════════════════════════════════════
--
-- One row per partner, read on every cold start, written on a handful of
-- taps. A second table would add a join to the first query after sign-in
-- to hold three columns that have the same lifetime as the row they
-- would point at.
--
-- The listing DRAFTS are a different matter and are not here: they are
-- per trade, they are large, and vendor_services already holds them —
-- a row at review_status 'draft' IS the draft. See 117.
BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · Where they are in setup
-- ══════════════════════════════════════════════════════════════════════
--
-- NULL means "nothing recorded", which is every existing partner and is
-- the correct answer for them: they are set up. Only the values below
-- ever mean anything, and the check exists so a typo in a future call
-- site fails loudly here rather than quietly routing somebody wrong.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT;

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_onboarding_status_valid;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_onboarding_status_valid
  CHECK (onboarding_status IS NULL OR onboarding_status IN (
    'in_progress',    -- started, still moving
    'setup_later',    -- tapped Complete Later. A decision, not a lapse.
    'complete'        -- finished the setup flow
  ));

-- The screen they were last on, as the app's own id: 'trade',
-- 'offerings', 'ops:limits', 'cuisine:karnataka'. Deliberately free
-- text and deliberately NOT a foreign key — these ids live in
-- src/data/*, they change with the questionnaire, and a constraint here
-- would turn "we renamed a screen" into "nobody can save their place".
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS current_onboarding_step TEXT;

-- Which named steps of the six they have finished. An array rather than
-- six booleans: the list of steps is a product decision that has already
-- changed once (five to six), and each change would otherwise be a
-- migration plus a backfill.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS completed_steps TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.vendors.onboarding_status IS
  'NULL for every partner who onboarded before 119 — they are set up, and the stage is inferred. See src/lib/partnerStage.js.';
COMMENT ON COLUMN public.vendors.current_onboarding_step IS
  'The app''s own screen id, e.g. ops:limits. Free text on purpose: these ids belong to the questionnaire, not to the schema.';

-- ══════════════════════════════════════════════════════════════════════
-- 2 · Nothing here needs a new guard, and that was worth checking
-- ══════════════════════════════════════════════════════════════════════
--
-- These three columns are the first on `vendors` a partner writes
-- CASUALLY — on a tap, mid-form, with nobody reviewing it. The obvious
-- next thought is that a partner should not be able to smuggle
-- `is_verified` along in the same UPDATE, since row-level security is
-- column-blind and the partner UPDATE policy on vendors is one rule for
-- the whole row.
--
-- That guard already exists. 067 installs `guard_vendor_self_verify`,
-- which restores `is_verified`, `verified_by`, `verified_at`,
-- `is_featured` and `is_synthetic` from OLD on every partner-side
-- update, silently, exactly as 117 does for review_status.
--
-- A second trigger here would have been worse than redundant. Written
-- first and checked after, it also froze `verification_status` — which
-- 067 deliberately leaves writable, because that is how a partner
-- SUBMITS their documents (VendorDocuments.jsx writes 'submitted'). It
-- would have made the upload button a control that appears to work and
-- does nothing, which is the precise failure 067's own comments are
-- written against.
--
-- So: no trigger. The three columns below are a bookmark. They decide
-- which screen opens, never what anybody is allowed to do, and the
-- columns that DO decide that are already held down.

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- AFTERWARDS
-- ══════════════════════════════════════════════════════════════════════
--
-- Nothing to backfill. Every existing partner keeps onboarding_status
-- NULL, which partnerStage() reads as "say nothing, infer it" — exactly
-- the behaviour they have today.
--
-- To check it took:
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'vendors'
--      AND column_name IN ('onboarding_status','current_onboarding_step','completed_steps')
--    ORDER BY column_name;
--
--   -- should return three rows
