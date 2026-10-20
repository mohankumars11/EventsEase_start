-- ════════════════════════════════════════════════════════════════════════
-- 182 — Allergens on a catering menu, and on a master dish
-- ════════════════════════════════════════════════════════════════════════
--
-- sambramo_catering_menus carried `diet` (veg / non_veg / jain / …) and
-- nothing else. Diet is a preference; an allergen is a hospital visit,
-- and the two were being treated as the same question.
--
-- ── NULL IS NOT AN EMPTY ARRAY ──────────────────────────────────────────
--
-- The most dangerous thing this table could do is tell a customer "no
-- allergens" about a menu nobody was ever asked about. So:
--
--     NULL   nobody has declared anything. Say so, out loud.
--     '{}'   the partner was asked and answered "none of these".
--     {...}  the partner declared these.
--
-- That is why the column is nullable with NO default. A default of '{}'
-- would silently convert every one of the existing menus into a
-- declaration of safety that no human made. src/data/allergens.js holds
-- the matching rule for the client, and allergenLabel() is the only
-- function allowed to decide what a reader sees.
--
-- ── WHY THE MENU AND NOT THE DISH ──────────────────────────────────────
--
-- A master dish is shared by every caterer in the country; whether it
-- contains nuts depends on the kitchen that cooks it. The declaration
-- therefore belongs to the partner's menu, where the person answering
-- knows the recipe. The master-dish column exists for curation — a
-- Sambramo-reviewed default — and is deliberately left empty for now
-- rather than being guessed from dish names, which for a safety field is
-- the worst possible source.

alter table public.sambramo_catering_menus
  add column if not exists allergens text[],
  add column if not exists allergen_note text;

comment on column public.sambramo_catering_menus.allergens is
  'NULL = not declared. ''{}'' = partner answered "none of these". Never default this.';
comment on column public.sambramo_catering_menus.allergen_note is
  'Free text BESIDE the list, never instead of it — "nut-free on request", and so on.';

alter table public.sambramo_master_dishes
  add column if not exists allergens text[];

comment on column public.sambramo_master_dishes.allergens is
  'Sambramo-curated default, NULL until a human reviews the dish. A partner''s menu declaration always wins over this.';

-- ── The writer ─────────────────────────────────────────────────────────
-- Same function as 20261010_14, with two columns added to the menu
-- insert. Everything else is unchanged and is repeated verbatim because
-- CREATE OR REPLACE takes the whole body.
--
-- `jsonb_typeof(...) = 'array'` is what preserves the distinction: a
-- payload that omits `allergens` writes NULL, a payload that sends []
-- writes '{}'. coalesce(..., '{}') would have destroyed exactly the
-- difference this migration exists to keep.

