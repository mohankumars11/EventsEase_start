-- ═══════════════════════════════════════════════════════════════════════
-- 155 · A referral that has to be earned
-- ═══════════════════════════════════════════════════════════════════════
--
-- Needs 154 (the campaign that sets the terms) and 140 (the adjustment
-- the reward is eventually paid through).
--
-- ══════════════════════════════════════════════════════════════════════
-- AN INSTALL IS NOT A REFERRAL
-- ══════════════════════════════════════════════════════════════════════
--
-- The cheap version of this counts sign-ups. It is also the version
-- that gets farmed within a week: one person, twenty SIM cards, twenty
-- accounts that never take a job, and a payout for nothing.
--
-- So a referral is a LIFECYCLE, and the reward sits at the far end of
-- it. Seven states, each one a thing that actually happened:
--
--   invited                     a code was shared
--   registered                  somebody signed up with it
--   onboarding_completed        they finished the six steps
--   verified                    a human approved them
--   live                        they can be offered work
--   first_event_completed       they delivered a real event
--   reward_unlocked             and only now does anybody get paid
--
-- The state that matters is `first_event_completed`. Everything before
-- it can be manufactured by one determined person with a phone. A
-- completed event cannot: it needs a customer who chose them, money
-- that moved through escrow, and a date that passed.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT THIS DELIBERATELY DOES NOT DO
-- ══════════════════════════════════════════════════════════════════════
--
-- It does not pay anybody. `reward_unlocked` means "this qualifies";
-- the money moves through `record_adjustment` (140), which is
-- operator-only and writes an auditable row with a reason on it. A
-- referral table that could move money would be a second payout path,
-- and the first thing a second payout path does is disagree with the
-- first.
--
-- It also never writes to `escrow_ledger`, which is append-only and
-- belongs to customer money.

BEGIN;

-- ── The code ──────────────────────────────────────────────────────────
-- On the vendor, not generated per share, so a partner can put one code
-- on a poster. Short, unambiguous, and free of the characters people
-- mishear over a phone: no O/0, no I/1/L.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_referral_code
  ON public.vendors (referral_code) WHERE referral_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- no O 0 I 1 L
  candidate TEXT;
  i INTEGER;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vendors WHERE referral_code = candidate);
  END LOOP;
  RETURN candidate;
END $$;

CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  referrer_id   UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  -- NULL until somebody actually signs up with the code.
  referred_id   UUID REFERENCES public.vendors(id) ON DELETE SET NULL,

  code          TEXT NOT NULL,
  promotion_id  UUID REFERENCES public.partner_promotions(id) ON DELETE SET NULL,

  state         TEXT NOT NULL DEFAULT 'invited' CHECK (state IN (
                  'invited', 'registered', 'onboarding_completed',
                  'verified', 'live', 'first_event_completed',
                  'reward_unlocked', 'rejected')),

  -- Why it was rejected. Operator-readable, never shown to the partner:
  -- telling somebody WHICH fraud signal caught them is telling them
  -- what to avoid next time.
  rejected_reason TEXT,

  first_line_id UUID REFERENCES public.booking_lines(id) ON DELETE SET NULL,
  adjustment_id UUID REFERENCES public.partner_adjustments(id) ON DELETE SET NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ── One referrer per referred partner, for ever ────────────────────
  -- Not "one per campaign". A partner is referred once; letting a
  -- second referrer claim them later is the loop that pays twice for
  -- one person.
  CONSTRAINT uq_referred_once UNIQUE (referred_id),

  -- ── You cannot refer yourself ──────────────────────────────────────
  -- The cheapest fraud there is, and a CHECK is the only place it
  -- cannot be forgotten.
  CONSTRAINT no_self_referral CHECK (referred_id IS NULL OR referred_id <> referrer_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_referrals_referrer
  ON public.partner_referrals (referrer_id, state);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_code
  ON public.partner_referrals (code);

COMMENT ON COLUMN public.partner_referrals.rejected_reason IS
  'Operator-only. Naming the signal that caught somebody teaches them what to avoid.';
COMMENT ON COLUMN public.partner_referrals.adjustment_id IS
  'Set when an operator pays it through record_adjustment(). This table never moves money itself.';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- Claiming a code, with the checks that make it worth something
-- ═══════════════════════════════════════════════════════════════════════
--
-- Called by the referred partner, once, during onboarding. Every refusal
-- returns the SAME sentence to the caller — "that code cannot be used on
-- this account" — while recording the real reason for an operator.
--
-- That asymmetry is the point. A person testing codes against a signup
-- form learns nothing from a uniform answer; a person told "duplicate
-- phone" knows exactly which knob to turn next.

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_referral_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me        public.vendors%ROWTYPE;
  v_referrer  public.vendors%ROWTYPE;
  v_code      TEXT := upper(trim(coalesce(p_code, '')));
  v_reason    TEXT := NULL;
  v_existing  UUID;
BEGIN
  SELECT * INTO v_me FROM public.vendors WHERE profile_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'says', 'Sign in first.');
  END IF;

  SELECT * INTO v_referrer FROM public.vendors WHERE referral_code = v_code;

  -- ── Every rejection, gathered before any is returned ───────────────
  IF v_referrer.id IS NULL THEN
    v_reason := 'unknown_code';
  ELSIF v_referrer.id = v_me.id THEN
    v_reason := 'self_referral';
  ELSIF EXISTS (SELECT 1 FROM public.partner_referrals WHERE referred_id = v_me.id) THEN
    v_reason := 'already_referred';

  -- ── Same phone as the referrer ─────────────────────────────────────
  -- One person with two accounts. Compared on digits only, because
  -- +91 98765 43210 and 9876543210 are the same phone and a string
  -- comparison says they are not.
  ELSIF v_me.contact_phone IS NOT NULL
    AND regexp_replace(v_me.contact_phone, '\D', '', 'g') <> ''
    AND right(regexp_replace(v_me.contact_phone,       '\D', '', 'g'), 10)
      = right(regexp_replace(coalesce(v_referrer.contact_phone, ''), '\D', '', 'g'), 10)
  THEN
    v_reason := 'shared_phone';

  -- ── Same identity document ─────────────────────────────────────────
  -- Only the last four are stored (the Aadhaar Act restricts holding
  -- the number), so this is a weak signal on its own and a strong one
  -- combined with the kind. It flags for review rather than proving
  -- anything, which is why the referral is REJECTED rather than the
  -- account being touched.
  ELSIF EXISTS (
    SELECT 1
      FROM public.vendor_documents a
      JOIN public.vendor_documents b
        ON b.kind = a.kind
       AND b.number_last4 = a.number_last4
       AND b.number_last4 IS NOT NULL
     WHERE a.vendor_id = v_me.id
       AND b.vendor_id = v_referrer.id
       AND a.kind IN ('aadhaar', 'pan', 'voter_id', 'passport', 'dl')
  ) THEN
    v_reason := 'shared_identity';

  -- ── Same payout destination ────────────────────────────────────────
  -- Two accounts, one bank account, is the shape of a farm regardless
  -- of whose name is on the documents.
  ELSIF EXISTS (
    SELECT 1
      FROM public.vendor_payout_details a
      JOIN public.vendor_payout_details b
        ON (a.upi_id IS NOT NULL AND a.upi_id = b.upi_id)
        OR (a.account_number IS NOT NULL AND a.account_number = b.account_number)
     WHERE a.vendor_id = v_me.id
       AND b.vendor_id = v_referrer.id
  ) THEN
    v_reason := 'shared_payout';
  END IF;

  IF v_reason IS NOT NULL THEN
    -- Recorded against the referrer when we know who that is, so a
    -- pattern of refused claims is visible to an operator.
    IF v_referrer.id IS NOT NULL THEN
      INSERT INTO public.partner_referrals (referrer_id, referred_id, code, state, rejected_reason)
      VALUES (v_referrer.id, NULL, v_code, 'rejected', v_reason);
    END IF;
    -- One sentence for every refusal. See the header.
    RETURN jsonb_build_object('ok', false, 'says', 'That code cannot be used on this account.');
  END IF;

  INSERT INTO public.partner_referrals (referrer_id, referred_id, code, state)
  VALUES (v_referrer.id, v_me.id, v_code, 'registered')
  RETURNING id INTO v_existing;

  RETURN jsonb_build_object('ok', true, 'id', v_existing,
                            'referrer', v_referrer.business_name);
END $$;

REVOKE ALL ON FUNCTION public.claim_referral_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral_code(TEXT) TO authenticated;

ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;

