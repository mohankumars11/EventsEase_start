-- ══════════════════════════════════════════════════════════════════════
-- 122 · A trade container is not a public object
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 120 first. Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT 120 GOT WRONG
-- ══════════════════════════════════════════════════════════════════════
--
-- 120 gave partner_listings the same three policies vendor_services has,
-- on the reasoning that one pattern is easier to hold in your head than
-- two. The third of them:
--
--   public_reads_live_listings   status = 'live' AND the vendor is APPROVED
--
-- That is right for vendor_services, which holds the OFFERING a customer
-- is shopping for. It is wrong here, and a check against a real partner
-- session found it: signed in as one partner, twelve of another
-- partner's trades came back — and with them `review_note`,
-- `reviewed_at` and `submitted_at`.
--
-- `review_note` is what an operator writes when they send a listing
-- back. It is a private remark about somebody's business, to be read by
-- that business and by us. Row-level security is row level, so a policy
-- that exposes the row exposes the note with it.
--
-- It read as harmless in testing because no operator had written one
-- yet. Every note is null today; the leak arrives with the first one.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THE ANSWER IS TO REMOVE IT RATHER THAN NARROW IT
-- ══════════════════════════════════════════════════════════════════════
--
-- Nothing customer-facing reads this table. It was added for the partner
-- app and the operator console; dispatch still joins on
-- vendor_services.category, and a customer browsing still reads
-- vendor_services, whose own public policy is unchanged.
--
-- So the public policy is not being narrowed to fit a caller — there is
-- no caller. Keeping a policy against a future need is how a table ends
-- up readable by everyone for a year before anybody asks why.
--
-- If a customer surface later needs "which trades does this partner
-- offer", that is a VIEW over the safe columns — id, vendor_id, trade —
-- with its own grant. Columns are chosen there; they cannot be chosen
-- in a row policy.
BEGIN;

DROP POLICY IF EXISTS "public_reads_live_listings" ON public.partner_listings;

-- What remains, unchanged from 120:
--   partner_manages_own_listings   the partner's own rows, full control
--   operators_all_listings         admin and event_coordinator
--
-- Which is the rule §53 asks for: Partner A cannot reach Partner B.

COMMENT ON COLUMN public.partner_listings.review_note IS
  'What an operator wrote when sending this trade back. Private to that partner and to us — see 122 for why this table has no public read policy.';

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- AFTERWARDS
-- ══════════════════════════════════════════════════════════════════════
--
--   node scripts/check-listing-rls.mjs
--
-- "another partner's trades are invisible" must pass. It is the check
-- that found this.
