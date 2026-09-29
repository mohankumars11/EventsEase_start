-- ============================================================
-- 079 · What a partner needs to be a real business on this platform
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057, 067 and 077 FIRST.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THIS EXISTS
-- ══════════════════════════════════════════════════════════════════════
--
-- The partner side could receive a job and accept it, and nothing else. A
-- master could not show their work, could not be paid, could not say a
-- job was finished, and could not see what they had earned.
--
-- Worse, a partner could complete signup and be silently undispatchable.
-- `match_partners()` needs four things — approved, located, a live
-- service row, and a free date — and the onboarding form collected a
-- pincode as TEXT and never turned it into a point. So they would sit in
-- the list looking perfectly onboarded and never receive a single job,
-- with nothing anywhere reporting a problem. That happened in testing to
-- the one real partner in the database, twice, for two different reasons.
--
-- ══════════════════════════════════════════════════════════════════════
-- AN APPLICATION IS NOT A PROFILE
-- ══════════════════════════════════════════════════════════════════════
--
-- 067 gave `vendors.verification_status` the review states, and that is
-- the right place for the DECISION. What it has no room for is the
-- CONVERSATION: what the applicant said, what was asked of them, what
-- was still missing when somebody looked.
--
-- Squeezing that into the vendors row would mean an admin editing a
-- partner's live business record in order to write a note about it. So
-- the note lives here, and the vendors row keeps the decision.
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- The fields dispatch actually needs
-- ══════════════════════════════════════════════════════════════════════

-- The pincode the master typed, kept as typed. `location` (057) is the
-- point dispatch measures from and is derived from this — but a human
-- reading a review queue wants the six digits they were given, not a
-- geography blob.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pincode TEXT;

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_pincode_shape;
ALTER TABLE vendors ADD CONSTRAINT vendors_pincode_shape
  CHECK (pincode IS NULL OR pincode ~ '^[1-9][0-9]{5}$');

-- What a customer rings when something is wrong on the day. Held on the
-- vendor row rather than only on the profile because a business phone is
-- often not the owner's personal one.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

-- How long they need to prepare. A baker who needs two days for a tiered
-- cake should not be offered one for tomorrow — offering it and being
-- declined teaches them the notifications are not worth opening.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS lead_time_days INTEGER NOT NULL DEFAULT 0;

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_lead_time_sane;
ALTER TABLE vendors ADD CONSTRAINT vendors_lead_time_sane
  CHECK (lead_time_days BETWEEN 0 AND 90);

-- How many jobs they can take on one day. A single decorator with one van
-- is not two decorators.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS daily_capacity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_capacity_sane;
ALTER TABLE vendors ADD CONSTRAINT vendors_capacity_sane
  CHECK (daily_capacity BETWEEN 1 AND 50);

-- Years in the trade. The single most persuasive line on a profile in
-- this market, and free to collect.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS years_active INTEGER;

-- ══════════════════════════════════════════════════════════════════════
-- The application, as its own record
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS partner_applications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- What the applicant said about themselves, in their words. Kept
  -- separate from `vendors.description`, which is customer-facing copy an
  -- admin may rewrite.
  pitch          TEXT,
  serves_areas   TEXT,
  reference_note TEXT,

  -- The reviewer's side of it.
  reviewer_note  TEXT,
  missing        TEXT[] NOT NULL DEFAULT '{}',

  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at    TIMESTAMPTZ,
  reviewed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_application_per_vendor
  ON partner_applications (vendor_id);

CREATE INDEX IF NOT EXISTS idx_partner_applications_queue
  ON partner_applications (submitted_at) WHERE reviewed_at IS NULL;

DROP TRIGGER IF EXISTS partner_applications_updated_at ON partner_applications;
CREATE TRIGGER partner_applications_updated_at
  BEFORE UPDATE ON partner_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners manage own application" ON partner_applications;
CREATE POLICY "partners manage own application"
  ON partner_applications FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators read applications" ON partner_applications;
CREATE POLICY "operators read applications"
  ON partner_applications FOR SELECT
  USING (caller_is_operator());

