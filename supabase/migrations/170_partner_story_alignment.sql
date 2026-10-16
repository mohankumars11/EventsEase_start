-- ══════════════════════════════════════════════════════════════════════
-- 170 · Align the partner story table with the partner app
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND.
--
-- ══════════════════════════════════════════════════════════════════════
-- THIS DOES NOT CREATE THE TABLE. IT IS ALREADY THERE.
-- ══════════════════════════════════════════════════════════════════════
--
-- `partner_story_slides` is created by 169_partner_story_cms_applied.sql,
-- which is ALREADY APPLIED. That file arrived numbered 151, colliding
-- with the applied 151_the_partner_and_the_customer_can_talk.sql; it is
-- renumbered to 169 here because its number is now only documentation.
-- Its columns are:
--
--     id · story_key · title · description · media_url · media_type
--     position · is_published · created_at · updated_at
--
-- title, description and media_url are NOT NULL. An earlier draft of
-- this migration assumed `published` and `media_path` and failed on
-- "column published does not exist". So this one adds nothing it does
-- not have to, and renames nothing: other code may already read those
-- names.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE REAL DEFECT: THREE OF THE FOUR KEYS DO NOT EXIST IN THE APP
-- ══════════════════════════════════════════════════════════════════════
--
-- The live CHECK on story_key accepts exactly these, confirmed by
-- probing each one against the database:
--
--     instant-booking · start-trip · live-tracking · event-complete
--
-- PartnerStories.jsx hardcodes these:
--
--     instant-bookings · jobs-received · start-trip · event-payment
--
-- Only `start-trip` is in both. The table was built to a set of
-- category NAMES rather than to the app's story ids, so three of four
-- uploads could never have matched a story — and nobody would have
-- found out until the partner side was wired and three stories stayed
-- empty.
--
-- The app is the source of truth, because its ids are what the slides
-- have to be looked up by. So the CHECK is widened to accept the app's
-- four. The legacy four are KEPT: the table is live, and dropping a
-- value a row might already use turns this migration into an outage.
-- They can be removed once the app side is wired and nothing writes
-- them.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE BUCKET ALREADY EXISTS TOO
-- ══════════════════════════════════════════════════════════════════════
--
-- `partner-story-media`, already public. Not `partner-stories`, which
-- the earlier draft would have created as a second bucket for the same
-- job. This one only widens its mime list to cover what a phone
-- actually records — quicktime is what iOS calls .mov, and leaving it
-- out refuses every iPhone video.
--
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Accept the app's story ids ────────────────────────────────────

ALTER TABLE public.partner_story_slides
  DROP CONSTRAINT IF EXISTS partner_story_slides_story_key_check;

ALTER TABLE public.partner_story_slides
  ADD CONSTRAINT partner_story_slides_story_key_check
  CHECK (story_key IN (
    -- What PartnerStories.jsx actually uses. Canonical.
    'instant-bookings', 'jobs-received', 'start-trip', 'event-payment',
    -- Legacy, kept so live rows stay valid.
    'instant-booking', 'live-tracking', 'event-complete'
  ));

COMMENT ON COLUMN public.partner_story_slides.story_key IS
  'Must equal a story id in PartnerStories.jsx. The four canonical ids are '
  'instant-bookings, jobs-received, start-trip, event-payment. The others are '
  'legacy values from the first cut of this table and match no story in the app.';

-- ── 2. Reading a story is reading published slides in order ──────────

CREATE INDEX IF NOT EXISTS idx_story_slides_reading
  ON public.partner_story_slides (story_key, position)
  WHERE is_published;

-- ── 3. RLS ───────────────────────────────────────────────────────────

ALTER TABLE public.partner_story_slides ENABLE ROW LEVEL SECURITY;

-- Anyone may read a PUBLISHED slide. Partners are the whole audience
-- and the app holds an anon key, so there is nothing to narrow this to.
-- Unpublished drafts stay invisible.
DROP POLICY IF EXISTS story_slides_read_published ON public.partner_story_slides;
CREATE POLICY story_slides_read_published
  ON public.partner_story_slides FOR SELECT
  TO anon, authenticated
  USING (is_published);

-- Operators see drafts too, and are the only writers.
DROP POLICY IF EXISTS story_slides_operator_read ON public.partner_story_slides;
CREATE POLICY story_slides_operator_read
  ON public.partner_story_slides FOR SELECT
  TO authenticated
  USING (public.caller_is_operator());

DROP POLICY IF EXISTS story_slides_operator_write ON public.partner_story_slides;
CREATE POLICY story_slides_operator_write
  ON public.partner_story_slides FOR ALL
  TO authenticated
  USING (public.caller_is_operator())
  WITH CHECK (public.caller_is_operator());

-- ── 4. The bucket: accept what a phone records ───────────────────────

UPDATE storage.buckets
SET
  file_size_limit = 41943040,          -- 40 MB
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
WHERE id = 'partner-story-media';

DROP POLICY IF EXISTS story_media_public_read ON storage.objects;
CREATE POLICY story_media_public_read
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'partner-story-media');

DROP POLICY IF EXISTS story_media_operator_write ON storage.objects;
CREATE POLICY story_media_operator_write
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'partner-story-media' AND public.caller_is_operator())
  WITH CHECK (bucket_id = 'partner-story-media' AND public.caller_is_operator());

COMMIT;
