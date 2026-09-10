-- ══════════════════════════════════════════════════════════════════════
-- 118 · A partner does not approve their own work
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 110 and 117 first.
-- Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE GATE 110 DESCRIBED AND NEVER BUILT
-- ══════════════════════════════════════════════════════════════════════
--
-- `partner_work` has a review ladder -- under_review, live, rejected --
-- and a public policy that shows the world anything marked 'live'. What
-- it does not have is anything stopping the partner marking it.
--
-- `partner_work_own` is FOR ALL, and no trigger guards the column. So
-- from a browser console a partner could do
--
--   supabase.from('partner_work').update({ review_status: 'live' })
--
-- and publish whatever they liked. That has been true since 110 shipped.
-- It has never been exploited for the reason none of this was: nothing
-- read the table, so 'live' meant nothing to anybody.
--
-- The moment an operator queue exists and a customer surface reads it,
-- both of which are landing now, it starts to matter a great deal.
--
-- ── The fix is free ─────────────────────────────────────────────────
-- freeze_review_status() was written against NEW.review_status and
-- OLD.review_status and nothing else -- no table name anywhere in it --
-- and 112 made it operator-aware. So it attaches here verbatim, and 117's
-- amendment comes with it: a partner whose photograph was refused may
-- send it back once they have replaced it, and may do nothing else.
--
-- ══════════════════════════════════════════════════════════════════════
-- AND THE HALF OF THE CUSTOMER PATH THAT WAS NEVER WRITTEN
-- ══════════════════════════════════════════════════════════════════════
--
-- 110 wrote the TABLE policy: anyone may read a row whose review_status
-- is 'live'. It did not write the STORAGE policy, and those are two
-- separate gates.
--
-- `createSignedUrl` is authorised by the caller's own SELECT on
-- storage.objects. Today that is the owner (102, keyed on auth.uid())
-- and operators (114). A customer is neither -- so a customer can read
-- the ROW describing a live photograph and still cannot mint a URL for
-- the file. The portfolio would render as a grid of broken tiles.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · The same freeze, on the same terms
-- ══════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_freeze_partner_work_review ON public.partner_work;
CREATE TRIGGER trg_freeze_partner_work_review
  BEFORE UPDATE ON public.partner_work
  FOR EACH ROW EXECUTE FUNCTION public.freeze_review_status();

COMMENT ON COLUMN public.partner_work.review_status IS
  'under_review until an operator reads it. Guarded by '
  'freeze_review_status (118) exactly as vendor_services is -- a partner '
  'may send a refused item back once they have replaced it, and may not '
  'publish anything themselves.';

-- ══════════════════════════════════════════════════════════════════════
-- 2 · A customer can fetch a file the row says is live
-- ══════════════════════════════════════════════════════════════════════
--
-- Scoped to the row, not to the bucket: the predicate joins back to
-- partner_work and requires review_status = 'live'. Everything still
-- under review, and everything refused, stays unreachable -- so this
-- grants exactly what an operator has approved and nothing else.
DROP POLICY IF EXISTS "anyone reads approved partner work" ON storage.objects;
CREATE POLICY "anyone reads approved partner work"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'partner-uploads'
    AND EXISTS (
      SELECT 1 FROM public.partner_work w
       WHERE w.storage_path = storage.objects.name
         AND w.review_status = 'live'
    )
  );

/* The join above runs per object on every signed-URL mint, so the path
   it looks up needs to be indexed. Without this a gallery of six is six
   sequential scans of the table. */
CREATE INDEX IF NOT EXISTS partner_work_by_path
  ON public.partner_work (storage_path) WHERE storage_path IS NOT NULL;

-- The operator's queue.
CREATE INDEX IF NOT EXISTS partner_work_unread
  ON public.partner_work (review_status, created_at)
  WHERE review_status = 'under_review';

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- CHECK IT
-- ══════════════════════════════════════════════════════════════════════
--
--   -- signed in as a PARTNER, this must silently do nothing:
--   --   update partner_work set review_status = 'live' where vendor_id = '<theirs>';
--   SELECT review_status, count(*) FROM partner_work GROUP BY 1;
