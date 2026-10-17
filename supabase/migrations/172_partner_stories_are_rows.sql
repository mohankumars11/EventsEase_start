-- ══════════════════════════════════════════════════════════════════════
-- 172 · The four stories become rows, so they can be renamed
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. 171 is already applied; this builds on it.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT WAS WRONG
-- ══════════════════════════════════════════════════════════════════════
--
-- The stories themselves — "Instant bookings", "Jobs received" — were
-- hardcoded in two places at once: a STORIES array in
-- PartnerStories.jsx and another in the admin console. 171 gave the
-- CARDS inside a story a name, an archive and a history. The story
-- heading had none of that, and adding a fifth story meant a code
-- change and a new APK.
--
-- So the stories become rows too.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE CHECK BECOMES A FOREIGN KEY
-- ══════════════════════════════════════════════════════════════════════
--
-- `partner_story_slides.story_key` was constrained by a CHECK listing
-- seven literal values. A new story could never satisfy it, so the
-- CHECK is replaced by a reference to this table — which is the same
-- guarantee (a slide cannot name a story that does not exist) without
-- freezing the list in DDL.
--
-- The seed is deliberately taken from the slides already stored as
-- well as the known four, because an FK added over a row whose key is
-- not in the parent table fails and takes the whole migration with it.
--
-- ON DELETE is left as the default (NO ACTION): a story with slides
-- still in it must not vanish and strand them. The console archives
-- rather than deletes, which this does not interfere with.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT A SHIPPED APK WILL AND WILL NOT SEE
-- ══════════════════════════════════════════════════════════════════════
--
-- The APK from e0d762c holds its own copy of the four stories and
-- their names. Renaming a story or adding a fifth changes what the
-- CONSOLE shows and what a LATER build shows; it does not reach a
-- phone that is already installed. Only the cards inside a story
-- travel without a rebuild.
--
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. The stories ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_stories (
  key        TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  blurb      TEXT,
  position   INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_stories IS
  'The story headings on the partner Jobs tab. Renameable; a shipped APK '
  'keeps its built-in copy until it is rebuilt.';

-- The four the app ships with, in the order it shows them.
INSERT INTO public.partner_stories (key, label, blurb, position) VALUES
  ('instant-booking', 'Instant bookings',     'From discovery to booking',    0),
  ('live-tracking',   'Jobs received',        'Every detail in one place',    1),
  ('start-trip',      'Start your trip',      'Keep the customer in the loop', 2),
  ('event-complete',  'Event done · Payment', 'Wrap up with confidence',      3)
ON CONFLICT (key) DO NOTHING;

-- Anything a slide already points at, so the FK below cannot fail.
INSERT INTO public.partner_stories (key, label, position)
SELECT DISTINCT s.story_key, s.story_key, 90
FROM public.partner_story_slides s
ON CONFLICT (key) DO NOTHING;

-- ── 2. CHECK → FK ────────────────────────────────────────────────────

ALTER TABLE public.partner_story_slides
  DROP CONSTRAINT IF EXISTS partner_story_slides_story_key_check;

ALTER TABLE public.partner_story_slides
  DROP CONSTRAINT IF EXISTS partner_story_slides_story_key_fkey;

ALTER TABLE public.partner_story_slides
  ADD CONSTRAINT partner_story_slides_story_key_fkey
  FOREIGN KEY (story_key) REFERENCES public.partner_stories(key);

-- ── 3. History for the stories themselves ────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_story_events (
  id        BIGSERIAL PRIMARY KEY,
  story_key TEXT NOT NULL,
  action    TEXT NOT NULL CHECK (action IN ('created', 'renamed', 'archived', 'restored', 'moved')),
  changed   JSONB,
  actor     UUID,
  at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_story_events_key
  ON public.partner_story_events (story_key, at DESC);

CREATE OR REPLACE FUNCTION public.record_partner_story_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_action  TEXT;
  v_changed JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.partner_story_events (story_key, action, changed, actor)
    VALUES (NEW.key, 'created',
            jsonb_build_object('label', NEW.label, 'position', NEW.position),
            auth.uid());
    RETURN NEW;
  END IF;

  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    v_action := 'archived';
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    v_action := 'restored';
  ELSIF OLD.label IS DISTINCT FROM NEW.label THEN
    v_action := 'renamed';
  ELSIF OLD.position IS DISTINCT FROM NEW.position THEN
    v_action := 'moved';
  ELSE
    RETURN NEW;
  END IF;

  IF OLD.label IS DISTINCT FROM NEW.label THEN
    v_changed := v_changed || jsonb_build_object('label',
                   jsonb_build_object('from', OLD.label, 'to', NEW.label));
  END IF;
  IF OLD.blurb IS DISTINCT FROM NEW.blurb THEN
    v_changed := v_changed || jsonb_build_object('blurb',
                   jsonb_build_object('from', OLD.blurb, 'to', NEW.blurb));
  END IF;
  IF OLD.position IS DISTINCT FROM NEW.position THEN
    v_changed := v_changed || jsonb_build_object('position',
                   jsonb_build_object('from', OLD.position, 'to', NEW.position));
  END IF;

  INSERT INTO public.partner_story_events (story_key, action, changed, actor)
  VALUES (NEW.key, v_action, v_changed, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_story_event ON public.partner_stories;
CREATE TRIGGER trg_partner_story_event
  AFTER INSERT OR UPDATE ON public.partner_stories
  FOR EACH ROW EXECUTE FUNCTION public.record_partner_story_event();

DROP TRIGGER IF EXISTS trg_partner_story_events_append_only ON public.partner_story_events;
CREATE TRIGGER trg_partner_story_events_append_only
  BEFORE UPDATE OR DELETE ON public.partner_story_events
  FOR EACH ROW EXECUTE FUNCTION public.story_events_are_append_only();

-- ── 4. RLS ───────────────────────────────────────────────────────────

ALTER TABLE public.partner_stories ENABLE ROW LEVEL SECURITY;

-- The app needs the list to draw the rail. Archived ones are filtered
-- by the client, not hidden here, so the console can show them.
DROP POLICY IF EXISTS partner_stories_read ON public.partner_stories;
CREATE POLICY partner_stories_read
  ON public.partner_stories FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS partner_stories_operator_write ON public.partner_stories;
CREATE POLICY partner_stories_operator_write
  ON public.partner_stories FOR ALL
  TO authenticated
  USING (public.caller_is_operator())
  WITH CHECK (public.caller_is_operator());

ALTER TABLE public.partner_story_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_story_events_operator_read ON public.partner_story_events;
CREATE POLICY partner_story_events_operator_read
  ON public.partner_story_events FOR SELECT
  TO authenticated
  USING (public.caller_is_operator());

COMMIT;
