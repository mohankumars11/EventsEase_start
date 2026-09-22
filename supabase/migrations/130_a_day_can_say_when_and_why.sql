-- ════════════════════════════════════════════════════════════════════
-- 130 · A day can say WHEN, and WHY
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 021 and 116.
--
-- ══════════════════════════════════════════════════════════════════════
-- "I AM FREE, BUT ONLY IN THE AFTERNOON" IS CURRENTLY INEXPRESSIBLE
-- ══════════════════════════════════════════════════════════════════════
--
-- `vendor_availability` is whole-day. A partner who shoots a morning
-- wedding and is free from 5pm has exactly two options: mark the day
-- OPEN and be offered a job that overlaps, or mark it BLOCKED and lose
-- the evening entirely. Both are worse than being able to say when.
--
-- And a BLOCKED day currently carries no reason at all. `note` exists,
-- but 021 documents it as the partner's own private note -- so there is
-- nowhere to record "travelling" as a FACT, only as prose. The partner
-- looking at their own month three weeks later cannot tell a family
-- function from a booked-elsewhere from a typo.
--
-- ── Why one JSONB column and not a windows table ────────────────────
-- A split shift is 10-1 and 5-10: two windows, read and written
-- together, never queried across partners, never joined to. A child
-- table would buy a join and a second RLS policy to express an array.
--   hours = [{"start":"14:00","end":"20:00"}]
--   hours IS NULL means "my usual day" -- which is the overwhelming
--   majority of rows, and is why this is nullable rather than defaulted.
--
-- ── What the matcher does and does not do with this ─────────────────
-- Nothing, yet, and deliberately. `booking_requests` has no start or end
-- time -- only `time_note TEXT`, which 058 explicitly declines to parse.
-- So hours are shown to the partner and drive the client-side conflict
-- warnings in src/lib/calendarConflicts.js; they cannot gate matching
-- until a request carries a real time. Recording that here so the next
-- reader does not assume the gate exists.
--
-- ── reason is for the PARTNER, never for the customer ───────────────
-- A customer is told "unavailable" and nothing else. `reason`,
-- `reason_detail` and `note` are never returned by any customer-facing
-- function. The one already-public policy on this table
-- (`public_reads_approved_vendor_availability`, 021) is the reason that
-- sentence needs a guard rather than a convention -- see 134, which
-- gives the customer side a counting function instead of row access.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · When ────────────────────────────────────────────────────────

ALTER TABLE public.vendor_availability
  ADD COLUMN IF NOT EXISTS hours         JSONB,
  ADD COLUMN IF NOT EXISTS reason        TEXT,
  ADD COLUMN IF NOT EXISTS reason_detail TEXT;

COMMENT ON COLUMN public.vendor_availability.hours IS
  'Windows the partner is available that day, [{"start":"HH:MM","end":"HH:MM"}]. NULL means their usual working hours. An array so a split shift needs no second table.';

COMMENT ON COLUMN public.vendor_availability.reason IS
  'Why the day is blocked, from a fixed list. PARTNER-FACING ONLY -- never returned to a customer.';

COMMENT ON COLUMN public.vendor_availability.reason_detail IS
  'The partner''s own words when reason = ''other''. PARTNER-FACING ONLY.';

COMMENT ON COLUMN public.vendor_availability.note IS
  'Private note, visible only to the partner. Never returned to a customer.';

