-- ══════════════════════════════════════════════════════════════════════
-- 127 · On the way
-- ══════════════════════════════════════════════════════════════════════
--
-- Live location, for one booking, for as long as it is useful, and then
-- not.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THIS IS A SESSION AND NOT A COLUMN ON `vendors`
-- ══════════════════════════════════════════════════════════════════════
--
-- The obvious shape is `UPDATE vendors SET location = ...` every few
-- seconds. It is wrong three times over.
--
-- `vendors.location` is where the BUSINESS is. `match_partners` tests
-- `ST_DWithin(v.location, p_point, v.service_radius_km * 1000)` against
-- it — that is the partner's own reach, measured from their base. A
-- caterer driving to Whitefield would silently redraw their service area
-- around the venue and back again, and the offers they got that
-- afternoon would be the wrong offers.
--
-- Second, it is a fact with no start and no end. A row that is always
-- being written is always being read, and "is Sambramo watching me right
-- now" would have no answer.
--
-- Third, there is nowhere to put the journey. A single mutable point
-- cannot say how far there is left to go.
--
-- So: a session, opened against ONE booking line, closed when that line
-- no longer needs it, with the breadcrumb trail hanging off it.
--
-- ══════════════════════════════════════════════════════════════════════
-- TWO MODES, BECAUSE TWO TRADES NEED DIFFERENT THINGS
-- ══════════════════════════════════════════════════════════════════════
--
--   'arrival'  A caterer, decorator or photographer. GPS runs from
--              "on the way" to "arrived" and then STOPS. Nobody needs
--              to watch a decorator's phone for the nine hours they are
--              inside the hall, and watching it would cost them a
--              battery they need for the job.
--
--   'trip'     Transportation — auto, bike, tempo, bus. The journey IS
--              the service, the customer is waiting on it, and live ETA
--              is the whole point. Runs until the trip ends.
--
-- The mode is decided from the line's trade by `tracking_mode_for()`
-- below rather than chosen by the client, so a transport partner cannot
-- be given arrival-only tracking by a stale app, and a photographer
-- cannot be put under trip tracking by a wrong parameter.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT THE CUSTOMER SEES, AND WHAT THEY DO NOT
-- ══════════════════════════════════════════════════════════════════════
--
-- The customer sees the SESSION row: status, the latest point, the ETA,
-- the distance left. They get no access to `tracking_location_events` at
-- all — not filtered access, none. The customer is owed "where is my
-- caterer now"; they are not owed a map of everywhere that person has
-- been, and the two are different questions with one table between them.
--
-- That split is the whole privacy design, and it is why the last point
-- is denormalised onto the session rather than read from the trail.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · Which mode a trade gets
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.tracking_mode_for(p_trade TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  /* Transportation is the only trade in the catalogue whose service IS
     the journey. Everything else is somebody travelling TO the work.
     Kept as a function rather than a CHECK on a column so that adding a
     delivery trade later is one line here and not a data migration. */
  SELECT CASE
    WHEN p_trade IN ('Transportation') THEN 'trip'
    ELSE 'arrival'
  END
$$;

COMMENT ON FUNCTION public.tracking_mode_for IS
  'arrival = GPS from on-the-way to arrived, then stop. trip = the whole '
  'journey. Decided from the trade, never from the client.';

-- ══════════════════════════════════════════════════════════════════════
-- 2 · tracking_sessions
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  line_id     UUID NOT NULL REFERENCES public.booking_lines(id) ON DELETE CASCADE,
  vendor_id   UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  mode        TEXT NOT NULL CHECK (mode IN ('arrival', 'trip')),

  --   active     GPS is running and the partner knows it
  --   arrived    at the venue; an 'arrival' session is finished here
  --   completed  the trip ended
  --   cancelled  the partner stopped it, or the booking was cancelled
  --   expired    nobody closed it and the window passed
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','arrived','completed','cancelled','expired')),

  /* Snapshotted off `booking_requests.location` when the session opens.
     Copied rather than joined so the session is self-contained: the
     distance and ETA on it stay meaningful even if the booking is later
     edited, and an operator reading a finished session sees where the
     partner was actually going. */
  destination extensions.geography(Point,4326) NOT NULL,

  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  arrived_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,

  /* ── The hard stop ────────────────────────────────────────────────
     Every session dies on its own. A tracking system whose OFF switch
     is a client remembering to call something is a tracking system that
     is sometimes on for a week, and "we only track during a job" would
     stop being true the first time an app was force-quit on the way to
     a venue. */
  expires_at  TIMESTAMPTZ NOT NULL,

  -- ── The latest point, denormalised on purpose ────────────────────
  -- This is the row the customer is allowed to read. Keeping the
  -- current position here means they can be shown it without being
  -- given any access at all to the trail below.
  last_location   extensions.geography(Point,4326),
  last_accuracy_m REAL,
  last_speed_mps  REAL,
  last_heading_deg REAL,
  last_seen_at    TIMESTAMPTZ,

  eta_at              TIMESTAMPTZ,
  distance_remaining_m INTEGER CHECK (distance_remaining_m IS NULL OR distance_remaining_m >= 0),

  /* Geofence and confirmation are two facts, deliberately. GPS says the
     phone is within the fence; the partner says they have arrived. A
     driver stopped at a light 150m from the gate is inside the fence and
     has not arrived, and marking them arrived would start a clock
     against them. So the fence prompts and the person confirms. */
  geofence_entered_at  TIMESTAMPTZ,
  arrival_confirmed_at TIMESTAMPTZ,

  end_reason  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* One live session per line. A second one would mean two answers to
   "where is my caterer", and the partial index makes that unrepresentable
   rather than merely discouraged. */
CREATE UNIQUE INDEX IF NOT EXISTS uq_tracking_one_active_per_line
  ON public.tracking_sessions (line_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_vendor
  ON public.tracking_sessions (vendor_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_live
  ON public.tracking_sessions (status, expires_at) WHERE status = 'active';

-- ══════════════════════════════════════════════════════════════════════
-- 3 · tracking_location_events — the trail
-- ══════════════════════════════════════════════════════════════════════
--
-- Not one row per second. The client batches and uses adaptive
-- intervals — a phone stopped at a light does not need six points — and
-- the retention function below throws the trail away once it has stopped
-- being operationally useful.
--
-- The trail exists for two real purposes: replaying a disputed arrival
-- time, and letting operations see that somebody has not moved in
-- twenty minutes. Neither needs it kept for a month.

CREATE TABLE IF NOT EXISTS public.tracking_location_events (
  id          BIGSERIAL PRIMARY KEY,
  session_id  UUID NOT NULL REFERENCES public.tracking_sessions(id) ON DELETE CASCADE,

  location    extensions.geography(Point,4326) NOT NULL,
  accuracy_m  REAL,
  speed_mps   REAL,
  heading_deg REAL,

  /* When the DEVICE recorded it, which is not when the server received
     it. A batch posted after a tunnel arrives late and in order, and
     sorting by server time would draw the route wrong. */
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_session
  ON public.tracking_location_events (session_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_tracking_events_age
  ON public.tracking_location_events (created_at);

COMMENT ON TABLE public.tracking_location_events IS
  'The breadcrumb trail for one tracking session. Readable by the partner '
  'it belongs to and by operators. NEVER by the customer: they are owed '
  'where their partner is now, not everywhere that person has been.';

-- ══════════════════════════════════════════════════════════════════════
-- 4 · A point only lands inside a live session
-- ══════════════════════════════════════════════════════════════════════
--
-- This is what makes "no always-on tracking" a property of the database
-- rather than a promise about the client. There is no way to write a
-- location that is not attached to an open session on a real booking.

CREATE OR REPLACE FUNCTION public.guard_location_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  s public.tracking_sessions%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.tracking_sessions WHERE id = NEW.session_id;

  IF s.id IS NULL THEN
    RAISE EXCEPTION 'no such tracking session';
  END IF;

  IF s.status <> 'active' THEN
    RAISE EXCEPTION 'tracking session is %, not active', s.status
      USING HINT = 'Start a trip before sending locations.';
  END IF;

  IF s.expires_at <= now() THEN
    /* Close it here rather than merely refusing: a client that kept
       sending after expiry would otherwise keep being refused forever
       while the session sat there looking live to everybody else. */
    UPDATE public.tracking_sessions
       SET status = 'expired', ended_at = now(), end_reason = 'expired'
     WHERE id = s.id;
    RAISE EXCEPTION 'tracking session has expired';
  END IF;

  -- A device clock ahead of the server is common; a point an hour in the
  -- future is not a point.
  IF NEW.recorded_at > now() + INTERVAL '5 minutes' THEN
    NEW.recorded_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_location_event ON public.tracking_location_events;
CREATE TRIGGER trg_guard_location_event
  BEFORE INSERT ON public.tracking_location_events
  FOR EACH ROW EXECUTE FUNCTION public.guard_location_event();

-- ══════════════════════════════════════════════════════════════════════
-- 5 · Starting
-- ══════════════════════════════════════════════════════════════════════
--
-- Everything the client would otherwise have to be trusted with is
-- decided here: who owns the line, whether the job is in a state where
-- travelling to it means anything, where "there" is, which mode applies,
-- and when it stops.

CREATE OR REPLACE FUNCTION public.start_tracking(p_line_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_line   booking_lines%ROWTYPE;
  v_req    booking_requests%ROWTYPE;
  v_vendor UUID;
  v_mode   TEXT;
  v_open   tracking_sessions%ROWTYPE;
  v_id     UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF v_line.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_line',
      'says', 'That job is not here any more.');
  END IF;

  SELECT * INTO v_req FROM booking_requests WHERE id = v_line.request_id;

  /* Who won this line. Read from the ACCEPTED offer rather than from a
     column, because that is where 060 puts the fact and where the
     partial unique index enforces there is exactly one. */
  SELECT o.vendor_id INTO v_vendor
    FROM dispatch_offers o
   WHERE o.line_id = p_line_id AND o.status = 'ACCEPTED'
   LIMIT 1;

  IF v_vendor IS NULL
     OR NOT EXISTS (SELECT 1 FROM vendors WHERE id = v_vendor AND profile_id = auth.uid())
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours',
      'says', 'This is not your job.');
  END IF;

  IF v_line.status IN ('cancelled','expired','settled') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_live',
      'says', 'This job is closed.');
  END IF;

  /* Travelling to an unfunded job is the partner's own risk to take and
     not something to encourage: until the customer has paid, the line
     can still evaporate. `accepted` is allowed because the grace period
     exists, but anything before that has no venue to go to yet. */
  IF v_line.status NOT IN ('accepted','paid','in_progress') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_early',
      'says', 'You can start the trip once the booking is confirmed.');
  END IF;

  IF v_req.location IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_destination',
      'says', 'We do not have a location for this venue yet.');
  END IF;

  -- Already going. Hand back the one that exists rather than refusing:
  -- a partner who backgrounded the app and came back is not an error.
  SELECT * INTO v_open FROM tracking_sessions
   WHERE line_id = p_line_id AND status = 'active';
  IF v_open.id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'resumed', true,
      'session_id', v_open.id, 'mode', v_open.mode,
      'expires_at', v_open.expires_at);
  END IF;

  v_mode := public.tracking_mode_for(v_line.trade);

  /* Twelve hours is longer than any journey to a Bengaluru venue and
     shorter than a night's sleep, so a session left open by a crashed
     app is closed before the partner would next notice it. Capped
     against the event date as well, so a trip started early cannot
     outlive the booking it belongs to. */
  v_expires := LEAST(now() + INTERVAL '12 hours',
                     (v_req.event_date + INTERVAL '36 hours'));
  IF v_expires <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'event_passed',
      'says', 'That event has already happened.');
  END IF;

  INSERT INTO tracking_sessions (line_id, vendor_id, mode, destination, expires_at)
  VALUES (p_line_id, v_vendor, v_mode, v_req.location, v_expires)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'resumed', false,
    'session_id', v_id, 'mode', v_mode, 'expires_at', v_expires);
