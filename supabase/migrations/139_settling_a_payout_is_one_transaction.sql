-- ══════════════════════════════════════════════════════════════════════
-- 139 · Settling a payout is one transaction
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 136, 137 and 138 first.
--
-- !! THIS IS THE FILE WHERE MONEY MOVES. READ THE WHOLE HEADER. !!
--
-- ── What has never happened until now ───────────────────────────────
--
-- `escrow_ledger.kind` has allowed 'RELEASE_PARTNER' and
-- 'RELEASE_PLATFORM' since 062. It has unique indexes for them, a
-- payout-queue index over them, and two other migrations refer to them
-- in prose. NOTHING HAS EVER WRITTEN ONE. The only writers are
-- bookingCapture (HOLD) and 081's cancellations.
--
-- So: every funded line's ledger sums positive forever,
-- `escrow_position.held_paise` never returns to zero, and
-- `booking_lines.status = 'settled'` -- in the CHECK since 059 -- is
-- unreachable. An operator marking a claim paid changed one row in
-- `payout_claims` and left the ledger untouched, which means the ledger
-- and the bank have never been reconcilable.
--
-- ── Getting the ledger semantics right, once, for free ──────────────
--
-- `payout_claims.amount_paise` is the partner's SHARE. What reaches
-- their bank is the NET, after TCS and TDS. If RELEASE_PARTNER records
-- the share then the ledger says Rs 10,540 left while Rs 10,416 left,
-- and it stops reconciling against a bank statement -- which is the one
-- job a ledger has.
--
-- There is no kind for a statutory remittance. Because nothing has ever
-- written a release row, this can be defined correctly now at zero
-- migration cost, and never again. Two CHECKs are widened (additive; no
-- existing row can violate either) and a settled line writes FOUR rows
-- that sum to exactly zero:
--
--   RELEASE_PARTNER   -net   partner      what reached the bank
--   REMIT_TCS         -tcs   authority    GST s.52
--   REMIT_TDS         -tds   authority    IT s.194-O, omitted when waived
--   RELEASE_PLATFORM  -fee   platform     the commission
--
--   net + tcs + tds + fee = share + fee = quoted = held
--
-- The ledger now matches the payment slip line for line.
--
-- `escrow_ledger_sign_matches_kind` already says non-HOLD must be
-- negative, so the two new kinds are covered with no edit.
--
-- ── The two rates ───────────────────────────────────────────────────
--
-- TCS and TDS are 1% each, and they live in `src/config/legal.js`. They
-- are inlined below as constants because there is no rates table, and
-- inventing one for two numbers in this file is the wrong trade. THE JS
-- IS THE SOURCE OF TRUTH; `scripts/check-payout-states.mjs` parses both
-- and fails if they drift. A rates table is the right long answer.
--
-- ── IRREVERSIBLE ────────────────────────────────────────────────────
--
-- Every escrow_ledger insert is permanent: the table is append-only by
-- trigger and a wrong settle can only ever be compensated, never undone.
-- That is why the checks below REFUSE rather than guess, and why
-- `short_balance` does not prorate.
--
-- Re-runnable.

BEGIN;

-- ── Two kinds and one counterparty ──────────────────────────────────
ALTER TABLE public.escrow_ledger DROP CONSTRAINT IF EXISTS escrow_ledger_kind_check;
ALTER TABLE public.escrow_ledger DROP CONSTRAINT IF EXISTS escrow_ledger_kind_allowed;
ALTER TABLE public.escrow_ledger ADD CONSTRAINT escrow_ledger_kind_allowed
  CHECK (kind IN (
    'HOLD', 'RELEASE_PARTNER', 'RELEASE_PLATFORM',
    'REFUND_CUSTOMER', 'PENALTY_PARTNER',
    'REMIT_TCS', 'REMIT_TDS'));

ALTER TABLE public.escrow_ledger DROP CONSTRAINT IF EXISTS escrow_ledger_counterparty_check;
ALTER TABLE public.escrow_ledger DROP CONSTRAINT IF EXISTS escrow_ledger_counterparty_allowed;
ALTER TABLE public.escrow_ledger ADD CONSTRAINT escrow_ledger_counterparty_allowed
  CHECK (counterparty IN ('customer', 'partner', 'platform', 'authority'));

-- One remittance of each kind per line, matching the two release
-- indexes 062 already created. This is what makes a replayed settle
-- safe rather than merely unlikely.
CREATE UNIQUE INDEX IF NOT EXISTS uq_escrow_one_tcs_remit
  ON public.escrow_ledger (line_id) WHERE kind = 'REMIT_TCS';
