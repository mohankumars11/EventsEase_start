-- ============================================================
-- 060 · dispatch_offers — the fan-out, and the one-winner rule
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057, 058 and 059 FIRST.
-- This migration also completes 059: it adds the `accepted_offer_id`
-- foreign key and the partner SELECT policy that 059 could not declare
-- because this table did not exist yet.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE ONE THING IN THIS SCHEMA THAT MUST NOT BE GOT WRONG
-- ══════════════════════════════════════════════════════════════════════
--
-- One line — "a decorator, Koramangala, 26 September" — is offered to
-- five partners at once. All five phones buzz. Two of them tap ACCEPT in
-- the same second, because that is what happens when five people are
-- looking at the same notification.
--
-- Exactly one must win. If both win, two decorators arrive at one
-- birthday, both are owed money, and the customer paid once. There is no
-- graceful recovery from that: somebody is told, after clearing their
-- Saturday, that the job they accepted was never theirs.
--
-- ── Why this is an index and not application code ────────────────────
-- The obvious implementation reads the line, checks nobody has it, and
-- writes. Between the read and the write is a window, and the window is
-- exactly where two concurrent accepts both pass the check. Making the
-- window smaller does not close it. `SELECT ... FOR UPDATE` closes it but
-- serialises every accept behind a row lock and needs every future writer
-- to remember the lock.
--
--   CREATE UNIQUE INDEX uq_offer_one_winner
--     ON dispatch_offers (line_id) WHERE status = 'ACCEPTED';
--
-- A partial unique index cannot be raced, cannot be forgotten by a future
-- caller, and does not serialise anything. Two simultaneous accepts
-- produce one committed row and one 23505, and `accept_offer()` turns the
-- 23505 into "this one just went" — which is the truth, and arrives in
-- milliseconds.
--
-- The same pattern already guards `customer_addresses.is_default` (049)
-- and `event_payments.gateway_payment_id` (046). This is the house's
-- answer to "exactly one", and it is the right one.
--
-- ── Append-only, because a declined offer is evidence ────────────────
-- Rows are never deleted. Who was asked, when, how far away they were,
-- what they were offered and whether they answered is the entire dataset
-- behind "why did this line not fill?" — which is the question §3 of the
-- plan says decides whether this business works. Deleting a decline to
-- keep the table tidy would delete the measurement.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dispatch_offers (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id   UUID NOT NULL REFERENCES booking_lines(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Which round of dispatch this was. Wave 1 goes to the nearest five
  -- inside the customer's radius; if none answer, wave 2 widens. Stored
  -- so "we had to go 15 km to fill a cook in Whitefield" is answerable —
  -- that is a supply gap with a location, which is the only kind that is
  -- actionable.
  wave      INTEGER NOT NULL DEFAULT 1 CHECK (wave BETWEEN 1 AND 10),

  -- Snapshotted at offer time, not joined at read time. The partner's
  -- base can move; how far they were from THIS job when they were asked
  -- is a fact about the dispatch, and it is what the accept-rate analysis
  -- is regressed against.
  distance_m INTEGER CHECK (distance_m IS NULL OR distance_m >= 0),

  -- What the partner was shown they would earn. Snapshotted for the same
  -- reason: the fee rate can change, and "you accepted ₹10,540" must
  -- still read ₹10,540 next quarter.
  partner_amount_paise INTEGER NOT NULL CHECK (partner_amount_paise > 0),

  -- OFFERED   sent, awaiting an answer
  -- ACCEPTED  won it — at most one per line, by the index below
  -- DECLINED  said no
  -- EXPIRED   never answered before the window closed
  -- LOST      somebody else accepted first
  --
  -- DECLINED and LOST are deliberately different. One is a partner who
  -- does not want this kind of work at this price; the other is a partner
  -- who did want it and was beaten. Collapsing them would make a healthy
  -- competitive market look like mass rejection, and the two call for
  -- opposite responses.
  status TEXT NOT NULL DEFAULT 'OFFERED'
         CHECK (status IN ('OFFERED','ACCEPTED','DECLINED','EXPIRED','LOST')),

  decline_reason TEXT,

  offered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  accepted_at  TIMESTAMPTZ
);

-- ══════════════════════════════════════════════════════════════════════
-- THE CONSTRAINT
-- ══════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_one_winner
  ON dispatch_offers (line_id) WHERE status = 'ACCEPTED';

-- One partner is asked about one line once per wave. Without this, a
-- retried dispatch call buzzes the same phone twice for the same job.
CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_one_per_partner_per_wave
  ON dispatch_offers (line_id, vendor_id, wave);

-- The partner's inbox: what is live for me, soonest to expire first.
CREATE INDEX IF NOT EXISTS idx_dispatch_offers_partner_live
  ON dispatch_offers (vendor_id, expires_at)
  WHERE status = 'OFFERED';

CREATE INDEX IF NOT EXISTS idx_dispatch_offers_line
  ON dispatch_offers (line_id, offered_at);

-- ── Complete 059 ─────────────────────────────────────────────────────
ALTER TABLE booking_lines DROP CONSTRAINT IF EXISTS booking_lines_accepted_offer_fk;
ALTER TABLE booking_lines ADD CONSTRAINT booking_lines_accepted_offer_fk
  FOREIGN KEY (accepted_offer_id) REFERENCES dispatch_offers(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "partners read offered lines" ON booking_lines;
CREATE POLICY "partners read offered lines"
  ON booking_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dispatch_offers o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.line_id = booking_lines.id AND v.profile_id = auth.uid()
  ));

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE dispatch_offers ENABLE ROW LEVEL SECURITY;

