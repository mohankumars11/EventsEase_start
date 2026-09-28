-- ═══════════════════════════════════════════════════════════════════════
-- 158 · A referral you can follow
-- ═══════════════════════════════════════════════════════════════════════
--
-- Needs 106 (listing_trades), 091 (payout_claims), 140 (partner_adjustments),
-- 154 (partner_promotions) and 155 (partner_referrals). Forward-only and
-- safe to paste twice: IF NOT EXISTS / CREATE OR REPLACE throughout, and
-- no row of 155's table is deleted or rewritten except to fill the new
-- columns.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT 155 LEFT UNFINISHED
-- ══════════════════════════════════════════════════════════════════════
--
--   nobody claimed    claim_referral_code() existed and no screen called
--                     it, so no partner was ever attributed to anybody.
--
--   nothing advanced  refresh_referral_states() was operator-only and
--                     nothing ran it: no cron, no trigger. Every count on
--                     the Trade Champion screen was a true zero.
--
--   no trade          one code per partner, so "invite a photographer"
--                     and "invite a caterer" were the same share, and the
--                     26-trade screen had nothing to count.
--
--   no invitation     sharing wrote nothing. An invite existed only in a
--                     WhatsApp chat.
--
--   paid was a state  `reward_unlocked` meant "qualifies", and the card
--                     under it said "added to your next payout" -- which
--                     nobody had decided.
--
--   a leak            155 granted SELECT on the whole row to the referrer,
--                     and the row carries `rejected_reason`: the fraud
--                     signal 155's own header says must never be shown.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE SHAPE
-- ══════════════════════════════════════════════════════════════════════
--
-- An INVITATION is a row: one referrer, one trade (listing_trades.id,
-- SBM-TRD-001..026), one eight-character code, claimable once, sixty
-- days. Creating one is not a referral and is never counted as one.
--
-- A REFERRAL is a claimed invitation (or a claimed legacy six-character
-- partner code). Each milestone is a timestamp stamped once, from the
-- same facts 155 used, by one function. `state` stays for compatibility
-- and is derived from the stamps.
--
-- The REWARD is a separate column that only ever moves forward:
--
--   not_eligible     no campaign, or the campaign's terms not met yet
--   eligible         the terms are met. Nobody has been paid.
--   payout_recorded  an operator attached a partner_adjustments credit
--   paid             that credit was carried by a payout_claims row an
--                    operator marked paid. Money moved.
--
-- `paid` is written by nothing but the refresh, and only from that fact.

BEGIN;

