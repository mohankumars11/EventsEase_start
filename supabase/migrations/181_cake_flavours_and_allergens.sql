-- ════════════════════════════════════════════════════════════════════════
-- 181 — Cake & Desserts: flavour and allergens become sets, not prose
-- ════════════════════════════════════════════════════════════════════════
--
-- The product catalogue asked for flavour and allergens as free text. No
-- two bakers spelt butterscotch, black forest or rasmalai the same way,
-- so a customer filtering for eggless chocolate found whoever happened
-- to type those words.
--
-- Allergens matter more than matching. A free-text allergen box is a
-- safety question answered in prose — the one form of that answer that
-- cannot be filtered, warned on, or acted upon. Both are multi-selects
-- now, against a fixed list with "Other".
--
-- `size` stays TEXT: it became a single-select, which is still one value.
-- `name` is already nullable, so nothing is needed for it becoming
-- optional — payload.js composes a name from type, flavour and size when
-- the baker leaves it blank.
--
-- SAFE ON DATA: the table was verified empty before this was written,
-- and the conversion keeps a sentence as a one-element array rather than
-- discarding it. As with 180, migration 173 is left saying what was
-- pasted; this is the delta.

alter table public.partner_cake_desserts_items
  alter column flavour type text[]
    using case
      when flavour is null or btrim(flavour) = '' then null
      else array[btrim(flavour)]
    end;

alter table public.partner_cake_desserts_items
  alter column allergens type text[]
    using case
      when allergens is null or btrim(allergens) = '' then null
      else array[btrim(allergens)]
    end;

comment on column public.partner_cake_desserts_items.flavour
  is 'One or more flavours, from the trade file FLAVOURS, plus "Other".';
comment on column public.partner_cake_desserts_items.allergens
  is 'Declared allergens from the trade file ALLERGENS. "None of these" is a real answer; an empty array is not the same as a declared none.';