CREATE UNIQUE INDEX IF NOT EXISTS uq_escrow_one_tds_remit
  ON public.escrow_ledger (line_id) WHERE kind = 'REMIT_TDS';

-- ══════════════════════════════════════════════════════════════════════
-- settle_payout_claim
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.settle_payout_claim(
  p_claim_id            UUID,
  p_reference           TEXT,
  p_adapter             TEXT DEFAULT 'ManualPayout',
  p_gateway_transfer_id TEXT DEFAULT NULL,
  p_has_pan             BOOLEAN DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  -- Source of truth: src/config/legal.js. Kept in step by
  -- scripts/check-payout-states.mjs, which parses both.
  c_tcs_rate CONSTANT NUMERIC := 0.01;
  c_tds_rate CONSTANT NUMERIC := 0.01;

  v_claim  public.payout_claims%ROWTYPE;
  v_line   public.booking_lines%ROWTYPE;
  v_pay    public.vendor_payout_details%ROWTYPE;
  v_held   BIGINT;
  v_share  BIGINT;
  v_fee    BIGINT;
  v_tcs    BIGINT;
  v_tds    BIGINT;
  v_net    BIGINT;
  v_haspan BOOLEAN;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  -- FOR UPDATE, so two operators settling the same claim at the same
  -- moment serialise rather than both writing a release.
  SELECT * INTO v_claim FROM public.payout_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_claim');
  END IF;

  -- Idempotent by construction: settling twice is a success that did
  -- nothing, never a second transfer.
  IF v_claim.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true,
      'reference', v_claim.reference);
  END IF;

  IF v_claim.status <> 'requested' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_open',
      'status', v_claim.status);
  END IF;

  SELECT * INTO v_line FROM public.booking_lines WHERE id = v_claim.line_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_line');
  END IF;

  -- A dispute stops money even if a claim slipped through before it was
  -- raised. claimable() checks this at claim time; the world moves on
  -- between then and the transfer.
  IF v_line.status = 'disputed' OR public.line_is_disputed(v_line.id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'disputed',
      'says', 'This job has a problem open on it.');
  END IF;

  -- ── Solvency, worked out BEFORE anything is written ──────────────
  SELECT COALESCE(SUM(amount_paise), 0) INTO v_held
  FROM public.escrow_ledger WHERE line_id = v_line.id;

  IF v_held <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'nothing_held',
      'says', 'No money is held against this booking.');
  END IF;

  -- Refuse, do NOT prorate. A shortfall means a refund or a penalty has
  -- already run against this line (081 writes both), and deciding how
  -- what is left divides between the partner and the platform is a
  -- human judgement. Inventing a split here would put a figure nobody
  -- can explain on a partner's slip and an irreversible row in an
  -- append-only ledger.
  IF v_held < v_line.quoted_amount_paise THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'short_balance',
      'held_paise', v_held,
      'expected_paise', v_line.quoted_amount_paise,
      'says', 'This booking has had a refund or a penalty against it. Settle it by hand.');
  END IF;

  -- ── The split ────────────────────────────────────────────────────
  v_share := COALESCE(v_line.partner_amount_paise, 0);
  v_fee   := COALESCE(v_line.platform_fee_paise, 0);

  IF v_share <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_share');
  END IF;

  -- The PAN decides TDS. The caller may override for a case an operator
  -- has checked by hand; otherwise it is read from the payout row, the
  -- same place partnerDeductions reads it on the client.
  IF p_has_pan IS NULL THEN
    SELECT * INTO v_pay FROM public.vendor_payout_details WHERE vendor_id = v_claim.vendor_id;
    v_haspan := COALESCE(v_pay.pan IS NOT NULL AND length(trim(v_pay.pan)) > 0, false);
  ELSE
    v_haspan := p_has_pan;
  END IF;

  v_tcs := round(v_share * c_tcs_rate);
  -- s.194-O waives TDS for a below-threshold individual with a PAN on
  -- file. The threshold is measured on the financial year and the app
  -- has already made that call at claim time; here the PAN alone
  -- decides, which is the conservative direction -- it can only deposit
  -- more on the partner's behalf, never less.
  v_tds := CASE WHEN v_haspan THEN 0 ELSE round(v_share * c_tds_rate) END;
  v_net := v_share - v_tcs - v_tds;

  IF v_net <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'nothing_to_send');
  END IF;

  -- ── Four rows, one statement ─────────────────────────────────────
  --
  -- One INSERT, because `escrow_ledger_solvency` is an AFTER INSERT
  -- CONSTRAINT trigger: it evaluates with all four rows visible, so no
  -- intermediate ordering can produce a false negative.
  BEGIN
    INSERT INTO public.escrow_ledger (
      line_id, kind, amount_paise, counterparty,
      gateway_transfer_id, manual_reference, adapter, note, actor_id)
    VALUES
      (v_line.id, 'RELEASE_PARTNER',  -v_net, 'partner',
       p_gateway_transfer_id, p_reference, p_adapter,
       'Paid to the partner', auth.uid()),
      (v_line.id, 'REMIT_TCS',        -v_tcs, 'authority',
       NULL, p_reference, p_adapter,
       'TCS deposited on the partner''s behalf (GST s.52)', auth.uid()),
      (v_line.id, 'RELEASE_PLATFORM', -v_fee, 'platform',
       NULL, p_reference, p_adapter,
       'Sambramo commission', auth.uid());

    IF v_tds > 0 THEN
      INSERT INTO public.escrow_ledger (
        line_id, kind, amount_paise, counterparty, manual_reference, adapter, note, actor_id)
      VALUES (v_line.id, 'REMIT_TDS', -v_tds, 'authority', p_reference, p_adapter,
              'TDS deposited on the partner''s behalf (IT s.194-O)', auth.uid());
    END IF;
  EXCEPTION
    -- The per-line release indexes did their job. Something already
    -- settled this line; say so rather than writing a second release.
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', true, 'replayed', true,
        'says', 'This booking was already released.');
  END;

  -- ── The line, finally settled ────────────────────────────────────
  --
  -- The first code anywhere to write 'settled'. The guard on status is
  -- what stops a cancelled or expired line being marked it.
  UPDATE public.booking_lines
     SET status = 'settled', settled_at = now(), updated_at = now()
   WHERE id = v_line.id
     AND status IN ('delivered', 'paid', 'in_progress');

  UPDATE public.payout_claims
     SET status = 'paid', settled_at = now(), settled_by = auth.uid(),
         reference = COALESCE(p_reference, reference)
   WHERE id = p_claim_id;

  PERFORM public.write_money_audit(
    'escrow_released', 'line', v_line.id, v_claim.vendor_id, v_line.id, v_net, NULL,
    jsonb_build_object('net', v_net, 'tcs', v_tcs, 'tds', v_tds, 'fee', v_fee,
                       'adapter', p_adapter), NULL);
  PERFORM public.write_money_audit(
    'claim_settled', 'claim', p_claim_id, v_claim.vendor_id, v_line.id, v_net,
    jsonb_build_object('status', 'requested'),
    jsonb_build_object('status', 'paid', 'reference', p_reference), NULL);

  RETURN jsonb_build_object(
    'ok', true,
    'released_paise', v_net,
    'net_paise', v_net, 'tcs_paise', v_tcs, 'tds_paise', v_tds, 'fee_paise', v_fee,
    'reference', p_reference);
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- fail_payout_claim  ·  nothing moved, so nothing is ledgered
-- ══════════════════════════════════════════════════════════════════════
--
-- The line stays `delivered`, so `claimable()` returns ok again and the
-- partner can simply ask a second time. No compensating ledger row,
-- because there is nothing to compensate: a bounced transfer never left.
CREATE OR REPLACE FUNCTION public.fail_payout_claim(
  p_claim_id UUID,
  p_code     TEXT,
  p_reason   TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_claim public.payout_claims%ROWTYPE;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  SELECT * INTO v_claim FROM public.payout_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_claim');
  END IF;

  -- A paid claim cannot be failed. If a settled transfer bounces later
  -- that is a REVERSAL -- a new movement with its own ledger rows --
  -- not a rewrite of the row that says money left.
  IF v_claim.status = 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_paid',
      'says', 'This was released. A bounce after release needs a reversal, not a failure.');
  END IF;

  UPDATE public.payout_claims
     SET status = 'failed', failed_at = now(),
         failure_code = COALESCE(p_code, 'other'),
         failure_reason = p_reason,
         settled_by = auth.uid()
   WHERE id = p_claim_id;

  PERFORM public.write_money_audit(
    'claim_failed', 'claim', p_claim_id, v_claim.vendor_id, v_claim.line_id,
    v_claim.amount_paise,
    jsonb_build_object('status', v_claim.status),
    jsonb_build_object('status', 'failed', 'code', p_code), p_reason);

  RETURN jsonb_build_object('ok', true, 'status', 'failed');
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- reject_payout_claim  ·  the claim was never legitimate
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reject_payout_claim(
  p_claim_id UUID,
  p_reason   TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_claim public.payout_claims%ROWTYPE;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  SELECT * INTO v_claim FROM public.payout_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_claim');
  END IF;
  IF v_claim.status = 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_paid');
  END IF;

  UPDATE public.payout_claims
     SET status = 'rejected', note = p_reason, settled_by = auth.uid()
   WHERE id = p_claim_id;

  PERFORM public.write_money_audit(
    'claim_rejected', 'claim', p_claim_id, v_claim.vendor_id, v_claim.line_id,
    v_claim.amount_paise,
    jsonb_build_object('status', v_claim.status),
    jsonb_build_object('status', 'rejected'), p_reason);

  RETURN jsonb_build_object('ok', true, 'status', 'rejected');
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- The batch versions  ·  all or nothing
-- ══════════════════════════════════════════════════════════════════════
--
-- If any member returns short_balance the WHOLE batch aborts, naming the
-- line. An operator must not discover mid-transfer that one of nine was
-- short -- by then the money has gone.
CREATE OR REPLACE FUNCTION public.settle_payout_batch(
  p_batch_id            UUID,
  p_reference           TEXT,
  p_adapter             TEXT DEFAULT 'ManualPayout',
  p_gateway_transfer_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_batch public.payout_batches%ROWTYPE;
  v_claim RECORD;
  v_res   JSONB;
  v_total BIGINT := 0;
  v_n     INTEGER := 0;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  SELECT * INTO v_batch FROM public.payout_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_batch');
  END IF;
  IF v_batch.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true, 'reference', v_batch.reference);
  END IF;
  IF v_batch.status <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_open', 'status', v_batch.status);
  END IF;

  FOR v_claim IN
    SELECT id, line_id FROM public.payout_claims
    WHERE batch_id = p_batch_id AND status = 'requested'
  LOOP
    v_res := public.settle_payout_claim(
      v_claim.id, p_reference, p_adapter, p_gateway_transfer_id, NULL);

    IF NOT (v_res->>'ok')::boolean THEN
      -- RAISE, not RETURN: this unwinds every release already written in
      -- this transaction. A partial batch is the one outcome with no
      -- honest story.
      RAISE EXCEPTION 'batch % aborted on line %: %',
        p_batch_id, v_claim.line_id, v_res->>'reason'
        USING HINT = 'No claim in this batch was settled. Fix the named line and run it again.';
    END IF;

    v_total := v_total + COALESCE((v_res->>'net_paise')::bigint, 0);
    v_n := v_n + 1;
  END LOOP;

  UPDATE public.payout_batches
     SET status = 'paid', paid_at = now(), settled_by = auth.uid(),
         reference = p_reference, amount_paise = NULLIF(v_total, 0)
   WHERE id = p_batch_id;

  PERFORM public.write_money_audit(
    'batch_settled', 'batch', p_batch_id, v_batch.vendor_id, NULL, v_total, NULL,
    jsonb_build_object('claims', v_n, 'reference', p_reference), NULL);

  RETURN jsonb_build_object('ok', true, 'claims', v_n, 'total_paise', v_total,
    'reference', p_reference);
END $$;

CREATE OR REPLACE FUNCTION public.fail_payout_batch(
  p_batch_id UUID,
  p_code     TEXT,
  p_reason   TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_batch public.payout_batches%ROWTYPE;
  v_claim RECORD;
  v_n     INTEGER := 0;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  SELECT * INTO v_batch FROM public.payout_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_batch');
  END IF;

  FOR v_claim IN
    SELECT id FROM public.payout_claims
    WHERE batch_id = p_batch_id AND status = 'requested'
  LOOP
    PERFORM public.fail_payout_claim(v_claim.id, p_code, p_reason);
    v_n := v_n + 1;
  END LOOP;

  UPDATE public.payout_batches
     SET status = 'failed', failed_at = now(), settled_by = auth.uid(),
         failure_code = COALESCE(p_code, 'other'), failure_reason = p_reason
   WHERE id = p_batch_id;

  PERFORM public.write_money_audit(
    'batch_failed', 'batch', p_batch_id, v_batch.vendor_id, NULL, NULL, NULL,
    jsonb_build_object('claims', v_n, 'code', p_code), p_reason);

  RETURN jsonb_build_object('ok', true, 'claims', v_n);
END $$;

-- ── Grants ──────────────────────────────────────────────────────────
--
-- `authenticated` because an admin in a browser IS authenticated; the
-- caller_is_operator() check inside each function is the real gate.
-- Matching 075's pattern.
REVOKE ALL ON FUNCTION public.settle_payout_claim(UUID, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_payout_claim(UUID, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fail_payout_claim(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fail_payout_claim(UUID, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reject_payout_claim(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_payout_claim(UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.settle_payout_batch(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_payout_batch(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fail_payout_batch(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fail_payout_batch(UUID, TEXT, TEXT) TO authenticated, service_role;

COMMIT;
