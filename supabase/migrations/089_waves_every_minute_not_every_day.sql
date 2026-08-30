-- ══════════════════════════════════════════════════════════════════════
-- 089 · The waves run every minute, from the database
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 072 and 086 first.
--
-- ── The gap ─────────────────────────────────────────────────────────
--
-- Wave 1 goes out inside `api/dispatch-booking`, synchronously. Measured
-- on production: the offer rows are written at +0.0s. That part is fine.
--
-- Waves 2 and 3 are somebody else's job, and there were only two
-- candidates for it:
--
--   the customer's screen   MatchingBoard POSTs /api/dispatch-waves
--                           every 15 seconds while it is open
--
--   a Vercel cron           once a day, at 03:00
--
-- The screen is the fast path and it works. It is also the path the
-- product tells people not to use: the matching board says, in as many
-- words, "You can close the app — we will alert you the moment someone
-- accepts." Anybody who believes that sentence stops nudging.
--
-- So for every customer who did the reasonable thing, a line that missed
-- wave 1 waited for 03:00. Not thirty minutes -- up to twenty-four
-- hours, for a booking that might be for tomorrow.
--
-- ── Why the database and not a better cron ──────────────────────────
--
-- A Vercel cron on the free plan is once a day; per-minute needs Pro.
-- But the scheduler does not belong in the hosting platform anyway. The
-- thing that knows a line is waiting is the database -- 072 already has
-- `lines_awaiting_next_wave()`, which was written for exactly this and
-- then had nothing calling it often enough.
--
-- pg_cron runs inside Postgres, at minute resolution, free, and it keeps
-- running whether or not anybody's phone is on. pg_net makes the HTTP
-- call so the existing endpoint keeps owning the logic: matching,
-- pricing and the push fan-out stay in one place rather than being
-- reimplemented in plpgsql where nobody would ever look at them again.
--
-- This is the shape every dispatch product converges on. The queue is in
-- the database because the database is the only thing that cannot be
-- closed, backgrounded or put to sleep by a battery optimiser.
--
-- ══════════════════════════════════════════════════════════════════════
-- BEFORE YOU RUN THIS
-- ══════════════════════════════════════════════════════════════════════
--
-- Dashboard → Database → Extensions, enable both:
--
--     pg_cron     the scheduler
--     pg_net      outbound HTTP from SQL
--
-- They are available on every Supabase plan but are off by default, and
-- CREATE EXTENSION from the SQL editor is refused for these two on some
-- projects. If the statements below error, enable them in the dashboard
-- and run this again -- everything here is re-runnable.
--
-- ── Check it afterwards ─────────────────────────────────────────────
--
--     select jobname, schedule, active from cron.job;
--     select status, return_message, start_time
--       from cron.job_run_details
--      where jobid = (select jobid from cron.job
--                      where jobname = 'sambramo-dispatch-waves')
--      order by start_time desc limit 5;
--
-- A healthy row is status 'succeeded'. The endpoint is idempotent and
-- returns quickly when there is nothing waiting, so a minute of no
-- bookings costs one row and no work.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Re-runnable: drop the old schedule before writing the new one, so
-- changing the interval or the URL does not leave two jobs racing.
DO $$
BEGIN
  PERFORM cron.unschedule('sambramo-dispatch-waves');
EXCEPTION WHEN OTHERS THEN
  -- Not scheduled yet. Nothing to undo.
  NULL;
END $$;

/* Every minute.
 *
 * Not every ten seconds: a wave is 45 seconds long (OFFER_WINDOW_SECONDS)
 * and the endpoint only acts on lines whose wave has actually elapsed, so
 * anything faster is requests that find nothing. Not every five minutes:
 * the whole point is that a master hears about a job while the customer
 * is still interested in it.
 *
 * The URL is the production deployment. A sandbox project should point
 * at its own preview URL -- see docs/SANDBOX.md -- which is the reason
 * this is a hand-applied migration rather than something generated. */
SELECT cron.schedule(
  'sambramo-dispatch-waves',
  '* * * * *',
  $job$
    SELECT net.http_post(
      url     := 'https://sambramoh.vercel.app/api/dispatch-waves',
      headers := '{"content-type": "application/json"}'::jsonb,
      body    := '{"source": "pg_cron"}'::jsonb,
      timeout_milliseconds := 20000
    );
  $job$
);

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- The Vercel cron in vercel.json stays.
--
-- It is once a day and it is now a backstop rather than the mechanism:
-- if pg_net is disabled, the project is paused, or an outbound call is
-- blocked, the daily run still eventually widens every stranded line.
-- Two independent schedulers for the same idempotent endpoint is cheap
-- insurance on the path where being late is the failure.
-- ══════════════════════════════════════════════════════════════════════
