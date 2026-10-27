-- 190 — SAMBRAMO 360° occasion-to-service recommendations
--
-- Source: docs/sambramo-360 (Cloud Build Bundle v1.0). Data is loaded by
--   node --env-file=.env scripts/import-catalogue-360.mjs --apply
-- (idempotent upserts; nothing is ever deleted by the import).
-- Rules are published by
--   node --env-file=.env scripts/rules360.mjs publish --notes "…"
--
-- What it adds
--   occasion_categories, occasions, service_trades   public catalogue (ids =
--       the app's ids: src/customer/data/occasions.js, trades.js)
--   lifecycle_phases                                 the 12 phases
--   occasion_trade_recommendations                   438 × 34 baseline matrix
--   recommendation_rule_versions (+ audit)           versioned rule sets; one
--       published at a time; every insert/update audited
--   event_plans, event_plan_services                 a customer's saved plans,
--       linked to booking_lines when a line is booked
--
-- Access
--   anon / authenticated   read active catalogue, matrix, phases, the
--                          PUBLISHED rule version
--   customers              their own event plans and plan services only
--   admins (get_my_role()) write catalogue, matrix and rules; read plans
--
-- Rollback (no data outside these tables is touched):
--   drop table if exists event_plan_services, event_plans,
--     recommendation_rule_audit, recommendation_rule_versions,
--     occasion_trade_recommendations, lifecycle_phases, occasions,
--     service_trades, occasion_categories cascade;
--   drop function if exists public.sambramo_audit_rule_version();

BEGIN;

-- ── Catalogue ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.occasion_categories (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  source_name   TEXT,
  display_order INT  NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.occasions (
  id                TEXT PRIMARY KEY,
  category_id       TEXT NOT NULL REFERENCES public.occasion_categories(id),
  name              TEXT NOT NULL,
  scene_description TEXT,
  display_order     INT  NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS occasions_category_idx ON public.occasions (category_id, display_order) WHERE is_active;
CREATE INDEX IF NOT EXISTS occasions_name_search_idx ON public.occasions USING gin (to_tsvector('simple', name));

CREATE TABLE IF NOT EXISTS public.service_trades (
  id                TEXT PRIMARY KEY,
  customer_label    TEXT NOT NULL,
  scope_description TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lifecycle_phases (
  id            INT PRIMARY KEY,
  key           TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  display_order INT NOT NULL
);
INSERT INTO public.lifecycle_phases (id, key, title, display_order) VALUES
  (1, 'discover', 'Discover & define', 1), (2, 'plan', 'Plan & budget', 2), (3, 'book', 'Venue & main suppliers', 3),
  (4, 'coordinate', 'Invites & coordination', 4), (5, 'logistics', 'Logistics & transport', 5), (6, 'setup', 'Set-up & tech checks', 6),
  (7, 'arrival', 'Guest arrival & operations', 7), (8, 'programme', 'The main programme', 8), (9, 'hospitality', 'Food & hospitality', 9),
  (10, 'departure', 'Guests leave', 10), (11, 'teardown', 'Teardown & clean-up', 11), (12, 'post', 'After the event', 12)
ON CONFLICT (id) DO UPDATE SET key = EXCLUDED.key, title = EXCLUDED.title, display_order = EXCLUDED.display_order;

CREATE TABLE IF NOT EXISTS public.occasion_trade_recommendations (
  occasion_id      TEXT NOT NULL REFERENCES public.occasions(id) ON DELETE CASCADE,
  trade_id         TEXT NOT NULL REFERENCES public.service_trades(id),
  status           TEXT NOT NULL CHECK (status IN ('CORE', 'CONDITIONAL', 'OPTIONAL', 'NOT_DEFAULT')),
  priority         INT,
  reason           TEXT,
  lifecycle_phases INT[],
  rule_version     TEXT NOT NULL DEFAULT 'baseline-v1',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (occasion_id, trade_id)
);
CREATE INDEX IF NOT EXISTS otr_trade_idx ON public.occasion_trade_recommendations (trade_id, status);

-- ── Rules: versioned, one published, audited ──────────────────────────
CREATE TABLE IF NOT EXISTS public.recommendation_rule_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version      TEXT NOT NULL UNIQUE,
  rules        JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'retired')),
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  CONSTRAINT rules_is_array CHECK (jsonb_typeof(rules) = 'array')
);
CREATE UNIQUE INDEX IF NOT EXISTS one_published_rule_version ON public.recommendation_rule_versions ((status)) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS public.recommendation_rule_audit (
  id         BIGSERIAL PRIMARY KEY,
  version_id UUID REFERENCES public.recommendation_rule_versions(id) ON DELETE SET NULL,
  version    TEXT,
  action     TEXT NOT NULL,
  actor      UUID,
  detail     JSONB,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.sambramo_audit_rule_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.recommendation_rule_audit (version_id, version, action, actor, detail)
  VALUES (NEW.id, NEW.version,
          CASE WHEN TG_OP = 'INSERT' THEN 'created' WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'status:' || NEW.status ELSE 'edited' END,
          auth.uid(),
          jsonb_build_object('status', NEW.status, 'rules', jsonb_array_length(NEW.rules), 'notes', NEW.notes));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rule_version_audit ON public.recommendation_rule_versions;
CREATE TRIGGER rule_version_audit AFTER INSERT OR UPDATE ON public.recommendation_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.sambramo_audit_rule_version();

-- ── Customer event plans ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  occasion_id  TEXT NOT NULL REFERENCES public.occasions(id),
  context      JSONB NOT NULL DEFAULT '{}'::jsonb,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'booked', 'archived')),
  rule_version TEXT,
  client_key   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, client_key)
);
CREATE INDEX IF NOT EXISTS event_plans_owner_idx ON public.event_plans (customer_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.event_plan_services (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id               UUID NOT NULL REFERENCES public.event_plans(id) ON DELETE CASCADE,
  trade_id              TEXT NOT NULL REFERENCES public.service_trades(id),
  recommendation_status TEXT CHECK (recommendation_status IN ('CORE', 'CONDITIONAL', 'OPTIONAL', 'NOT_DEFAULT')),
  decision              TEXT NOT NULL DEFAULT 'recommended' CHECK (decision IN ('recommended', 'selected', 'removed', 'arranged', 'later')),
  vendor_service_id     UUID,
  booking_line_id       UUID REFERENCES public.booking_lines(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, trade_id)
);
CREATE INDEX IF NOT EXISTS event_plan_services_plan_idx ON public.event_plan_services (plan_id);

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['occasion_categories', 'occasions', 'service_trades', 'event_plans', 'event_plan_services'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS touch_%1$s ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER touch_%1$s BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t);
  END LOOP;
END $$;

-- ── Row-level security ────────────────────────────────────────────────
ALTER TABLE public.occasion_categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occasions                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_trades                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_phases               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occasion_trade_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_rule_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_rule_audit      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_plans                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_plan_services            ENABLE ROW LEVEL SECURITY;

-- public catalogue: read active rows; admins write
DROP POLICY IF EXISTS "read active categories" ON public.occasion_categories;
CREATE POLICY "read active categories" ON public.occasion_categories FOR SELECT USING (is_active OR public.get_my_role() = 'admin');
DROP POLICY IF EXISTS "admin writes categories" ON public.occasion_categories;
CREATE POLICY "admin writes categories" ON public.occasion_categories FOR ALL USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "read active occasions" ON public.occasions;
CREATE POLICY "read active occasions" ON public.occasions FOR SELECT USING (is_active OR public.get_my_role() = 'admin');
DROP POLICY IF EXISTS "admin writes occasions" ON public.occasions;
CREATE POLICY "admin writes occasions" ON public.occasions FOR ALL USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "read active trades" ON public.service_trades;
CREATE POLICY "read active trades" ON public.service_trades FOR SELECT USING (is_active OR public.get_my_role() = 'admin');
DROP POLICY IF EXISTS "admin writes trades" ON public.service_trades;
CREATE POLICY "admin writes trades" ON public.service_trades FOR ALL USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "read phases" ON public.lifecycle_phases;
CREATE POLICY "read phases" ON public.lifecycle_phases FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "read matrix" ON public.occasion_trade_recommendations;
CREATE POLICY "read matrix" ON public.occasion_trade_recommendations FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "admin writes matrix" ON public.occasion_trade_recommendations;
CREATE POLICY "admin writes matrix" ON public.occasion_trade_recommendations FOR ALL USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- rules: everyone reads the published set; only admins read drafts or write
DROP POLICY IF EXISTS "read published rules" ON public.recommendation_rule_versions;
CREATE POLICY "read published rules" ON public.recommendation_rule_versions FOR SELECT USING (status = 'published' OR public.get_my_role() = 'admin');
DROP POLICY IF EXISTS "admin writes rules" ON public.recommendation_rule_versions;
CREATE POLICY "admin writes rules" ON public.recommendation_rule_versions FOR ALL USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
DROP POLICY IF EXISTS "admin reads rule audit" ON public.recommendation_rule_audit;
CREATE POLICY "admin reads rule audit" ON public.recommendation_rule_audit FOR SELECT USING (public.get_my_role() = 'admin');

-- plans: a customer sees and changes only their own
DROP POLICY IF EXISTS "own plans" ON public.event_plans;
CREATE POLICY "own plans" ON public.event_plans FOR ALL TO authenticated
  USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
DROP POLICY IF EXISTS "admin reads plans" ON public.event_plans;
CREATE POLICY "admin reads plans" ON public.event_plans FOR SELECT USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "own plan services" ON public.event_plan_services;
CREATE POLICY "own plan services" ON public.event_plan_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_plans p WHERE p.id = plan_id AND p.customer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.event_plans p WHERE p.id = plan_id AND p.customer_id = auth.uid()));
DROP POLICY IF EXISTS "admin reads plan services" ON public.event_plan_services;
CREATE POLICY "admin reads plan services" ON public.event_plan_services FOR SELECT USING (public.get_my_role() = 'admin');

GRANT SELECT ON public.occasion_categories, public.occasions, public.service_trades, public.lifecycle_phases,
  public.occasion_trade_recommendations, public.recommendation_rule_versions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_plans, public.event_plan_services TO authenticated;
GRANT INSERT, UPDATE ON public.occasion_categories, public.occasions, public.service_trades,
  public.occasion_trade_recommendations, public.recommendation_rule_versions TO authenticated;
GRANT SELECT ON public.recommendation_rule_audit TO authenticated;

COMMIT;
