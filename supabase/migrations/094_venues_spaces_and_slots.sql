-- ══════════════════════════════════════════════════════════════════════
-- 094 · A venue is a place, not a service
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057 and 021 first.
-- Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT IS WRONG TODAY
-- ══════════════════════════════════════════════════════════════════════
--
-- `venue` is one more trade in TRADE_FOR_SERVICE and a Rs 60,000 row in
-- servicePricing.js. So a banquet hall is dispatched exactly like a
-- decorator: matched by a radius from the customer, filtered against
-- `vendor_availability`.
--
-- Both halves of that are wrong, and they fail in opposite directions.
--
-- ── Radius is the wrong filter ──────────────────────────────────────
--
-- A customer in Indiranagar will happily book a hall in Yelahanka for a
-- wedding. The venue is the ONE service people travel across the city
-- for, and it is the one we currently hide behind a 10 km radius. Every
-- hall outside that circle is invisible to somebody who would have
-- booked it.
--
-- ── One row per vendor per day cannot describe a hotel ───────────────
--
-- `vendor_availability` has UNIQUE (vendor_id, slot_date). A property
-- with a boardroom, a cluster banquet and a grand ballroom gets ONE row
-- for the 14th. It cannot say the ballroom is gone and the boardroom is
-- free. That single sentence is the entire product a venue manager is
-- being asked to sign up for, and the schema has no way to write it.
--
-- ══════════════════════════════════════════════════════════════════════
-- FOUR TABLES, BECAUSE THERE ARE FOUR DIFFERENT THINGS
-- ══════════════════════════════════════════════════════════════════════
--
--   venues          the physical place. Exists whether or not anybody
--                   has claimed it, because we seed it from OSM before
--                   the owner has ever heard of Sambramo.
--   venue_spaces    the bookable unit. One row per hall.
--   venue_slots     the calendar, keyed to the SPACE and to a session.
--   venue_managers  who may edit it. A junction, not a column.
--
-- A `venue_id` column on `vendors` would have collapsed all four. The
-- relationships are genuinely many-to-many: one hotel group manages
-- several properties, one property has several halls, and one hall's
-- calendar for one session is the thing that is actually sold.
--
-- ── Why sessions and not days ───────────────────────────────────────
--
-- A kalyana mantapa routinely runs a morning wedding and an evening
-- reception, and they are separate bookings at separate prices. A
-- day-granularity calendar refuses the second one. That is not a missing
-- feature, it is taking half the revenue off a venue that was willing to
-- list with us.

BEGIN;

-- ── 1 · venues ───────────────────────────────────────────────────────
--
-- Seeded from OpenStreetMap before anybody claims it, which is why every
-- identifying column is nullable and `status` starts at 'unclaimed'. The
-- row is a fact about Bengaluru; the claim is a fact about a partner.

CREATE TABLE IF NOT EXISTS public.venues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  -- Seven kinds, matching Layer 1 of the service matrix. TEXT with a
  -- CHECK rather than an enum: adding a kind to an enum needs an ALTER
  -- TYPE that cannot run inside a transaction with other DDL, and this
  -- list will grow.
  venue_kind    TEXT NOT NULL DEFAULT 'hall'
                CHECK (venue_kind IN (
                  'mantapa',      -- kalyana mantapa / choultry
                  'convention',   -- convention centre, exhibition hall
                  'hotel',        -- star hotel banquet
                  'lawn',         -- open-air lawn, party plot, farmhouse
                  'rooftop',      -- rooftop lounge, restaurant party zone
                  'resort',       -- weekend getaway property
                  'clubhouse',    -- gated community, institutional auditorium
                  'hall'          -- unclassified; what OSM usually gives us
                )),

  -- ── Why lat/lng AND location ────────────────────────────────────
  --
  -- PostgREST cannot write a geography column: there is no JSON form of
  -- a Point it accepts, so every seeded and partner-added venue would
  -- land with a NULL location and silently never appear in a search.
  --
  -- The first fix was a SECURITY DEFINER RPC to set it. That works for
  -- the seeder, which runs as service_role, and fails for the partner
  -- dropping a pin on the venue they just proposed -- they are
  -- `authenticated`, and granting them a function that can move any hall
  -- in Bengaluru to fix it is the wrong trade.
  --
  -- So the writable truth is two ordinary numbers, and `location` is
  -- derived from them by trigger. Anyone who may write the row may write
  -- its position, RLS already says who that is, and there is exactly one
  -- place the geography is computed.
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  location      extensions.geography(Point,4326),
  area_label    TEXT,          -- matches data/bengaluruAreas.js names
  pincode       TEXT,          -- only when OSM actually carries one
  address_line  TEXT,

  -- Where the row came from, kept forever. A partner-added venue and an
  -- OSM-seeded one need different trust, and once they are mixed in one
  -- table the only way to tell them apart is to have written it down.
  source        TEXT NOT NULL DEFAULT 'partner'
                CHECK (source IN ('osm', 'partner', 'admin')),
  osm_id        TEXT,

  -- unclaimed      seeded, nobody manages it. Not bookable.
  -- pending_review a partner added it; an operator has not looked yet.
  -- claimed        a manager owns it and its calendar is live.
  -- rejected       an operator said no. Kept, so it is not re-proposed.
  status        TEXT NOT NULL DEFAULT 'unclaimed'
                CHECK (status IN ('unclaimed', 'pending_review', 'claimed', 'rejected')),

  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Re-running the OSM seed must not duplicate Bengaluru.
