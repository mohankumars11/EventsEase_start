-- ============================================================
-- 076 · partner_offer_feed returns nothing to partners. Fix it.
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 068 and 075 FIRST.
--
-- ⚠ WITHOUT THIS THE PARTNER APP IS COMPLETELY EMPTY.
--   Offers are created, the master is notified, and their inbox says
--   "No jobs right now" — forever, for everybody.
--
-- ══════════════════════════════════════════════════════════════════════
-- TWO CORRECT DECISIONS THAT CANCEL EACH OTHER OUT
-- ══════════════════════════════════════════════════════════════════════
--
-- Migration 058 gave partners NO policy on `booking_requests`, on
-- purpose: that row holds the customer's street address, their notes and
-- their whole basket, and a master has no business reading any of it
-- before they have accepted anything. That reasoning still stands.
--
-- Migration 068 built `partner_offer_feed` with `security_invoker = on`,
-- also on purpose: a view without it runs as its owner and walks
-- straight through every policy underneath, which is the classic way a
-- careful RLS scheme is quietly undone.
--
-- Both are right. Together they are fatal — the view JOINS
-- `booking_requests` for the date, the area and the headcount, and
-- running as the partner that join matches zero rows. Measured, as the
-- real partner:
--
--     dispatch_offers      2   ✓
--     booking_lines        2   ✓
--     booking_requests     0   ✗
--     partner_offer_feed   0
--
-- Nothing errors. The inbox is simply empty, which reads as "no work
-- today" rather than "the app cannot see your work".
--
-- ══════════════════════════════════════════════════════════════════════
-- THE FIX: THE VIEW BECOMES THE BOUNDARY
-- ══════════════════════════════════════════════════════════════════════
--
-- The wrong fix is a policy letting partners read `booking_requests`.
-- Even scoped to rows they hold an offer on, that hands them
-- `address_text` and `notes` — the two columns migration 068 exists to
-- withhold. It would trade a broken feature for a leak.
--
-- The right fix is to let this ONE view see the underlying tables, and
-- make the view itself enforce who gets which rows:
--
--   · `security_invoker = off` — the view reads the base tables as its
--     owner, so the join works;
--   · the column list is unchanged and still carries no address, no
--     name, no phone — the masking is structural, not a filter;
--   · a WHERE clause scopes every row to the caller's own business.
--
-- That WHERE is now the only thing standing between one master and
-- another master's jobs, so it is worth reading twice. `auth.uid()`
-- still returns the caller inside a definer view — it reads the request's
-- JWT claim, not the executing role — so the scoping is per-user exactly
-- as it was.
--
-- Operators see everything, because the admin dispatch monitor is built
-- on this view and a coordinator debugging a stuck line needs the rows.
-- ============================================================

BEGIN;

DROP VIEW IF EXISTS partner_offer_feed;

CREATE VIEW partner_offer_feed
WITH (security_invoker = off) AS
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
  -- Scrubbed of phone numbers and emails on write (068 + 073), so this
  -- cannot be used to pass contact details around the platform.
  l.customer_note,
  l.reference_photo_url,

  r.occasion_name,
  r.event_date,
  r.time_note,
  r.guest_count,
  -- Area only. `address_text`, `notes` and `customer_id` are absent from
  -- this list deliberately and permanently: a leak here would need
  -- somebody to edit the view, not to forget a filter.
  r.area_label,
  r.city
FROM dispatch_offers o
JOIN booking_lines    l ON l.id = o.line_id
JOIN booking_requests r ON r.id = l.request_id
WHERE
  -- THE boundary. Everything else in this file is shape; this is safety.
  o.vendor_id IN (SELECT v.id FROM vendors v WHERE v.profile_id = auth.uid())
  OR public.caller_is_operator();

COMMENT ON VIEW partner_offer_feed IS
  'Pre-acceptance partner payload. Runs as owner so the booking_requests join resolves; scoped by the WHERE clause to the caller''s own business. Carries no customer identity and no street address by construction.';

GRANT SELECT ON partner_offer_feed TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Check it as two different masters, not as the service role
-- ══════════════════════════════════════════════════════════════════════
--
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"<partner-A-profile>","role":"authenticated"}';
--   SELECT count(*) FROM partner_offer_feed;   -- only A's offers
--   SET LOCAL request.jwt.claims TO '{"sub":"<partner-B-profile>","role":"authenticated"}';
--   SELECT count(*) FROM partner_offer_feed;   -- only B's offers
--   RESET ROLE;
--
-- If those two counts are the same non-zero number, the WHERE clause is
-- not doing its job and every master can see every job.

COMMIT;
