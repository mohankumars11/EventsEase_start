-- ══════════════════════════════════════════════════════════════════════
-- 120 · One partner, one trade, one listing
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 117 first. Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT IS WRONG TODAY
-- ══════════════════════════════════════════════════════════════════════
--
-- "Photography" is not a thing a partner has. It is a word that appears
-- in the `category` column of however many vendor_services rows they
-- happen to have made, and nothing in the database says those rows are
-- one business between them.
--
-- So the app cannot answer, without guessing:
--
--   does this partner already do Photography?
--   what is the STATUS of their Photography — as a whole?
--   where do I send them when they pick Photography a second time?
--
-- It guesses by grouping on a text column at read time. That guess is
-- why a partner could arrive at the trade picker, tap Photography, and
-- start a second Photography setup beside the one they already had.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A CONTAINER AND NOT UNIQUE (vendor_id, category)
-- ══════════════════════════════════════════════════════════════════════
--
-- The obvious reading of "one partner + one trade = one listing" is a
-- unique index on (vendor_id, category). It is the wrong one, and the
-- existing data says so out loud.
--
-- A decorator has TEN offerings under Decoration & Floral — floral,
-- stage, mandap, balloons, theme — and they are ten different jobs at
-- ten different prices. Collapsing them to one row means one price for a
-- ₹8,000 flower job and a ₹40,000 mandap, and it means DELETING nine
-- rows of real, priced, reviewed work.
--
-- So the trade gets a container and the offerings stay where they are.
-- The uniqueness rule lands on the container, which is the thing that
-- was actually being duplicated:
--
--   partner_listings   UNIQUE (vendor_id, trade)   ← the rule
--     └── vendor_services (unchanged, still priced one by one)
--
-- Nothing is deleted. Nothing loses its price. "Photography" appears
-- once in My Services, which is what was being asked for.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE STATUSES, AND THE ONE THAT IS NOT HERE
-- ══════════════════════════════════════════════════════════════════════
--
-- A container's status is its own — a partner can pause a whole trade
-- without touching the review state of the eleven offerings inside it,
-- and an operator can suspend one trade and leave the rest earning.
--
-- `verified` is deliberately NOT a status. It reads as a badge and would
-- end up rendered as one, and a listing being readable is not the same
-- claim as a business being verified — that lives on
-- vendors.verification_status, set by an operator through
-- set_vendor_verification(). Two columns that both look like "verified"
-- is how a fake tick ends up on a screen.
BEGIN;

CREATE TABLE IF NOT EXISTS public.partner_listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  -- The trade NAME, because that is what vendor_services.category holds
  -- and what match_partners joins on. Kept in step with listing_trades
  -- by the foreign key below rather than by hope.
  trade       TEXT NOT NULL REFERENCES public.listing_trades(name),
  -- The stable id — SBM-TRD-005 — for everything written from here on.
  -- Nullable only so a trade added to the app before its catalogue row
  -- exists does not block a partner from listing it.
  trade_id    TEXT REFERENCES public.listing_trades(id),

  status      TEXT NOT NULL DEFAULT 'draft',
  review_note TEXT,

  submitted_at TIMESTAMPTZ,
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- The rule this file exists for.
  CONSTRAINT partner_listings_one_per_trade UNIQUE (vendor_id, trade)
);

ALTER TABLE public.partner_listings
  DROP CONSTRAINT IF EXISTS partner_listings_status_valid;
ALTER TABLE public.partner_listings
  ADD CONSTRAINT partner_listings_status_valid
  CHECK (status IN (
    'draft',            -- started, never submitted
    'incomplete',       -- submitted-ish, but a required screen is empty
    'under_review',     -- with an operator
    'live',             -- dispatchable
    'requires_action',  -- an operator asked for a change
    'rejected',         -- an operator said no
    'paused',           -- the PARTNER stepped away from this trade
    'hidden',           -- not shown to customers, not the partner's doing
    'suspended'         -- an operator took it down
  ));

CREATE INDEX IF NOT EXISTS idx_partner_listings_vendor
  ON public.partner_listings (vendor_id, trade);
CREATE INDEX IF NOT EXISTS idx_partner_listings_queue
  ON public.partner_listings (status, submitted_at)
  WHERE status IN ('under_review', 'requires_action');

