-- ════════════════════════════════════════════════════════════════════
-- 207 · Reviewing a dish's diet: one audited act, that says what it
--       certifies — and a queue ordered so menus come back one by one.
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 205.
--
-- ── Why the existing Approve button is not enough ───────────────────
-- Admin → Food catalogue (FoodCatalogueReview.jsx) was built to answer
-- "is this a real dish, spelled right?". Its Approve sets review_status
-- to 'reviewed' and nothing else. Since 205 that same flag is what makes a
-- veg-tagged dish count as VERIFIED vegetarian — so Approve now certifies
-- a diet the screen shows only as small grey text and gives no way to
-- correct. Faced with Butter Naan tagged veg but made with egg, a reviewer
-- could certify it vegetarian (wrong) or hide it from the catalogue
-- (losing it). Neither is a review.
--
-- So a diet review is now one function that takes the VERDICT — veg, egg,
-- non_veg, vegan, jain — sets the tag to it, marks the dish reviewed,
-- keeps contains_egg consistent, and records who said so and when.
--
-- ── Why the queue is per menu ───────────────────────────────────────
-- Measured on the live catalogue (2026-11-03): reviewing the 200 dishes
-- that block the MOST menus unblocks ZERO menus — every veg menu has its
-- own tail of unreviewed dishes. Finishing one menu at a time, closest
-- first: 4 dishes → 1 menu, 31 → 5, 113 → 15, 430 → all 46.
--
-- ── Two different problems, kept apart ──────────────────────────────
--   to_review       not reviewed yet → a reviewer's job
--   wrong_for_menu  reviewed, and it is NOT what the menu says (an egg
--                   dish in a veg menu) → the MENU needs a swap
-- 205's backlog view lumps them together, so a dish reviewed as egg would
-- sit in the review queue forever. It is rebuilt below with `problem`.
-- ════════════════════════════════════════════════════════════════════

begin;

alter table public.sambramo_master_dishes
  add column if not exists diet_reviewed_by uuid,
  add column if not exists diet_reviewed_at timestamptz;

-- Every verdict, kept. Readable by admins; written only by the function.
create table if not exists public.sambramo_dish_diet_reviews (
  id uuid primary key default gen_random_uuid(),
  dish_id text not null references public.sambramo_master_dishes(id) on delete cascade,
  verdict text not null check (verdict in ('veg', 'egg', 'non_veg', 'vegan', 'jain')),
  previous_diet text,
  previous_status text,
  reviewed_by uuid not null,
  reviewed_at timestamptz not null default now(),
  note text check (note is null or length(note) <= 300)
);
create index if not exists sambramo_dish_diet_reviews_dish on public.sambramo_dish_diet_reviews (dish_id, reviewed_at desc);

alter table public.sambramo_dish_diet_reviews enable row level security;
drop policy if exists dish_diet_reviews_admin_read on public.sambramo_dish_diet_reviews;
create policy dish_diet_reviews_admin_read on public.sambramo_dish_diet_reviews for select to authenticated
  using (public.get_my_role() = 'admin');
revoke insert, update, delete on public.sambramo_dish_diet_reviews from anon, authenticated;

/* Certify the diet of one or more dishes. Admins only.

   One call per verdict: the batch tick-list sends many ids with 'veg',
   a careful card sends one id with whatever the reviewer chose. The
   verdict IS the diet — there is no "approve" that leaves the tag as it
   was without saying what it was. Returns how many dishes it changed. */
