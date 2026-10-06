-- ════════════════════════════════════════════════════════════════════
-- 110 · A partner can show their work, not only describe it
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 102.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT THE BUCKET COULD NOT HOLD
-- ══════════════════════════════════════════════════════════════════════
--
-- 102 made `partner-uploads` for a photograph of a menu card: 10 MB,
-- images and PDF. That is the right size and the right list for a card
-- on a counter.
--
-- It is the wrong one for what a partner actually has. A photographer
-- has a portfolio. A decorator has last Saturday's mandap. A venue has
-- the hall, the parking, the changing rooms and a walk-through video —
-- and a video is the single most convincing thing any of them owns,
-- because a family choosing a hall is really asking "what does it look
-- like when it is full".
--
-- Refusing all of that and asking them to tick boxes instead is how a
-- good partner decides the platform does not understand their business.
--
-- ── 40 MB, and why not more ─────────────────────────────────────────
-- A 30-second walk-through at phone quality is 15-30 MB. 40 leaves room
-- without inviting a ten-minute wedding film that will never finish
-- uploading on a Bengaluru mobile connection and will look, to the
-- partner, exactly like the app being broken. The client compresses
-- before sending; this is the ceiling, not the target.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE storage.buckets
SET
  file_size_limit = 41943040,          -- 40 MB
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    -- What a phone actually records. quicktime is what iOS calls .mov,
    -- and leaving it out would refuse every video from an iPhone while
    -- accepting every one from Android.
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
WHERE id = 'partner-uploads';


-- ── What a partner says their work is ────────────────────────────────
--
-- The file lives in storage; what it IS lives here. A folder of eighty
-- images with machine names is not a portfolio, and an operator opening
-- a listing needs to know which photograph is the hall and which is the
-- parking before they can use either.
--
-- Kept in its own table rather than in vendor_services.specs because a
-- portfolio belongs to the PARTNER, not to one line of their listing: a
-- photographer who lists candid and pre-wedding separately has one body
-- of work, and copying it into both rows would mean editing it twice.
CREATE TABLE IF NOT EXISTS public.partner_work (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  kind        TEXT NOT NULL,
  -- photo        a still of the work
  -- video        a walk-through or a reel
  -- document     a brochure, a rate card, a licence
  -- testimonial  words, not a file: what a customer said
  CONSTRAINT partner_work_kind_check
    CHECK (kind IN ('photo', 'video', 'document', 'testimonial')),

  -- Null for a testimonial, which has no file.
  storage_path TEXT,

  -- What it shows. "The 400-seat hall", "Mandap, Malleshwaram, Jan 2026".
  caption     TEXT,

  -- Testimonials only: who said it, at what, and the words.
  said_by     TEXT,
  said_about  TEXT,
  body        TEXT,

  -- Which part of the business this belongs to, when it matters. A venue
  -- with three halls needs to say which hall the photograph is of.
  tag         TEXT,

  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ── Nothing a partner uploads is public until somebody reads it ────
  -- The same rule as vendor_services.review_status, and for the same
  -- reason: a photograph is a claim about work, and an unread one on a
  -- public listing is a claim we are making on their behalf.
  review_status TEXT NOT NULL DEFAULT 'under_review',
  CONSTRAINT partner_work_review_check
    CHECK (review_status IN ('under_review', 'live', 'rejected')),

  -- A file, or words. Written after every column it reads rather than
  -- between two of them: legal either way, and one less thing for
  -- somebody reading this at speed to have to check.
  CONSTRAINT partner_work_file_or_words CHECK (
    (kind = 'testimonial' AND storage_path IS NULL AND body IS NOT NULL)
    OR (kind <> 'testimonial' AND storage_path IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS partner_work_by_vendor
  ON public.partner_work (vendor_id, kind, sort_order);

COMMENT ON TABLE public.partner_work IS
  'A partner''s portfolio: photographs, videos, documents and testimonials. Belongs to the vendor rather than to one listing row, because a photographer who lists two services has one body of work.';

ALTER TABLE public.partner_work ENABLE ROW LEVEL SECURITY;

-- A partner reads and writes their own, always.
DROP POLICY IF EXISTS partner_work_own ON public.partner_work;
CREATE POLICY partner_work_own ON public.partner_work
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v
                 WHERE v.id = vendor_id AND v.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v
                      WHERE v.id = vendor_id AND v.profile_id = auth.uid()));

-- Everybody else reads only what has been read by us first.
DROP POLICY IF EXISTS partner_work_public ON public.partner_work;
CREATE POLICY partner_work_public ON public.partner_work
  FOR SELECT TO anon, authenticated
  USING (review_status = 'live');

DROP POLICY IF EXISTS partner_work_admin ON public.partner_work;
CREATE POLICY partner_work_admin ON public.partner_work
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = auth.uid() AND p.role = 'admin'));

COMMIT;

-- ── Check it ────────────────────────────────────────────────────────
--   SELECT id, file_size_limit, allowed_mime_types
--     FROM storage.buckets WHERE id = 'partner-uploads';
--   SELECT kind, count(*) FROM public.partner_work GROUP BY kind;
