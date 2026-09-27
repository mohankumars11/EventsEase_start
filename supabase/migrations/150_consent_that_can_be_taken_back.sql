-- ══════════════════════════════════════════════════════════════════════
-- 150 · Consent that can be taken back
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Independent of 144-149; it can be pasted before or
-- after them.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A SELFIE NEEDS ITS OWN RECORD
-- ══════════════════════════════════════════════════════════════════════
--
-- Comparing a photograph of a partner's face against the photograph on
-- their ID is biometric processing. Under the Digital Personal Data
-- Protection Act 2023 consent to that must be free, specific, informed
-- and — the one that shapes this table — CAPABLE OF BEING WITHDRAWN as
-- easily as it was given.
--
-- None of those four survive being folded into the terms:
--
--   free       a term you must accept to earn a living is not freely
--              given. Face matching has to be refusable without the
--              partner losing their account, which is why migration
--              149 leaves VER-ID-SELFIE advisory.
--   specific   "we may process your data" is not consent to compare
--              your face with a government ID.
--   informed   the partner should be told what is compared, what is
--              kept and what happens if it does not match, at the
--              moment they are asked.
--   withdrawn  `vendors.signature` is one JSONB blob stamped once at
--              onboarding. There is nowhere in it to say "and on the
--              4th of March they took this back", and overwriting it
--              would erase the fact that consent had ever been given,
--              which is the opposite of an audit trail.
--
-- So: one row per consent, per purpose, never deleted. Withdrawal is a
-- new row, not an UPDATE — the same discipline escrow_ledger and
-- verification_events use, and for the same reason. What was true when
-- a decision was taken has to stay readable afterwards.
--
-- Re-runnable.

BEGIN;

CREATE TABLE IF NOT EXISTS public.partner_consents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  /* Specific, per the Act. A new purpose is a new value here and a new
     asking, never a reinterpretation of one already given. */
  purpose    TEXT NOT NULL CHECK (purpose IN (
    'face_match',          -- comparing a selfie with the photo on an ID
    'background_check',    -- a police clearance obtained on their behalf
    'document_sharing'     -- showing a document to a customer or a venue
  )),

  granted    BOOLEAN NOT NULL,

  /* What they were shown. When the wording changes the version changes,
     and consent to v1 is not consent to v2. */
  version    TEXT NOT NULL DEFAULT 'v1',

  /* The server's clock. A browser's is whatever the phone says it is,
     and this is the timestamp a regulator would ask about. */
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  by_profile UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_partner_consents_current
  ON public.partner_consents (vendor_id, purpose, at DESC);

/**
 * What is the position right now?
 *
 * The latest row wins, and the absence of any row is NOT consent.
 * COALESCE to FALSE rather than TRUE, because the failure that matters
 * here is processing somebody's face on the strength of a missing row.
 */
CREATE OR REPLACE FUNCTION public.has_consent(p_vendor UUID, p_purpose TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT c.granted FROM public.partner_consents c
     WHERE c.vendor_id = p_vendor AND c.purpose = p_purpose
     ORDER BY c.at DESC LIMIT 1
  ), FALSE)
$$;

/**
 * Give it, or take it back.
 *
 * One function for both, because withdrawal must be exactly as easy as
 * granting — that is the Act's wording, and a system with a one-tap
 * grant and a support ticket for withdrawal does not comply however
 * well it is documented.
 */
CREATE OR REPLACE FUNCTION public.set_consent(
  p_vendor  UUID,
  p_purpose TEXT,
  p_granted BOOLEAN,
  p_version TEXT DEFAULT 'v1'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
BEGIN
  SELECT profile_id INTO v_owner FROM public.vendors WHERE id = p_vendor;

  /* Consent is personal. Nobody gives it on somebody else's behalf --
     not another partner, and not an operator. An operator who could
     tick this box could authorise the processing of a face on behalf of
     the person whose face it is. */
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'consent is given by the person it concerns'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.partner_consents (vendor_id, purpose, granted, version, by_profile)
  VALUES (p_vendor, p_purpose, p_granted, COALESCE(p_version, 'v1'), auth.uid());

  RETURN jsonb_build_object('purpose', p_purpose, 'granted', p_granted, 'at', now());
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════
--
-- The partner reads their own history in full -- "what did I agree to
-- and when" is a question they are entitled to an answer to. Operators
-- read it because a reviewer needs to know whether a face match was
-- permitted before relying on one.
--
-- NOBODY writes through the table. Every row goes through set_consent(),
-- which is what makes `at` the server's clock and `by_profile` the real
-- caller rather than whatever the client typed.

ALTER TABLE public.partner_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent owner reads their own" ON public.partner_consents;
CREATE POLICY "consent owner reads their own"
  ON public.partner_consents FOR SELECT TO authenticated
  USING (
    public.caller_is_operator()
    OR vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid())
  );

