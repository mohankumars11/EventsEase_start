-- ============================================================
-- 062 · escrow_ledger — every paise, and where it went
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057–061 FIRST.
--
-- ══════════════════════════════════════════════════════════════════════
-- APPEND-ONLY, AND WHY THAT IS NOT PEDANTRY
-- ══════════════════════════════════════════════════════════════════════
--
-- The tempting schema is a `balance` column on `booking_lines` that goes
-- up when the customer pays and down when the partner is paid. It is one
-- column instead of a table, and it is wrong for one reason: an UPDATE
-- destroys what it replaces.
--
-- The day a partner says "you never paid me for the 26th", the only
-- useful answer is a list — money in, fee out, payout out, each with a
-- timestamp and a gateway reference. A balance column can only say what
-- it is now, which is precisely the thing under dispute.
--
-- So nothing here is ever UPDATEd or DELETEd, and a trigger enforces
-- that rather than a convention. A correction is a new compensating row,
-- the way a ledger has always worked. Migration 039 made the same choice
-- for `order_events` and it is why "how long does processing take" is
-- answerable at all.
--
-- ── The balance is a SUM, and it may never go below zero ─────────────
-- Every row is a signed movement of the escrow position for ONE LINE:
--
--   HOLD              +₹12,400   customer's money arrived and is held
--   RELEASE_PARTNER    −₹10,540  paid out after the event
--   RELEASE_PLATFORM   −₹ 1,860  commission taken at the same moment
--   REFUND_CUSTOMER    −₹11,160  cancelled: 90% back
--   PENALTY_PARTNER    −₹ 1,240  cancelled: 10% to the partner, not to us
--
-- SUM(amount_paise) per line is what is currently held. A settled line
-- sums to exactly zero. A negative sum would mean the platform paid out
-- money it never received, and the trigger below refuses the insert that
-- would cause it — which is a far better failure than discovering it in a
-- bank reconciliation a month later.
--
-- ── The 10% penalty goes to the PARTNER, not to Sambramo ─────────────
-- Stated in the plan and worth restating where the money is: a partner
-- who cleared their Saturday and then lost the job is the injured party.
-- A platform that kept the cancellation fee would be charging a customer
-- for the privilege of wasting a partner's day and then pocketing it.
-- PENALTY_PARTNER is a separate kind from RELEASE_PLATFORM precisely so
-- the two can never be quietly conflated in a report.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS escrow_ledger (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES booking_lines(id) ON DELETE RESTRICT,

  -- RESTRICT, not CASCADE, and deliberately unlike every other FK in this
  -- series. A line with money against it must not be deletable at all —
  -- if deleting a booking would erase the record of ₹12,400 having moved,
  -- the delete is the bug.
  kind TEXT NOT NULL CHECK (kind IN (
    'HOLD',
    'RELEASE_PARTNER',
    'RELEASE_PLATFORM',
    'REFUND_CUSTOMER',
    'PENALTY_PARTNER'
  )),

  -- Signed paise. Positive puts money into the line's escrow position,
  -- negative takes it out. Integer paise for the same reason as
  -- `booking_lines.quoted_amount_paise`: this number is handed to a
  -- payment gateway, and a float that has been through JSON is somebody's
  -- refund off by a rounding error.
  amount_paise BIGINT NOT NULL CHECK (amount_paise <> 0),

  -- Which party the movement concerns. Not derivable from `kind` in the
  -- one case that matters — PENALTY_PARTNER moves money to a partner and
  -- REFUND_CUSTOMER moves it to a customer, and a payout report that
  -- guessed would guess wrong on exactly the row somebody is angry about.
  counterparty TEXT NOT NULL CHECK (counterparty IN ('customer','partner','platform')),

  -- ── Provenance ────────────────────────────────────────────────────
  -- Which Razorpay object this traces to. NULL for a movement that has
  -- not reached the gateway yet — the pilot runs `ManualPayout`, where a
  -- RELEASE_PARTNER row is written when the CEO marks it paid and carries
  -- a UTR typed by hand rather than a Route transfer id.
  gateway_payment_id  TEXT,
  gateway_transfer_id TEXT,
  gateway_refund_id   TEXT,
  manual_reference    TEXT,

  -- Which adapter produced this row. `ManualPayout` and `RazorpayRoute`
  -- will coexist during the switchover, and a reconciliation that cannot
  -- tell them apart cannot be checked against either system.
  adapter TEXT NOT NULL DEFAULT 'ManualPayout'
          CHECK (adapter IN ('ManualPayout','RazorpayRoute')),

  note       TEXT,
  actor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Direction has to match the kind ──────────────────────────────────
-- A HOLD of −₹12,400 or a REFUND of +₹11,160 is a sign error, and a sign
-- error in a ledger is invisible until the totals are wrong.
ALTER TABLE escrow_ledger DROP CONSTRAINT IF EXISTS escrow_ledger_sign_matches_kind;
ALTER TABLE escrow_ledger ADD CONSTRAINT escrow_ledger_sign_matches_kind
  CHECK (
    (kind = 'HOLD' AND amount_paise > 0)
    OR (kind <> 'HOLD' AND amount_paise < 0)
  );

-- ── Idempotency, enforced by the database ────────────────────────────
-- Razorpay retries its webhook until it 2xxs, so the handler WILL run
-- more than once for the same payment. One captured payment produces one
-- HOLD per line and no more. Same guarantee, same mechanism, as
-- `uq_event_payments_gateway` in 046.
CREATE UNIQUE INDEX IF NOT EXISTS uq_escrow_hold_per_payment_line
  ON escrow_ledger (line_id, gateway_payment_id)
  WHERE kind = 'HOLD' AND gateway_payment_id IS NOT NULL;

-- A line is released once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_escrow_one_partner_release
  ON escrow_ledger (line_id) WHERE kind = 'RELEASE_PARTNER';

CREATE UNIQUE INDEX IF NOT EXISTS uq_escrow_one_platform_release
  ON escrow_ledger (line_id) WHERE kind = 'RELEASE_PLATFORM';

CREATE INDEX IF NOT EXISTS idx_escrow_ledger_line
  ON escrow_ledger (line_id, created_at);

CREATE INDEX IF NOT EXISTS idx_escrow_ledger_payout_queue
  ON escrow_ledger (created_at DESC) WHERE kind = 'RELEASE_PARTNER';

-- ══════════════════════════════════════════════════════════════════════
-- The two rules, as triggers rather than as hopes
-- ══════════════════════════════════════════════════════════════════════

-- 1 · Nothing is ever changed or removed.
CREATE OR REPLACE FUNCTION public.escrow_ledger_is_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'escrow_ledger is append-only: write a compensating row instead of a % ', TG_OP
    USING HINT = 'A correction is a new row. See the header of migration 062.';
END;
$$;

DROP TRIGGER IF EXISTS escrow_ledger_no_update ON escrow_ledger;
CREATE TRIGGER escrow_ledger_no_update
  BEFORE UPDATE OR DELETE ON escrow_ledger
  FOR EACH ROW EXECUTE FUNCTION public.escrow_ledger_is_append_only();

-- 2 · A line's escrow balance may never go negative.
--
-- This is the guard against paying out money that never arrived. It fires
-- on the INSERT that would break it, so the bad state never exists —
-- rather than being detected afterwards by a reconciliation job, by which
-- point a real transfer has already left a real bank account.
CREATE OR REPLACE FUNCTION public.escrow_balance_stays_solvent()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount_paise), 0) INTO v_balance
    FROM escrow_ledger WHERE line_id = NEW.line_id;

  IF v_balance < 0 THEN
    RAISE EXCEPTION
      'escrow balance for line % would go negative (% paise)', NEW.line_id, v_balance
      USING HINT = 'Releasing or refunding more than was ever held. Check the HOLD row exists.';
  END IF;
  RETURN NULL;
