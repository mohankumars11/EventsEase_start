import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAsyncData } from './useAsyncData'
import { useLivePoll } from './useLivePoll'

/**
 * Everything the Earnings screen reads, in one place that cannot lie.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS EXISTS TO END
 * ══════════════════════════════════════════════════════════════════════
 *
 * Earnings.jsx used to do this:
 *
 *     const [{ data: j }, { data: p }, { data: c }] = await Promise.all([...])
 *     setJobs(j ?? [])
 *
 * Three `error` objects destructured away, and then an empty array fed
 * to a screen whose empty state reads "No earnings yet". So a partner in
 * a lift, on a train, or behind a captive portal was told their money
 * was gone — by the one screen in the app where that sentence is
 * unbearable.
 *
 * `useAsyncData` already existed for exactly this and had no consumers.
 * This is its first. The whole fix is the four `throw`s below: a failed
 * read now fails, loudly, instead of arriving as emptiness.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A FAILED RE-READ LEAVES THE FIGURES UP, AND SAYS SO
 * ══════════════════════════════════════════════════════════════════════
 *
 * This polls every 20 seconds. `useAsyncData` keeps the previous `data`
 * when a re-read throws, so poll nine timing out does not blank a screen
 * somebody is reading. `stale` is how the caller knows to mark it —
 * money going quietly out of date is its own defect, and the answer is
 * a strip that says so, not a blank.
 *
 *   loading  true only on the FIRST read (data === null)
 *   error    the last failure, whether or not rows are still on screen
 *   stale    rows on screen AND the newest read failed
 *
 * ══════════════════════════════════════════════════════════════════════
 * A MIGRATION THAT HAS NOT BEEN PASTED YET IS NOT A FAILURE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Migrations in this project are applied by hand, one paste at a time,
 * which means there is always a window where the deployed app is ahead
 * of the database. PostgREST answers a read of an unknown table with
 * `42P01`, and a screen that treats that as an outage is a screen that
 * white-screens for every partner between a deploy and a paste.
 *
 * So `missingRelation()` maps that one code to "nothing here yet". Every
 * read of an object that may not exist yet goes through it, and the app
 * behaves identically before and after the paste. This is the mechanism
 * that makes the phased rollout in the plan safe — concretely, rather
 * than by hoping the two land in the right order.
 */

/* 42P01 is `undefined_table`. PostgREST puts the SQLSTATE in `code`;
   older versions only said so in the message, hence the second test. */
export function missingRelation(err) {
  if (!err) return false
  if (err.code === '42P01') return true
  return /does not exist/i.test(err.message ?? '')
}

/* maybeSingle() returns {data: null, error: null} for no rows, so an
   error here is real. PGRST116 is single()'s "no rows" and cannot reach
   us — it is tolerated anyway, because the cost of being wrong is a
   partner staring at an error page instead of a bank form. */
function optional(res) {
  if (res.error && res.error.code !== 'PGRST116' && !missingRelation(res.error)) {
    throw res.error
  }
  return res.data ?? null
}

const NOTHING = { jobs: [], payout: null, claims: [], adjustments: [], source: 'none' }

/* ── partner_earnings, with partner_jobs behind it ──────────────────
   Migration 141 is applied, so the view is the read. The fallback stays
   for one release because a deploy can reach a device before a paste
   does, and because rolling 141 back is one DROP VIEW -- at which point
   this keeps working rather than white-screening.

   Delete the fallback, and the JS bucket derivation in payoutState.js
   that exists to serve it, once 141 has been live for a release. */
const VIEW_COLS = [
  'line_id', 'vendor_id', 'service_id', 'service_name', 'trade',
  'occasion_name', 'event_date', 'area_label', 'city',
  'line_status', 'accepted_at', 'paid_at', 'delivered_at', 'settled_at',
  'cancelled_at', 'cancellation_excused',
  'quoted_amount_paise', 'platform_fee_paise', 'platform_fee_rate', 'partner_amount_paise',
  'held_paise', 'is_funded', 'released_partner_paise', 'remitted_tcs_paise',
  'remitted_tds_paise', 'released_platform_paise', 'penalty_partner_paise',
  'refunded_customer_paise', 'last_movement_at',
  'claim_id', 'claim_status', 'claim_amount_paise', 'claim_method',
  'claim_destination', 'claim_requested_at', 'claim_settled_at',
  'claim_reference', 'claim_failure_code', 'claim_failure_reason', 'claim_attempt',
  'batch_id', 'batch_status', 'batch_reference', 'batch_paid_at',
  'adjustments_paise', 'adjustment_count', 'dispute_status',
  'claimable_at', 'payout_state',
].join(', ')

const JOBS_COLS =
  'line_id, service_name, trade, status, partner_amount_paise, quoted_amount_paise, ' +
  'is_funded, paid_at, delivered_at, event_date, occasion_name, area_label'

async function readJobs() {
  const view = await supabase.from('partner_earnings')
    .select(VIEW_COLS).order('event_date', { ascending: false })

  if (!view.error) return { rows: view.data ?? [], source: 'partner_earnings' }
  if (!missingRelation(view.error)) throw view.error

  /* 141 is not on this database. partner_jobs has always been there. */
  const jobs = await supabase.from('partner_jobs')
    .select(JOBS_COLS).order('event_date', { ascending: false })
  if (jobs.error) throw jobs.error
  return { rows: jobs.data ?? [], source: 'partner_jobs' }
}

export function useEarnings(vendorId) {
  const read = useCallback(async () => {
    if (!vendorId) return NOTHING

    const [jobsRes, payoutRes, claimsRes, adjRes] = await Promise.all([
      readJobs(),
      /* `pan` joins the select because s.194-O waives TDS for a
         below-threshold individual who has furnished one, and a screen
         that ignores that shows a net lower than what arrives. Own row
         only — the RLS policy on this table is vendor-scoped. */
      supabase.from('vendor_payout_details')
        .select('method, upi_id, account_number, verified_at, pan')
        .eq('vendor_id', vendorId).maybeSingle(),
      /* The whole row, not three columns of it: the amount, where it
         went, when it settled and the bank reference are what a partner
         needs when they are reconciling against a statement. */
      supabase.from('payout_claims')
        .select('id, line_id, status, amount_paise, method, destination, requested_at, ' +
                'settled_at, reference, note, failure_code, failure_reason, attempt, batch_id')
        .eq('vendor_id', vendorId),
      /* Migration 140. Account-level rows have no line_id, so they are
         read here rather than taken from the view's per-line sum. */
      supabase.from('partner_adjustments')
        .select('id, line_id, kind, amount_paise, reason, effective_on, settled_claim_id')
        .eq('vendor_id', vendorId)
        .order('effective_on', { ascending: false }),
    ])

    /* readJobs() throws on a real failure. If it failed, the screen
       failed — there is no honest way to render Earnings without it. */
    return {
      jobs: jobsRes.rows,
      source: jobsRes.source,
      payout: optional(payoutRes),
      claims: optional(claimsRes) ?? [],
      adjustments: optional(adjRes) ?? [],
    }
  }, [vendorId])

  const { data, loading, error, retry } = useAsyncData(read, [read])
  useLivePoll(retry, 20_000, [retry])

  return {
    ...(data ?? NOTHING),
    loading,
    error,
    retry,
    /* Rows on screen and the newest read failed. Distinct from `error`,
       which is also set when there is nothing to show. */
    stale: !!(error && data),
  }
}

export default useEarnings
