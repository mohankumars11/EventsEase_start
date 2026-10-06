-- ============================================================
-- 058 · booking_requests — the container for one instant booking
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057 FIRST — this table
-- stores a geography point and will not create without PostGIS.
-- Apply 059 immediately after: this table is meaningless alone.
--
-- ── What this is, and the thing it deliberately is NOT ───────────────
-- A customer says: "Birthday, 26th September, Koramangala, and I need a
-- decorator, a cake, a photographer, a cook and a dhol troupe."
--
-- That sentence is ONE row here and FIVE rows in `booking_lines` (059).
-- This row holds only what all five have in common — the date, the place,
-- the radius, the occasion.
--
-- It is a CONTAINER, NOT A UNIT OF SALE. It is never "paid", never
-- "confirmed", never "delivered". It has no money on it, no partner, no
-- escrow, and no status beyond whether it is still open.
--
-- ── Why that restraint is the whole design ───────────────────────────
-- The obvious schema puts a status and a total on this row, and it breaks
-- on the first real booking. All five services filling is roughly a coin
-- flip: at a 90% per-service fill rate, five-for-five happens 59% of the
-- time, and ten-for-ten happens 35%. So "the booking" is USUALLY partly
-- filled, and a status column on this row would have to describe five
-- different truths with one word.
--
-- Worse, it would couple them. A booking-level `paid` means the customer
-- cannot pay the decorator who accepted until the dhol troupe — which may
-- never accept — does too. A booking-level `cancelled` cascades a dropped
-- dhol into a cancelled photographer. Every one of those is a real
-- outcome the business has to survive, and each is trivial if the line is
-- the unit and impossible if this row is.
--
-- So: the line is the unit of sale, of payment, of escrow, of dispute and
-- of cancellation. This row is the sentence the customer said.
--
-- ── `policy_version` is stamped here and again on every line ─────────
-- Here it records the terms shown at the moment of asking. Each line
-- re-stamps at ACCEPT (059), because lines accepted three days apart may
-- genuinely sit under different terms, and the ladder must be read
-- against the version the customer actually agreed to. Same reasoning as
-- `return_requests.policy_version` in 039.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS booking_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Which celebration this is. Matches an `id` in data/eventServicesData.js
  -- (`birthday`, `housewarming`, …) — a catalogue slug, not a foreign key,
  -- for the same reason `service_enquiries.event_id` is TEXT: the occasion
  -- catalogue is code, versioned with the app, and a FK to a table that
  -- does not hold it would be a lie about where the list lives.
  occasion_id   TEXT NOT NULL,
  occasion_name TEXT NOT NULL,

  -- ── When ──────────────────────────────────────────────────────────
  -- DATE, not TIMESTAMPTZ. A decorator is booked for the 26th, not for
  -- 14:30 on the 26th, and `vendor_availability` (021) is already keyed
  -- by `slot_date DATE` with one row per partner per day. A timestamp
  -- here would need a timezone conversion to compare against that, and
  -- the conversion is where a booking lands on the wrong day.
  event_date   DATE NOT NULL,

  -- Optional, and free text. "Evening", "after 4pm", "morning muhurta" —
  -- this is for the partner to read, not for the matcher to parse.
  time_note    TEXT,

  -- ── Where ─────────────────────────────────────────────────────────
  -- The point dispatch measures from. Denormalised from
  -- `customer_addresses` rather than referenced, because an address can
  -- be edited or deleted after a booking and the booking must still know
  -- where it was for. A FK here would let a customer silently move a
  -- confirmed event across the city.
  location     extensions.geography(Point,4326) NOT NULL,
  address_text TEXT NOT NULL,
  city         TEXT NOT NULL,

  -- ── The masked location, and why it is a stored column ────────────
  -- "Koramangala 5th Block" — what a master is shown BEFORE they accept
  -- and before anybody has paid. `address_text` carries the flat number
  -- and the landmark and is never shown to a partner until the line is
  -- paid (see 068).
  --
  -- Stored rather than derived at read time, because deriving it means
  -- some query somewhere selects `address_text` in order to truncate it,
  -- and the full address then exists in a response that was supposed to
  -- be masked. The safe design is that the masked value is a different
  -- column the partner-facing view can select on its own.
  area_label   TEXT NOT NULL,

  -- How far the customer is willing to look. Theirs; the partner's own
  -- `service_radius_km` (057) is the other half, and dispatch satisfies
  -- both. Capped at 25 because beyond that a "nearby master" is a
  -- two-hour drive and the promise stops being true.
  radius_km    INTEGER NOT NULL DEFAULT 5 CHECK (radius_km BETWEEN 1 AND 25),

  -- ── Scale, carried once ───────────────────────────────────────────
  -- Every line prices against it — a decorator's setup, a cook's plate
  -- count and a photographer's hours all move with headcount — so it
  -- lives here rather than being copied onto five lines that could
  -- disagree.
  guest_count  INTEGER CHECK (guest_count IS NULL OR guest_count BETWEEN 1 AND 5000),

  -- ── Status: three values, and none of them is about money ─────────
  -- open      at least one line is still live
  -- closed    every line reached a terminal state, however it got there
  -- cancelled the customer abandoned the whole thing before paying
  --
  -- Deliberately NOT `partially_filled` / `filled` / `paid`. Those are
  -- statements about lines, they are computed from lines, and storing
  -- them here is storing a summary that can disagree with what it
  -- summarises. See the header.
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','closed','cancelled')),

  policy_version TEXT NOT NULL,

  -- What the customer typed that belongs to no single service — "it's for
  -- my mother's 60th, she doesn't know yet". Per-service notes live on
  -- the line, beside the service they are about, exactly as
  -- components/journey/CustomRequest.jsx already does it.
  notes        TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Nobody books yesterday ───────────────────────────────────────────
