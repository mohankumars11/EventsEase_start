import { useCallback, useEffect, useState } from 'react'
import { useLivePoll } from '../../hooks/useLivePoll'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, CalendarDays, CircleDollarSign, PartyPopper, Bell, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'

/**
 * "Here is where you left off."
 *
 * ══════════════════════════════════════════════════════════════════════
 * A MASTER OPENS THIS APP WITH ONE QUESTION
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not "what are my settings" and not "how is my profile". They open it
 * because something is happening, or because they want to know whether
 * anything is. The app answered by showing five tabs and letting them
 * find out.
 *
 * So the top of the dashboard now states the single most pressing fact
 * about their day, and links straight at it. One line, chosen by
 * urgency, and nothing at all when there is genuinely nothing — a
 * standing "no jobs" banner is furniture that pushes the real content
 * down every day for the sake of the days it is right.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ORDERED BY WHAT COSTS THEM MOST TO MISS
 * ══════════════════════════════════════════════════════════════════════
 *
 *   a live offer      45 seconds, and it is gone. Nothing outranks it.
 *   today's job       they are due somewhere, possibly now.
 *   awaiting payment  money coming, no action — worth knowing, not urgent.
 *   next job          the ordinary case.
 *
 * A live offer beats a job happening today because the job today is
 * already theirs and the offer will not wait.
 */
export default function PartnerResume({ vendorId }) {
  const [state, setState] = useState(null)

  const read = useCallback(async () => {
    if (!vendorId) return

    const [{ data: offers }, { data: jobs }] = await Promise.all([
      supabase.from('dispatch_offers')
        .select('id, expires_at').eq('vendor_id', vendorId).eq('status', 'OFFERED')
        .gt('expires_at', new Date().toISOString()),
      supabase.from('partner_jobs').select('*').then(r => r, () => ({ data: [] })),
    ])

    const today = new Date().toDateString()
    const mine = jobs ?? []

    setState({
      live: (offers ?? []).length,
      todays: mine.filter(j =>
        new Date(j.event_date + 'T00:00:00').toDateString() === today &&
        ['paid', 'in_progress'].includes(j.status)),
      awaiting: mine.filter(j => j.status === 'accepted'),
      upcoming: mine
        .filter(j => ['paid', 'in_progress'].includes(j.status) &&
          new Date(j.event_date + 'T00:00:00') > new Date())
        .sort((a, b) => a.event_date.localeCompare(b.event_date)),
    })
  }, [vendorId])

  useEffect(() => {
    read()
    /* The thing this reports changes on a server — an offer arriving, a
     * customer paying — with nothing in this browser involved. Realtime
     * with a poll under it, same rule as everywhere else here. */
    const ch = supabase.channel(`partner-resume-${vendorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_offers' }, read)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_lines' }, read)
      .subscribe()
    /* The poll lives in useLivePoll now: it stops while the screen is
       hidden and catches up in one shot on return. */
    return () => { supabase.removeChannel(ch) }
  }, [read, vendorId])

  useLivePoll(read, 20_000, [read])

  if (!state) return null

  const card = pick(state)
  if (!card) return null

  const Icon = card.icon

  /* ══════════════════════════════════════════════════════════════════
     A LINK TO THE PAGE YOU ARE ON IS A DEAD TAP
     ══════════════════════════════════════════════════════════════════

     Every card here pointed at /dashboard/vendor, and this component is
     rendered ON /dashboard/vendor. Tapping "Next: Photography" navigated
     to the route already loaded: no pathname change, no scroll, no
     feedback. Reported as "the arrow does not work", and it was right.

     On any other screen it still navigates, which is what it is for. On
     the dashboard it scrolls to the jobs instead — which is where the
     card was trying to send somebody anyway, and which also answers the
     other half of the complaint: the jobs list was below three cards and
     a tab bar, and nobody was reaching it. */
  const location = useLocation()
  const alreadyHere = location.pathname === card.to

  if (alreadyHere) {
    return (
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById('your-jobs')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
        className={`mb-4 flex w-full items-center gap-3 rounded-[22px] p-4 text-left ring-1 transition active:scale-[0.995] ${card.cls}`}
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.badge}`}>
          <card.icon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-extrabold leading-snug">{card.title}</span>
          <span className="block text-[12.5px] leading-snug opacity-80">{card.body}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 opacity-60" />
      </button>
    )
  }

  return (
    <Link
      to={card.to}
      className={`flex items-center gap-3 rounded-[22px] p-4 ring-1 transition active:scale-[0.995] ${card.cls}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.badge}`}>
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight">{card.title}</span>
        <span className="mt-0.5 block text-[12.5px] font-semibold leading-snug opacity-80">{card.body}</span>
      </span>
      <ArrowRight size={18} className="shrink-0 opacity-60" />
    </Link>
  )
}

function pick({ live, todays, awaiting, upcoming }) {
  if (live > 0) return {
    icon: Bell,
    title: live === 1 ? 'A job is waiting for your answer' : `${live} jobs waiting for your answer`,
    // The countdown is not repeated here. The inbox below owns it, and
    // two timers for one offer is how a screen starts lying.
    body: 'Answer now — the first master to accept gets it.',
    to: '/dashboard/vendor',
    cls: 'bg-saffron-400/20 ring-saffron-300/70 text-plum-950',
    badge: 'bg-saffron-400 text-plum-950',
  }

  if (todays.length) return {
    icon: PartyPopper,
    title: todays.length === 1 ? `${todays[0].service_name} is today` : `${todays.length} jobs today`,
    body: todays.length === 1
      ? `${todays[0].area_label ?? ''} · mark it done when you finish`
      : 'Mark each one done when you finish.',
    to: '/dashboard/vendor',
    cls: 'bg-forest-50 ring-forest-200/70 text-forest-950',
    badge: 'bg-forest-600 text-white',
  }

  if (awaiting.length) return {
    icon: CircleDollarSign,
    title: awaiting.length === 1 ? 'Waiting for the customer to pay' : `${awaiting.length} waiting for payment`,
    // Repeated from the job card on purpose. It is the one thing a
    // master can lose real money by misreading.
    body: 'You are not confirmed yet — do not buy anything for these.',
    to: '/dashboard/vendor',
    cls: 'bg-amber-50 ring-amber-200 text-amber-950',
    badge: 'bg-amber-400 text-amber-950',
  }

  if (upcoming.length) {
    const n = upcoming[0]
    return {
      icon: CalendarDays,
      title: `Next: ${n.service_name}`,
      body: `${new Date(n.event_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} · ${n.area_label ?? ''} · ${formatINR(Math.round((n.partner_amount_paise ?? 0) / 100))}`,
      to: '/dashboard/vendor',
      cls: 'bg-white ring-ink/[0.07] text-ink',
      badge: 'bg-ink/[0.06] text-ink-soft',
    }
  }

  // Nothing to say. Say nothing.
  return null
}
