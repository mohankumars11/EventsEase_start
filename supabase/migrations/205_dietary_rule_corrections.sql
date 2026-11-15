-- ════════════════════════════════════════════════════════════════════
-- 205 · The dietary rule, corrected — and the review backlog it exposes.
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 203.
--
-- ── Three things 203 got wrong ──────────────────────────────────────
-- 203 refused a dish from a vegetarian menu unless suggested_diet = 'veg'
-- AND review_status = 'reviewed'. Run against the live catalogue on
-- 2026-11-03, that was wrong three ways:
--
--   1. VEGAN AND JAIN DISHES WERE REFUSED FROM A VEG MENU. The catalogue
--      has suggested_diet values 'vegan' (22) and 'jain' (21) as well as
--      'veg'. Both are strictly vegetarian; `= 'veg'` threw them out.
--   2. A MIXED MENU WAS TREATED AS VEG. $diet is a multi-select. A
--      customer who ticked vegetarian AND non-vegetarian got the veg
--      restriction, so their non-veg dishes were refused.
--   3. vegan_verified / jain_verified (200) WERE IGNORED — the two
--      columns that exist precisely to say a dish has been checked.
--
-- ── What "fits" means now ───────────────────────────────────────────
-- Every dish must fit AT LEAST ONE diet the customer chose:
--   non_veg, mixed  anything — the menu is labelled, not restricted
--   veg             reviewed, and veg / vegan / jain (no egg: "pure
--                   vegetarian" in India excludes it)
--   vegan           vegan_verified, or reviewed and suggested 'vegan'
--   jain            jain_verified,  or reviewed and suggested 'jain'
-- Unreviewed is still not vegetarian. That part of 203 was right, and
-- the brief requires it.
--
-- ── What it exposes, and what this file deliberately does NOT do ────
-- The live catalogue: 684 dishes reviewed-veg, 1,744 veg-but-unreviewed.
-- All 46 of Sambramo's own vegetarian menu templates contain at least one
-- unreviewed dish — 430 distinct dishes. Under this rule none of those
-- menus can be sent to caterers through the requirement path until those
-- dishes are reviewed.
--
-- This file does NOT mark them reviewed, and does not relax the rule for
-- dishes that came from a curated template. Either would be claiming a
-- check nobody made, which is the exact harm the rule prevents: a gravy
-- with fish stock, a cake with egg, served to a guest who trusted
-- "vegetarian". What it adds instead is the backlog as a view, so the
-- review can be done and tracked: sambramo_diet_review_backlog.
--
-- Nothing live breaks meanwhile: Menu Studio saves through
-- save_customer_menu (200), which this rule does not touch.
-- ════════════════════════════════════════════════════════════════════

begin;

/* Does this dish fit at least one of these diets? The single answer
   every food path asks — requirement validation, a caterer's
   substitution, a restaurant's veg filter. An unknown dish fits nothing. */
create or replace function public.sambramo_dish_fits_diets(p_dish_id text, p_diets text[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select bool_or(case diet
      when 'non_veg' then true
      when 'mixed'   then true
      when 'veg'     then d.review_status = 'reviewed' and d.suggested_diet in ('veg', 'vegan', 'jain')
      when 'vegan'   then d.vegan_verified or (d.review_status = 'reviewed' and d.suggested_diet = 'vegan')
      when 'jain'    then d.jain_verified  or (d.review_status = 'reviewed' and d.suggested_diet = 'jain')
      else false end)
      from public.sambramo_master_dishes d, unnest(p_diets) as diet
     where d.id = p_dish_id
  ), false)
$$;
grant execute on function public.sambramo_dish_fits_diets(text, text[]) to anon, authenticated;

/* What is still wrong with this configuration, as the server sees it.

   Returns two lists, because they mean different things to the customer:
     missing  mandatory answers not given yet → "a few details missing",
              the requirement stays `configuring` and is not dispatched
     invalid  answers that are not allowed at all → a bug or a tampered
              client, and the save is refused outright

   An unknown trade returns nothing wrong. That is deliberate: a trade
   whose template has not been generated yet must not become unbookable,
   and 202's guard already refuses anything with config_version = 0. */
create or replace function public.sambramo_validate_requirement(p_trade_id text, p_config jsonb)
returns table (missing text[], invalid jsonb)
language plpgsql stable security definer set search_path = public as $$
declare
  v_t public.sambramo_requirement_templates;
  v_missing text[] := '{}';
  v_invalid jsonb := '[]'::jsonb;
  v_field jsonb;
  v_key text;
  v_given jsonb;
  v_allowed text[];
  v_bad text[];
  v_diets text[];
begin
  select * into v_t from public.sambramo_requirement_templates
   where trade_id = p_trade_id and published limit 1;
  if not found then return query select v_missing, v_invalid; return; end if;

  for v_field in select * from jsonb_array_elements(coalesce(v_t.fields, '[]'::jsonb)) loop
    v_key := v_field->>'key';
    v_given := p_config -> v_key;

    -- Not answered. An empty array and an empty string count as unanswered:
    -- a multi-select the customer opened and closed is not an answer.
    if v_given is null or v_given = 'null'::jsonb
       or (jsonb_typeof(v_given) = 'array'  and jsonb_array_length(v_given) = 0)
       or (jsonb_typeof(v_given) = 'string' and length(trim(v_given #>> '{}')) = 0) then
      if coalesce((v_field->>'required')::boolean, false) then
        v_missing := array_append(v_missing, v_key);
      end if;
      continue;
    end if;

    -- Answered: every value must be one the template offers. Checked only
    -- where there is a list to check against — a free-text note or a
    -- number has none, and `dishes` is checked against the catalogue
    -- below rather than against a frozen option list.
    if v_field->'options' is not null and jsonb_array_length(v_field->'options') > 0
       and v_field->>'kind' in ('single', 'multi') then
      select coalesce(array_agg(o->>'value'), '{}') into v_allowed
        from jsonb_array_elements(v_field->'options') o;
      select coalesce(array_agg(x), '{}') into v_bad
        from jsonb_array_elements_text(case when jsonb_typeof(v_given) = 'array' then v_given else jsonb_build_array(v_given) end) x
       where not (x = any(v_allowed));
      if cardinality(v_bad) > 0 then
        v_invalid := v_invalid || jsonb_build_object('key', v_key, 'reason', 'not_an_option', 'values', to_jsonb(v_bad));
      end if;
    end if;
  end loop;

  -- ── The dietary rule (corrected by 205) ───────────────────────────
  -- Every dish must fit AT LEAST ONE diet the customer chose. Choosing
  -- non-vegetarian or mixed restricts nothing; choosing only vegetarian
  -- diets restricts every dish. sambramo_dish_fits_diets says what "fits"
  -- means, in one place, so Menu Studio, a substitution and a restaurant
  -- filter all give the same answer as this.
  if p_config ? '$dishes' and jsonb_typeof(p_config->'$dishes') = 'array' then
    v_diets := array(select jsonb_array_elements_text(
      case when jsonb_typeof(p_config->'$diet') = 'array' then p_config->'$diet'
           when jsonb_typeof(p_config->'$diet') = 'string' then jsonb_build_array(p_config->'$diet')
           else '[]'::jsonb end));
    if cardinality(v_diets) > 0 then
      select coalesce(array_agg(x), '{}') into v_bad
        from jsonb_array_elements_text(p_config->'$dishes') x
       where not public.sambramo_dish_fits_diets(x, v_diets);
      if cardinality(v_bad) > 0 then
        v_invalid := v_invalid || jsonb_build_object('key', '$dishes', 'reason', 'does_not_fit_diet',
                                                     'diets', to_jsonb(v_diets), 'values', to_jsonb(v_bad));
      end if;
    end if;
  end if;

  return query select v_missing, v_invalid;
end $$;
grant execute on function public.sambramo_validate_requirement(text, jsonb) to authenticated;
-- ═══ The review backlog ══════════════════════════════════════════════
-- Every dish that stands between a Sambramo vegetarian menu and a
-- vegetarian customer: in an active veg / vegan / jain template, and not
-- yet fit for that template's diet. Ordered by how many menus each one
-- unblocks, so the review starts where it pays most.
create or replace view public.sambramo_diet_review_backlog
with (security_invoker = true) as
select d.id as dish_id, d.name, d.suggested_diet, d.review_status,
       count(distinct t.id) as menus_blocked,
       array_agg(distinct t.name order by t.name) as menu_names
  from public.sambramo_menu_templates t
  join public.sambramo_menu_template_items i on i.template_id = t.id
  join public.sambramo_master_dishes d on d.id = i.dish_id
 where t.active and t.diet in ('veg', 'vegan', 'jain')
   and not public.sambramo_dish_fits_diets(d.id, array[t.diet])
 group by d.id, d.name, d.suggested_diet, d.review_status
 order by menus_blocked desc, d.name;

-- Readable by any signed-in user, not only admins: it is built entirely
-- from catalogue data that is already public (dish names, review status,
-- template names), so there is nothing here to protect. It is a work
-- queue for the admin review, which is why anon is kept out of it — not
-- because it is private. security_invoker makes the base tables' own
-- policies apply, so it can never show more than they do.
revoke all on public.sambramo_diet_review_backlog from anon;
grant select on public.sambramo_diet_review_backlog to authenticated;

commit;

-- ════════════════════════════════════════════════════════════════════
-- VERIFY
-- ════════════════════════════════════════════════════════════════════
-- -- vegan and jain dishes now fit a veg menu (expect true where reviewed)
-- select id, suggested_diet, sambramo_dish_fits_diets(id, array['veg'])
--   from sambramo_master_dishes where suggested_diet in ('vegan','jain') and review_status = 'reviewed' limit 5;
-- -- a mixed menu is not restricted (expect true for a non-veg dish)
-- select sambramo_dish_fits_diets((select id from sambramo_master_dishes where suggested_diet = 'non_veg' limit 1),
--                                 array['veg','non_veg']);
-- -- the backlog: how many dishes, and how many menus they block
-- select count(*) as dishes_to_review, sum(menus_blocked) as menu_blocks from sambramo_diet_review_backlog;
-- select dish_id, name, suggested_diet, menus_blocked from sambramo_diet_review_backlog limit 25;
--
-- ── Rollback ────────────────────────────────────────────────────────
-- drop view if exists sambramo_diet_review_backlog;
-- drop function if exists sambramo_dish_fits_diets(text, text[]);
-- -- then re-paste 203's sambramo_validate_requirement.
