-- ════════════════════════════════════════════════════════════════════════
-- 185 — Bar & Beverages becomes Beverages, Ice Cream & Cold Storage
-- ════════════════════════════════════════════════════════════════════════
--
-- The trade is renamed and rescoped: drinks, ice cream and the cold
-- chain that keeps both of them cold, which is how this is actually
-- bought at an Indian event. Alcohol service and the liquor-licence path
-- are out of scope for this trade; FSSAI still applies and is the
-- licence that matters for everything on the new list.
--
-- ── The id stays `bar_beverages` ──────────────────────────────────────
--
-- It is an internal key appearing in 51 places across generated
-- artifacts, these two typed tables, the catalogue seed, the pictogram
-- sprites and the verification requirements. Renaming it would touch
-- every one of them to change nothing anybody reads, and missing one
-- leaves a trade that silently stops resolving. Only the display name
-- changed, which is the part a partner or customer sees.
--
-- SAFE ON DATA: checked before writing — 0 profiles, 0 items, 0 listing
-- versions and 0 vendor_services under this trade, so no partner's work
-- is invalidated. The allergens conversion still preserves a sentence as
-- a one-element array rather than discarding it.

update public.sambramo_trade_registry
   set name = 'Beverages, Ice Cream & Cold Storage'
 where id = 'bar_beverages';

alter table public.partner_bar_beverages_profiles
  add column if not exists service_lines            TEXT[],
  add column if not exists counters                 NUMERIC,
  add column if not exists staff                    NUMERIC,
  add column if not exists own_cold_storage         BOOLEAN,
  add column if not exists freezer_capacity_litres  NUMERIC,
  add column if not exists backup_power             BOOLEAN,
  add column if not exists cold_hold_hours          NUMERIC;

alter table public.partner_bar_beverages_items
  add column if not exists needs_freezer BOOLEAN;

alter table public.partner_bar_beverages_items
  alter column allergens type text[]
    using case
      when allergens is null or btrim(allergens) = '' then null
      else array[btrim(allergens)]
    end;

comment on table public.partner_bar_beverages_profiles
  is 'Beverages, Ice Cream & Cold Storage. The table name keeps the original trade id on purpose; see migration 185.';
comment on column public.partner_bar_beverages_profiles.cold_hold_hours
  is 'How long the partner can hold goods cold at a venue. The cold chain is what fails loudly and late, so it is asked rather than assumed.';
comment on column public.partner_bar_beverages_items.allergens
  is 'NULL = not declared. Empty array = declared none. Never default this; see src/data/allergens.js.';
