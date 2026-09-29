-- ════════════════════════════════════════════════════════════════════
-- 132 · `slots_booked` stops being a lie
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 021, 059,
-- 060 and 130.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE COLUMN NOTHING HAS EVER WRITTEN
-- ══════════════════════════════════════════════════════════════════════
--
-- `vendor_availability.slots_booked` was created by 021 with a DEFAULT 0
-- and a CHECK that keeps it under `slots_total`. Six successive versions
-- of `match_partners` (060, 082, 086, 101, 113, 126) have read it:
--
--   OR (a.status = 'LIMITED' AND a.slots_total IS NOT NULL
--       AND a.slots_booked >= a.slots_total)
--
-- and NOTHING HAS EVER INCREMENTED IT. `accept_offer` does not touch it.
-- The API does not touch it. The only writers in the entire repository
-- are two JSX files sending the literal `slots_booked: 0` on every save.
--
-- So that branch has never once been true. A partner who says "I can
-- take two jobs on the 14th" is offered a third, and a fourth. LIMITED
-- has been a label with no mechanism behind it since the day it shipped.
--
-- ── Recomputed, never incremented ───────────────────────────────────
-- The obvious fix is `slots_booked = slots_booked + 1` in accept_offer
-- and `- 1` everywhere a job dies. That is five call sites that must
-- agree forever -- accept, decline, cancel, expire, dispute -- and the
-- first one anybody forgets leaves a partner permanently full with no
-- way to find out why.
--
-- A recount cannot drift. It asks the question the number is supposed to
-- answer -- how many accepted jobs does this partner have that day --
-- and writes the answer. Every path that could change it ends in the
-- same function, and a path somebody forgets to wire up produces a
-- stale number for one write, not a permanent one.
--
-- ── Why the no-op guard matters more than it looks ──────────────────
-- 069 put `availability_wake_standing` on this table: AFTER UPDATE, and
-- for anything not BLOCKED it calls rewake_standing_lines(). If recount
-- wrote the same number back on every trigger firing, every accepted
-- offer would kick the standing-line queue for no reason. So the UPDATE
-- below is guarded with IS DISTINCT FROM and is genuinely silent when
-- nothing changed. (rewake_standing_lines writes dispatch_mode,
-- expires_at and rewake_count -- never `status` -- so it cannot re-enter
-- the booking_lines trigger here. Checked, not assumed.)
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── The one place the number comes from ─────────────────────────────

CREATE OR REPLACE FUNCTION public.recount_vendor_day(p_vendor UUID, p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INTEGER;
BEGIN
  IF p_vendor IS NULL OR p_date IS NULL THEN
    RETURN 0;
  END IF;

  -- The same shape as the NOT EXISTS clause inside match_partners: an
  -- ACCEPTED offer on a line that is still alive. A cancelled or expired
  -- line frees the day back up, which is why they are excluded rather
  -- than the count being taken from offers alone.
  SELECT COUNT(*) INTO v_n
    FROM dispatch_offers o
    JOIN booking_lines l    ON l.id = o.line_id
    JOIN booking_requests r ON r.id = l.request_id
   WHERE o.vendor_id = p_vendor
     AND o.status = 'ACCEPTED'
     AND r.event_date = p_date
     AND l.status NOT IN ('cancelled', 'expired');

  IF v_n = 0 THEN
    -- Do not create a row purely to record a zero. An absent row already
    -- means "nothing special about this day", and inventing one would
    -- fill the table with noise the partner never asked for.
    UPDATE vendor_availability
       SET slots_booked = 0
     WHERE vendor_id = p_vendor
       AND slot_date = p_date
       AND slots_booked IS DISTINCT FROM 0;
    RETURN 0;
  END IF;

  -- A day with confirmed work gets a row whether or not the partner made
  -- one, because the calendar has to be able to show it.
  INSERT INTO vendor_availability AS a (vendor_id, slot_date, status, slots_booked)
  VALUES (p_vendor, p_date, 'OPEN', v_n)
  ON CONFLICT (vendor_id, slot_date) DO UPDATE
     SET slots_booked = EXCLUDED.slots_booked,
         -- vendor_availability_slots_sane (021) forbids slots_booked
         -- above slots_total. Reality outranks the cap: if a partner has
         -- three accepted jobs on a day they capped at two, the cap is
         -- what is wrong, and refusing the write here would abort the
         -- accept transaction instead. 133 is what stops it happening.
         slots_total  = CASE
                          WHEN a.slots_total IS NOT NULL
                           AND a.slots_total < EXCLUDED.slots_booked
                          THEN EXCLUDED.slots_booked
                          ELSE a.slots_total
                        END
   WHERE a.slots_booked IS DISTINCT FROM EXCLUDED.slots_booked;

  RETURN v_n;
END $$;

COMMENT ON FUNCTION public.recount_vendor_day(UUID, DATE) IS
  'Recomputes vendor_availability.slots_booked from accepted offers on live lines. Idempotent and silent when the number has not changed.';

REVOKE ALL ON FUNCTION public.recount_vendor_day(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recount_vendor_day(UUID, DATE) TO authenticated, service_role;

-- ── Every path that changes the answer ends here ────────────────────

CREATE OR REPLACE FUNCTION public.recount_after_offer_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
BEGIN
  SELECT r.event_date INTO v_date
    FROM booking_lines l
    JOIN booking_requests r ON r.id = l.request_id
   WHERE l.id = COALESCE(NEW.line_id, OLD.line_id);

  IF v_date IS NOT NULL THEN
    PERFORM public.recount_vendor_day(COALESCE(NEW.vendor_id, OLD.vendor_id), v_date);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS offer_recounts_the_day ON public.dispatch_offers;
CREATE TRIGGER offer_recounts_the_day
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.dispatch_offers
  FOR EACH ROW EXECUTE FUNCTION public.recount_after_offer_change();

CREATE OR REPLACE FUNCTION public.recount_after_line_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_row  RECORD;
BEGIN
  -- Only a crossing of the alive/dead line changes any count. A line
  -- moving pending -> dispatching -> accepted -> paid does not, and
  -- firing on those would be a recount per payment webhook.
  IF (OLD.status IN ('cancelled', 'expired'))
     IS NOT DISTINCT FROM (NEW.status IN ('cancelled', 'expired')) THEN
    RETURN NULL;
  END IF;

  SELECT r.event_date INTO v_date
    FROM booking_requests r WHERE r.id = NEW.request_id;
  IF v_date IS NULL THEN
    RETURN NULL;
  END IF;

  FOR v_row IN
    SELECT o.vendor_id FROM dispatch_offers o
     WHERE o.line_id = NEW.id AND o.status = 'ACCEPTED'
  LOOP
    PERFORM public.recount_vendor_day(v_row.vendor_id, v_date);
  END LOOP;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS line_recounts_the_day ON public.booking_lines;
CREATE TRIGGER line_recounts_the_day
  AFTER UPDATE OF status ON public.booking_lines
  FOR EACH ROW EXECUTE FUNCTION public.recount_after_line_change();

-- ── Make every existing day true, once ──────────────────────────────
-- Without this the column stays at whatever the JSX last wrote (0) for
-- every day already booked, and 133 would let those days overbook until
-- the next offer happened to touch them.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT o.vendor_id, req.event_date
      FROM dispatch_offers o
      JOIN booking_lines l      ON l.id = o.line_id
      JOIN booking_requests req ON req.id = l.request_id
     WHERE o.status = 'ACCEPTED'
  LOOP
    PERFORM public.recount_vendor_day(r.vendor_id, r.event_date);
  END LOOP;
END $$;

COMMIT;
