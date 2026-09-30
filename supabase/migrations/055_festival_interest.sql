-- 055_festival_interest.sql
--
-- "Are you waiting for this one?" — yes or no, per festival.
--
-- ── Why a table and not a counter ────────────────────────────────────────
-- Every festival page is a locked door right now: we do not yet sell a Diwali
-- or a Ganesh Chaturthi package, and saying so plainly is better than a page
-- that pretends. But a locked door that only apologises wastes the one thing
-- it is good for — it is standing in front of somebody who arrived already
-- wanting the thing.
--
-- So the door asks one question and records the answer. A NO is as valuable
-- as a YES and is the reason this stores an answer rather than incrementing a
-- signup count: "forty people opened Diwali and two want it" is a decision,
-- and "two signups" is not.
--
-- ── Deliberately anonymous-capable ───────────────────────────────────────
-- `customer_id` is nullable and the insert policy allows NULL, exactly as
-- city_interest_requests does. The whole point is to catch somebody in the
-- three seconds before they leave; putting a login in front of that collects
-- nothing. If they happen to be signed in we keep the link, which is what
-- makes a later "we're live, you asked about this" possible.
--
-- ── Re-runnable ──────────────────────────────────────────────────────────
-- CREATE TABLE takes IF NOT EXISTS; CREATE POLICY does not. Each policy is
-- paired with a DROP so a run that failed partway does not strand every retry
-- on 42710. Same reasoning as migration 020, written out there at length.

CREATE TABLE IF NOT EXISTS festival_interest (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- The id from src/data/festivals.js ('diwali', 'ganesh-chaturthi'). TEXT and
  -- not a foreign key because festivals live in code, not in a table — the
  -- same call reviews_catalog makes for services and packages.
  festival_id   TEXT NOT NULL,
  -- Snapshotted so a renamed or retired festival still reads correctly in the
  -- console a year from now.
  festival_name TEXT,
  answer        TEXT NOT NULL CHECK (answer IN ('yes', 'no')),
  -- Where they were standing when asked, so demand can be read per city — the
  -- pilot is two cities and they do not celebrate the same festivals equally.
  city          TEXT,
  source        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One answer per person per festival. A customer who taps yes, changes their
-- mind and taps no should leave one row saying no, not two rows disagreeing.
-- Anonymous rows (customer_id IS NULL) are exempt: NULL is never equal to
-- NULL in a unique index, so guests can answer without colliding with each
-- other, which is the correct trade for a question asked before login.
CREATE UNIQUE INDEX IF NOT EXISTS festival_interest_one_per_customer
  ON festival_interest (customer_id, festival_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS festival_interest_by_festival
  ON festival_interest (festival_id, created_at DESC);

ALTER TABLE festival_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_register_festival_interest" ON festival_interest;
CREATE POLICY "anyone_can_register_festival_interest" ON festival_interest FOR INSERT
  WITH CHECK (customer_id IS NULL OR customer_id = auth.uid());

-- Signed-in people may correct their own answer; that is what the unique
-- index above is for.
DROP POLICY IF EXISTS "customer_updates_own_festival_interest" ON festival_interest;
CREATE POLICY "customer_updates_own_festival_interest" ON festival_interest FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "admin_reads_festival_interest" ON festival_interest;
CREATE POLICY "admin_reads_festival_interest" ON festival_interest FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
