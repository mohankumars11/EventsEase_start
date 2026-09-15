-- ══════════════════════════════════════════════════════════════════════
-- 125 · Somewhere to say it
-- ══════════════════════════════════════════════════════════════════════
--
-- Three things the partner app asks for and the schema cannot answer.
--
--   1 · partner_notifications  — what happened while you were not looking
--   2 · partner_messages       — a way to say something to us about a job
--   3 · partner_notification_prefs — which of those reach the phone
--
-- ── Why notifications are not just push ──────────────────────────────
-- `push_tokens` (065) records where to send a push. It does not record
-- that anything WAS sent, so a partner who missed the buzz — phone face
-- down, notification swiped, permission never granted — has no way to
-- find out what it said. Everything material that happens to a partner
-- happens while they are not holding the phone: an offer, a payout
-- clearing, a verification decision. The feed is the record; push is one
-- delivery channel for it, and the less reliable one.
--
-- ── Why messages do not reach the customer ───────────────────────────
-- They reach US. Migrations 068 and 073 scrub phone numbers and emails
-- out of `customer_note` on write, and `partner_offer_feed` omits
-- `customer_id` and `address_text` on purpose, "so a leak here would need
-- somebody to edit the view, not to forget a filter". A free-text channel
-- between partner and customer would walk straight around all of that on
-- day one.
--
-- What a partner actually needs is to tell somebody at Sambramo that the
-- venue gate is locked, or that the guest count on a job looks wrong.
-- That is a thread between the partner and an operator, optionally
-- pinned to a line, and it is what this table is.
--
-- ── A partner writes almost nothing here ─────────────────────────────
-- Notifications are written by us. Preferences are written by them. A
-- message is written by them but cannot claim to be from us. Postgres
-- has no column-level RLS, so the columns a partner must not set are
-- forced back to their old values by a trigger — the same shape as
-- `guard_vendor_self_verify` (075), for the same reason.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · partner_notifications
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.partner_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  -- What kind of thing happened. Constrained rather than free text so a
  -- preference can switch a whole class off, and so the app can pick an
  -- icon without pattern-matching a title.
  kind       TEXT NOT NULL CHECK (kind IN (
               'offer', 'job', 'payout', 'verification', 'listing',
               'review', 'message', 'system')),

  title      TEXT NOT NULL CHECK (length(trim(title)) > 0),
  body       TEXT,

  -- Where tapping it should go. A notification a partner cannot act on
  -- is a notification that trains them to ignore the next one.
  line_id    UUID REFERENCES public.booking_lines(id) ON DELETE SET NULL,
  href       TEXT,

  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The feed is always "mine, newest first, unread count". One index.
CREATE INDEX IF NOT EXISTS idx_partner_notifications_feed
  ON public.partner_notifications (vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_notifications_unread
  ON public.partner_notifications (vendor_id) WHERE read_at IS NULL;

ALTER TABLE public.partner_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner reads own notifications" ON public.partner_notifications;
CREATE POLICY "partner reads own notifications"
  ON public.partner_notifications FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()));

-- Marking one read is the only write a partner makes. The trigger below
-- is what keeps this from also being "editing what it says".
DROP POLICY IF EXISTS "partner marks own notifications read" ON public.partner_notifications;
CREATE POLICY "partner marks own notifications read"
  ON public.partner_notifications FOR UPDATE TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()));

-- No INSERT policy and no DELETE policy for `authenticated`, deliberately.
-- Deny by default: a partner who could write their own notifications
-- could write one to another vendor's feed, and a partner who could
-- delete them could hide a verification decision from themselves.

-- Operators see and write everything: the admin console sends these.
DROP POLICY IF EXISTS "operators manage notifications" ON public.partner_notifications;
CREATE POLICY "operators manage notifications"
  ON public.partner_notifications FOR ALL TO authenticated
  USING (public.caller_is_operator())
  WITH CHECK (public.caller_is_operator());

/* Everything except `read_at` is ours. A partner marking a notification
   read must not be able to rewrite the notification while they are
   there — the same guard shape as 075, and for the same reason: there
   is no column-level RLS to express "you may set this one column". */
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_notification_self_edit ON public.partner_notifications;
CREATE TRIGGER trg_guard_notification_self_edit
  BEFORE UPDATE ON public.partner_notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notification_self_edit();

COMMENT ON TABLE public.partner_notifications IS
  'What happened to a partner while they were not looking. Written by us, '
  'read by them, and the only column they may change is read_at.';

