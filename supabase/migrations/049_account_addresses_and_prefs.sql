-- ============================================================
-- Migration 049: Saved addresses, and the preferences an account
-- screen is expected to hold.
--
-- Run this ONCE in: Supabase Dashboard → SQL Editor
-- ============================================================
--
-- ── Why the account screen needed a schema at all ─────────────────────────
-- The first version of /account deliberately shipped with no "Saved
-- addresses", no "Notification settings" and no "Language", on the grounds
-- that a settings row which opens nothing is worse than a short list. That was
-- the right call for a screen with nothing behind it and the wrong shape for
-- the product: every one of those rows is table stakes in this market, and
-- their absence is read as the app being unfinished rather than as restraint.
--
-- So this gives them something to be. Nothing here is decorative — each column
-- and table below is written by a control on the account screen and read
-- somewhere a customer can see the effect.
--
-- ── Addresses are their own table, not a JSONB column on profiles ─────────
-- `orders.address` is already a JSONB snapshot and it stays exactly as it is:
-- an order records where it actually went, frozen at the moment it was placed,
-- and must never change because somebody later edited an address book entry.
-- That is a different thing from "where this customer usually wants deliveries",
-- which is a small list they add to, edit, reorder and delete.
--
-- Conflating them is the classic version of this bug — edit your home address
-- in 2027 and a 2026 invoice silently starts claiming the parcel went somewhere
-- it did not. The checkout should COPY from here into `orders.address`, never
-- reference it.

CREATE TABLE IF NOT EXISTS customer_addresses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- What the customer calls it. Free text rather than an enum of
  -- Home/Work/Other: "Amma's place" and "the site office" are the two most
  -- common real answers in this market and neither fits a three-value enum.
  label        TEXT        NOT NULL DEFAULT 'Home',
  -- Who receives it, which is frequently not the account holder — this app
  -- sends gifts, so the recipient's name and number are the operative ones.
  recipient    TEXT,
  phone        TEXT,
  line1        TEXT        NOT NULL,
  line2        TEXT,
  landmark     TEXT,
  city         TEXT        NOT NULL,
  pincode      TEXT,
  -- Exactly one default per customer, enforced by the partial unique index
  -- below rather than by application code that would race with itself.
  is_default   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- A customer sees and edits their own, and nobody else's. Admins can read them
-- because a coordinator arranging a delivery has to know where it is going.
CREATE POLICY "Customers manage own addresses"
  ON customer_addresses FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins read addresses"
  ON customer_addresses FOR SELECT
  USING (get_my_role() IN ('admin', 'event_coordinator'));

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer
  ON customer_addresses (customer_id, created_at DESC);

-- One default, in the database rather than in a hopeful UPDATE. Without this a
-- double-tap on "make default" leaves two rows flagged and the checkout picks
-- whichever sorts first — a bug that only ever shows up as a parcel at the
-- wrong address.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_address_per_customer
  ON customer_addresses (customer_id) WHERE is_default;

COMMENT ON TABLE customer_addresses IS
  'The customer''s address book. Checkout COPIES from here into orders.address — it must never reference this table, or editing an address would rewrite where a past order was delivered.';


-- ── Preferences ────────────────────────────────────────────────────────────
-- Columns on `profiles` rather than a preferences table: there are four of
-- them, they are read on every screen that greets somebody by name, and a join
-- for four booleans is a join for nothing.
--
-- Every one defaults to the least surprising value. Marketing defaults to
-- FALSE — an account screen that quietly opts somebody into promotional
-- messages and then offers a switch to leave is a dark pattern, and in this
-- market it is also the fastest way onto a spam list. Order and celebration
-- updates default TRUE because they are transactional: somebody who bought a
-- cake for tomorrow wants to know when it is out for delivery.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_orders       BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_celebrations BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_offers       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_whatsapp     BOOLEAN NOT NULL DEFAULT TRUE;

-- The language the app should address them in. Not enforced as a CHECK: the
-- set of languages this app offers is a product decision that will change
-- faster than a migration, and an unrecognised value falls back to English in
-- the UI rather than failing a write.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

COMMENT ON COLUMN profiles.notify_offers IS
  'Promotional messages. Defaults FALSE deliberately — opt-in, never opt-out.';
COMMENT ON COLUMN profiles.language IS
  'BCP-47-ish tag: en, kn, hi, ta, te. Unrecognised values fall back to English in the UI rather than failing a write.';

-- Avatars. A URL rather than a blob, pointing at the same `product-images`
-- bucket everything else uploads to (migration 025's policies key on bucket_id
-- alone, so the `avatars/` prefix inherits public-read with nothing to
-- configure).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;


-- ── After applying this ────────────────────────────────────────────────────
-- Nothing else is required. The account screen degrades gracefully without it:
-- `lib/account.js` treats a missing table or column as "no saved addresses and
-- default preferences" and the page renders, because migrations here are
-- applied by hand and "deployed but not yet pasted" is a normal state that
-- lasts as long as it takes somebody to open the SQL editor.
