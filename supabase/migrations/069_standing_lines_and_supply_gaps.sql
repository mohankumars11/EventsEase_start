-- ============================================================
-- 069 · Standing lines — a service we cannot fill yet, kept honest
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057–068 FIRST.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE PROBLEM, WITH REAL NUMBERS
-- ══════════════════════════════════════════════════════════════════════
--
-- `scripts/seed-partner-network.mjs --scale=launch` models week one: 60
-- partners across Bengaluru. Five trades have exactly ONE partner in the
-- whole city — DJ & Music, Venue, Anchor & MC, Transportation, Sound &
-- AV. On a Saturday, when that one partner is already booked, a DJ line
-- has nobody to offer to at all.
--
-- ── Two bad answers, and the one that is right ───────────────────────
-- HIDE the service until supply exists. Tempting, and wrong: a customer
-- who cannot find "DJ" concludes Sambramo does not do DJs and stops
-- looking. That belief outlives the supply gap by months. It also throws
-- away the only signal that says WHICH partner to recruit next.
--
-- EXPIRE the line after the waves. Also wrong: the customer watched a
-- countdown against an empty pool. Nothing was ever going to happen, and
-- a countdown that was never real is precisely the `false_urgency` dark
-- pattern named in config/legal.js.
--
-- So: the service stays visible, the line goes STANDING, and the customer
-- is told the truth — we are still looking, and you will be told when we
-- find someone. No countdown, because there is nobody to count down.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT MAKES THIS HONEST RATHER THAN A HOLDING PEN
-- ══════════════════════════════════════════════════════════════════════
--
--   1. A standing line is NEVER PAYABLE. Payment is per line (059), so a
--      customer pays for the masters who accepted and for nobody else.
--      There is no deposit, no hold, no charge against a maybe.
--
--   2. It has a HORIZON. `stand_until` defaults to the day before the
--      event, and the line is closed honestly when it passes rather than
--      being left to rot in a list.
--
--   3. It re-dispatches BY ITSELF when supply appears — a partner in that
--      trade being approved, or opening a blocked date. The customer is
--      not waiting on somebody remembering to look.
--
--   4. The gap is VISIBLE to the business as a recruitment target, with a
--      trade, an area and a date on it. That is the most actionable
--      supply data this platform can produce and it exists only because
--      the line was kept rather than hidden.
-- ============================================================

BEGIN;

-- ── window | standing ────────────────────────────────────────────────
-- `window`   the normal path: waves of offers against a real pool, with
--            a real countdown.
-- `standing` no partner exists to offer to. Kept, watched, re-dispatched
--            when one appears.
ALTER TABLE booking_lines ADD COLUMN IF NOT EXISTS dispatch_mode TEXT NOT NULL DEFAULT 'window'
  CHECK (dispatch_mode IN ('window','standing'));

ALTER TABLE booking_lines ADD COLUMN IF NOT EXISTS standing_since TIMESTAMPTZ;

-- How long we keep looking. Set by the dispatcher to the day before the
-- event: past that there is no job left to fill, and continuing to
-- "look" would be theatre.
ALTER TABLE booking_lines ADD COLUMN IF NOT EXISTS stand_until TIMESTAMPTZ;

-- How many times supply appeared and we re-dispatched. A line that has
-- woken five times and still not filled is a different conversation from
-- one that has never woken — the first is a pricing problem, the second
-- is a supply problem.
ALTER TABLE booking_lines ADD COLUMN IF NOT EXISTS rewake_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE booking_lines DROP CONSTRAINT IF EXISTS booking_lines_standing_has_since;
ALTER TABLE booking_lines ADD CONSTRAINT booking_lines_standing_has_since
  CHECK (dispatch_mode <> 'standing' OR standing_since IS NOT NULL);

-- The re-dispatch queue.
CREATE INDEX IF NOT EXISTS idx_booking_lines_standing
  ON booking_lines (trade, stand_until)
  WHERE dispatch_mode = 'standing' AND status IN ('pending','dispatching');

-- ══════════════════════════════════════════════════════════════════════
-- supply_gaps — the recruitment target, as a query
-- ══════════════════════════════════════════════════════════════════════
-- Every standing line is a customer who wanted to spend money and could
-- not. Grouped by trade and area, that is a ranked list of exactly which
-- partner to sign next, and it is worth more than any market research
-- because every row is a real person who tried.
--
-- `security_invoker = on` for the same reason as 068's view: a view
-- without it runs as its owner and walks straight through the RLS
-- underneath.
CREATE OR REPLACE VIEW supply_gaps
WITH (security_invoker = on) AS
SELECT
  l.trade,
  r.area_label,
  r.city,
  COUNT(*)                                   AS standing_lines,
  COUNT(DISTINCT r.customer_id)              AS customers_affected,
  SUM(l.quoted_amount_paise)                 AS unserved_value_paise,
  MIN(r.event_date)                          AS soonest_event,
  MAX(l.rewake_count)                        AS most_rewakes,
  MIN(l.standing_since)                      AS waiting_since
FROM booking_lines l
JOIN booking_requests r ON r.id = l.request_id
WHERE l.dispatch_mode = 'standing'
  AND l.status IN ('pending','dispatching')
GROUP BY l.trade, r.area_label, r.city
ORDER BY COUNT(*) DESC, SUM(l.quoted_amount_paise) DESC;

