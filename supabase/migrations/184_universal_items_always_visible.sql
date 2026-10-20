-- ════════════════════════════════════════════════════════════════════════
-- 184 — Water is water in every cuisine
-- ════════════════════════════════════════════════════════════════════════
--
-- 105 rows in the catalogue carry no cuisine at all: packaged drinking
-- water, mango pickle, roasted papad, tomato ketchup, gunpowder podi.
-- They are not Tamil or Gujarati, they are what goes on every table.
--
-- The search treats a missing cuisine as "matches no cuisine", so the
-- moment a caterer picks their own cuisines — which the picker does for
-- them — every one of these disappears. A caterer looking for the water
-- bottle they supply at every single event could not find it.
--
-- The alternative, tagging water to all 115 cuisines, is worse: it is
-- 115 rows of maintenance per item and it is a lie about what the data
-- means. An empty cuisine set already says the right thing — this is
-- universal — and the filter should read it that way.
--
-- So a cuisine filter now matches:
--     · the cuisine asked for                       (exact, ranked first)
--     · any cuisine in the same region              (183)
--     · anything with no cuisine at all             (this migration)
--
-- `exact` stays false for a universal item, so the client keeps labelling
-- it as not specifically that cuisine, which for salt is both true and
-- unsurprising.
--
-- p_strict_cuisine still means strict: it excludes both the region and
-- the universal items, for any caller that genuinely wants only dishes
-- tagged with that one cuisine.

create or replace function public.search_master_dishes(
  p_q text default null, p_cuisine text default null, p_category text default null,
  p_course text default null, p_diet text default null, p_limit integer default 30, p_offset integer default 0,
  p_strict_cuisine boolean default false
) returns table (id text, name text, aliases text[], cuisine_ids text[], category_id text, course_group text,
                 suggested_diet text, review_status text, exact boolean, total bigint)
language sql stable security invoker set search_path = public, extensions
as $$
  with q as (select nullif(lower(trim(coalesce(p_q, ''))), '') as t),
  fam as (
    select coalesce(array_agg(c2.id), '{}') as ids
      from public.sambramo_cuisines c1
      join public.sambramo_cuisines c2 on c2.group_id = c1.group_id
     where c1.id = p_cuisine
  ),
  hits as (
    select d.*, c.course_group,
           (p_cuisine is not null and p_cuisine = any(d.cuisine_ids)) as is_exact,
           case when q.t is null then 0
                when d.search_text like q.t || '%' then 3
                when d.search_text like '%' || q.t || '%' then 2
                else similarity(d.search_text, q.t) end as score
      from public.sambramo_master_dishes d
      left join public.sambramo_food_categories c on c.id = d.category_id, q, fam
     where d.active and d.review_status <> 'rejected'
       and (q.t is null or d.search_text like '%' || q.t || '%' or d.search_text % q.t)
       and (p_cuisine is null
            or (case when p_strict_cuisine then p_cuisine = any(d.cuisine_ids)
                     else d.cuisine_ids && fam.ids
                          or coalesce(array_length(d.cuisine_ids, 1), 0) = 0 end))
       and (p_category is null or d.category_id = p_category)
       and (p_course is null or c.course_group = p_course)
       and (p_diet is null or d.suggested_diet = p_diet)
  )
  select h.id, h.name, h.aliases, h.cuisine_ids, h.category_id, h.course_group, h.suggested_diet, h.review_status,
         h.is_exact as exact, count(*) over () as total
    from hits h
   order by h.is_exact desc, h.score desc, h.name
   limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset)
$$;

grant execute on function public.search_master_dishes(text, text, text, text, text, integer, integer, boolean) to anon, authenticated;
