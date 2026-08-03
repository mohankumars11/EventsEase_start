-- ============================================================
-- Migration 012: Reviews & ratings for Shop products AND
-- individual services/packages. Polymorphic — services/packages
-- aren't DB rows (they live in src/data/eventServicesData.js), so
-- subject_id is TEXT, not a foreign key.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews_catalog (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_name  TEXT NOT NULL DEFAULT 'Verified Customer', -- denormalized: profiles isn't publicly readable cross-customer
  subject_type   TEXT NOT NULL CHECK (subject_type IN ('product','service','package')),
  subject_id     TEXT NOT NULL,
  subject_name   TEXT NOT NULL,
  order_id       UUID REFERENCES orders(id) ON DELETE SET NULL,
  enquiry_id     UUID REFERENCES service_enquiries(id) ON DELETE SET NULL,
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  helpful_count  INTEGER NOT NULL DEFAULT 0,
  admin_reply    TEXT,
  admin_reply_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, subject_type, subject_id, order_id, enquiry_id)
);

CREATE TABLE IF NOT EXISTS review_helpful_votes (
  review_id   UUID NOT NULL REFERENCES reviews_catalog(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, customer_id)
);

-- One query powers every rating badge everywhere.
CREATE OR REPLACE VIEW review_aggregates AS
SELECT
  subject_type,
  subject_id,
  COUNT(*)                                AS review_count,
  ROUND(AVG(rating)::numeric, 1)          AS avg_rating
FROM reviews_catalog
GROUP BY subject_type, subject_id;

-- Keep helpful_count in sync — same trigger shape as 002_rating_trigger.sql.
CREATE OR REPLACE FUNCTION recalculate_review_helpful_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_review_id UUID;
  v_count     INTEGER;
BEGIN
  v_review_id := COALESCE(NEW.review_id, OLD.review_id);

  SELECT COUNT(*) INTO v_count FROM review_helpful_votes WHERE review_id = v_review_id;

  UPDATE reviews_catalog SET helpful_count = v_count WHERE id = v_review_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_review_helpful_insert ON review_helpful_votes;
CREATE TRIGGER trg_review_helpful_insert
  AFTER INSERT ON review_helpful_votes
  FOR EACH ROW EXECUTE FUNCTION recalculate_review_helpful_count();

DROP TRIGGER IF EXISTS trg_review_helpful_delete ON review_helpful_votes;
CREATE TRIGGER trg_review_helpful_delete
  AFTER DELETE ON review_helpful_votes
  FOR EACH ROW EXECUTE FUNCTION recalculate_review_helpful_count();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE reviews_catalog      ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read reviews"
  ON reviews_catalog FOR SELECT USING (TRUE);

CREATE POLICY "Customer can write own review"
  ON reviews_catalog FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customer can update own review"
  ON reviews_catalog FOR UPDATE USING (customer_id = auth.uid());

-- Admin can reply (admin_reply/admin_reply_at) to any review.
CREATE POLICY "Admin can update any review"
  ON reviews_catalog FOR UPDATE USING (get_my_role() = 'admin');

CREATE POLICY "Public can read helpful vote counts"
  ON review_helpful_votes FOR SELECT USING (TRUE);

CREATE POLICY "Customer can cast own helpful vote"
  ON review_helpful_votes FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customer can remove own helpful vote"
  ON review_helpful_votes FOR DELETE USING (customer_id = auth.uid());
