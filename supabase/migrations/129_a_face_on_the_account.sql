-- ══════════════════════════════════════════════════════════════════════
-- 129 · A face on the account
-- ══════════════════════════════════════════════════════════════════════
--
-- The reference design puts the partner's photograph in the top-right of
-- the Jobs header. Until now there was no column to put one in, which is
-- why the app showed initials on a saffron circle and said so in a
-- comment.
--
-- ── Why it goes on `vendors` and not on `profiles` ───────────────────
-- `profiles` is shared with the customer app, and a customer's avatar is
-- a different feature with different rules about who may see it. This
-- one is the face of a BUSINESS: it goes beside the business name, it is
-- looked at by the operator reviewing the application, and — once
-- there is a public profile worth showing — by a customer choosing a
-- caterer. That is a vendor fact.
--
-- ── Public, and deliberately ─────────────────────────────────────────
-- The documents bucket (093) is private because it holds Aadhaar and
-- FSSAI scans, and every read there goes through a signed URL that
-- expires. An avatar is the opposite: it is meant to be seen, it is
-- rendered in a list where signing every URL would mean a round trip per
-- row, and it carries nothing that is not already on a public listing.
--
-- Partners should be told plainly that it is public, which the upload
-- control does.
--
-- ── It is never required ─────────────────────────────────────────────
-- No partner is blocked on a photograph, nothing is gated on it, and the
-- initials fallback stays for everybody who does not add one. A profile
-- picture is a nicety; treating it as a step would put a camera between
-- a decorator and their first job.

BEGIN;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.vendors.avatar_url IS
  'Public URL of the partner photograph shown in the app header and on '
  'their listing. Nullable and never required: the app falls back to '
  'initials and nothing is gated on it.';

-- ══════════════════════════════════════════════════════════════════════
-- The bucket
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-avatars', 'partner-avatars', true,
  -- 3 MB. A phone camera photograph is larger than this, so the client
  -- downscales before upload; the limit is the backstop that stops a
  -- 12 MB original being served to every customer browsing a list.
  3145728,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Storage policies ────────────────────────────────────────────────
-- Path shape: <vendor_id>/avatar-<epoch>.<ext>
--
-- `(storage.foldername(name))[1]` is the vendor id, compared against the
-- caller's own vendor rows — the same shape as 093, and what stops one
-- partner overwriting another's photograph by editing a path.
--
-- Policies have no IF NOT EXISTS (42710), so drop before create.

DROP POLICY IF EXISTS "anyone reads partner avatars" ON storage.objects;
CREATE POLICY "anyone reads partner avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-avatars');

DROP POLICY IF EXISTS "partners upload own avatar" ON storage.objects;
CREATE POLICY "partners upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'partner-avatars'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.vendors WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "partners replace own avatar" ON storage.objects;
CREATE POLICY "partners replace own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'partner-avatars'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.vendors WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "partners delete own avatar" ON storage.objects;
CREATE POLICY "partners delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'partner-avatars'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.vendors WHERE profile_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════
-- The public listing carries it
-- ══════════════════════════════════════════════════════════════════════
--
-- Rebuilt from 124 with `v.avatar_url` added and nothing else changed.
-- 124's whole point was that a catalogue is not a case file: this view
-- exposes what a customer needs to choose a partner and none of the
-- verification state behind it. A photograph belongs on that side of the
-- line; `verification_status`, `pan` and the rest stay off it.

-- Reproduced EXACTLY from 124 with one line added: `v.avatar_url`.
-- Nothing else moves. The column list, the security_invoker default, the
-- review_status = 'live' filter and the APPROVED join are all 124's, and
-- a view rebuilt from memory rather than from the migration is how a
-- filter quietly goes missing.
CREATE OR REPLACE VIEW public.public_vendor_services AS
SELECT
  s.id,
  s.vendor_id,
  s.name,
  s.category,
  s.description,
  s.price,
  s.unit,
  s.min_quantity,
  s.lead_time_days,
  s.created_at,
  -- The one addition.
  v.avatar_url
FROM public.vendor_services s
JOIN public.vendors v ON v.id = s.vendor_id
WHERE s.is_active
  AND s.review_status = 'live'
  AND v.status = 'APPROVED';

GRANT SELECT ON public.public_vendor_services TO anon, authenticated;

COMMIT;
