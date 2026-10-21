-- ════════════════════════════════════════════════════════════════════════
-- 187 — Decoration & Floral, asked properly
-- ════════════════════════════════════════════════════════════════════════
--
-- The trade asked eight services, eight themes and one question about
-- flowers, then asked the partner to type what a package includes into
-- a 400-character box. Everything that decides the price of a
-- decoration job — which areas, how big a stage, fresh or artificial,
-- whose flowers, how many hours to install, whether a lorry can reach
-- the mantapa — was missing or buried in prose nothing can read.
--
-- That is why nearly every decoration job became a custom quote. A
-- quote is right for a bespoke design and wrong for "stage, entrance
-- and twelve centrepieces at a kalyana mantapa", which is most of this
-- trade's work and is perfectly priceable from a rate card.
--
-- The trade file now carries 42 services, 24 themes, 17 event types, 19
-- named flowers, 21 prop materials and 15 venue types, and the
-- catalogue prices the units this trade actually sells — per square
-- foot, per running foot, per piece, per table. These are the columns
-- behind that.
--
-- SAFE ON DATA: additive only, and both tables were verified empty
-- before it was written. Nothing is altered or dropped.

alter table public.partner_decoration_floral_profiles
  add column if not exists events                TEXT[],
  add column if not exists flower_types          TEXT[],
  add column if not exists flower_sourcing       TEXT,
  add column if not exists props                 TEXT[],
  add column if not exists site_visit            BOOLEAN,
  add column if not exists design_mockup         BOOLEAN,
  add column if not exists venues                TEXT[],
  add column if not exists max_area_sqft         NUMERIC,
  add column if not exists max_stage_sqft        NUMERIC,
  add column if not exists max_height_ft         NUMERIC,
  add column if not exists install_hours_before  NUMERIC,
  add column if not exists overnight_install     BOOLEAN,
  add column if not exists same_day_turnaround   BOOLEAN,
  add column if not exists access_needs          TEXT[],
  add column if not exists travel_radius_km      NUMERIC,
  add column if not exists outstation            BOOLEAN;

alter table public.partner_decoration_floral_items
  add column if not exists kind                TEXT,
  add column if not exists includes            TEXT[],
  add column if not exists flower_types        TEXT[],
  add column if not exists size                JSONB,
  add column if not exists price_unit          TEXT,
  add column if not exists min_order           NUMERIC,
  add column if not exists crew_needed         NUMERIC,
  add column if not exists lead_days           NUMERIC,
  add column if not exists dismantle_included  BOOLEAN;

comment on column public.partner_decoration_floral_profiles.install_hours_before is
  'How long before the event the decorator needs the venue. The commonest reason a decoration booking fails is an install window nobody agreed.';
comment on column public.partner_decoration_floral_profiles.flower_types is
  'Named flowers, not just fresh/artificial: a customer who asked for mallige and got carnation has a complaint nobody can settle from "fresh".';
comment on column public.partner_decoration_floral_items.price_unit is
  'Per sq ft / running ft / piece / table / setup / event. This is what makes a decoration job instantly priceable instead of a quote.';
