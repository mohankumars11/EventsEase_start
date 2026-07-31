-- ============================================================
--  EventEase — Initial Schema
--  Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Enable UUID extension ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── profiles ──────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT,
  phone       TEXT,
  email       TEXT,
  role        TEXT        NOT NULL DEFAULT 'customer'
                          CHECK (role IN ('customer','vendor','admin')),
  city        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ── vendors ───────────────────────────────────────────────
CREATE TABLE vendors (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id        UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  business_name     TEXT        NOT NULL,
  category          TEXT,
  description       TEXT,
  city              TEXT,
  area              TEXT,
  price_range_min   INTEGER,
  price_range_max   INTEGER,
  subscription_plan TEXT        NOT NULL DEFAULT 'free'
                                CHECK (subscription_plan IN ('free','growth','pro')),
  is_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_featured       BOOLEAN     NOT NULL DEFAULT FALSE,
  rating_avg        NUMERIC(3,2)         DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view vendors"
  ON vendors FOR SELECT USING (TRUE);

CREATE POLICY "Vendor can update own record"
  ON vendors FOR UPDATE
  USING (profile_id = auth.uid());

-- ── vendor_photos ─────────────────────────────────────────
CREATE TABLE vendor_photos (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id   UUID    REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  photo_url   TEXT    NOT NULL,
  is_cover    BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE vendor_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view vendor photos"
  ON vendor_photos FOR SELECT USING (TRUE);

CREATE POLICY "Vendor can manage own photos"
  ON vendor_photos FOR ALL
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid())
  );

-- ── event_categories ──────────────────────────────────────
CREATE TABLE event_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT,
  description TEXT
);

ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view event categories"
  ON event_categories FOR SELECT USING (TRUE);

-- ── service_categories ────────────────────────────────────
CREATE TABLE service_categories (
  id   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view service categories"
  ON service_categories FOR SELECT USING (TRUE);

-- ── bookings ──────────────────────────────────────────────
CREATE TABLE bookings (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id       UUID        REFERENCES profiles(id),
  vendor_id         UUID        REFERENCES vendors(id),
  event_category_id UUID        REFERENCES event_categories(id),
  event_date        DATE,
  event_location    TEXT,
  guest_count       INTEGER,
  budget            INTEGER,
  status            TEXT        NOT NULL DEFAULT 'enquiry'
                                CHECK (status IN ('enquiry','quoted','confirmed','completed','cancelled')),
  quoted_price      INTEGER,
  commission_amount INTEGER,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can view own bookings"
  ON bookings FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customer can create bookings"
  ON bookings FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Vendor can view their bookings"
  ON bookings FOR SELECT
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid())
  );

CREATE POLICY "Vendor can update booking status"
  ON bookings FOR UPDATE
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid())
  );

-- ── reviews ───────────────────────────────────────────────
CREATE TABLE reviews (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID        REFERENCES bookings(id),
  customer_id UUID        REFERENCES profiles(id),
  vendor_id   UUID        REFERENCES vendors(id),
  rating      SMALLINT    NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view reviews"
  ON reviews FOR SELECT USING (TRUE);

CREATE POLICY "Customer can write review"
  ON reviews FOR INSERT WITH CHECK (customer_id = auth.uid());

-- ── Seed: event_categories ────────────────────────────────
INSERT INTO event_categories (name, icon, description) VALUES
  ('Baby Shower',     '👶', 'Celebrate the upcoming arrival of a little one'),
  ('Naming Ceremony', '✨', 'Traditional naming ceremonies for newborns'),
  ('First Birthday',  '🎂', 'Make your baby''s first birthday unforgettable'),
  ('Birthday Party',  '🎉', 'Fun birthday celebrations for all ages'),
  ('Anniversary',     '💍', 'Celebrate years of love and togetherness'),
  ('Housewarming',    '🏠', 'Welcome your new home with a warm celebration'),
  ('Get-Together',    '🥂', 'Casual gatherings with friends and family');

-- ── Seed: service_categories ──────────────────────────────
INSERT INTO service_categories (name) VALUES
  ('Decoration'),
  ('Catering/Cooks'),
  ('Photography'),
  ('Videography'),
  ('Tent/Pandal'),
  ('Tables & Seating'),
  ('Stage & Lighting'),
  ('DJ/Music'),
  ('Drum Sets'),
  ('Return Gifts'),
  ('Cleanup Crew');

-- ── Trigger: auto-create profile on user signup ───────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Profile is inserted by the app with full_name/phone/role.
  -- This trigger is a safety net for users created outside the app.
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
