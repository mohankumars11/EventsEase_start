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
    rejectedRequirementId: null,
    rejectedDocuments: 0,
    loading: true,
    error: null,
  })
  const runId = useRef(0)

  const load = useCallback(async () => {
    if (!vendorId) { setCounts(c => ({ ...c, loading: false })); return }
    const run = ++runId.current
    try {
      const today = new Date().toISOString().slice(0, 10)

      const [offers, upcoming, unpaid, claim, rejectedDocs] = await Promise.all([
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

        /* ── Which document was sent back ──────────────────────────
           "Action required" used to be account-level only: it lit up
           when `vendors.verification_status` was 'rejected' -- a whole
           account turned down -- and said nothing at all when a single
           document came back while the account was still under review.
           That is the far commoner case, and the one a partner can
           actually fix in two minutes.

           Not a count: the ID. A number tells somebody that something
           is wrong; the id lets the tap open the exact row that needs
           re-uploading instead of a list of eight. `requirement_id` is
           indexed (143:90).

           Oldest first, because a rejection sitting for three days is
           more urgent than one from this morning. */
        supabase.from('vendor_documents').select('requirement_id, updated_at')
          .eq('vendor_id', vendorId).eq('status', 'rejected')
          .order('updated_at', { ascending: true }).limit(1),
      ])

      if (run !== runId.current) return
      /* A failed read here means we do not know, which is not the same
         as knowing there is nothing. It stays null and the caller falls
         back to the account-level signal it always had. */
      const rejected = rejectedDocs?.error ? null : (rejectedDocs?.data?.[0] ?? null)

      setCounts({
        openOffers: offers.count ?? 0,
        upcoming: upcoming.count ?? 0,
        awaitingPayment: unpaid.count ?? 0,
        claimable: claim.count ?? 0,
        rejectedRequirementId: rejected?.requirement_id ?? null,
        rejectedDocuments: rejected ? 1 : 0,
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
