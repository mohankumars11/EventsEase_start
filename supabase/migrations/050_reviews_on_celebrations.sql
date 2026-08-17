-- ============================================================
-- Migration 050: A review can be about a celebration, not only
-- about a shop order or an enquiry.
--
-- Run this ONCE in: Supabase Dashboard → SQL Editor
-- Nothing depends on it being applied first — see the note at the
-- bottom for how the app behaves without it.
-- ============================================================
--
-- ── The gap ────────────────────────────────────────────────────────────────
-- `reviews_catalog` (migration 012) qualifies a review as verified by pointing
-- it at the thing that was bought: `order_id` for a shop order, `enquiry_id`
-- for a request raised through the builder or the services cart.
--
-- The six-step planning wizard writes to `events`, not `service_enquiries`.
-- So a customer whose wedding came through the wizard — the largest bookings
-- on this platform, by a wide margin — had nowhere to attach a review. It
-- would have been written with both source columns NULL, which is the shape an
-- UNVERIFIED review has: indistinguishable from somebody who rated a
-- photographer they never booked.
--
-- That is the wrong way round. The most expensive, most carefully coordinated
-- celebrations on the platform would have produced the least trustworthy
-- reviews, and the Track screen now asks for one on every completed
-- celebration — so this closes before that ask ships.

ALTER TABLE reviews_catalog
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- ── The uniqueness rule has to widen with it ───────────────────────────────
-- 012's UNIQUE (customer_id, subject_type, subject_id, order_id, enquiry_id)
-- is what the customer-side upsert conflicts on: one review per person per
-- thing per purchase. With a third source column the same constraint has to
-- include it, or two reviews of the same service from two different
-- celebrations would collide on (NULL, NULL) and overwrite each other.
--
-- Postgres treats NULLs as distinct in a unique constraint, which is exactly
-- what is wanted here: a shop review (order_id set, the others NULL) and a
-- celebration review (event_id set, the others NULL) are different rows and
-- must not conflict.
ALTER TABLE reviews_catalog
  DROP CONSTRAINT IF EXISTS reviews_catalog_customer_id_subject_type_subject_id_order_i_key;
ALTER TABLE reviews_catalog
  DROP CONSTRAINT IF EXISTS reviews_catalog_source_unique;
ALTER TABLE reviews_catalog
  ADD CONSTRAINT reviews_catalog_source_unique
  UNIQUE (customer_id, subject_type, subject_id, order_id, enquiry_id, event_id);

-- The Track screen asks "has this customer already reviewed this service on
-- this celebration?" on every render of a completed booking. Without this it
-- is a sequential scan of every review on the platform.
CREATE INDEX IF NOT EXISTS idx_reviews_catalog_event
  ON reviews_catalog (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_catalog_enquiry
  ON reviews_catalog (enquiry_id) WHERE enquiry_id IS NOT NULL;

COMMENT ON COLUMN reviews_catalog.event_id IS
  'The celebration this review is about, for requests raised through the planning wizard. Exactly one of order_id / enquiry_id / event_id identifies the purchase that makes a review verified; all three NULL means unverified.';

-- ── What "verified" actually means, written down ───────────────────────────
-- Deliberately NOT enforced as a CHECK. An unverified review (all three NULL)
-- is a legitimate row — somebody reviewing a service they read about — and the
-- distinction belongs in what the UI labels, not in what the database refuses.
-- A constraint here would also make the admin's ability to seed launch content
-- impossible, and it is better for that to be a visible "Unverified" badge
-- than an invisible absence.
CREATE OR REPLACE VIEW review_sources AS
SELECT
  id,
  subject_type,
  subject_id,
  rating,
  CASE
    WHEN order_id   IS NOT NULL THEN 'order'
    WHEN event_id   IS NOT NULL THEN 'celebration'
    WHEN enquiry_id IS NOT NULL THEN 'celebration'
    ELSE 'unverified'
  END AS source,
  created_at
FROM reviews_catalog;


-- ── After applying this ────────────────────────────────────────────────────
-- Nothing else is required, and nothing breaks before it is applied. The Track
-- screen writes `event_id` and, on a database that has not run this migration,
-- catches the 42703 ("column does not exist") and retries without it. The
-- review is still saved and still attached to the customer; it simply is not
-- yet tied to the celebration it came from. `src/lib/celebrationReviews.js`
-- carries the same note at the call site.
