-- ============================================================
-- 059 · booking_lines — one requested service, and the unit of everything
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 058 FIRST.
-- 060 adds the `accepted_offer_id` foreign key; it cannot be declared here
-- because `dispatch_offers` does not exist yet and references this table.
--
-- ── This row is the product ──────────────────────────────────────────
-- A customer asks for five services. That is one `booking_requests` row
-- and five of these, and from here on the REQUEST barely matters. This
-- row is what gets dispatched, accepted, priced, paid, held in escrow,
-- delivered, rated, disputed, refunded and settled.
--
-- Every one of those verbs is per line, and the reason is the same each
-- time: services fill independently, so they must fail independently.
-- The decorator accepting must not wait on the dhol troupe. The dhol
-- troupe never accepting must not strand the decorator's payout. A
-- dispute about the cake must not freeze the photographer's money.
--
-- Any of those coupled together is a support call the business cannot
-- answer, and all three are free if the line is the unit.
--
-- ── The lifecycle ────────────────────────────────────────────────────
--   pending      created, not yet dispatched
--   dispatching  offers are out, nobody has accepted
--   accepted     a partner took it — but NO money has moved
--   paid         escrow holds the money for THIS line
--   in_progress  the day arrived
--   delivered    the partner says it is done
--   settled      escrow released, T+24h, no dispute
--
--   expired      nobody accepted before the window closed
--   cancelled    dropped, by either side, under the ladder in policies.js
--   disputed     frozen until resolved; releases nothing
--
-- ── `accepted` and `paid` are two states on purpose ──────────────────
-- The gap between them is where the business either keeps its partners or
-- loses them. A partner who is told "you're confirmed" and clears their
-- Saturday for a booking the customer never paid for has lost a trading
-- day to us, and will not answer the second notification.
--
-- So acceptance is provisional and says so, and the partner app is told
-- CONFIRMED only when this row reaches `paid`. That is enforced by the
-- release rules in 060/061 rather than by remembering to word a
-- notification carefully.
--
-- ── Money is written here by the SERVER, never by the browser ────────
-- `quoted_amount` is computed from utils/quote against the occasion, the
-- headcount and the service, and written by `api/dispatch-booking.js`.
-- The client sends selections; it never sends a number. A client that
-- could name its own amount could name ₹1, and this is the row a Razorpay
-- order is priced from — see the same rule stated at length in
-- api/create-milestone-payment.js.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS booking_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,

  -- ── What was asked for ────────────────────────────────────────────
  -- `service_id` matches an SVC key in data/eventServicesData.js
  -- (`decor`, `cake`, `photography`, …). `service_name` is snapshotted
  -- so a catalogue rename cannot rewrite what somebody booked.
  service_id   TEXT NOT NULL,
  service_name TEXT NOT NULL,

  -- The trade to dispatch to — a value from VENDOR_CATEGORIES in
  -- config/vendor.js, which is what a BUSINESS calls itself, as opposed
  -- to how a customer shops. `decor` and `floral` are two customer
  -- choices and one trade ("Decoration & Floral"); dispatching on the
  -- customer's word would find nobody.
  trade        TEXT NOT NULL,

  -- ── standard | discuss ────────────────────────────────────────────
  -- Snapshotted from the catalogue's `spec` field at booking time.
  -- `discuss` means the price covers a standard setup at this scale and
  -- the detail is agreed on the partner's first call — the customer was
  -- shown that sentence before paying, and this is the record that they
  -- were. It decides what the partner app shows and what the receipt says.
  spec_mode    TEXT NOT NULL DEFAULT 'standard'
               CHECK (spec_mode IN ('standard','discuss')),

  -- What the customer added for THIS service, beside this service.
  -- Not one "anything else?" box at the end — a sentence about the cake
  -- belongs with the cake so the partner sourcing the cake reads it
  -- without hunting. components/journey/CustomRequest.jsx already works
  -- exactly this way for the concierge flow.
  customer_note TEXT,
  reference_photo_url TEXT,

  -- ── Money ─────────────────────────────────────────────────────────
  -- Paise, as INTEGER. Never NUMERIC and never rupees-as-float: this
  -- number is handed to Razorpay, which takes paise as an integer, and a
  -- float that has been through JSON is a rounding error waiting to be
  -- somebody's refund. `orders` predates this rule; new money columns do
  -- not have to repeat it.
  quoted_amount_paise INTEGER NOT NULL CHECK (quoted_amount_paise > 0),

  -- The platform's cut, snapshotted as a RATE and an AMOUNT. Both,
  -- deliberately: the rate is what the partner agreed to and the amount
  -- is what was actually taken, and re-deriving one from the other after
  -- a pricing change would silently restate a settled payout.
  platform_fee_rate   NUMERIC(5,4) NOT NULL DEFAULT 0.15
                      CHECK (platform_fee_rate BETWEEN 0 AND 0.5),
  platform_fee_paise  INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee_paise >= 0),
  partner_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (partner_amount_paise >= 0),

  -- ── What this price was based on, frozen at quote time ────────────
  -- The customer is told, on the screen where they pay, what backs the
  -- number: which cost components moved, against which index, read on
  -- which date. Rates move afterwards. A receipt that re-derives the
  -- basis from TODAY's index would tell somebody their February booking
  -- was priced against August mandi rates.
  --
  -- So the basis is snapshotted here, as data/marketRates.js reported it
  -- at the moment of quoting: { asOf, multipliers, tracked, source }.
  -- `asOf: null` is the honest answer when the index has never been
  -- refreshed, and the disclosure component prints the baseline wording
  -- for it rather than claiming a live read that did not happen.
  price_basis JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- ── Lifecycle ─────────────────────────────────────────────────────
  status TEXT NOT NULL DEFAULT 'pending'
         CHECK (status IN ('pending','dispatching','accepted','paid',
                           'in_progress','delivered','settled',
                           'expired','cancelled','disputed')),

  -- Points at the winning row in `dispatch_offers`. The FK is added in
  -- 060 (that table does not exist yet, and it references this one).
  --
  -- This is a POINTER, not a copy of the fact. The fact that exactly one
  -- partner won lives in `uq_offer_one_winner` — the partial unique index
  -- in 060 — and is enforced there. Storing `vendor_id` here instead
  -- would be a second copy of that fact, free to disagree with it.
  accepted_offer_id UUID,

  -- Written by the DISPATCHER (server side, from the constant in
  -- config/policies.js), not inherited from the request and not supplied
  -- at accept.
  --
  -- Not at accept, because accept is called by the PARTNER, and a value
  -- the partner names is a value the partner could name wrongly — the
  -- cancellation ladder is read against this, so it decides what a
  -- customer is refunded. It must never be client-supplied.
  --
  -- Not from the request either, because a line re-dispatched in a later
  -- wave — hours later, possibly under revised terms — re-stamps at that
  -- point. Lines on one booking can therefore legitimately differ.
  policy_version TEXT,

  dispatched_at TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  settled_at    TIMESTAMPTZ,

  -- When the offer window closes and this line gives up on its current
  -- wave. `api/dispatch-booking.js` widens the radius and re-dispatches
  -- rather than expiring on the first miss.
  expires_at    TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── The same service, once per booking ───────────────────────────────
