-- ============================================================
-- 066 · Stop a partner verifying themselves
--
-- APPLY BY HAND in Supabase → SQL Editor.
--
-- ⚠ THIS ONE STANDS ALONE. It depends on nothing else in the 057–067
-- series and can be applied TODAY, ahead of all of it. It touches no
-- table that does not already exist and adds no column.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THIS IS URGENT AND SEPARATE
-- ══════════════════════════════════════════════════════════════════════
--
-- The live policy on `vendors`, as replaced by migration 027, is:
--
--     CREATE POLICY "Vendor can update own record"
--       ON vendors FOR UPDATE
--       USING      (profile_id = auth.uid())
--       WITH CHECK (profile_id = auth.uid());
--
-- 027 added the WITH CHECK to stop a partner reassigning their row to
-- somebody else's profile, and it does that correctly. But it is still
-- FOR UPDATE across EVERY COLUMN — and that includes `is_verified` and
-- `is_featured`.
--
-- So any signed-in partner can, today, mark themselves verified and
-- featured with a single PATCH against the REST endpoint. The app offers
-- no such button, which is why nobody has noticed. RLS is the security
-- boundary, not the UI, and a REST client does not need a button.
--
-- ── Why it has been harmless, and why it stops being harmless ────────
-- `is_verified` currently decides whether a badge renders and whether a
-- partner appears in a coordinator's sourcing list. Unpleasant to abuse,
-- not dangerous.
--
-- `match_partners()` (migration 060) makes it the gate on receiving real
-- bookings and real customer money held in escrow. At that point a
-- self-verified partner is an unvetted stranger being dispatched to
-- somebody's home, and the customer was told we verified them.
--
-- That is why this is not waiting for the rest of the series.
--
-- ── Why a trigger and not a better policy ────────────────────────────
-- RLS grants or denies a WHOLE ROW. It cannot express "this partner may
-- update every column except these three". Postgres has column-level
-- GRANTs, but they apply to a role rather than to a row and would also
-- block the service role paths that legitimately write these fields.
--
-- A BEFORE UPDATE trigger can say exactly that, and says it for every
-- writer — including a future one nobody has thought of yet.
--
-- ── Silently restored rather than raising ────────────────────────────
-- These are not fields a partner is ever shown, so an attempt to write
-- one is a client doing something it should not. The right response is
-- for it to have no effect, not for the partner's legitimate profile
-- edit to fail with an exception they cannot act on.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.guard_vendor_self_verify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and coordinators write these fields as their actual job.
  IF get_my_role() IN ('admin','event_coordinator') THEN
    RETURN NEW;
  END IF;

  -- Everyone else: the trust fields are read-only, whatever they sent.
  NEW.is_verified := OLD.is_verified;
  NEW.is_featured := OLD.is_featured;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_self_verify_guard ON vendors;
CREATE TRIGGER vendors_self_verify_guard
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_self_verify();

-- ── Was anybody already exploiting it? ───────────────────────────────
-- Worth knowing before assuming not. This does not change any data; it
-- just surfaces verified partners with no admin trail behind them, which
-- on a pre-launch database should be a short and explicable list.
--
--   SELECT id, business_name, is_verified, is_featured, created_at
--     FROM vendors WHERE is_verified = TRUE OR is_featured = TRUE
--    ORDER BY created_at DESC;
--
-- Migration 067 adds the audit log that makes this answerable properly
-- from here on.

COMMIT;
