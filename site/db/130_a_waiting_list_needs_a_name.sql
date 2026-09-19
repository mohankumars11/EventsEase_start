-- ══════════════════════════════════════════════════════════════════════
-- 130 · A waiting list needs a name
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable, and safe to run
-- twice. Nothing on sambramo.com can capture a lead until this is applied.
--
-- This file lives under site/ rather than supabase/migrations/ because the
-- site branch keeps its diff inside site/ and never touches app source.
-- Copy it into supabase/migrations/ on an app branch when convenient; the
-- number may need bumping if the app has passed 130 by then. It is the
-- applying that matters, not the filing.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY
-- ══════════════════════════════════════════════════════════════════════
--
-- Neither app has shipped, so the marketing site cannot send anyone into
-- a product. Every call to action on sambramo.com is a waiting list
-- instead, and `city_interest_requests` (migration 020) is already the
-- right table: anon INSERT is permitted, SELECT is admin-only, and
-- customer_id is nullable because the whole point is capturing somebody
-- who has no account.
--
-- What it cannot hold is who the person is. Its columns are city, source
-- and customer_id — which was enough when the only question was "how many
-- people asked for Hyderabad", and is not enough when the row IS the lead
-- and somebody has to ring them back.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY COLUMNS AND NOT A NEW TABLE
-- ══════════════════════════════════════════════════════════════════════
--
-- Migration 121 made the opposite call for partners, and correctly: a
-- partner's interest is a supply pipeline read by trade, with eleven
-- fields a customer row would leave null. This is not that. A website
-- lead and a city vote are the same subject, the same reader and the same
-- lifetime — a mailing list of people who want to be told when we open.
-- Splitting them would mean every "who is waiting" query started with a
-- UNION.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY EVERY COLUMN IS NULLABLE
-- ══════════════════════════════════════════════════════════════════════
--
-- src/components/common/CityInterestForm.jsx inserts { customer_id, city,
-- source } and nothing else. A NOT NULL column here would break that form
-- the moment this runs — the app would start failing on a screen nobody
-- was touching, for a reason nobody would connect to a marketing site.
-- Additive and nullable means the existing insert keeps working untouched.
--
-- It also matches how the form actually behaves: it asks for a name and
-- one way to reach somebody, and everything else is optional, because
-- every required field is a reason to close the tab.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.city_interest_requests
  -- What they are called. Not split into first/last: half of India does
  -- not use the split, and an operator is going to read this aloud on a
  -- phone call, not mail-merge it.
  ADD COLUMN IF NOT EXISTS name TEXT,

  -- One field for phone OR email, deliberately. Two fields means two
  -- required-looking boxes; the form asks for "phone or email" and stores
  -- whatever arrived. An operator can tell a phone number from an email
  -- address without being told which it is, and normalising into two
  -- columns would mean guessing and being wrong on the ambiguous ones.
  ADD COLUMN IF NOT EXISTS contact TEXT,

  -- The occasion id (EVENT_DATA) or trade slug (VENDOR_CATEGORIES) the
  -- page pre-selected. This is the column that earns the whole exercise:
  -- before either app ships, it tells you which of the 25 occasions and
  -- 26 trades actually pull demand, from people who arrived by search.
  ADD COLUMN IF NOT EXISTS occasion TEXT,

  -- Roughly when. A date, not a timestamp — nobody planning a wedding in
  -- March knows the hour, and storing one would imply they did.
  ADD COLUMN IF NOT EXISTS event_date DATE,

  -- Which part of Bengaluru. Free text on purpose: people say "near
  -- Indiranagar metro", and a dropdown of six neighbourhoods would throw
  -- that away to gain a tidiness nobody needs at this volume.
  ADD COLUMN IF NOT EXISTS area TEXT;

COMMENT ON COLUMN public.city_interest_requests.name IS
  'Lead name from the sambramo.com waiting list. Null for rows created by the in-app CityInterestForm, which does not ask.';
COMMENT ON COLUMN public.city_interest_requests.contact IS
  'Phone or email as typed. Not normalised — see migration 130.';
COMMENT ON COLUMN public.city_interest_requests.occasion IS
  'EVENT_DATA occasion id or VENDOR_CATEGORIES trade slug, from the page the lead came from.';

-- The admin list is read newest-first and filtered by where the row came
-- from. Without this it is a sequential scan on every page load; the table
-- is small today and will not be if the site works.
CREATE INDEX IF NOT EXISTS city_interest_requests_created_idx
  ON public.city_interest_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS city_interest_requests_source_idx
  ON public.city_interest_requests (source);

-- ══════════════════════════════════════════════════════════════════════
-- RLS IS DELIBERATELY UNTOUCHED
-- ══════════════════════════════════════════════════════════════════════
--
-- Migration 020 already grants exactly what the website needs and nothing
-- more:
--
--   anyone_can_register_city_interest  INSERT  WITH CHECK
--       (customer_id IS NULL OR customer_id = auth.uid())
--   admin_reads_city_interest          SELECT  USING (role = 'admin')
--
-- So the anon key can write a row and cannot read one back. That is why
-- site/api/interest.js uses the ANON key and not the service role: the
-- policy already permits the only thing it needs to do, and a service-role
-- key in the marketing project's environment would bypass every policy in
-- the database from the most publicly reachable surface the company owns.
--
-- Verify after applying, as anon, that a read returns nothing:
--
--   curl -s "$SUPABASE_URL/rest/v1/city_interest_requests?select=*&limit=1" \
--     -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--   -- expect: []
--
-- An empty array is the policy working. A row is an incident.

COMMIT;
