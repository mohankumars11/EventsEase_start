-- ══════════════════════════════════════════════════════════════════════
-- 128 · An exception rolls back the tidying up
-- ══════════════════════════════════════════════════════════════════════
--
-- A bug in 127, found by check-tracking-isolation.mjs rather than by a
-- person, which is the whole reason that file exists.
--
-- `guard_location_event` was written to do two things when a point
-- arrives after the session's `expires_at`: close the session, and
-- refuse the point.
--
--     UPDATE public.tracking_sessions SET status = 'expired' ...
--     RAISE EXCEPTION 'tracking session has expired';
--
-- Those are in the same transaction. The RAISE rolls the UPDATE back, so
-- the session was never closed — it went on reading `active` to the
-- partner, to the customer, and to the operations console, while
-- refusing every point sent to it. A session that looks live and cannot
-- receive a location is the worst of both: the customer watches a stale
-- dot and nobody is told the tracking has stopped.
--
-- The close has to happen somewhere that COMMITS. That is
-- `push_locations`, before it inserts anything — it already loads the
-- session row and already returns structured refusals, so it can close
-- the session, return `{ ok:false, reason:'expired' }` and let the
-- transaction commit normally.
--
-- The trigger keeps its RAISE and loses its UPDATE. It is still the
-- backstop that makes "no location outside a live session" a property of
-- the table rather than of one function — but it can only ever refuse,
-- and pretending otherwise was what hid this.

BEGIN;

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

  /* Refuse only. Closing the session here cannot work: this function
     raises, and the raise rolls back anything it wrote. `push_locations`
     does the closing, in a transaction that commits. */
  IF s.expires_at <= now() THEN
    RAISE EXCEPTION 'tracking session has expired'
      USING HINT = 'Start the trip again.';
  END IF;

  -- A device clock ahead of the server is common; a point an hour in the
  -- future is not a point.
  IF NEW.recorded_at > now() + INTERVAL '5 minutes' THEN
    NEW.recorded_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- push_locations closes what it finds expired
-- ══════════════════════════════════════════════════════════════════════
--
-- Rebuilt from 127 with one block added before the insert loop.
-- Everything else — the ownership test, the batch insert, the newest-fix
-- read, the 1.3 road factor, the 5.5 m/s floor for a stopped vehicle,
-- the 200 m geofence stamp — is unchanged.

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

  /* ── The fix ──────────────────────────────────────────────────────
     Close it HERE, and return rather than raise, so the close commits.
     A session that refuses points while still reading `active` shows
     the customer a stale dot and tells nobody that tracking stopped. */
  IF s.expires_at <= now() THEN
    UPDATE tracking_sessions
       SET status = 'expired', ended_at = now(), end_reason = 'expired'
     WHERE id = p_session_id AND status = 'active';
    RETURN jsonb_build_object('ok', false, 'reason', 'expired',
      'says', 'This trip timed out. Start it again if you are still on the way.');
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

  SELECT e.location, e.recorded_at, e.accuracy_m, e.speed_mps, e.heading_deg
    INTO v_last, v_last_at, v_acc, v_speed, v_head
    FROM tracking_location_events e
   WHERE e.session_id = p_session_id
   ORDER BY e.recorded_at DESC
   LIMIT 1;

  v_dist := ST_Distance(v_last, s.destination)::INTEGER;

  v_eta := now() + make_interval(
    secs => GREATEST(60, (v_dist * 1.3) / GREATEST(COALESCE(v_speed, 0), 5.5))::int);

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

COMMIT;
