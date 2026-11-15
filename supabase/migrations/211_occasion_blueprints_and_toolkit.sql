-- 211 · Personal Celebrations (Category 1): the occasion's own answers, the
-- blueprint version that produced a plan, and the three free toolkit
-- features that did not exist yet — polls, shared budget, schedule.
--
-- What this migration does NOT do, on purpose:
--
--   * It does not create a second occasion catalogue. The 31 occasions,
--     their ids and their order live in the app (src/customer/data/
--     occasions.js) and in sambramo_trade_registry for the trades they
--     map to. Copying them into a table would give us two truths.
--   * It does not duplicate invitations, invitation_guests or
--     invitation_circle_messages. Four of the seven free features are
--     those tables, already live; this adds the missing three and links
--     them to the same event (event_plans, migration 202).
--   * It does not store computed recommendations. A plan is derived from
--     the blueprint and the answers, every time; only the customer's own
--     answers and choices are persisted, which is what makes a blueprint
--     safe to change.
--
-- Safe to run on a live database: every statement is `if not exists`,
-- nothing is dropped, nothing is backfilled, and existing events keep
-- working with answers of '{}'.

begin;

-- ── The answers Event Details collected ─────────────────────────────
-- On the event itself rather than a side table: they are facts about the
-- event, they are read on every recommendation, and 202 already owns the
-- row. `occasion_answers` is client-written (the customer's own words);
-- `blueprint_version` is the server's note of which blueprint produced
-- the plan the customer saw, so a later version never silently rewrites
-- a plan they already agreed to.
alter table public.event_plans
  add column if not exists occasion_answers jsonb not null default '{}'::jsonb,
  add column if not exists blueprint_version integer,
  add column if not exists blueprint_category text;

alter table public.event_plans
  drop constraint if exists event_plans_occasion_answers_size;
alter table public.event_plans
  add constraint event_plans_occasion_answers_size
  check (pg_column_size(occasion_answers) <= 16384);

comment on column public.event_plans.occasion_answers is
  'Category 1: the occasion-specific answers from Event Details, keyed by the blueprint question key. The customer''s own words; never inferred.';
comment on column public.event_plans.blueprint_version is
  'Which version of the occasion blueprint produced the plan the customer saw.';

-- ── Smart polls ─────────────────────────────────────────────────────
create table if not exists public.sambramo_event_polls (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.event_plans(id) on delete cascade,
  created_by uuid not null,
  kind text not null check (kind in ('date', 'venue', 'location', 'food', 'menu', 'theme', 'activity', 'outfit', 'music', 'budget', 'gifts', 'other')),
  question text not null check (length(question) between 3 and 200),
  options jsonb not null default '[]'::jsonb,
  multi boolean not null default false,
  closes_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sambramo_event_polls_options_sane check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 12)
);
create index if not exists sambramo_event_polls_plan_idx on public.sambramo_event_polls(plan_id, created_at desc);

create table if not exists public.sambramo_event_poll_votes (
  poll_id uuid not null references public.sambramo_event_polls(id) on delete cascade,
  voter_id uuid not null,  -- invitation_guests.id, never auth.uid(): see 191
  choices jsonb not null default '[]'::jsonb,
  voted_at timestamptz not null default now(),
  primary key (poll_id, voter_id)
);

