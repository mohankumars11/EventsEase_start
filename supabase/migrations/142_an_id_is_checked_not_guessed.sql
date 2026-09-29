-- ══════════════════════════════════════════════════════════════════════
-- 142 · An ID is checked, not guessed — and a review has a deadline
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Independent of 136-141; order between them does not
-- matter.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT VERIFICATION MEANS HERE, EXACTLY
-- ══════════════════════════════════════════════════════════════════════
--
-- Three different things get called "verified" in this industry and they
-- are not the same. Conflating them is how a marketplace ends up telling
-- a customer that somebody's identity was confirmed when all that
-- happened was a photograph being uploaded.
--
--   checksum_ok      the NUMBER is internally consistent. Aadhaar's
--                    Verhoeff digit, the PAN structure, the GSTIN mod-36.
--                    Offline, instant, free, and it catches every typo,
--                    every transposition and every number somebody made
--                    up on the spot. This is what src/lib/validation/
--                    identity.js does and it is genuinely worth having.
--
--   provider_status  a LICENSED provider says the number exists and the
--                    name on it matches. UIDAI requires AUA/KUA
--                    licensing, PAN goes via NSDL, GST via GSTN -- in
--                    practice an aggregator (Signzy, Karza, IDfy,
--                    Surepass, Cashfree). None is contracted yet, so
--                    this column exists and stays 'not_checked'.
--
--   status           a human at Sambramo looked at the document.
--                    Already here from 093.
--
-- The UI must say which of the three happened. "Verified" on the
-- strength of a checksum would be the same class of lie as a fake payout
-- confirmation, and this project has been careful about that elsewhere.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE NUMBER ITSELF IS STILL NOT STORED
-- ══════════════════════════════════════════════════════════════════════
--
-- 093 got this right and it is not being changed: `number_last4` and
-- nothing more. The Aadhaar Act restricts storing the full number, and
-- there is no operational reason to hold it -- the checksum runs on the
-- client, the last four identify the document to a human, and a provider
-- check (when one exists) submits the number without persisting it.
--
-- `checksum_ok` records that the check PASSED, not what was checked.
--
-- Re-runnable.

BEGIN;

-- ── More kinds, because a trade decides what is asked for ───────────
--
-- A caterer needs an FSSAI licence; a transport partner needs a driving
-- licence and vehicle papers. Filing both under 'shop_licence' -- which
-- is what data/compliance.js had to do -- means an operator opening the
-- queue cannot tell what they are looking at.
ALTER TABLE public.vendor_documents DROP CONSTRAINT IF EXISTS vendor_documents_kind_check;
ALTER TABLE public.vendor_documents DROP CONSTRAINT IF EXISTS vendor_documents_kind_allowed;
ALTER TABLE public.vendor_documents ADD CONSTRAINT vendor_documents_kind_allowed
  CHECK (kind IN (
    'aadhaar', 'pan', 'gst', 'shop_licence', 'other',
    'fssai', 'dl', 'rc', 'udyam', 'police_clearance', 'insurance', 'selfie'));

ALTER TABLE public.vendor_documents
  -- Did the number's own check digit agree with the rest of it?
  ADD COLUMN IF NOT EXISTS checksum_ok     BOOLEAN,
  -- Which rule produced that answer, so a future change to the rules can
  -- be told apart from a document checked under the old ones.
  ADD COLUMN IF NOT EXISTS checksum_rule   TEXT,
  ADD COLUMN IF NOT EXISTS checked_at      TIMESTAMPTZ,
  -- The provider tier. Stays 'not_checked' until one is contracted.
  ADD COLUMN IF NOT EXISTS provider_status TEXT NOT NULL DEFAULT 'not_checked',
  ADD COLUMN IF NOT EXISTS provider_name   TEXT,
  ADD COLUMN IF NOT EXISTS provider_ref    TEXT,
  ADD COLUMN IF NOT EXISTS provider_at     TIMESTAMPTZ,
  -- What the holder's name is ON the document, for a name-match check.
  -- Not the number: a name is not a restricted identifier.
  ADD COLUMN IF NOT EXISTS holder_name     TEXT,
  ADD COLUMN IF NOT EXISTS expires_on      DATE;

ALTER TABLE public.vendor_documents DROP CONSTRAINT IF EXISTS vendor_documents_provider_status_allowed;
ALTER TABLE public.vendor_documents ADD CONSTRAINT vendor_documents_provider_status_allowed
  CHECK (provider_status IN (
    'not_checked',   -- no provider is configured. The honest default.
    'pending',       -- submitted, waiting
    'verified',      -- the issuing authority confirmed it
    'mismatch',      -- it exists, but the name does not match
    'not_found',     -- no such number
    'unavailable',   -- the provider or the source was down
    'error'));

CREATE INDEX IF NOT EXISTS idx_vendor_documents_review
  ON public.vendor_documents (status, uploaded_at)
  WHERE status = 'pending';

