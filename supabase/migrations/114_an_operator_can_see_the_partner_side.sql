-- ══════════════════════════════════════════════════════════════════════
-- 114 · An operator can see the partner side
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable.
--
-- The partner console reads a partner's whole record. Three of the
-- tables it needs were written owner-only, which does not fail loudly —
-- RLS returns ZERO ROWS, so the console renders "no payout method" for
-- a partner who has one, and an operator makes a decision on an absence
-- that is really a permission.
--
-- That is the worst shape a permission bug can take: it looks like data.
--
-- ── Nothing here grants a WRITE that did not exist ──────────────────
-- Reads, plus the one update that lets a claim be settled. A partner's
-- bank details stay un-editable by anybody but the partner: 090's
-- payout_details_changed trigger nulls the verification on any change,
-- and an operator quietly correcting an account number would clear the
-- verification they themselves did.
--
-- ── caller_is_operator(), not an inlined role check ─────────────────
-- 075 defines it, and it covers admin, event_coordinator and the
-- service role in one place. Inlining `EXISTS (SELECT 1 FROM profiles
-- WHERE role = 'admin')` into a policy is what 006 exists to undo, and
-- it silently excludes coordinators — who are the people actually doing
-- this work.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · Payout details — read only
-- ══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "operators read payout details" ON public.vendor_payout_details;
CREATE POLICY "operators read payout details"
  ON public.vendor_payout_details FOR SELECT
  USING (public.caller_is_operator());

COMMENT ON TABLE public.vendor_payout_details IS
  'How a partner is paid. Owner-writable; operators may READ it so the '
  'console can say whether somebody can be paid at all. Deliberately not '
  'operator-writable: the payout_details_changed trigger nulls '
  'verification on any change, so an operator "fixing" an account number '
  'would silently revoke the verification they did.';

-- ══════════════════════════════════════════════════════════════════════
-- 2 · Payout claims — read, and settle
-- ══════════════════════════════════════════════════════════════════════
--
-- 091 gave the partner SELECT on their own claims and nobody anything
-- else, so a claim could be raised and there was no supported way to
-- answer it. Settling is an operator act by definition — it means money
-- left the account — so the UPDATE is here rather than in an RPC only
-- because the columns it touches are status, settled_at, settled_by and
-- reference, none of which change what is owed.
DROP POLICY IF EXISTS "operators read payout claims" ON public.payout_claims;
CREATE POLICY "operators read payout claims"
  ON public.payout_claims FOR SELECT
  USING (public.caller_is_operator());

DROP POLICY IF EXISTS "operators settle payout claims" ON public.payout_claims;
CREATE POLICY "operators settle payout claims"
  ON public.payout_claims FOR UPDATE
  USING (public.caller_is_operator())
  WITH CHECK (public.caller_is_operator());

-- ══════════════════════════════════════════════════════════════════════
-- 3 · The partner's own uploads — read
-- ══════════════════════════════════════════════════════════════════════
--
-- 102 and 110 key this bucket on `auth.uid()`, so only the partner can
-- read their own files. `partner-documents` (093) already admits an
-- operator for exactly this reason; portfolio photographs and menu cards
-- are the evidence a listing is reviewed AGAINST, and a reviewer who
-- cannot open them is approving a claim on trust.
--
-- Read only. Nothing here lets an operator upload into a partner's
-- folder or delete their work.
DROP POLICY IF EXISTS "operators read partner uploads" ON storage.objects;
CREATE POLICY "operators read partner uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-uploads' AND public.caller_is_operator());

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- CHECK IT
-- ══════════════════════════════════════════════════════════════════════
--
--   -- as an operator, all three should return rows rather than nothing
--   SELECT count(*) FROM vendor_payout_details;
--   SELECT count(*) FROM payout_claims;
--   SELECT count(*) FROM storage.objects WHERE bucket_id = 'partner-uploads';
