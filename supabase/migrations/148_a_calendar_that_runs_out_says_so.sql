-- ══════════════════════════════════════════════════════════════════════
-- 148 · A calendar that runs out says so, and three fixes it travels with
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 144, 145, 146 and 147 first.
--
-- Four unrelated-looking changes in one file, because each is two or
-- three lines and every extra migration is another thing to paste at
-- three in the morning. They are separated below and can be run
-- independently if one of them needs to wait.
--
-- Re-runnable.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · THE NOTIFICATION FEED CAN CARRY A CALENDAR REMINDER
-- ══════════════════════════════════════════════════════════════════════
--
-- `partner_notifications` has existed since 125 with eight `kind`
-- values, and -- worth saying plainly -- nothing in the repository has
-- ever written a row to it. The feed is live and unfed.
--
-- api/_lib/calendarSweep.js is its first writer, and 'calendar' is not
-- one of the eight. Using 'system' instead would work today and would
-- make the feed unfilterable later: "stop telling me about my calendar"
-- is a reasonable thing for a partner to want, and it cannot be honoured
-- if the reminder is indistinguishable from a fee change.

ALTER TABLE public.partner_notifications
  DROP CONSTRAINT IF EXISTS partner_notifications_kind_check;

ALTER TABLE public.partner_notifications
  ADD CONSTRAINT partner_notifications_kind_check
  CHECK (kind IN (
    'offer', 'job', 'payout', 'verification',
    'listing', 'review', 'message', 'system',
    'calendar'));

/* And the switch to turn it off.
   DEFAULT true like its five siblings: somebody who has never opened
   the settings screen should hear about a calendar that has run out,
   because the consequence of not hearing is being offered nothing.

   `offers` is still deliberately absent from this table -- switching
   those off would silently switch off the work, as 125 says. */
ALTER TABLE public.partner_notification_prefs
  ADD COLUMN IF NOT EXISTS calendar BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.partner_notification_prefs.calendar IS
  'Reminders that the calendar has run out of stated days. Not offers.';

-- ══════════════════════════════════════════════════════════════════════
-- 2 · 143 DID NOT DROP WHAT IT MEANT TO DROP
-- ══════════════════════════════════════════════════════════════════════
--
-- Migration 143 exists to let one partner hold two documents of the same
-- KIND for two different requirements -- a caterer who is also a venue
-- needs two `shop_licence` rows, and under the old key the second upsert
-- overwrote the first.
--
-- It re-keyed the table on `requirement_id` correctly, and then tried to
-- remove the old uniqueness with:
--
--     ALTER TABLE ... DROP CONSTRAINT IF EXISTS vendor_documents_one_per_kind;
--
-- But 093 did not create a CONSTRAINT. It created a standalone index:
--
--     CREATE UNIQUE INDEX uq_vendor_document_per_kind
--       ON public.vendor_documents (vendor_id, kind);
--
-- `DROP CONSTRAINT IF EXISTS` does not match an index, and IF EXISTS
-- means it did not complain. So on every database where 093 and 143 both
-- ran, UNIQUE (vendor_id, kind) is STILL ENFORCED and the exact
-- collision 143 was written to remove is still happening -- silently,
-- and looking like an upload failure to the partner.
--
-- Check before and after:
--     SELECT indexname FROM pg_indexes
--      WHERE tablename = 'vendor_documents' AND indexname LIKE 'uq_%';
--
-- `uq_vendor_documents_requirement` from 143 is the live key and stays.

DROP INDEX IF EXISTS public.uq_vendor_document_per_kind;

-- ══════════════════════════════════════════════════════════════════════
-- 3 · A TYPO IN A NUMBER IS NOT AN ATTACK
-- ══════════════════════════════════════════════════════════════════════
--
-- 142 made `checksum_ok` write-once, and the intent was right: a partner
-- must not be able to flip their own document to "the number checks
-- out". But it raises on ANY change once the column is non-null, which
-- catches the honest case too.
--
-- The sequence that breaks: the partner saves their details, then
-- uploads the photo, then notices they typed one digit of their PAN
-- wrong and fixes it. `checksum_ok` is already set, so Postgres raises
--
--     checksum_ok is set once, when the number is entered
--
-- straight into their face, in those words, with no way forward.
--
-- The rule that actually protects anything is narrower: the value must
-- be COMPUTED, and it must not be changeable after a human has looked at
-- the document. While the row is still `pending` and untouched by a
-- reviewer, a correction is just a correction -- and the number is
-- re-checked by the same arithmetic either way.
--
-- An operator is unaffected; they were never blocked.

