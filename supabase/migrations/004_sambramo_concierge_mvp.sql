-- ═══════════════════════════════════════════════════════════════
-- SAMBRAMO Concierge MVP — Migration 004
-- ═══════════════════════════════════════════════════════════════

-- EVENTS (customer celebration requests)
CREATE TABLE IF NOT EXISTS events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_code           TEXT UNIQUE NOT NULL DEFAULT 'EVT-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  event_type           TEXT NOT NULL,
  custom_event_type    TEXT,
  event_date           DATE,
  start_time           TIME,
  end_time             TIME,
  flexible_date        BOOLEAN DEFAULT FALSE,
  city                 TEXT NOT NULL DEFAULT 'Bengaluru',
  area                 TEXT,
  pincode              TEXT,
  venue_name           TEXT,
  home_event           BOOLEAN DEFAULT FALSE,
  outside_service_area BOOLEAN DEFAULT FALSE,
  guest_count          INTEGER,
  adult_count          INTEGER,
  children_count       INTEGER,
  budget_text          TEXT,
  budget_min           NUMERIC,
  budget_max           NUMERIC,
  theme                TEXT,
  style_preference     TEXT,   -- traditional | modern | mix
  food_preference      TEXT,   -- veg | non-veg | jain | no-preference
  dietary_requirements TEXT,
  special_requirements TEXT,
  customer_name        TEXT,
  customer_phone       TEXT,
  customer_email       TEXT,
  preferred_contact    TEXT DEFAULT 'whatsapp',
  status               TEXT NOT NULL DEFAULT 'REQUEST_RECEIVED',
  priority             TEXT NOT NULL DEFAULT 'NORMAL',
  assigned_coordinator UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVENT_SERVICES (services needed per event)
CREATE TABLE IF NOT EXISTS event_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  service_category TEXT NOT NULL,
  service_name     TEXT NOT NULL,
  description      TEXT,
  quantity         INTEGER DEFAULT 1,
  customer_budget  NUMERIC,
  status           TEXT NOT NULL DEFAULT 'REQUIRED',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVENT_VENDOR_OPTIONS (vendors sourced by Sambramo team for each service)
