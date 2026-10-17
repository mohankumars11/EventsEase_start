-- ══════════════════════════════════════════════════════════════════════
-- 171 · A story slide keeps its history
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND.
--
-- ══════════════════════════════════════════════════════════════════════
-- DELETE BECOMES ARCHIVE
-- ══════════════════════════════════════════════════════════════════════
--
-- Deleting a slide used to remove the row and the object together, so a
-- card removed by mistake was gone, and nobody could answer "what was
-- in that story last month".
--
-- So `deleted_at` is added and the console stops issuing DELETE. The
-- media object is kept too: restoring a row that points at a deleted
-- file would restore a broken card.
--
-- **The APK already in people's hands only filters on `is_published`**
-- (the viewer shipped in e0d762c), so archiving MUST also unpublish.
-- The console does both in one update. A later APK can filter on
-- `deleted_at`; this one cannot be asked to.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A SEPARATE EVENTS TABLE AND NOT A `version` COLUMN
-- ══════════════════════════════════════════════════════════════════════
--
-- The question an operator asks is "who changed this and to what", and
-- that is a list, not a number. `partner_story_slide_events` holds one
-- row per change with the old and new values as jsonb, written by a
-- trigger so a write that skips the console is still recorded.
--
-- It is append-only in the same shape as the other ledgers here: a
-- BEFORE UPDATE OR DELETE trigger refuses, so history cannot be tidied
-- after the fact. See `escrow_ledger` (062) for the same pattern.
--
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Archive instead of delete ─────────────────────────────────────

ALTER TABLE public.partner_story_slides
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.partner_story_slides.deleted_at IS
  'Archived, not gone. The console sets this and is_published=false together, '
  'because shipped APKs filter only on is_published.';

-- Reading a story skips archived rows. Partial, so it stays small.
DROP INDEX IF EXISTS idx_story_slides_reading;
CREATE INDEX IF NOT EXISTS idx_story_slides_reading
  ON public.partner_story_slides (story_key, position)
  WHERE is_published AND deleted_at IS NULL;

-- ── 2. The history ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_story_slide_events (
  id         BIGSERIAL PRIMARY KEY,
  slide_id   UUID NOT NULL,
  story_key  TEXT NOT NULL,
  action     TEXT NOT NULL CHECK (action IN ('created', 'edited', 'published',
                                             'unpublished', 'archived', 'restored')),
  changed    JSONB,
  actor      UUID,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_events_slide
  ON public.partner_story_slide_events (slide_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_story_events_recent
  ON public.partner_story_slide_events (at DESC);

COMMENT ON TABLE public.partner_story_slide_events IS
  'Append-only history of every partner story slide change.';

-- ── 3. Written by a trigger, so a direct write is recorded too ───────

CREATE OR REPLACE FUNCTION public.record_story_slide_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_action TEXT;
  v_changed JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.partner_story_slide_events (slide_id, story_key, action, changed, actor)
    VALUES (NEW.id, NEW.story_key, 'created',
            jsonb_build_object('title', NEW.title, 'description', NEW.description,
                               'position', NEW.position, 'is_published', NEW.is_published),
            auth.uid());
    RETURN NEW;
  END IF;

  -- Archive and restore are the headline; they are decided first so an
  -- archive that also unpublishes is not logged as an unpublish.
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    v_action := 'archived';
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    v_action := 'restored';
  ELSIF OLD.is_published IS DISTINCT FROM NEW.is_published THEN
    v_action := CASE WHEN NEW.is_published THEN 'published' ELSE 'unpublished' END;
  ELSE
    v_action := 'edited';
  END IF;

  IF OLD.title IS DISTINCT FROM NEW.title THEN
    v_changed := v_changed || jsonb_build_object('title',
                   jsonb_build_object('from', OLD.title, 'to', NEW.title));
  END IF;
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    v_changed := v_changed || jsonb_build_object('description',
                   jsonb_build_object('from', OLD.description, 'to', NEW.description));
  END IF;
  IF OLD.position IS DISTINCT FROM NEW.position THEN
    v_changed := v_changed || jsonb_build_object('position',
                   jsonb_build_object('from', OLD.position, 'to', NEW.position));
  END IF;
  IF OLD.is_published IS DISTINCT FROM NEW.is_published THEN
    v_changed := v_changed || jsonb_build_object('is_published',
                   jsonb_build_object('from', OLD.is_published, 'to', NEW.is_published));
  END IF;

  -- An UPDATE that changed none of the tracked columns is not history.
  IF v_action = 'edited' AND v_changed = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.partner_story_slide_events (slide_id, story_key, action, changed, actor)
  VALUES (NEW.id, NEW.story_key, v_action, v_changed, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_story_slide_event ON public.partner_story_slides;
CREATE TRIGGER trg_story_slide_event
  AFTER INSERT OR UPDATE ON public.partner_story_slides
  FOR EACH ROW EXECUTE FUNCTION public.record_story_slide_event();

-- ── 4. Append-only ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.story_events_are_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'partner_story_slide_events is append-only (attempted %)', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_story_events_append_only ON public.partner_story_slide_events;
CREATE TRIGGER trg_story_events_append_only
  BEFORE UPDATE OR DELETE ON public.partner_story_slide_events
  FOR EACH ROW EXECUTE FUNCTION public.story_events_are_append_only();

-- ── 5. RLS: operators read it; nobody writes it by hand ──────────────

ALTER TABLE public.partner_story_slide_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS story_events_operator_read ON public.partner_story_slide_events;
CREATE POLICY story_events_operator_read
  ON public.partner_story_slide_events FOR SELECT
  TO authenticated
  USING (public.caller_is_operator());

COMMIT;