-- A partner reads their own offers and nobody else's. Critically, they
-- cannot read the OTHER offers on the same line: who else was asked, how
-- many, and how close they were is competitive information about the
-- network, and a partner who could see "I am one of five" would price and
-- respond differently to one who could see "I am the only one".
DROP POLICY IF EXISTS "partners read own offers" ON dispatch_offers;
CREATE POLICY "partners read own offers"
  ON dispatch_offers FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

-- Customers see the offers on their own lines — that is what drives
-- "3 masters notified" on the matching screen. They get the count and the
-- state; the partner's identity only becomes theirs to see on acceptance,
-- which the client enforces by joining only on ACCEPTED.
DROP POLICY IF EXISTS "customers read offers on own lines" ON dispatch_offers;
CREATE POLICY "customers read offers on own lines"
  ON dispatch_offers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM booking_lines l
    JOIN booking_requests r ON r.id = l.request_id
    WHERE l.id = line_id AND r.customer_id = auth.uid()
  ));

DROP POLICY IF EXISTS "admins read offers" ON dispatch_offers;
CREATE POLICY "admins read offers"
  ON dispatch_offers FOR SELECT
  USING (get_my_role() IN ('admin','event_coordinator'));

-- There is deliberately NO INSERT or UPDATE policy for anybody. Offers
-- are created by the dispatcher (service role) and answered through
-- `accept_offer()` / `decline_offer()` below, which are SECURITY DEFINER.
-- A partner who could UPDATE this table directly could write
-- status='ACCEPTED' onto somebody else's offer.

-- ══════════════════════════════════════════════════════════════════════
-- match_partners — who can actually do this job
-- ══════════════════════════════════════════════════════════════════════
--
-- In Postgres rather than in `api/`, because the alternative is SELECTing
-- every partner in the city into a serverless function to compute
-- haversine there. That is a full table scan per line per booking; this
-- is a GIST index lookup.
--
-- BOTH radii are honoured. The customer's `radius_km` says how far they
-- will look; the partner's `service_radius_km` (057) says how far they
-- will travel. A decorator 8 km away who only works within 5 km is not a
-- match, and offering them the job wastes the one thing dispatch is
-- short of: a partner's attention.
CREATE OR REPLACE FUNCTION public.match_partners(
  p_trade       TEXT,
  p_point       extensions.geography,
  p_radius_m    INTEGER,
  p_date        DATE,
  p_allow_synthetic BOOLEAN DEFAULT FALSE,
  p_limit       INTEGER DEFAULT 5,
  p_exclude     UUID[] DEFAULT '{}'
)
RETURNS TABLE (vendor_id UUID, distance_m INTEGER, rating NUMERIC)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    v.id,
    ST_Distance(v.location, p_point)::INTEGER AS distance_m,
    COALESCE(v.rating_avg, 0) AS rating
  FROM vendors v
  WHERE v.location IS NOT NULL
    AND v.is_verified = TRUE
    -- The synthetic guard. Default FALSE, so a caller that forgets the
    -- argument gets real partners only — the safe direction to fail.
    AND (p_allow_synthetic OR v.is_synthetic = FALSE)
    AND NOT (v.id = ANY(p_exclude))
    -- Inside the customer's reach…
    AND ST_DWithin(v.location, p_point, p_radius_m)
    -- …and inside the partner's own.
    AND ST_DWithin(v.location, p_point, v.service_radius_km * 1000)
    -- Does this trade at all.
    AND EXISTS (
      SELECT 1 FROM vendor_services s
      WHERE s.vendor_id = v.id AND s.category = p_trade AND s.is_active = TRUE
    )
    -- Not blocked that day. A partner with NO row for the date is
    -- available: `vendor_availability` (021) records exceptions, not a
    -- full calendar, and requiring a row would make every partner who has
    -- never opened the calendar undispatchable.
    AND NOT EXISTS (
      SELECT 1 FROM vendor_availability a
      WHERE a.vendor_id = v.id
        AND a.slot_date = p_date
        AND (a.status = 'BLOCKED'
             OR (a.status = 'LIMITED' AND a.slots_total IS NOT NULL
                 AND a.slots_booked >= a.slots_total))
    )
    -- Not already committed to another booking that day.
    AND NOT EXISTS (
      SELECT 1
      FROM dispatch_offers o
      JOIN booking_lines l  ON l.id = o.line_id
      JOIN booking_requests r ON r.id = l.request_id
      WHERE o.vendor_id = v.id
        AND o.status = 'ACCEPTED'
        AND r.event_date = p_date
        AND l.status NOT IN ('cancelled','expired')
    )
  -- Rating first, distance second. A 4.8 at 3 km beats a 4.1 at 900 m:
  -- this is somebody's daughter's birthday, not a dosa, and fifteen
  -- minutes of van time is worth far less than the difference between
  -- those two decorators.
  ORDER BY rating DESC, distance_m ASC
  LIMIT GREATEST(p_limit, 1)
$$;

COMMIT;
