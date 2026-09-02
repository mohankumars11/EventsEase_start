-- ══════════════════════════════════════════════════════════════════════
-- 093 · Proof of identity, and the button that asks to be checked
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 067, 079 and 090 first.
-- Re-runnable.
--
-- ── The gap ─────────────────────────────────────────────────────────
--
-- 067 built the whole verification apparatus: the states, the lock that
-- stops a partner approving themselves, the audit log, and the two
-- buttons an operator presses. It left one thing out, and it is the
-- thing verification is actually made of — EVIDENCE.
--
-- Today an operator approving a decorator is approving a business name
-- and a pincode somebody typed into a form. There is nowhere in the
-- schema to put an Aadhaar card or a PAN, so "we check every master
-- before sending them work" is checked against nothing. That is a claim
-- the product makes on the partner landing page and on the customer
-- side, and it should be true.
--
-- ── Why the documents are OPTIONAL ──────────────────────────────────
--
-- Deliberately, and it stays that way until the pilot is over. A master
-- signing up on a Sunday afternoon does not have a scan of their PAN
-- ready, and a hard gate at that moment loses the supply this business
-- does not yet have. So: a partner can still be approved without them,
-- and a partner who uploads them gets checked faster and carries a badge
-- saying a human looked. The incentive does the work the gate would have
-- done, without costing us the signup.
--
-- ── Why a private bucket, unlike every other bucket here ────────────
--
-- `product-images` (025) and `product-media` (051) are public-read, and
-- correctly so — they are shop photos on an unauthenticated storefront.
-- This is a government ID. Public read here would mean an Aadhaar card
-- reachable by anyone who could guess a UUID, forever, because a public
-- Supabase object URL has no expiry and no auth on it.
--
-- So the bucket is private and every read mints a signed URL that
-- expires. The path's first segment is the vendor id, which is what the
-- storage policies key on — the same shape migration 044 uses for décor,
-- with the owner check that one did not need.
--
-- ── Why the number is four digits and not the whole number ──────────
--
-- The reviewer needs to match the card against what the partner claims.
-- They do not need twelve digits sitting in a Postgres row that a
-- service role can select, and nothing else in this system needs them
-- either. Four digits confirms a match; twelve creates a liability. The
-- image is the record, and it is behind a signed URL.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · The bucket
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-documents',
  'partner-documents',
  FALSE,
  10485760,  -- 10 MB. The client compresses photographs before upload;
             -- this is the backstop, and the headroom is for a PDF
             -- scanned on a shop's photocopier, which is how a fair few
             -- of these will actually arrive.
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Storage policies ────────────────────────────────────────────────
-- Path shape: <vendor_id>/<kind>-<epoch>.<ext>
--
-- `(storage.foldername(name))[1]` is the vendor id. Comparing it against
-- the caller's own vendor rows is what stops one partner reading
-- another's Aadhaar by editing a path.
--
-- Policies have no IF NOT EXISTS (42710), so drop before create — the
-- house rule from PROJECT_SUMMARY.

DROP POLICY IF EXISTS "partners read own documents" ON storage.objects;
CREATE POLICY "partners read own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'partner-documents'
    AND (
      public.caller_is_operator()
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM vendors WHERE profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "partners upload own documents" ON storage.objects;
CREATE POLICY "partners upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'partner-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM vendors WHERE profile_id = auth.uid()
    )
  );

-- Replacing a rejected scan is the ordinary case, so update and delete
-- belong to the partner — but only inside their own folder.
DROP POLICY IF EXISTS "partners replace own documents" ON storage.objects;
CREATE POLICY "partners replace own documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'partner-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM vendors WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "partners delete own documents" ON storage.objects;
CREATE POLICY "partners delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'partner-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM vendors WHERE profile_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════
-- 2 · What was uploaded, and what a reviewer made of it
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vendor_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- The five worth asking for in this market. `other` is the escape
  -- hatch for a trade licence nobody anticipated; without it an operator
  -- asking for one has no row to put it in and the whole exchange moves
  -- to WhatsApp, which is where evidence goes to die.
  kind         TEXT NOT NULL
               CHECK (kind IN ('aadhaar','pan','gst','shop_licence','other')),

  -- The key inside `partner-documents`, not a URL. A private bucket has
  -- no durable URL to store — every read mints a fresh signed one — and
  -- a stored URL would be an expired string within the hour.
  storage_path TEXT NOT NULL,
  file_name    TEXT,
  mime_type    TEXT,
  byte_size    INTEGER,

  -- Four characters, never the whole number. See the header.
  number_last4 TEXT CHECK (number_last4 IS NULL OR number_last4 ~ '^[A-Z0-9]{4}$'),

  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','accepted','rejected')),
  review_note  TEXT,
  reviewed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,

  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One live document per kind. A partner re-uploading a clearer photo of
