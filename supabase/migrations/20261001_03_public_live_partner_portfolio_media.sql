-- Let customers read only portfolio objects attached to approved partner_work rows.
-- Identity documents remain in the separate partner-documents bucket.
DROP POLICY IF EXISTS "customers read live partner work objects" ON storage.objects;
CREATE POLICY "customers read live partner work objects"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'partner-uploads'
  AND EXISTS (
    SELECT 1 FROM public.partner_work pw
    WHERE pw.storage_path = storage.objects.name
      AND pw.review_status = 'live'
      AND pw.kind IN ('photo','video')
  )
);