-- ── A partner may not mark their own ID checked ─────────────────────
--
-- 093 already froze `status` against self-review. The same applies to
-- the two new verdict columns: a client that could write
-- `provider_status = 'verified'` would make the whole tier meaningless.
CREATE OR REPLACE FUNCTION public.guard_document_self_verify()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN RETURN NEW; END IF;

  IF NEW.provider_status IS DISTINCT FROM OLD.provider_status
     OR NEW.provider_ref IS DISTINCT FROM OLD.provider_ref
     OR NEW.provider_name IS DISTINCT FROM OLD.provider_name THEN
    RAISE EXCEPTION 'provider_status is written by the verification service, not by the partner'
      USING HINT = 'See migration 142.';
  END IF;

  /* `checksum_ok` IS client-written, deliberately: the arithmetic runs
     on the device and there is nothing to gain by lying about it -- a
     forged `true` still leaves a document a human will open. What is
     forbidden is flipping it after the fact to look better. */
  IF OLD.checksum_ok IS NOT NULL AND NEW.checksum_ok IS DISTINCT FROM OLD.checksum_ok THEN
    RAISE EXCEPTION 'checksum_ok is set once, when the number is entered'
      USING HINT = 'Re-upload the document instead. See migration 142.';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_document_self_verify ON public.vendor_documents;
CREATE TRIGGER trg_document_self_verify
  BEFORE UPDATE ON public.vendor_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_self_verify();

-- ══════════════════════════════════════════════════════════════════════
-- THE 24-HOUR REVIEW CLOCK
-- ══════════════════════════════════════════════════════════════════════
--
-- A partner who submits and is told "under review" with no end to it
-- will ring somebody on day two. A deadline is cheap to promise and the
-- whole point is that it is VISIBLE -- to them and to whoever has to
-- meet it.
--
-- `review_due_at` is a real column rather than `submitted_at + 24h`
-- computed on the client, for one reason: it has to be EXTENDABLE. A
-- review that needs longer is a fact an operator records once, and every
-- screen then counts to the new time instead of continuing to promise a
-- deadline that has already gone.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS review_due_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_extended  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_note      TEXT;

/** The SLA, in one place. Change it here and every screen follows. */
CREATE OR REPLACE FUNCTION public.review_sla_hours()
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$ SELECT 24 $$;

/**
 * Submit for review, and start the clock.
 *
 * Partner-callable. It is the only way to reach 'submitted', which is
 * what stops a client setting its own verification_status.
 */
CREATE OR REPLACE FUNCTION public.submit_for_review()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
  v_due    TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_vendor FROM public.vendors WHERE profile_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_a_partner');
  END IF;

  IF v_vendor.verification_status = 'approved' THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true, 'status', 'approved');
  END IF;

  IF v_vendor.verification_status = 'suspended' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'suspended',
      'says', 'This account is closed. Please talk to us before resubmitting.');
  END IF;

  /* Re-submitting while already under review must NOT restart the
     clock -- that would let somebody push their own deadline back
     indefinitely and would make the promise meaningless. */
  IF v_vendor.verification_status = 'submitted' AND v_vendor.review_due_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true,
      'status', 'submitted', 'review_due_at', v_vendor.review_due_at);
  END IF;

  v_due := now() + (public.review_sla_hours() || ' hours')::interval;

  UPDATE public.vendors
     SET verification_status = 'submitted',
         submitted_at = COALESCE(submitted_at, now()),
         review_due_at = v_due,
         review_note = NULL
   WHERE id = v_vendor.id;

  RETURN jsonb_build_object('ok', true, 'status', 'submitted', 'review_due_at', v_due);
END $$;

/**
 * An operator moves or extends the deadline.
 *
 * `review_extended` counts the extensions rather than overwriting the
 * history with a new date, so "this has been pushed back three times" is
 * answerable -- which is the number that matters when somebody asks why
 * a partner is still waiting.
 */
CREATE OR REPLACE FUNCTION public.extend_review(
  p_vendor_id UUID,
  p_hours     INTEGER,
  p_note      TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_due TIMESTAMPTZ;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;
  IF p_hours IS NULL OR p_hours <= 0 OR p_hours > 720 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_hours',
      'says', 'Extend by between 1 and 720 hours.');
  END IF;

  UPDATE public.vendors
     SET review_due_at = GREATEST(COALESCE(review_due_at, now()), now())
                         + (p_hours || ' hours')::interval,
         review_extended = review_extended + 1,
         review_note = COALESCE(p_note, review_note)
   WHERE id = p_vendor_id
   RETURNING review_due_at INTO v_due;

  IF v_due IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_vendor');
  END IF;

  RETURN jsonb_build_object('ok', true, 'review_due_at', v_due);
END $$;

REVOKE ALL ON FUNCTION public.submit_for_review() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_for_review() TO authenticated;

REVOKE ALL ON FUNCTION public.extend_review(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_review(UUID, INTEGER, TEXT) TO authenticated, service_role;

COMMIT;