-- the same PAN is correcting the record, not adding to it — without this
-- the reviewer's queue fills with three versions of one card and no way
-- to tell which one is meant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_document_per_kind
  ON vendor_documents (vendor_id, kind);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_queue
  ON vendor_documents (uploaded_at) WHERE status = 'pending';

DROP TRIGGER IF EXISTS vendor_documents_updated_at ON vendor_documents;
CREATE TRIGGER vendor_documents_updated_at
  BEFORE UPDATE ON vendor_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners read own document rows" ON vendor_documents;
CREATE POLICY "partners read own document rows"
  ON vendor_documents FOR SELECT
  USING (
    public.caller_is_operator()
    OR vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "partners add own document rows" ON vendor_documents;
CREATE POLICY "partners add own document rows"
  ON vendor_documents FOR INSERT
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "partners replace own document rows" ON vendor_documents;
CREATE POLICY "partners replace own document rows"
  ON vendor_documents FOR UPDATE
  USING (
    public.caller_is_operator()
    OR vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "partners remove own document rows" ON vendor_documents;
CREATE POLICY "partners remove own document rows"
  ON vendor_documents FOR DELETE
  USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

-- ── The same lock 067 put on `vendors` ──────────────────────────────
-- A partner owns the upload. They do not own the verdict on it. Without
-- this the UPDATE policy above lets them PATCH `status = 'accepted'`,
-- which is exactly the hole 067 closed one table over.
CREATE OR REPLACE FUNCTION public.guard_document_self_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF public.caller_is_operator() THEN
    RETURN NEW;
  END IF;

  -- Re-uploading resets the verdict to pending, which is honest: the
  -- reviewer accepted a different file. Anything else a partner tries to
  -- write to these four columns has no effect — silently restored rather
  -- than raised, for the reason 067 gives: these are not fields the
  -- partner is ever shown, so an attempt to write them is a client doing
  -- something it should not.
  IF NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
    NEW.status      := 'pending';
    NEW.review_note := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  ELSE
    NEW.status      := OLD.status;
    NEW.review_note := OLD.review_note;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS vendor_documents_review_guard ON vendor_documents;
CREATE TRIGGER vendor_documents_review_guard
  BEFORE UPDATE ON vendor_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_self_review();

-- A row inserted by a partner is pending whatever it claims to be.
CREATE OR REPLACE FUNCTION public.guard_document_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT public.caller_is_operator() THEN
    NEW.status      := 'pending';
    NEW.review_note := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS vendor_documents_insert_guard ON vendor_documents;
CREATE TRIGGER vendor_documents_insert_guard
  BEFORE INSERT ON vendor_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_insert();

-- ══════════════════════════════════════════════════════════════════════
-- 3 · Asking to leave
-- ══════════════════════════════════════════════════════════════════════
--
-- A partner must be able to get out of a marketplace they joined, and
-- until now the only exit was WhatsApp.
--
-- But a self-service DELETE is the wrong shape here, and it is worth
-- saying why: a master with an accepted job on Saturday has a family
-- expecting them and customer money already held in escrow against that
-- line. Deleting the vendor row cascades those jobs and the customer
-- finds out on the day.
--
-- So this is a REQUEST with a timestamp on it, reversible by the partner
-- right up until an operator acts. Nothing is deleted and no job is
-- pulled. What it does immediately is put a named, dated intention in
-- front of somebody who can do it properly.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS closure_requested_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS closure_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_vendors_closure_queue
  ON vendors (closure_requested_at) WHERE closure_requested_at IS NOT NULL;

COMMENT ON COLUMN vendors.closure_requested_at IS
  'Set by the partner from Account. Reversible by them until an operator '
  'processes it. Deletes nothing and pulls no accepted job.';

COMMIT;
