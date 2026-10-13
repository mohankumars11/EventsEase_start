/**
 * Customers: the half that is not built yet.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS SCREEN SAYS SO INSTEAD OF SHOWING AN EMPTY TABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * There are rows in `profiles` with role 'customer' and there are two
 * cancelled booking lines. A table over them would render, be empty,
 * and read as "no customers have booked" — which is a claim about the
 * business rather than a statement about the software. The honest
 * version names what is missing and what will appear here.
 *
 * The counts below are real head-queries, not decoration: if somebody
 * does sign up tomorrow, this screen will say so rather than continuing
 * to insist the feature is unbuilt.
 */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Users, CalendarCheck, Receipt, MessageSquare, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SectionHead, StatTile } from './viz/Primitives'

const COMING = [
  { icon: Users, title: 'Who they are', body: 'Every customer, when they joined, which city, and how to reach them.' },
  { icon: CalendarCheck, title: 'What they booked', body: 'Each event, the partners on it, what was accepted and what fell through.' },
  { icon: Receipt, title: 'What they paid', body: 'Payments, refunds and what is still held in escrow against the event.' },
  { icon: MessageSquare, title: 'What they said', body: 'Messages, complaints and reviews, beside the booking they are about.' },
]

export default function CustomersPlaceholder() {
  const [n, setN] = useState(undefined)

  const load = useCallback(async () => {
    try {
      const [c, r, l] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('booking_requests').select('id', { count: 'exact', head: true }),
        supabase.from('booking_lines').select('id', { count: 'exact', head: true }),
      ])
      setN({ customers: c.count ?? 0, requests: r.count ?? 0, lines: l.count ?? 0 })
    } catch {
      setN({ customers: 0, requests: 0, lines: 0 })
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (n === undefined) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-plum-600" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Customer accounts" value={n.customers} sub="role = customer" />
        <StatTile label="Booking requests" value={n.requests} sub="all time" />
        <StatTile label="Booking lines" value={n.lines} sub="one per partner on an event" />
      </div>

      <div className="rounded-[18px] bg-white p-6 ring-1 ring-ink/[0.07]">
        <SectionHead
          title="This console covers partners, not customers — yet"
          sub="The customer app is not built, so there is nothing truthful to show here beyond the counts above.">
          <button type="button" onClick={load} aria-label="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.04] text-ink/60">
            <RefreshCw size={14} />
          </button>
        </SectionHead>

        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink/60">
          An empty table here would read as &ldquo;nobody has booked&rdquo;, which is a claim about the
          business rather than a fact about the software. When the customer side exists, this becomes
          the second full group in the console and gets the same standard as Partners: everything
          about the subject, or it does not go in.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {COMING.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[14px] bg-ink/[0.02] p-4 ring-1 ring-ink/[0.05]">
              <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-ink/75">
                <Icon size={14} className="text-plum-600" />{title}
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink/55">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
