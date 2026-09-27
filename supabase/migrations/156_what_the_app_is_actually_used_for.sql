-- ═══════════════════════════════════════════════════════════════════════
-- 156 · What the app is actually used for
-- ═══════════════════════════════════════════════════════════════════════
--
-- There is no telemetry in this product. None. No SDK, no event table,
-- no tracking call anywhere. So nobody can answer "did the partner open
-- the notification", "which reminder gets tapped", or "how many people
-- reach step 4 and stop" -- and every one of those has been guessed at
-- in a design decision already.
--
-- ══════════════════════════════════════════════════════════════════════
-- FIRST-PARTY, BECAUSE OF WHAT THIS APP HOLDS
-- ══════════════════════════════════════════════════════════════════════
--
-- A third-party analytics SDK in an app that also holds Aadhaar numbers,
-- bank accounts and document photographs is a decision that cannot be
-- undone -- once a payload leaves, it has left. This is one table in the
-- database the data already lives in, readable only by operators, under
-- the same RLS as everything else.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT MAY NEVER BE IN `props`
-- ══════════════════════════════════════════════════════════════════════
--
-- No identity number, no bank detail, no document photograph, no
-- provider response, no customer contact detail. Not "should not" --
-- there is a trigger below that rejects the write, and
-- `check-analytics-privacy.mjs` scans every call site.
--
-- The reason for both is that an analytics payload is the easiest place
-- in a codebase for something sensitive to end up: it is a free-form
-- bag, it is added under time pressure, and nobody reviews it as
-- carefully as they review a form. A key named `pan` reaching this table
-- is a data breach wearing a product-metrics hat.

BEGIN;

CREATE TABLE IF NOT EXISTS public.partner_events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vendor_id  UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- snake_case, from a closed list in src/lib/track.js. A free-text
  -- event name produces `calendar_updated`, `calendarUpdated` and
  -- `Calendar Updated` within a month, and then nothing can be counted.
  name       TEXT NOT NULL CHECK (name ~ '^[a-z][a-z0-9_]{2,63}$'),

  props      JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Which build, so a regression can be tied to a release without
  -- asking the partner what version they are on.
  surface    TEXT,
  app_build  TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_events_name
  ON public.partner_events (name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_events_vendor
  ON public.partner_events (vendor_id, created_at DESC);

COMMENT ON TABLE public.partner_events IS
  'Product telemetry. Operator-read only. props may never contain identity, bank or document data - enforced by trg_partner_events_no_secrets.';

-- ═══════════════════════════════════════════════════════════════════════
-- The trigger that makes the rule real
-- ═══════════════════════════════════════════════════════════════════════
--
-- A comment saying "do not put an Aadhaar number here" is a comment. A
-- key-name check is crude, and crude is the point: it fires on the
-- careless case, which is the case that actually happens. Somebody
-- determined to smuggle a number past it can, and that is a different
-- problem from somebody adding `{ pan: value }` at 11pm.
--
-- It rejects rather than strips. A silently emptied payload teaches
-- nobody; a failed write gets noticed in development, which is where
-- this should be noticed.
CREATE OR REPLACE FUNCTION public.guard_partner_event_props()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  k TEXT;
BEGIN
  FOREACH k IN ARRAY ARRAY(SELECT jsonb_object_keys(NEW.props)) LOOP
    IF k ~* '(aadhaar|^pan$|_pan$|pan_|passport|voter|ifsc|account_number|card_number|cvv|otp|number_last4|upi_id|bank|raw_response|provider_response|document_number|customer_phone|contact_phone|email)' THEN
      RAISE EXCEPTION
        'partner_events.props may not contain "%": identity, bank and document data must never enter telemetry', k;
    END IF;
  END LOOP;

  -- A value that looks like a 12-digit Aadhaar or a PAN, under ANY key
  -- name. Catches `{ id: '123412341234' }`, which no key-name rule can.
  IF NEW.props::text ~ '\y[0-9]{12}\y' OR NEW.props::text ~ '\y[A-Z]{5}[0-9]{4}[A-Z]\y' THEN
    RAISE EXCEPTION
      'partner_events.props contains something shaped like an identity number';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_partner_events_no_secrets ON public.partner_events;
CREATE TRIGGER trg_partner_events_no_secrets
  BEFORE INSERT OR UPDATE ON public.partner_events
  FOR EACH ROW EXECUTE FUNCTION public.guard_partner_event_props();

ALTER TABLE public.partner_events ENABLE ROW LEVEL SECURITY;

-- ── A partner writes their own, and reads nothing ─────────────────────
-- No SELECT policy for `authenticated` at all. Telemetry is not a
-- partner-facing feature and a partner reading the event stream is a
-- partner reading how the product is measured.
DROP POLICY IF EXISTS "partner writes own events" ON public.partner_events;
CREATE POLICY "partner writes own events"
  ON public.partner_events FOR INSERT TO authenticated
  WITH CHECK (
    vendor_id IS NULL
    OR vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "operators read events" ON public.partner_events;
CREATE POLICY "operators read events"
  ON public.partner_events FOR SELECT TO authenticated
  USING (public.caller_is_operator());

GRANT INSERT ON public.partner_events TO authenticated;
GRANT SELECT ON public.partner_events TO authenticated;
GRANT ALL    ON public.partner_events TO service_role;

COMMIT;
