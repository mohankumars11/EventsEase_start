-- ══════════════════════════════════════════════════════════════════════
-- 115 · Everything a person can name
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE CATALOGUE HAS IDS. THE BUSINESS DOES NOT.
-- ══════════════════════════════════════════════════════════════════════
--
-- Every piece of CONTENT in this platform can be named out loud:
-- SBM-TRD-005 is a trade, SBM-SPG-077 a question, SBM-SPC-123 an answer.
-- 3,900 of them, append-only, never renumbered, precisely so that a
-- person can say one to another person.
--
-- Nothing a partner actually IS can be named. A vendor is
-- 7c2141c2-a8e6-49cf-bdeb-44c0f09653d4. So is their listing. So is the
-- booking. Nobody has ever read a UUID down a phone and nobody ever
-- will, which means the only handle a partner has on their own account
-- is their business name -- and two of the first eight are called "jon"
-- and "hab".
--
-- Zomato issues a restaurant id, Swiggy a partner id, Porter a driver
-- id, for exactly this reason: the moment a human has to refer to a
-- record, the record needs a name a human can hold.
--
-- ── Three, and not more ─────────────────────────────────────────────
-- The things two people talk to each other ABOUT:
--
--   SBM-PTR-0001   a partner        "quote this when you contact us"
--   SBM-LST-0001   one listing      "SBM-LST-0042 was sent back, why"
--   SBM-BKG-0001   a booking        what a customer and an operator share
--
-- Offers and payout claims are deliberately left alone. They are
-- machinery between two systems, not something anybody says aloud, and
-- an id nobody uses is a column that rots.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A SEQUENCE AND NOT A HASH OF THE UUID
-- ══════════════════════════════════════════════════════════════════════
--
-- A short hash would be derivable and need no state, and it would also
-- be unreadable: SBM-PTR-K7QX2 is not meaningfully easier to say than
-- the UUID. A counter gives short codes, in join order, that a person
-- can compare at a glance -- SBM-PTR-0003 joined before SBM-PTR-0009 --
-- and the ordering is genuinely useful to an operator.
--
-- Four digits padded, and NOT capped at four: lpad only pads, so the
-- ten-thousandth partner becomes SBM-PTR-10000 rather than an error.
-- A format that breaks at a round number is a bug with a date on it.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · The columns and their counters
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.vendors          ADD COLUMN IF NOT EXISTS partner_code TEXT;
ALTER TABLE public.vendor_services  ADD COLUMN IF NOT EXISTS listing_code TEXT;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS booking_code TEXT;

CREATE SEQUENCE IF NOT EXISTS public.partner_code_seq;
CREATE SEQUENCE IF NOT EXISTS public.listing_code_seq;
CREATE SEQUENCE IF NOT EXISTS public.booking_code_seq;

COMMENT ON COLUMN public.vendors.partner_code IS
  'The handle a partner and an operator both use out loud. Assigned once '
  'on insert and never reissued -- a code that moves is worse than none.';

-- ══════════════════════════════════════════════════════════════════════
-- 2 · Backfill, in the order they joined
-- ══════════════════════════════════════════════════════════════════════
--
-- Ordered by created_at so the numbers mean something: the earliest
-- partner is 0001. Done BEFORE the triggers exist, so this is one pass
-- over the existing rows and the trigger only ever sees new ones.
--
-- `WHERE partner_code IS NULL` is what makes the whole migration
-- re-runnable: a second run finds nothing to do rather than renumbering
-- everybody, which would invalidate every code already written down.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
    FROM public.vendors WHERE partner_code IS NULL
)
UPDATE public.vendors v
   SET partner_code = 'SBM-PTR-' || lpad(o.n::text, 4, '0')
  FROM ordered o WHERE o.id = v.id;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
    FROM public.vendor_services WHERE listing_code IS NULL
)
UPDATE public.vendor_services s
   SET listing_code = 'SBM-LST-' || lpad(o.n::text, 4, '0')
  FROM ordered o WHERE o.id = s.id;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
    FROM public.booking_requests WHERE booking_code IS NULL
)
UPDATE public.booking_requests b
   SET booking_code = 'SBM-BKG-' || lpad(o.n::text, 4, '0')
  FROM ordered o WHERE o.id = b.id;

-- The counters start after whatever the backfill used, so the next
-- insert continues the run rather than colliding with row one.
SELECT setval('public.partner_code_seq', GREATEST((SELECT count(*) FROM public.vendors), 1));
SELECT setval('public.listing_code_seq', GREATEST((SELECT count(*) FROM public.vendor_services), 1));
SELECT setval('public.booking_code_seq', GREATEST((SELECT count(*) FROM public.booking_requests), 1));

-- ══════════════════════════════════════════════════════════════════════
-- 3 · Assign on insert
-- ══════════════════════════════════════════════════════════════════════
--
-- BEFORE INSERT, and only when the column is still null. Never on
-- UPDATE: a code that changes when somebody edits their business name
-- is a code nobody can trust, and every place it has already been
-- written down -- a WhatsApp message, a payout reference, a support
-- note -- would silently start pointing at nothing.
CREATE OR REPLACE FUNCTION public.assign_partner_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.partner_code IS NULL THEN
    NEW.partner_code := 'SBM-PTR-' || lpad(nextval('public.partner_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.assign_listing_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.listing_code IS NULL THEN
    NEW.listing_code := 'SBM-LST-' || lpad(nextval('public.listing_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.assign_booking_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.booking_code IS NULL THEN
    NEW.booking_code := 'SBM-BKG-' || lpad(nextval('public.booking_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_partner_code ON public.vendors;
CREATE TRIGGER trg_assign_partner_code
  BEFORE INSERT ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.assign_partner_code();

DROP TRIGGER IF EXISTS trg_assign_listing_code ON public.vendor_services;
CREATE TRIGGER trg_assign_listing_code
  BEFORE INSERT ON public.vendor_services
  FOR EACH ROW EXECUTE FUNCTION public.assign_listing_code();

DROP TRIGGER IF EXISTS trg_assign_booking_code ON public.booking_requests;
CREATE TRIGGER trg_assign_booking_code
  BEFORE INSERT ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.assign_booking_code();

-- ══════════════════════════════════════════════════════════════════════
-- 4 · Unique, and findable
-- ══════════════════════════════════════════════════════════════════════
--
-- The constraints go on AFTER the backfill, so a half-populated table
-- cannot fail the migration on its way in. Unique is the point: a code
-- that can belong to two partners is not an identifier, it is a
-- coincidence.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_partner_code
  ON public.vendors (partner_code) WHERE partner_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_services_listing_code
  ON public.vendor_services (listing_code) WHERE listing_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_requests_booking_code
  ON public.booking_requests (booking_code) WHERE booking_code IS NOT NULL;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- CHECK IT
-- ══════════════════════════════════════════════════════════════════════
--
--   SELECT partner_code, business_name, created_at
--     FROM vendors WHERE is_synthetic = FALSE ORDER BY partner_code;
--
--   -- nothing should come back from any of these
--   SELECT count(*) FROM vendors          WHERE partner_code IS NULL;
--   SELECT count(*) FROM vendor_services  WHERE listing_code IS NULL;
--   SELECT count(*) FROM booking_requests WHERE booking_code IS NULL;
