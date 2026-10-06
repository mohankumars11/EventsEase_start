-- ═══════════════════════════════════════════════════════════════════════
-- 157 · A review with no clock on it
-- ═══════════════════════════════════════════════════════════════════════
--
-- Needs 142, which created `review_due_at` and `review_sla_hours()`.
--
-- ══════════════════════════════════════════════════════════════════════
-- FOUR OF SEVEN PARTNERS UNDER REVIEW HAVE NO DEADLINE
-- ══════════════════════════════════════════════════════════════════════
--
-- `submit_for_review()` sets `review_due_at`. But `ReviewPublishStep`
-- has a fallback for when the RPC is missing (PGRST202) that does a raw
-- `update({ verification_status: 'submitted' })` instead — and that
-- path sets no deadline at all. Every partner who submitted before 142
-- was applied went through it.
--
-- So the Jobs card had nothing to count to. It said "we will confirm
-- when to expect an answer shortly", which is true, and reads to the
-- person waiting as "we have not looked at this and cannot say when we
-- will" — the opposite of what a review card is for.
--
-- ── Derived, not invented ───────────────────────────────────────────
-- `submitted_at + review_sla_hours()`. That is the same arithmetic
-- `submit_for_review()` would have done at the time, using the moment
-- they actually submitted, which is a real column written by a trigger
-- in 067. Nothing here picks a date to make a countdown look good: a
-- partner who submitted four days ago gets a deadline four days in the
-- past and the card says so.
--
-- ── The two with no submitted_at either ─────────────────────────────
-- Left alone. There is no honest deadline for a row that does not know
-- when it was submitted, and `now() + 24h` would restart a clock that
-- may have been running for a month. The card handles a missing
-- deadline by counting UP from nothing instead.

BEGIN;

UPDATE public.vendors
   SET review_due_at = submitted_at + (public.review_sla_hours() || ' hours')::interval
 WHERE verification_status = 'submitted'
   AND review_due_at IS NULL
   AND submitted_at IS NOT NULL;

-- ── And stop it happening again ───────────────────────────────────────
-- The fallback in ReviewPublishStep writes `verification_status` with a
-- plain UPDATE, so nothing computes a deadline. 067's trigger already
-- stamps `submitted_at` on that transition; this stamps the deadline in
-- the same place, from the same SLA, so the two can never disagree.
--
-- It only fills a NULL. An operator who moved a deadline with
-- `extend_review()` must not have it reset by a partner touching an
-- unrelated column.
CREATE OR REPLACE FUNCTION public.stamp_review_due()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status = 'submitted' AND NEW.review_due_at IS NULL THEN
    NEW.review_due_at :=
      COALESCE(NEW.submitted_at, now()) + (public.review_sla_hours() || ' hours')::interval;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stamp_review_due ON public.vendors;
CREATE TRIGGER trg_stamp_review_due
  BEFORE INSERT OR UPDATE OF verification_status, submitted_at ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.stamp_review_due();

COMMENT ON FUNCTION public.stamp_review_due() IS
  'Fills review_due_at when a row becomes submitted without one. Never overwrites an existing deadline - extend_review() owns those.';

COMMIT;
