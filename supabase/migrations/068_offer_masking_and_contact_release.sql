-- ============================================================
-- 068 · What a master sees before payment, and what unlocks after it
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057–064 FIRST.
--
-- ══════════════════════════════════════════════════════════════════════
-- DISINTERMEDIATION IS NOT A POLICY. IT IS A SCHEMA PROPERTY.
-- ══════════════════════════════════════════════════════════════════════
--
-- Every services marketplace loses its best customers and its best
-- supply the same way: they meet through the platform once, exchange
-- numbers, and book directly forever after. The platform paid the
-- acquisition cost for a relationship it then has no part in.
--
-- Terms of service do not prevent this. Nobody reads them and nobody
-- enforces them. What prevents it is that the two parties CANNOT reach
-- each other until the platform has been paid — and that has to be true
-- of the data, not of the interface. A phone number withheld by a React
-- component is a phone number sitting in a JSON response, one devtools
-- tab away.
--
-- So the rule is enforced in three places, in order of how much they
-- matter:
--
--   1. RLS         a partner's role cannot SELECT the customer's row
--   2. This view   the partner-facing payload has no identity columns
--   3. The UI      renders what it is given
--
-- Migration 058 already did (1) by deliberately giving partners NO
-- policy on `booking_requests`. This does (2), and adds the release.
--
-- ── What a master needs to decide, and it is less than you think ─────
-- Trade, date, area, distance, scale, and what the job includes. That is
-- a complete basis for "can I do this, and is the fee worth it" and it
-- identifies nobody. A name and a phone number add nothing to that
-- decision — they are only needed to DO the job, which is after
-- acceptance and after payment.
--
-- ── Area, not address ────────────────────────────────────────────────
-- "Koramangala 5th Block · 1.2 km" is enough to judge travel. The flat
-- number is not, and it is exactly what lets somebody turn up and hand
-- over a card. `booking_requests.area_label` is a separate column from
-- `address_text` for that reason — see its comment in 058.
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- The offer feed — the ONLY thing a partner reads before accepting
-- ══════════════════════════════════════════════════════════════════════
--
-- `security_invoker = on` so the view runs with the CALLER's permissions
-- and the underlying RLS still applies. Without it a view owned by a
-- privileged role becomes a hole straight through every policy beneath
-- it — the classic way a carefully-built RLS scheme is undone by one
-- convenience view.
CREATE OR REPLACE VIEW partner_offer_feed
WITH (security_invoker = on) AS
SELECT
  o.id                AS offer_id,
  o.line_id,
  o.vendor_id,
  o.status,
  o.wave,
  o.distance_m,
  o.partner_amount_paise,
  o.offered_at,
  o.expires_at,

  l.service_id,
  l.service_name,
  l.trade,
  l.spec_mode,
  -- The customer's own note about THIS service travels, because it is
  -- about the work. "Blue and silver, the child likes dinosaurs" is what
  -- the master needs. It is scrubbed of contact details on write — see
  -- `scrub_contacts()` below — so it cannot be used to pass a number.
  l.customer_note,
  l.reference_photo_url,

  r.occasion_name,
  r.event_date,
  r.time_note,
  r.guest_count,
  -- Area only. `address_text` is deliberately absent from this view.
  r.area_label,
  r.city
FROM dispatch_offers o
JOIN booking_lines    l ON l.id = o.line_id
JOIN booking_requests r ON r.id = l.request_id;

COMMENT ON VIEW partner_offer_feed IS
  'Pre-acceptance partner payload. Carries NO customer identity and NO street address by construction.';

