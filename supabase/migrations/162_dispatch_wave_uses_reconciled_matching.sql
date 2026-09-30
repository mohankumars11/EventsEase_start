BEGIN;

CREATE OR REPLACE FUNCTION public.match_booking_line_partners(
  p_line_id UUID,
  p_point GEOGRAPHY,
  p_radius_m INTEGER,
  p_date DATE,
  p_allow_synthetic BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 5,
  p_exclude UUID[] DEFAULT '{}'
)
RETURNS TABLE(vendor_id UUID, distance_m INTEGER, rating NUMERIC)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH line AS (
    SELECT l.*, COALESCE(l.match_requirements, '{}'::jsonb) AS req
    FROM booking_lines l
    WHERE l.id = p_line_id
  ),
  candidate_rows AS (
    SELECT m.vendor_id, m.distance_m, m.rating,
           COALESCE(s.match_profile, s.specs->'match_profile', '{}'::jsonb) AS profile,
           v.lead_time_days,
           l.req,
           l.trade,
           l.service_id
    FROM line l
    CROSS JOIN LATERAL match_partners(
      l.trade, p_point, p_radius_m, p_date,
      p_allow_synthetic, GREATEST(p_limit * 4, p_limit), p_exclude
    ) m
    JOIN vendors v ON v.id = m.vendor_id
    JOIN vendor_services s
      ON s.vendor_id = v.id
     AND s.is_active = TRUE
     AND s.category = l.trade
  ),
  candidates AS (
    SELECT * FROM candidate_rows
    WHERE (
      COALESCE(jsonb_array_length(req->'requiredTags'), 0) = 0
      OR profile->'capabilityTags' @> COALESCE(req->'requiredTags', '[]'::jsonb)
    )
    AND (
      (req->'demand'->>'weightKg') IS NULL
      OR COALESCE((profile->'capabilityNumbers'->>'max_payload_kg')::NUMERIC, 0)
         >= NULLIF(req->'demand'->>'weightKg','')::NUMERIC
    )
    AND (
      (req->'demand'->>'passengers') IS NULL
      OR COALESCE((profile->'capabilityNumbers'->>'max_passengers')::NUMERIC, 0)
         >= NULLIF(req->'demand'->>'passengers','')::NUMERIC
    )
    AND (
      (req->'demand'->>'workers') IS NULL
      OR COALESCE((profile->'capabilityNumbers'->>'max_crew')::NUMERIC, 0)
         >= NULLIF(req->'demand'->>'workers','')::NUMERIC
    )
    AND (
      (req->'demand'->>'spaceSqFt') IS NULL
      OR COALESCE((profile->'capabilityNumbers'->>'max_storage_sqft')::NUMERIC, 0)
         >= NULLIF(req->'demand'->>'spaceSqFt','')::NUMERIC
    )
    AND (
      (req->'demand'->>'guests') IS NULL
      OR (profile->'capabilityNumbers'->>'guests_max') IS NULL
      OR (profile->'capabilityNumbers'->>'guests_max')::NUMERIC
         >= NULLIF(req->'demand'->>'guests','')::NUMERIC
    )
    AND (
      p_date IS NULL
      OR GREATEST(COALESCE(lead_time_days, 0), 0)
         <= GREATEST((p_date - CURRENT_DATE), 0)
    )
    AND CASE trade
      WHEN 'Transportation' THEN service_id = 'wedding_car'
      WHEN 'Mini Truck / Pickup' THEN service_id IN ('mini_truck','goods_move')
      WHEN 'Medium / Large Goods Vehicle' THEN service_id = 'goods_vehicle'
      WHEN 'Passenger Transport' THEN service_id = 'passenger_transport'
      WHEN 'Event Equipment Rental' THEN service_id = 'event_equipment'
      WHEN 'Event Materials Supplier' THEN service_id = 'event_materials'
      WHEN 'End-to-End Event Logistics' THEN service_id = 'event_logistics'
      ELSE TRUE
    END
    AND (
      COALESCE(jsonb_array_length(profile->'serviceIds'), 0) = 0
      OR profile->'serviceIds' ? service_id
    )
  )
  SELECT c.vendor_id, c.distance_m, c.rating
  FROM candidates c
  GROUP BY c.vendor_id, c.distance_m, c.rating
  ORDER BY c.rating DESC, c.distance_m ASC
  LIMIT GREATEST(p_limit, 1)
$$;

REVOKE ALL ON FUNCTION public.match_booking_line_partners(UUID,GEOGRAPHY,INTEGER,DATE,BOOLEAN,INTEGER,UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_booking_line_partners(UUID,GEOGRAPHY,INTEGER,DATE,BOOLEAN,INTEGER,UUID[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dispatch_wave(
  p_request_id UUID,
  p_point GEOGRAPHY,
  p_radius_m INTEGER,
  p_date DATE,
  p_wave INTEGER,
  p_partners INTEGER,
  p_expires_at TIMESTAMPTZ,
  p_allow_synthetic BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_line RECORD;
  v_real INT;
  v_total INT;
  v_out JSONB := '[]'::jsonb;
  v_vendors UUID[];
  v_all UUID[] := '{}';
BEGIN
  FOR v_line IN
    SELECT l.id, l.trade, l.service_id, l.service_name, l.partner_amount_paise
      FROM booking_lines l
     WHERE l.request_id = p_request_id
       AND l.status IN ('pending', 'dispatching')
     ORDER BY l.created_at
  LOOP
    SELECT array_agg(m.vendor_id ORDER BY m.rating DESC, m.distance_m)
      INTO v_vendors
      FROM match_booking_line_partners(
        v_line.id, p_point, p_radius_m, p_date, FALSE, p_partners, '{}'::uuid[]
      ) m;

    v_real := COALESCE(array_length(v_vendors, 1), 0);

    IF p_allow_synthetic AND v_real < p_partners THEN
      SELECT v_vendors || COALESCE(array_agg(m.vendor_id ORDER BY m.rating DESC, m.distance_m), '{}')
        INTO v_vendors
        FROM match_booking_line_partners(
          v_line.id, p_point, p_radius_m, p_date, TRUE, p_partners - v_real,
          COALESCE(v_vendors, '{}'::uuid[])
        ) m;
    END IF;

    v_total := COALESCE(array_length(v_vendors, 1), 0);

    IF v_total = 0 THEN
      UPDATE booking_lines
         SET dispatch_mode = 'standing',
             standing_since = now(),
             stand_until = (p_date::timestamp AT TIME ZONE 'Asia/Kolkata') - interval '1 day'
       WHERE id = v_line.id;

      v_out := v_out || jsonb_build_object(
        'lineId', v_line.id, 'serviceId', v_line.service_id,
        'standing', true, 'notified', 0, 'real', 0
      );
      CONTINUE;
    END IF;

    INSERT INTO dispatch_offers (
      line_id, vendor_id, wave, distance_m, partner_amount_paise, expires_at
    )
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
      'vendorIds', to_jsonb(v_vendors)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true, 'lines', v_out,
    'allVendorIds', to_jsonb(ARRAY(SELECT DISTINCT unnest(v_all)))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_wave(UUID,GEOGRAPHY,INTEGER,DATE,INTEGER,INTEGER,TIMESTAMPTZ,BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_wave(UUID,GEOGRAPHY,INTEGER,DATE,INTEGER,INTEGER,TIMESTAMPTZ,BOOLEAN) TO authenticated, service_role;

COMMIT;