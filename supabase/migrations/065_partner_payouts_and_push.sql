-- ============================================================
-- 065 · partner payouts, KYC state, and push tokens
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057–062 FIRST.
--
-- ── Why payout details are their own table ───────────────────────────
-- Because `vendors` is world-readable. Migration 001 gave it
-- "Public can view vendors" FOR SELECT USING (TRUE), and the app depends
-- on that — the matching screen shows a partner's name and rating to a
-- customer who is not signed in as them.
--
-- A bank account number added to that table would be published. Not
-- leaked through a subtle policy bug: published, immediately, by a policy
-- that is working exactly as intended for every other column on the row.
-- So the money details live here, behind their own RLS, and the join is
-- the price of that safety.
--
-- ── What is stored and what deliberately is not ──────────────────────
-- The account NUMBER is not stored. Razorpay Route holds it against a
-- linked account id, and that id is what a transfer needs. Keeping our
-- own copy would mean holding the most sensitive field in the business
-- to enable exactly nothing that the id does not already enable.
--
-- What IS kept is the last four digits and the bank name — enough for a
-- partner to recognise which of their accounts we are paying, which is
-- the only thing they need to see.
--
-- ── Two adapters, one table ──────────────────────────────────────────
-- The pilot pays out by hand: the CEO reads the release queue and makes
-- a transfer, then records the UTR. Route replaces that when it is
-- approved and every partner is KYC'd. Both write here, and `adapter` on
-- `escrow_ledger` (062) says which produced a given movement — a
-- reconciliation that cannot tell them apart cannot be checked against
-- either system.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS partner_payout_accounts (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- ── KYC ───────────────────────────────────────────────────────────
  -- `pending` is the honest default and the one that matters: a partner
  -- can accept jobs before they are KYC'd — supply is scarce and blocking
  -- signup on paperwork loses partners — but they cannot be PAID until
  -- this reaches `verified`. The release queue filters on it.
  kyc_status TEXT NOT NULL DEFAULT 'pending'
             CHECK (kyc_status IN ('pending','submitted','verified','rejected')),
  kyc_note   TEXT,
  kyc_verified_at TIMESTAMPTZ,

  -- PAN is stored because it is required for TDS on payouts above the
  -- statutory threshold and for the partner's own 26AS to reconcile.
  -- Uppercased and shape-checked; not validated against the ITD, which
  -- has no open API.
  pan_number TEXT,

  -- GST is nullable and that is correct — most individual decorators,
  -- cooks and dhol players are below the registration threshold, and a
  -- NOT NULL here would lock the majority of the supply base out of
  -- getting paid.
  gstin TEXT,

  -- ── Bank, minimally ───────────────────────────────────────────────
  bank_name        TEXT,
  account_last4    TEXT CHECK (account_last4 IS NULL OR account_last4 ~ '^[0-9]{4}$'),
  account_holder   TEXT,
  ifsc             TEXT,
  upi_vpa          TEXT,

  -- Razorpay Route's id for this partner. NULL for the whole manual
  -- pilot, which is why nothing here is NOT NULL.
  route_account_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_account_per_vendor
  ON partner_payout_accounts (vendor_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_route_account
  ON partner_payout_accounts (route_account_id)
  WHERE route_account_id IS NOT NULL;

ALTER TABLE partner_payout_accounts DROP CONSTRAINT IF EXISTS payout_pan_shape;
ALTER TABLE partner_payout_accounts ADD CONSTRAINT payout_pan_shape
  CHECK (pan_number IS NULL OR pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$');

ALTER TABLE partner_payout_accounts DROP CONSTRAINT IF EXISTS payout_ifsc_shape;
ALTER TABLE partner_payout_accounts ADD CONSTRAINT payout_ifsc_shape
  CHECK (ifsc IS NULL OR ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$');

-- Verified means somebody or something checked. It must carry a time, or
-- "when were they cleared to be paid" is unanswerable at audit.
ALTER TABLE partner_payout_accounts DROP CONSTRAINT IF EXISTS payout_verified_has_time;
ALTER TABLE partner_payout_accounts ADD CONSTRAINT payout_verified_has_time
  CHECK (kyc_status <> 'verified' OR kyc_verified_at IS NOT NULL);

DROP TRIGGER IF EXISTS partner_payout_accounts_updated_at ON partner_payout_accounts;
CREATE TRIGGER partner_payout_accounts_updated_at
  BEFORE UPDATE ON partner_payout_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE partner_payout_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners manage own payout account" ON partner_payout_accounts;
CREATE POLICY "partners manage own payout account"
  ON partner_payout_accounts FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "admins read payout accounts" ON partner_payout_accounts;
CREATE POLICY "admins read payout accounts"
  ON partner_payout_accounts FOR SELECT
  USING (get_my_role() IN ('admin','event_coordinator'));

DROP POLICY IF EXISTS "admins update payout accounts" ON partner_payout_accounts;
CREATE POLICY "admins update payout accounts"
  ON partner_payout_accounts FOR UPDATE
  USING (get_my_role() IN ('admin','event_coordinator'));

-- A partner can write their own KYC fields but must never write
-- `kyc_status = 'verified'` — that is the whole point of verification.
CREATE OR REPLACE FUNCTION public.guard_kyc_self_verify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() IN ('admin','event_coordinator') THEN
    RETURN NEW;
  END IF;
  IF NEW.kyc_status IN ('verified','rejected')
     AND NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'kyc_status % is set by review, not by the partner', NEW.kyc_status;
  END IF;
  -- Route ids come from Razorpay, never from a form.
  NEW.route_account_id := OLD.route_account_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partner_payout_kyc_guard ON partner_payout_accounts;
CREATE TRIGGER partner_payout_kyc_guard
  BEFORE UPDATE ON partner_payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.guard_kyc_self_verify();

-- ══════════════════════════════════════════════════════════════════════
-- push_tokens
-- ══════════════════════════════════════════════════════════════════════
-- One row per device per profile. A partner with a phone and a tablet
-- gets both buzzed, because the whole dispatch model rests on somebody
-- actually seeing a 45-second offer.
--
-- Milestone 1 does not send push at all — the demo runs on Supabase
-- Realtime with both screens open. The table ships now because the
-- registration call belongs in the app shell from the start, and
-- retrofitting device identity after a Play Store release means asking
-- every existing install to re-grant a permission.
CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  token    TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web','android','ios')),

  -- Which app registered it. The TWA build ships two apps off one
  -- codebase, and a partner-side job offer must never surface in the
  -- customer app.
  app TEXT NOT NULL DEFAULT 'customer' CHECK (app IN ('customer','partner')),

  device_label TEXT,
  -- Stamped on every successful send. A token quiet for months is a
  -- reinstalled phone, and pruning on age is what stops the partner
  -- notification fan-out slowly filling with dead endpoints.
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FCM reissues a token to whichever install currently holds it, so the
-- token is the identity — not (profile, device).
CREATE UNIQUE INDEX IF NOT EXISTS uq_push_tokens_token ON push_tokens (token);

CREATE INDEX IF NOT EXISTS idx_push_tokens_profile
  ON push_tokens (profile_id, app) WHERE failure_count < 5;

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own push tokens" ON push_tokens;
CREATE POLICY "users manage own push tokens"
  ON push_tokens FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

COMMIT;
