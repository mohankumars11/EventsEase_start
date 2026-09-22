-- ════════════════════════════════════════════════════════════════════
-- 131 · A standing week, and the off-by-one that made it lie
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 021 and 116.
--
-- ══════════════════════════════════════════════════════════════════════
-- `weekly_days_off` IS WRITTEN, DRAWN, AND READ BY NOTHING
-- ══════════════════════════════════════════════════════════════════════
--
-- 021 added `vendors.weekly_days_off SMALLINT[]`. The onboarding step
-- writes it, the month grid draws a dashed ring from it, and no SQL
-- function has ever read it. A partner who marks Sunday as a standing
-- day off is still offered Sunday jobs, every week, forever.
--
-- ── And the day it draws is the wrong day ───────────────────────────
-- src/pages/partner/steps/ServiceAreaStep.jsx defines
--     DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
-- and stores the ARRAY INDEX. So Monday is written as 0. Every reader
-- -- MonthGrid, config/vendor.js WEEKDAYS -- uses JavaScript's getDay(),
-- where 0 is SUNDAY. Mark Monday off, watch Sunday go dashed.
--
-- The backfill below cannot inspect a stored 0 and know which of the two
-- conventions produced it. It assumes every existing row came from
-- ServiceAreaStep, which is the only writer, so Mon=0 -- and converts
-- with (i + 1) % 7. The partner network is test data, so a wrong guess
-- here costs a re-tick, not a lost booking. The WRITER is fixed in the
-- same change; this table is 0 = Sunday and says so in a COMMENT,
-- because the whole bug was a convention nobody wrote down.
--
-- ── Why a table and not two more columns on vendors ─────────────────
-- "Available Mondays 9-6, from October, until the end of the year" has
-- a weekday, an availability, two times and two dates. Seven of those do
-- not fit on `vendors`, and effective dates are the reason a partner can
-- change their standing week without rewriting history.
--
-- ── What outranks what ──────────────────────────────────────────────
-- A `vendor_availability` row is a statement about ONE DATE and always
-- wins. This table is the fallback for a date with no row. So "closed
-- Sundays, but open this Sunday" is expressible, and is exactly what
-- useVendorAccount.clearDays vs setRangeStatus(…, 'OPEN') already
-- distinguish on the client.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.vendor_weekly_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  weekday        SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  start_time     TIME,
  end_time       TIME,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to   DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vendor_weekly_rules_one_per_start
    UNIQUE (vendor_id, weekday, effective_from),
  CONSTRAINT vendor_weekly_rules_window_sane
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT vendor_weekly_rules_hours_sane
    CHECK ((start_time IS NULL) = (end_time IS NULL))
);

COMMENT ON TABLE public.vendor_weekly_rules IS
  'The partner''s standing week. Outranked by any vendor_availability row for a specific date.';

COMMENT ON COLUMN public.vendor_weekly_rules.weekday IS
  '0 = SUNDAY, matching JavaScript getDay() and config/vendor.js WEEKDAYS. Written down because the convention being implicit is what caused the bug this table replaces.';

CREATE INDEX IF NOT EXISTS idx_weekly_rules_lookup
  ON public.vendor_weekly_rules (vendor_id, weekday, effective_from DESC);

DROP TRIGGER IF EXISTS trg_vendor_weekly_rules_updated_at ON public.vendor_weekly_rules;
CREATE TRIGGER trg_vendor_weekly_rules_updated_at
  BEFORE UPDATE ON public.vendor_weekly_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Backfill, under the stated assumption ───────────────────────────
-- DATE '2026-01-01' is the same floor booking_requests uses
-- (booking_requests_date_not_past, 058), so a rule covers every date the
-- system can hold a booking for.

INSERT INTO public.vendor_weekly_rules
  (vendor_id, weekday, is_available, effective_from)