-- ── Shared budget tracker ───────────────────────────────────────────
-- The ESTIMATE is computed (live partner prices, lib/planBudget.js) and
-- is never stored: a stale estimate is worse than none. What is stored
-- is what people actually agreed to put in, and what they actually paid.
create table if not exists public.sambramo_event_contributions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.event_plans(id) on delete cascade,
  added_by uuid not null,
  person text not null check (length(person) between 1 and 80),
  person_user_id uuid,
  pledged_paise bigint not null default 0 check (pledged_paise >= 0),
  paid_paise bigint not null default 0 check (paid_paise >= 0),
  note text check (note is null or length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sambramo_event_contributions_plan_idx on public.sambramo_event_contributions(plan_id);

create table if not exists public.sambramo_event_expenses (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.event_plans(id) on delete cascade,
  added_by uuid not null,
  label text not null check (length(label) between 1 and 120),
  trade_id text references public.sambramo_trade_registry(id),
  amount_paise bigint not null check (amount_paise >= 0),
  -- 'estimate' is what the customer typed in themselves; a booked line is
  -- linked instead, so the tracker never double-counts what Sambramo billed.
  kind text not null default 'estimate' check (kind in ('estimate', 'actual')),
  booking_line_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists sambramo_event_expenses_plan_idx on public.sambramo_event_expenses(plan_id);

-- ── Event schedule & updates ────────────────────────────────────────
create table if not exists public.sambramo_event_updates (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.event_plans(id) on delete cascade,
  created_by uuid not null,
  phase text not null default 'during' check (phase in ('before', 'during', 'after')),
  at_time time,
  title text not null check (length(title) between 1 and 140),
  body text check (body is null or length(body) <= 600),
  notify boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists sambramo_event_updates_plan_idx on public.sambramo_event_updates(plan_id, phase, position);

-- ── Who may read and write ──────────────────────────────────────────
-- The event's customer owns everything on it, and so does the host of
-- the invitation it was sent from (they are usually the same person;
-- 191 lets them differ).
--
-- A GUEST is not an auth user. 191 made that decision: a guest is a row
-- in invitation_guests reached by a token, and every guest-facing read
-- or write goes through a security-definer function granted to anon.
-- Polls follow the same path — event_polls_view and event_poll_vote
-- below — so a guest can vote without an account, and no policy here
-- ever has to trust auth.uid() for someone who does not have one.
alter table public.sambramo_event_polls          enable row level security;
alter table public.sambramo_event_poll_votes     enable row level security;
alter table public.sambramo_event_contributions  enable row level security;
alter table public.sambramo_event_expenses       enable row level security;
alter table public.sambramo_event_updates        enable row level security;

create or replace function public.sambramo_owns_event(p_plan uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.event_plans e where e.id = p_plan and e.customer_id = auth.uid()
  ) or exists (
    select 1 from public.invitations i where i.event_plan_id = p_plan and i.host_id = auth.uid()
  )
$$;
revoke all on function public.sambramo_owns_event(uuid) from public;
grant execute on function public.sambramo_owns_event(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['sambramo_event_polls', 'sambramo_event_contributions', 'sambramo_event_expenses', 'sambramo_event_updates'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.sambramo_owns_event(plan_id)) with check (public.sambramo_owns_event(plan_id))', t || '_owner', t);
  end loop;
end $$;

drop policy if exists sambramo_event_poll_votes_owner on public.sambramo_event_poll_votes;
create policy sambramo_event_poll_votes_owner on public.sambramo_event_poll_votes for select to authenticated
  using (exists (select 1 from public.sambramo_event_polls p where p.id = poll_id and public.sambramo_owns_event(p.plan_id)));

-- ── The guest's way in: a token, and nothing else ───────────────────
-- Returns only what a guest needs to vote: the open polls on their
-- event and the counts so far. Never the guest list, never the budget,
-- never the plan. A closed poll is returned so the result can be seen.
create or replace function public.event_polls_view(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_plan uuid; v_guest uuid; v_out jsonb;
begin
  select g.id, i.event_plan_id into v_guest, v_plan
    from public.invitation_guests g
    join public.invitations i on i.id = g.invitation_id
   where g.token = p_token;
  if v_plan is null then return jsonb_build_object('ok', false, 'reason', 'not-found'); end if;

  select jsonb_build_object('ok', true, 'polls', coalesce(jsonb_agg(x order by x->>'created_at'), '[]'::jsonb))
    into v_out
    from (
      select jsonb_build_object(
               'id', p.id, 'kind', p.kind, 'question', p.question, 'options', p.options,
               'multi', p.multi, 'closed', (p.closed_at is not null or (p.closes_at is not null and p.closes_at < now())),
               'created_at', p.created_at,
               'mine', coalesce((select v.choices from public.sambramo_event_poll_votes v
                                  where v.poll_id = p.id and v.voter_id = v_guest), '[]'::jsonb),
               'tally', coalesce((select jsonb_agg(c) from (
                           select jsonb_array_elements_text(v.choices) as c
                             from public.sambramo_event_poll_votes v where v.poll_id = p.id) t), '[]'::jsonb)
             ) as x
        from public.sambramo_event_polls p
       where p.plan_id = v_plan
    ) s;
  return v_out;
end $$;
revoke all on function public.event_polls_view(text) from public;
grant execute on function public.event_polls_view(text) to anon, authenticated;

-- One vote per guest per poll, replaced if they change their mind. A
-- guest can only ever write their OWN row, because the row's key is the
-- guest the token resolved to, not anything the caller sent.
create or replace function public.event_poll_vote(p_token text, p_poll uuid, p_choices jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_guest uuid; v_plan uuid; v_poll record;
begin
  if jsonb_typeof(p_choices) is distinct from 'array' or jsonb_array_length(p_choices) > 12 then
    return jsonb_build_object('ok', false, 'reason', 'bad-choices');
  end if;
  select g.id, i.event_plan_id into v_guest, v_plan
    from public.invitation_guests g
    join public.invitations i on i.id = g.invitation_id
   where g.token = p_token;
  if v_guest is null then return jsonb_build_object('ok', false, 'reason', 'not-found'); end if;

  select * into v_poll from public.sambramo_event_polls where id = p_poll and plan_id = v_plan;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not-found'); end if;
  if v_poll.closed_at is not null or (v_poll.closes_at is not null and v_poll.closes_at < now()) then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  if not v_poll.multi and jsonb_array_length(p_choices) > 1 then
    return jsonb_build_object('ok', false, 'reason', 'single-choice');
  end if;

  insert into public.sambramo_event_poll_votes (poll_id, voter_id, choices, voted_at)
  values (p_poll, v_guest, p_choices, now())
  on conflict (poll_id, voter_id) do update set choices = excluded.choices, voted_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.event_poll_vote(text, uuid, jsonb) from public;
grant execute on function public.event_poll_vote(text, uuid, jsonb) to anon, authenticated;

-- ── The toolkit is free, and the database says so ───────────────────
-- Nothing in this migration has a price column, a product id or a link
-- to booking_lines. A free feature that can be billed is one schema
-- change away from being billed; this one cannot be.

commit;
