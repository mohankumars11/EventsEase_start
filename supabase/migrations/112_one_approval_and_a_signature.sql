-- ══════════════════════════════════════════════════════════════════════
-- 112 · One approval, a real signature, and where they heard about us
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 101 first.
-- Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- 1 · APPROVING A PARTNER DID NOT MAKE THEIR LISTINGS LIVE
-- ══════════════════════════════════════════════════════════════════════
--
-- There are two gates. `vendors.verification_status` has a button in the
-- admin console. `vendor_services.review_status` does not, and 101's
-- freeze_review_status trigger only lets `service_role` change it — so
-- when a coordinator opens the console and approves a partner, they see
-- a green tick, the partner sees "verified", and match_partners still
-- returns nothing, because every listing is sitting at 'under_review'
-- and nothing on earth was ever going to move it.
--
-- 101's own closing note said the button would come. It did not, and the
-- gap has been open since. This closes it by making the two one act:
-- approving the BUSINESS approves the listings that were submitted with
-- it. That is what a coordinator believes they are doing when they click
-- Approve, and a system that quietly does half of what its operator
-- intends is worse than one that does nothing.
--
-- ── The per-listing column stays ─────────────────────────────────────
-- Not collapsed into the vendor row. A partner with six live listings
-- who adds a seventh that overclaims must be able to have that ONE sent
-- back, without their kitchen going dark. Approval is bulk; rejection is
-- per row. Only the bulk case had no button.
--
-- ══════════════════════════════════════════════════════════════════════
-- 2 · THE CONSENT RECORD WAS WRITTEN BY THE PARTY CONSENTING
-- ══════════════════════════════════════════════════════════════════════
--
-- TermsGate did `.from('vendors').update({ terms_accepted_at: <the
-- browser's clock>, terms_version: <whatever the bundle said> })`. Both
-- facts came from the device being asked to agree.
--
-- That was survivable while the terms were a ticked box. They are now a
-- signed agreement containing an undertaking we may have to ACT on —
-- take a listing down, withhold a payout, recover what a failed booking
-- cost to put right. Acting on any of that requires a record the partner
-- did not compose.
--
-- ══════════════════════════════════════════════════════════════════════
-- 3 · HOW DID YOU HEAR ABOUT US
-- ══════════════════════════════════════════════════════════════════════
--
-- Asked once, at onboarding, and never again — which is why it is a
-- column and not an event. Nothing else in this schema can answer "which
-- channel brought the partners who are still active in ninety days",
-- and that question decides where the recruiting effort goes.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- COLUMNS
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS heard_from        TEXT,
  ADD COLUMN IF NOT EXISTS heard_from_detail TEXT,
  ADD COLUMN IF NOT EXISTS terms_signature   JSONB;

-- Constrained rather than free text: an attribution column that accepts
-- anything becomes forty spellings of "instagram" within a month, and
-- then cannot answer the question it exists for. `heard_from_detail`
-- carries the free text — which partner referred them, which event.
ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_heard_from_valid;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_heard_from_valid CHECK (
    heard_from IS NULL OR heard_from IN (
      'partner', 'customer', 'instagram', 'whatsapp', 'google',
      'play_store', 'event', 'sambramo_team', 'other'
    )
  );

COMMENT ON COLUMN public.vendors.heard_from IS
  'Attribution, asked once during onboarding. Constrained so it can be grouped.';
COMMENT ON COLUMN public.vendors.terms_signature IS
  'The signature taken at onboarding: {name, signed_at, method, version}. Written only by sign_partner_terms(), never by the client.';