-- ══════════════════════════════════════════════════════════════════════
-- Contact release — after the money, and not one second before
-- ══════════════════════════════════════════════════════════════════════
--
-- Deliberately keyed on `paid`, not on `accepted`. Acceptance is a
-- master saying yes; it moves no money and the customer may never pay.
-- Releasing contact at acceptance would mean any partner could obtain a
-- customer's number by accepting and then doing nothing — which is a
-- free lead-scraping API with a 45-second cost.
--
-- ── Both directions at once ──────────────────────────────────────────
-- The customer learns who is coming at the same moment the master learns
-- where to go. Asymmetric release would leave one party able to make
-- contact while the other could not, which is worse than either extreme.
CREATE OR REPLACE FUNCTION public.booking_contact(p_line_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_line     booking_lines%ROWTYPE;
  v_req      booking_requests%ROWTYPE;
  v_vendor   vendors%ROWTYPE;
  v_customer profiles%ROWTYPE;
  v_caller   TEXT;
BEGIN
  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  SELECT * INTO v_req FROM booking_requests WHERE id = v_line.request_id;

  SELECT v.* INTO v_vendor
    FROM vendors v
    JOIN dispatch_offers o ON o.vendor_id = v.id
   WHERE o.id = v_line.accepted_offer_id;

  -- Which side is asking? Anyone who is neither gets nothing, including
  -- a partner who merely held an offer on this line and lost it.
  IF v_req.customer_id = auth.uid() THEN
    v_caller := 'customer';
  ELSIF v_vendor.profile_id = auth.uid() THEN
    v_caller := 'partner';
  ELSIF get_my_role() IN ('admin','event_coordinator') THEN
    v_caller := 'admin';
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  -- ── The gate ──────────────────────────────────────────────────────
  IF v_caller <> 'admin'
     AND v_line.status NOT IN ('paid','in_progress','delivered','settled','disputed') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'not_paid',
      -- Said plainly rather than as an error, because for a master
      -- refreshing an accepted job this is the normal state and the
      -- honest answer is "not yet".
      'scan', 'Details unlock when paid'
    );
  END IF;

  SELECT * INTO v_customer FROM profiles WHERE id = v_req.customer_id;

  RETURN jsonb_build_object(
    'ok', true,
    'customer', jsonb_build_object(
      'name',    v_customer.full_name,
      'phone',   v_customer.phone,
      'address', v_req.address_text,
      'area',    v_req.area_label
    ),
    'partner', jsonb_build_object(
      'business_name', v_vendor.business_name,
      'phone',         (SELECT phone FROM profiles WHERE id = v_vendor.profile_id),
      'rating',        v_vendor.rating_avg
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.booking_contact(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_contact(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Scrubbing contact details out of free text
-- ══════════════════════════════════════════════════════════════════════
--
-- Every masking scheme above is defeated by one customer typing their
-- number into the "anything specific?" box, and it will happen — often
-- innocently ("call me on 98xxx before you come").
--
-- Scrubbed ON WRITE rather than on display. A number that reaches the
-- column is a number in every backup, every export and every future
-- query that forgets to filter — and by then the leak has already
-- happened. This is the one place a destructive transform is correct.
--
-- Deliberately conservative. It catches Indian mobile numbers in their
-- common written forms and email addresses, and it does not attempt to
-- catch a number spelled out in words. Perfect interception is not
-- achievable and is not the goal: the goal is that the easy, accidental
-- path does not work, while the terms of service and the audit trail
-- handle deliberate evasion.
CREATE OR REPLACE FUNCTION public.scrub_contacts(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN p_text IS NULL THEN NULL ELSE
    regexp_replace(
      regexp_replace(
        -- Email
        regexp_replace(p_text, '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[removed]', 'gi'),
        -- +91 / 0 prefixed, with spaces or hyphens
        '(\+?91[[:space:]-]?)?[[:space:]-]?[6-9][0-9]{4}[[:space:]-]?[0-9]{5}', '[removed]', 'g'),
      -- Any bare run of 10+ digits
      '[0-9]{10,}', '[removed]', 'g')
  END
$$;

CREATE OR REPLACE FUNCTION public.scrub_booking_text()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.customer_note := public.scrub_contacts(NEW.customer_note);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_lines_scrub ON booking_lines;
CREATE TRIGGER booking_lines_scrub
  BEFORE INSERT OR UPDATE OF customer_note ON booking_lines
  FOR EACH ROW EXECUTE FUNCTION public.scrub_booking_text();

CREATE OR REPLACE FUNCTION public.scrub_request_text()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.notes := public.scrub_contacts(NEW.notes);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_requests_scrub ON booking_requests;
CREATE TRIGGER booking_requests_scrub
  BEFORE INSERT OR UPDATE OF notes ON booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.scrub_request_text();

COMMIT;
