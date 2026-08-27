-- ============================================================
-- 061 · accept_offer / decline_offer — answering a job, safely
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057–060 FIRST.
-- Re-runnable: both functions are CREATE OR REPLACE.
--
-- ── Why these are functions and not an UPDATE from the app ───────────
-- 060 gave `dispatch_offers` no INSERT or UPDATE policy at all, for
-- anybody. A partner who could UPDATE that table directly could write
-- `status = 'ACCEPTED'` onto an offer belonging to somebody else, or onto
-- an offer that had already expired, or onto a line that was cancelled
-- an hour ago.
--
-- So the only way in is through these two, SECURITY DEFINER, which check
-- those things in the same transaction that writes the answer. There is
-- no window between the check and the write for the state to change,
-- because they are the same statement.
--
-- ── Accepting is FOUR writes that must all happen or none ────────────
--   1. this offer            → ACCEPTED
--   2. the line              → accepted, pointing at this offer
--   3. every sibling offer   → LOST
--   4. (implicitly) the unique index either permits 1 or does not
--
-- A partner told "you got it" whose line was never updated is a partner
-- who turns up to a job the customer does not know is booked. A function
-- body is one transaction, so this is atomic for free — which is the
-- other half of why this is not four calls from a serverless handler
-- that can be killed between any two of them.
--
-- ── They return jsonb, not an exception ──────────────────────────────
-- "Somebody else just took it" is a NORMAL outcome — with five partners
-- on every offer it is the majority outcome, four times out of five. It
-- is not an error, it does not deserve a stack trace, and the partner app
-- has to render it as a calm sentence rather than a crash. So the
-- contract is `{ ok: false, reason: 'taken' }`, and the app switches on
-- `reason`.
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- accept_offer
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.accept_offer(p_offer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_offer   dispatch_offers%ROWTYPE;
  v_line    booking_lines%ROWTYPE;
  v_owner   UUID;
BEGIN
  SELECT * INTO v_offer FROM dispatch_offers WHERE id = p_offer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- ── Is this actually your offer? ──────────────────────────────────
  -- SECURITY DEFINER bypasses RLS, so this function must do by hand the
  -- ownership check that a policy would otherwise have done. Forgetting
  -- it would let any authenticated user accept any offer by id.
  SELECT profile_id INTO v_owner FROM vendors WHERE id = v_offer.vendor_id;
  IF v_owner IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  IF v_offer.status <> 'OFFERED' THEN
    RETURN jsonb_build_object('ok', false, 'reason', lower(v_offer.status));
  END IF;

  -- Expiry is checked against the clock HERE, not by a sweeper job. A
  -- partner whose screen still shows 3 seconds because their connection
  -- lagged must not win a job the customer has already been told expired.
  IF v_offer.expires_at <= now() THEN
    UPDATE dispatch_offers
       SET status = 'EXPIRED', responded_at = now()
     WHERE id = p_offer_id AND status = 'OFFERED';
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  SELECT * INTO v_line FROM booking_lines WHERE id = v_offer.line_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'line_gone');
  END IF;

  -- The customer may have cancelled the whole basket while the offer sat
  -- on a lock screen.
  IF v_line.status NOT IN ('pending','dispatching') THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      CASE WHEN v_line.status IN ('cancelled','expired') THEN v_line.status
           ELSE 'taken' END);
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- THE RACE, RESOLVED
  -- ══════════════════════════════════════════════════════════════════
  -- Two partners reach this line in the same millisecond. Both passed
  -- every check above, because every check above was true for both. The
  -- partial unique index `uq_offer_one_winner` is what separates them:
  -- one UPDATE commits, the other raises 23505.
  --
  -- The loser is marked LOST rather than left OFFERED — they answered,
  -- they were simply second, and their inbox must stop showing it.
  BEGIN
    UPDATE dispatch_offers
       SET status = 'ACCEPTED', accepted_at = now(), responded_at = now()
     WHERE id = p_offer_id;
  EXCEPTION WHEN unique_violation THEN
    UPDATE dispatch_offers
       SET status = 'LOST', responded_at = now()
     WHERE id = p_offer_id AND status = 'OFFERED';
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END;

  -- ── The line follows the offer ────────────────────────────────────
  -- Guarded on the status we read above, so even if the impossible
  -- happened this cannot overwrite a line that moved underneath us.
  UPDATE booking_lines
     SET status            = 'accepted',
         accepted_offer_id = p_offer_id,
         accepted_at       = now()
   WHERE id = v_offer.line_id
     AND status IN ('pending','dispatching');

  -- ── Everybody else is told, immediately ───────────────────────────
  -- Not by a cleanup job minutes later. A partner still staring at a
  -- countdown for a job that is gone is the fastest way to teach them the
  -- notifications are not worth opening.
  UPDATE dispatch_offers
     SET status = 'LOST', responded_at = now()
   WHERE line_id = v_offer.line_id
     AND id <> p_offer_id
     AND status = 'OFFERED';

  -- `partner_amount_paise` comes from the OFFER, not recomputed. It is
  -- what this partner was shown when they tapped, and that is what they
  -- are owed even if the fee rate changed in between.
  RETURN jsonb_build_object(
    'ok', true,
    'line_id', v_offer.line_id,
    'partner_amount_paise', v_offer.partner_amount_paise,
    -- Said plainly, because the partner app must not print "CONFIRMED"
    -- yet. The customer has not paid. See the header of 059.
    'awaiting_payment', true
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- decline_offer
-- ══════════════════════════════════════════════════════════════════════
-- A decline is worth recording rather than ignoring: a trade that is
-- consistently declined at a given price is a pricing problem, and one
-- declined at a given distance is a radius problem. Both are invisible if
-- the row is deleted or left to expire silently.
CREATE OR REPLACE FUNCTION public.decline_offer(p_offer_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_offer dispatch_offers%ROWTYPE;
  v_owner UUID;
BEGIN
  SELECT * INTO v_offer FROM dispatch_offers WHERE id = p_offer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  SELECT profile_id INTO v_owner FROM vendors WHERE id = v_offer.vendor_id;
  IF v_owner IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  IF v_offer.status <> 'OFFERED' THEN
    RETURN jsonb_build_object('ok', false, 'reason', lower(v_offer.status));
  END IF;

  UPDATE dispatch_offers
     SET status = 'DECLINED',
         responded_at = now(),
         -- Trimmed and capped. This is free text from a phone keyboard
         -- that ends up in an admin table.
         decline_reason = NULLIF(left(btrim(p_reason), 200), '')
   WHERE id = p_offer_id AND status = 'OFFERED';

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Who may call these ───────────────────────────────────────────────
-- SECURITY DEFINER functions run as the owner, so EXECUTE is the only
-- gate. `anon` must not have it: both functions identify the caller
-- through auth.uid(), which is NULL for an anonymous session, and while
-- the ownership check would reject that anyway, granting execute to anon
-- makes the gate depend on that check being right forever.
REVOKE ALL ON FUNCTION public.accept_offer(UUID)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_offer(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_offer(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_offer(UUID, TEXT) TO authenticated;

COMMIT;
