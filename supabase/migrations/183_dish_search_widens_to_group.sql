-- ════════════════════════════════════════════════════════════════════════
-- 183 — A course that is empty for a sub-cuisine falls back to its region
-- ════════════════════════════════════════════════════════════════════════
--
-- Reported from the app: tapping Starters or Main course lists nothing
-- for most cuisines. Measured against this database, it is not a
-- rendering bug — 112 of the 115 active cuisines have no dish at all in
-- at least one key course. tn_chettinad has nine dishes and every one of
-- them is a main gravy, so its Starters tab is genuinely empty.
--
-- There are two causes and this migration fixes one of them.
--
-- ── CAUSE 1: the filter is narrower than the taxonomy ──────────────────
--
-- `p_cuisine = any(d.cuisine_ids)` demands that a dish literally carry
-- the sub-cuisine. But the taxonomy splits Tamil Nadu into eleven
-- sub-cuisines, and whoever entered the dishes filed most of them under
-- tn_traditional. A Medhu Vadai is not "not a Chettinad starter" — it is
-- a Tamil starter that nobody tagged eleven ways.
--
-- So a cuisine filter now matches any cuisine in the same GROUP, with
-- exact matches ranked first, so a Chettinad caterer sees Chettinad
-- dishes at the top and the rest of Tamil Nadu beneath them instead of
-- an empty screen. Nothing is invented: everything shown belongs to the
-- regional family that was asked for. `p_strict_cuisine => true` keeps
-- the old behaviour for any caller that needs it.
--
-- ── CAUSE 2: the catalogue is genuinely thin ───────────────────────────
--
-- Widening does not create a Tamil bread where the database holds none.
-- The authoring is separate work and this migration does not pretend to
-- do it; what it does is stop a thin cell from reading as a broken app.
--
-- `exact` is returned so the client can label the second group honestly
-- rather than implying every row is Chettinad.

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
                     else d.cuisine_ids && fam.ids end))
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

-- The 7-argument version is dropped so no caller silently keeps the old
-- narrow behaviour: PostgREST would otherwise resolve to whichever
-- overload matched the arguments it was sent.
drop function if exists public.search_master_dishes(text, text, text, text, text, integer, integer);
