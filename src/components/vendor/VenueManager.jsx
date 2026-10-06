import { useCallback, useEffect, useState } from 'react'
import { Building2, CalendarDays, DoorOpen, Loader2, Clock } from 'lucide-react'
import { myVenues, KIND_LABEL } from '../../lib/venues'
import VenueClaim from './VenueClaim'
import VenueSpaces from './VenueSpaces'
import VenueCalendar from './VenueCalendar'

/**
 * A venue partner's whole listing, in one place.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS SITS INSIDE THE LISTING TAB
 * ══════════════════════════════════════════════════════════════════════
 *
 * For a decorator, "your listing" is a price list. For a venue manager it
 * is the building, its halls and its calendar — and those are the same
 * question asked of a different kind of business, not a separate feature.
 * Giving venues a sixth tab would say the opposite, and the bar is full at
 * five.
 *
 * Only shown to a partner who manages a venue or whose trade says they
 * are one. A photographer does not need to be told there is a venue
 * section they will never use.
 *
 * ── The order is the order of the work ──────────────────────────────
 *   1  which building is yours
 *   2  what halls are in it        — without one, customers see nothing
 *   3  when they are free          — the part that earns the money
 */

export default function VenueManager({ vendorId, canClaim = false }) {
  const [venues, setVenues] = useState(null)
  const [view, setView] = useState('halls')

  const read = useCallback(async () => {
    if (!vendorId) return
    try { setVenues(await myVenues(vendorId)) }
    catch { setVenues([]) }
  }, [vendorId])

  useEffect(() => { read() }, [read])

  if (venues === null) {
    /* Silent while loading unless we already know they are a venue.
       A photographer must not see a venue panel flash on their listing
       and then vanish. */
    return canClaim ? (
      <div className="flex items-center gap-2 rounded-[20px] bg-white p-5 text-[13px] text-ink-mute ring-1 ring-ink/[0.06]">
        <Loader2 size={14} className="animate-spin" /> Loading your venue…
      </div>
    ) : null
  }

  if (!venues.length) {
    /* Two separate questions, and conflating them is why this needs a
       prop. "Do they manage a venue" is answered by the fetch. "Should we
       ASK them to claim one" is answered by whether their listing says
       they are a venue at all — and offering a hall-claiming form to a
       decorator is a nonsense option, which reads as an app that does not
       know what it sells. */
    if (!canClaim) return null
    return (
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <VenueClaim vendorId={vendorId} onDone={read} />
      </div>
    )
  }

  /* One venue is the overwhelming case; a group managing several gets a
     stacked list rather than a switcher, because a switcher hides the
     second one behind a control nobody looks for. */
  return (
    <div className="space-y-3.5">
      {venues.map(v => (
        <div key={v.id} className="rounded-[20px] bg-white ring-1 ring-ink/[0.06]">
          <div className="flex items-start gap-3 p-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-plum-950 text-white">
              <Building2 size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-extrabold leading-tight text-ink">{v.name}</span>
              <span className="block text-[12px] text-ink-mute">
                {[KIND_LABEL[v.venue_kind], v.area_label].filter(Boolean).join(' · ')}
              </span>
            </span>
          </div>

          {/* A pending venue is not live and the manager must know that,
              or they will block dates for weeks and wonder why nothing
              arrives. */}
          {v.status === 'pending_review' && (
            <p className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-saffron-400/15 p-3 text-[12px] font-semibold leading-snug text-ink">
              <Clock size={13} className="mt-0.5 shrink-0 text-saffron-800" />
              We are checking this venue. Customers cannot see it yet — add
              your halls meanwhile and it goes live the moment we approve.
            </p>
          )}

          <div className="flex border-t border-ink/[0.06]">
            {[
              { id: 'halls', label: 'Halls', icon: DoorOpen },
              { id: 'dates', label: 'Dates', icon: CalendarDays },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id} type="button" onClick={() => setView(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-extrabold transition ${
                  view === id ? 'text-ink' : 'text-ink-mute'
                }`}
              >
                <Icon size={14} /> {label}
                {view === id && <span className="absolute" />}
              </button>
            ))}
          </div>

          <div className="border-t border-ink/[0.06] bg-ink/[0.015] p-3.5">
            {view === 'halls'
              ? <VenueSpaces venue={v} onChanged={read} />
              : <VenueCalendar spaces={v.spaces ?? []} />}
          </div>
        </div>
      ))}
    </div>
  )
}