create or replace function public.sambramo_write_catering(p_version uuid, p jsonb, p_trade text)
returns void language plpgsql security definer set search_path = public
as $$
declare m jsonb; it jsonb; c jsonb; v_menu uuid; v_counter uuid; k text; n integer;
begin
  for m in select * from jsonb_array_elements(coalesce(p->'menus', '[]'::jsonb)) loop
    insert into public.sambramo_catering_menus (
      listing_version_id, menu_key, sort_order, name, description, cuisine_ids, diet, service_style, event_types,
      min_guests, max_guests, lead_days, price_model, take_home_paise, customer_paise,
      child_take_home_paise, child_customer_paise, extra_guest_take_home_paise, extra_guest_customer_paise,
      fixed_scope, included_services, status, allergens, allergen_note
    ) values (
      p_version, m->>'menu_key', coalesce((m->>'sort_order')::integer, 0), trim(m->>'name'), nullif(m->>'description', ''),
      coalesce(array(select jsonb_array_elements_text(m->'cuisine_ids')), '{}'), coalesce(nullif(m->>'diet', ''), 'veg'),
      nullif(m->>'service_style', ''), coalesce(array(select jsonb_array_elements_text(m->'event_types')), '{}'),
      nullif(m->>'min_guests', '')::integer, nullif(m->>'max_guests', '')::integer, coalesce(nullif(m->>'lead_days', '')::integer, 0),
      m->>'price_model', nullif(m->>'take_home_paise', '')::bigint,
      case when nullif(m->>'take_home_paise', '') is not null then public.sambramo_customer_paise_for((m->>'take_home_paise')::bigint, p_trade) end,
      nullif(m->>'child_take_home_paise', '')::bigint,
      case when nullif(m->>'child_take_home_paise', '') is not null then public.sambramo_customer_paise_for((m->>'child_take_home_paise')::bigint, p_trade) end,
      nullif(m->>'extra_guest_take_home_paise', '')::bigint,
      case when nullif(m->>'extra_guest_take_home_paise', '') is not null then public.sambramo_customer_paise_for((m->>'extra_guest_take_home_paise')::bigint, p_trade) end,
      coalesce(m->'fixed_scope', '{}'::jsonb), coalesce(array(select jsonb_array_elements_text(m->'included_services')), '{}'), 'active',
      case when jsonb_typeof(m->'allergens') = 'array'
           then array(select jsonb_array_elements_text(m->'allergens')) end,
      nullif(m->>'allergen_note', '')
    ) returning id into v_menu;
    for it in select * from jsonb_array_elements(coalesce(m->'items', '[]'::jsonb)) loop
      insert into public.sambramo_catering_menu_items (menu_id, listing_version_id, dish_key, course_group, sort_order, included,
        extra_take_home_paise, extra_customer_paise, portion, required, choice_group, choice_pick, notes)
      values (v_menu, p_version, it->>'dish_key', coalesce(nullif(it->>'course_group', ''), 'other'), coalesce((it->>'sort_order')::integer, 0),
        coalesce((it->>'included')::boolean, true), nullif(it->>'extra_take_home_paise', '')::bigint,
        case when nullif(it->>'extra_take_home_paise', '') is not null then public.sambramo_customer_paise_for((it->>'extra_take_home_paise')::bigint, p_trade) end,
        nullif(it->>'portion', ''), coalesce((it->>'required')::boolean, true), nullif(it->>'choice_group', ''),
        nullif(it->>'choice_pick', '')::integer, nullif(it->>'notes', ''));
    end loop;
  end loop;
  for c in select * from jsonb_array_elements(coalesce(p->'counters', '[]'::jsonb)) loop
    insert into public.sambramo_live_counters (listing_version_id, counter_key, sort_order, counter_type, name, description, cuisine_ids,
      included_servings, serving_capacity, duration_hours, chefs, equipment, power_water, space_required, setup_minutes, dismantle_minutes,
      indoor_outdoor, lead_days, available_qty, price_model, take_home_paise, customer_paise, extra_serving_take_home_paise, extra_hour_take_home_paise, status)
    values (p_version, c->>'counter_key', coalesce((c->>'sort_order')::integer, 0), coalesce(nullif(c->>'counter_type', ''), 'Custom'), trim(c->>'name'),
      nullif(c->>'description', ''), coalesce(array(select jsonb_array_elements_text(c->'cuisine_ids')), '{}'),
      nullif(c->>'included_servings', '')::integer, nullif(c->>'serving_capacity', '')::integer, nullif(c->>'duration_hours', '')::numeric,
      coalesce(nullif(c->>'chefs', '')::integer, 1), nullif(c->>'equipment', ''), nullif(c->>'power_water', ''), nullif(c->>'space_required', ''),
      coalesce(nullif(c->>'setup_minutes', '')::integer, 0), coalesce(nullif(c->>'dismantle_minutes', '')::integer, 0),
      coalesce(nullif(c->>'indoor_outdoor', ''), 'both'), coalesce(nullif(c->>'lead_days', '')::integer, 0), coalesce(nullif(c->>'available_qty', '')::integer, 1),
      c->>'price_model', nullif(c->>'take_home_paise', '')::bigint,
      case when nullif(c->>'take_home_paise', '') is not null then public.sambramo_customer_paise_for((c->>'take_home_paise')::bigint, p_trade) end,
      nullif(c->>'extra_serving_take_home_paise', '')::bigint, nullif(c->>'extra_hour_take_home_paise', '')::bigint, 'active')
    returning id into v_counter;
    n := 0;
    foreach k in array array(select jsonb_array_elements_text(coalesce(c->'dish_keys', '[]'::jsonb))) loop
      n := n + 1;
      insert into public.sambramo_live_counter_items (counter_id, dish_key, sort_order) values (v_counter, k, n) on conflict do nothing;
    end loop;
  end loop;
end;
$$;
revoke all on function public.sambramo_write_catering(uuid, jsonb, text) from public, anon, authenticated;