--
-- NOT partial, and 097 exists because the first cut was. ON CONFLICT
-- cannot infer a partial index from a bare column list, so the seeder
-- could not write a single row. The predicate was also unnecessary:
-- NULL is not equal to NULL, so a plain UNIQUE already permits any
-- number of partner-added venues with no osm_id.
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS uq_venues_osm;
ALTER TABLE public.venues ADD CONSTRAINT uq_venues_osm UNIQUE (osm_id);

-- The duplicate guard that matters more.
--
-- The whole reason a venue is picked from a dropdown rather than typed is
-- that "Taj West End" and "The Taj West End, Bangalore" must not become
-- two venues. But a dropdown that FILLS with duplicates is no better than
-- the text box it replaced, and the way duplicates get in is two managers
-- at one property each adding it from their own account.
--
-- Rounding to 4 decimal places is about 11 metres. Two rows that close
-- with the same name are the same building.
CREATE UNIQUE INDEX IF NOT EXISTS uq_venues_name_spot
  ON public.venues (lower(btrim(name)), round(lat::numeric, 4), round(lng::numeric, 4))
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_venues_location
  ON public.venues USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_venues_area
  ON public.venues (area_label, status);

COMMENT ON TABLE public.venues IS
  'Physical places. Seeded from OSM as unclaimed; a partner claims one.';

-- ── 2 · venue_spaces ─────────────────────────────────────────────────
--
-- The bookable unit. A venue with one hall has one row here, which is
-- the common case and costs a join -- worth it, because the moment a
-- hotel signs up the alternative is a schema migration under load.

CREATE TABLE IF NOT EXISTS public.venue_spaces (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  space_name        TEXT NOT NULL,

  -- Two capacities, because they are different numbers and customers ask
  -- with the wrong one. A hall that seats 300 for a banana-leaf lunch
  -- takes 800 standing at a reception, and quoting one figure for both
  -- is how a customer arrives to a room that does not fit their guests.
  floating_capacity INTEGER,
  seated_capacity   INTEGER,

  is_ac             BOOLEAN,
  has_stage         BOOLEAN,
  floor_type        TEXT,

  -- Everything else from the Layer 1 checkboxes. JSONB rather than forty
  -- columns: the option list is UI data that changes with the product,
  -- and a schema migration per checkbox would mean the form can never be
  -- edited without a database change.
  --
  -- The rule this must hold to stay honest: nothing in here is ever
  -- matched on by dispatch. Anything that decides WHO GETS A JOB gets a
  -- real column and an index. JSONB is for description, not for routing.
  attributes        JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT venue_spaces_capacity_sane
    CHECK ((floating_capacity IS NULL OR floating_capacity > 0)
       AND (seated_capacity   IS NULL OR seated_capacity   > 0)),
  CONSTRAINT venue_spaces_one_name_per_venue UNIQUE (venue_id, space_name)
);

CREATE INDEX IF NOT EXISTS idx_venue_spaces_venue
  ON public.venue_spaces (venue_id, sort_order);
-- Customers filter on "will it fit my guests" before anything else.
CREATE INDEX IF NOT EXISTS idx_venue_spaces_capacity
  ON public.venue_spaces (floating_capacity) WHERE is_active = TRUE;

-- ── 3 · venue_slots ──────────────────────────────────────────────────
--
-- The live calendar. Keyed to the space and the session, which is the
-- whole reason this table exists rather than reusing
-- vendor_availability.
--
-- Exceptions, not a full calendar -- the same choice 021 made and for the
-- same reason: a space with no row for a date is AVAILABLE. Requiring a
-- row would make every venue that has never opened the calendar
-- invisible, which is the opposite of what a newly signed venue needs.