-- ══════════════════════════════════════════════════════════════════════
-- 2 · Every offering belongs to its trade's listing
-- ══════════════════════════════════════════════════════════════════════
--
-- Nullable, and it stays nullable. A NOT NULL here would mean an insert
-- into vendor_services fails unless the caller has already made the
-- container — and one of those callers is a seeding script, another is
-- an operator fixing something at 11pm in the SQL editor. The app fills
-- it in; the backfill below fills in everything that already exists.
ALTER TABLE public.vendor_services
  ADD COLUMN IF NOT EXISTS listing_id UUID
  REFERENCES public.partner_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_services_listing
  ON public.vendor_services (listing_id);

-- ══════════════════════════════════════════════════════════════════════
-- 3 · Backfill: one container per (vendor, category) that already exists
-- ══════════════════════════════════════════════════════════════════════
--
-- Read the status off the offerings rather than defaulting everything to
-- draft. A partner with three live Photography rows has a LIVE
-- Photography listing, and telling them it is a draft the morning this
-- is applied would be a lie the app then acts on.
--
-- The ladder is worst-first, which matches how the app reads a trade:
-- anything sent back outranks anything live, because it is the thing
-- the partner has to deal with.
INSERT INTO public.partner_listings (vendor_id, trade, trade_id, status, created_at)
SELECT
  s.vendor_id,
  s.category,
  t.id,
  CASE
    WHEN bool_or(s.review_status = 'rejected')     THEN 'requires_action'
    WHEN bool_or(s.review_status = 'live')         THEN 'live'
    WHEN bool_or(s.review_status = 'under_review') THEN 'under_review'
    ELSE 'draft'
  END,
  min(s.created_at)
FROM public.vendor_services s
LEFT JOIN public.listing_trades t ON t.name = s.category
WHERE s.category IS NOT NULL
  -- Only categories the catalogue knows. A row whose category is a typo
  -- ("videpgraphy") has no trade to contain it, and inventing one would
  -- make the typo permanent — see the note at the top of
  -- src/data/partnerCatalogue.js.
  AND t.id IS NOT NULL
GROUP BY s.vendor_id, s.category, t.id
ON CONFLICT (vendor_id, trade) DO NOTHING;

UPDATE public.vendor_services s
   SET listing_id = l.id
  FROM public.partner_listings l
 WHERE l.vendor_id = s.vendor_id
   AND l.trade     = s.category
   AND s.listing_id IS DISTINCT FROM l.id;

-- ══════════════════════════════════════════════════════════════════════
-- 4 · A partner may not publish or verify their own trade
-- ══════════════════════════════════════════════════════════════════════
--
-- Same shape and the same reason as 117's freeze on vendor_services:
-- the status is the thing the marketplace trusts, so the partner does
-- not get to set it. Two transitions are theirs, because both mean "I am
-- telling you something about my own business" rather than "I have
-- decided I am approved":
--
--   anything → paused      I am not taking this trade right now
--   paused   → under_review   put me back in the queue
--   requires_action → under_review   I have fixed what you asked for
--
-- Everything else is reverted in silence. An exception would fail the
-- whole UPDATE, including the legitimate column sitting next to it.
CREATE OR REPLACE FUNCTION public.freeze_listing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN RETURN NEW; END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'paused'
       OR (OLD.status IN ('paused', 'requires_action', 'rejected')
           AND NEW.status = 'under_review') THEN
      /* Re-entering the queue: the old decision no longer describes what
         is in front of the operator, so it goes with it. */
      IF NEW.status = 'under_review' THEN
        NEW.submitted_at := now();
        NEW.reviewed_at  := NULL;
        NEW.review_note  := NULL;
      END IF;
    ELSE
      NEW.status := OLD.status;
    END IF;
  END IF;

  /* Never the partner's to write, in any statement. */
  NEW.reviewed_by := OLD.reviewed_by;
  IF NEW.status = OLD.status THEN
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.review_note := OLD.review_note;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_freeze_listing_status ON public.partner_listings;
CREATE TRIGGER trg_freeze_listing_status
  BEFORE UPDATE ON public.partner_listings
  FOR EACH ROW EXECUTE FUNCTION public.freeze_listing_status();

-- A partner creating their own trade creates a DRAFT, whatever they
-- sent. Without this the freeze above is a lock on a door somebody can
-- walk around: the first INSERT could simply say status = 'live'.
CREATE OR REPLACE FUNCTION public.new_listing_starts_as_draft()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM 'draft' AND NEW.status IS DISTINCT FROM 'under_review' THEN
    NEW.status := 'draft';
  END IF;
  NEW.reviewed_at := NULL;
  NEW.reviewed_by := NULL;
  NEW.review_note := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_listing_starts_as_draft ON public.partner_listings;
