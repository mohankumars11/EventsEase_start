-- ══════════════════════════════════════════════════════════════════════
-- 151 · The partner and the customer can talk
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY partner_messages COULD NOT BE USED
-- ══════════════════════════════════════════════════════════════════════
--
-- 125 built `partner_messages`, and its CHECK is:
--
--     sender TEXT NOT NULL CHECK (sender IN ('partner', 'operator'))
--
-- That is a partner talking to SAMBRAMO. There is no customer in it, no
-- policy that would let one read a row, and widening the CHECK would
-- retrofit a third party into a two-party thread whose RLS was written
-- on the assumption there were two. Every existing policy would have to
-- be re-reasoned, and "my UPI changed" would land in a table a customer
-- can read.
--
-- So: a separate thread, hung off the booking line, which is the thing
-- the two of them actually have in common.
--
-- ══════════════════════════════════════════════════════════════════════
-- IT OPENS WHEN THE MONEY IS IN, AND CLOSES AFTERWARDS
-- ══════════════════════════════════════════════════════════════════════
--
-- Before payment there is no relationship to talk about, and a partner
-- who could message everyone they were merely OFFERED could canvass the
-- whole city off one dispatch. `line_chat_is_open()` stops that, and it
-- is enforced in the INSERT policy rather than in the app, because the
-- app is a WebView holding an anon key.
--
-- It closes 7 days after the event. A thread that stays open for ever
-- becomes the channel for everything the platform is meant to mediate:
-- price changes, cash on the side, the next booking direct.
--
-- Reading stays open. A partner has to be able to look back at "the gate
-- is on the left, ask for Ravi" long after the job.
--
-- Re-runnable.

BEGIN;

CREATE TABLE IF NOT EXISTS public.line_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id    UUID NOT NULL REFERENCES public.booking_lines(id) ON DELETE CASCADE,

  -- Forced by the trigger below, never taken from the client. A partner
  -- who could set this to 'customer' could write themselves an
  -- agreement from the person paying them.
  sender     TEXT NOT NULL CHECK (sender IN ('partner', 'customer')),
  author_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  body       TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000),

  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_messages_thread
  ON public.line_messages (line_id, created_at);

CREATE INDEX IF NOT EXISTS idx_line_messages_unread
  ON public.line_messages (line_id) WHERE read_at IS NULL;

-- ══════════════════════════════════════════════════════════════════════
-- WHO IS WHO
-- ══════════════════════════════════════════════════════════════════════

/** The partner on this line, if the caller is them. */
CREATE OR REPLACE FUNCTION public.caller_owns_line_as_partner(p_line UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.booking_lines l
      JOIN public.dispatch_offers o ON o.line_id = l.id AND o.status = 'ACCEPTED'
      JOIN public.vendors v         ON v.id = o.vendor_id
     WHERE l.id = p_line AND v.profile_id = auth.uid()
  )
$$;

/** The customer on this line, if the caller is them. */
CREATE OR REPLACE FUNCTION public.caller_owns_line_as_customer(p_line UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.booking_lines l
      JOIN public.booking_requests r ON r.id = l.request_id
     WHERE l.id = p_line AND r.customer_id = auth.uid()
  )
$$;

/**
 * Is this thread open for new messages?
 *
 * Paid for, not cancelled, within a week of the event. Narrow at both
 * ends on purpose: an unpaid line has no relationship to discuss, and
 * one that closes keeps the conversation inside the job it belongs to.
 */
CREATE OR REPLACE FUNCTION public.line_chat_is_open(p_line UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.booking_lines l
      JOIN public.booking_requests r ON r.id = l.request_id
     WHERE l.id = p_line
       AND l.status NOT IN ('cancelled', 'expired')
       AND l.is_funded = TRUE
       AND r.event_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days'
  )
$$;

-- ══════════════════════════════════════════════════════════════════════
-- THE TRIGGER THAT DECIDES WHO IS SPEAKING
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.stamp_line_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.author_id  := auth.uid();
  NEW.read_at    := NULL;         -- nobody has read a message being written
  NEW.created_at := now();        -- the server's clock, not the phone's

  IF public.caller_owns_line_as_partner(NEW.line_id) THEN
    NEW.sender := 'partner';
  ELSIF public.caller_owns_line_as_customer(NEW.line_id) THEN
    NEW.sender := 'customer';
  ELSE
    RAISE EXCEPTION 'this is not your booking'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.line_chat_is_open(NEW.line_id) THEN
    RAISE EXCEPTION 'this conversation is closed'
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'A thread opens once the booking is paid for and closes a week after the event.';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stamp_line_message ON public.line_messages;
CREATE TRIGGER trg_stamp_line_message
  BEFORE INSERT ON public.line_messages
  FOR EACH ROW EXECUTE FUNCTION public.stamp_line_message();

/* Editing what somebody said is not a feature. Only `read_at` moves,
   and only in one direction. */
CREATE OR REPLACE FUNCTION public.guard_line_message_edit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'a message cannot be deleted once sent'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  NEW.body       := OLD.body;
  NEW.sender     := OLD.sender;
  NEW.author_id  := OLD.author_id;
  NEW.line_id    := OLD.line_id;
  NEW.created_at := OLD.created_at;
  NEW.read_at    := COALESCE(OLD.read_at, NEW.read_at);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_line_message_edit ON public.line_messages;
CREATE TRIGGER trg_guard_line_message_edit
  BEFORE UPDATE OR DELETE ON public.line_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_line_message_edit();

-- ══════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.line_messages ENABLE ROW LEVEL SECURITY;

/* Both sides read the whole thread, for ever. A partner has to be able
   to look back at "the gate is on the left, ask for Ravi" long after
   the job, and an operator has to be able to read it when the two of
   them disagree about what was said. */
DROP POLICY IF EXISTS "both sides read the thread" ON public.line_messages;
CREATE POLICY "both sides read the thread"
  ON public.line_messages FOR SELECT TO authenticated
  USING (
    public.caller_is_operator()
    OR public.caller_owns_line_as_partner(line_id)
    OR public.caller_owns_line_as_customer(line_id)
  );

/* Writing is narrower than reading: the thread has to be OPEN. The
   trigger raises a readable exception for the other cases; this is what
   makes it true for a caller who never goes near the app. */
DROP POLICY IF EXISTS "either side writes while it is open" ON public.line_messages;
CREATE POLICY "either side writes while it is open"
  ON public.line_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.line_chat_is_open(line_id)
    AND (
      public.caller_owns_line_as_partner(line_id)
      OR public.caller_owns_line_as_customer(line_id)
    )
  );

/* Only to mark as read; the edit guard restores everything else. */
DROP POLICY IF EXISTS "either side marks it read" ON public.line_messages;
CREATE POLICY "either side marks it read"
  ON public.line_messages FOR UPDATE TO authenticated
  USING (
    public.caller_owns_line_as_partner(line_id)
    OR public.caller_owns_line_as_customer(line_id)
  );

GRANT SELECT, INSERT, UPDATE ON public.line_messages TO authenticated;
GRANT ALL ON public.line_messages TO service_role;

REVOKE ALL ON FUNCTION public.line_chat_is_open(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.line_chat_is_open(UUID) TO authenticated, service_role;

COMMENT ON TABLE public.line_messages IS
  'Partner to customer, about one booking line. Opens when the line is '
  'funded, closes 7 days after the event, and stays readable for ever. '
  'Distinct from partner_messages, which is the partner talking to Sambramo.';

COMMIT;
