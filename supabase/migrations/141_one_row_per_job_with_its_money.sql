-- ══════════════════════════════════════════════════════════════════════
-- 141 · One row per job, with its money
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 136-140 first. This is the last of the set.
--
-- ── Why a new view and not a wider partner_jobs ─────────────────────
--
-- `partner_jobs` (080) is read by MyJobs, AgendaView, CalendarMonth,
-- UpcomingWeek, JobsStats, three attention head-counts and
-- LiveOperations. Bolting three lateral joins over the ledger onto it
-- would make every calendar dot pay for the earnings screen.
--
-- `partner_jobs` gets three columns it should always have had --
-- `platform_fee_paise`, `platform_fee_rate` and `settled_at` -- by
-- CREATE OR REPLACE, appending at the end. That form is allowed, avoids
-- the window a DROP would open, and existing readers (two of which
-- `select('*')`) simply receive more columns.
--
-- ── !! security_invoker = off !! ────────────────────────────────────
--
-- Read this before editing anything below.
--
-- This view runs as its OWNER, which means it BYPASSES ROW LEVEL
-- SECURITY on payout_claims, escrow_ledger, partner_adjustments and
-- booking_lines. It has to: partners have no policy on booking_requests
-- at all, which is why 080 was written this way in the first place.
--
-- The final WHERE clause is therefore the ONLY thing standing between
-- one partner and another partner's money.
--
--   * it must stay the last line of the view
--   * it must never be pushed down into a subquery or a CTE where a
--     later edit can lose sight of it
--   * `scripts/check-partner-isolation.mjs` asserts, as a real second
--     partner against the real database, that selecting another
--     vendor's rows returns ZERO -- because RLS filters rather than
--     raising, so a test that only checks for an error proves nothing
--
-- ── What it deliberately does NOT project ───────────────────────────
--
-- account_number, ifsc, upi_id, pan. `claim_destination` is already
-- masked by 091 ('Account ending 1234') and is enough to recognise your
-- own account. Bank details reach the client only through the
-- owner-scoped read PayoutDetails already does.
--
-- Re-runnable.

BEGIN;

-- ── partner_jobs gains three columns, appended ──────────────────────
CREATE OR REPLACE VIEW public.partner_jobs
WITH (security_invoker = off) AS
SELECT
  l.id              AS line_id,
  o.id              AS offer_id,
  o.vendor_id,
  v.profile_id      AS partner_profile_id,
  l.status,
  l.service_id,
  l.service_name,
  l.trade,
  l.spec_mode,
  l.customer_note,
  l.reference_photo_url,
  o.partner_amount_paise,
  l.quoted_amount_paise,
  o.distance_m,
  l.accepted_at,
  l.paid_at,
  l.delivered_at,
  l.request_id,
  r.occasion_name,
  r.event_date,
  r.time_note,
  r.guest_count,
  r.area_label,
  r.city,
  EXISTS (
    SELECT 1 FROM public.escrow_ledger e
    WHERE e.line_id = l.id AND e.kind = 'HOLD'
  )                 AS is_funded,
  -- Appended in 141. The RATE matters: booking_lines DEFAULTs it to
  -- 0.15 while PLATFORM_FEE_RATE in JS is 0.08, so recomputing an old
  -- line's commission from today's constant states a fee that was never
  -- taken -- on screen, and worse, on a payment slip.
  l.platform_fee_paise,
  l.platform_fee_rate,
  l.settled_at
FROM public.dispatch_offers o
JOIN public.booking_lines    l ON l.id = o.line_id
JOIN public.booking_requests r ON r.id = l.request_id
JOIN public.vendors          v ON v.id = o.vendor_id
WHERE o.status = 'ACCEPTED'
  AND (v.profile_id = auth.uid()
       OR public.get_my_role() IN ('admin', 'event_coordinator'));

REVOKE ALL ON public.partner_jobs FROM PUBLIC, anon;
GRANT SELECT ON public.partner_jobs TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- partner_earnings
-- ══════════════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS public.partner_earnings;