-- ── Invitations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_referral_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  trade_id        TEXT NOT NULL REFERENCES public.listing_trades(id),
  -- Eight characters, where a partner code is six, so a claim can tell
  -- which it was handed without a prefix a person would mistype.
  code            TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z2-9]{8}$'),
  campaign_id     UUID REFERENCES public.partner_promotions(id) ON DELETE SET NULL,
  -- A retry after a dropped connection returns the invitation it already
  -- made rather than a second one.
  idempotency_key UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '60 days',
  claimed_at      TIMESTAMPTZ,
  claimed_by      UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  CONSTRAINT uq_invite_idempotency UNIQUE (referrer_id, idempotency_key),
  CONSTRAINT invite_not_self CHECK (claimed_by IS NULL OR claimed_by <> referrer_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_invites_referrer
  ON public.partner_referral_invites (referrer_id, trade_id, created_at DESC);

ALTER TABLE public.partner_referral_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner reads own invites" ON public.partner_referral_invites;
CREATE POLICY "partner reads own invites"
  ON public.partner_referral_invites FOR SELECT TO authenticated
  USING (referrer_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators manage invites" ON public.partner_referral_invites;
CREATE POLICY "operators manage invites"
  ON public.partner_referral_invites FOR ALL TO authenticated
  USING (public.caller_is_operator()) WITH CHECK (public.caller_is_operator());

-- Written only by create_referral_invite() and claim_referral_code().
REVOKE ALL ON public.partner_referral_invites FROM anon, authenticated;
GRANT SELECT ON public.partner_referral_invites TO authenticated;
GRANT ALL    ON public.partner_referral_invites TO service_role;

-- ── The referral, with its trade and its milestones ──────────────────
-- `promotion_id` (155) is the campaign. Not duplicated.
ALTER TABLE public.partner_referrals
  ADD COLUMN IF NOT EXISTS invite_id  UUID REFERENCES public.partner_referral_invites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trade_id   TEXT REFERENCES public.listing_trades(id),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS live_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qualified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reward_status  TEXT NOT NULL DEFAULT 'not_eligible',
  ADD COLUMN IF NOT EXISTS paid_at        TIMESTAMPTZ;

ALTER TABLE public.partner_referrals DROP CONSTRAINT IF EXISTS partner_referrals_reward_status_valid;
ALTER TABLE public.partner_referrals ADD CONSTRAINT partner_referrals_reward_status_valid
  CHECK (reward_status IN ('not_eligible', 'eligible', 'payout_recorded', 'paid'));

-- A recorded or paid reward always names the adjustment that carries it,
-- and `paid_at` exists exactly when it is paid. CHECKs, so not even an
-- operator's hand-written UPDATE can skip them.
ALTER TABLE public.partner_referrals DROP CONSTRAINT IF EXISTS partner_referrals_payout_is_backed;
ALTER TABLE public.partner_referrals ADD CONSTRAINT partner_referrals_payout_is_backed
  CHECK (reward_status NOT IN ('payout_recorded', 'paid') OR adjustment_id IS NOT NULL);
ALTER TABLE public.partner_referrals DROP CONSTRAINT IF EXISTS partner_referrals_paid_has_date;
ALTER TABLE public.partner_referrals ADD CONSTRAINT partner_referrals_paid_has_date
  CHECK ((reward_status = 'paid') = (paid_at IS NOT NULL));

-- One referral per invitation.
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_referrals_invite
  ON public.partner_referrals (invite_id) WHERE invite_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_referrals_referrer_trade
  ON public.partner_referrals (referrer_id, trade_id);

-- Backfill, once: rows 155 wrote have no claim time and no trade. The
-- referred partner's own trade is the best answer available for them.
UPDATE public.partner_referrals r
   SET claimed_at = r.created_at
 WHERE r.claimed_at IS NULL AND r.referred_id IS NOT NULL;

UPDATE public.partner_referrals r
   SET trade_id = t.id
  FROM public.vendors v
  JOIN public.listing_trades t ON t.name = v.category
 WHERE r.trade_id IS NULL AND v.id = r.referred_id;

-- ── Close 155's read leak ────────────────────────────────────────────
-- Column grants: a direct SELECT reaches everything a partner may see and
-- cannot reach `rejected_reason`. The screens read through the functions
-- below; this is so that a hand-made query cannot do better than they do.
REVOKE SELECT ON public.partner_referrals FROM authenticated;
GRANT SELECT (id, referrer_id, referred_id, code, promotion_id, state,
              first_line_id, adjustment_id, created_at, updated_at,
              invite_id, trade_id, claimed_at, onboarding_completed_at,
              verified_at, live_at, first_event_at, qualified_at,
              reward_status, paid_at)
  ON public.partner_referrals TO authenticated;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- Who may write what
-- ═══════════════════════════════════════════════════════════════════════
--
-- The functions below mark their own writes with a transaction-local
-- setting, `sambramo.referral_internal`. PostgREST exposes no way for a
-- client to set it (set_config lives in pg_catalog, which is not an
-- exposed schema, and every request is its own transaction), so it is
-- the one signal that a write came from here and not from a hand.

BEGIN;

CREATE OR REPLACE FUNCTION public._referral_internal()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(current_setting('sambramo.referral_internal', true), '') = 'on'
$$;

-- ── A partner's own code is not theirs to type ───────────────────────
-- The old screen minted a code and then wrote it with a plain UPDATE on
-- `vendors`. That is a partner choosing their own code: they could take
-- a vanity string, or swap codes after sharing one. Pinned here in its
-- own trigger rather than inside guard_vendor_self_verify, whose header
-- (124) explains why re-replacing that function is how history gets
-- silently reverted.
CREATE OR REPLACE FUNCTION public.vendors_pin_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() OR public._referral_internal() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.referral_code := NULL;
  ELSE
    NEW.referral_code := OLD.referral_code;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS vendors_pin_referral_code ON public.vendors;
CREATE TRIGGER vendors_pin_referral_code
  BEFORE INSERT OR UPDATE OF referral_code ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.vendors_pin_referral_code();

-- ── Nothing but these functions moves a referral ─────────────────────
-- Operators keep "operators manage referrals" (155), and may still mark
-- a row rejected with a reason. They may not stamp a milestone, attach a
-- trade, or touch the reward by hand: a milestone is a fact, and a
-- reward goes through record_referral_payout(), which checks the money.
CREATE OR REPLACE FUNCTION public.partner_referrals_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public._referral_internal() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'partner_referrals rows are created by claim_referral_code()';
  END IF;

  -- The ON DELETE SET NULL foreign keys may go NULL: Postgres applies
  -- them as an UPDATE that fires this trigger, and refusing it would make
  -- a vendor, a promotion or a booking line impossible to delete.
  IF NEW.referrer_id  IS DISTINCT FROM OLD.referrer_id
  OR (NEW.referred_id  IS DISTINCT FROM OLD.referred_id AND NEW.referred_id IS NOT NULL)
  OR (NEW.invite_id    IS DISTINCT FROM OLD.invite_id AND NEW.invite_id IS NOT NULL)
  OR NEW.trade_id     IS DISTINCT FROM OLD.trade_id
  OR NEW.code         IS DISTINCT FROM OLD.code
  OR NEW.claimed_at   IS DISTINCT FROM OLD.claimed_at
  OR NEW.onboarding_completed_at IS DISTINCT FROM OLD.onboarding_completed_at
  OR NEW.verified_at    IS DISTINCT FROM OLD.verified_at
  OR NEW.live_at        IS DISTINCT FROM OLD.live_at
  OR NEW.first_event_at IS DISTINCT FROM OLD.first_event_at
  OR (NEW.first_line_id  IS DISTINCT FROM OLD.first_line_id AND NEW.first_line_id IS NOT NULL)
  OR NEW.qualified_at   IS DISTINCT FROM OLD.qualified_at
  OR NEW.reward_status  IS DISTINCT FROM OLD.reward_status
  OR (NEW.adjustment_id  IS DISTINCT FROM OLD.adjustment_id AND NEW.adjustment_id IS NOT NULL)
  OR NEW.paid_at        IS DISTINCT FROM OLD.paid_at
  OR (NEW.promotion_id   IS DISTINCT FROM OLD.promotion_id AND NEW.promotion_id IS NOT NULL) THEN
    RAISE EXCEPTION 'referral milestones and rewards are derived, not written'
      USING HINT = 'Reject with state = ''rejected''; pay with record_referral_payout().';
  END IF;

  -- The one hand-made move left: rejecting. Not un-rejecting a paid one.
  IF NEW.state IS DISTINCT FROM OLD.state AND NEW.state <> 'rejected' THEN
    RAISE EXCEPTION 'only rejection is set by hand; the other states are derived';
  END IF;
  IF NEW.state = 'rejected' AND OLD.reward_status IN ('payout_recorded', 'paid') THEN
    RAISE EXCEPTION 'a referral that has been paid is reversed through its adjustment, not rejected';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS partner_referrals_guard ON public.partner_referrals;
CREATE TRIGGER partner_referrals_guard
  BEFORE INSERT OR UPDATE ON public.partner_referrals
  FOR EACH ROW EXECUTE FUNCTION public.partner_referrals_guard();

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- Codes, and invitations for a trade
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- 155's alphabet: no O 0 I 1 L, which people mishear over a phone.
CREATE OR REPLACE FUNCTION public._referral_code_candidate(p_len INTEGER)
RETURNS TEXT
LANGUAGE plpgsql VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out      TEXT := '';
BEGIN
  FOR i IN 1..p_len LOOP
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN out;
END $$;
REVOKE ALL ON FUNCTION public._referral_code_candidate(INTEGER) FROM PUBLIC, anon, authenticated;

/**
 * The caller's partner code, minted and saved on first ask.
 */
CREATE OR REPLACE FUNCTION public.ensure_my_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor UUID;
  v_code   TEXT;
BEGIN
  SELECT id, referral_code INTO v_vendor, v_code
    FROM public.vendors WHERE profile_id = auth.uid()
   FOR UPDATE;
  IF v_vendor IS NULL THEN RETURN NULL; END IF;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;

  PERFORM set_config('sambramo.referral_internal', 'on', true);
  LOOP
    v_code := public._referral_code_candidate(6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vendors WHERE referral_code = v_code);
  END LOOP;
  UPDATE public.vendors SET referral_code = v_code WHERE id = v_vendor;
  PERFORM set_config('sambramo.referral_internal', 'off', true);
  RETURN v_code;
END $$;
REVOKE ALL ON FUNCTION public.ensure_my_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_referral_code() TO authenticated;

-- ── The apk already on people's phones ───────────────────────────────
-- It calls generate_referral_code() and then writes the answer to
-- `vendors` itself, which the pin above now ignores. So for a partner,
-- this now returns (and saves) their real code, and the old screen's
-- UPDATE writes the same value back: a no-op, and the code it shows is
-- the one that works.
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := public.ensure_my_referral_code();
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  LOOP
    v_code := public._referral_code_candidate(6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vendors WHERE referral_code = v_code);
  END LOOP;
  RETURN v_code;
END $$;

/**
 * An invitation for one trade.
 *
 * Returns the same invitation for a repeated idempotency key. Thirty a
 * day is far above what one person sends by hand and far below what a
 * script needs to be worth writing.
 */
CREATE OR REPLACE FUNCTION public.create_referral_invite(p_trade_id TEXT, p_idempotency_key UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me     UUID;
  v_inv    public.partner_referral_invites%ROWTYPE;
  v_promo  UUID;
  v_code   TEXT;
BEGIN
  SELECT id INTO v_me FROM public.vendors WHERE profile_id = auth.uid();
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'says', 'Sign in as a partner first.');
  END IF;
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'says', 'Try that again.');
  END IF;

  SELECT * INTO v_inv FROM public.partner_referral_invites
   WHERE referrer_id = v_me AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_inv.trade_id <> p_trade_id THEN
      RETURN jsonb_build_object('ok', false, 'says', 'Try that again.');
    END IF;
    RETURN jsonb_build_object('ok', true, 'id', v_inv.id, 'code', v_inv.code,
      'trade_id', v_inv.trade_id, 'expires_at', v_inv.expires_at, 'repeat', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.listing_trades WHERE id = p_trade_id AND is_active) THEN
    RETURN jsonb_build_object('ok', false, 'says', 'That is not a trade on Sambramo.');
  END IF;

  IF (SELECT count(*) FROM public.partner_referral_invites
       WHERE referrer_id = v_me AND created_at > now() - INTERVAL '1 day') >= 30 THEN
    RETURN jsonb_build_object('ok', false,
      'says', 'That is thirty invitations today. You can send more tomorrow.');
  END IF;

  SELECT id INTO v_promo FROM public.partner_promotions
   WHERE type = 'referral' AND active
     AND (start_at IS NULL OR start_at <= now())
     AND (end_at   IS NULL OR end_at   >  now())
   ORDER BY priority DESC, created_at DESC LIMIT 1;

  LOOP
    v_code := public._referral_code_candidate(8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.partner_referral_invites WHERE code = v_code);
  END LOOP;

  INSERT INTO public.partner_referral_invites
    (referrer_id, trade_id, code, campaign_id, idempotency_key)
  VALUES (v_me, p_trade_id, v_code, v_promo, p_idempotency_key)
  RETURNING * INTO v_inv;

  RETURN jsonb_build_object('ok', true, 'id', v_inv.id, 'code', v_inv.code,
    'trade_id', v_inv.trade_id, 'expires_at', v_inv.expires_at, 'repeat', false);
END $$;
REVOKE ALL ON FUNCTION public.create_referral_invite(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_referral_invite(TEXT, UUID) TO authenticated;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- Moving referrals forward, from facts
-- ═══════════════════════════════════════════════════════════════════════
--
-- 155's refresh recomputed `state` and could move it BACKWARDS: a live
-- partner who paused their listing went from 'live' to 'verified'. Here
-- every milestone is a timestamp written once, so the timeline is a
-- history ("went live on the 4th") rather than a mood.
--
--   onboarding   the application was submitted  (vendors.submitted_at, or
--                                                 a submitted/approved row)
--   verified     an operator approved them      (is_verified + 'approved')
--   live         approved AND taking jobs       (accepting_jobs)
--   first event  an ACCEPTED offer on a line    (dispatch_offers x
--                delivered or settled            booking_lines, as in 155)
--
-- `p_referred` narrows the milestone work to one referred partner, for
-- the triggers. NULL is everybody, for the hourly sweep.

BEGIN;

CREATE OR REPLACE FUNCTION public._refresh_referrals(p_referred UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moved INTEGER := 0;
  v_n     INTEGER;
BEGIN
  PERFORM set_config('sambramo.referral_internal', 'on', true);

  -- ── 1. Milestones, each stamped once ───────────────────────────────
  WITH f AS (
    SELECT r.id,
      CASE WHEN v.submitted_at IS NOT NULL
             OR v.verification_status IN ('submitted', 'approved')
           THEN COALESCE(v.submitted_at, now()) END                 AS onb,
      CASE WHEN v.is_verified AND v.verification_status = 'approved'
           THEN COALESCE(v.verified_at, now()) END                  AS ver,
      CASE WHEN v.is_verified AND v.verification_status = 'approved'
            AND v.accepting_jobs
           THEN now() END                                           AS liv,
      ev.line_id, ev.at AS evt
      FROM public.partner_referrals r
      JOIN public.vendors v ON v.id = r.referred_id
      LEFT JOIN LATERAL (
        SELECT l.id AS line_id, COALESCE(l.delivered_at, now()) AS at
          FROM public.dispatch_offers o
          JOIN public.booking_lines   l ON l.id = o.line_id
         WHERE o.vendor_id = r.referred_id
           AND o.status = 'ACCEPTED'
           AND l.status IN ('delivered', 'settled')
         ORDER BY l.delivered_at NULLS LAST, l.id
         LIMIT 1
      ) ev ON TRUE
     WHERE r.state <> 'rejected'
       AND (p_referred IS NULL OR r.referred_id = p_referred)
  )
  UPDATE public.partner_referrals t
     -- A verified or delivering partner was submitted, whatever the
     -- column says, so the earlier stamp is filled from the later fact.
     SET onboarding_completed_at = COALESCE(t.onboarding_completed_at, f.onb, f.ver, f.evt),
         verified_at    = COALESCE(t.verified_at, f.ver),
         live_at        = COALESCE(t.live_at, f.liv),
         first_event_at = COALESCE(t.first_event_at, f.evt),
         first_line_id  = COALESCE(t.first_line_id, f.line_id),
         updated_at     = now()
    FROM f
   WHERE t.id = f.id
     AND (   (t.onboarding_completed_at IS NULL AND COALESCE(f.onb, f.ver, f.evt) IS NOT NULL)
          OR (t.verified_at    IS NULL AND f.ver IS NOT NULL)
          OR (t.live_at        IS NULL AND f.liv IS NOT NULL)
          OR (t.first_event_at IS NULL AND f.evt IS NOT NULL));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved + v_n;

  -- ── 2. The campaign a completed event counts under ─────────────────
  -- The one attached at claim time; failing that, the referral campaign
  -- running on the day of the event. Never one that started after it: a
  -- campaign cannot reward what happened before it existed.
  -- A correlated subquery, not FROM LATERAL: an UPDATE's FROM list may
  -- not refer back to the row being updated.
  UPDATE public.partner_referrals t
     SET promotion_id = (
           SELECT p.id FROM public.partner_promotions p
            WHERE p.type = 'referral' AND p.active
              AND (p.start_at IS NULL OR p.start_at <= t.first_event_at)
              AND (p.end_at   IS NULL OR p.end_at   >  t.first_event_at)
            ORDER BY p.priority DESC, p.created_at DESC
            LIMIT 1),
         updated_at = now()
   WHERE t.promotion_id IS NULL
     AND t.first_event_at IS NOT NULL
     AND t.state <> 'rejected'
     AND (p_referred IS NULL OR t.referred_id = p_referred)
     AND EXISTS (
           SELECT 1 FROM public.partner_promotions p
            WHERE p.type = 'referral' AND p.active
              AND (p.start_at IS NULL OR p.start_at <= t.first_event_at)
              AND (p.end_at   IS NULL OR p.end_at   >  t.first_event_at));

  -- ── 3. Qualified: a first event inside the campaign's window ───────
  UPDATE public.partner_referrals t
     SET qualified_at = t.first_event_at, updated_at = now()
    FROM public.partner_promotions p
   WHERE p.id = t.promotion_id
     AND t.qualified_at IS NULL
     AND t.first_event_at IS NOT NULL
     AND t.state <> 'rejected'
     AND (p.start_at IS NULL OR p.start_at <= t.first_event_at)
     AND (p.end_at   IS NULL OR p.end_at   >  t.first_event_at)
     AND (p_referred IS NULL OR t.referred_id = p_referred);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved + v_n;

  -- ── 4. Eligible: the referrer met the campaign's threshold ─────────
  -- Counted per referrer and campaign, so one referred partner's first
  -- event can make the referrer's earlier qualified referrals eligible
  -- too. That is why this step is never narrowed to `p_referred`.
  WITH met AS (
    SELECT r.referrer_id, r.promotion_id
      FROM public.partner_referrals r
      JOIN public.partner_promotions p ON p.id = r.promotion_id
     WHERE r.qualified_at IS NOT NULL AND r.state <> 'rejected'
     GROUP BY r.referrer_id, r.promotion_id, p.qualification
    HAVING count(*) >= GREATEST(1, COALESCE((p.qualification ->> 'minimum_referrals')::int, 1))
  )
  UPDATE public.partner_referrals t
     SET reward_status = 'eligible', updated_at = now()
    FROM met
   WHERE t.referrer_id  = met.referrer_id
     AND t.promotion_id = met.promotion_id
     AND t.qualified_at IS NOT NULL
     AND t.state <> 'rejected'
     AND t.reward_status = 'not_eligible';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved + v_n;

  -- ── 5. Paid: the adjustment was carried by a claim marked paid ─────
  UPDATE public.partner_referrals t
     SET reward_status = 'paid',
         paid_at       = COALESCE(c.settled_at, now()),
         updated_at    = now()
    FROM public.partner_adjustments a
    JOIN public.payout_claims c ON c.id = a.settled_claim_id
   WHERE a.id = t.adjustment_id
     AND t.reward_status = 'payout_recorded'
     AND c.status = 'paid';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved + v_n;

  -- ── 6. `state`, derived, for everything 155 wrote against it ───────
  UPDATE public.partner_referrals t
     SET state = s.should_be, updated_at = now()
    FROM (
      SELECT id, CASE
               WHEN reward_status <> 'not_eligible'     THEN 'reward_unlocked'
               WHEN first_event_at IS NOT NULL          THEN 'first_event_completed'
               WHEN live_at        IS NOT NULL          THEN 'live'
               WHEN verified_at    IS NOT NULL          THEN 'verified'
               WHEN onboarding_completed_at IS NOT NULL THEN 'onboarding_completed'
               ELSE 'registered'
             END AS should_be
        FROM public.partner_referrals
       WHERE referred_id IS NOT NULL AND state <> 'rejected'
    ) s
   WHERE t.id = s.id AND t.state IS DISTINCT FROM s.should_be;

  PERFORM set_config('sambramo.referral_internal', 'off', true);
  RETURN v_moved;
END $$;
REVOKE ALL ON FUNCTION public._refresh_referrals(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._refresh_referrals(UUID) TO service_role;

-- ── 155's name, now callable by the platform as well as an operator ──
-- The zero-argument version is dropped first: leaving it beside a
-- one-argument version with a default makes `refresh_referral_states()`
-- ambiguous, and Postgres refuses to call either.
DROP FUNCTION IF EXISTS public.refresh_referral_states();
CREATE OR REPLACE FUNCTION public.refresh_referral_states(p_referred UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.caller_is_operator() THEN
    RAISE EXCEPTION 'refresh_referral_states is operator-only';
  END IF;
  RETURN jsonb_build_object('ok', true, 'moved', public._refresh_referrals(p_referred));
END $$;
REVOKE ALL ON FUNCTION public.refresh_referral_states(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_referral_states(UUID) TO authenticated, service_role;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- Claiming: an invitation, or a partner's own code
-- ═══════════════════════════════════════════════════════════════════════
--
-- 155's checks, unchanged in substance, plus four: an invitation that is
-- expired, one somebody else already used, the same claim twice (which
-- answers ok, so a retry is harmless), and a race between two claims
-- (the unique index answers, and the caller hears the same sentence as
-- every other refusal).

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_referral_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me       public.vendors%ROWTYPE;
  v_referrer public.vendors%ROWTYPE;
  v_inv      public.partner_referral_invites%ROWTYPE;
  v_code     TEXT := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  v_reason   TEXT := NULL;
  v_id       UUID;
  v_trade    TEXT;
  v_promo    UUID;
  v_refusal  CONSTANT TEXT := 'That code cannot be used on this account.';
BEGIN
  SELECT * INTO v_me FROM public.vendors WHERE profile_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'says', 'Sign in first.');
  END IF;

  PERFORM set_config('sambramo.referral_internal', 'on', true);

  IF length(v_code) = 8 THEN
    SELECT * INTO v_inv FROM public.partner_referral_invites WHERE code = v_code FOR UPDATE;
    IF FOUND THEN
      SELECT * INTO v_referrer FROM public.vendors WHERE id = v_inv.referrer_id;
    END IF;
  ELSIF length(v_code) = 6 THEN
    SELECT * INTO v_referrer FROM public.vendors WHERE referral_code = v_code;
  END IF;

  -- ── The same claim again ───────────────────────────────────────────
  SELECT id INTO v_id FROM public.partner_referrals
   WHERE referred_id = v_me.id
     AND referrer_id = v_referrer.id
     AND ((v_inv.id IS NOT NULL AND invite_id = v_inv.id)
       OR (v_inv.id IS NULL AND code = v_code));
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'id', v_id,
                              'referrer', v_referrer.business_name, 'repeat', true);
  END IF;

  -- ── Every rejection, gathered before any is returned (155) ─────────
  IF v_referrer.id IS NULL THEN
    v_reason := 'unknown_code';
  ELSIF v_referrer.id = v_me.id THEN
    v_reason := 'self_referral';
  ELSIF v_inv.id IS NOT NULL AND v_inv.claimed_by IS NOT NULL THEN
    v_reason := 'invite_used';
  ELSIF v_inv.id IS NOT NULL AND v_inv.expires_at <= now() THEN
    v_reason := 'invite_expired';
  ELSIF EXISTS (SELECT 1 FROM public.partner_referrals WHERE referred_id = v_me.id) THEN
    v_reason := 'already_referred';
  ELSIF v_me.contact_phone IS NOT NULL
    AND regexp_replace(v_me.contact_phone, '\D', '', 'g') <> ''
    AND right(regexp_replace(v_me.contact_phone, '\D', '', 'g'), 10)
      = right(regexp_replace(coalesce(v_referrer.contact_phone, ''), '\D', '', 'g'), 10)
  THEN
    v_reason := 'shared_phone';
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
    -- Recorded against the referrer when there is one, so a pattern of
    -- refusals is visible to an operator. Never with invite_id: that
    -- index is one-referral-per-invitation, and a refused attempt must
    -- not use up the invitation for the person it was meant for.
    IF v_referrer.id IS NOT NULL AND v_reason <> 'self_referral' THEN
      INSERT INTO public.partner_referrals
        (referrer_id, referred_id, code, state, rejected_reason, trade_id)
      VALUES (v_referrer.id, NULL, v_code, 'rejected', v_reason, v_inv.trade_id);
    END IF;
    RETURN jsonb_build_object('ok', false, 'says', v_refusal);
  END IF;

  -- The invitation's trade; for a partner code, the trade they joined as.
  v_trade := COALESCE(v_inv.trade_id,
                      (SELECT id FROM public.listing_trades WHERE name = v_me.category));
  v_promo := COALESCE(v_inv.campaign_id,
                      (SELECT id FROM public.partner_promotions
                        WHERE type = 'referral' AND active
                          AND (start_at IS NULL OR start_at <= now())
                          AND (end_at   IS NULL OR end_at   >  now())
                        ORDER BY priority DESC, created_at DESC LIMIT 1));

  BEGIN
    INSERT INTO public.partner_referrals
      (referrer_id, referred_id, code, state, invite_id, trade_id, promotion_id, claimed_at)
    VALUES
      (v_referrer.id, v_me.id, v_code, 'registered', v_inv.id, v_trade, v_promo, now())
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'says', v_refusal);
  END;

  IF v_inv.id IS NOT NULL THEN
    UPDATE public.partner_referral_invites
       SET claimed_at = now(), claimed_by = v_me.id
     WHERE id = v_inv.id;
  END IF;

  -- Somebody who claims late may already be verified, or live.
  PERFORM public._refresh_referrals(v_me.id);

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'referrer', v_referrer.business_name);
END $$;

REVOKE ALL ON FUNCTION public.claim_referral_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral_code(TEXT) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- Paying a reward: the operator's one path
-- ═══════════════════════════════════════════════════════════════════════
--
-- Attaches a partner_adjustments credit that an operator has ALREADY
-- written (140), after checking it is real money to the right partner.
-- It moves the reward to `payout_recorded`, not `paid`: the credit still
-- has to be carried by a payout claim that somebody marks paid, and the
-- refresh stamps `paid` from that fact and nothing else.
CREATE OR REPLACE FUNCTION public.record_referral_payout(p_referral_id UUID, p_adjustment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.partner_referrals%ROWTYPE;
  a public.partner_adjustments%ROWTYPE;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RAISE EXCEPTION 'record_referral_payout is operator-only';
  END IF;

  SELECT * INTO r FROM public.partner_referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'says', 'No such referral.');
  END IF;
  IF r.reward_status = 'payout_recorded' AND r.adjustment_id = p_adjustment_id
     OR r.reward_status = 'paid' AND r.adjustment_id = p_adjustment_id THEN
    RETURN jsonb_build_object('ok', true, 'reward_status', r.reward_status, 'repeat', true);
  END IF;
  IF r.reward_status <> 'eligible' THEN
    RETURN jsonb_build_object('ok', false,
      'says', format('Only an eligible reward can be paid; this one is %s.', r.reward_status));
  END IF;

  SELECT * INTO a FROM public.partner_adjustments WHERE id = p_adjustment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'says', 'No such adjustment.');
  END IF;
  IF a.vendor_id <> r.referrer_id THEN
    RETURN jsonb_build_object('ok', false, 'says', 'That adjustment is for a different partner.');
  END IF;
  IF a.amount_paise <= 0 OR a.kind NOT IN ('bonus', 'incentive') THEN
    RETURN jsonb_build_object('ok', false, 'says', 'A reward is a positive bonus or incentive.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.partner_adjustments WHERE reverses_id = a.id) THEN
    RETURN jsonb_build_object('ok', false, 'says', 'That adjustment has been reversed.');
  END IF;
  -- One credit may cover several referrals of one campaign (a reward
  -- for "three qualified referrals" is one payment), never two campaigns
  -- or two partners.
  IF EXISTS (SELECT 1 FROM public.partner_referrals x
              WHERE x.adjustment_id = a.id
                AND (x.referrer_id <> r.referrer_id
                  OR x.promotion_id IS DISTINCT FROM r.promotion_id)) THEN
    RETURN jsonb_build_object('ok', false, 'says', 'That adjustment already carries a different reward.');
  END IF;

  PERFORM set_config('sambramo.referral_internal', 'on', true);
  UPDATE public.partner_referrals
     SET reward_status = 'payout_recorded', adjustment_id = a.id, updated_at = now()
   WHERE id = r.id;

  -- Already settled into a paid claim? Then this is paid now.
  PERFORM public._refresh_referrals(r.referred_id);

  SELECT * INTO r FROM public.partner_referrals WHERE id = p_referral_id;
  RETURN jsonb_build_object('ok', true, 'reward_status', r.reward_status);
END $$;

REVOKE ALL ON FUNCTION public.record_referral_payout(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_referral_payout(UUID, UUID) TO authenticated, service_role;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- What a partner reads
-- ═══════════════════════════════════════════════════════════════════════
--
-- Counts come from rows, per trade, as a funnel: `verified` is how many
-- REACHED verified, so the numbers read down the lifecycle and never
-- disagree with each other. Invitations are counted beside referrals,
-- never inside them: sharing is not referring.
--
-- Never returned: the referred partner's phone, documents or bank
-- details, the booking behind their first event, or why anybody was
-- refused. A refused attempt is shown as "not eligible" with no name.

BEGIN;

CREATE OR REPLACE FUNCTION public.my_referral_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    public.vendors%ROWTYPE;
  v_promo public.partner_promotions%ROWTYPE;
  v_out   JSONB;
BEGIN
  SELECT * INTO v_me FROM public.vendors WHERE profile_id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;

  SELECT * INTO v_promo FROM public.partner_promotions
   WHERE type = 'referral' AND active
     AND (start_at IS NULL OR start_at <= now())
     AND (end_at   IS NULL OR end_at   >  now())
   ORDER BY priority DESC, created_at DESC LIMIT 1;

  WITH refs AS (
    SELECT * FROM public.partner_referrals WHERE referrer_id = v_me.id
  ),
  per_trade AS (
    SELECT trade_id,
      count(*) FILTER (WHERE state <> 'rejected')                        AS registered,
      count(onboarding_completed_at) FILTER (WHERE state <> 'rejected')  AS onboarding_completed,
      count(verified_at)    FILTER (WHERE state <> 'rejected')           AS verified,
      count(live_at)        FILTER (WHERE state <> 'rejected')           AS live,
      count(first_event_at) FILTER (WHERE state <> 'rejected')           AS first_event_completed,
      count(qualified_at)   FILTER (WHERE state <> 'rejected')           AS qualified,
      count(*) FILTER (WHERE reward_status IN ('eligible', 'payout_recorded', 'paid')) AS reward_eligible,
      count(*) FILTER (WHERE reward_status = 'payout_recorded')          AS payout_recorded,
      count(*) FILTER (WHERE reward_status = 'paid')                     AS paid,
      count(*) FILTER (WHERE state = 'rejected')                         AS not_eligible
      FROM refs GROUP BY trade_id
  ),
  inv AS (
    SELECT trade_id,
      count(*)                                                           AS invited,
      count(*) FILTER (WHERE claimed_at IS NULL AND expires_at > now())  AS invites_open
      FROM public.partner_referral_invites WHERE referrer_id = v_me.id
     GROUP BY trade_id
  ),
  trades AS (
    SELECT t.id AS trade_id, t.name,
      COALESCE(i.invited, 0) AS invited, COALESCE(i.invites_open, 0) AS invites_open,
      COALESCE(p.registered, 0) AS registered,
      COALESCE(p.onboarding_completed, 0) AS onboarding_completed,
      COALESCE(p.verified, 0) AS verified, COALESCE(p.live, 0) AS live,
      COALESCE(p.first_event_completed, 0) AS first_event_completed,
      COALESCE(p.qualified, 0) AS qualified,
      COALESCE(p.reward_eligible, 0) AS reward_eligible,
      COALESCE(p.payout_recorded, 0) AS payout_recorded,
      COALESCE(p.paid, 0) AS paid, COALESCE(p.not_eligible, 0) AS not_eligible
      FROM public.listing_trades t
      LEFT JOIN per_trade p ON p.trade_id = t.id
      LEFT JOIN inv       i ON i.trade_id = t.id
     WHERE t.is_active
  )
  SELECT jsonb_build_object(
    'ok', true,
    'code', v_me.referral_code,
    'campaign', CASE WHEN v_promo.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', v_promo.id, 'title', v_promo.title, 'body', v_promo.body,
        'reward_paise', v_promo.reward_paise, 'reward_type', v_promo.reward_type,
        'terms_url', v_promo.terms_url, 'start_at', v_promo.start_at, 'end_at', v_promo.end_at,
        'minimum_referrals', GREATEST(1, COALESCE((v_promo.qualification ->> 'minimum_referrals')::int, 1)))
      END,
    'trades', COALESCE((SELECT jsonb_agg(to_jsonb(trades) ORDER BY trades.trade_id) FROM trades), '[]'::jsonb),
    -- Referrals from a partner code, whose referred partner had no trade
    -- the catalogue knows. Counted, not lost.
    'untraded', COALESCE((SELECT to_jsonb(p) FROM per_trade p WHERE p.trade_id IS NULL), 'null'::jsonb)
  ) INTO v_out;

  RETURN v_out;
END $$;
REVOKE ALL ON FUNCTION public.my_referral_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_summary() TO authenticated;

/**
 * The caller's referrals, filtered by trade and by current state, or one
 * by id. `p_state` is a `state` value, or 'paid' for the reward.
 */
CREATE OR REPLACE FUNCTION public.my_referrals(
  p_trade_id TEXT DEFAULT NULL,
  p_state    TEXT DEFAULT NULL,
  p_id       UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID;
BEGIN
  SELECT id INTO v_me FROM public.vendors WHERE profile_id = auth.uid();
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x) ORDER BY x.updated_at DESC)
      FROM (
        SELECT r.id, r.trade_id, t.name AS trade_name,
               CASE WHEN r.state = 'rejected' THEN NULL ELSE v.business_name END AS referred_name,
               r.state, (r.state = 'rejected') AS not_eligible,
               r.created_at, r.updated_at, r.claimed_at,
               r.onboarding_completed_at, r.verified_at, r.live_at, r.first_event_at,
               r.qualified_at, r.reward_status, r.paid_at,
               i.code AS invite_code,
               p.title AS campaign_title
          FROM public.partner_referrals r
          LEFT JOIN public.vendors                  v ON v.id = r.referred_id
          LEFT JOIN public.listing_trades           t ON t.id = r.trade_id
          LEFT JOIN public.partner_referral_invites i ON i.id = r.invite_id
          LEFT JOIN public.partner_promotions       p ON p.id = r.promotion_id
         WHERE r.referrer_id = v_me
           AND (p_id       IS NULL OR r.id = p_id)
           AND (p_trade_id IS NULL OR r.trade_id = p_trade_id)
           AND (p_state    IS NULL
                OR (p_state = 'paid' AND r.reward_status = 'paid')
                OR (p_state <> 'paid' AND r.state = p_state))
         ORDER BY r.updated_at DESC
         LIMIT 200
      ) x
  ), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.my_referrals(TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referrals(TEXT, TEXT, UUID) TO authenticated;

-- ── 155's progress card, counted the way the reward now is ───────────
-- Same keys, so an installed apk keeps rendering. `qualified` is a first
-- event inside this campaign; `unlocked` is the eligibility the refresh
-- actually decided, not a count compared on the client.
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
  v_open    BOOLEAN;
  v_paid    INTEGER;
BEGIN
  SELECT id INTO v_me FROM public.vendors WHERE profile_id = auth.uid();
  IF v_me IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;

  SELECT * INTO v_promo FROM public.partner_promotions
   WHERE type = 'referral' AND active
     AND (start_at IS NULL OR start_at <= now())
     AND (end_at   IS NULL OR end_at   >  now())
   ORDER BY priority DESC, created_at DESC LIMIT 1;

  IF v_promo.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'campaign', NULL);
  END IF;

  v_needed := GREATEST(1, COALESCE((v_promo.qualification ->> 'minimum_referrals')::int, 1));

  SELECT count(*) FILTER (WHERE qualified_at IS NOT NULL AND promotion_id = v_promo.id),
         count(*) FILTER (WHERE state <> 'rejected'),
         bool_or(reward_status <> 'not_eligible' AND promotion_id = v_promo.id),
         count(*) FILTER (WHERE reward_status = 'paid' AND promotion_id = v_promo.id)
    INTO v_done, v_started, v_open, v_paid
    FROM public.partner_referrals
   WHERE referrer_id = v_me AND referred_id IS NOT NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'campaign', jsonb_build_object(
      'id', v_promo.id, 'title', v_promo.title,
      'reward_paise', v_promo.reward_paise, 'reward_type', v_promo.reward_type,
      'terms_url', v_promo.terms_url),
    'needed', v_needed,
    'qualified', v_done,
    'in_progress', GREATEST(0, v_started - v_done),
    'unlocked', COALESCE(v_open, false),
    'paid', v_paid);
