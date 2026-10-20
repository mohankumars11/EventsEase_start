-- ════════════════════════════════════════════════════════════════════════
-- 180 — Bridal Makeup & Hair: inclusions become choices, not prose
-- ════════════════════════════════════════════════════════════════════════
--
-- The catalogue asked "What the customer gets" and "Products / materials
-- included" as free text. In practice that produced two or three words
-- per listing, and a family cannot compare two artists on two words.
-- Both are now multi-selects, so the answer is a set of known values,
-- and a third question records what a customer may ask to be changed.
--
-- The three columns here are the typed mirror of the trade file. When
-- they disagree, scripts/check-trade-profile-schema.mjs fails; it is the
-- reason this migration exists rather than being left for later.
--
-- SAFE ON DATA: both existing columns were verified empty before this
-- was written, but the conversion does not depend on that — a non-empty
-- sentence becomes a one-element array rather than being discarded.

alter table public.partner_bridal_makeup_hair_items
  alter column deliverables type text[]
    using case
      when deliverables is null or btrim(deliverables) = '' then null
      else array[btrim(deliverables)]
    end;

alter table public.partner_bridal_makeup_hair_items
  alter column materials_included type text[]
    using case
      when materials_included is null or btrim(materials_included) = '' then null
      else array[btrim(materials_included)]
    end;

alter table public.partner_bridal_makeup_hair_items
  add column if not exists customisations text[];

comment on column public.partner_bridal_makeup_hair_items.deliverables
  is 'What the customer gets — chosen from the trade file INCLUSIONS, plus "Other".';
comment on column public.partner_bridal_makeup_hair_items.materials_included
  is 'Products included — never the artist''s own kit, which is equipment.';
comment on column public.partner_bridal_makeup_hair_items.customisations
  is 'What a customer may ask to be changed: coverage, shade, reference photo.';

-- ────────────────────────────────────────────────────────────────────────
-- A NOTE FOR WHOEVER RUNS THE GENERATOR NEXT
-- ────────────────────────────────────────────────────────────────────────
--
-- scripts/build-trade-profile-schema.mjs regenerates 173 from the trade
-- files, so it will now want to write TEXT[] into 173 directly. That
-- diff is deliberately discarded: 173 is already pasted into the live
-- database and has to keep saying what was pasted. This file is the
-- delta. Running both in order on a fresh database gives the same shape,
-- because every statement above is idempotent.
