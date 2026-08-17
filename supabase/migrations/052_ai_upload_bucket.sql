-- ============================================================
-- Migration 052: A staging bucket for files handed to the AI reader.
--
-- Run this ONCE in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================
--
-- ── The 4.5 MB wall ────────────────────────────────────────────────────────
-- The Product Studio's "Fill with AI" sent uploaded files to /api/ai-catalog
-- as base64 inside the request body. That works for a photograph of a price
-- list and fails for the thing the feature is actually for: a supplier's PDF
-- catalogue.
--
-- Vercel caps a function's request body at 4.5 MB and answers anything larger
-- with a bare `413 FUNCTION_PAYLOAD_TOO_LARGE` — before the function runs, so
-- there is no way to catch it and say something useful. Base64 inflates a file
-- by about a third, so the real ceiling was a ~3.3 MB PDF. Supplier catalogues
-- are routinely bigger than that.
--
-- ── The fix, and why it is a bucket ────────────────────────────────────────
-- The browser uploads straight to Supabase Storage, which has no such limit,
-- and sends the endpoint a path instead of the bytes. The request body drops
-- to a few hundred characters and the function fetches the file server-side,
-- where a 30 MB buffer is unremarkable.
--
-- A separate bucket rather than reusing `product-images` or `product-media`,
-- for two reasons:
--   · Those are PUBLIC — they are what the storefront serves from. A
--     supplier's price list with wholesale costs on it must not be readable by
--     anyone who guesses a URL.
--   · Their allowed_mime_types are deliberately narrow (images; images and
--     video). Widening them to admit PDFs and Word files would also admit
--     those into the storefront's own buckets, which is not a thing anyone
--     wants by accident.
--
-- Nothing here is permanent storage: the endpoint deletes each file once it
-- has read it, and the policy below lets it.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-uploads',
  'ai-uploads',
  FALSE,     -- private. Read happens server-side with the service role.
  /* No per-bucket size cap. NULL means "whatever this Supabase project's own
     global upload limit is", which is the largest number that can honestly be
     put here: a bucket limit above the project limit does nothing, and a
     bucket limit below it invents a restriction the platform never asked for.
     Raising the project's limit (Storage → Settings) now raises this with it,
     with no migration to re-run. */
  NULL,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'text/plain', 'text/csv', 'text/markdown', 'application/json'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies have no IF NOT EXISTS (error 42710), so drop before create — the
-- house rule from PROJECT_SUMMARY. get_my_role() is the SECURITY DEFINER
-- helper from migration 006; do NOT inline a profiles subquery here, that is
-- the infinite recursion 006 exists to fix.

-- No public SELECT policy at all. The only reader is the serverless function,
-- which uses the service role and bypasses RLS entirely — so the absence of a
-- read policy is the security boundary, not an oversight.

DROP POLICY IF EXISTS "admins stage ai uploads" ON storage.objects;
CREATE POLICY "admins stage ai uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-uploads'
    AND get_my_role() IN ('admin', 'event_coordinator')
  );

-- An admin can list and clear their own staged files. The endpoint deletes
-- each one after reading it; this covers the case where a read failed midway
-- and something was left behind.
DROP POLICY IF EXISTS "admins see their ai uploads" ON storage.objects;
CREATE POLICY "admins see their ai uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ai-uploads'
    AND get_my_role() IN ('admin', 'event_coordinator')
  );

DROP POLICY IF EXISTS "admins delete ai uploads" ON storage.objects;
CREATE POLICY "admins delete ai uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ai-uploads'
    AND get_my_role() IN ('admin', 'event_coordinator')
  );


-- ── Before this is applied ─────────────────────────────────────────────────
-- `src/lib/aiCatalog.js` tries the bucket first and falls back to sending the
-- file inline when it is missing, capped at a size that fits under Vercel's
-- limit. So small files keep working either way; this migration is what makes
-- a real supplier catalogue work.
