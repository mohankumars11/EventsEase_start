-- ══════════════════════════════════════════════════════════════════════
-- 084 · The whole first wave, in one round trip
-- ══════════════════════════════════════════════════════════════════════
--
-- Measured against production, a four-service booking took 6.3 seconds
-- from the button to the matching board. Almost none of that was work.
--
-- `api/dispatch-booking.js` ran, per line:
--
--   match_partners (real)        1 round trip
--   match_partners (seeded fill) 1
--   insert dispatch_offers       1
--   update booking_lines         1
--
-- Four network hops per line, plus two for setup, plus one push query
-- each. Eighteen hops for four services — every one of them Vercel
-- waiting on Postgres across a region boundary at 80–150ms.
--
-- The database was never the slow part. The distance was.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THIS BELONGS IN SQL AND NOT IN BETTER JAVASCRIPT
-- ══════════════════════════════════════════════════════════════════════
--
-- Parallelising the loop helps and does not fix it: eighteen hops in
-- parallel is still bounded by the slowest, still eighteen connections,
-- and still multiplies by every line a customer adds. The work itself is
-- a join against a GIST index and an insert — microseconds of Postgres
-- either side of a hundred milliseconds of network.
--
-- Moving the loop INTO the database makes it one hop regardless of
-- basket size. Ten services cost the same as one, which is the property
-- that matters: the customer with the biggest basket is the customer
-- worth the most, and they were being made to wait the longest.
--
-- It is also atomic. The old sequence could insert offers for three
-- lines and fail on the fourth, leaving masters holding offers for a
-- booking the customer was told had failed.
--
-- Re-runnable, like every migration in this series.

BEGIN;

-- `extensions` is NOT optional here.
--
-- Supabase installs PostGIS into the `extensions` schema (see migration
-- 057: `CREATE EXTENSION postgis WITH SCHEMA extensions`). A SECURITY
-- DEFINER function pins its own search_path, so one set to `public`
-- alone cannot see ST_Distance or ST_DWithin at all — the function
-- creates fine and fails at CALL time with "function
-- st_distance(extensions.geography, extensions.geography) does not
-- exist", which reads like a type problem and is a visibility one.
--
-- Migrations 057 and 060 both set `public, extensions` for exactly this
-- reason.
CREATE OR REPLACE FUNCTION public.dispatch_wave(
  p_request_id       UUID,
  p_point            GEOGRAPHY,
  p_radius_m         INT,
  p_date             DATE,
  p_wave             INT,
  p_partners         INT,
  p_expires_at       TIMESTAMPTZ,
  p_allow_synthetic  BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_line     RECORD;
  v_real     INT;
  v_total    INT;
  v_out      JSONB := '[]'::jsonb;
  v_vendors  UUID[];
  v_all      UUID[] := '{}';
BEGIN
  FOR v_line IN
    SELECT l.id, l.trade, l.service_id, l.service_name, l.partner_amount_paise
      FROM booking_lines l
     WHERE l.request_id = p_request_id
       AND l.status IN ('pending', 'dispatching')
     ORDER BY l.created_at
  LOOP
    /* Real partners first, always.
     *
     * The seeded network was generated with ratings between 4.1 and 4.9
     * and a real partner who signed up yesterday has none, so a single
     * ordered query hands every slot to an invented business — and
     * invented businesses have no phones. Two passes, real then filler,
     * is the same rule api/dispatch-booking.js established. */
    SELECT array_agg(m.vendor_id ORDER BY m.rating DESC, m.distance_m)
      INTO v_vendors
      FROM match_partners(v_line.trade, p_point, p_radius_m, p_date,
                          FALSE, p_partners, '{}'::uuid[]) m;

    v_real := COALESCE(array_length(v_vendors, 1), 0);

    IF p_allow_synthetic AND v_real < p_partners THEN
      SELECT v_vendors || COALESCE(array_agg(m.vendor_id ORDER BY m.rating DESC, m.distance_m), '{}')
        INTO v_vendors
        FROM match_partners(v_line.trade, p_point, p_radius_m, p_date,
                            TRUE, p_partners - v_real,
                            COALESCE(v_vendors, '{}'::uuid[])) m;
    END IF;

    v_total := COALESCE(array_length(v_vendors, 1), 0);

    IF v_total = 0 THEN
      /* Nobody to ask. NOT an expiry — a countdown against an empty pool
       * is the `false_urgency` pattern named in config/legal.js. The
       * line stands and keeps looking. */
      UPDATE booking_lines
         SET dispatch_mode = 'standing',
             standing_since = now(),
             stand_until = (p_date::timestamp AT TIME ZONE 'Asia/Kolkata') - interval '1 day'
       WHERE id = v_line.id;

      v_out := v_out || jsonb_build_object(
        'lineId', v_line.id, 'serviceId', v_line.service_id,
        'standing', true, 'notified', 0, 'real', 0);
      CONTINUE;
    END IF;

    INSERT INTO dispatch_offers (line_id, vendor_id, wave, distance_m, partner_amount_paise, expires_at)
    SELECT v_line.id, vid, p_wave,
           ST_Distance(v.location, p_point)::INT,
           v_line.partner_amount_paise,
           p_expires_at
      FROM unnest(v_vendors) AS vid
      JOIN vendors v ON v.id = vid
    ON CONFLICT DO NOTHING;

    UPDATE booking_lines
       SET status = 'dispatching',
           dispatched_at = now(),
           expires_at = p_expires_at
     WHERE id = v_line.id;

    v_all := v_all || v_vendors;

    v_out := v_out || jsonb_build_object(
      'lineId', v_line.id, 'serviceId', v_line.service_id,
      'serviceName', v_line.service_name,
      'partnerAmountPaise', v_line.partner_amount_paise,
      'standing', false, 'notified', v_total, 'real', v_real,
      'vendorIds', to_jsonb(v_vendors));
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'lines', v_out,
    -- Every partner touched, deduplicated, so the caller can look up all
    -- their push tokens in ONE query instead of one per line. A master
    -- offered three services of the same booking is one person.
    'allVendorIds', to_jsonb(ARRAY(SELECT DISTINCT unnest(v_all)))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_wave(UUID, GEOGRAPHY, INT, DATE, INT, INT, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_wave(UUID, GEOGRAPHY, INT, DATE, INT, INT, TIMESTAMPTZ, BOOLEAN) TO service_role;

-- ══════════════════════════════════════════════════════════════════════
-- Indexes for the two queries every screen in the app runs
-- ══════════════════════════════════════════════════════════════════════
--
-- Both are on the polling path, so they run once per open screen per
-- 20 seconds. At a thousand concurrent users that is 100 queries a
-- second on each, and a sequential scan there is what turns a busy
-- Saturday into an outage.

-- The customer's board: every line of one booking.
CREATE INDEX IF NOT EXISTS idx_booking_lines_request_status
  ON booking_lines (request_id, status);

-- The partner's inbox: live offers for one vendor. Partial, because
-- OFFERED rows are a vanishing fraction of the table after a month and
-- the index should not carry the rest.
CREATE INDEX IF NOT EXISTS idx_offers_vendor_offered
  ON dispatch_offers (vendor_id, expires_at)
  WHERE status = 'OFFERED';

-- The strike count and the partner's job list both walk a vendor's
-- accepted offers.
CREATE INDEX IF NOT EXISTS idx_offers_vendor_accepted
  ON dispatch_offers (vendor_id)
  WHERE status = 'ACCEPTED';

COMMIT;
