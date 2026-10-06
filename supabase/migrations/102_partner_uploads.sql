-- ══════════════════════════════════════════════════════════════════════
-- 102 · Somewhere for a partner to put their own menu card
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A PHOTO IS NOT A FAILURE OF THE FORM
-- ══════════════════════════════════════════════════════════════════════
--
-- The listing flow asks a caterer to tick 584 dishes and twelve menus,
-- and it is a good form. It is also thirty minutes of work for somebody
-- who already has all of it printed, designed and in their hand.
--
-- Every caterer in Bengaluru has a menu card. Most have it as a PDF or a
-- photo on the phone they are holding while filling this in. Refusing to
-- accept it -- insisting they retype what they already have -- is how a
-- partner stops halfway through and never comes back.
--
-- So both. The structured answers are what dispatch matches on and what a
-- customer reads. The upload is what a coordinator opens when a customer
-- asks something the form did not think to ask, and what an operator
-- checks the listing against during review.
--
-- ── Not a replacement for the ticks ─────────────────────────────────
-- A photo cannot be matched on. A caterer who uploads a card and ticks
-- nothing has told the database nothing, and the app says so rather than
-- letting them believe they have finished.
--
-- ══════════════════════════════════════════════════════════════════════
-- SEPARATE FROM partner-documents
-- ══════════════════════════════════════════════════════════════════════
--
-- 093 has a bucket for identity papers -- Aadhaar, PAN. Those are
-- sensitive, read only by an operator during verification, and their
-- retention rules are not these. A menu card is closer to marketing
-- material: shown to coordinators, possibly to customers later.
--
-- One bucket for both would mean one policy for both, and the looser of
-- the two would win.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-uploads',
  'partner-uploads',
  FALSE,
  10485760,                     -- 10 MB; a phone photo of a menu card
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = FALSE;

-- Everything a partner uploads lives under their own auth uid, and the
-- policies say only that folder. The same shape as 093.

DROP POLICY IF EXISTS "partners read own uploads"    ON storage.objects;
DROP POLICY IF EXISTS "partners add own uploads"     ON storage.objects;
DROP POLICY IF EXISTS "partners replace own uploads" ON storage.objects;
DROP POLICY IF EXISTS "partners delete own uploads"  ON storage.objects;

CREATE POLICY "partners read own uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-uploads'
         AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "partners add own uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-uploads'
              AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "partners replace own uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'partner-uploads'
         AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "partners delete own uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'partner-uploads'
         AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- WHERE THE PATHS ARE RECORDED
-- ══════════════════════════════════════════════════════════════════════
--
-- In `vendor_services.specs.uploads`, as an array of storage paths. No
-- new table: the upload belongs to the listing it was added on, it is
-- read by the same people who read the rest of the specs, and a table
-- would need its own policies to say the same thing this bucket already
-- says.
