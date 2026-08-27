-- ============================================================
-- 063 · quote_revisions — a floating price, and every time it moved
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057–062 FIRST.
--
-- ── Why this exists ──────────────────────────────────────────────────
-- A wedding booked in March for October has seven months of onion and
-- cooking-oil prices between the quote and the meal. src/config/pricing.js
-- holds the policy — locked core, collared float, three checkpoints — and
-- this is where each restatement is recorded.
--
-- ── It applies to PRE-BOOK only. Instant never floats ────────────────
-- An instant booking is paid in full into escrow at the moment of
-- booking, so there is no later moment at which a different number could
-- be charged: the money is already held (062). Repricing after payment is
-- a post-purchase price change, which the CCPA's 2023 dark-pattern
-- guidelines prohibit by name. Nothing in this table ever touches a
-- `booking_lines` row.
--
-- ── Why a table and not two columns on the quote ─────────────────────
-- Because "why is this ₹6,400 more than you told me in March?" has to be
-- answerable in October, and a column that was overwritten twice cannot
-- answer it. Each row states what moved, by how much, against which
-- index read, and what the customer was told at the time.
--
-- That is also what makes the COLLAR auditable. The promise is that the
-- floating part never rises more than 8% above the original estimate,
-- whatever the market does. A promise nobody can check is a slogan; with
-- these rows, `scripts/check-dispatch-invariants.mjs` checks it on every
-- run.
--
-- ── Append-only, same as the escrow ledger ───────────────────────────
-- A revision is a thing that happened. Editing one would rewrite what a
-- customer was told.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS quote_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic for the same reason `celebration_events` (045) is: a
  -- pre-booked celebration lives in `events` or in `service_enquiries`
  -- depending which door the customer came through, and both are owed a
  -- price history.
  subject_type TEXT NOT NULL CHECK (subject_type IN ('event','enquiry')),
  subject_id   UUID NOT NULL,

  -- Which of the three moments in pricing.js CHECKPOINTS this is.
  checkpoint TEXT NOT NULL CHECK (checkpoint IN ('quoted','revision','final')),

  -- ── The money, in paise ───────────────────────────────────────────
  -- Split so the customer can see that the locked part did not move.
  -- Showing only a total would make a 3% food rise look like the whole
  -- quote had been reopened, which is the fear this design exists to
  -- remove.
  locked_paise   BIGINT NOT NULL CHECK (locked_paise   >= 0),
  floating_paise BIGINT NOT NULL CHECK (floating_paise >= 0),
  total_paise    BIGINT NOT NULL CHECK (total_paise    >= 0),

  -- The first quote, carried forward on every later row so the collar can
  -- be checked against it without walking the history. This is the number
  -- the +8% cap is measured from — not the previous revision, or the cap
  -- could be cleared 8% at a time.
  baseline_floating_paise BIGINT NOT NULL CHECK (baseline_floating_paise >= 0),

  -- What the index actually said, frozen. `data/marketRates.js` reports
  -- { live, stale, asOf, multipliers, basket }; all of it is stored,
  -- including `asOf: null` for a never-refreshed index, because "we had
  -- no live reading and used the baseline" is itself the honest record.
  market_index JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Whether the collar actually bit, and in which direction. When TRUE
  -- the business absorbed the difference, and that number is the cost of
  -- the promise — worth being able to total at the end of a season.
  collar_applied  BOOLEAN NOT NULL DEFAULT FALSE,
  collar_absorbed_paise BIGINT NOT NULL DEFAULT 0,

  -- The sentence the customer was sent. Stored rather than re-derived,
  -- for the same reason `celebration_events.customer_copy` is: the copy
  -- and the record cannot then drift, and "what were they told" survives
  -- a later edit to the template.
  customer_copy TEXT,

  -- Which components moved, for the itemised explanation:
  --   [{ component: 'provisions', from: 1.00, to: 1.043 }]
  movements JSONB NOT NULL DEFAULT '[]'::jsonb,

  pricing_version TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── The arithmetic closes ────────────────────────────────────────────
ALTER TABLE quote_revisions DROP CONSTRAINT IF EXISTS quote_revisions_total_balances;
ALTER TABLE quote_revisions ADD CONSTRAINT quote_revisions_total_balances
  CHECK (locked_paise + floating_paise = total_paise);

-- ── The collar, enforced rather than promised ────────────────────────
-- The floating part may never exceed the baseline by more than the cap in
-- pricing.js (8%). Written as a constraint because this is the one number
-- the customer was given a guarantee about, and a guarantee that lives
-- only in JavaScript is one refactor from being untrue.
--
-- 108 rather than 1.08 to keep it in integer arithmetic — a rounding
-- error in the check that enforces a promise would be a poor joke.
ALTER TABLE quote_revisions DROP CONSTRAINT IF EXISTS quote_revisions_collar_holds;
ALTER TABLE quote_revisions ADD CONSTRAINT quote_revisions_collar_holds
  CHECK (floating_paise * 100 <= baseline_floating_paise * 108);

-- One row per checkpoint per subject. A second 'final' would mean the
-- price the customer was told was final moved again.
CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_revisions_checkpoint
  ON quote_revisions (subject_type, subject_id, checkpoint);

CREATE INDEX IF NOT EXISTS idx_quote_revisions_subject
  ON quote_revisions (subject_type, subject_id, created_at);

-- The repricing cron's queue: what has been quoted but not yet revised.
CREATE INDEX IF NOT EXISTS idx_quote_revisions_pending_notice
  ON quote_revisions (created_at) WHERE notified_at IS NULL;

-- ── Append-only ──────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS quote_revisions_no_update ON quote_revisions;
CREATE TRIGGER quote_revisions_no_update
  BEFORE UPDATE OF checkpoint, locked_paise, floating_paise, total_paise,
                   baseline_floating_paise, market_index, customer_copy
  ON quote_revisions
  FOR EACH ROW EXECUTE FUNCTION public.escrow_ledger_is_append_only();

-- `notified_at` is deliberately NOT in that list: it is set once when the
-- message actually goes out, which is a fact learned after the row is
-- written, not a restatement of the price.

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE quote_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers read own quote revisions" ON quote_revisions;
CREATE POLICY "customers read own quote revisions"
  ON quote_revisions FOR SELECT
  USING (
    (subject_type = 'event' AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = subject_id AND e.customer_id = auth.uid()))
    OR
    (subject_type = 'enquiry' AND EXISTS (
      SELECT 1 FROM service_enquiries q WHERE q.id = subject_id AND q.customer_id = auth.uid()))
  );

DROP POLICY IF EXISTS "admins read quote revisions" ON quote_revisions;
CREATE POLICY "admins read quote revisions"
  ON quote_revisions FOR SELECT
  USING (get_my_role() IN ('admin','event_coordinator'));

-- No INSERT policy. Revisions are written by the repricing cron running
-- as the service role. A client that could insert one could restate its
-- own price downward.

COMMIT;
