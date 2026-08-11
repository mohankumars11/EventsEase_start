import { Link } from 'react-router-dom'
import { ChevronRight, Calendar, MapPin } from 'lucide-react'
import { EVENT_TYPES, EVENT_TYPE_EMOJIS, EVENT_STATUSES } from '../../config/sambramo'

/**
 * "Your celebration is being arranged" — the live strip at the top of home.
 *
 * A food app shows the order that is out for delivery before it shows
 * anything it wants to sell you, because for the twenty minutes that order is
 * live it is the only thing the customer opened the app for. A concierge
 * booking runs for weeks rather than minutes, which makes the equivalent more
 * valuable here, not less: someone whose wedding proposal is being prepared
 * checks in repeatedly, and the answer used to be four taps down a separate
 * dashboard.
 *
 * The bar is a real position in a real pipeline — the index of the event's
 * status within the ordered stage list, which is the same sequence the admin
 * console moves it through. It is not a fake "80% complete".
 */

// The customer-visible run of stages, in order. CANCELLED and COMPLETED are
// deliberately absent: neither is a step on the way to anything, and an event
// in either state is not "in progress" and never reaches this component.
const PIPELINE = [
  'REQUEST_RECEIVED',
  'UNDER_REVIEW',
  'CONTACTING_VENDORS',
  'QUOTES_COLLECTED',
  'PROPOSAL_PREPARED',
  'PROPOSAL_SENT',
  'CUSTOMER_REVIEW',
  'APPROVED',
  'CONFIRMED',
  'IN_COORDINATION',
  'EVENT_DAY',
]

// The one stage where the ball is in the customer's court. It gets a
// different colour and a different verb, because "Your Review Needed" styled
// identically to "Contacting Vendors" reads as progress to watch rather than
// as a thing to go and do — and a proposal nobody opens is the most expensive
// way for this business to stall.
const NEEDS_YOU = new Set(['CUSTOMER_REVIEW', 'PROPOSAL_SENT'])

export default function LiveEventStrip({ events = [] }) {
  if (events.length === 0) return null

  return (
    <section aria-label="Your celebrations in progress" className="px-4">
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x scroll-pl-4">
        {events.map(e => <LiveCard key={e.id} event={e} single={events.length === 1} />)}
      </div>
    </section>
  )
}

function LiveCard({ event, single }) {
  const status = EVENT_STATUSES[event.status]
  const type   = EVENT_TYPES.find(t => t.id === event.event_type)
  const emoji  = EVENT_TYPE_EMOJIS[event.event_type] ?? '🎊'
  const step   = PIPELINE.indexOf(event.status)
  const pct    = step < 0 ? 8 : ((step + 1) / PIPELINE.length) * 100
  const yours  = NEEDS_YOU.has(event.status)

  return (
    <Link
      to="/dashboard/customer/events"
      className={`home-glass group relative shrink-0 snap-start overflow-hidden p-3.5 ${single ? 'w-full' : 'w-[86%]'}`}
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
          {emoji}
          {/* The live dot, on the stages where something is actively moving. */}
          {!yours && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-saffron-400 animate-pulse-ring" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-saffron-400" />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold capitalize leading-tight text-white">
            {type?.label ?? event.event_type}
            {event.city && <span className="font-semibold text-white/40"> · {event.city}</span>}
          </p>
          <p className={`truncate text-[11px] font-semibold ${yours ? 'text-saffron-300' : 'text-white/60'}`}>
            {yours ? 'Needs you — open your proposal' : `${status?.icon ?? ''} ${status?.label ?? 'In progress'}`}
          </p>
        </div>

        <span
          className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-extrabold transition-transform group-active:scale-95 ${
            yours ? 'bg-saffron-400 text-plum-950' : 'bg-white/10 text-white ring-1 ring-white/15'
          }`}
        >
          {yours ? 'Review' : 'Track'} <ChevronRight size={12} strokeWidth={3} />
        </span>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            yours ? 'bg-saffron-400' : 'bg-gradient-to-r from-plum-400 to-berry-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-white/40">
        <span>Step {Math.max(step + 1, 1)} of {PIPELINE.length}</span>
        {event.event_date && (
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {event.guest_count && (
          <span className="flex items-center gap-1"><MapPin size={10} />{event.guest_count} guests</span>
        )}
      </div>
    </Link>
  )
}