CREATE TABLE IF NOT EXISTS event_vendor_options (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_service_id                UUID REFERENCES event_services(id) ON DELETE CASCADE,
  vendor_id                       UUID REFERENCES vendors(id),   -- nullable: external vendors
  vendor_name                     TEXT NOT NULL,
  vendor_phone                    TEXT,
  vendor_category                 TEXT,
  vendor_location                 TEXT,
  quoted_amount                   NUMERIC,
  sambramo_negotiated_amount      NUMERIC,
  vendor_notes                    TEXT,
  availability_status             TEXT DEFAULT 'UNKNOWN',  -- AVAILABLE | UNAVAILABLE | UNKNOWN
  quote_status                    TEXT DEFAULT 'PENDING',   -- PENDING | RECEIVED | REJECTED
  quality_rating                  NUMERIC,
  reliability_score               NUMERIC,
  selected                        BOOLEAN DEFAULT FALSE,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVENT_PROPOSALS
CREATE TABLE IF NOT EXISTS event_proposals (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  proposal_number              TEXT UNIQUE NOT NULL DEFAULT 'PROP-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  subtotal                     NUMERIC NOT NULL DEFAULT 0,
  sambramo_coordination_fee    NUMERIC NOT NULL DEFAULT 0,
  discount                     NUMERIC DEFAULT 0,
  tax_amount                   NUMERIC DEFAULT 0,
  total_amount                 NUMERIC NOT NULL DEFAULT 0,
  customer_message             TEXT,
  status                       TEXT NOT NULL DEFAULT 'DRAFT',
  valid_until                  DATE,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVENT_PROPOSAL_ITEMS
CREATE TABLE IF NOT EXISTS event_proposal_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id         UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  event_service_id    UUID REFERENCES event_services(id),
  vendor_option_id    UUID REFERENCES event_vendor_options(id),
  description         TEXT NOT NULL,
  vendor_cost         NUMERIC NOT NULL DEFAULT 0,
  customer_price      NUMERIC NOT NULL DEFAULT 0,
  quantity            INTEGER NOT NULL DEFAULT 1,
  sambramo_margin     NUMERIC GENERATED ALWAYS AS (customer_price - vendor_cost) STORED,
  selected            BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVENT_CHANGE_REQUESTS
CREATE TABLE IF NOT EXISTS event_change_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  proposal_id  UUID REFERENCES event_proposals(id),
  customer_id  UUID NOT NULL REFERENCES profiles(id),
  request_text TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'OPEN',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

-- EVENT_TASKS (internal coordination checklist)
CREATE TABLE IF NOT EXISTS event_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  assigned_to  UUID REFERENCES profiles(id),
  due_at       TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'NOT_STARTED',
  priority     TEXT NOT NULL DEFAULT 'NORMAL',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- EVENT_ISSUES
CREATE TABLE IF NOT EXISTS event_issues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'MEDIUM',
  status      TEXT NOT NULL DEFAULT 'OPEN',
  resolution  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- EVENT_INTERNAL_NOTES (hidden from customers)
CREATE TABLE IF NOT EXISTS event_internal_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVENT_PAYMENTS (manual tracking)
CREATE TABLE IF NOT EXISTS event_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  amount                NUMERIC NOT NULL,
  payment_type          TEXT NOT NULL,   -- ADVANCE | PARTIAL | FINAL | REFUND | VENDOR_PAYMENT
  payment_method        TEXT NOT NULL DEFAULT 'UPI_MANUAL',
  transaction_reference TEXT,
  status                TEXT NOT NULL DEFAULT 'PENDING',
  recorded_by           UUID REFERENCES profiles(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVENT_SERVICE_SELECTIONS (which services from the wizard)
CREATE TABLE IF NOT EXISTS event_service_selections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,
  service_name TEXT NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_events_customer_id ON events(customer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_event_services_event_id ON event_services(event_id);
CREATE INDEX IF NOT EXISTS idx_event_vendor_options_event_id ON event_vendor_options(event_id);
CREATE INDEX IF NOT EXISTS idx_event_proposals_event_id ON event_proposals(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_event_id ON event_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_event_id ON event_tasks(event_id);

-- AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'events_updated_at') THEN
    CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'event_services_updated_at') THEN
    CREATE TRIGGER event_services_updated_at BEFORE UPDATE ON event_services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'event_proposals_updated_at') THEN
    CREATE TRIGGER event_proposals_updated_at BEFORE UPDATE ON event_proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ROW LEVEL SECURITY
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_vendor_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_service_selections ENABLE ROW LEVEL SECURITY;

-- CUSTOMER policies: own data only
CREATE POLICY "customers_own_events" ON events FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "customers_own_event_services" ON event_services FOR SELECT USING (EXISTS (SELECT 1 FROM events WHERE id = event_id AND customer_id = auth.uid()));
CREATE POLICY "customers_own_proposals" ON event_proposals FOR SELECT USING (EXISTS (SELECT 1 FROM events WHERE id = event_id AND customer_id = auth.uid()));
CREATE POLICY "customers_own_proposal_items" ON event_proposal_items FOR SELECT USING (EXISTS (SELECT 1 FROM event_proposals ep JOIN events e ON ep.event_id = e.id WHERE ep.id = proposal_id AND e.customer_id = auth.uid()));
CREATE POLICY "customers_own_change_requests" ON event_change_requests FOR ALL USING (customer_id = auth.uid());
CREATE POLICY "customers_own_payments" ON event_payments FOR SELECT USING (EXISTS (SELECT 1 FROM events WHERE id = event_id AND customer_id = auth.uid()));
CREATE POLICY "customers_own_service_selections" ON event_service_selections FOR ALL USING (EXISTS (SELECT 1 FROM events WHERE id = event_id AND customer_id = auth.uid()));

-- ADMIN policies: full access (check profile role)
CREATE POLICY "admins_all_events" ON events FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'event_coordinator')));
CREATE POLICY "admins_all_event_services" ON event_services FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'event_coordinator')));
CREATE POLICY "admins_all_vendor_options" ON event_vendor_options FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'event_coordinator')));
CREATE POLICY "admins_all_proposals" ON event_proposals FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'event_coordinator')));
CREATE POLICY "admins_all_proposal_items" ON event_proposal_items FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'event_coordinator')));
CREATE POLICY "admins_all_change_requests" ON event_change_requests FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'event_coordinator')));
CREATE POLICY "admins_all_tasks" ON event_tasks FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'event_coordinator')));
CREATE POLICY "admins_all_issues" ON event_issues FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'event_coordinator')));
CREATE POLICY "admins_all_internal_notes" ON event_internal_notes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'event_coordinator')));
CREATE POLICY "admins_all_payments" ON event_payments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'event_coordinator')));
