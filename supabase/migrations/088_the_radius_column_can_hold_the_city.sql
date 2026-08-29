-- ══════════════════════════════════════════════════════════════════════
-- 088 · The radius column can hold a number the city needs
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 086 first.
--
-- ── What went wrong ─────────────────────────────────────────────────
--
-- Migration 058 created the column with the widest radius anyone could
-- ask for at the time:
--
--   radius_km INTEGER NOT NULL DEFAULT 5 CHECK (radius_km BETWEEN 1 AND 25)
--
-- Migration 086 then made the customer's radius stop being a filter at
-- all: dispatch asks the whole city, nearest first, bounded by
-- max_dispatch_radius_m() at 60 km. The client's DEFAULT_RADIUS_KM moved
-- from 5 to 60 to match.
--
-- The CHECK did not move. So the first booking that asked for 60 km was
-- rejected by the database, `create_booking_request` raised, and
-- api/dispatch-booking returned a 500 to every customer who pressed
-- "Find my masters". It reached production and was found by a script
-- that dispatches a real booking rather than by anything that reads code
-- -- three checks and a fourteen-route smoke test all passed while
-- instant booking was completely down.
--
-- ── Why 100 and not 60 ──────────────────────────────────────────────
--
-- 100 is what `vendors.service_radius_km` has carried since 057. Two
-- radii in one system should not have two different ceilings for no
-- reason, and the real bound on how far dispatch reaches belongs in
-- max_dispatch_radius_m() -- one function, changed in one place -- not
-- duplicated into a CHECK that nobody remembers to move.
--
-- That is the actual lesson of this migration: the constraint was
-- enforcing a product decision that had already moved somewhere else.
-- It stays only as a guard against nonsense, which is what a CHECK is
-- good for.
--
-- ── The application-side clamp ──────────────────────────────────────
--
-- api/dispatch-booking.js clamps the stored value to 25 so bookings work
-- whether or not this has been applied. Once it IS applied, that clamp
-- becomes a no-op for anything under 100, and the stored number starts
-- recording what was really asked for again. The clamp can be simplified
-- back to Math.min(radiusKm, MAX_RADIUS_KM) at leisure -- there is no
-- hurry, and no bug either way.
--
-- Re-runnable.

BEGIN;

ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_radius_km_check;

ALTER TABLE public.booking_requests
  ADD CONSTRAINT booking_requests_radius_km_check
  CHECK (radius_km BETWEEN 1 AND 100);

COMMENT ON COLUMN public.booking_requests.radius_km IS
  'How far the customer asked us to look, in km. Since migration 086 this '
  'does not FILTER dispatch -- match_partners reaches the whole city and '
  'the real bound is max_dispatch_radius_m(). Kept because it records what '
  'was asked for, and because standing lines (069) still re-match against it.';

COMMIT;