-- ADD CONSTRAINT has no IF NOT EXISTS, so re-runnability is explicit.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'vendor_availability_reason_known') THEN
    ALTER TABLE public.vendor_availability
      ADD CONSTRAINT vendor_availability_reason_known
      CHECK (reason IS NULL OR reason IN
        ('personal','holiday','travel','maintenance','committed','unavailable','other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'vendor_availability_hours_is_array') THEN
    ALTER TABLE public.vendor_availability
      ADD CONSTRAINT vendor_availability_hours_is_array
      CHECK (hours IS NULL OR jsonb_typeof(hours) = 'array');
  END IF;
END $$;

-- ── 2 · The partner's usual day ─────────────────────────────────────
-- Defaults chosen to match what the app has always displayed as the
-- working window, so no existing partner's behaviour changes.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS working_start TIME NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS working_end   TIME NOT NULL DEFAULT '22:00';

COMMENT ON COLUMN public.vendors.working_start IS
  'Default start of the partner''s day. A vendor_availability row with non-null hours overrides it for that date.';

-- One capacity column, not three. 021 created max_events_per_day and
-- 079 added daily_capacity beside it without removing either. Nothing
-- reads either one today; 133 starts reading max_events_per_day, so
-- daily_capacity is marked dead here rather than quietly diverging.
COMMENT ON COLUMN public.vendors.daily_capacity IS
  'DEAD as of 130. Duplicate of max_events_per_day (021), which is the column the accept path reads. Do not write this.';

COMMENT ON COLUMN public.vendors.max_events_per_day IS
  'The default cap on confirmed jobs per day. A vendor_availability row with slots_total overrides it for that date.';

-- ── 3 · Who changed what, and when ──────────────────────────────────
-- Availability disputes are "I definitely blocked that weekend" against
-- a row that says OPEN, and neither side can prove anything. This is
-- written by a trigger rather than by the app, so it records what
-- actually reached the table -- including writes the app did not make.

CREATE TABLE IF NOT EXISTS public.vendor_availability_audit (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id        UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  slot_date        DATE NOT NULL,
  action           TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  from_status      TEXT,
  to_status        TEXT,
  from_slots_total INTEGER,
  to_slots_total   INTEGER,
  actor_profile_id UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_availability_audit_lookup
  ON public.vendor_availability_audit (vendor_id, slot_date, created_at DESC);

COMMENT ON TABLE public.vendor_availability_audit IS
  'Append-only history of every availability change, written by trigger. The app has no INSERT policy here on purpose -- a client that can write its own audit trail has not got one.';

CREATE OR REPLACE FUNCTION public.log_vendor_availability_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY DEFINER because the audit table deliberately has no INSERT
  -- policy for anybody. auth.uid() is still the CALLER's identity here,
  -- and is NULL for a service-role or cron write, which is itself worth
  -- recording: it says "not a partner did this".
  INSERT INTO public.vendor_availability_audit (
    vendor_id, slot_date, action,
    from_status, to_status, from_slots_total, to_slots_total, actor_profile_id)
  VALUES (
    COALESCE(NEW.vendor_id, OLD.vendor_id),
    COALESCE(NEW.slot_date, OLD.slot_date),
    TG_OP,
    OLD.status, NEW.status, OLD.slots_total, NEW.slots_total,
    auth.uid());
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS vendor_availability_audit ON public.vendor_availability;
CREATE TRIGGER vendor_availability_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.vendor_availability
  FOR EACH ROW EXECUTE FUNCTION public.log_vendor_availability_change();

ALTER TABLE public.vendor_availability_audit ENABLE ROW LEVEL SECURITY;

-- A partner reads their own history. Nobody inserts, updates or deletes
-- through PostgREST -- there is no policy for those, which is the point.
DROP POLICY IF EXISTS "vendor_reads_own_availability_audit"
  ON public.vendor_availability_audit;
CREATE POLICY "vendor_reads_own_availability_audit"
  ON public.vendor_availability_audit
  FOR SELECT USING (public.owns_vendor(vendor_id));

DROP POLICY IF EXISTS "admins_read_availability_audit"
  ON public.vendor_availability_audit;
CREATE POLICY "admins_read_availability_audit"
  ON public.vendor_availability_audit
  FOR SELECT USING (public.get_my_role() IN ('admin', 'event_coordinator'));

REVOKE ALL ON public.vendor_availability_audit FROM PUBLIC, anon;
GRANT SELECT ON public.vendor_availability_audit TO authenticated;

COMMIT;