END;
$$;

REVOKE ALL ON FUNCTION public.start_tracking(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_tracking(UUID) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- 6 · Sending points, in batches
-- ══════════════════════════════════════════════════════════════════════
--
-- One call carries however many fixes the phone collected since the last
-- one. Batching is not only a cost decision: a phone in a tunnel or on a
-- dead patch of the ORR collects points it cannot send, and a protocol
-- that only accepts the latest one throws that stretch of the route away.
--
-- The session's denormalised "latest" fields are updated from the newest
-- point in the batch, and the distance left is measured against the
-- snapshotted destination. ETA is computed here rather than on the
-- client so the customer's screen and the partner's screen cannot
-- disagree about when somebody is arriving.

CREATE OR REPLACE FUNCTION public.push_locations(
  p_session_id UUID,
  p_points     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  s        tracking_sessions%ROWTYPE;
  pt       JSONB;
  v_last   extensions.geography(Point,4326);
  v_last_at TIMESTAMPTZ;
  v_acc    REAL;
  v_speed  REAL;
  v_head   REAL;
  v_dist   INTEGER;
  v_eta    TIMESTAMPTZ;
  v_fence  BOOLEAN := FALSE;
  v_count  INT := 0;
BEGIN
  SELECT * INTO s FROM tracking_sessions WHERE id = p_session_id;
  IF s.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_session');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vendors WHERE id = s.vendor_id AND profile_id = auth.uid())
     AND NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  IF s.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_active', 'status', s.status);
  END IF;

  FOR pt IN SELECT * FROM jsonb_array_elements(COALESCE(p_points, '[]'::jsonb))
  LOOP
    INSERT INTO tracking_location_events
      (session_id, location, accuracy_m, speed_mps, heading_deg, recorded_at)
    VALUES (
      p_session_id,
      ST_SetSRID(ST_MakePoint((pt->>'lng')::float8, (pt->>'lat')::float8), 4326)::geography,
      NULLIF(pt->>'accuracy','')::real,
      NULLIF(pt->>'speed','')::real,
      NULLIF(pt->>'heading','')::real,
      COALESCE(NULLIF(pt->>'at','')::timestamptz, now())
    );
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', true, 'stored', 0);
  END IF;

  -- The newest fix in this session, whichever batch it arrived in.
  SELECT e.location, e.recorded_at, e.accuracy_m, e.speed_mps, e.heading_deg
    INTO v_last, v_last_at, v_acc, v_speed, v_head
    FROM tracking_location_events e
   WHERE e.session_id = p_session_id
   ORDER BY e.recorded_at DESC
   LIMIT 1;

  v_dist := ST_Distance(v_last, s.destination)::INTEGER;

  /* ── ETA ───────────────────────────────────────────────────────────
     Straight-line metres are not road metres, so the distance is
     inflated by a third before it becomes a time — the same 1.3 factor
     the client's calendar conflict engine uses, so the two agree. Speed
     comes from the device when it is moving and from a city average
     when it is not, because a phone stopped at a light reports 0 m/s
     and an ETA of never. */
  v_eta := now() + make_interval(
    secs => GREATEST(60, (v_dist * 1.3) / GREATEST(COALESCE(v_speed, 0), 5.5))::int);

  -- 200 m, once, and it only ever prompts. See the column comment.
  IF v_dist <= 200 AND s.geofence_entered_at IS NULL THEN
    v_fence := TRUE;
  END IF;

  UPDATE tracking_sessions
     SET last_location   = v_last,
         last_seen_at    = v_last_at,
         last_accuracy_m = v_acc,
         last_speed_mps  = v_speed,
         last_heading_deg = v_head,
         distance_remaining_m = v_dist,
         eta_at = v_eta,
         geofence_entered_at = CASE WHEN v_fence THEN now() ELSE geofence_entered_at END
   WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'ok', true, 'stored', v_count,
    'distance_m', v_dist, 'eta_at', v_eta,
    'near', (v_dist <= 200));
END;
$$;

REVOKE ALL ON FUNCTION public.push_locations(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_locations(UUID, JSONB) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- 7 · Arriving, and stopping
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.confirm_arrival(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  s tracking_sessions%ROWTYPE;
BEGIN
  SELECT * INTO s FROM tracking_sessions WHERE id = p_session_id;
  IF s.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_session');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vendors WHERE id = s.vendor_id AND profile_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  /* ── Arrival ENDS an arrival session and not a trip ───────────────
     A caterer who has arrived is at the venue for the next nine hours
     and there is nothing left to watch: GPS stops here, which is the
     privacy and the battery promise both. A transport job is only
     halfway through at the pickup, so a trip stays live until it is
     ended. */
  UPDATE tracking_sessions
     SET arrival_confirmed_at = COALESCE(arrival_confirmed_at, now()),
         arrived_at = COALESCE(arrived_at, now()),
         status   = CASE WHEN mode = 'arrival' THEN 'arrived' ELSE status END,
         ended_at = CASE WHEN mode = 'arrival' THEN now() ELSE ended_at END,
         end_reason = CASE WHEN mode = 'arrival' THEN 'arrived' ELSE end_reason END
   WHERE id = p_session_id;

  /* The job moves with it. `in_progress` is already in 059's ladder, so
     this is the existing lifecycle being driven by a real event rather
     than a new state being invented alongside it. */
  UPDATE booking_lines
     SET status = 'in_progress'
   WHERE id = s.line_id AND status IN ('accepted','paid');

  SELECT * INTO s FROM tracking_sessions WHERE id = p_session_id;
  RETURN jsonb_build_object('ok', true, 'status', s.status, 'mode', s.mode);
END;
$$;

CREATE OR REPLACE FUNCTION public.end_tracking(p_session_id UUID, p_reason TEXT DEFAULT 'stopped')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  s tracking_sessions%ROWTYPE;
BEGIN
  SELECT * INTO s FROM tracking_sessions WHERE id = p_session_id;
  IF s.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_session');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vendors WHERE id = s.vendor_id AND profile_id = auth.uid())
     AND NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  UPDATE tracking_sessions
     SET status = CASE WHEN p_reason = 'completed' THEN 'completed' ELSE 'cancelled' END,
         ended_at = COALESCE(ended_at, now()),
         end_reason = p_reason
   WHERE id = p_session_id AND status = 'active';

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_arrival(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.end_tracking(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_arrival(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.end_tracking(UUID, TEXT) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- 8 · Nothing runs forever, and nothing is kept forever
-- ══════════════════════════════════════════════════════════════════════
--
-- Both are callable by hand and both are idempotent. If pg_cron is
-- available, schedule them; if it is not — and it is not on every
-- Supabase plan — the expiry is ALSO enforced by the insert guard above,
-- so a stale session cannot keep collecting points whether or not
-- anything sweeps.

CREATE OR REPLACE FUNCTION public.expire_stale_tracking()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH done AS (
    UPDATE public.tracking_sessions
       SET status = 'expired', ended_at = now(), end_reason = 'expired'
     WHERE status = 'active' AND expires_at <= now()
    RETURNING 1
  ) SELECT COUNT(*)::INTEGER FROM done
$$;

/* Thirty days. Long enough to settle an argument about what time
   somebody arrived at a wedding, short enough that Sambramo is not
   sitting on a year of everyone's movements. The SESSION rows survive —
   they carry arrival times, which are part of the booking record — and
   it is the fine-grained trail that goes. */
CREATE OR REPLACE FUNCTION public.purge_old_location_events(p_days INT DEFAULT 30)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH gone AS (
    DELETE FROM public.tracking_location_events
     WHERE created_at < now() - make_interval(days => GREATEST(p_days, 1))
    RETURNING 1
  ) SELECT COUNT(*)::INTEGER FROM gone
$$;

REVOKE ALL ON FUNCTION public.expire_stale_tracking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_old_location_events(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_tracking() TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_old_location_events(INT) TO service_role;

-- ══════════════════════════════════════════════════════════════════════
-- 9 · Who may see what
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.tracking_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_location_events ENABLE ROW LEVEL SECURITY;

-- ── The partner ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "partner reads own sessions" ON public.tracking_sessions;
CREATE POLICY "partner reads own sessions"
  ON public.tracking_sessions FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()));

/* No INSERT, no UPDATE, no DELETE for a partner. Every change goes
   through the four functions above, which is what makes the rules —
   who owns the line, which mode applies, when it expires — properties
   of the system rather than of whichever client is calling. */

-- ── The customer whose booking it is ─────────────────────────────────
--
-- The session row and nothing else. It carries the current point, the
-- ETA and the distance, which is the whole of what "where is my
-- caterer" needs. `tracking_location_events` has no customer policy at
-- all, so the trail is not filtered for them — it is absent.
--
-- And only while it is live: once the session ends, the answer to the
-- question has been delivered and the row stops being theirs to watch.
DROP POLICY IF EXISTS "customer watches their own booking" ON public.tracking_sessions;
CREATE POLICY "customer watches their own booking"
  ON public.tracking_sessions FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND line_id IN (
      SELECT l.id FROM public.booking_lines l
      JOIN public.booking_requests r ON r.id = l.request_id
      WHERE r.customer_id = auth.uid()
    )
  );

-- ── Operations ───────────────────────────────────────────────────────
-- The command centre: everything, live and historical, including the
-- trail. Intervening before an event goes wrong is the entire point of
-- having this data.
DROP POLICY IF EXISTS "operators watch everything" ON public.tracking_sessions;
CREATE POLICY "operators watch everything"
  ON public.tracking_sessions FOR ALL TO authenticated
  USING (public.caller_is_operator())
  WITH CHECK (public.caller_is_operator());

DROP POLICY IF EXISTS "partner reads own trail" ON public.tracking_location_events;
CREATE POLICY "partner reads own trail"
  ON public.tracking_location_events FOR SELECT TO authenticated
  USING (session_id IN (
    SELECT s.id FROM public.tracking_sessions s
    JOIN public.vendors v ON v.id = s.vendor_id
    WHERE v.profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators read every trail" ON public.tracking_location_events;
CREATE POLICY "operators read every trail"
  ON public.tracking_location_events FOR ALL TO authenticated
  USING (public.caller_is_operator())
  WITH CHECK (public.caller_is_operator());

/* Points are written by `push_locations`, which is SECURITY DEFINER and
   checks ownership itself. No INSERT policy for `authenticated` means a
   client cannot write a location by any other route — including one
   claiming to be somewhere it is not, for a session it does not own. */

-- ══════════════════════════════════════════════════════════════════════
-- 10 · Grants
-- ══════════════════════════════════════════════════════════════════════
--
-- SELECT only, for both. `anon` gets nothing at all: live location is
-- the single most sensitive thing in this schema, and 123 is the
-- standing reminder of what an unchecked anon grant costs.

GRANT SELECT ON public.tracking_sessions        TO authenticated;
GRANT SELECT ON public.tracking_location_events TO authenticated;
GRANT ALL    ON public.tracking_sessions        TO service_role;
GRANT ALL    ON public.tracking_location_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.tracking_location_events_id_seq TO service_role;

COMMENT ON TABLE public.tracking_sessions IS
  'One live-location session for one booking line. Opened by start_tracking, '
  'fed by push_locations, closed by confirm_arrival or end_tracking, and '
  'expired on its own if nothing closes it. The customer may read the live '
  'row for their own booking; nobody outside Sambramo may read the trail.';

COMMIT;
