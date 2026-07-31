-- ============================================================
--  EventEase — Rating Trigger
--  Automatically recalculates vendor.rating_avg whenever
--  a review is inserted or deleted.
--  Run AFTER 001_initial_schema.sql
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_vendor_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_vendor_id UUID;
  v_avg       NUMERIC(3,2);
BEGIN
  -- Works for INSERT (NEW) and DELETE (OLD)
  v_vendor_id := COALESCE(NEW.vendor_id, OLD.vendor_id);

  SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0)
    INTO v_avg
    FROM reviews
   WHERE vendor_id = v_vendor_id;

  UPDATE vendors SET rating_avg = v_avg WHERE id = v_vendor_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fire after every review insert or delete
DROP TRIGGER IF EXISTS trg_vendor_rating_insert ON reviews;
CREATE TRIGGER trg_vendor_rating_insert
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION recalculate_vendor_rating();

DROP TRIGGER IF EXISTS trg_vendor_rating_delete ON reviews;
CREATE TRIGGER trg_vendor_rating_delete
  AFTER DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION recalculate_vendor_rating();

-- ── Extra RLS: allow customer to read other profiles in review context ──
-- (only needed if you display reviewer names; currently we show "Verified customer")
-- Uncomment if you add names to reviews later:
-- CREATE POLICY "Public can read reviewer names"
--   ON profiles FOR SELECT USING (TRUE);
