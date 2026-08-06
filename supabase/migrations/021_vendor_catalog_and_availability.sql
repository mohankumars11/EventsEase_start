-- ============================================================
-- Migration 021: The vendor's own list, and when they can serve it.
--
-- Sambramo's vendor side has been read-only since launch: a partner could
-- create an account and then had no way to say what they sell, what it
-- costs, or which dates they are already booked. Every one of those facts
-- lived in a coordinator's WhatsApp history, which is fine for ten vendors
-- and impossible at a hundred.
--
-- Three things happen here.
--
--   1. The columns `VendorOnboarding` has been writing all along but which
--      no migration ever created. This is not a nice-to-have: the onboarding
--      form upserts pincode, years_experience, starting_price, service_areas,
--      website_url and instagram_url, PostgREST rejects the whole row for the
--      unknown columns, and the vendor sees "Failed to save. Please try
--      again." forever. Vendor signup has been broken end to end.
--
--   2. `vendor_services` — the vendor's price list. One row per thing they
--      sell, priced against a unit (per plate, per hour, per event) with a
--      minimum order and a notice period, because "₹400" means nothing to a
--      coordinator matching a 200-guest wedding without knowing 400 of what.
--
--   3. `vendor_availability` — one row per date the vendor wants treated
--      differently from their normal week.
--
-- On the availability model: a vendor is AVAILABLE by default and marks the
-- exceptions. The alternative — nobody is bookable until they fill in a
-- calendar — means a partner who onboards and stops reading email silently
-- disappears from every search, and the platform gets quieter the longer it
-- runs. Blocked dates, a weekly day off and a notice period express real
-- availability with a handful of taps; an opt-in calendar needs 365.
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================

-- ── 1. vendors: the columns onboarding already writes ────────────────
-- ADD COLUMN IF NOT EXISTS so this is a no-op on any database where an
-- earlier hand-run patch already added them.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pincode          TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS starting_price   INTEGER;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_areas    TEXT[] DEFAULT '{}';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website_url      TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS instagram_url    TEXT;

-- ── 2. vendors: the booking rules that make a list matchable ────────
--
-- These four answer the questions a coordinator asks before putting a
-- vendor in front of a customer, and they are cheap for the vendor to set
-- once instead of being re-answered per enquiry.
--
--   accepting_bookings  the master switch. A vendor going on holiday or
--                       closing their books for a season needs one control,
--                       not 90 blocked dates.
--   lead_time_days      shortest notice they can take. A cake needs two
--                       days; a marquee needs a week. Without this the
--                       calendar says "free tomorrow" and the vendor has to
--                       decline by phone, which reads as unreliability.
--   max_events_per_day  capacity, not just open/closed. A caterer doing two
--                       weddings on one Saturday is normal; a solo
--                       photographer doing two is a double-booking.
--   weekly_days_off     the recurring closure (0 = Sunday … 6 = Saturday),
--                       so a Monday-closed studio is one setting rather than
--                       52 rows a year.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS accepting_bookings BOOLEAN     NOT NULL DEFAULT TRUE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS lead_time_days     INTEGER     NOT NULL DEFAULT 2;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS max_events_per_day INTEGER     NOT NULL DEFAULT 1;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS weekly_days_off    SMALLINT[]  NOT NULL DEFAULT '{}';

-- Guard the two numeric ones. A negative notice period or a zero daily
-- capacity would silently make a vendor unbookable, and the vendor would
-- have no way to tell that from "no enquiries yet".
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_lead_time_days_sane') THEN
    ALTER TABLE vendors ADD CONSTRAINT vendors_lead_time_days_sane
      CHECK (lead_time_days >= 0 AND lead_time_days <= 365);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_max_events_per_day_sane') THEN
    ALTER TABLE vendors ADD CONSTRAINT vendors_max_events_per_day_sane
      CHECK (max_events_per_day >= 1 AND max_events_per_day <= 50);
  END IF;
END;
$$;

-- ── 3. vendor_services — the vendor's price list ─────────────────────
CREATE TABLE IF NOT EXISTS vendor_services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT,
  description  TEXT,
  -- Price is nullable on purpose. "Quote on request" is a legitimate answer
  -- for a bespoke marquee build, and forcing a number would get a made-up
  -- one — worse than an honest blank, because a coordinator would quote it.
  price        NUMERIC,
  -- What the price buys. Rendered next to every number in the app, so a
  -- coordinator reading a list can multiply it by something real.
  unit         TEXT    NOT NULL DEFAULT 'per event',
  min_quantity INTEGER NOT NULL DEFAULT 1,
  -- Per-item override of the vendor's own lead_time_days: a baker who needs
  -- two days for cupcakes and ten for a tiered wedding cake. NULL inherits.
  lead_time_days INTEGER,
  -- Off, not deleted. A seasonal item (mango cake, Diwali hamper) comes back
  -- next year, and a vendor who has to delete and retype it will retype it
  -- differently — the price list drifts and the history is gone.
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vendor_services_price_sane        CHECK (price IS NULL OR price >= 0),
  CONSTRAINT vendor_services_min_quantity_sane CHECK (min_quantity >= 1),
  CONSTRAINT vendor_services_lead_time_sane    CHECK (lead_time_days IS NULL OR (lead_time_days >= 0 AND lead_time_days <= 365))
);

