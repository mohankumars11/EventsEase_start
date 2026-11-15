-- ════════════════════════════════════════════════════════════════════
-- 208 · Experience tiers: what a customer means by "Complete Story",
--       and which of a partner's real packages actually delivers it.
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 20261009_02
-- (sambramo_trade_packages), 20261010_02 (listing versions).
--
-- ── The problem with "Signature" ────────────────────────────────────
-- Every one of the 240 partner packages was generated from Sambramo's own
-- template (src/lib/tierPackages.js, 20261009): Essential = the partner's
-- MINIMUM hours, Signature = twice that, VIP = their MAXIMUM. Tiers are
-- relative to each partner, so one photographer's "Signature" is 2 hours
-- and another's is 8. resolve_booking then picks a package by that label
-- alone (commercial_inputs->>'tier' = 'SIGNATURE').
--
-- The brief rules that out in so many words: "Do not assume that two
-- partner packages are equivalent merely because they share the name
-- Signature … The tier name alone is never sufficient."
--
-- ── What this adds ──────────────────────────────────────────────────
-- An ABSOLUTE experience per trade, owned by Sambramo and editable by an
-- admin — "Complete Story" = at least 4 hours — and one function that
-- says whether a given partner package delivers it, judged on the
-- package's real hours and inclusions, never on its label. A partner's
-- "Essential" can deliver "Complete Story" if it is long enough; their
-- "VIP" may not, if it is short.
--
-- ── What it can judge on, honestly ──────────────────────────────────
-- Exactly what partners declared: duration_hours, and inclusions (album,
-- prints, same_day, drone for photography; custom_script, pre_event_call
-- for an anchor). Packages carry no team size, no edited-photo count, no
-- equipment list, so no tier here claims any of those. The customer copy
-- below promises hours and named inclusions and nothing more. Adding
-- team size and deliverables to the Pricing Studio is how a tier gets to
-- say more — not writing it into the copy.
--
-- ── What is NOT changed ─────────────────────────────────────────────
-- No partner package is edited, renamed or re-tiered (the 12 named "Vip"
-- stay "Vip": the label is the partner's). resolve_booking is untouched:
-- each listing has at most one LIVE package per tier (checked 2026-11-03:
-- 219 LIVE, 0 duplicate pairs), so asking for the chosen package's own
-- label prices exactly that package — and api/_lib/anchorBook.js refuses
-- the booking if the package it priced is not the one that was chosen.
-- ════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.sambramo_experience_tiers (
  trade_id text not null references public.sambramo_trade_registry(id) on delete cascade,
  tier text not null check (tier in ('ESSENTIAL', 'SIGNATURE', 'VIP')),
  name text not null check (length(trim(name)) between 1 and 40),     -- "Complete Story"
  line text check (line is null or length(line) <= 140),              -- what it means, in a sentence
  -- How a partner meets it:
  --   PARTNER_PACKAGE       one of their real packages qualifies on hours + inclusions
  --   VISUAL_SPECIFICATION  no package can say it (décor) — it travels with the
  --                         request as the customer's intent, and the partner quotes
  model text not null default 'PARTNER_PACKAGE' check (model in ('PARTNER_PACKAGE', 'VISUAL_SPECIFICATION')),
  min_hours numeric check (min_hours is null or min_hours > 0),
  required_inclusions text[] not null default '{}',
  sort integer not null default 0,
  active boolean not null default true,
  version integer not null default 1,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (trade_id, tier),
  check (model = 'VISUAL_SPECIFICATION' or min_hours is not null)
);

-- An edit is a new version, so a booking's snapshot names exactly the
-- definition the customer chose against (the same pattern as 200's menus).
create or replace function public.sambramo_experience_tier_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if tg_op = 'UPDATE' and (new.name, new.line, new.model, new.min_hours, new.required_inclusions, new.active)
     is distinct from (old.name, old.line, old.model, old.min_hours, old.required_inclusions, old.active) then
    new.version := old.version + 1;
  end if;
  return new;
end $$;
drop trigger if exists sambramo_experience_tier_touch on public.sambramo_experience_tiers;
create trigger sambramo_experience_tier_touch before update on public.sambramo_experience_tiers
  for each row execute function public.sambramo_experience_tier_touch();

alter table public.sambramo_experience_tiers enable row level security;
drop policy if exists experience_tiers_read on public.sambramo_experience_tiers;
create policy experience_tiers_read on public.sambramo_experience_tiers for select to anon, authenticated
  using (active or public.get_my_role() = 'admin');
drop policy if exists experience_tiers_admin on public.sambramo_experience_tiers;
create policy experience_tiers_admin on public.sambramo_experience_tiers for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- ═══ The starting definitions ════════════════════════════════════════
-- Names for photography, décor, DJ and makeup are the brief's own; the
-- rest follow the same pattern. Minimum hours are DEFAULTS FOR MOHAN TO
-- CONFIRM — admin-editable, and a change is a new version. Inserted only
-- if missing: re-running this file never overwrites an admin's edit.
--
-- Each line says what is actually checked against the partner's package
-- (hours, named inclusions) and nothing it cannot check.
insert into public.sambramo_experience_tiers (trade_id, tier, name, line, model, min_hours, required_inclusions, sort) values
  ('photography', 'ESSENTIAL', 'Important Moments',    'The moments that matter most, covered properly — at least 2 hours.', 'PARTNER_PACKAGE', 2, '{}', 1),
  ('photography', 'SIGNATURE', 'Complete Story',       'The celebration from start to finish — at least 4 hours.', 'PARTNER_PACKAGE', 4, '{}', 2),
  ('photography', 'VIP',       'Cinematic Experience', 'At least 6 hours, with a printed album to keep.', 'PARTNER_PACKAGE', 6, '{album}', 3),

  ('videography', 'ESSENTIAL', 'Highlights Film',      'A short film of the best moments — at least 2 hours of filming.', 'PARTNER_PACKAGE', 2, '{}', 1),
  ('videography', 'SIGNATURE', 'Full Film',            'The whole event on film — at least 4 hours.', 'PARTNER_PACKAGE', 4, '{}', 2),
  ('videography', 'VIP',       'Cinematic Film',       'The longest coverage — at least 6 hours of filming.', 'PARTNER_PACKAGE', 6, '{}', 3),

  ('dj_music', 'ESSENTIAL', 'Essential Beats',         'A DJ for the main stretch of the party — at least 2 hours.', 'PARTNER_PACKAGE', 2, '{}', 1),
  ('dj_music', 'SIGNATURE', 'Party Experience',        'A longer set that keeps the floor full — at least 3 hours.', 'PARTNER_PACKAGE', 3, '{}', 2),
  ('dj_music', 'VIP',       'Premium Production',      'The longest set, for a party that goes late — at least 4 hours.', 'PARTNER_PACKAGE', 4, '{}', 3),

  ('live_entertainment', 'ESSENTIAL', 'One Act',       'A single performance — at least 1 hour.', 'PARTNER_PACKAGE', 1, '{}', 1),
  ('live_entertainment', 'SIGNATURE', 'Full Show',     'A full show — at least 2 hours.', 'PARTNER_PACKAGE', 2, '{}', 2),
  ('live_entertainment', 'VIP',       'Headline Show', 'The headline of the evening — at least 3 hours.', 'PARTNER_PACKAGE', 3, '{}', 3),

  ('anchor_mc', 'ESSENTIAL', 'Host the Key Moments',   'An anchor for the main programme — at least 2 hours.', 'PARTNER_PACKAGE', 2, '{}', 1),
  ('anchor_mc', 'SIGNATURE', 'Run the Whole Show',     'The whole programme, start to finish — at least 4 hours.', 'PARTNER_PACKAGE', 4, '{}', 2),
  ('anchor_mc', 'VIP',       'Signature Host',         'At least 6 hours, with a script written for your event.', 'PARTNER_PACKAGE', 6, '{custom_script}', 3),

  ('bridal_makeup_hair', 'ESSENTIAL', 'Elegant Essentials', 'A polished look — at least 1 hour with the artist.', 'PARTNER_PACKAGE', 1, '{}', 1),
  ('bridal_makeup_hair', 'SIGNATURE', 'Signature Look',     'A fuller look, with more time in the chair — at least 2 hours.', 'PARTNER_PACKAGE', 2, '{}', 2),
  ('bridal_makeup_hair', 'VIP',       'Luxury Glam',        'The most time with the artist — at least 3 hours.', 'PARTNER_PACKAGE', 3, '{}', 3),

  ('mehendi_artist', 'ESSENTIAL', 'Simple & Elegant',   'A graceful design — at least 1 hour with the artist.', 'PARTNER_PACKAGE', 1, '{}', 1),
  ('mehendi_artist', 'SIGNATURE', 'Signature Designs',  'Fuller, more detailed designs — at least 2 hours.', 'PARTNER_PACKAGE', 2, '{}', 2),
  ('mehendi_artist', 'VIP',       'Bridal Masterpiece', 'The most intricate work — at least 3 hours.', 'PARTNER_PACKAGE', 3, '{}', 3),

  -- Décor has no tier packages (its listings price by catalogue item and
  -- quote), so a tier here is the customer's intent, sent to the
  -- decorator with the request — never a claim that a package matches.
  ('decoration_floral', 'ESSENTIAL', 'Beautiful Basics',   'A simple, pretty setup where it matters most.', 'VISUAL_SPECIFICATION', null, '{}', 1),
  ('decoration_floral', 'SIGNATURE', 'Signature Styling',  'A styled stage and entrance that carry your theme.', 'VISUAL_SPECIFICATION', null, '{}', 2),
  ('decoration_floral', 'VIP',       'Grand Celebration',  'The whole venue, transformed.', 'VISUAL_SPECIFICATION', null, '{}', 3)
on conflict (trade_id, tier) do nothing;

-- ═══ Does this package deliver this experience? ══════════════════════
/* Judged on the package's real hours and inclusions — never its label.
   `p_hours` is what the customer asked for, when they asked for more than
   the experience's minimum: a 4-hour package does not deliver "Complete
   Story" to a customer who wants 6.

   Returns the gaps rather than a bare no, so the customer can be told WHY
   an offer is an alternative ("2 hours shorter", "no printed album") —
   the brief's "clearly labelled alternative", never a silent promotion. */
create or replace function public.sambramo_package_fit(
  p_package_id uuid, p_trade_id text, p_tier text, p_hours numeric default null)
returns table (qualifies boolean, gaps jsonb, tier_version integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_t public.sambramo_experience_tiers;
  v_status text; v_lv_trade text; v_ti jsonb; v_ci jsonb;
  v_gaps jsonb := '[]'::jsonb;
  v_need numeric; v_have numeric;
  v_inc text[];
  x text;
begin
  select * into v_t from public.sambramo_experience_tiers
   where trade_id = p_trade_id and tier = upper(p_tier) and active;
  if not found then
    return query select false, jsonb_build_array(jsonb_build_object('need', 'experience', 'want', p_tier)), null::integer; return;
  end if;
  -- Décor and the like: no package can say it. The customer's intent goes
  -- with the request and the partner quotes against it.
  if v_t.model <> 'PARTNER_PACKAGE' then
    return query select false, jsonb_build_array(jsonb_build_object('need', 'quote')), v_t.version; return;
  end if;

  select p.status, lv.trade_id, p.trade_inputs, p.commercial_inputs into v_status, v_lv_trade, v_ti, v_ci
    from public.sambramo_trade_packages p
    join public.sambramo_listing_versions lv on lv.id = p.listing_version_id
   where p.id = p_package_id;
  if not found then
    return query select false, jsonb_build_array(jsonb_build_object('need', 'package')), v_t.version; return;
  end if;

  if v_status <> 'LIVE' then
    v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('need', 'live', 'have', v_status));
  end if;
  if v_lv_trade is distinct from p_trade_id then
    v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('need', 'trade', 'want', p_trade_id, 'have', v_lv_trade));
  end if;

  v_need := greatest(v_t.min_hours, coalesce(p_hours, 0));
  v_have := nullif(v_ti->>'duration_hours', '')::numeric;
  if v_have is null or v_have < v_need then
    v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('need', 'hours', 'want', v_need, 'have', v_have));
  end if;

  v_inc := array(select jsonb_array_elements_text(
    case when jsonb_typeof(v_ci->'inclusions') = 'array' then v_ci->'inclusions' else '[]'::jsonb end));
  foreach x in array v_t.required_inclusions loop
    if not (x = any(v_inc)) then
      v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('need', 'inclusion', 'want', x));
    end if;
  end loop;

  return query select jsonb_array_length(v_gaps) = 0, v_gaps, v_t.version;
