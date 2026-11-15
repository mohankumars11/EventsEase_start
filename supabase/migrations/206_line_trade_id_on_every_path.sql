-- ════════════════════════════════════════════════════════════════════
-- 206 · Every booking line carries its stable trade id, whichever path
--       created it.
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 202.
--
-- 202 added booking_lines.trade_id — "the id everything new joins on",
-- in place of matching on the display name in `trade` — and backfilled
-- the 38 lines that existed. But it fills trade_id for NEW lines only on
-- one path: sambramo_link_line_to_requirement, i.e. lines sent by
-- "find everything". A line created the ordinary way — a single booking
-- through api/anchor?op=book → book_partner_line / request_partner_line —
-- never gets one.
--
-- Found 2026-11-03 by the line-lifecycle fixture in
-- scripts/check-event-spine-live.mjs: a freshly inserted line came back
-- with trade_id null. Zero real lines were affected (none had been booked
-- since 202), so this is caught before it began, not repaired after.
--
-- The fix belongs on the table rather than in each of the booking paths:
-- there are already three, and a fourth would forget. `trade` is still
-- the source — it is what every path already writes, and
-- sambramo_trade_registry.name is unique and equals it by construction
-- (20261010_07).
-- ════════════════════════════════════════════════════════════════════

begin;

create or replace function public.sambramo_line_trade_id() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.trade is not null
     and (new.trade_id is null or (tg_op = 'UPDATE' and new.trade is distinct from old.trade)) then
    select id into new.trade_id from public.sambramo_trade_registry where name = new.trade;
  end if;
  return new;
end $$;

drop trigger if exists trg_line_trade_id on public.booking_lines;
create trigger trg_line_trade_id before insert or update of trade on public.booking_lines
  for each row execute function public.sambramo_line_trade_id();

-- Anything created between 202 and now.
update public.booking_lines l set trade_id = r.id
  from public.sambramo_trade_registry r
 where r.name = l.trade and l.trade_id is null;

commit;

-- VERIFY: node --env-file=.env scripts/check-event-spine-live.mjs
--   ("a line booked the ordinary way still gets its trade id")
-- select count(*) as lines_without_trade_id from booking_lines where trade_id is null;   -- 0
--
-- Rollback:
-- drop trigger if exists trg_line_trade_id on booking_lines;
-- drop function if exists sambramo_line_trade_id();