-- A past date reaches dispatch, matches partners whose availability rows
-- do not exist for it, fills nothing, and looks like a broken matcher
-- rather than a bad input. Rejecting it at the boundary makes it a
-- form error, which is what it is.
ALTER TABLE booking_requests DROP CONSTRAINT IF EXISTS booking_requests_date_not_past;
ALTER TABLE booking_requests ADD CONSTRAINT booking_requests_date_not_past
  CHECK (event_date >= DATE '2026-01-01');

CREATE INDEX IF NOT EXISTS idx_booking_requests_customer
  ON booking_requests (customer_id, created_at DESC);

-- The admin dispatch monitor's query: what is live, soonest first.
CREATE INDEX IF NOT EXISTS idx_booking_requests_open
  ON booking_requests (event_date, created_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_booking_requests_location
  ON booking_requests USING GIST (location);

DROP TRIGGER IF EXISTS booking_requests_updated_at ON booking_requests;
CREATE TRIGGER booking_requests_updated_at
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers manage own booking requests" ON booking_requests;
CREATE POLICY "customers manage own booking requests"
  ON booking_requests FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Partners are NOT given a policy here, and that is deliberate. A partner
-- sees the job through `dispatch_offers` (060) — the one line offered to
-- them, on the date and at the distance they need to decide. They have no
-- business reading the customer's other four services, their headcount,
-- their notes or their full address before they have accepted anything.
-- A SELECT policy on this table for partners would leak all of it.

DROP POLICY IF EXISTS "admins read booking requests" ON booking_requests;
CREATE POLICY "admins read booking requests"
  ON booking_requests FOR SELECT
  USING (get_my_role() IN ('admin','event_coordinator'));

DROP POLICY IF EXISTS "admins update booking requests" ON booking_requests;
CREATE POLICY "admins update booking requests"
  ON booking_requests FOR UPDATE
  USING (get_my_role() IN ('admin','event_coordinator'));

COMMIT;
