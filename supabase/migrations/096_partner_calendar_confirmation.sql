-- ══════════════════════════════════════════════════════════════════════
-- 096 · "My month is right" — the one thing an empty calendar cannot say
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A COLUMN AND NOT A COUNT OF ROWS
-- ══════════════════════════════════════════════════════════════════════
--
-- `vendor_availability` (021) records EXCEPTIONS. A partner who is genuinely
-- free all of November writes no rows for November, and that is correct — so
-- from the data alone, "I have checked November and I am free" and "I have
-- never opened this app" are the same thing: zero rows.
--
-- They are not the same thing to us and they are not the same thing to the
-- partner. One of them should be left alone; the other is the partner who
-- will be offered a job on a day they are already shooting a wedding, accept
-- it by reflex, cancel, and take a strike for it.
--
-- The Calendar tab now shows six months and asks the partner to answer each
-- one. Without somewhere to record "yes, that month is right", the free month
-- can never be answered, and the six-month strip becomes a counter that only
-- ever fills up for partners with problems — which is precisely backwards.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A DATE AND NOT A BOOLEAN OR A LIST OF MONTHS
-- ══════════════════════════════════════════════════════════════════════
--
-- Confirmation is monotonic and it expires by itself. A partner confirming
-- February has necessarily looked past January, so one high-water mark says
-- everything a list of months would, in one comparison. And because it is a
-- date rather than a flag, it goes stale on its own as the calendar advances:
-- a mark set last March stops counting for anything without a cron job, a
-- nightly reset, or anybody remembering to clear it.
--
-- NULL means "never confirmed anything", which is every partner today.

BEGIN;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS calendar_reviewed_through DATE;

COMMENT ON COLUMN public.vendors.calendar_reviewed_through IS
  'Last date the partner has explicitly confirmed their calendar through. '
  'NULL = never confirmed. Monotonic: the app only ever moves it forward.';

-- Nothing indexes this. It is read one row at a time, on the partner''s own
-- dashboard, alongside the vendor row that is already being fetched — an
-- index would cost every vendor write and be used by nothing.

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- SAFE TO DELAY
-- ══════════════════════════════════════════════════════════════════════
--
-- The Calendar tab checks for this column before it offers the confirm
-- button (`'calendar_reviewed_through' in vendor` — the vendor row is fetched
-- with select('*'), so the key's presence IS the check). Until this is
-- applied the six-month strip still works and still counts a month answered
-- once any day in it is marked; the partner just cannot tick off a month
-- that is genuinely free. Nothing errors and nothing is lost.
