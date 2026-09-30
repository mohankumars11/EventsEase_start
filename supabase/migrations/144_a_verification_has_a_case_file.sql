-- ══════════════════════════════════════════════════════════════════════
-- 144 · A verification has a case file
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 142 and 143 first.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT IS MISSING
-- ══════════════════════════════════════════════════════════════════════
--
-- Today a verification is a set of rows on `vendor_documents` and a
-- status on `vendors`. That records the CURRENT state and nothing about
-- how it was reached: who checked what, when, with which provider, what
-- the provider said, and whether this is the first attempt or the
-- fourth.
--
-- So an operator asked "why is this partner still waiting" has to
-- reconstruct it from timestamps, and a partner asking "what happened
-- to my application" gets an answer somebody guessed.
--
-- Three tables, each a different question:
--
--   verification_cases     one review cycle. Opens when a partner
--                          submits, closes when a decision is made.
--   verification_attempts  one check. A provider call, an upload, a
--                          human decision. Many per case.
--   verification_events    the raw provider exchange, append-only, for
--                          reconciliation when a provider disputes.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A CASE AND NOT JUST MORE COLUMNS ON vendors
-- ══════════════════════════════════════════════════════════════════════
--
-- A partner can be reviewed more than once: rejected, fixed,
-- resubmitted. Columns on `vendors` hold the latest and silently lose
-- the previous, so "this is their third application" -- which is the
-- single most useful thing an operator can know -- becomes unanswerable.
--
-- Re-runnable.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- THE CASE
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.verification_cases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  status        TEXT NOT NULL DEFAULT 'in_progress'
                CHECK (status IN (
                  'in_progress',     -- the partner is still filling it in
                  'submitted',       -- with us, clock running
                  'verifying',       -- provider checks in flight
                  'manual_review',   -- a person has to look
                  'requires_action', -- back with the partner
                  'verified',        -- every requirement satisfied
                  'rejected'         -- refused, with a reason
                )),

  -- Which attempt this is. A fourth application is a different
  -- conversation from a first, and an operator should see that without
  -- counting rows.
  attempt_no    INTEGER NOT NULL DEFAULT 1,
  supersedes_id UUID REFERENCES public.verification_cases(id),

  -- The 24-hour clock from 142, per case rather than per partner, so a
  -- resubmission gets its own deadline and the original is preserved.
  submitted_at  TIMESTAMPTZ,
  review_due_at TIMESTAMPTZ,
  decided_at    TIMESTAMPTZ,
  decided_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- What the partner is told. NOT the internal reasoning.
  decision_note TEXT,

  risk_band     TEXT CHECK (risk_band IS NULL OR risk_band IN ('LOW','MEDIUM','HIGH')),
  risk_score    INTEGER,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One open case per partner. A second would mean two clocks and two
-- answers to "where is my application".
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_open_case_per_vendor
  ON public.verification_cases (vendor_id)
  WHERE status NOT IN ('verified', 'rejected');

CREATE INDEX IF NOT EXISTS idx_cases_queue
  ON public.verification_cases (status, review_due_at)
  WHERE status IN ('submitted', 'verifying', 'manual_review');

-- ══════════════════════════════════════════════════════════════════════
-- THE ATTEMPTS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.verification_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID NOT NULL REFERENCES public.verification_cases(id) ON DELETE CASCADE,
  vendor_id     UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  document_id   UUID REFERENCES public.vendor_documents(id) ON DELETE SET NULL,
  requirement_id TEXT,

  kind          TEXT NOT NULL CHECK (kind IN (
                  'upload', 'quality', 'checksum', 'ocr',
                  'identity', 'business', 'face', 'bank',
                  'name_match', 'risk', 'human')),

  outcome       TEXT NOT NULL CHECK (outcome IN (
                  'pass', 'fail', 'inconclusive', 'unavailable', 'skipped')),

  -- The provider vocabulary from 142, where a provider was involved.
  provider_name   TEXT,
  provider_status TEXT,
  provider_ref    TEXT,

  -- What the partner was told, and what the operator can see.
  says          TEXT,
  detail        JSONB,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_case
  ON public.verification_attempts (case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_document
  ON public.verification_attempts (document_id) WHERE document_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════
-- THE RAW EXCHANGE
-- ══════════════════════════════════════════════════════════════════════
--
-- Append-only, operator-only, and NEVER shown to a customer or a
-- partner. A provider response can contain more about a person than
-- Sambramo asked for, and the place to keep that is behind an operator
-- policy with no update path.
CREATE TABLE IF NOT EXISTS public.verification_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id  UUID REFERENCES public.verification_attempts(id) ON DELETE SET NULL,
  vendor_id   UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  provider    TEXT,
  direction   TEXT NOT NULL CHECK (direction IN ('request', 'response', 'webhook')),
  reference   TEXT,
  payload     JSONB,
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_events_attempt
  ON public.verification_events (attempt_id, at DESC);

CREATE OR REPLACE FUNCTION public.verification_events_are_append_only()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION
    'verification_events is append-only: a % would erase the exchange it exists to keep', TG_OP
    USING HINT = 'Write a new row. See the header of migration 144.';
END $$;

DROP TRIGGER IF EXISTS verification_events_no_update ON public.verification_events;
CREATE TRIGGER verification_events_no_update
  BEFORE UPDATE OR DELETE ON public.verification_events
  FOR EACH ROW EXECUTE FUNCTION public.verification_events_are_append_only();

-- ══════════════════════════════════════════════════════════════════════
-- RISK SIGNALS
-- ══════════════════════════════════════════════════════════════════════
--
-- Stored rather than recomputed, because the facts behind a signal
-- change: a duplicate document stops being duplicated when the other
-- account is closed, and an operator reading a decision six months later
-- needs to see what was true when it was made.
CREATE TABLE IF NOT EXISTS public.risk_signals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id    UUID REFERENCES public.verification_cases(id) ON DELETE CASCADE,
  vendor_id  UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  signal     TEXT NOT NULL,
  weight     INTEGER NOT NULL DEFAULT 0,
  detail     TEXT,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_signals_case
  ON public.risk_signals (case_id, at DESC);

-- ══════════════════════════════════════════════════════════════════════
-- THE AUDIT
-- ══════════════════════════════════════════════════════════════════════
--
-- Same shape as `money_audit` (136): append-only, operator-read-only,
-- written only by SECURITY DEFINER functions. A verification decision
-- is the other thing in this product that must be answerable months
-- later.
CREATE TABLE IF NOT EXISTS public.verification_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role   TEXT,
  action       TEXT NOT NULL CHECK (action IN (
                 'case_opened', 'case_submitted', 'case_verified',
                 'case_rejected', 'case_requires_action', 'case_reviewed',
                 'document_accepted', 'document_rejected',
                 'provider_checked', 'risk_scored')),
  vendor_id    UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  case_id      UUID REFERENCES public.verification_cases(id) ON DELETE SET NULL,
  document_id  UUID REFERENCES public.vendor_documents(id) ON DELETE SET NULL,
  before       JSONB,
  after        JSONB,
  reason       TEXT
);

