-- ══════════════════════════════════════════════════════════════════════
-- 179 · An admin-created request says who created it
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THIS IS A MIGRATION AND NOT A NOTE FIELD
-- ══════════════════════════════════════════════════════════════════════
--
-- Section 12 lets an operator raise a request on a customer's behalf,
-- and then lists the safeguards: record the administrator who created
-- it, record whether it was created for a customer or initiated by
-- operations, and never label it as a confirmed booking.
--
-- `booking_requests` has no column for any of that. The provenance
-- could be written into `notes`, and that is exactly the shortcut worth
-- refusing: a free-text note is not queryable, not constrained, and
-- gets edited. "Which requests did we raise ourselves, and who raised
-- them" is a question the finance and dispute paths will ask, and it
-- needs an answer the database can give.
--
-- ══════════════════════════════════════════════════════════════════════
-- IT CANNOT BECOME A BOOKING BY ITSELF
-- ══════════════════════════════════════════════════════════════════════
--
-- These columns only mark origin. They grant nothing: an admin-created
-- request still goes through the same dispatch, acceptance and payment
-- path as a customer's own, because the brief is explicit that consent,
-- payment and availability must not be bypassed. Nothing here writes
-- a booking_line, touches escrow, or implies a partner accepted.
--
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_origin TEXT
    CHECK (admin_origin IS NULL OR admin_origin IN ('for_customer', 'operations_initiated')),
  ADD COLUMN IF NOT EXISTS admin_reason TEXT;

COMMENT ON COLUMN public.booking_requests.created_by_admin IS
  'The operator who raised this request on someone''s behalf. NULL means the '
  'customer raised it themselves.';
COMMENT ON COLUMN public.booking_requests.admin_origin IS
  'for_customer: raised with a customer, on their behalf. '
  'operations_initiated: raised by Sambramo to source supply. Never implies consent.';
COMMENT ON COLUMN public.booking_requests.admin_reason IS
  'Why an operator raised it. Required by the console; recorded for audit.';

-- Finding admin-raised requests must stay cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_booking_requests_admin_origin
  ON public.booking_requests (created_by_admin, created_at DESC)
  WHERE created_by_admin IS NOT NULL;

-- Provenance is written once, at creation. Letting it be edited later
-- would make the audit trail a claim rather than a record.
CREATE OR REPLACE FUNCTION public.booking_request_origin_is_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.created_by_admin IS NOT NULL
     AND NEW.created_by_admin IS DISTINCT FROM OLD.created_by_admin THEN
    RAISE EXCEPTION 'created_by_admin cannot be changed once set';
  END IF;
  IF OLD.admin_origin IS NOT NULL
     AND NEW.admin_origin IS DISTINCT FROM OLD.admin_origin THEN
    RAISE EXCEPTION 'admin_origin cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_request_origin_immutable ON public.booking_requests;
CREATE TRIGGER trg_booking_request_origin_immutable
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.booking_request_origin_is_immutable();

COMMIT;

-- ── verify ───────────────────────────────────────────────────────────
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'booking_requests'
   AND column_name IN ('created_by_admin', 'admin_origin', 'admin_reason')
 ORDER BY column_name;