-- ══════════════════════════════════════════════════════════════════════
-- sign_partner_terms — the server stamps the time, not the browser
-- ══════════════════════════════════════════════════════════════════════
--
-- What the client legitimately knows is the name the partner typed and
-- which version of the words was on the screen in front of them. Those
-- are the only two things it supplies. The moment, the signer's identity
-- and the ownership check are all done here.
CREATE OR REPLACE FUNCTION public.sign_partner_terms(
  p_vendor_id UUID,
  p_version   TEXT,
  p_signature JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_name  TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  END IF;

  SELECT profile_id INTO v_owner FROM vendors WHERE id = p_vendor_id;
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- A partner signs their own agreement. An operator cannot sign it for
  -- them, and neither can another partner -- a signature obtained by
  -- anybody but the signer is not a signature.
  IF v_owner <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_your_account');
  END IF;

  v_name := btrim(COALESCE(p_signature->>'name', ''));
  IF length(v_name) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_name');
  END IF;

  IF COALESCE(btrim(p_version), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_version');
  END IF;

  UPDATE vendors
     SET terms_accepted_at = now(),
         terms_version     = p_version,
         terms_signature   = jsonb_build_object(
           'name',      v_name,
           -- now(), not the value the device sent. A clock the signing
           -- party sets is not evidence of when they signed.
           'signed_at', now(),
           'method',    COALESCE(p_signature->>'method', 'hold'),
           'version',   p_version,
           'signed_by', auth.uid()
         )
   WHERE id = p_vendor_id;

  RETURN jsonb_build_object('ok', true, 'version', p_version, 'name', v_name);
END $$;

REVOKE ALL ON FUNCTION public.sign_partner_terms(UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sign_partner_terms(UUID, TEXT, JSONB) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- freeze_review_status — widened from service_role to any operator
-- ══════════════════════════════════════════════════════════════════════
--
-- The intent in 101 was "a partner may not approve themselves", and the
-- test written for it was `auth.role() = 'service_role'`. A coordinator
-- signed into the admin console is NOT the service role -- they are an
-- authenticated user whose profile says 'event_coordinator'. So the test
-- excluded the only humans who were ever going to do the reviewing, and
-- the trigger silently reverted their decision: the UPDATE reported
-- success, and the row did not change.
--
-- caller_is_operator() (075) is the predicate every other administrative
-- path in this schema already uses.
CREATE OR REPLACE FUNCTION public.freeze_review_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN RETURN NEW; END IF;
  IF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
    NEW.review_status := OLD.review_status;
  END IF;
  RETURN NEW;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- set_vendor_verification — one approval, both gates
-- ══════════════════════════════════════════════════════════════════════
--
-- Replaces 075's version. Everything about the vendor row is unchanged;
-- what is added is the second half of the act the operator thought they
-- were performing.
--
-- ── What it deliberately does NOT do ─────────────────────────────────
-- Rejecting or suspending a VENDOR does not mass-reject their listings.
-- A suspension is about the business and is lifted; rewriting every
-- listing's review state on the way in would lose which individual
-- listings had been read, and there would be no way to put it back. It
-- does not need to: match_partners tests is_verified as well, so a
-- suspended partner is already receiving nothing.
--
-- ── And it does not resurrect a rejection ────────────────────────────
-- Only 'under_review' rows are promoted. A listing an operator sent back
-- with a note stays sent back; approving the business is not a way to
-- launder a listing that was refused on its own merits.
CREATE OR REPLACE FUNCTION public.set_vendor_verification(
  p_vendor_id UUID,
  p_status    TEXT,
  p_note      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listings INTEGER := 0;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  IF p_status NOT IN ('approved','rejected','suspended','submitted','draft') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_status');
  END IF;

  UPDATE vendors
     SET verification_status = p_status,
         is_verified         = (p_status = 'approved'),
         verification_note   = p_note,
         verified_by         = CASE WHEN p_status = 'approved' THEN auth.uid() ELSE verified_by END,
         verified_at         = CASE WHEN p_status = 'approved' THEN now()      ELSE verified_at END
   WHERE id = p_vendor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- The half that was missing.
  IF p_status = 'approved' THEN
    UPDATE vendor_services
       SET review_status = 'live',
           reviewed_at   = now()
     WHERE vendor_id = p_vendor_id
       AND review_status = 'under_review';
    GET DIAGNOSTICS v_listings = ROW_COUNT;
  END IF;

  -- Suspending does NOT touch work already accepted: those lines are
  -- paid for and a family is expecting somebody. They stop receiving NEW
  -- offers, which match_partners() enforces on the next dispatch.
  RETURN jsonb_build_object(
    'ok', true,
    'status', p_status,
    -- Returned so the console can SAY "approved, and 4 listings are now
    -- live" rather than leaving the operator to wonder which half ran.
    'listings_made_live', v_listings
  );
END $$;

REVOKE ALL ON FUNCTION public.set_vendor_verification(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_vendor_verification(UUID, TEXT, TEXT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- partner_readiness — it predates 101 and has been wrong since
-- ══════════════════════════════════════════════════════════════════════
--
-- This is the function both the partner dashboard and the admin queue
-- use to answer "why am I not getting jobs". It was written in 079,
-- before review_status existed, so `has_service` and `dispatchable`
-- test only `is_active`.
--
-- Which means it has been reporting `dispatchable: true` for partners
-- match_partners cannot return — the exact failure 079 was written to
-- stop, reintroduced by the migration that added the gate. Adding a
-- fifth key rather than changing what `has_service` means: a partner
-- HAS a service; it is waiting to be read, and those are different
-- things to tell somebody.
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
    'listing_live', EXISTS (
                      SELECT 1 FROM vendor_services s
                       WHERE s.vendor_id = v.id AND s.is_active = TRUE
                         AND s.review_status = 'live'),
    'signed_terms', v.terms_accepted_at IS NOT NULL,
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
                       WHERE s.vendor_id = v.id AND s.is_active = TRUE
                         AND s.review_status = 'live')
  )
  FROM vendors v WHERE v.id = p_vendor_id
$$;

REVOKE ALL ON FUNCTION public.partner_readiness(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_readiness(UUID) TO authenticated, service_role;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- AFTERWARDS
-- ══════════════════════════════════════════════════════════════════════
--
-- Partners approved BEFORE this migration have listings stuck at
-- 'under_review' that nobody can now explain. They were approved by a
-- human who believed they were finishing the job. Finish it:
--
--   UPDATE vendor_services s
--      SET review_status = 'live', reviewed_at = now()
--     FROM vendors v
--    WHERE v.id = s.vendor_id
--      AND v.is_verified = TRUE
--      AND s.review_status = 'under_review';
--
-- Run it once, from the SQL editor, as service_role. Read the count it
-- returns: that is how many listings have been invisible.