CREATE INDEX IF NOT EXISTS idx_vendor_services_vendor ON vendor_services (vendor_id, sort_order);

-- ── 4. vendor_availability — one row per exceptional date ────────────
CREATE TABLE IF NOT EXISTS vendor_availability (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  slot_date  DATE NOT NULL,
  -- BLOCKED  not available at all
  -- LIMITED  can take work but less than usual (slots_total says how much)
  -- OPEN     explicitly open — the escape hatch for working a day that
  --          weekly_days_off would otherwise close, e.g. a Sunday wedding.
  status     TEXT NOT NULL DEFAULT 'BLOCKED'
             CHECK (status IN ('BLOCKED', 'LIMITED', 'OPEN')),
  slots_total  INTEGER,
  slots_booked INTEGER NOT NULL DEFAULT 0,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One row per vendor per day, which is also what lets the dashboard use a
  -- single upsert on (vendor_id, slot_date) as a date is tapped rather than
  -- read-then-insert-or-update and race itself on a slow connection.
  CONSTRAINT vendor_availability_one_per_day UNIQUE (vendor_id, slot_date),
  CONSTRAINT vendor_availability_slots_sane
    CHECK (slots_total IS NULL OR (slots_total >= 0 AND slots_booked >= 0 AND slots_booked <= slots_total))
);

CREATE INDEX IF NOT EXISTS idx_vendor_availability_lookup
  ON vendor_availability (vendor_id, slot_date);

-- Coordinators search the other way round — "who is free on the 14th?" —
-- so the date needs to lead an index of its own.
CREATE INDEX IF NOT EXISTS idx_vendor_availability_by_date
  ON vendor_availability (slot_date, status);

-- ── 5. updated_at triggers ───────────────────────────────────────────
-- update_updated_at() is defined in migration 005.
DROP TRIGGER IF EXISTS trg_vendor_services_updated_at ON vendor_services;
CREATE TRIGGER trg_vendor_services_updated_at
  BEFORE UPDATE ON vendor_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_vendor_availability_updated_at ON vendor_availability;
CREATE TRIGGER trg_vendor_availability_updated_at
  BEFORE UPDATE ON vendor_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. RLS ───────────────────────────────────────────────────────────
--
-- Same shape as vendor_photos in migration 001 (vendor owns rows reachable
-- through their own vendors row) and the same get_my_role() admin check as
-- migration 006 — a bare `EXISTS (SELECT … FROM profiles …)` here would
-- reintroduce exactly the recursion 006 was written to remove.
--
-- DROP before each CREATE so the file is re-runnable; CREATE POLICY has no
-- IF NOT EXISTS, and migration 020 documents what a half-applied policy
-- file costs you.
ALTER TABLE vendor_services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_availability ENABLE ROW LEVEL SECURITY;

-- The vendor's own rows: full control.
DROP POLICY IF EXISTS "vendor_manages_own_services" ON vendor_services;
CREATE POLICY "vendor_manages_own_services" ON vendor_services FOR ALL
  USING      (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "vendor_manages_own_availability" ON vendor_availability;
CREATE POLICY "vendor_manages_own_availability" ON vendor_availability FOR ALL
  USING      (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

-- Coordinators: everything, both tables. Sourcing a vendor for an event is
-- the entire point of this data existing.
DROP POLICY IF EXISTS "admins_all_vendor_services" ON vendor_services;
CREATE POLICY "admins_all_vendor_services" ON vendor_services FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "admins_all_vendor_availability" ON vendor_availability;
CREATE POLICY "admins_all_vendor_availability" ON vendor_availability FOR ALL
  USING (get_my_role() IN ('admin', 'event_coordinator'));

-- Public read, but narrowed twice: only active items, and only from vendors
-- who passed review. `vendors` itself is world-readable (migration 001), so
-- without the status test a rejected or suspended partner's price list would
-- stay live on the site after the account stopped being one.
DROP POLICY IF EXISTS "public_reads_approved_vendor_services" ON vendor_services;
CREATE POLICY "public_reads_approved_vendor_services" ON vendor_services FOR SELECT
  USING (
    is_active
    AND vendor_id IN (SELECT id FROM vendors WHERE status = 'APPROVED')
  );

DROP POLICY IF EXISTS "public_reads_approved_vendor_availability" ON vendor_availability;
CREATE POLICY "public_reads_approved_vendor_availability" ON vendor_availability FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE status = 'APPROVED'));