CREATE TRIGGER trg_new_listing_starts_as_draft
  BEFORE INSERT ON public.partner_listings
  FOR EACH ROW EXECUTE FUNCTION public.new_listing_starts_as_draft();

-- ══════════════════════════════════════════════════════════════════════
-- 5 · Row-level security, the same shape as vendor_services
-- ══════════════════════════════════════════════════════════════════════
--
-- Partner A must never see Partner B's trades, their review notes or
-- what an operator said about them. Same three policies 021 gives
-- vendor_services, so there is one pattern to reason about rather than
-- two.
ALTER TABLE public.partner_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_manages_own_listings" ON public.partner_listings;
CREATE POLICY "partner_manages_own_listings" ON public.partner_listings FOR ALL
  USING      (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators_all_listings" ON public.partner_listings;
CREATE POLICY "operators_all_listings" ON public.partner_listings FOR ALL
  USING (public.get_my_role() IN ('admin', 'event_coordinator'));

-- Customers see a trade only when it is live AND the business behind it
-- is approved. Two conditions, because either one alone has been enough
-- to show an unapproved partner's work before now.
DROP POLICY IF EXISTS "public_reads_live_listings" ON public.partner_listings;
CREATE POLICY "public_reads_live_listings" ON public.partner_listings FOR SELECT
  USING (
    status = 'live'
    AND vendor_id IN (SELECT id FROM public.vendors WHERE status = 'APPROVED')
  );

COMMENT ON TABLE public.partner_listings IS
  'One row per (partner, trade). The container the offerings in vendor_services hang off, and the thing "one partner + one trade = one listing" is a rule about.';

-- ══════════════════════════════════════════════════════════════════════
-- 6 · The container's status follows its offerings
-- ══════════════════════════════════════════════════════════════════════
--
-- Without this the container is a second place a status is written and
-- a second place it can be wrong. A partner whose three Photography
-- offerings all went live last week would still read "Draft" in My
-- Services, because nobody told the container — and an operator would
-- have to remember to move two rows for every one decision.
--
-- So the operator keeps reviewing OFFERINGS, exactly as they do now
-- (nothing in the console changes), and the trade's status is derived
-- from them. One decision, one click, two rows correct.
--
-- ── What it does not touch ──────────────────────────────────────────
-- 'paused' is the PARTNER's own switch and is left alone: a partner who
-- paused their Catering has not had it un-paused by an operator
-- approving a fourth menu. Same for 'suspended', which is a decision
-- about the business and outranks anything the offerings say.
CREATE OR REPLACE FUNCTION public.sync_listing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing UUID;
  v_status  TEXT;
BEGIN
  v_listing := COALESCE(NEW.listing_id, OLD.listing_id);
  IF v_listing IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT CASE
           WHEN bool_or(review_status = 'rejected')     THEN 'requires_action'
           WHEN bool_or(review_status = 'live')         THEN 'live'
           WHEN bool_or(review_status = 'under_review') THEN 'under_review'
           ELSE 'draft'
         END
    INTO v_status
    FROM vendor_services
   WHERE listing_id = v_listing;

  UPDATE partner_listings
     SET status = COALESCE(v_status, 'draft'), updated_at = now()
   WHERE id = v_listing
     AND status NOT IN ('paused', 'suspended', 'hidden')
     AND status IS DISTINCT FROM COALESCE(v_status, 'draft');

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_listing_status ON public.vendor_services;
CREATE TRIGGER trg_sync_listing_status
  AFTER INSERT OR UPDATE OF review_status, listing_id OR DELETE ON public.vendor_services
  FOR EACH ROW EXECUTE FUNCTION public.sync_listing_status();

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- AFTERWARDS
-- ══════════════════════════════════════════════════════════════════════
--
-- The app works without this file: src/lib/partnerListings.js groups
-- vendor_services by category when the table is absent, so My Services
-- and the duplicate guard read the same either way. Applying it moves
-- the rule from the app into the database, which is where §7 asked for
-- it and where a double tap cannot get around it.
--
-- To check it took:
--
--   SELECT count(*) AS containers FROM partner_listings;
--   SELECT count(*) AS orphans FROM vendor_services
--    WHERE listing_id IS NULL AND category IS NOT NULL;
--
--   -- orphans should be only rows whose category is not a known trade
