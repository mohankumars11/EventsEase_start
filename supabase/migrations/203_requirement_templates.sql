-- ════════════════════════════════════════════════════════════════════
-- 203 · Requirement templates: the same questions on both sides of the
--       wall, versioned, and checked by the server rather than the phone.
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 202.
-- Rows are loaded afterwards by
--   node --env-file=.env scripts/apply-requirement-templates.mjs --apply
--
-- ── What already exists, and is not being replaced ──────────────────
-- src/customer/lib/needs.js generates every customer question for all 34
-- trades FROM the partner app's own listing definitions
-- (src/data/trades/<trade>.js). That is the right place for them: the
-- options a customer picks are literally the options a partner ticked, so
-- nothing is ever matched on free text, and a new option appears on both
-- sides at once. This file does not copy those questions into the
-- database as a second source of truth.
--
-- ── What is missing, and is what this adds ──────────────────────────
-- Three things the generator cannot give on its own:
--
--   1. A VERSION to answer against. A configuration saved in October was
--      answering October's questions. Without a version recorded beside
--      it, a later edit to the question set silently rewrites the meaning
--      of every stored answer — and of every partner quote given against
--      one.
--
--   2. SERVER-SIDE CHECKING. 202's save takes the phone's word for which
--      mandatory answers are missing. A phone that can say "nothing is
--      missing" can dispatch a half-answered requirement, and — the case
--      the brief calls out by name — a customer who asked for pure
--      vegetarian could end up with a non-vegetarian dish in the payload
--      a caterer quotes against. From here the server decides, and 202's
--      function is replaced at the bottom of this file to use it.
--
--   3. ONE SHAPE A PARTNER CAN BE SHOWN. The partner app must render a
--      requirement from its template, not interpret raw json. Storing the
--      fields with their labels is what lets it do that for a trade whose
--      screens it has never seen.
--
-- So the rows here are GENERATED from the same definitions the app uses,
-- by scripts/apply-requirement-templates.mjs, and carry a fingerprint of
-- what they were generated from. Regenerating after a definition changes
-- creates a NEW version; it never edits a published one.
-- ════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.sambramo_requirement_templates (
  trade_id text not null references public.sambramo_trade_registry(id) on delete cascade,
  version integer not null,
  -- [{ key, title, kind, group, required, options: [{value, label}], unit, max }]
  -- `kind` is the app's own: single | multi | toggle | dishes | text | number.
  fields jsonb not null default '[]'::jsonb,
  required_keys text[] not null default '{}',
  -- A hash of the generated field set. Two runs of the generator over
  -- unchanged definitions produce the same fingerprint, so re-running is
  -- free; a changed definition produces a different one and earns a new
  -- version rather than quietly mutating this one.
  source_fingerprint text not null,
  published boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  primary key (trade_id, version)
);

-- Exactly one published version per trade: what "the current questions"
-- means has to be a single row, or two screens can disagree.
create unique index if not exists uq_requirement_template_published
  on public.sambramo_requirement_templates (trade_id) where published;

comment on table public.sambramo_requirement_templates is
  'Generated from src/data/trades/<trade>.js via needs.js by scripts/apply-requirement-templates.mjs — never hand-edited. The app still reads its questions from the generated code; these rows exist so a stored answer can name the version it answered and so the server can check it.';

/* The published template for a trade, or null. */
create or replace function public.sambramo_current_template(p_trade_id text)
returns public.sambramo_requirement_templates
language sql stable security definer set search_path = public as $$
  select * from public.sambramo_requirement_templates
   where trade_id = p_trade_id and published limit 1
$$;
grant execute on function public.sambramo_current_template(text) to anon, authenticated;

-- ═══ Checking a configuration ════════════════════════════════════════
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

  -- ── The dietary rule, enforced here and not only in the UI ────────
  -- The brief is explicit: a customer who chose pure vegetarian must not
  -- be able to get a non-vegetarian dish into the payload a caterer
  -- quotes against — not through search, not through a substitution, not
  -- through a tampered request. And an UNREVIEWED dish is not vegetarian:
  -- `suggested_diet` is a suggestion until review_status says otherwise,
  -- and 28 dishes in the catalogue have no diet recorded at all.
  -- `$diet` is a multi-select, so normally an array — but normalise anyway
  -- rather than let `?|` decide what a bare string means.
  if p_config ? '$dishes' and jsonb_typeof(p_config->'$dishes') = 'array'
     and exists (select 1 from jsonb_array_elements_text(
           case when jsonb_typeof(p_config->'$diet') = 'array' then p_config->'$diet'
                when jsonb_typeof(p_config->'$diet') = 'string' then jsonb_build_array(p_config->'$diet')
                else '[]'::jsonb end) d where d in ('veg', 'vegan', 'jain')) then
    select coalesce(array_agg(d.id), '{}') into v_bad
      from public.sambramo_master_dishes d
     where d.id in (select jsonb_array_elements_text(p_config->'$dishes'))
       and (d.suggested_diet is distinct from 'veg' or d.review_status <> 'reviewed');
    if cardinality(v_bad) > 0 then
      v_invalid := v_invalid || jsonb_build_object('key', '$dishes', 'reason', 'not_verified_vegetarian', 'values', to_jsonb(v_bad));
    end if;
  end if;

  return query select v_missing, v_invalid;
end $$;
grant execute on function public.sambramo_validate_requirement(text, jsonb) to authenticated;

