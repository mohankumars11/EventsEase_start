import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * What needs this partner's attention right now.
 *
 * ══════════════════════════════════════════════════════════════════════
 * COUNTS, NOT ROWS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The Jobs header needs to know how many things are waiting, not what
 * they are — the sections below it fetch their own rows. So every query
 * here is `head: true` with an exact count: no payloads, four small
 * round trips, and nothing duplicated with the lists underneath.
 *
 * ── Zero is a reason to render nothing ─────────────────────────────
 * A card reading "Payment due: 0" is worse than no card: it occupies
 * the most valuable strip of the screen to say that nothing is wrong.
 * Every count here is returned as a number and the header decides, so
 * a quiet day produces a quiet screen.
 *
 * ── Only what exists is counted ────────────────────────────────────
 * There is no notifications table and no messages table in this
 * schema — checked, not assumed. So there is no `unreadMessages` field
 * pretending to be zero; the header cannot show a count it has no way
 * to compute, and the section that needs one says so plainly.
 */
export function usePartnerAttention(vendorId) {
  const [counts, setCounts] = useState({
    openOffers: 0,
    upcoming: 0,
    awaitingPayment: 0,
    claimable: 0,
    loading: true,
    error: null,
  })
  const runId = useRef(0)

  const load = useCallback(async () => {
    if (!vendorId) { setCounts(c => ({ ...c, loading: false })); return }
    const run = ++runId.current
    try {
      const today = new Date().toISOString().slice(0, 10)

      const [offers, upcoming, unpaid, claim] = await Promise.all([
        /* Live opportunities: offered, not yet answered, not expired. */
        supabase.from('partner_offer_feed').select('offer_id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId).eq('status', 'OFFERED')
          .gt('expires_at', new Date().toISOString()),

        /* Accepted work still ahead of them. */
        supabase.from('partner_jobs').select('line_id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId).gte('event_date', today)
          .in('status', ['accepted', 'paid', 'in_progress']),

        /* Accepted but the customer has not paid — the state a partner
           most needs flagged, because it decides whether to buy stock. */
        supabase.from('partner_jobs').select('line_id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId).eq('status', 'accepted').eq('is_funded', false),

        /* Delivered and not yet claimed. Money they can ask for. */
        supabase.from('partner_jobs').select('line_id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId).eq('status', 'delivered'),
      ])

      if (run !== runId.current) return
      setCounts({
        openOffers: offers.count ?? 0,
        upcoming: upcoming.count ?? 0,
        awaitingPayment: unpaid.count ?? 0,
        claimable: claim.count ?? 0,
        loading: false,
        error: offers.error ?? upcoming.error ?? null,
      })
    } catch (e) {
      if (run === runId.current) {
        /* Last-known counts are kept. A partner on a train should not
           watch their screen empty itself because one request timed
           out — §49. */
        setCounts(c => ({ ...c, loading: false, error: e }))
      }
    }
  }, [vendorId])

  useEffect(() => { load() }, [load])

  return { ...counts, refresh: load }
}