CREATE TABLE IF NOT EXISTS public.venue_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id        UUID NOT NULL REFERENCES public.venue_spaces(id) ON DELETE CASCADE,
  slot_date       DATE NOT NULL,

  -- 'full_day' is not a third session, it is both of them. Enforced in
  -- venue_space_free() rather than here, because a CHECK cannot see other
  -- rows.
  session         TEXT NOT NULL DEFAULT 'full_day'
                  CHECK (session IN ('morning', 'evening', 'full_day')),

  -- BLOCKED  the manager closed it (a private function, maintenance)
  -- HELD     a customer is mid-checkout; released if they do not pay
  -- BOOKED   money is held against it
  status          TEXT NOT NULL DEFAULT 'BLOCKED'
                  CHECK (status IN ('BLOCKED', 'HELD', 'BOOKED')),

  booking_line_id UUID REFERENCES public.booking_lines(id) ON DELETE SET NULL,
  -- A HELD row that nobody paid for must not block the date forever.
  -- Read by venue_space_free(); swept by the release cron.
  hold_expires_at TIMESTAMPTZ,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One row per space per date per session. This is what lets the
  -- partner calendar upsert on tap instead of read-then-write, and what
  -- stops two customers being sold the same ballroom on the same evening.
  CONSTRAINT venue_slots_one_per_session UNIQUE (space_id, slot_date, session)
);

CREATE INDEX IF NOT EXISTS idx_venue_slots_lookup
  ON public.venue_slots (space_id, slot_date);
-- The customer asks the other way round: who is free on the 26th?
CREATE INDEX IF NOT EXISTS idx_venue_slots_by_date
  ON public.venue_slots (slot_date, status);

-- ── 4 · venue_managers ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.venue_managers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  venue_id    UUID NOT NULL REFERENCES public.venues(id)  ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'OWNER'
              CHECK (role IN ('OWNER', 'STAFF')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT venue_managers_one_claim UNIQUE (vendor_id, venue_id)
);

-- One owner per venue, enforced by the database.
--
-- Two managers at the same hotel both tapping "claim" is not a rare race,
-- it is the normal first day. Without this the second claim succeeds and
-- the venue has two owners with equal rights over one calendar. Partial
-- unique index, so STAFF rows are unaffected -- the same shape as
-- uq_offer_one_winner in 060, and for the same reason: the race lives in
-- the database, so the answer does too.
CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_one_owner
  ON public.venue_managers (venue_id) WHERE role = 'OWNER';

CREATE INDEX IF NOT EXISTS idx_venue_managers_vendor
  ON public.venue_managers (vendor_id);

-- ── 5 · updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_venues_touch        ON public.venues;
DROP TRIGGER IF EXISTS trg_venue_spaces_touch  ON public.venue_spaces;
DROP TRIGGER IF EXISTS trg_venue_slots_touch   ON public.venue_slots;

CREATE TRIGGER trg_venues_touch       BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_venue_spaces_touch BEFORE UPDATE ON public.venue_spaces
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_venue_slots_touch  BEFORE UPDATE ON public.venue_slots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── 6 · location follows lat/lng ─────────────────────────────────────
--
-- One place the geography is built, fired by both the OSM seeder and a
-- partner dropping a pin. Neither has to know PostGIS exists.

CREATE OR REPLACE FUNCTION public.venue_location_from_latlng()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    NEW.location := NULL;
  ELSE
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_venues_location ON public.venues;
CREATE TRIGGER trg_venues_location
  BEFORE INSERT OR UPDATE OF lat, lng ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.venue_location_from_latlng();

-- ══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.venues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_spaces   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_managers ENABLE ROW LEVEL SECURITY;