END $$;
REVOKE ALL ON FUNCTION public.referral_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.referral_progress() TO authenticated;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- What runs the refresh
-- ═══════════════════════════════════════════════════════════════════════
--
-- Triggers on the facts, so a partner approved at 11:02 reads "verified"
-- at 11:02. The hourly sweep is the backstop for anything a trigger
-- cannot see (a row written with triggers disabled, a restore).
--
-- A referral must never be the reason an approval or a delivery fails,
-- so the trigger swallows its own error and says so in the log.

BEGIN;

CREATE OR REPLACE FUNCTION public._referral_facts_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred UUID;
BEGIN
  BEGIN
    IF TG_TABLE_NAME = 'vendors' THEN
      v_referred := NEW.id;
    ELSIF TG_TABLE_NAME = 'booking_lines' THEN
      SELECT vendor_id INTO v_referred FROM public.dispatch_offers
       WHERE line_id = NEW.id AND status = 'ACCEPTED' LIMIT 1;
    ELSIF TG_TABLE_NAME = 'payout_claims' THEN
      SELECT r.referred_id INTO v_referred
        FROM public.partner_referrals r
        JOIN public.partner_adjustments a ON a.id = r.adjustment_id
       WHERE a.settled_claim_id = NEW.id LIMIT 1;
    ELSIF TG_TABLE_NAME = 'partner_adjustments' THEN
      SELECT r.referred_id INTO v_referred
        FROM public.partner_referrals r WHERE r.adjustment_id = NEW.id LIMIT 1;
    END IF;

    IF v_referred IS NOT NULL AND EXISTS (
         SELECT 1 FROM public.partner_referrals
          WHERE (referred_id = v_referred AND state <> 'rejected')
             OR (TG_TABLE_NAME IN ('payout_claims', 'partner_adjustments')
                 AND referred_id = v_referred)) THEN
      PERFORM public._refresh_referrals(v_referred);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'referral refresh skipped on %: %', TG_TABLE_NAME, SQLERRM;
  END;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public._referral_facts_changed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS referral_facts_vendor ON public.vendors;
