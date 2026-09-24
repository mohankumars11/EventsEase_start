-- ═══════════════════════════════════════════════════════════════════════
-- 152 · Aadhaar is not the only ID
-- ═══════════════════════════════════════════════════════════════════════
--
-- VER-ID-IDENTITY has always resolved to exactly one document type,
-- 'aadhaar', and `vendor_documents.kind` has only ever allowed the
-- twelve kinds 142 listed. So a partner who did not want to hand over
-- an Aadhaar number had no way through onboarding at all.
--
-- That is not a preference we are entitled to override. The UIDAI's own
-- position is that Aadhaar is one acceptable proof of identity among
-- several and may not be demanded as the only one, and a partner who
-- declines it is not a partner with something to hide.
--
-- The requirement now accepts any one of four -- Aadhaar, driving
-- licence, voter ID or passport -- and the two new ones need a home in
-- the CHECK.
--
-- ── What this deliberately does NOT do ────────────────────────────────
-- It does not add a provider for either. Nothing here verifies a voter
-- ID against the electoral roll and nothing verifies a passport against
-- the MEA, because no consumer API does. Both types carry
-- `verificationProvider: null` in documentTypes.js, which is what stops
-- either from ever rendering as government verified. A shape check and
-- a human reviewer is the whole of what we can honestly claim, and the
-- labels already say so.

BEGIN;

ALTER TABLE public.vendor_documents DROP CONSTRAINT IF EXISTS vendor_documents_kind_allowed;
ALTER TABLE public.vendor_documents ADD CONSTRAINT vendor_documents_kind_allowed
  CHECK (kind IN (
    'aadhaar', 'pan', 'gst', 'shop_licence', 'other',
    'fssai', 'dl', 'rc', 'udyam', 'police_clearance', 'insurance', 'selfie',
    -- New in 152.
    'voter_id', 'passport'));

-- The partner's choice, so the operator queue and the next device this
-- partner signs in on both show the same document slot. Without it the
-- chooser resets to Aadhaar on every fresh load and a partner who
-- uploaded a passport is asked for an Aadhaar card again.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS identity_document TEXT
  CHECK (identity_document IS NULL OR identity_document IN ('aadhaar','dl','voter_id','passport'));

COMMENT ON COLUMN public.vendors.identity_document IS
  'Which ID this partner chose for VER-ID-IDENTITY. NULL means the default, aadhaar.';

COMMIT;