END;
$$;

-- AFTER, and CONSTRAINT so it evaluates at the end of the statement: the
-- balance is only meaningful once NEW is visible in the SUM.
DROP TRIGGER IF EXISTS escrow_ledger_solvency ON escrow_ledger;
CREATE CONSTRAINT TRIGGER escrow_ledger_solvency
  AFTER INSERT ON escrow_ledger
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION public.escrow_balance_stays_solvent();

-- ── What is held right now ───────────────────────────────────────────
-- The number the admin console shows and the one that must reconcile
-- against the Razorpay balance. Defined once, here, so no screen can
-- compute it a second way.
CREATE OR REPLACE VIEW escrow_position AS
  SELECT
    l.id                                        AS line_id,
    l.request_id,
    l.service_name,
    l.status                                    AS line_status,
    COALESCE(SUM(e.amount_paise), 0)            AS held_paise,
    COALESCE(SUM(e.amount_paise) FILTER (WHERE e.kind = 'HOLD'), 0)            AS captured_paise,
    COALESCE(-SUM(e.amount_paise) FILTER (WHERE e.kind = 'RELEASE_PARTNER'), 0) AS paid_partner_paise,
    COALESCE(-SUM(e.amount_paise) FILTER (WHERE e.kind = 'REFUND_CUSTOMER'), 0) AS refunded_paise,
    MAX(e.created_at)                           AS last_movement_at
  FROM booking_lines l
  LEFT JOIN escrow_ledger e ON e.line_id = l.id
  GROUP BY l.id, l.request_id, l.service_name, l.status;

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE escrow_ledger ENABLE ROW LEVEL SECURITY;

-- A customer sees the movements on their own booking — "we are holding
-- ₹12,400 for your decorator" is the sentence that makes escrow worth
-- having, and it needs a row behind it.
DROP POLICY IF EXISTS "customers read own escrow" ON escrow_ledger;
CREATE POLICY "customers read own escrow"
  ON escrow_ledger FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM booking_lines l
    JOIN booking_requests r ON r.id = l.request_id
    WHERE l.id = line_id AND r.customer_id = auth.uid()
  ));

-- A partner sees the movements on lines they won. This is their earnings
-- statement, and it is the answer to "when do I get paid".
DROP POLICY IF EXISTS "partners read own escrow" ON escrow_ledger;
CREATE POLICY "partners read own escrow"
  ON escrow_ledger FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM booking_lines l
    JOIN dispatch_offers o ON o.id = l.accepted_offer_id
    JOIN vendors v ON v.id = o.vendor_id
    WHERE l.id = line_id AND v.profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "admins read escrow" ON escrow_ledger;
CREATE POLICY "admins read escrow"
  ON escrow_ledger FOR SELECT
  USING (get_my_role() IN ('admin','event_coordinator'));

-- No INSERT policy for anyone. Every row is written by the service role:
-- the payment webhook, the release cron, or the admin payout console.
-- A client that could INSERT here could mint a HOLD it never paid for.

COMMIT;