-- Two `decor` lines on one birthday is a double-tap in the UI, not an
-- intention, and it would dispatch twice and charge twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_lines_service
  ON booking_lines (request_id, service_id);

-- ── The arithmetic has to close ──────────────────────────────────────
-- Fee plus partner share equals the quote, to the paise. Without this a
-- rounding choice in JavaScript becomes a partner underpaid by ₹0.40 on
-- every booking, which nobody notices until a partner adds up a month.
ALTER TABLE booking_lines DROP CONSTRAINT IF EXISTS booking_lines_split_balances;
ALTER TABLE booking_lines ADD CONSTRAINT booking_lines_split_balances
  CHECK (
    status IN ('pending','dispatching','expired','cancelled')
    OR platform_fee_paise + partner_amount_paise = quoted_amount_paise
  );

-- ── A line past `accepted` must know who accepted it ─────────────────
-- Reaching `paid` with no offer behind it means money is held for a
-- partner nobody can name.
ALTER TABLE booking_lines DROP CONSTRAINT IF EXISTS booking_lines_accepted_has_offer;
ALTER TABLE booking_lines ADD CONSTRAINT booking_lines_accepted_has_offer
  CHECK (
    status NOT IN ('accepted','paid','in_progress','delivered','settled')
    OR (accepted_offer_id IS NOT NULL AND accepted_at IS NOT NULL)
  );

-- ── Money moved means a time it moved ────────────────────────────────
ALTER TABLE booking_lines DROP CONSTRAINT IF EXISTS booking_lines_paid_has_timestamp;
ALTER TABLE booking_lines ADD CONSTRAINT booking_lines_paid_has_timestamp
  CHECK (
    status NOT IN ('paid','in_progress','delivered','settled')
    OR paid_at IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_booking_lines_request
  ON booking_lines (request_id, created_at);

-- The dispatcher's queue: lines still hunting, oldest first.
CREATE INDEX IF NOT EXISTS idx_booking_lines_hunting
  ON booking_lines (expires_at)
  WHERE status IN ('pending','dispatching');

-- The escrow cron's queue: delivered, unsettled, ready at T+24h.
CREATE INDEX IF NOT EXISTS idx_booking_lines_releasable
  ON booking_lines (delivered_at)
  WHERE status = 'delivered';

DROP TRIGGER IF EXISTS booking_lines_updated_at ON booking_lines;
CREATE TRIGGER booking_lines_updated_at
  BEFORE UPDATE ON booking_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE booking_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers read own booking lines" ON booking_lines;
CREATE POLICY "customers read own booking lines"
  ON booking_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM booking_requests r
    WHERE r.id = request_id AND r.customer_id = auth.uid()
  ));

-- Customers INSERT their lines while building the basket. They may not
-- UPDATE them: every transition after that is money or a partner's
-- commitment, and both are written by SECURITY DEFINER functions and the
-- payment webhook. A customer who could UPDATE this row could set their
-- own line to `paid`.
DROP POLICY IF EXISTS "customers create own booking lines" ON booking_lines;
CREATE POLICY "customers create own booking lines"
  ON booking_lines FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM booking_requests r
    WHERE r.id = request_id AND r.customer_id = auth.uid() AND r.status = 'open'
  ));

-- A partner reads a line only once they hold an offer on it — that policy
-- is created in 060, NOT here, because it has to reference
-- `dispatch_offers` and that table does not exist yet. A policy naming a
-- missing table fails at CREATE, which would strand this whole migration
-- on a fresh database.
--
-- Until 060 is applied, partners cannot see any line at all. That is the
-- correct interim state: with no offers in existence there is nothing a
-- partner is entitled to read.

DROP POLICY IF EXISTS "admins read booking lines" ON booking_lines;
CREATE POLICY "admins read booking lines"
  ON booking_lines FOR SELECT
  USING (get_my_role() IN ('admin','event_coordinator'));

DROP POLICY IF EXISTS "admins update booking lines" ON booking_lines;
CREATE POLICY "admins update booking lines"
  ON booking_lines FOR UPDATE
  USING (get_my_role() IN ('admin','event_coordinator'));

COMMIT;