end $$;
grant execute on function public.sambramo_package_fit(uuid, text, text, numeric) to anon, authenticated;

commit;

-- ════════════════════════════════════════════════════════════════════
-- VERIFY:  node --env-file=.env scripts/check-experience-tiers-live.mjs
-- ════════════════════════════════════════════════════════════════════
-- -- the definitions
-- select trade_id, tier, name, model, min_hours, required_inclusions from sambramo_experience_tiers order by trade_id, sort;
-- -- how many of each trade's live listings can deliver each experience today
-- select t.trade_id, t.name,
--        count(distinct p.listing_version_id) filter (where f.qualifies) as listings_that_deliver
--   from sambramo_experience_tiers t
--   join sambramo_listing_versions lv on lv.trade_id = t.trade_id and lv.status = 'LIVE'
--   join sambramo_trade_packages p on p.listing_version_id = lv.id and p.status = 'LIVE'
--   cross join lateral sambramo_package_fit(p.id, t.trade_id, t.tier) f
--  where t.model = 'PARTNER_PACKAGE'
--  group by t.trade_id, t.name, t.sort order by t.trade_id, t.sort;
--
-- ── Rollback ────────────────────────────────────────────────────────
-- drop function if exists sambramo_package_fit(uuid, text, text, numeric);
-- drop table if exists sambramo_experience_tiers;
-- drop function if exists sambramo_experience_tier_touch();