-- ══════════════════════════════════════════════════════════════════════
-- 2 · partner_messages
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.partner_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  -- Optional, and the useful case. "The gate at this venue is locked"
  -- is about one job; "my UPI changed" is about none.
  line_id    UUID REFERENCES public.booking_lines(id) ON DELETE SET NULL,

  -- Who said it. Forced by the trigger below, never taken from the
  -- client: a partner who could set this to 'operator' could write
  -- themselves an answer from Sambramo.
  sender     TEXT NOT NULL CHECK (sender IN ('partner', 'operator')),
  author_id  UUID REFERENCES public.profiles(id),

  body       TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 4000),

  -- Read by the OTHER side. Set by the operator console for a partner's
  -- message, and by the app for ours.
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_messages_thread
  ON public.partner_messages (vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_messages_line
  ON public.partner_messages (line_id) WHERE line_id IS NOT NULL;

ALTER TABLE public.partner_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner reads own thread" ON public.partner_messages;
CREATE POLICY "partner reads own thread"
  ON public.partner_messages FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "partner writes to own thread" ON public.partner_messages;
CREATE POLICY "partner writes to own thread"
  ON public.partner_messages FOR INSERT TO authenticated
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators manage messages" ON public.partner_messages;
CREATE POLICY "operators manage messages"
  ON public.partner_messages FOR ALL TO authenticated
  USING (public.caller_is_operator())
  WITH CHECK (public.caller_is_operator());

-- No UPDATE and no DELETE for a partner. A message that can be edited
-- after the fact is not a record of what was said, and the whole reason
-- to have a thread is that somebody can go back and read it.

/* A partner's message is from the partner, whatever the client sent. */
CREATE OR REPLACE FUNCTION public.stamp_partner_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.author_id  := auth.uid();
  NEW.created_at := now();
  NEW.read_at    := NULL;

  IF public.caller_is_operator() THEN
    -- An operator may send as either side: the console posts replies as
    -- 'operator', and a coordinator transcribing a phone call posts as
    -- 'partner'. Whatever they chose stands, but it must be one of the
    -- two -- the CHECK constraint sees to that.
    RETURN NEW;
  END IF;

  NEW.sender := 'partner';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_partner_message ON public.partner_messages;
CREATE TRIGGER trg_stamp_partner_message
  BEFORE INSERT ON public.partner_messages
  FOR EACH ROW EXECUTE FUNCTION public.stamp_partner_message();

COMMENT ON TABLE public.partner_messages IS
  'A thread between one partner and Sambramo, optionally about one line. '
  'Not a channel to the customer: 068 and 073 scrub contact details out '
  'of everything a partner can see, and this would walk around that.';

-- ══════════════════════════════════════════════════════════════════════
-- 3 · partner_notification_prefs
-- ══════════════════════════════════════════════════════════════════════
--
-- What a partner is willing to be interrupted for.
--
-- `offers` is deliberately not in here. An offer lives for 45 seconds
-- and the whole arrangement depends on the phone buzzing; a partner who
-- switches that off has switched off the product, and a setting that
-- silently stops the work arriving is a trap. If somebody wants no
-- offers, the honest control is the one that already exists -- mark the
-- days busy, or close the account.

CREATE TABLE IF NOT EXISTS public.partner_notification_prefs (
  vendor_id    UUID PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,

  job_updates  BOOLEAN NOT NULL DEFAULT true,   -- a booking changed or was cancelled
  payouts      BOOLEAN NOT NULL DEFAULT true,   -- money cleared, claimed, sent
  reviews      BOOLEAN NOT NULL DEFAULT true,   -- somebody rated a job
  messages     BOOLEAN NOT NULL DEFAULT true,   -- we replied to your thread
  announcements BOOLEAN NOT NULL DEFAULT true,  -- new area, fee change, festival notice

  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner manages own prefs" ON public.partner_notification_prefs;
CREATE POLICY "partner manages own prefs"
  ON public.partner_notification_prefs FOR ALL TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators read prefs" ON public.partner_notification_prefs;
CREATE POLICY "operators read prefs"
  ON public.partner_notification_prefs FOR SELECT TO authenticated
  USING (public.caller_is_operator());

COMMENT ON TABLE public.partner_notification_prefs IS
  'Which notifications reach the phone. Offers are absent on purpose: '
  'switching them off would silently switch off the work.';

-- ══════════════════════════════════════════════════════════════════════
-- 4 · Grants
-- ══════════════════════════════════════════════════════════════════════
--
-- Explicit, and no wider than the policies above. `anon` gets nothing:
-- none of this is public, and 123 is the reminder of what an anon grant
-- costs when nobody checked it.

GRANT SELECT, UPDATE           ON public.partner_notifications      TO authenticated;
GRANT SELECT, INSERT           ON public.partner_messages           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
                               ON public.partner_notification_prefs TO authenticated;

GRANT ALL ON public.partner_notifications      TO service_role;
GRANT ALL ON public.partner_messages           TO service_role;
GRANT ALL ON public.partner_notification_prefs TO service_role;

COMMIT;
