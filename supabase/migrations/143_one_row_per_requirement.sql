-- ══════════════════════════════════════════════════════════════════════
-- 143 · One row per requirement, not one row per kind
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 142 first. Independent of 136-141.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE BUG
-- ══════════════════════════════════════════════════════════════════════
--
-- 093 put `UNIQUE (vendor_id, kind)` on vendor_documents, which reads as
-- obviously right: one Aadhaar per partner.
--
-- It is wrong for every other kind. Five separate trade requirements in
-- data/compliance.js all carry `documentKind: 'shop_licence'`:
--
--   VER-TRADE-FOOD       Catering & Food     a food licence
--   VER-TRADE-VENUE      Venue               proof you can let the venue
--   VER-TRADE-TRANSPORT  Transportation      vehicle papers
--   VER-TRADE-SECURITY   Security Services   agency credentials
--   VER-TRADE-SAFETY     Safety & Facilities service credentials
--
-- So a partner who lists Catering AND Venue is asked for two completely
-- different documents, can physically store only one row, and
-- `complianceDone` (partnerOnboarding.js:172) then marks BOTH satisfied
-- off that single upload. The second requirement is not merely unmet --
-- it reports as met. That is worse than a missing check, because a human
-- reading the queue sees a tick.
--
-- 142 added `fssai`, `dl`, `rc`, `udyam`, `insurance` partly to relieve
-- this, but it cannot fix it on its own: a Venue lease and a security
-- agency licence have no natural kind of their own, and inventing one
-- per trade would mean a migration every time a trade is added.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE FIX: KEY ON THE REQUIREMENT
-- ══════════════════════════════════════════════════════════════════════
--
-- `requirement_id` is the stable id already in the config --
-- 'VER-TRADE-FOOD', 'VER-ID-IDENTITY' -- so the uniqueness rule becomes
-- what it should always have been: one document per thing we asked for.
--
-- `kind` stays, because it still says what sort of document this is and
-- the storage/OCR path keys off it. It just stops being the identity.
--
-- ── Backfill, and why it cannot be guessed ──────────────────────────
-- Existing rows have no requirement_id. They are backfilled from `kind`
-- for the three unambiguous cases (aadhaar -> VER-ID-IDENTITY, pan ->
-- VER-TAX-PAN, gst -> VER-BUSINESS-GST). A `shop_licence` row is NOT
-- guessed: which of the five it satisfies is unknowable from the row, so
-- it gets 'VER-BUSINESS-PROOF' -- the generic one -- and the partner is
-- asked again for anything trade-specific. Re-asking is the safe
-- direction; assigning it to the wrong trade is not.
--
-- Re-runnable.

BEGIN;

ALTER TABLE public.vendor_documents
  ADD COLUMN IF NOT EXISTS requirement_id TEXT,
  -- Which listing this was uploaded for. NULL for the base identity
  -- documents, which belong to the person rather than to a trade.
  ADD COLUMN IF NOT EXISTS listing_id     UUID REFERENCES public.partner_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trade          TEXT;

-- ── Backfill before the constraint swap, or the swap fails ──────────
UPDATE public.vendor_documents SET requirement_id =
  CASE kind
    WHEN 'aadhaar' THEN 'VER-ID-IDENTITY'
    WHEN 'pan'     THEN 'VER-TAX-PAN'
    WHEN 'gst'     THEN 'VER-BUSINESS-GST'
    ELSE 'VER-BUSINESS-PROOF'
  END
WHERE requirement_id IS NULL;

ALTER TABLE public.vendor_documents
  ALTER COLUMN requirement_id SET NOT NULL;

-- ── The swap ────────────────────────────────────────────────────────
--
-- 093 created this as a table-level UNIQUE, so Postgres named it
-- `vendor_documents_vendor_id_kind_key`. Both the implicit name and an
-- explicit one are dropped, because a re-run may have renamed it.
ALTER TABLE public.vendor_documents
  DROP CONSTRAINT IF EXISTS vendor_documents_vendor_id_kind_key;
ALTER TABLE public.vendor_documents
  DROP CONSTRAINT IF EXISTS vendor_documents_one_per_kind;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_documents_requirement
  ON public.vendor_documents (vendor_id, requirement_id);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_listing
  ON public.vendor_documents (listing_id) WHERE listing_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════
-- A DOCUMENT HAS TWO SIDES
-- ══════════════════════════════════════════════════════════════════════
--
-- An Aadhaar card, a driving licence and an RC all carry the number on
-- one face and the address or validity on the other. 093 has a single
-- `storage_path`, so only one side could ever be kept -- and the side a
-- partner photographs is not the side a reviewer needs.
--
-- Two nullable columns rather than two rows: one document is one row,
-- and splitting it would put the uniqueness rule back where it started.
-- `storage_path` stays as the front, so every existing row and every
-- existing reader keeps working unchanged.
ALTER TABLE public.vendor_documents
  ADD COLUMN IF NOT EXISTS back_path          TEXT,
  ADD COLUMN IF NOT EXISTS issuing_authority  TEXT,
  ADD COLUMN IF NOT EXISTS issue_date         DATE;

COMMENT ON COLUMN public.vendor_documents.storage_path IS
  'The front of the document. Named before backs existed; see 143.';
COMMENT ON COLUMN public.vendor_documents.requirement_id IS
  'The config id this satisfies (VER-TRADE-FOOD, …). The uniqueness key, since 143.';

-- ══════════════════════════════════════════════════════════════════════
-- EXPIRY IS A FACT ABOUT THE DOCUMENT, SO IT IS ANSWERED HERE
-- ══════════════════════════════════════════════════════════════════════
--
-- 142 added `expires_on`. This is the ladder every screen reads, so a
-- 30-day warning cannot drift between the partner app and the operator
-- console.
CREATE OR REPLACE FUNCTION public.document_expiry_state(p_expires_on DATE)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_expires_on IS NULL THEN 'no_expiry'
    WHEN p_expires_on < (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'expired'
    WHEN p_expires_on < ((now() AT TIME ZONE 'Asia/Kolkata')::date + 30) THEN 'expiring_soon'
    ELSE 'valid'
  END
$$;

COMMIT;
