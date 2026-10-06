-- ══════════════════════════════════════════════════════════════════════
-- 117 · A listing has a life
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 112 first. Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- REJECTION IS CURRENTLY A BLACK HOLE
-- ══════════════════════════════════════════════════════════════════════
--
-- An operator sends a listing back with a note. The partner reads it,
-- fixes exactly what was asked, and then... nothing. `freeze_review_status`
-- reverts any non-operator change to `review_status`, so they cannot
-- resubmit; and the console's queue is built from `under_review` only, so
-- the row is in nobody's list. It sits at `rejected` forever.
--
-- "Send it back" has therefore never been a real operator action. It is
-- a way of ending a conversation. Every other rule in this file depends
-- on fixing that first, which is why it is first.
--
-- ══════════════════════════════════════════════════════════════════════
-- AND EDITING A LIVE LISTING IS UNREVIEWED
-- ══════════════════════════════════════════════════════════════════════
--
-- The edit path writes `price`, `unit`, `min_quantity` and the whole
-- rebuilt `specs` blob straight onto a row whose review_status is
-- 'live'. The freeze trigger guards the STATUS column and nothing else.
--
-- So a listing approved at ₹400 a plate for two cuisines becomes ₹4,000
-- a plate for eleven, dispatch keeps matching on it, and no operator
-- ever sees the change. That is the "he can post the listing which he
-- cannot post" problem, and it is a hole in review, not in the partner.
--
-- ── Flagged, not taken down ─────────────────────────────────────────
-- The obvious fix -- send an edited listing back to 'under_review' --
-- is wrong, and worth saying why. It removes a partner's income for up
-- to a day every time they correct a typo in a price. The lesson a
-- partner takes from that is never to update their prices, which is the
-- exact opposite of what dispatch needs, and the best partners learn it
-- first. So the row STAYS LIVE and stays dispatchable, and a queue tells
-- an operator to go and look.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · The one transition a partner may make
-- ══════════════════════════════════════════════════════════════════════
--
-- rejected → under_review, and nothing else. Not live (that is approval,
-- and approving yourself is the whole reason this trigger exists), not
-- rejected → rejected, not live → anything.
CREATE OR REPLACE FUNCTION public.freeze_review_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN RETURN NEW; END IF;

  IF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
    /* The partner saying "I have fixed it". The only door, and it only
       opens one way: a rejected row may re-enter the queue. Anything
       else is still reverted in silence, exactly as before. */
    IF OLD.review_status = 'rejected' AND NEW.review_status = 'under_review' THEN
      NEW.reviewed_at  := NULL;
      NEW.review_note  := NULL;   -- the note described the old version
    ELSE
      NEW.review_status := OLD.review_status;
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 2 · A material change to a live listing is flagged
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.vendor_services
  ADD COLUMN IF NOT EXISTS revised_at TIMESTAMPTZ;

COMMENT ON COLUMN public.vendor_services.revised_at IS
  'When a partner last changed the substance of a LIVE listing -- price, '
  'unit, minimum or specs. Newer than reviewed_at means an operator has '
  'not seen the current version. The row stays live meanwhile: taking it '
  'down for a price typo teaches partners never to update prices.';

CREATE OR REPLACE FUNCTION public.flag_listing_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  /* An operator's own edit is a review, not a revision. */
  IF public.caller_is_operator() THEN RETURN NEW; END IF;

  IF OLD.review_status = 'live' AND NEW.review_status = 'live'
     AND (NEW.price        IS DISTINCT FROM OLD.price
       OR NEW.unit         IS DISTINCT FROM OLD.unit
       OR NEW.min_quantity IS DISTINCT FROM OLD.min_quantity
       OR NEW.specs        IS DISTINCT FROM OLD.specs)
  THEN
    NEW.revised_at := now();
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_flag_listing_revision ON public.vendor_services;
CREATE TRIGGER trg_flag_listing_revision
  BEFORE UPDATE ON public.vendor_services
  FOR EACH ROW EXECUTE FUNCTION public.flag_listing_revision();

-- The operator's "changed since approval" queue.
CREATE INDEX IF NOT EXISTS idx_vendor_services_revised
  ON public.vendor_services (revised_at)
  WHERE review_status = 'live' AND revised_at IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════
-- 3 · One offering, one row
-- ══════════════════════════════════════════════════════════════════════
--
-- The picker disables an offering a partner already has, but that is a
-- UI guard: it does not survive a double tap, a retry after a timeout,
-- or two devices. The database should hold the rule.
--
-- ── The seeded network already breaks it ────────────────────────────
-- 58 duplicate (vendor_id, category, name) groups exist, 89 extra rows,
-- and every one of them belongs to a SYNTHETIC partner -- the seeding
-- script has no such guard. Zero real partners are affected, checked
-- before this was written.
--
-- So the extras are removed first, oldest row of each group kept.
-- Nothing references vendor_services -- verified, there is no foreign
-- key pointing at it anywhere -- so this cascades nothing.
DELETE FROM public.vendor_services a
 USING public.vendor_services b
 WHERE a.vendor_id = b.vendor_id
   AND a.category  = b.category
   AND a.name      = b.name
   AND (a.created_at, a.id) > (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_services_offering
  ON public.vendor_services (vendor_id, category, name);

-- ══════════════════════════════════════════════════════════════════════
-- 4 · The backstop on what is in flight
-- ══════════════════════════════════════════════════════════════════════
--
-- The real gate is in the app, where it can explain itself: while a
-- partner has three listings waiting to be read, or any listing sent
-- back, the add path closes and says why. That is the rule a partner
-- will actually meet, and it is honest -- the constraint is OUR queue,
-- not their ambition, and it clears itself.
--
-- This is only the floor under it, for the case where the UI is
-- bypassed. Deliberately far above the UI's three: a backstop that
-- fires during normal use is a second rule nobody knew about.
CREATE OR REPLACE FUNCTION public.cap_unreviewed_listings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open INTEGER;
BEGIN
  IF public.caller_is_operator() THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_open
    FROM vendor_services
   WHERE vendor_id = NEW.vendor_id
     AND review_status = 'under_review';

  IF v_open >= 15 THEN
    RAISE EXCEPTION
      'Too many listings are waiting to be read. Wait for the ones you have sent before adding more.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_cap_unreviewed_listings ON public.vendor_services;
CREATE TRIGGER trg_cap_unreviewed_listings
  BEFORE INSERT ON public.vendor_services
  FOR EACH ROW EXECUTE FUNCTION public.cap_unreviewed_listings();

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- CHECK IT
-- ══════════════════════════════════════════════════════════════════════
--
--   -- nothing should come back
--   SELECT vendor_id, category, name, count(*)
--     FROM vendor_services GROUP BY 1,2,3 HAVING count(*) > 1;
--
--   -- the operator's "changed since approval" queue
--   SELECT listing_code, name, revised_at, reviewed_at
--     FROM vendor_services
--    WHERE review_status = 'live' AND revised_at > reviewed_at;