-- ═══ The save, with the server deciding ══════════════════════════════
-- Which template version an answer answered, recorded beside it.
alter table public.event_plan_services
  add column if not exists template_version integer;

/* Replaces 202's version of this function.

   The difference is the whole point of this file: `p_missing` is gone.
   202 took the phone's word for what was still missing, which meant a
   phone could say "nothing" and dispatch a half-answered requirement.
   Now the server works it out from the published template, refuses
   anything the template does not allow, and stamps the version the
   answers were given against. */
drop function if exists public.sambramo_save_requirement_config(uuid, jsonb, text[]);

create or replace function public.sambramo_save_requirement_config(p_plan_service_id uuid, p_config jsonb)
returns table (out_code text, out_state text, out_version integer, out_missing text[])
language plpgsql security definer set search_path = public as $$
declare
  v_row public.event_plan_services;
  v_missing text[];
  v_invalid jsonb;
  v_tv integer;
  v_code text; v_state text; v_version integer;
begin
  if auth.uid() is null then raise exception 'sign in to save a requirement' using errcode = '42501'; end if;

  select s.* into v_row from public.event_plan_services s
    join public.event_plans p on p.id = s.plan_id
   where s.id = p_plan_service_id and p.customer_id = auth.uid();
  if not found then raise exception 'not your requirement' using errcode = '42501'; end if;

  if v_row.state = 'dispatched' then
    raise exception 'this requirement is already with partners — ask for a revision instead' using errcode = '22023';
  end if;

  select v.missing, v.invalid into v_missing, v_invalid
    from public.sambramo_validate_requirement(v_row.trade_id, coalesce(p_config, '{}'::jsonb)) v;

  -- An impossible answer is not a "detail missing" — it cannot have come
  -- from the app, so it is refused rather than stored and worked around.
  if jsonb_array_length(coalesce(v_invalid, '[]'::jsonb)) > 0 then
    raise exception 'that choice is not available: %', v_invalid::text using errcode = '22023';
  end if;

  select version into v_tv from public.sambramo_requirement_templates
   where trade_id = v_row.trade_id and published limit 1;

  update public.event_plan_services s set
    config = coalesce(p_config, '{}'::jsonb),
    missing_fields = coalesce(v_missing, '{}'),
    template_version = v_tv,
    config_version = s.config_version + 1,
    config_saved_at = now(),
    decision = case when s.decision in ('recommended', 'later') then 'selected' else s.decision end,
    state = case when coalesce(cardinality(v_missing), 0) = 0 then 'ready' else 'configuring' end,
    ready_at = case when coalesce(cardinality(v_missing), 0) = 0 then now() else null end
   where s.id = p_plan_service_id
   returning s.requirement_code, s.state, s.config_version into v_code, v_state, v_version;

  return query select v_code, v_state, v_version, coalesce(v_missing, '{}');
end $$;
grant execute on function public.sambramo_save_requirement_config(uuid, jsonb) to authenticated;

-- ═══ Access ══════════════════════════════════════════════════════════
-- Templates are public reading: a customer's phone and a partner's phone
-- both render from them, and there is nothing private in a question.
-- Only an admin writes, and the generator runs as the service role.
alter table public.sambramo_requirement_templates enable row level security;
drop policy if exists requirement_templates_read on public.sambramo_requirement_templates;
create policy requirement_templates_read on public.sambramo_requirement_templates for select to anon, authenticated
  using (published or public.get_my_role() = 'admin');
drop policy if exists requirement_templates_admin on public.sambramo_requirement_templates;
create policy requirement_templates_admin on public.sambramo_requirement_templates for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

commit;

-- ════════════════════════════════════════════════════════════════════
-- VERIFY — paste after the commit, then load the rows with
--   node --env-file=.env scripts/apply-requirement-templates.mjs --apply
--   node --env-file=.env scripts/check-requirement-templates-live.mjs
-- ════════════════════════════════════════════════════════════════════
-- -- one published template per trade, all 34 once the generator has run
-- select count(*) as published_templates from sambramo_requirement_templates where published;
-- select trade_id, version, jsonb_array_length(fields) as fields, cardinality(required_keys) as required
--   from sambramo_requirement_templates where published order by trade_id;
--
-- -- the dietary rule, as the server sees it: a non-veg dish in a veg menu
-- select * from sambramo_validate_requirement('catering_food', jsonb_build_object(
--   '$diet', jsonb_build_array('veg'),
--   '$dishes', (select jsonb_agg(id) from sambramo_master_dishes where suggested_diet = 'non_veg' limit 2)));
-- -- expect invalid = [{"key":"$dishes","reason":"not_verified_vegetarian",...}]
--
-- -- and an unreviewed dish is not vegetarian either
-- select * from sambramo_validate_requirement('catering_food', jsonb_build_object(
--   '$diet', jsonb_build_array('veg'),
--   '$dishes', (select jsonb_agg(id) from sambramo_master_dishes where suggested_diet = 'veg' and review_status <> 'reviewed' limit 1)));
--
-- ── Rollback ────────────────────────────────────────────────────────
-- drop function if exists sambramo_validate_requirement(text,jsonb),
--   sambramo_current_template(text), sambramo_save_requirement_config(uuid,jsonb);
-- alter table event_plan_services drop column if exists template_version;
-- drop table if exists sambramo_requirement_templates;
-- -- then re-paste 202's sambramo_save_requirement_config to restore the
-- -- three-argument version.