-- ── A partner sees the referrals they MADE ────────────────────────────
-- Not the ones where they are the referred party: "who invited me" is
-- not information the invited person needs, and exposing it makes the
-- code a way to look up another partner.
DROP POLICY IF EXISTS "partner reads own referrals" ON public.partner_referrals;
CREATE POLICY "partner reads own referrals"
  ON public.partner_referrals FOR SELECT TO authenticated
  USING (referrer_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators manage referrals" ON public.partner_referrals;
CREATE POLICY "operators manage referrals"
  ON public.partner_referrals FOR ALL TO authenticated
  USING (public.caller_is_operator()) WITH CHECK (public.caller_is_operator());

-- No INSERT or UPDATE for `authenticated`, on purpose. Rows are created
-- by claim_referral_code() as SECURITY DEFINER and advanced by the
-- server. A partner who could write this table could write themselves
-- to 'reward_unlocked'.
GRANT SELECT ON public.partner_referrals TO authenticated;
GRANT ALL    ON public.partner_referrals TO service_role;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- Moving a referral forward, from facts rather than from events
-- ═══════════════════════════════════════════════════════════════════════
--
-- Recomputed, not incremented — the same argument migration 132 makes
-- about `slots_booked`. The alternative is five call sites that must
-- agree for ever (signed up, finished onboarding, approved, went live,
-- delivered), and the first one anybody forgets leaves a real partner
-- stuck one step short of a reward they earned, with nothing on screen
-- explaining why.
--
-- This asks the question the state is supposed to answer and writes the
-- answer. Safe to run as often as anybody likes.

BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_referral_states()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moved INTEGER := 0;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RAISE EXCEPTION 'refresh_referral_states is operator-only';
  END IF;

  WITH facts AS (
    SELECT
      r.id,
      r.state AS was,
      CASE
        /* The far end, and the only one that costs money. A completed
           event needs a customer who chose them, money that moved
           through escrow, and a date that has passed -- none of which
           one person with twenty SIM cards can manufacture. */
        WHEN EXISTS (
          SELECT 1
            FROM public.dispatch_offers o
            JOIN public.booking_lines   l ON l.id = o.line_id
           WHERE o.vendor_id = r.referred_id
             AND o.status = 'ACCEPTED'
             AND l.status IN ('delivered', 'settled')
        ) THEN 'first_event_completed'

        WHEN v.is_verified AND v.accepting_jobs THEN 'live'
        WHEN v.is_verified                      THEN 'verified'
        WHEN v.verification_status = 'submitted' THEN 'onboarding_completed'
        ELSE 'registered'
      END AS should_be
      FROM public.partner_referrals r
      JOIN public.vendors v ON v.id = r.referred_id
     WHERE r.referred_id IS NOT NULL
       /* Terminal states are left alone. A reward already unlocked does
          not un-unlock because somebody paused their listing. */
       AND r.state NOT IN ('reward_unlocked', 'rejected')
  )
  UPDATE public.partner_referrals t
     SET state = f.should_be, updated_at = now()
    FROM facts f
   WHERE t.id = f.id
     AND f.should_be IS DISTINCT FROM f.was;

  GET DIAGNOSTICS v_moved = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'moved', v_moved);
END $$;

REVOKE ALL ON FUNCTION public.refresh_referral_states() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_referral_states() TO authenticated;

/**
 * How close is this partner to the reward?
 *
 * Read by the partner's own card. Returns counts and the configured
 * threshold — never the fraud signals, never another partner's name,
 * never why somebody was rejected.
 */
CREATE OR REPLACE FUNCTION public.referral_progress()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      UUID;
  v_promo   public.partner_promotions%ROWTYPE;
  v_needed  INTEGER;
  v_done    INTEGER;
  v_started INTEGER;
BEGIN
  SELECT id INTO v_me FROM public.vendors WHERE profile_id = auth.uid();
  IF v_me IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;

  SELECT * INTO v_promo
    FROM public.partner_promotions
   WHERE type = 'referral' AND active = true
     AND (start_at IS NULL OR start_at <= now())
     AND (end_at   IS NULL OR end_at   >  now())
   ORDER BY priority DESC, created_at DESC
   LIMIT 1;

  /* No configured campaign means no promise. The card does not render,
     rather than rendering with a blank where a number should be. */
  IF v_promo.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'campaign', NULL);
  END IF;

  v_needed := COALESCE((v_promo.qualification ->> 'minimum_referrals')::int, 1);

  SELECT
    count(*) FILTER (WHERE state = 'first_event_completed' OR state = 'reward_unlocked'),
    count(*) FILTER (WHERE state NOT IN ('rejected'))
    INTO v_done, v_started
    FROM public.partner_referrals
   WHERE referrer_id = v_me AND referred_id IS NOT NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'campaign', jsonb_build_object(
      'id', v_promo.id,
      'title', v_promo.title,
      'reward_paise', v_promo.reward_paise,
      'reward_type', v_promo.reward_type,
      'terms_url', v_promo.terms_url),
    'needed', v_needed,
    'qualified', v_done,
    'in_progress', GREATEST(0, v_started - v_done),
    'unlocked', v_done >= v_needed);
END $$;

REVOKE ALL ON FUNCTION public.referral_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_progress() TO authenticated;

COMMIT;