/* Append-only, and said in SQL rather than trusted. A consent record
   that can be edited afterwards is not a record of anything. */
CREATE OR REPLACE FUNCTION public.partner_consents_are_append_only()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION
    'partner_consents is append-only: a % would erase the decision it exists to keep', TG_OP
    USING HINT = 'Withdrawal is a new row with granted = FALSE.';
END $$;

DROP TRIGGER IF EXISTS partner_consents_no_update ON public.partner_consents;
CREATE TRIGGER partner_consents_no_update
  BEFORE UPDATE OR DELETE ON public.partner_consents
  FOR EACH ROW EXECUTE FUNCTION public.partner_consents_are_append_only();

GRANT SELECT ON public.partner_consents TO authenticated;
GRANT ALL    ON public.partner_consents TO service_role;

REVOKE ALL ON FUNCTION public.set_consent(UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_consent(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_consent(UUID, TEXT) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- WHERE THE COMPARISON LANDS
-- ══════════════════════════════════════════════════════════════════════
--
-- 148 added `name_match` for the typed-name comparison. This is its
-- counterpart for the face, and it takes the same four values for the
-- same reason: "could be, the photographs are too different to say" is
-- the commonest honest answer, and a two-value column would force it
-- into one of the two confident ones.
--
-- An ID photograph is often a decade old, printed small and
-- photographed through lamination. `partial_match` is not a failure of
-- the comparison; it is usually the correct result.
--
-- Written only by the server (api/verify-document.js), like the rest of
-- the classification columns 148 introduced -- the trigger
-- guard_document_classification() already restores them from OLD for
-- anybody who is not an operator, and this column joins them.

ALTER TABLE public.vendor_documents
  ADD COLUMN IF NOT EXISTS face_match TEXT;

ALTER TABLE public.vendor_documents
  DROP CONSTRAINT IF EXISTS vendor_documents_face_match_known;
ALTER TABLE public.vendor_documents
  ADD CONSTRAINT vendor_documents_face_match_known
  CHECK (face_match IS NULL OR face_match IN
    ('match', 'partial_match', 'mismatch', 'not_available'));

COMMENT ON COLUMN public.vendor_documents.face_match IS
  'Whether a selfie appeared to be the same person as the photo on an ID. '
  'Advisory only: a mismatch routes to human review and can never reject, '
  'suspend or ban. Written only with consent recorded in partner_consents.';

/* 148's trigger restores the classification columns for non-operators;
   face_match is one of them now. Re-issued in full rather than altered,
   because a trigger function that half-protects a set of columns is
   worse than one that does not protect them at all -- it reads as
   covered. */
CREATE OR REPLACE FUNCTION public.guard_document_classification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.detected_type       := NULL;
    NEW.detected_confidence := NULL;
    NEW.name_match          := NULL;
    NEW.face_match          := NULL;
    NEW.classified_at       := NULL;
    RETURN NEW;
  END IF;

  NEW.detected_type       := OLD.detected_type;
  NEW.detected_confidence := OLD.detected_confidence;
  NEW.name_match          := OLD.name_match;
  NEW.face_match          := OLD.face_match;
  NEW.classified_at       := OLD.classified_at;
  RETURN NEW;
END;
$$;

COMMENT ON TABLE public.partner_consents IS
  'Append-only consent log. Withdrawal is a new row with granted = FALSE, '
  'never an update, so what was true when a decision was taken stays readable.';

COMMIT;
