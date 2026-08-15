import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Does this customer have anything to track, and does any of it need them?
 *
 * ── Why counts and not rows ───────────────────────────────────────────────
 * This runs on every screen, because the bottom bar is on every screen. It
 * must never become a second copy of `fetchActivity()` — the tab needs two
 * integers, not three tables of JSONB. `head: true` sends no row payload at
 * all, so the whole thing is three cheap counts.
 *
 * ── What the numeric badge is allowed to count ────────────────────────────
 * Only things WAITING ON THE CUSTOMER: a plan sent for approval, an enquiry
 * that has been answered. Deliberately excluded are an order awaiting payment
 * confirmation (that is our reconciliation backlog, not their task), an open
 * return, and an undelivered order.
 *
 * `celebrations.js:221` already set this rule for the same reason: a badge
 * that counts everything is a badge that gets ignored, and once it is ignored
 * the one time something really does need them is the time they miss.
 *
 * A pulse dot with no number covers the other case — something is live, but
 * you do not have to do anything about it.
 */
export function useCustomerActivity() {
  const { user, profile } = useAuth()
  const [state, setState] = useState({ total: 0, needsYou: 0, live: 0, loaded: false })

  useEffect(() => {
    // Vendors and admins never see this tab (BottomNav returns null for them),
    // so there is nothing to spend three queries on.
    const role = profile?.role
    if (!user || role === 'vendor' || role === 'admin') {
      setState({ total: 0, needsYou: 0, live: 0, loaded: true })
      return
    }

    let cancelled = false

    async function count() {
      // `allSettled`, not `all`. With `all`, ONE failing table — an RLS
      // change, a column that does not exist yet, a dropped connection —
      // rejects the whole thing, `setState` never runs, and the tab silently
      // stays on "Occasions" for a customer who has five live orders. The
      // navigation quietly loses a destination and nothing anywhere says so.
      //
      // Same reasoning as `fetchCelebrations`' named-errors contract: a
      // partial answer beats a wrong one, and "you have nothing" is the most
      // damaging thing this can say untruthfully.
      const [orders, events, enquiries, milestones] = await Promise.allSettled([
        supabase.from('orders').select('id, status')
          .eq('customer_id', user.id).limit(200),
        supabase.from('events').select('id, status')
          .eq('customer_id', user.id).limit(200),
        supabase.from('service_enquiries').select('id, status')
          .eq('customer_id', user.id).limit(200),
        // Milestones due. Needs migration 046 for `milestone_id`/`due_at`, so
        // on a database that has not run it this 400s and is discarded —
        // the tab keeps working, it just counts one fewer thing.
        supabase.from('event_payments').select('id, status, due_at, milestone_id')
          .in('status', ['PENDING']).limit(200),
      ])
      if (cancelled) return

      const rowsOf = r => (r.status === 'fulfilled' ? (r.value?.data ?? []) : [])
      const orderRows     = rowsOf(orders)
      const eventRows     = rowsOf(events)
      const enquiryRows   = rowsOf(enquiries)
      const milestoneRows = rowsOf(milestones)

      // Cancelled items still count toward `total`. A tab that disappears the
      // moment you cancel something reads as the app erasing you, and the
      // history is still worth reaching.
      const total = orderRows.length + eventRows.length + enquiryRows.length

      // A milestone whose due date has passed is the one money-related thing
      // that IS the customer's to act on — unlike an order awaiting payment
      // confirmation, which is our bank-reconciliation backlog.
      const now = Date.now()
      const dueMilestones = milestoneRows.filter(
        p => p.milestone_id && p.due_at && new Date(p.due_at).getTime() <= now,
      ).length

      const needsYou =
        eventRows.filter(e => e.status === 'PROPOSAL_SENT' || e.status === 'CUSTOMER_REVIEW').length +
        enquiryRows.filter(e => e.status === 'responded').length +
        dueMilestones

      const live =
        orderRows.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length +
        eventRows.filter(e => e.status !== 'COMPLETED' && e.status !== 'CANCELLED').length +
        enquiryRows.filter(e => e.status !== 'closed' && e.status !== 'cancelled').length

      setState({ total, needsYou, live, loaded: true })
    }

    count()
    return () => { cancelled = true }
  }, [user, profile?.role])

  return state
}
