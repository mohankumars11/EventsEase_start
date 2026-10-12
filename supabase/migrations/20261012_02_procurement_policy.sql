-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisite: 20261010_07_trade_registry_and_generic_rules.sql.
-- Safe to apply alone: nothing reads this table until 20261012_09.
--
-- Which trades buy materials for a booking, and under what rules.
--
-- ── Why this is a table and not a constant ─────────────────────────
-- "Catering needs ingredients" is a business decision that changes with
-- the market, the city and the season, and it has to be auditable: when
-- a customer is asked for money for flowers, somebody must be able to
-- say which rule asked and when it was written. A constant in a bundle
-- cannot answer that.
--
-- ── Every trade starts as a DRAFT ──────────────────────────────────
-- All 34 rows are seeded status='draft', allow_incremental=false. A
-- draft policy is not picked up by the engine, which then answers
-- `no_procurement_policy` and routes to manual review. That is the
-- honest state until somebody signs the classification off: the seed
-- below is derived from real questionnaire keys, but WHICH trades
-- commonly procure is a judgement, not a fact the repo knows.
--
-- To activate one trade, after review:
--   update public.sambramo_procurement_policy
--      set status = 'active'
--    where trade_id = 'catering_food' and version = 1;
--
-- Rollback: drop table public.sambramo_procurement_policy cascade;

begin;

create table if not exists public.sambramo_procurement_policy (
  id uuid primary key default gen_random_uuid(),
  trade_id text not null references public.sambramo_trade_registry(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),

  -- never        this trade does not buy materials for a booking
  -- conditional  only when the booking's own items say so
  -- common       usually, but the booking still decides
  classification text not null check (classification in ('never', 'conditional', 'common')),

  -- Read against sambramo_listing_versions.answers. Shape:
  --   {"included_when": {"q": "materials", "in": ["We bring everything"]},
  --    "excluded_when": {"q": "materials", "in": ["Family arranges"]}}
  inclusion_signal jsonb not null default '{}'::jsonb,

  default_method text not null default 'partner_supplier'
    check (default_method in ('platform_supplier', 'partner_supplier', 'partner_stock')),
  allowed_methods text[] not null default '{platform_supplier,partner_supplier,partner_stock}',

  allow_incremental boolean not null default false,
  requires_operator_review boolean not null default true,

  -- Above this the engine refuses to auto-quote and escalates. 0 with
  -- allow_incremental=false means "never auto-quote", the seeded state.
  max_auto_quote_paise bigint not null default 0 check (max_auto_quote_paise >= 0),
  min_lead_hours integer not null default 48 check (min_lead_hours >= 0),
  quote_ttl_hours integer not null default 48 check (quote_ttl_hours between 1 and 336),

  -- A platform margin ON MATERIALS ONLY, and 0 by default: materials are
  -- a pass-through until somebody decides otherwise. Deliberately NOT
  -- folded into sambramo_trade_pricing_policy.platform_fee_rate -- that
  -- rate is the SERVICE commission, and adding materials to it would
  -- restate every partner's earnings.
  handling_fee_rate numeric(5,4) not null default 0
    check (handling_fee_rate >= 0 and handling_fee_rate < 0.25),

  note text,
  effective_from timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),

  unique (trade_id, version),
  constraint procurement_policy_incremental_needs_a_cap
    check (classification = 'never' or not allow_incremental or max_auto_quote_paise > 0)
);

create unique index if not exists uq_procurement_policy_one_active
  on public.sambramo_procurement_policy (trade_id) where status = 'active';
create index if not exists idx_procurement_policy_trade
  on public.sambramo_procurement_policy (trade_id, version desc);

-- An activated policy is evidence. Its numbers stop being editable in
-- place the moment it can be cited by a decision; a correction is a new
-- version. Same shape as partner_adjustments_are_append_only (140).
create or replace function public.procurement_policy_is_append_only()
returns trigger language plpgsql as $$
begin
  if old.status = 'draft' then
    return new;                                   -- a draft is still being written
  end if;
  if new.status is distinct from old.status
     and old.status = 'active' and new.status = 'retired'
     and new.classification = old.classification
     and new.allow_incremental = old.allow_incremental
     and new.max_auto_quote_paise = old.max_auto_quote_paise
     and new.handling_fee_rate = old.handling_fee_rate then
    return new;                                   -- retiring it is allowed
  end if;
  raise exception
    'procurement policy %/v% is % and cannot be edited in place; insert a new version instead',
    old.trade_id, old.version, old.status;
end $$;

drop trigger if exists procurement_policy_append_only on public.sambramo_procurement_policy;
create trigger procurement_policy_append_only
  before update on public.sambramo_procurement_policy
  for each row execute function public.procurement_policy_is_append_only();

-- ── The 34 rows ────────────────────────────────────────────────────
-- Derived from questionnaire keys that exist today:
--   priest_rituals.materials, trousseau_gift_packing.materials_included,
--   bridal_makeup_hair.materials_included, power_cooling.fuel_policy,
--   decoration_floral.procurement_days, and the packing_materials addons
--   on end_to_end_event_logistics / loading_unloading_crew.
-- Everything else is classified by what the trade sells. PROPOSAL ONLY.
insert into public.sambramo_procurement_policy
  (trade_id, version, status, classification, allowed_methods, note)