SELECT v.id, ((d.idx + 1) % 7)::SMALLINT, FALSE, DATE '2026-01-01'
  FROM public.vendors v
  CROSS JOIN LATERAL unnest(v.weekly_days_off) AS d(idx)
 WHERE v.weekly_days_off IS NOT NULL
   AND array_length(v.weekly_days_off, 1) > 0
ON CONFLICT (vendor_id, weekday, effective_from) DO NOTHING;

COMMENT ON COLUMN public.vendors.weekly_days_off IS
  'SUPERSEDED by vendor_weekly_rules as of 131. Never read by any function; kept only so an unmigrated client does not 400. Do not write this.';

-- ── The one definition of "is this weekday open" ────────────────────
-- 133 and 134 both need this. Writing the predicate twice is how
-- match_partners ended up with six divergent copies of the availability
-- check, so it lives in one function from the start.

CREATE OR REPLACE FUNCTION public.weekday_is_open(p_vendor UUID, p_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- No rule at all means open. Only the newest rule that has come into
  -- effect for this weekday applies; older ones are history, not policy.
  SELECT COALESCE((
    SELECT r.is_available
      FROM vendor_weekly_rules r
     WHERE r.vendor_id = p_vendor
       AND r.weekday = EXTRACT(DOW FROM p_date)::SMALLINT
       AND r.effective_from <= p_date
       AND (r.effective_to IS NULL OR r.effective_to >= p_date)
     ORDER BY r.effective_from DESC
     LIMIT 1
  ), TRUE)
$$;

COMMENT ON FUNCTION public.weekday_is_open(UUID, DATE) IS
  'Does the partner''s standing week leave this date open? TRUE when no rule applies. Says nothing about vendor_availability, which outranks it.';

GRANT EXECUTE ON FUNCTION public.weekday_is_open(UUID, DATE) TO authenticated, service_role;

-- ── RLS, mirroring vendor_availability exactly ──────────────────────
-- Read own via owns_vendor; write own only while not suspended, via
-- owns_active_vendor (116). A suspended partner must not be able to
-- reopen their week.

ALTER TABLE public.vendor_weekly_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_reads_own_weekly_rules" ON public.vendor_weekly_rules;
CREATE POLICY "vendor_reads_own_weekly_rules" ON public.vendor_weekly_rules
  FOR SELECT USING (public.owns_vendor(vendor_id));

DROP POLICY IF EXISTS "active_vendor_writes_own_weekly_rules" ON public.vendor_weekly_rules;
CREATE POLICY "active_vendor_writes_own_weekly_rules" ON public.vendor_weekly_rules
  FOR INSERT WITH CHECK (public.owns_active_vendor(vendor_id));

DROP POLICY IF EXISTS "active_vendor_updates_own_weekly_rules" ON public.vendor_weekly_rules;
CREATE POLICY "active_vendor_updates_own_weekly_rules" ON public.vendor_weekly_rules
  FOR UPDATE USING (public.owns_active_vendor(vendor_id))
         WITH CHECK (public.owns_active_vendor(vendor_id));

DROP POLICY IF EXISTS "active_vendor_deletes_own_weekly_rules" ON public.vendor_weekly_rules;
CREATE POLICY "active_vendor_deletes_own_weekly_rules" ON public.vendor_weekly_rules
  FOR DELETE USING (public.owns_active_vendor(vendor_id));

DROP POLICY IF EXISTS "admins_all_weekly_rules" ON public.vendor_weekly_rules;
CREATE POLICY "admins_all_weekly_rules" ON public.vendor_weekly_rules
  FOR ALL USING (public.get_my_role() IN ('admin', 'event_coordinator'));

-- Deliberately NO anon policy. 021 gave vendor_availability a public
-- read for approved vendors; that was a mistake worth not repeating --
-- a standing week is a fact about a person's life, and the customer
-- side gets counts from 134 instead.
REVOKE ALL ON public.vendor_weekly_rules FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_weekly_rules TO authenticated;

COMMIT;