COMMENT ON VIEW supply_gaps IS
  'Standing lines by trade and area — which partner to recruit next, ranked by real unserved demand.';

-- ══════════════════════════════════════════════════════════════════════
-- rewake_standing_lines — supply appeared, go and look again
-- ══════════════════════════════════════════════════════════════════════
--
-- Called when a partner is approved (067) or opens a previously blocked
-- date. It does NOT dispatch — it marks lines as ready so the dispatcher
-- picks them up on its next pass.
--
-- ── Why marking rather than dispatching ──────────────────────────────
-- Dispatching means creating offers, computing distances and sending
-- notifications. Doing that inside a trigger on `vendors` would put an
-- unbounded amount of work inside the transaction that approves a
-- partner — approve one decorator with two hundred standing lines behind
-- them and the console times out. Marking is O(rows) and bounded; the
-- dispatcher is where the work belongs.
CREATE OR REPLACE FUNCTION public.rewake_standing_lines(p_vendor_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_vendor vendors%ROWTYPE;
  v_count  INTEGER := 0;
BEGIN
  SELECT * INTO v_vendor FROM vendors WHERE id = p_vendor_id;
  IF NOT FOUND OR NOT v_vendor.is_verified OR v_vendor.location IS NULL THEN
    RETURN 0;
  END IF;

  -- Only lines this partner could actually serve: their trade, inside
  -- both radii, on a date they are not blocked. Waking a line that this
  -- partner still cannot fill would send the customer a "we found
  -- someone" that is not true.
  UPDATE booking_lines l
     SET dispatch_mode = 'window',
         expires_at    = NULL,
         rewake_count  = l.rewake_count + 1
    FROM booking_requests r
   WHERE r.id = l.request_id
     AND l.dispatch_mode = 'standing'
     AND l.status IN ('pending','dispatching')
     AND (l.stand_until IS NULL OR l.stand_until > now())
     AND r.event_date >= CURRENT_DATE
     AND EXISTS (
       SELECT 1 FROM vendor_services s
       WHERE s.vendor_id = v_vendor.id AND s.category = l.trade AND s.is_active = TRUE
     )
     AND ST_DWithin(v_vendor.location, r.location, r.radius_km * 1000)
     AND ST_DWithin(v_vendor.location, r.location, v_vendor.service_radius_km * 1000)
     AND NOT EXISTS (
       SELECT 1 FROM vendor_availability a
       WHERE a.vendor_id = v_vendor.id AND a.slot_date = r.event_date AND a.status = 'BLOCKED'
     );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.rewake_standing_lines(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rewake_standing_lines(UUID) TO authenticated;

-- ── Supply appearing wakes the queue, without anybody remembering ────
CREATE OR REPLACE FUNCTION public.on_vendor_supply_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- TG_OP is branched on FIRST and the two cases never share a
  -- statement. `OLD` is unassigned in an INSERT trigger and referencing
  -- it there raises at runtime — a failure that would only appear the
  -- first time somebody inserted a pre-verified partner, which is
  -- exactly what the admin listing flow does.
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_verified THEN
      PERFORM public.rewake_standing_lines(NEW.id);
    END IF;
  ELSIF NEW.is_verified AND NOT OLD.is_verified THEN
    PERFORM public.rewake_standing_lines(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS vendors_wake_standing ON vendors;
CREATE TRIGGER vendors_wake_standing
  AFTER INSERT OR UPDATE OF is_verified ON vendors
  FOR EACH ROW EXECUTE FUNCTION public.on_vendor_supply_change();

-- A partner un-blocking a date is the other way supply appears, and it
-- is the commoner one: an existing partner freeing up a Saturday.
CREATE OR REPLACE FUNCTION public.on_availability_opened()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Same rule as above, mirrored: `NEW` is unassigned in a DELETE
  -- trigger. A partner deleting a BLOCKED row is the commonest way a
  -- Saturday opens up, so this path runs constantly and must not touch
  -- NEW at all.
  IF TG_OP = 'DELETE' THEN
    PERFORM public.rewake_standing_lines(OLD.vendor_id);
  ELSIF NEW.status <> 'BLOCKED' THEN
    PERFORM public.rewake_standing_lines(NEW.vendor_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS availability_wake_standing ON vendor_availability;
CREATE TRIGGER availability_wake_standing
  AFTER UPDATE OR DELETE ON vendor_availability
  FOR EACH ROW EXECUTE FUNCTION public.on_availability_opened();

-- ══════════════════════════════════════════════════════════════════════
-- Closing a line honestly when the horizon passes
-- ══════════════════════════════════════════════════════════════════════
-- Run from the dispatch cron. A standing line whose event has arrived is
-- over, and saying so is better than leaving it in a list that quietly
-- grows. Nothing was charged, so nothing is refunded.
CREATE OR REPLACE FUNCTION public.close_lapsed_standing_lines()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER := 0;
BEGIN
  UPDATE booking_lines l
     SET status = 'expired'
    FROM booking_requests r
   WHERE r.id = l.request_id
     AND l.dispatch_mode = 'standing'
     AND l.status IN ('pending','dispatching')
     AND (l.stand_until < now() OR r.event_date < CURRENT_DATE);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMIT;