CREATE INDEX IF NOT EXISTS idx_verification_audit_vendor
  ON public.verification_audit (vendor_id, at DESC);

CREATE OR REPLACE FUNCTION public.verification_audit_is_append_only()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION
    'verification_audit is append-only: a % would erase the record it exists to keep', TG_OP
    USING HINT = 'Write a new row. See the header of migration 144.';
END $$;

DROP TRIGGER IF EXISTS verification_audit_no_update ON public.verification_audit;
CREATE TRIGGER verification_audit_no_update
  BEFORE UPDATE OR DELETE ON public.verification_audit
  FOR EACH ROW EXECUTE FUNCTION public.verification_audit_is_append_only();

CREATE OR REPLACE FUNCTION public.write_verification_audit(
  p_action      TEXT,
  p_vendor_id   UUID DEFAULT NULL,
  p_case_id     UUID DEFAULT NULL,
  p_document_id UUID DEFAULT NULL,
  p_before      JSONB DEFAULT NULL,
  p_after       JSONB DEFAULT NULL,
  p_reason      TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.verification_audit (
    actor_id, actor_role, action, vendor_id, case_id, document_id,
    before, after, reason)
  VALUES (
    auth.uid(),
    COALESCE(public.get_my_role(),
             CASE WHEN auth.role() = 'service_role' THEN 'service_role' END),
    p_action, p_vendor_id, p_case_id, p_document_id, p_before, p_after, p_reason)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.write_verification_audit(TEXT, UUID, UUID, UUID, JSONB, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_verification_audit(TEXT, UUID, UUID, UUID, JSONB, JSONB, TEXT) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════
--
-- A partner may read their OWN case and attempts -- "what happened to
-- my application" is a question they are entitled to an answer to, and
-- a queue nobody can see from the outside is how support tickets are
-- made. They may not read the raw provider exchange or the audit.
ALTER TABLE public.verification_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case owner reads" ON public.verification_cases;
CREATE POLICY "case owner reads" ON public.verification_cases FOR SELECT
  USING (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators manage cases" ON public.verification_cases;
CREATE POLICY "operators manage cases" ON public.verification_cases FOR ALL
  USING (public.caller_is_operator()) WITH CHECK (public.caller_is_operator());

DROP POLICY IF EXISTS "attempt owner reads" ON public.verification_attempts;
CREATE POLICY "attempt owner reads" ON public.verification_attempts FOR SELECT
  USING (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators manage attempts" ON public.verification_attempts;
CREATE POLICY "operators manage attempts" ON public.verification_attempts FOR ALL
  USING (public.caller_is_operator()) WITH CHECK (public.caller_is_operator());

-- Operators only. No partner read, no write policy for anybody.
DROP POLICY IF EXISTS "operators read the raw exchange" ON public.verification_events;
CREATE POLICY "operators read the raw exchange" ON public.verification_events FOR SELECT
  USING (public.caller_is_operator());

DROP POLICY IF EXISTS "operators read risk signals" ON public.risk_signals;
CREATE POLICY "operators read risk signals" ON public.risk_signals FOR SELECT
  USING (public.caller_is_operator());

DROP POLICY IF EXISTS "operators write risk signals" ON public.risk_signals;
CREATE POLICY "operators write risk signals" ON public.risk_signals FOR INSERT
  WITH CHECK (public.caller_is_operator());

DROP POLICY IF EXISTS "operators read the verification audit" ON public.verification_audit;
CREATE POLICY "operators read the verification audit" ON public.verification_audit FOR SELECT
  USING (public.caller_is_operator());

COMMIT;