select t.trade_id, 1, 'draft', t.classification, t.methods::text[], t.note
from (values
  -- Buys consumables for the specific booking
  ('catering_food',              'common',      '{platform_supplier,partner_supplier,partner_stock}', 'Ingredients, provisions, disposables'),
  ('bar_beverages',              'common',      '{platform_supplier,partner_supplier,partner_stock}', 'Non-alcoholic drinks, mixers, ice, garnishes'),
  ('decoration_floral',          'common',      '{platform_supplier,partner_supplier,partner_stock}', 'Flowers, balloons, fabric, adhesives'),
  ('priest_rituals',             'common',      '{partner_supplier,partner_stock}',                   'Puja supplies, flowers, fruit'),
  ('cake_desserts',              'common',      '{partner_supplier,partner_stock}',                   'Ingredients, boards, packaging'),
  ('invitation_printing',        'common',      '{platform_supplier,partner_supplier}',               'Paper and print runs'),
  ('gifts_favours',              'common',      '{platform_supplier,partner_supplier}',               'Approved bulk gifts and customisation'),
  ('trousseau_gift_packing',     'common',      '{platform_supplier,partner_supplier}',               'Boxes, trays, fabric, ribbon'),
  ('event_materials_supplier',   'common',      '{partner_stock}',                                    'Supplier side: sells materials, does not claim them'),
  ('mehendi_artist',             'common',      '{partner_supplier,partner_stock}',                   'Cones and consumables'),
  ('bridal_makeup_hair',         'common',      '{partner_supplier,partner_stock}',                   'Job-specific consumables and flowers, not the kit'),
  -- Only when the booking says so
  ('power_cooling',              'conditional', '{partner_supplier,partner_stock}',                    'Fuel is a measured operating cost, handled separately'),
  ('event_lighting',             'conditional', '{partner_supplier,partner_stock}',                    'Consumables, never fixtures'),
  ('event_equipment_rental',     'conditional', '{partner_supplier,partner_stock}',                    'Replacements, never reusable stock'),
  ('sound_av',                   'conditional', '{partner_supplier,partner_stock}',                    'Consumables, never speakers or mixers'),
  ('tent_furniture',             'conditional', '{partner_supplier,partner_stock}',                    'Fasteners and approved custom items'),
  ('loading_unloading_crew',     'conditional', '{partner_supplier}',                                  'Protective packaging when it is in scope'),
  ('end_to_end_event_logistics', 'conditional', '{partner_supplier}',                                  'Packing materials when they are in scope'),
  ('guest_services',             'conditional', '{platform_supplier,partner_supplier}',                'Badges, welcome kits, amenities when in scope'),
  ('live_entertainment',         'conditional', '{partner_supplier,partner_stock}',                    'Approved props, costumes, set items'),
  ('photography',                'conditional', '{platform_supplier,partner_supplier}',                'Albums, prints, frames -- never equipment'),
  ('videography',                'conditional', '{platform_supplier,partner_supplier}',                'Albums, prints, media -- never equipment'),
  ('safety_facilities',          'conditional', '{partner_supplier}',                                  'Event-specific safety consumables; never delays a safety measure'),
  ('venue',                      'conditional', '{partner_supplier,partner_stock}',                    'Setup materials, separate from rental and deposit terms'),
  ('warehouse_storage',          'conditional', '{partner_supplier}',                                  'Job-specific packaging and labels'),
  ('wedding_planning',           'conditional', '{platform_supplier,partner_supplier}',                'Client-specific printed material; costs belong to the supplying trade where possible'),
  -- Labour, equipment and vehicle trades
  ('anchor_mc',                  'never',       '{}', 'Labour'),
  ('dj_music',                   'never',       '{}', 'Labour and own equipment'),
  ('security_services',          'never',       '{}', 'Staffing'),
  ('valet_parking',              'never',       '{}', 'Staffing'),
  ('transportation',             'never',       '{}', 'Vehicle hire'),
  ('passenger_transport',        'never',       '{}', 'Vehicle hire'),
  ('mini_truck_pickup',          'never',       '{}', 'Vehicle hire'),
  ('medium_large_goods_vehicle', 'never',       '{}', 'Vehicle hire')
) as t(trade_id, classification, methods, note)
where exists (select 1 from public.sambramo_trade_registry r where r.id = t.trade_id)
on conflict (trade_id, version) do nothing;

-- Any trade the list above missed gets a 'never' draft, so the table
-- always covers all 34 and the engine never meets a trade it has no row
-- for because somebody renamed one.
insert into public.sambramo_procurement_policy
  (trade_id, version, status, classification, allowed_methods, note)
select r.id, 1, 'draft', 'never', '{}'::text[], 'Unclassified -- defaulted to never'
  from public.sambramo_trade_registry r
 where not exists (select 1 from public.sambramo_procurement_policy p where p.trade_id = r.id)
on conflict (trade_id, version) do nothing;

alter table public.sambramo_procurement_policy enable row level security;

-- An active policy is public: the customer-facing quote has to be able
-- to explain itself. A draft is operator-only.
drop policy if exists procurement_policy_read_active on public.sambramo_procurement_policy;
create policy procurement_policy_read_active on public.sambramo_procurement_policy
  for select to anon, authenticated using (status = 'active');

drop policy if exists procurement_policy_operator_all on public.sambramo_procurement_policy;
create policy procurement_policy_operator_all on public.sambramo_procurement_policy
  for all to authenticated using (public.caller_is_operator()) with check (public.caller_is_operator());

commit;