DROP POLICY IF EXISTS "operators review applications" ON partner_applications;
CREATE POLICY "operators review applications"
  ON partner_applications FOR UPDATE
  USING (caller_is_operator());

-- ══════════════════════════════════════════════════════════════════════
-- vendor_photos gets an owner-writable policy and an order
-- ══════════════════════════════════════════════════════════════════════
-- The table has existed since migration 001 and no screen has ever
-- written to it. A decorator's work IS their sales pitch, and there was
-- nowhere to put it.
ALTER TABLE vendor_photos ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE vendor_photos ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendor_photos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_vendor_photos_order
  ON vendor_photos (vendor_id, sort_order);

-- One cover per partner, in the database rather than in a hopeful UPDATE
-- — the same pattern `customer_addresses.is_default` uses.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_photo_one_cover
  ON vendor_photos (vendor_id) WHERE is_cover = TRUE;

-- ══════════════════════════════════════════════════════════════════════
-- set_partner_location — pincode in, point out
-- ══════════════════════════════════════════════════════════════════════
--
-- Onboarding collects six digits. Dispatch needs a geography point, and
-- PostgREST cannot write one. Without this the two never met, which is
-- exactly how a fully-onboarded partner ended up invisible.
--
-- The caller passes the coordinate the CLIENT resolved from its pincode
-- table, and this validates it through `point_of` — so the India bounding
-- box still applies and a swapped pair is still refused.
CREATE OR REPLACE FUNCTION public.set_partner_location(
  p_vendor_id UUID,
  p_pincode   TEXT,
  p_lat       DOUBLE PRECISION,
  p_lng       DOUBLE PRECISION,
  p_area      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_point extensions.geography;
  v_owner UUID;
BEGIN
  IF NOT public.caller_is_operator() THEN
    SELECT profile_id INTO v_owner FROM vendors WHERE id = p_vendor_id;
    IF v_owner IS NULL OR auth.uid() IS NULL OR v_owner <> auth.uid() THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
    END IF;
  END IF;

  IF p_pincode !~ '^[1-9][0-9]{5}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_pincode');
  END IF;

  v_point := public.point_of(p_lat, p_lng);
  IF v_point IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'out_of_range',
      'detail', 'That location is outside India.');
  END IF;

  UPDATE vendors
     SET location = v_point,
         pincode  = p_pincode,
         area     = COALESCE(p_area, area),
         city     = 'Bengaluru'
   WHERE id = p_vendor_id;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_partner_location(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_partner_location(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- partner_readiness — why a master is not receiving jobs
-- ══════════════════════════════════════════════════════════════════════
--
-- The question that cost the most time in testing. A partner looked
-- completely set up and received nothing, and the cause was a
-- `vendor_services` row with `is_active = false` — invisible in every
-- screen, reported by nothing.
--
-- Four things make a master dispatchable, and this returns which of them
-- are missing so both the partner dashboard and the admin queue can SAY
-- so instead of leaving somebody to guess.
CREATE OR REPLACE FUNCTION public.partner_readiness(p_vendor_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT jsonb_build_object(
    'approved',     v.is_verified,
    'located',      v.location IS NOT NULL,
    'has_service',  EXISTS (
                      SELECT 1 FROM vendor_services s
                       WHERE s.vendor_id = v.id AND s.is_active = TRUE),
    'has_photo',    EXISTS (SELECT 1 FROM vendor_photos p WHERE p.vendor_id = v.id),
    'can_be_paid',  EXISTS (
                      SELECT 1 FROM partner_payout_accounts a
                       WHERE a.vendor_id = v.id AND a.kyc_status = 'verified'),
    -- The four that decide whether match_partners() can return them at
    -- all. Photos and payouts matter enormously and do not gate dispatch.
    'dispatchable', v.is_verified
                    AND v.location IS NOT NULL
                    AND EXISTS (
                      SELECT 1 FROM vendor_services s
                       WHERE s.vendor_id = v.id AND s.is_active = TRUE)
  )
  FROM vendors v WHERE v.id = p_vendor_id
$$;

REVOKE ALL ON FUNCTION public.partner_readiness(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_readiness(UUID) TO authenticated, service_role;

COMMIT;
