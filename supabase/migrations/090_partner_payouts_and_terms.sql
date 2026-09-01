-- ══════════════════════════════════════════════════════════════════════
-- 090 · How a partner gets paid, and what they agreed to
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND.
--
-- ── The gap ─────────────────────────────────────────────────────────
--
-- There is no bank account, no UPI id, no PAN and no payout record
-- anywhere in this schema. Not incomplete — absent. A partner can be
-- matched, can accept a job, can be paid FOR by a customer, and the
-- money then sits in the platform's Razorpay balance with nothing in the
-- database saying where it should go next.
--
-- Every other part of the escrow story is built: the ledger (061), the
-- hold, the release, the cancellation ladder. The last mile was never
-- laid, and it is the mile a partner cares about.
--
-- ── Why a separate table ────────────────────────────────────────────
--
-- `vendors` is read constantly — every dispatch joins it, the admin
-- console lists it, `partner_offer_feed` projects from it. A bank
-- account number does not belong in a row that many things select *
-- from, and RLS on a column is not a thing Postgres offers.
--
-- One row per vendor, its own policies, and the default is that nobody
-- can see it. A coordinator browsing partners has no business reading
-- account numbers, and with this shape they cannot.
--
-- ── What is deliberately NOT here ───────────────────────────────────
--
-- No encryption at rest beyond what Supabase already does on the
-- volume, and no tokenisation. That is not an oversight to leave silent:
-- when Razorpay Route is activated the account details move to Razorpay
-- as a linked account and this table keeps only the reference. Until
-- then these columns are the operator's own record for a manual payout,
-- and they are readable by the service role by necessity.
--
-- The honest position is that this is pilot-grade storage for pilot-
-- grade payouts, and it should stop holding raw account numbers the day
-- Route goes live.
--
-- Re-runnable.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · Where the money goes
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.vendor_payout_details (
  vendor_id       UUID PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,

  -- 'upi' or 'bank'. UPI first because it is instant, free, and what a
  -- decorator in Bengaluru actually uses; bank transfer for anybody who
  -- would rather have it in an account.
  method          TEXT NOT NULL CHECK (method IN ('upi', 'bank')),

  -- UPI
  upi_id          TEXT,

  -- Bank
  account_name    TEXT,
  account_number  TEXT,
  ifsc            TEXT,

  -- PAN is required by law above a payout threshold and is asked for
  -- once rather than chased later. Nullable because a partner can start
  -- taking jobs before they supply it -- see the note on `payable`.
  pan             TEXT,

  /* Verified by a human, or by a penny-drop, or not at all.
     A payout must never run against an unverified account: a wrong IFSC
     sends somebody's Saturday to a stranger. */
  verified_at     TIMESTAMPTZ,
  verified_by     UUID REFERENCES public.profiles(id),
  verification_note TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  /* Each method needs its own fields and neither needs the other's.
     Enforced here rather than in the form, because a form is one client
     and this is the only thing both clients and the admin console share. */
  CONSTRAINT payout_method_is_complete CHECK (
    (method = 'upi'  AND upi_id IS NOT NULL AND length(trim(upi_id)) > 2)
    OR
    (method = 'bank' AND account_name IS NOT NULL
                     AND account_number IS NOT NULL
                     AND ifsc IS NOT NULL AND length(trim(ifsc)) = 11)
  )
);

COMMENT ON TABLE public.vendor_payout_details IS
  'Where a partner is paid. One row per vendor, readable only by that '
  'partner and the service role. Pilot-grade: when Razorpay Route is '
  'activated these details move to a linked account and this keeps only '
  'the reference.';

ALTER TABLE public.vendor_payout_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payout_owner_reads ON public.vendor_payout_details;
CREATE POLICY payout_owner_reads ON public.vendor_payout_details
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS payout_owner_writes ON public.vendor_payout_details;
CREATE POLICY payout_owner_writes ON public.vendor_payout_details
  FOR INSERT WITH CHECK (
    vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS payout_owner_updates ON public.vendor_payout_details;
CREATE POLICY payout_owner_updates ON public.vendor_payout_details
  FOR UPDATE USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid())
  );

/* Changing where money goes un-verifies it. Always.
 *
 * Otherwise the attack is obvious and boring: get verified with your own
 * account, then edit the number. The partner re-verifies, which is a
 * small annoyance, and the alternative is a payout to whoever asked
 * last. */
CREATE OR REPLACE FUNCTION public.payout_details_changed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.method IS DISTINCT FROM OLD.method
     OR NEW.upi_id IS DISTINCT FROM OLD.upi_id
     OR NEW.account_number IS DISTINCT FROM OLD.account_number
     OR NEW.ifsc IS DISTINCT FROM OLD.ifsc
  THEN
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payout_details_changed ON public.vendor_payout_details;
CREATE TRIGGER trg_payout_details_changed
  BEFORE UPDATE ON public.vendor_payout_details
  FOR EACH ROW EXECUTE FUNCTION public.payout_details_changed();

-- ══════════════════════════════════════════════════════════════════════
-- 2 · What they agreed to, and when
-- ══════════════════════════════════════════════════════════════════════
--
-- Stamped with a VERSION, for the same reason config/policies.js stamps
-- one: changing the terms must not silently rewrite what somebody
-- already agreed to. A partner who accepted v1 is held to v1 until they
-- accept v2.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version     TEXT;

COMMENT ON COLUMN public.vendors.terms_version IS
  'Which version of the partner terms this vendor accepted. Null means '
  'they have never accepted any, and the app gates on that.';

-- ══════════════════════════════════════════════════════════════════════
-- 3 · Is this partner ready to be paid?
-- ══════════════════════════════════════════════════════════════════════
--
-- One place that answers it, so the app, the admin console and any
-- future payout run cannot disagree about who is payable.

CREATE OR REPLACE VIEW public.partner_readiness
WITH (security_invoker = on) AS
SELECT
  v.id                                   AS vendor_id,
  v.business_name,
  v.terms_accepted_at IS NOT NULL        AS terms_accepted,
  v.terms_version,
  p.vendor_id IS NOT NULL                AS payout_added,
  p.method                               AS payout_method,
  p.verified_at IS NOT NULL              AS payout_verified,
  p.pan IS NOT NULL                      AS pan_added,
  /* Payable means: they agreed to the terms, we know where to send it,
     and somebody checked that destination. PAN is not in this test --
     it is a threshold requirement, not a per-payout one, and blocking a
     first 2,000-rupee payout on it would be inventing a rule. */
  (v.terms_accepted_at IS NOT NULL
   AND p.vendor_id IS NOT NULL
   AND p.verified_at IS NOT NULL)        AS payable
FROM public.vendors v
LEFT JOIN public.vendor_payout_details p ON p.vendor_id = v.id;

COMMENT ON VIEW public.partner_readiness IS
  'Whether a partner can actually be paid. security_invoker so a partner '
  'sees only their own row through the underlying policies.';

GRANT SELECT ON public.partner_readiness TO authenticated, service_role;

COMMIT;