create or replace function public.sambramo_review_dish_diet(p_dish_ids text[], p_verdict text, p_note text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if auth.uid() is null or public.get_my_role() is distinct from 'admin' then
    raise exception 'only an admin can certify a dish' using errcode = '42501';
  end if;
  if p_verdict not in ('veg', 'egg', 'non_veg', 'vegan', 'jain') then
    raise exception 'unknown diet %', p_verdict using errcode = '22023';
  end if;
  if coalesce(cardinality(p_dish_ids), 0) = 0 then return 0; end if;
  if cardinality(p_dish_ids) > 100 then
    raise exception 'review at most 100 dishes at a time' using errcode = '22023';
  end if;

  insert into public.sambramo_dish_diet_reviews (dish_id, verdict, previous_diet, previous_status, reviewed_by, note)
  select d.id, p_verdict, d.suggested_diet, d.review_status, auth.uid(), p_note
    from public.sambramo_master_dishes d where d.id = any(p_dish_ids);

  update public.sambramo_master_dishes d set
    suggested_diet = p_verdict,
    review_status = 'reviewed',
    -- Keep 200's column honest. Vegan is egg-free; plain veg is "pure
    -- vegetarian", which in India excludes egg too. Non-veg says nothing
    -- about egg either way, so it is left as it was.
    contains_egg = case p_verdict when 'egg' then true
                                  when 'non_veg' then d.contains_egg
                                  else false end,
    diet_reviewed_by = auth.uid(),
    diet_reviewed_at = now(),
    updated_at = now()
   where d.id = any(p_dish_ids);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.sambramo_review_dish_diet(text[], text, text) from public, anon;
grant execute on function public.sambramo_review_dish_diet(text[], text, text) to authenticated;

-- ═══ The queue ═══════════════════════════════════════════════════════
-- 205's backlog, with the problem named. Columns are only appended
-- (create or replace view may not reorder them), so anything reading 205's
-- shape keeps working.
create or replace view public.sambramo_diet_review_backlog
with (security_invoker = true) as
select d.id as dish_id, d.name, d.suggested_diet, d.review_status,
       count(distinct t.id) as menus_blocked,
       array_agg(distinct t.name order by t.name) as menu_names,
       case d.review_status
         when 'needs_review' then 'to_review'       -- a reviewer's job
         when 'rejected'     then 'hidden_dish'     -- hidden from the catalogue, still in a menu
         else 'wrong_for_menu' end as problem        -- reviewed, and not what the menu says
  from public.sambramo_menu_templates t
  join public.sambramo_menu_template_items i on i.template_id = t.id
  join public.sambramo_master_dishes d on d.id = i.dish_id
 where t.active and t.review_status <> 'rejected'   -- what customers can see (200's read policy)
   and t.diet in ('veg', 'vegan', 'jain')
   and not public.sambramo_dish_fits_diets(d.id, array[t.diet])
 group by d.id, d.name, d.suggested_diet, d.review_status
 order by menus_blocked desc, d.name;

/* One row per vegetarian menu: what stands between it and a vegetarian
   customer. The Veg check works down this, closest-to-done first. */
create or replace view public.sambramo_diet_review_by_menu
with (security_invoker = true) as
select t.id as template_id, t.name, t.diet, t.family_id,
       count(*) as dishes,
       count(*) filter (where not f.fits and d.review_status = 'needs_review') as to_review,
       count(*) filter (where not f.fits and d.review_status <> 'needs_review') as needs_swap,
       coalesce(array_agg(d.id order by d.name) filter (where not f.fits and d.review_status = 'needs_review'), '{}') as review_ids,
       coalesce(array_agg(d.id order by d.name) filter (where not f.fits and d.review_status <> 'needs_review'), '{}') as swap_ids
  from public.sambramo_menu_templates t
  join public.sambramo_menu_template_items i on i.template_id = t.id
  join public.sambramo_master_dishes d on d.id = i.dish_id
  cross join lateral (select public.sambramo_dish_fits_diets(d.id, array[t.diet]) as fits) f
 where t.active and t.review_status <> 'rejected'   -- what customers can see (200's read policy)
   and t.diet in ('veg', 'vegan', 'jain')
 group by t.id, t.name, t.diet, t.family_id;

revoke all on public.sambramo_diet_review_by_menu from anon;
grant select on public.sambramo_diet_review_by_menu to authenticated;

commit;

-- ════════════════════════════════════════════════════════════════════
-- VERIFY:  node --env-file=.env scripts/check-dish-diet-review-live.mjs
-- ════════════════════════════════════════════════════════════════════
-- -- how far each veg menu is from usable, closest first
-- select name, dishes, to_review, needs_swap from sambramo_diet_review_by_menu
--  where to_review + needs_swap > 0 order by to_review + needs_swap, name limit 10;
-- -- menus a vegetarian customer can use right now
-- select count(*) filter (where to_review = 0 and needs_swap = 0) as usable, count(*) as veg_menus
--   from sambramo_diet_review_by_menu;
--
-- ── Rollback ────────────────────────────────────────────────────────
-- drop view if exists sambramo_diet_review_by_menu;
-- drop function if exists sambramo_review_dish_diet(text[], text, text);
-- drop table if exists sambramo_dish_diet_reviews;
-- alter table sambramo_master_dishes drop column if exists diet_reviewed_by, drop column if exists diet_reviewed_at;
-- -- then re-paste 205's sambramo_diet_review_backlog (without `problem`).