CREATE OR REPLACE FUNCTION public.guard_document_self_verify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN
    RETURN NEW;
  END IF;

  /* The provider's verdict is never the partner's to write. Unchanged
     from 142, and the more important half of this trigger: this is what
     stops a partner setting provider_status = 'verified' with an anon
     key and a curl command. */
  IF NEW.provider_status IS DISTINCT FROM OLD.provider_status
     OR NEW.provider_ref  IS DISTINCT FROM OLD.provider_ref
     OR NEW.provider_name IS DISTINCT FROM OLD.provider_name THEN
    RAISE EXCEPTION 'a verification result is not yours to write'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  /* Once a reviewer has ruled on the document, the number that was
     checked is part of what they ruled on, and changing it underneath
     them would invalidate the decision. Before that, it is a form the
     partner is still filling in. */
  IF NEW.checksum_ok IS DISTINCT FROM OLD.checksum_ok
     AND OLD.checksum_ok IS NOT NULL
     AND (OLD.status <> 'pending' OR OLD.reviewed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'this document has already been reviewed; upload a new one instead'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 4 · WHAT A DOCUMENT CHECK SAW
-- ══════════════════════════════════════════════════════════════════════
--
-- The classifier answers two questions -- "is this the document it is
-- filed as?" and "what does it say?" -- and only the first belongs on
-- the row. The extracted values are compared on the device and then
-- discarded; what is kept is the VERDICT, because that is what an
-- operator needs when the partner rings up asking why it was refused.
--
-- No number, no name, no image, no raw provider response. Those live in
-- `verification_events` (144), which is operator-read and append-only.

ALTER TABLE public.vendor_documents
  ADD COLUMN IF NOT EXISTS detected_type       TEXT,
  ADD COLUMN IF NOT EXISTS detected_confidence NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS name_match          TEXT,
  ADD COLUMN IF NOT EXISTS classified_at       TIMESTAMPTZ;

ALTER TABLE public.vendor_documents
  DROP CONSTRAINT IF EXISTS vendor_documents_name_match_known;
ALTER TABLE public.vendor_documents
  ADD CONSTRAINT vendor_documents_name_match_known
  CHECK (name_match IS NULL OR name_match IN
    ('match', 'partial_match', 'mismatch', 'not_available'));

ALTER TABLE public.vendor_documents
  DROP CONSTRAINT IF EXISTS vendor_documents_confidence_sane;
ALTER TABLE public.vendor_documents
  ADD CONSTRAINT vendor_documents_confidence_sane
  CHECK (detected_confidence IS NULL
         OR (detected_confidence >= 0 AND detected_confidence <= 1));

COMMENT ON COLUMN public.vendor_documents.detected_type IS
  'What the classifier thought the image WAS. Extraction, never verification: '
  'a read Aadhaar card is not a confirmed one, and no label anywhere may say '
  'it is. See src/lib/verification/documentTypes.js verificationLabel().';

/* The same hands as the provider columns. A partner who could write
   `detected_type` could declare a photograph of a laptop to be an
   Aadhaar card, which is precisely the check this exists to perform. */
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
    NEW.classified_at       := NULL;
    RETURN NEW;
  END IF;

  /* Restored rather than raised: unlike a provider verdict, a partner
     re-saving a form they did not know carried these fields is an
     accident, not an attempt. Silently keeping the old values is the
     behaviour guard_document_self_review() already uses for the review
     columns. */
  NEW.detected_type       := OLD.detected_type;
  NEW.detected_confidence := OLD.detected_confidence;
  NEW.name_match          := OLD.name_match;
  NEW.classified_at       := OLD.classified_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_classification ON public.vendor_documents;
CREATE TRIGGER trg_document_classification
  BEFORE INSERT OR UPDATE ON public.vendor_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_classification();

COMMIT;
