-- ============================================================
-- Migration 005: Phone auth, event codes, vendor status
-- ============================================================

-- ── 1. Add event_code to events ──────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_code TEXT UNIQUE;

-- ── 2. Function to generate SAM-YYYY-NNNNN code ──────────────
CREATE OR REPLACE FUNCTION generate_event_code()
RETURNS TEXT AS $$
DECLARE
  year_str  TEXT := to_char(NOW(), 'YYYY');
  seq_num   INT;
  new_code  TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM events WHERE event_code LIKE 'SAM-' || year_str || '-%';
  new_code := 'SAM-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ── 3. Trigger to auto-assign event_code on insert ───────────
CREATE OR REPLACE FUNCTION set_event_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_code IS NULL THEN
    NEW.event_code := generate_event_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_event_code ON events;
CREATE TRIGGER trg_set_event_code
  BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION set_event_code();

-- ── 4. Backfill existing events that have no code ────────────
DO $$
DECLARE
  r RECORD;
  year_str TEXT;
  seq_num  INT := 1;
BEGIN
  FOR r IN SELECT id FROM events WHERE event_code IS NULL ORDER BY created_at LOOP
    year_str := to_char(NOW(), 'YYYY');
    UPDATE events SET event_code = 'SAM-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0')
    WHERE id = r.id;
    seq_num := seq_num + 1;
  END LOOP;
END;
$$;

-- ── 5. Add status column to vendors (if not exists) ──────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING_REVIEW'
  CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'));

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ── 6. updated_at trigger for vendors ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. RLS: customers can read their own events ──────────────
-- (phone-authed users have auth.uid() set the same as email users)
-- Ensure policy exists for phone-based auth (uid is still set correctly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'events' AND policyname = 'customers_read_own_events'
  ) THEN
    CREATE POLICY customers_read_own_events ON events
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'events' AND policyname = 'customers_insert_own_events'
  ) THEN
    CREATE POLICY customers_insert_own_events ON events
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;

-- ── 8. RLS: admin can manage all vendors ─────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendors' AND policyname = 'admins_manage_vendors'
  ) THEN
    CREATE POLICY admins_manage_vendors ON vendors
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END;
$$;

-- ── 9. Add updated_at to vendors table if missing ────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