CREATE VIEW public.partner_earnings
WITH (security_invoker = off) AS
SELECT
  -- ── Identity ────────────────────────────────────────────────────
  l.id            AS line_id,
  o.vendor_id,
  v.profile_id    AS partner_profile_id,
  o.id            AS offer_id,
  l.request_id,

  -- ── The job ─────────────────────────────────────────────────────
  l.service_id,
  l.service_name,
  l.trade,
  r.occasion_name,
  r.event_date,
  r.area_label,
  r.city,

  -- ── Lifecycle ───────────────────────────────────────────────────
  l.status        AS line_status,
  l.accepted_at,
  l.paid_at,
  l.delivered_at,
  l.settled_at,
  l.cancelled_at,
  l.cancellation_excused,

  -- ── Money as it was WRITTEN, not as it would be recomputed ──────
  l.quoted_amount_paise,
  l.platform_fee_paise,
  l.platform_fee_rate,
  l.partner_amount_paise,

  -- ── Escrow, one pass ────────────────────────────────────────────
  COALESCE(esc.held_paise, 0)                AS held_paise,
  COALESCE(esc.is_funded, false)             AS is_funded,
  COALESCE(esc.released_partner_paise, 0)    AS released_partner_paise,
  COALESCE(esc.remitted_tcs_paise, 0)        AS remitted_tcs_paise,
  COALESCE(esc.remitted_tds_paise, 0)        AS remitted_tds_paise,
  COALESCE(esc.released_platform_paise, 0)   AS released_platform_paise,
  COALESCE(esc.penalty_partner_paise, 0)     AS penalty_partner_paise,
  COALESCE(esc.refunded_customer_paise, 0)   AS refunded_customer_paise,
  esc.last_movement_at,

  -- ── The claim that matters ──────────────────────────────────────
  c.id            AS claim_id,
  c.status        AS claim_status,
  c.amount_paise  AS claim_amount_paise,
  c.method        AS claim_method,
  c.destination   AS claim_destination,
  c.requested_at  AS claim_requested_at,
  c.settled_at    AS claim_settled_at,
  c.reference     AS claim_reference,
  c.failure_code  AS claim_failure_code,
  c.failure_reason AS claim_failure_reason,
  c.attempt       AS claim_attempt,

  -- ── The payout it travelled in ──────────────────────────────────
  b.id            AS batch_id,
  b.status        AS batch_status,
  b.reference     AS batch_reference,
  b.paid_at       AS batch_paid_at,

  -- ── Adjustments against this job ────────────────────────────────
  COALESCE(adj.adjustments_paise, 0)  AS adjustments_paise,
  COALESCE(adj.adjustment_count, 0)   AS adjustment_count,

  d.status        AS dispute_status,

  -- ── When the money unlocks ──────────────────────────────────────
  --
  -- The SAME expression claimable() tests (092), so the screen and the
  -- RPC cannot disagree about when a partner may ask. Deriving this in
  -- JS from the device clock is what made the answer timezone-dependent.
  (r.event_date + INTERVAL '1 day')          AS claimable_at,

  -- ── Where the money is, in one word ─────────────────────────────
  --
  -- !! This ladder is mirrored in src/lib/payoutState.js, and
  -- scripts/check-payout-states.mjs parses THIS CASE and asserts the two
  -- sets match. Adding an arm here without adding it there is a partner
  -- being told something the app has no words for. Order is part of the
  -- meaning: terminal facts first, then the money's position, then time.
  CASE
    WHEN l.status IN ('cancelled', 'expired')                    THEN 'cancelled'
    WHEN l.status = 'disputed'
      OR (d.status IS NOT NULL
          AND d.status NOT IN ('resolved', 'withdrawn'))         THEN 'disputed'
    WHEN c.status = 'paid' OR l.status = 'settled'               THEN 'paid'
    WHEN c.status = 'failed'                                     THEN 'failed'
    WHEN c.status = 'rejected'                                   THEN 'rejected'
    WHEN c.status = 'requested'                                  THEN 'claimed'
    WHEN COALESCE(esc.is_funded, false) = false
     AND l.paid_at IS NULL                                       THEN 'unfunded'
    WHEN l.delivered_at IS NOT NULL
     AND now() > (r.event_date + INTERVAL '1 day')               THEN 'ready'
    ELSE 'held'
  END                                                            AS payout_state

FROM public.dispatch_offers o
JOIN public.booking_lines    l ON l.id = o.line_id
JOIN public.booking_requests r ON r.id = l.request_id
JOIN public.vendors          v ON v.id = o.vendor_id

LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(e.amount_paise), 0) AS held_paise,
    bool_or(e.kind = 'HOLD')         AS is_funded,
    COALESCE(-SUM(e.amount_paise) FILTER (WHERE e.kind = 'RELEASE_PARTNER'), 0)  AS released_partner_paise,
    COALESCE(-SUM(e.amount_paise) FILTER (WHERE e.kind = 'REMIT_TCS'), 0)        AS remitted_tcs_paise,
    COALESCE(-SUM(e.amount_paise) FILTER (WHERE e.kind = 'REMIT_TDS'), 0)        AS remitted_tds_paise,
    COALESCE(-SUM(e.amount_paise) FILTER (WHERE e.kind = 'RELEASE_PLATFORM'), 0) AS released_platform_paise,
    COALESCE(-SUM(e.amount_paise) FILTER (WHERE e.kind = 'PENALTY_PARTNER'), 0)  AS penalty_partner_paise,
    COALESCE(-SUM(e.amount_paise) FILTER (WHERE e.kind = 'REFUND_CUSTOMER'), 0)  AS refunded_customer_paise,
    MAX(e.created_at)                AS last_movement_at
  FROM public.escrow_ledger e
  WHERE e.line_id = l.id
) esc ON TRUE

-- The OPEN claim if there is one, otherwise the most recent attempt.
-- A line that failed twice and was then paid must show the payment, and
-- a line that failed and has not been re-asked must show the failure.
LEFT JOIN LATERAL (
  SELECT pc.*
  FROM public.payout_claims pc
  WHERE pc.line_id = l.id
  ORDER BY (pc.status IN ('requested', 'paid')) DESC, pc.requested_at DESC
  LIMIT 1
) c ON TRUE

LEFT JOIN public.payout_batches b ON b.id = c.batch_id

LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(a.amount_paise), 0) AS adjustments_paise,
    COUNT(*)                         AS adjustment_count
  FROM public.partner_adjustments a
  WHERE a.line_id = l.id
) adj ON TRUE

LEFT JOIN LATERAL (
  SELECT ds.status
  FROM public.disputes ds
  WHERE ds.line_id = l.id AND ds.status <> 'withdrawn'
  ORDER BY ds.created_at DESC
  LIMIT 1
) d ON TRUE

-- ══════════════════════════════════════════════════════════════════════
-- THE LAST LINE. Read the header before touching it.
-- ══════════════════════════════════════════════════════════════════════
WHERE o.status = 'ACCEPTED'
  AND (v.profile_id = auth.uid()
       OR public.get_my_role() IN ('admin', 'event_coordinator'));

REVOKE ALL ON public.partner_earnings FROM PUBLIC, anon;
GRANT SELECT ON public.partner_earnings TO authenticated;

COMMIT;
