BEGIN;

ALTER TABLE public.booking_lines
  ADD COLUMN IF NOT EXISTS match_requirements JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.vendor_services
  ADD COLUMN IF NOT EXISTS match_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_booking_lines_match_requirements
  ON public.booking_lines USING GIN (match_requirements);

CREATE INDEX IF NOT EXISTS idx_vendor_services_match_profile
  ON public.vendor_services USING GIN (match_profile);

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
    SELECT l.*,
           COALESCE(l.match_requirements, '{}'::jsonb) AS req
    FROM booking_lines l
    WHERE l.id = p_line_id
  ),
  base AS (
    SELECT m.vendor_id, m.distance_m, m.rating, v.id AS vid, s.id AS service_row_id,
           s.match_profile, v.lead_time_days
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
     AND s.name IS NOT NULL
    WHERE (
      COALESCE(jsonb_array_length(s.match_profile->'serviceIds'), 0) = 0
      OR s.match_profile->'serviceIds' ? l.service_id
    )
    AND (
      COALESCE(jsonb_array_length(l.req->'requiredTags'), 0) = 0
      OR COALESCE(s.match_profile->'capabilityTags', '[]'::jsonb) @> COALESCE(l.req->'requiredTags', '[]'::jsonb)
    )
    AND (
      (l.req->'demand'->>'weightKg') IS NULL
      OR COALESCE((s.match_profile->'capabilityNumbers'->>'max_payload_kg')::NUMERIC, 0)
         >= NULLIF(l.req->'demand'->>'weightKg','')::NUMERIC
    )
    AND (
      (l.req->'demand'->>'passengers') IS NULL
      OR COALESCE((s.match_profile->'capabilityNumbers'->>'max_passengers')::NUMERIC, 0)
         >= NULLIF(l.req->'demand'->>'passengers','')::NUMERIC
    )
    AND (
      (l.req->'demand'->>'workers') IS NULL
      OR COALESCE((s.match_profile->'capabilityNumbers'->>'max_crew')::NUMERIC, 0)
         >= NULLIF(l.req->'demand'->>'workers','')::NUMERIC
    )
    AND (
      (l.req->'demand'->>'spaceSqFt') IS NULL
      OR COALESCE((s.match_profile->'capabilityNumbers'->>'max_storage_sqft')::NUMERIC, 0)
         >= NULLIF(l.req->'demand'->>'spaceSqFt','')::NUMERIC
    )
    AND (
      (l.req->'demand'->>'guests') IS NULL
      OR (s.match_profile->'capabilityNumbers'->>'guests_max') IS NULL
      OR (s.match_profile->'capabilityNumbers'->>'guests_max')::NUMERIC
         >= NULLIF(l.req->'demand'->>'guests','')::NUMERIC
    )
    AND (
      p_date IS NULL
      OR GREATEST(COALESCE(v.lead_time_days, 0), 0)
         <= GREATEST((p_date - CURRENT_DATE), 0)
    )
    AND (
      l.trade NOT IN (
        'Transportation',
        'Mini Truck / Pickup',
        'Medium / Large Goods Vehicle',
        'Passenger Transport',
        'Event Equipment Rental',
        'Event Materials Supplier',
        'End-to-End Event Logistics'
      )
      OR (
        (l.trade = 'Transportation' AND l.service_id = 'wedding_car')
        OR (l.trade = 'Mini Truck / Pickup' AND l.service_id IN ('mini_truck','goods_move'))
        OR (l.trade = 'Medium / Large Goods Vehicle' AND l.service_id = 'goods_vehicle')
        OR (l.trade = 'Passenger Transport' AND l.service_id = 'passenger_transport')
        OR (l.trade = 'Event Equipment Rental' AND l.service_id = 'event_equipment')
        OR (l.trade = 'Event Materials Supplier' AND l.service_id = 'event_materials')
        OR (l.trade = 'End-to-End Event Logistics' AND l.service_id = 'event_logistics')
      )
    )
  )
  SELECT b.vendor_id, b.distance_m, b.rating
  FROM base b
  GROUP BY b.vendor_id, b.distance_m, b.rating
  ORDER BY b.rating DESC, b.distance_m ASC
  LIMIT GREATEST(p_limit, 1)
$$;

REVOKE ALL ON FUNCTION public.match_booking_line_partners(UUID,GEOGRAPHY,INTEGER,DATE,BOOLEAN,INTEGER,UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_booking_line_partners(UUID,GEOGRAPHY,INTEGER,DATE,BOOLEAN,INTEGER,UUID[]) TO authenticated, service_role;

COMMIT;