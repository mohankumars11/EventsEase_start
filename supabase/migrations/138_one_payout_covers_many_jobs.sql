-- ══════════════════════════════════════════════════════════════════════
-- 138 · One payout covers many jobs
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 136 and 137 first.
--
-- ── The problem ─────────────────────────────────────────────────────
--
-- A claim is per booking line, and that is correct: the line is the unit
-- of work, of escrow, of dispute and of cancellation. But a real payout
-- is one bank transfer with one UTR covering nine jobs, and there was
-- nowhere to record that. Nine claims each carrying the same reference
-- typed in nine times is not a batch, it is nine chances to mistype.
--
-- ── A batch is an envelope, NOT a replacement ───────────────────────
--
-- One line still gets exactly one open claim.
-- `uq_claim_one_open_per_line` is not touched, not widened, not
-- replaced.
--
-- The alternatives were considered and both delete that protection:
--
--   a claim spanning many lines        the per-line unique index stops
--                                      meaning anything
--   a claims-to-lines join table       same, with more moving parts
--
-- That index is the only thing standing between this system and paying
-- for the same job twice, and it has never failed. A batch sits ABOVE
-- the claims and says "these left together".
--
-- ── claim_all_ready, and why it belongs in this file ────────────────
--
-- `EarningsSummary.jsx` argued, correctly, that a single "claim
-- everything" button was wrong while the only tool was N round trips
-- with a partial-failure story nobody had designed. That objection is
-- about the CLIENT doing the loop. Done here it is one transaction, it
-- runs every `claimable()` gate per line, and it returns what it
-- claimed AND what it skipped with the reason -- so the button can
-- exist and still be honest about the three jobs it could not take.
--
-- Re-runnable.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payout_batches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'paid', 'failed', 'cancelled')),

  -- Snapshotted at open time, exactly as payout_claims does it, and
  -- already masked ('Account ending 1234'). A batch settled last March
  -- must still say where it went even if the partner has changed banks
  -- twice since.
  method       TEXT NOT NULL,
  destination  TEXT NOT NULL,

  -- NULL until it is paid, then frozen at what ACTUALLY left the bank.
  -- An open batch's total is a SUM over its claims and must be read that
  -- way: a stored running total is a denormalised number that drifts
  -- from its own members, which is the mistake 062's header rejects for
  -- the ledger and rejects here for the same reason.
  amount_paise BIGINT CHECK (amount_paise IS NULL OR amount_paise > 0),

  reference       TEXT,
  failure_code    TEXT,
  failure_reason  TEXT,
  idempotency_key TEXT,
  note            TEXT,

  opened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at      TIMESTAMPTZ,
  failed_at    TIMESTAMPTZ,
  settled_by   UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_batches_vendor
  ON public.payout_batches (vendor_id, opened_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_batch_idempotency
  ON public.payout_batches (vendor_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.payout_claims
  ADD COLUMN IF NOT EXISTS batch_id UUID
    REFERENCES public.payout_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_claims_batch
  ON public.payout_claims (batch_id) WHERE batch_id IS NOT NULL;

-- ── The constraint that matters ─────────────────────────────────────
--
-- Two partners' claims in one batch is how a transfer reaches the wrong
-- person. It is not a thing to be careful about in application code; it
-- is a thing the database refuses.
CREATE OR REPLACE FUNCTION public.payout_claim_matches_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_batch public.payout_batches%ROWTYPE;
BEGIN
  IF NEW.batch_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_batch FROM public.payout_batches WHERE id = NEW.batch_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'batch % does not exist', NEW.batch_id;
  END IF;

  IF v_batch.vendor_id <> NEW.vendor_id THEN
    RAISE EXCEPTION 'claim % belongs to vendor %, batch % to vendor %',
      NEW.id, NEW.vendor_id, v_batch.id, v_batch.vendor_id
      USING HINT = 'One batch is one transfer to one bank account.';
  END IF;

  -- Adding to a batch that has already left the bank would put a claim
  -- under a reference that never carried it.
  IF v_batch.status <> 'open' AND
     (TG_OP = 'INSERT' OR OLD.batch_id IS DISTINCT FROM NEW.batch_id) THEN
    RAISE EXCEPTION 'batch % is % and cannot take more claims',
      v_batch.id, v_batch.status;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_claim_matches_batch ON public.payout_claims;
CREATE TRIGGER trg_claim_matches_batch
  BEFORE INSERT OR UPDATE OF batch_id ON public.payout_claims
  FOR EACH ROW EXECUTE FUNCTION public.payout_claim_matches_batch();

-- ══════════════════════════════════════════════════════════════════════
-- open_payout_batch  ·  operator side
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.open_payout_batch(
  p_vendor_id       UUID,
  p_claim_ids       UUID[],
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_batch  UUID;
  v_pay    public.vendor_payout_details%ROWTYPE;
  v_count  INTEGER;
  v_total  BIGINT;
  v_dupe   public.payout_batches%ROWTYPE;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_dupe FROM public.payout_batches
    WHERE vendor_id = p_vendor_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'replayed', true, 'batch_id', v_dupe.id);
    END IF;
  END IF;

  SELECT * INTO v_pay FROM public.vendor_payout_details WHERE vendor_id = p_vendor_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_payout_details');
  END IF;
  IF v_pay.verified_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unverified');
  END IF;

  INSERT INTO public.payout_batches (vendor_id, method, destination, idempotency_key)
  VALUES (
    p_vendor_id, v_pay.method,
    COALESCE(v_pay.upi_id, 'Account ending ' || right(v_pay.account_number, 4)),
    p_idempotency_key)
  RETURNING id INTO v_batch;

  -- Only this vendor's OPEN claims. Anything else in the array is
  -- ignored rather than silently attached, and the count comes back so
  -- the caller can see the difference.
  UPDATE public.payout_claims
     SET batch_id = v_batch
   WHERE id = ANY(p_claim_ids)
     AND vendor_id = p_vendor_id
     AND status = 'requested'
     AND batch_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  SELECT COALESCE(SUM(amount_paise), 0) INTO v_total
  FROM public.payout_claims WHERE batch_id = v_batch;

  PERFORM public.write_money_audit(
    'batch_opened', 'batch', v_batch, p_vendor_id, NULL, v_total, NULL,
    jsonb_build_object('claims', v_count, 'asked', array_length(p_claim_ids, 1)), NULL);

  RETURN jsonb_build_object(
    'ok', true, 'batch_id', v_batch,
    'claims', v_count, 'asked', COALESCE(array_length(p_claim_ids, 1), 0),
    'total_paise', v_total);
END $$;

REVOKE ALL ON FUNCTION public.open_payout_batch(UUID, UUID[], TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_payout_batch(UUID, UUID[], TEXT) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- claim_all_ready  ·  partner side, one button
-- ══════════════════════════════════════════════════════════════════════
--
-- Still one claim per line and still every gate. What it removes is the
-- round trips, and what it adds is `skipped`: a partner who taps "ask
-- for Rs 1,21,136" and gets Rs 98,000 must be told which three jobs did
-- not go and why, in the same response.
CREATE OR REPLACE FUNCTION public.claim_all_ready(
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_vendor  UUID;
  v_line    RECORD;
  v_res     JSONB;
  v_claimed JSONB := '[]'::jsonb;
  v_skipped JSONB := '[]'::jsonb;
  v_total   BIGINT := 0;
  v_i       INTEGER := 0;
BEGIN
  SELECT id INTO v_vendor FROM public.vendors WHERE profile_id = auth.uid();
  IF v_vendor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_a_partner');
  END IF;

  -- Every line this partner has won and delivered. `claimable()` is what
  -- actually decides -- this only narrows the set so the loop is short.
  FOR v_line IN
    SELECT l.id AS line_id
    FROM public.booking_lines l
    JOIN public.dispatch_offers o ON o.line_id = l.id AND o.status = 'ACCEPTED'
    WHERE o.vendor_id = v_vendor
      AND l.delivered_at IS NOT NULL
      AND l.status NOT IN ('cancelled', 'expired', 'disputed')
    ORDER BY l.delivered_at
  LOOP
    v_i := v_i + 1;

    -- The key is per line, derived, so a replay of the whole call
    -- replays every member and creates nothing twice.
    v_res := public.claim_payment(
      v_line.line_id,
      CASE WHEN p_idempotency_key IS NULL THEN NULL
           ELSE p_idempotency_key || ':' || v_line.line_id::text END);

    IF (v_res->>'ok')::boolean THEN
      v_claimed := v_claimed || jsonb_build_array(jsonb_build_object(
        'line_id', v_line.line_id,
        'claim_id', v_res->>'claim_id',
        'amount_paise', (v_res->>'amount_paise')::bigint,
        'replayed', COALESCE((v_res->>'replayed')::boolean, false)));
      v_total := v_total + COALESCE((v_res->>'amount_paise')::bigint, 0);
    ELSE
      -- `too_soon` and `already_claimed` are the ordinary majority here
      -- and are NOT errors; they are the reason the total differs from
      -- what the partner saw. They are returned, not swallowed.
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
        'line_id', v_line.line_id,
        'reason', v_res->>'reason',
        'says', v_res->>'says'));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'claimed', v_claimed,
    'skipped', v_skipped,
    'considered', v_i,
    'total_paise', v_total);
END $$;

REVOKE ALL ON FUNCTION public.claim_all_ready(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_all_ready(TEXT) TO authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────
--
-- Owner reads, operator reads and updates, and NOBODY inserts through a
-- policy: a batch exists only through open_payout_batch above.
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "batch owner reads" ON public.payout_batches;
CREATE POLICY "batch owner reads"
  ON public.payout_batches FOR SELECT
  USING (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators read payout batches" ON public.payout_batches;
CREATE POLICY "operators read payout batches"
  ON public.payout_batches FOR SELECT
  USING (public.caller_is_operator());

DROP POLICY IF EXISTS "operators settle payout batches" ON public.payout_batches;
CREATE POLICY "operators settle payout batches"
  ON public.payout_batches FOR UPDATE
  USING (public.caller_is_operator())
  WITH CHECK (public.caller_is_operator());

COMMIT;