-- Does this caller manage this venue? SECURITY DEFINER so the policy can
-- read venue_managers without the caller needing a policy on it, which
-- would otherwise recurse.
CREATE OR REPLACE FUNCTION public.manages_venue(p_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM venue_managers m
    JOIN vendors v ON v.id = m.vendor_id
    WHERE m.venue_id = p_venue_id AND v.profile_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.manages_venue(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manages_venue(UUID) TO authenticated, service_role;

-- ── venues ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "anyone reads real venues"      ON public.venues;
DROP POLICY IF EXISTS "partners propose venues"       ON public.venues;
DROP POLICY IF EXISTS "managers edit their venue"     ON public.venues;

-- Read is open, and it has to be: the point of seeding is that a customer
-- can browse halls before signing in, and a partner can find theirs
-- before they have claimed it.
--
-- `notes` is the only free-text field here and it is operator-facing;
-- nothing in this table is personal data. The manager's phone number
-- lives on `vendors`, behind its own policies, and deliberately not here.
CREATE POLICY "anyone reads real venues"
  ON public.venues FOR SELECT
  USING (status <> 'rejected');

CREATE POLICY "partners propose venues"
  ON public.venues FOR INSERT TO authenticated
  WITH CHECK (
    -- A partner may only ever create a venue in the pending state. They
    -- cannot self-approve by writing 'claimed', which is the whole point
    -- of the review queue.
    status = 'pending_review'
    AND source = 'partner'
    AND EXISTS (SELECT 1 FROM vendors WHERE profile_id = auth.uid())
  );

CREATE POLICY "managers edit their venue"
  ON public.venues FOR UPDATE TO authenticated
  USING (public.manages_venue(id))
  WITH CHECK (public.manages_venue(id));

-- ── venue_spaces ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "anyone reads active spaces"  ON public.venue_spaces;
DROP POLICY IF EXISTS "managers write own spaces"   ON public.venue_spaces;

CREATE POLICY "anyone reads active spaces"
  ON public.venue_spaces FOR SELECT
  USING (TRUE);

CREATE POLICY "managers write own spaces"
  ON public.venue_spaces FOR ALL TO authenticated
  USING (public.manages_venue(venue_id))
  WITH CHECK (public.manages_venue(venue_id));

-- ── venue_slots ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "anyone reads slots"        ON public.venue_slots;
DROP POLICY IF EXISTS "managers write own slots"  ON public.venue_slots;

-- A customer must be able to see that the 14th is taken. What they must
-- NOT see is who took it -- `booking_line_id` points at another
-- customer's booking, and `note` is whatever the manager typed. Both are
-- kept out of the customer's reach by the view in 095, which selects
-- neither; this policy governs the manager's own reads.
CREATE POLICY "anyone reads slots"
  ON public.venue_slots FOR SELECT
  USING (TRUE);

CREATE POLICY "managers write own slots"
  ON public.venue_slots FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM venue_spaces s
            WHERE s.id = space_id AND public.manages_venue(s.venue_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM venue_spaces s
            WHERE s.id = space_id AND public.manages_venue(s.venue_id))
    -- A manager blocks and unblocks their own dates. They do not get to
    -- write BOOKED by hand: that state means money is held, and only the
    -- payment webhook is a witness to that.
    AND status = 'BLOCKED'
  );

-- ── venue_managers ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "partners read own claims"   ON public.venue_managers;
DROP POLICY IF EXISTS "partners claim venues"      ON public.venue_managers;
DROP POLICY IF EXISTS "partners drop own claims"   ON public.venue_managers;

CREATE POLICY "partners read own claims"
  ON public.venue_managers FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

CREATE POLICY "partners claim venues"
  ON public.venue_managers FOR INSERT TO authenticated
  WITH CHECK (
    vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid())
    -- Claiming is only possible on a venue nobody owns. The partial
    -- unique index above is the real guard against a race; this is the
    -- guard against the ordinary case of tapping claim on somebody
    -- else's hall.
    --
    -- `venue_managers.venue_id` is written out in full on purpose. An
    -- unqualified `venue_id` inside this subquery binds to `m.venue_id`,
    -- not to the row being inserted -- the condition becomes
    -- `m.venue_id = m.venue_id`, always true, and the policy then refuses
    -- EVERY claim as soon as any venue anywhere has an owner. It would
    -- have looked like the feature simply not working.
    AND NOT EXISTS (
      SELECT 1 FROM venue_managers m
      WHERE m.venue_id = venue_managers.venue_id AND m.role = 'OWNER'
    )
  );

CREATE POLICY "partners drop own claims"
  ON public.venue_managers FOR DELETE TO authenticated
  USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
-- ══════════════════════════════════════════════════════════════════════
--
-- It does not remove `venue` from TRADE_FOR_SERVICE, and it does not
-- touch match_partners. Until 095 lands and the customer app reads
-- venues_available(), the old radius path is the only one that works, and
-- breaking it first would take venue booking offline in between.
--
-- It also creates no rows. The OSM seed is a script, run separately, so
-- that re-running this file cannot re-import Bengaluru.
