import { Plus, Lightbulb, Users, TrendingUp } from 'lucide-react'
import { groupForService, serviceUnitLabel } from '../../data/servicePricing'
import { useServiceSuggestions } from '../../hooks/useServiceRecommendations'
import { reasonForService } from '../../lib/serviceRecommend'
import { formatINR } from '../../utils/format'

/**
 * "Often in a plan like yours" — the four things this celebration is missing.
 *
 * ── Why this sits above the list and not inside it ──────────────────────
 * The obvious place for a suggestion is beside the service it is suggesting:
 * a little "recommended" badge on the photography row. That fails for the
 * reason the whole service step exists — there are thirty rows in six groups
 * and the customer is scrolling past most of them. A badge on a row nobody
 * scrolls to is not a recommendation, it is decoration. Lifting four of them
 * out and putting them where the step begins is what makes it advice.
 *
 * It is also why this is a panel of four and not a rail of eight. A rail
 * invites swiping, and swiping is a browsing gesture — right for a shop
 * shelf, wrong for "here is what your daughter's wedding is missing", which
 * should be readable in one glance without moving a thumb.
 *
 * ── The heading is decided by the data, not by the caller ───────────────
 * Same rule as the shop's RecommendationRail, and the same reason: a
 * recommendation heading is a claim about other customers, and it is the
 * easiest claim in this business to make falsely. "Others booked this too" over
 * a hand-authored guess is a lie told before there is anybody to have booked
 * anything. `learned` comes back from the suggester and is true only when
 * migration 043 returned real pairings past the support floor — and even then
 * the social heading is used only when the top suggestion is itself one of
 * those measured pairings. Otherwise the panel says what it actually is:
 * things a celebration of this kind usually includes.
 *
 * ── The empty state is a real state ─────────────────────────────────────
 * A plan with everything sensible already in it gets nothing, not a panel
 * apologising for having nothing. Returning null there is what keeps the
 * panel worth reading on the plans where it does appear.
 */
export default function ServiceSuggestions({
  occasion,
  occasionName,
  chosenIds = [],
  guestCount = 0,
  quoteTotal = 0,
  onAdd,
  limit = 4,
  className = '',
}) {
  const { items, learned } = useServiceSuggestions({
    occasion, chosenIds, guestCount, quoteTotal, limit,
  })

  // One suggestion is not advice, it is an upsell with a heading on it.
  if (items.length < 2) return null

  const proven = items.filter(r => r.alsoBooked).length
  const socialProof = learned && proven >= 2 && items[0].alsoBooked
  // Scale reasons are the strongest thing this panel can say when there is no
  // booking history, because they are the only part of the prior that is a
  // fact rather than an estimate — see SCALE_TRIGGERS.
  const scaleLed = !socialProof && items[0].scaleTriggered

  const heading = socialProof ? 'Booked with plans like yours'
    : scaleLed ? `At ${guestCount} guests, plans usually add`
      : 'Often in a plan like yours'

  const sub = socialProof
    ? `From ${proven} real pairings in past celebrations`
    : scaleLed ? 'Based on the headcount, not on the budget'
      : occasionName
        ? `What ${occasionName.toLowerCase()} plans commonly include`
        : 'Commonly booked together'

  const Icon = socialProof ? Users : scaleLed ? TrendingUp : Lightbulb

  return (
    <section
      aria-labelledby="service-suggestions"
      className={`card overflow-hidden ${className}`}
    >
      <header className="flex items-start gap-2.5 border-b border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white px-4 py-3.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <h3 id="service-suggestions" className="text-sm font-bold text-gray-900">
            {heading}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-gray-500">{sub}</p>
        </div>
      </header>

      <ul className="divide-y divide-gray-50">
        {items.map(rec => {
          const reason = reasonForService(rec, { occasionName, guestCount })
          const group = groupForService(rec.service.id)

          return (
            <li key={rec.service.id}>
              {/* The whole row adds it. A row that is only tappable on a small
                  circle at its right edge is a row most people miss on a
                  phone, and the price beside the button is exactly where a
                  thumb lands by accident. */}
              <button
                type="button"
                onClick={() => onAdd(rec.service.id)}
                className="flex w-full min-h-[64px] items-start gap-3 px-4 py-3.5 text-left active:bg-amber-50/60"
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ring-1 ${group.tile}`}
                >
                  {rec.service.emoji}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-tight text-gray-900">
                    {rec.service.name}
                  </span>

                  {/* Why this is here, in the panel's own voice. The strong
                      variants — a measured pairing, or a headcount fact — get
                      the filled chip; an estimate gets the quiet one. A
                      customer who learns that the amber chip means "we counted
                      this" can read the difference without being told. */}
                  {reason && (
                    <span
                      className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-bold leading-tight ${
                        reason.strong
                          ? 'bg-amber-400 text-amber-950'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {reason.text}
                    </span>
                  )}

                  <span className="mt-1 block text-xs leading-snug text-gray-500">
                    {rec.service.desc}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-plum-700">
                    {formatINR(rec.cost)}
                  </span>
                  <span className="block max-w-[92px] text-[10px] leading-tight text-gray-400">
                    {serviceUnitLabel(rec.service)}
                  </span>
                  <span className="mt-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-plum-600 text-white">
                    <Plus size={14} strokeWidth={3} />
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* The standing caveat, stated once at the foot of the panel rather than
          on every row. Every price above comes from the same estimated rate
          card as the rest of the quote, and this panel is the one place in the
          builder that puts a number in front of somebody who did not ask for
          it — so it says so. */}
      <p className="border-t border-gray-50 bg-gray-50/60 px-4 py-2.5 text-[11px] leading-snug text-gray-400">
        Estimates at {guestCount} guests. Adding one here only changes your quote —
        nothing is booked until you approve the proposal.
      </p>
    </section>
  )
}
