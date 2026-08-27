-- ============================================================
-- 064 · disputes — when it goes wrong, and the money stops moving
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057–062 FIRST.
--
-- ── Why this is load-bearing rather than a nicety ────────────────────
-- Instant booking commits real money against a spec that is not final:
-- a `discuss` service is priced for "a standard setup at this scale" and
-- the detail is agreed on the partner's first call. That gap is designed
-- and it is honest, and it is also exactly where the arguments will be.
--
-- The business model makes it worse, not better. Sambramo holds the
-- customer's money until T+24h after the event. So on the one day when a
-- decorator and a family disagree about what "standard" meant, the
-- platform is not a bystander — it is holding ₹12,400 that both of them
-- believe is theirs. There is no version of this product without a
-- dispute process, and a dispute process invented during the first
-- dispute is invented badly.
--
-- ── Either side raises. That is the point ────────────────────────────
-- Every marketplace builds the customer's complaint form first and the
-- partner's second or never. The partner's case — turned up and the venue
-- was locked; the family added forty guests on the morning; the address
-- was wrong — is exactly as real, and a partner with no way to say it
-- leaves the platform after the first bad Saturday. Supply is the scarce
-- side here, so this table is symmetric by construction: `raised_by` is
-- the only thing that differs.
--
-- ── Raising a dispute FREEZES the line and nothing else ──────────────
-- `release_escrow` skips any line with an open dispute. The freeze is per
-- line, so a cake nobody delivered does not hold up the photographer's
-- payout on the same wedding — the reason `booking_lines` is the unit of
-- everything (059).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS disputes (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES booking_lines(id) ON DELETE RESTRICT,

  -- RESTRICT: a line under dispute must not be deletable out from under
  -- the argument.

  raised_by TEXT NOT NULL CHECK (raised_by IN ('customer','partner')),
  raiser_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Categories both sides can actually recognise in their own situation.
  -- Deliberately not a free-text-only box: an untyped queue cannot be
  -- triaged, and "not as described" versus "did not turn up" call for
  -- completely different first questions.
  reason TEXT NOT NULL CHECK (reason IN (
    'not_delivered',      -- nobody came
    'quality',            -- came, not what was agreed
    'not_as_described',   -- the `discuss` gap, named honestly
    'late',
    'partial',
    'damage',
    'customer_unavailable',   -- partner-side: nobody at the venue
    'scope_changed',          -- partner-side: the job grew on the day
    'access_denied',          -- partner-side: could not get in
    'other'
  )),

  detail       TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',

  -- ── Where it is ───────────────────────────────────────────────────
  -- `awaiting_other_side` is a real state, not a nicety: most disputes
  -- are a misunderstanding, and the fastest resolution is the other party
  -- answering before anybody at Sambramo reads it.
  status TEXT NOT NULL DEFAULT 'open'
         CHECK (status IN ('open','awaiting_other_side','under_review',
                           'resolved','withdrawn')),

  -- ── How it ended ──────────────────────────────────────────────────
  -- `split` exists because most real outcomes are one. A decorator who
  -- did three-quarters of what was agreed is neither a refund nor a full
  -- payout, and an outcome vocabulary that cannot say so pushes every
  -- messy case into whichever extreme the reviewer prefers.
  resolution TEXT CHECK (resolution IS NULL OR resolution IN (
    'refund_customer_full',
    'refund_customer_partial',
    'release_partner_full',
    'split',
    'no_action'
  )),
  resolution_note   TEXT,
  refund_paise      BIGINT CHECK (refund_paise IS NULL OR refund_paise >= 0),
  partner_paise     BIGINT CHECK (partner_paise IS NULL OR partner_paise >= 0),

  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- ── The SLA clock ─────────────────────────────────────────────────
  -- Stored rather than computed, because the promise made to a customer
  -- on the day they raised it must not change when the policy does.
  respond_by TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  resolve_by TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '72 hours'),

  policy_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── One open dispute per line per side ───────────────────────────────
-- A customer may raise once while one is open; they may raise again after
-- it resolves. Without this, a frustrated tap-tap-tap becomes four rows
-- and four SLA clocks on the same argument.
CREATE UNIQUE INDEX IF NOT EXISTS uq_disputes_one_open_per_side
  ON disputes (line_id, raised_by)
  WHERE status IN ('open','awaiting_other_side','under_review');

-- ── A resolution has to say where the money went ─────────────────────
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_resolution_is_complete;
ALTER TABLE disputes ADD CONSTRAINT disputes_resolution_is_complete
  CHECK (
    status <> 'resolved'
    OR (resolution IS NOT NULL AND resolved_at IS NOT NULL)
  );

-- A split has to state both halves.
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_split_states_both;
ALTER TABLE disputes ADD CONSTRAINT disputes_split_states_both
  CHECK (
    resolution IS DISTINCT FROM 'split'
    OR (refund_paise IS NOT NULL AND partner_paise IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_disputes_line ON disputes (line_id, created_at DESC);

-- The admin queue: what is open, most overdue first.
CREATE INDEX IF NOT EXISTS idx_disputes_queue
  ON disputes (resolve_by)
  WHERE status IN ('open','awaiting_other_side','under_review');

DROP TRIGGER IF EXISTS disputes_updated_at ON disputes;
CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- The freeze, as a database fact rather than a query everyone remembers
-- ══════════════════════════════════════════════════════════════════════
-- `release_escrow` must skip a disputed line. Expressing that as "and not
-- exists (select ... )" in every caller is how one caller eventually
-- forgets and pays out money that was under argument.
CREATE OR REPLACE FUNCTION public.line_is_disputed(p_line_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM disputes
    WHERE line_id = p_line_id
      AND status IN ('open','awaiting_other_side','under_review')
  )
$$;

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties read own disputes" ON disputes;
CREATE POLICY "parties read own disputes"
  ON disputes FOR SELECT
  USING (
    raiser_id = auth.uid()
    -- The other side reads it too. A partner accused of not turning up
    -- who cannot see the accusation cannot answer it, and a one-sided
    -- process is not a process.
    OR EXISTS (
      SELECT 1 FROM booking_lines l
      JOIN booking_requests r ON r.id = l.request_id
      WHERE l.id = line_id AND r.customer_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM booking_lines l
      JOIN dispatch_offers o ON o.id = l.accepted_offer_id
      JOIN vendors v ON v.id = o.vendor_id
      WHERE l.id = line_id AND v.profile_id = auth.uid())
  );

-- Either party may raise one, on a line they are actually part of.
DROP POLICY IF EXISTS "parties raise disputes" ON disputes;
CREATE POLICY "parties raise disputes"
  ON disputes FOR INSERT
  WITH CHECK (
    raiser_id = auth.uid()
    AND (
      (raised_by = 'customer' AND EXISTS (
        SELECT 1 FROM booking_lines l
        JOIN booking_requests r ON r.id = l.request_id
        WHERE l.id = line_id AND r.customer_id = auth.uid()))
      OR
      (raised_by = 'partner' AND EXISTS (
        SELECT 1 FROM booking_lines l
        JOIN dispatch_offers o ON o.id = l.accepted_offer_id
        JOIN vendors v ON v.id = o.vendor_id
        WHERE l.id = line_id AND v.profile_id = auth.uid()))
    )
  );

-- Nobody but an admin may UPDATE. In particular neither party can write
-- `resolution` — deciding who was right is the one thing that cannot be
-- done by a participant.
DROP POLICY IF EXISTS "admins manage disputes" ON disputes;
CREATE POLICY "admins manage disputes"
  ON disputes FOR ALL
  USING (get_my_role() IN ('admin','event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin','event_coordinator'));

COMMIT;
