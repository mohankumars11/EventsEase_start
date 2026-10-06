-- ══════════════════════════════════════════════════════════════════════
-- 146 · Enforcement is a policy, not a constant
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 144 and 145 first.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE PROBLEM WITH MANDATORY_FROM
-- ══════════════════════════════════════════════════════════════════════
--
-- `MANDATORY_FROM` in src/data/compliance.js is a single null. It makes
-- the requirement engine technically correct and operationally inert:
-- every requirement, including an FSSAI licence that is legally
-- required to serve food, renders as "Optional".
--
-- Setting it to a date would be worse in a different way. It is one
-- switch for twenty-six trades in every market, so turning FSSAI on for
-- caterers in Bengaluru would simultaneously demand a PSARA licence from
-- every security partner and vehicle papers from every transport
-- partner, on the same morning, retroactively.
--
-- What is actually wanted is a POLICY: this requirement, for this trade,
-- in this market, from this date. Then FSSAI can go mandatory at launch
-- while everything else stays advisory, and a partner who onboarded
-- before the date is not retrospectively non-compliant.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE JS STAYS AS THE FALLBACK
-- ══════════════════════════════════════════════════════════════════════
--
-- `requirementsFor()` already takes `mandatoryFrom` as an injected
-- parameter -- that was the seam. The app reads this table when it
-- exists and falls back to the module's constant when it does not,
-- which is the same `missingRelation` degradation useEarnings uses. A
-- device ahead of the database behaves exactly as it does today.
--
-- Re-runnable. Seeds nothing: an empty policy table means nothing is
-- mandatory, which is precisely today's behaviour.

BEGIN;

CREATE TABLE IF NOT EXISTS public.verification_policy (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  /* NULL means "everywhere" / "every trade" / "every service". A policy
     row is a rule with holes in it, and the holes are wildcards -- one
     row can say "FSSAI is mandatory for everybody from 1 March" or
     "PSARA is mandatory for Security Services in Bengaluru only". */
  market         TEXT,
  trade          TEXT,
  service        TEXT,
  requirement_id TEXT NOT NULL,

  mandatory_from  DATE,
  effective_until DATE,

  /* Bumped when the WORDING of what is required changes, not when a
     date moves. A partner who satisfied v1 is held to v1. The same
     discipline partnerTerms.js documents for the terms version. */
  version        INTEGER NOT NULL DEFAULT 1,

  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  CONSTRAINT verification_policy_dates_make_sense
    CHECK (effective_until IS NULL OR mandatory_from IS NULL
           OR effective_until >= mandatory_from)
);

/* One live rule per (market, trade, service, requirement). Two rows
   saying different things about the same requirement is a question with
   two answers, and whichever the query happened to return first would
   win. COALESCE because NULL is a wildcard here, not "unknown", and
   NULLs do not compare equal in a unique index. */
CREATE UNIQUE INDEX IF NOT EXISTS uq_verification_policy_scope
  ON public.verification_policy (
    COALESCE(market, '*'), COALESCE(trade, '*'),
    COALESCE(service, '*'), requirement_id);

CREATE INDEX IF NOT EXISTS idx_verification_policy_requirement
  ON public.verification_policy (requirement_id);

/**
 * Is this requirement mandatory here, now?
 *
 * Specificity wins: a rule naming the trade beats a wildcard, so
 * "FSSAI everywhere from March" can be overridden by "FSSAI in Mysuru
 * from June" without deleting the first.
 */
CREATE OR REPLACE FUNCTION public.requirement_is_mandatory(
  p_requirement_id TEXT,
  p_trade TEXT DEFAULT NULL,
  p_market TEXT DEFAULT NULL,
  p_service TEXT DEFAULT NULL,
  p_on DATE DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT p.mandatory_from IS NOT NULL
       AND p.mandatory_from <= COALESCE(p_on, (now() AT TIME ZONE 'Asia/Kolkata')::date)
       AND (p.effective_until IS NULL
            OR p.effective_until >= COALESCE(p_on, (now() AT TIME ZONE 'Asia/Kolkata')::date))
    FROM public.verification_policy p
    WHERE p.requirement_id = p_requirement_id
      AND (p.market  IS NULL OR p.market  = p_market)
      AND (p.trade   IS NULL OR p.trade   = p_trade)
      AND (p.service IS NULL OR p.service = p_service)
    ORDER BY
      (p.service IS NOT NULL)::int DESC,
      (p.trade   IS NOT NULL)::int DESC,
      (p.market  IS NOT NULL)::int DESC
    LIMIT 1
  ), FALSE)
$$;

/** Everything in force, for the app to read in one round trip. */
CREATE OR REPLACE VIEW public.verification_policy_live
WITH (security_invoker = on) AS
  SELECT requirement_id, market, trade, service, mandatory_from, effective_until, version
  FROM public.verification_policy
  WHERE mandatory_from IS NOT NULL
    AND mandatory_from <= (now() AT TIME ZONE 'Asia/Kolkata')::date
    AND (effective_until IS NULL
         OR effective_until >= (now() AT TIME ZONE 'Asia/Kolkata')::date);

-- ══════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════
--
-- Every authenticated partner READS this -- it is the rulebook they are
-- being held to, and a rule nobody can read is not a rule. Only an
-- operator writes it.
ALTER TABLE public.verification_policy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anybody signed in reads the policy" ON public.verification_policy;
CREATE POLICY "anybody signed in reads the policy"
  ON public.verification_policy FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "operators write the policy" ON public.verification_policy;
CREATE POLICY "operators write the policy"
  ON public.verification_policy FOR ALL
  USING (public.caller_is_operator())
  WITH CHECK (public.caller_is_operator());

GRANT SELECT ON public.verification_policy_live TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- DELIBERATELY NOT SEEDED
-- ══════════════════════════════════════════════════════════════════════
--
-- An empty table means nothing is mandatory, which is exactly today's
-- behaviour -- so applying this migration changes nothing for anybody
-- until somebody decides a date.
--
-- When you are ready, the first row is likely:
--
--   INSERT INTO public.verification_policy
--     (requirement_id, trade, mandatory_from, note)
--   VALUES
--     ('VER-TRADE-FSSAI', 'Catering & Food', DATE '2026-11-01',
--      'Serving food without one is an offence.');
--
-- and the identity one, which applies to everybody:
--
--   INSERT INTO public.verification_policy
--     (requirement_id, mandatory_from, note)
--   VALUES
--     ('VER-ID-IDENTITY', DATE '2026-11-01',
--      'A customer is letting this person into their home.');

COMMIT;
