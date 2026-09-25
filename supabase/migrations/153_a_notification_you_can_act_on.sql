-- ═══════════════════════════════════════════════════════════════════════
-- 153 · A notification you can act on, and put away
-- ═══════════════════════════════════════════════════════════════════════
--
-- 125 built `partner_notifications` properly: RLS-isolated, indexed for
-- the unread case, with a column guard so `read_at` is the only field a
-- partner can write. Nothing here replaces any of that.
--
-- What it lacked was everything that makes an inbox an inbox.
--
-- ── There is no way to put one away ───────────────────────────────────
-- A partner reads a notification and it stays, for ever, in a feed
-- capped at forty rows. So the calendar reminder from three weeks ago
-- sits above the payout that landed this morning, and the only way to
-- clear it is to scroll past it again tomorrow.
--
-- `is_archived`, not DELETE. This table is the sweep's own dedupe ledger
-- -- `calendarSweep.js` decides whether to nudge a partner by querying
-- the rows it has already sent -- so deleting a notification would make
-- the system forget it had spoken and say the same thing again a day
-- later. It is also the only record that a partner was told something
-- before their account changed, which is a thing an operator will one
-- day need to answer for.
--
-- ── Nothing distinguishes urgent from interesting ─────────────────────
-- Nine kinds, no priority. So "your payment is ready" and "extend your
-- calendar" arrive as peers, and the moment marketing joins them the
-- operational ones start getting scrolled past. `priority` exists so the
-- inbox can rank, and so a marketing row can never outrank a job.
--
-- ── A notification cannot expire ──────────────────────────────────────
-- "4 customers asked about 12 October" is worth reading on the 1st and
-- is noise on the 13th. `expires_at` lets a row stop being shown without
-- being destroyed.

BEGIN;

ALTER TABLE public.partner_notifications
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority    TEXT,
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata    JSONB;

-- Ordered by urgency, not alphabetically, because the ORDER BY in the
-- inbox reads this list. 'marketing' sits below 'low' on purpose: a
-- campaign must never sort above a job a partner has not answered.
ALTER TABLE public.partner_notifications DROP CONSTRAINT IF EXISTS partner_notifications_priority_check;
ALTER TABLE public.partner_notifications ADD CONSTRAINT partner_notifications_priority_check
  CHECK (priority IS NULL OR priority IN ('critical','high','normal','low','marketing'));

-- 148 widened this with 'calendar'. 'marketing' joins it for the
-- promotion work, and 'referral' for the partner-invite lifecycle.
ALTER TABLE public.partner_notifications DROP CONSTRAINT IF EXISTS partner_notifications_kind_check;
ALTER TABLE public.partner_notifications ADD CONSTRAINT partner_notifications_kind_check
  CHECK (kind IN (
    'offer','job','payout','verification','listing','review','message','system',
    'calendar','marketing','referral'));

COMMENT ON COLUMN public.partner_notifications.is_archived IS
  'Hidden from the partner inbox. NEVER deleted: this table is the calendar sweep''s dedupe ledger and the record that a partner was told something.';
COMMENT ON COLUMN public.partner_notifications.priority IS
  'critical > high > normal > low > marketing. A campaign must never outrank an unanswered job.';
COMMENT ON COLUMN public.partner_notifications.expires_at IS
  'Past this, the row stops being shown without being destroyed. For notifications about a specific date.';

-- ── The feed index has to know about archiving ────────────────────────
-- 125's unread index is `(vendor_id) WHERE read_at IS NULL`. Every query
-- now also filters on is_archived, so the partial index stops matching
-- and the planner falls back to the feed index plus a filter. Cheap to
-- state correctly; expensive to discover later.
DROP INDEX IF EXISTS idx_partner_notifications_unread;
CREATE INDEX IF NOT EXISTS idx_partner_notifications_unread
  ON public.partner_notifications (vendor_id)
  WHERE read_at IS NULL AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_partner_notifications_inbox
  ON public.partner_notifications (vendor_id, created_at DESC)
  WHERE is_archived = false;

-- ═══════════════════════════════════════════════════════════════════════
-- The column guard learns exactly one new field
-- ═══════════════════════════════════════════════════════════════════════
--
-- 125's guard restores every column from OLD for anybody who is not an
-- operator, which is what makes `read_at` the single partner-writable
-- field. `is_archived` becomes the second -- and it is added by NOT
-- restoring it, rather than by relaxing the function, so the list of
-- what a partner may touch stays a list you can read.
--
-- Everything else still snaps back: a partner cannot retitle a
-- notification, cannot repoint its href at another screen, cannot
-- change its priority to bury it, and cannot move it to another vendor.
CREATE OR REPLACE FUNCTION public.guard_notification_self_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN
    RETURN NEW;
  END IF;

  NEW.id         := OLD.id;
  NEW.vendor_id  := OLD.vendor_id;
  NEW.kind       := OLD.kind;
  NEW.title      := OLD.title;
  NEW.body       := OLD.body;
  NEW.line_id    := OLD.line_id;
  NEW.href       := OLD.href;
  NEW.created_at := OLD.created_at;
  -- New in 153. A partner may not re-rank or un-expire their own inbox.
  NEW.priority   := OLD.priority;
  NEW.expires_at := OLD.expires_at;
  NEW.metadata   := OLD.metadata;

  -- read_at and is_archived are deliberately NOT restored.
  RETURN NEW;
END;
$$;

-- Unchanged from 125, restated so this migration is readable alone.
DROP TRIGGER IF EXISTS trg_guard_notification_self_edit ON public.partner_notifications;
CREATE TRIGGER trg_guard_notification_self_edit
  BEFORE UPDATE ON public.partner_notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notification_self_edit();

COMMIT;