CREATE TRIGGER referral_facts_vendor
  AFTER UPDATE OF is_verified, verification_status, accepting_jobs, submitted_at ON public.vendors
  FOR EACH ROW
  WHEN (OLD.is_verified         IS DISTINCT FROM NEW.is_verified
     OR OLD.verification_status IS DISTINCT FROM NEW.verification_status
     OR OLD.accepting_jobs      IS DISTINCT FROM NEW.accepting_jobs
     OR OLD.submitted_at        IS DISTINCT FROM NEW.submitted_at)
  EXECUTE FUNCTION public._referral_facts_changed();

DROP TRIGGER IF EXISTS referral_facts_line ON public.booking_lines;
CREATE TRIGGER referral_facts_line
  AFTER UPDATE OF status ON public.booking_lines
  FOR EACH ROW
  WHEN (NEW.status IN ('delivered', 'settled') AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public._referral_facts_changed();

DROP TRIGGER IF EXISTS referral_facts_claim ON public.payout_claims;
CREATE TRIGGER referral_facts_claim
  AFTER UPDATE OF status ON public.payout_claims
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public._referral_facts_changed();

DROP TRIGGER IF EXISTS referral_facts_adjustment ON public.partner_adjustments;
CREATE TRIGGER referral_facts_adjustment
  AFTER UPDATE OF settled_claim_id ON public.partner_adjustments
  FOR EACH ROW
  WHEN (OLD.settled_claim_id IS NULL AND NEW.settled_claim_id IS NOT NULL)
  EXECUTE FUNCTION public._referral_facts_changed();

-- ── The hourly sweep ─────────────────────────────────────────────────
-- 089 installed pg_cron. Unscheduled first, so pasting this twice leaves
-- one job rather than two.
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sambramo-referral-refresh';
    PERFORM cron.schedule('sambramo-referral-refresh', '23 * * * *',
                          'SELECT public._refresh_referrals(NULL)');
  ELSE
    RAISE NOTICE 'pg_cron is not installed: referrals advance by trigger, but nothing sweeps them hourly.';
  END IF;
END $cron$;

COMMIT;

-- ── Bring every existing referral up to date, once ───────────────────
SELECT public._refresh_referrals(NULL) AS referrals_moved;

-- ═══════════════════════════════════════════════════════════════════════
-- OPERATIONS
-- ═══════════════════════════════════════════════════════════════════════
--
-- Check it took:
--   SELECT jobname, schedule FROM cron.job WHERE jobname = 'sambramo-referral-refresh';
--   SELECT count(*) FROM public.partner_referral_invites;               -- 0 is fine
--   SELECT state, reward_status, count(*) FROM public.partner_referrals GROUP BY 1, 2;
--
-- Paying a reward (operator, after the campaign's terms are met):
--   1. write the credit as usual through 140 -- kind 'bonus' or
--      'incentive', vendor = the REFERRER, a reason naming the referral;
--   2. SELECT public.record_referral_payout('<referral id>', '<adjustment id>');
--   3. it reads 'paid' only once that adjustment is carried by a payout
--      claim an operator marks paid.
--
-- Rolling back (keeps every row; only behaviour is removed):
--   SELECT cron.unschedule('sambramo-referral-refresh');
--   DROP TRIGGER referral_facts_vendor     ON public.vendors;
--   DROP TRIGGER referral_facts_line       ON public.booking_lines;
--   DROP TRIGGER referral_facts_claim      ON public.payout_claims;
--   DROP TRIGGER referral_facts_adjustment ON public.partner_adjustments;
--   DROP TRIGGER partner_referrals_guard   ON public.partner_referrals;
--   DROP TRIGGER vendors_pin_referral_code ON public.vendors;
-- The new columns and the invitations table can stay: nothing older
-- reads them. Re-pasting 155 would restore its functions, and with them
-- its read leak -- re-grant column SELECT afterwards if you do.
