import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { SERVICE_GROUPS, serviceCost, defaultQty } from '../../data/servicePricing'
import { formatINR } from '../../utils/format'

/**
 * An empty basket, as a place to start rather than a place you got lost.
 *
 * ── Why this is not an empty state ────────────────────────────────────────
 * It was: a 6xl shopping-cart emoji, "Your cart is empty", and a button to go
 * somewhere else. That is the right design for a basket you can only arrive
 * at by having already chosen something — a shop's basket, which is reachable
 * from a bag icon that only appears once you have filled it.
 *
 * This basket is different, and the difference is the whole reason it exists.
 * Somebody who wants only a photographer has no reason to open a screen
 * called "Plan"; the bag in the app bar is the affordance they already
 * understand from every other app on the phone. So the bag is always there,
 * which means this screen is not only where you review a basket — it is one
 * of the two front doors to buying a single service.
 *
 * A front door that says "empty" and points elsewhere wastes the tap.
 *
 * ── Why the services are priced here ──────────────────────────────────────
 * Every tile carries what that service actually costs at a typical headcount,
 * computed by the same `serviceCost` the quote engine uses rather than a
 * hand-typed "from" number. A grid of names is a menu; a grid of names with
 * real prices on them is a shop, and a shop is what somebody arriving at a
 * bag icon is expecting.
 *
 * ── Why eight and not all twenty-two ──────────────────────────────────────
 * The eight are one per group where a group has an obvious lead, so the row
 * spans the whole business — a priest and a DJ and a caterer — rather than
 * eight variations of decor. Twenty-two tiles is the catalogue, and the
 * catalogue is one tap away underneath.
 */

/* A typical mid-size celebration. The prices below are honest for this
   headcount and labelled as such — a per-plate service quoted without a guest
   count is a number that means nothing. */
const TYPICAL_GUESTS = 100

/* One lead per group, so the row spans the whole business rather than eight
   variations of the same thing. Ids are checked against SERVICE_GROUPS at
   module load by the filter below — a renamed service drops out of the row
   instead of rendering a blank tile. */
const LEAD_IDS = ['photography', 'priest', 'dining', 'mehendi', 'dj', 'cake', 'makeup', 'venue']

const ALL = SERVICE_GROUPS.flatMap(g => g.services)
const PICKS = LEAD_IDS
  .map(id => ALL.find(s => s.id === id))
  .filter(Boolean)
  .slice(0, 8)

export default function EmptyBasket() {
  return (
    <div className="space-y-4">
      <div className="a-card a-rail px-4 pb-4 pt-5">
        <h2 className="text-[17px] font-extrabold tracking-tight text-ink">
          Nothing in here yet
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          Add services one at a time — a photographer, a cook, a priest — and
          they collect here with a running total. Nothing is charged while you
          build, and you approve the final quote before anything is booked.
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            to="/services"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full brand-aqua-chip px-5 text-[13.5px] font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(12,53,67,0.95)] transition-transform active:scale-[0.97]"
          >
            Browse individual services <ArrowRight size={15} strokeWidth={2.6} />
          </Link>
          <Link
            to="/plan"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[13.5px] font-extrabold text-ink-soft outline outline-1 -outline-offset-1 outline-ink/15 transition-transform active:scale-[0.97]"
          >
            <Sparkles size={15} strokeWidth={2.4} /> Plan a whole celebration
          </Link>
        </div>
      </div>

      {/* ── The shop, right here ──────────────────────────────────────────
          Pointing at a catalogue is one tap. Being the catalogue is none. */}
      {PICKS.length > 0 && (
        <section aria-labelledby="basket-picks">
          <div className="px-1">
            <h3 id="basket-picks" className="text-[15px] font-extrabold tracking-tight text-ink">
              Book just one thing
            </h3>
            <p className="mt-0.5 text-[11.5px] text-ink-mute">
              Real prices, for a {TYPICAL_GUESTS}-guest celebration.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {PICKS.map(v => {
              const qty = defaultQty(v, TYPICAL_GUESTS)
              const cost = serviceCost(v, TYPICAL_GUESTS, qty)
              return (
                <Link
                  key={v.id}
                  to={`/service/${v.id}`}
                  className="a-card flex flex-col p-3.5 transition-transform active:scale-[0.985]"
                >
                  <span className="text-[22px] leading-none" aria-hidden="true">{v.emoji}</span>
                  <span className="mt-2 line-clamp-2 text-[13.5px] font-extrabold leading-tight text-ink">
                    {v.name}
                  </span>
                  <span className="mt-1.5 text-[12.5px] font-extrabold leading-none text-ink">
                    {Number.isFinite(cost) && cost > 0 ? formatINR(cost) : 'On request'}
                  </span>
                  {v.desc && (
                    <span className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-ink-mute">
                      {v.desc}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <Link
            to="/services"
            className="mt-3 flex items-center justify-center gap-1.5 text-[12.5px] font-extrabold text-royal-700"
          >
            See all {ALL.length} services <ArrowRight size={13} strokeWidth={2.8} />
          </Link>
        </section>
      )}
    </div>
  )
}
