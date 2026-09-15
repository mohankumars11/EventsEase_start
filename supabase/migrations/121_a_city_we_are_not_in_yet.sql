-- ══════════════════════════════════════════════════════════════════════
-- 121 · A city we are not in yet
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 115 first (the code
-- sequences). Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT HAPPENS TODAY TO A DECORATOR IN MYSURU
-- ══════════════════════════════════════════════════════════════════════
--
-- They install the app, they are told we do not serve their pincode, and
-- that is the end of it. Nothing is written down. The most valuable
-- thing they just told us — that there is a decorator in Mysuru who
-- wants to be on this platform — is discarded at the moment it is said.
--
-- `city_interest_requests` (020) exists and is the CUSTOMER version:
-- `customer_id`, a city, a source. It cannot answer the question that
-- decides which city opens next, which is not "how many people asked"
-- but "how many PARTNERS, in which TRADES". Twelve caterers and no
-- photographers is not a market; it is half of one.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A SECOND TABLE AND NOT COLUMNS ON THE FIRST
-- ══════════════════════════════════════════════════════════════════════
--
-- Different subject, different reader, different lifetime. A customer's
-- interest is a mailing list. A partner's is a supply pipeline an
-- operator works through by trade before a launch — it carries their
-- trades, where they actually are, and what they are willing to travel
-- to, and it is read by city rather than by person.
--
-- Bolting eleven nullable columns onto the customer table would make
-- every row half empty and every query start with "where the customer
-- one is null".
BEGIN;

CREATE TABLE IF NOT EXISTS public.partner_market_interest (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The readable one, for a spreadsheet and a phone call. MI-000123.
  interest_code TEXT,

  -- Null is legitimate and common: this is captured BEFORE onboarding,
  -- from somebody who may never create a vendors row — and asking them
  -- to sign up first, to tell us they cannot use the product, is the
  -- thing that makes them close the app instead.
  profile_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  vendor_id    UUID REFERENCES public.vendors(id)  ON DELETE SET NULL,

  partner_name TEXT,
  email        TEXT,
  phone        TEXT,

  -- WHERE THEY ARE, from the device. Not typed, not guessed.
  detected_city    TEXT,
  detected_state   TEXT,
  detected_pincode TEXT,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,

  -- WHICH CITY THEY WANT. Usually the detected one; different when
  -- somebody in Tumakuru says "open Mysuru, I work there".
  requested_city   TEXT NOT NULL,

  -- What they do. The column that decides whether a city is ready:
  -- a launch needs a spread of trades, not a pile of one.
  trades       TEXT[] NOT NULL DEFAULT '{}',

  current_market TEXT,
  market_status  TEXT,

  interested     BOOLEAN NOT NULL DEFAULT TRUE,
  interest_source TEXT,

  status       TEXT NOT NULL DEFAULT 'captured',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_market_interest
  DROP CONSTRAINT IF EXISTS partner_market_interest_status_valid;
ALTER TABLE public.partner_market_interest
  ADD CONSTRAINT partner_market_interest_status_valid
  CHECK (status IN (
    'captured',        -- they told us
    'waitlisted',      -- we have acknowledged it
    'launch_planned',  -- their city is going on the map
    'invited',         -- we have asked them in
    'onboarding',      -- they are setting up
    'live'             -- they are working
  ));

-- NOT 'rejected'. A partner in a city we have not opened is not a
-- partner we turned down, and a status ladder that ends in the word
-- rejected will eventually be shown to one of them.

CREATE INDEX IF NOT EXISTS idx_market_interest_city
  ON public.partner_market_interest (requested_city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_interest_profile
  ON public.partner_market_interest (profile_id);

-- ── The readable code, minted the same way every other one is ────────
-- MI-000123. Six digits rather than four: this is the one table we
-- actively want to be large, and lpad only pads, so passing a million
-- widens the code instead of wrapping it.
CREATE SEQUENCE IF NOT EXISTS public.market_interest_code_seq;

CREATE OR REPLACE FUNCTION public.assign_market_interest_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.interest_code IS NULL THEN
    NEW.interest_code := 'MI-' || lpad(nextval('public.market_interest_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_market_interest_code ON public.partner_market_interest;
CREATE TRIGGER trg_assign_market_interest_code
  BEFORE INSERT ON public.partner_market_interest
  FOR EACH ROW EXECUTE FUNCTION public.assign_market_interest_code();

-- ══════════════════════════════════════════════════════════════════════
-- 2 · Who may write it, and who may read it
-- ══════════════════════════════════════════════════════════════════════
--
-- Anybody may register their own interest, signed in or not — the whole
-- point is to catch somebody at the moment they find out we are not in
-- their city, which is before they have an account. Same shape as 020's
-- customer policy, and the same reasoning.
--
-- Reading is operators only. This is a list of names, emails and phone
-- numbers of people who run businesses; it is a recruitment pipeline,
-- and there is no screen a partner sees that needs it.
ALTER TABLE public.partner_market_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_registers_partner_interest" ON public.partner_market_interest;
CREATE POLICY "anyone_registers_partner_interest" ON public.partner_market_interest
  FOR INSERT WITH CHECK (profile_id IS NULL OR profile_id = auth.uid());

-- They can see their own back, so the app can say "you are on the list"
-- on a second visit rather than capturing them twice.
DROP POLICY IF EXISTS "partner_reads_own_interest" ON public.partner_market_interest;
CREATE POLICY "partner_reads_own_interest" ON public.partner_market_interest
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "operators_all_partner_interest" ON public.partner_market_interest;
CREATE POLICY "operators_all_partner_interest" ON public.partner_market_interest
  FOR ALL USING (public.get_my_role() IN ('admin', 'event_coordinator'));

-- ══════════════════════════════════════════════════════════════════════
-- 3 · The answer an operator actually opens this for
-- ══════════════════════════════════════════════════════════════════════
--
-- "Which city next" is one query, so it is one view rather than
-- something each console screen assembles for itself. Counting DISTINCT
-- people, not rows: somebody who taps Interested twice is one partner,
-- and a launch decision made on double-counted supply is a launch made
-- on a wrong number.
CREATE OR REPLACE VIEW public.market_interest_by_city AS
SELECT
  requested_city                              AS city,
  max(detected_state)                         AS state,
  count(*)                                    AS submissions,
  count(DISTINCT coalesce(profile_id::text, lower(email), phone, id::text))
                                              AS partners,
  count(DISTINCT t)                           AS trade_count,
  array_agg(DISTINCT t) FILTER (WHERE t IS NOT NULL) AS trades,
  min(created_at)                             AS first_seen,
  max(created_at)                             AS last_seen
FROM public.partner_market_interest
LEFT JOIN LATERAL unnest(
  CASE WHEN cardinality(trades) = 0 THEN ARRAY[NULL]::text[] ELSE trades END
) AS t ON TRUE
WHERE interested
GROUP BY requested_city;

COMMENT ON VIEW public.market_interest_by_city IS
  'Partner supply waiting in each city we have not opened. `partners` counts people, not submissions — a launch decision made on double-counted supply is made on a wrong number.';

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- AFTERWARDS
-- ══════════════════════════════════════════════════════════════════════
--
--   SELECT city, partners, trade_count FROM market_interest_by_city
--    ORDER BY partners DESC;
--
-- Empty until somebody outside Bengaluru opens the app, which is
-- correct: every number the console shows comes from this table, and
-- none of them is seeded.
