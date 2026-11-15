-- 198 — Masters reply faster (Mohan, 2026-11-01).
--
-- "If we make a customer wait for a longer duration, they might go out of
-- the platform and see others." 197 gave a master 30 min / 2 h / 6 h to
-- accept; with three backups that could keep a customer waiting a day.
--
-- Now, by how far away the event is:
--   within 2 days   15 minutes  (any hour — the event is close)
--   within 7 days   30 minutes
--   later           60 minutes
-- and, as before, a window that would end between 22:00 and 08:00 IST
-- ends at 09:00 instead (for events more than 2 days away), so nobody
-- loses a job for sleeping. A request plus three backups now resolves in
-- about four daytime hours at most, instead of a day.
--
-- Same signature as 197; every caller (_request_ask, route_request_next)
-- picks it up. Safe to re-run.

create or replace function public.request_reply_by(p_event_date date)
returns timestamptz
language plpgsql stable
set search_path = public
as $$
declare
  v_days integer := p_event_date - (now() at time zone 'Asia/Kolkata')::date;
  v_local timestamp;
begin
  v_local := (now() + case when v_days <= 2 then interval '15 minutes'
                           when v_days <= 7 then interval '30 minutes'
                           else interval '60 minutes' end) at time zone 'Asia/Kolkata';
  if v_days > 2 and (extract(hour from v_local) >= 22 or extract(hour from v_local) < 8) then
    v_local := date_trunc('day', v_local)
             + case when extract(hour from v_local) >= 22 then interval '1 day' else interval '0 days' end
             + interval '9 hours';
  end if;
  return v_local at time zone 'Asia/Kolkata';
end;
$$;

comment on function public.request_reply_by(date) is
  'When a master must answer a request: 15 min (event within 2 days), 30 min (within 7), else 60 min; never ending 22:00–08:00 IST for events beyond 2 days (moved to 09:00). Migration 198.';
