import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { TOP_SERVICES } from '../../data/planCatalog'
import { isBookable } from '../../data/singleService'
import { relatedServices, occasionCount } from '../../lib/catalogueAffinity'

/**
 * "Often arranged together" — the other services beside this one.
 *
 * ── Why the single-service door needed this most ────────────────────────
 * The shop's product page has had three recommendation surfaces since the
 * co-purchase work; this page had none, and it is the more important of the
 * two. A customer here has booked one thing — a mehendi artist, a purohit —
 * and this is the low-commitment first booking the whole two-door strategy
 * depends on. You do not earn a ₹4,00,000 wedding from a family who booked one
 * ₹8,000 artist and were never shown that you also arrange the nadaswaram.
 *
 * ── Every tile must be bookable ─────────────────────────────────────────
 * `isBookable` is passed as the filter and is not optional. The bookable set
 * here is SERVICE_PACKS ∪ DECOR_ROUTES ∪ MENU_ROUTES, which is wider than the
 * builder's thirty services but narrower than the full occasion catalogue — so
 * an unfiltered suggestion would link to /service/<id> and land the customer
 * on "Nothing in the catalogue matches", which is worse than showing them
 * nothing at all.
 *
 * ── No prices ───────────────────────────────────────────────────────────
 * SHOW_SERVICE_PRICES is false across this app for a stated reason: the
 * catalogue's price strings carry their unit inside the text ("₹250–₹800 per
 * plate"), and somebody scanning a rail reads the first number as the price of
 * the whole job. A rail is the worst possible place to reintroduce that. Each
 * tile carries what the service is and why it is here; the number appears on
 * its own page, next to the unit that makes sense of it.
 */
export default function GoesWithRail({ seedId, title, tone = 'dark', className = '' }) {
  // `tone` is the ground the rail sits on, not the rail's own colour — the
  // single-service page's body is the dark plum ground, and a gray-900 heading
  // on it is invisible. Same prop and same reason as the shop's
  // RecommendationRail; the tiles stay white either way because a card is a
  // card, and only the type outside them moves.
  const dark = tone === 'dark'

  const byId = useMemo(
    () => new Map(TOP_SERVICES.map(s => [s.id, s])),
    [],
  )

  const items = useMemo(
    () => relatedServices(seedId, { filter: isBookable, limit: 8 })
      .map(r => ({ ...r, service: byId.get(r.id) }))
      .filter(r => r.service),
    [seedId, byId],
  )

  // Fewer than two is not a rail — it is one tile with a heading over it,
  // which reads as the catalogue having run out.
  if (items.length < 2) return null

  return (
    <section aria-labelledby={`goes-with-${seedId}`} className={className}>
      <div className="mb-3 px-4">
        <h2
          id={`goes-with-${seedId}`}
          className={`flex items-center gap-2 text-[15px] font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}
        >
          <Sparkles size={16} className={dark ? 'text-saffron-300' : 'text-plum-500'} />
          {title ?? 'Often arranged together'}
        </h2>
        <p className={`mt-0.5 text-[11px] ${dark ? 'text-white/50' : 'text-gray-400'}`}>
          Arranged alongside this one for the same day
        </p>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-2 scrollbar-hide">
        {items.map(({ id, service, shared }) => (
          <Link
            key={id}
            to={`/service/${id}`}
            className="w-[150px] shrink-0 snap-start rounded-2xl bg-white p-3.5 ring-1 ring-gray-200/80 transition-shadow active:bg-gray-50 sm:w-[164px]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-plum-50 text-xl">
              {service.emoji ?? '✨'}
            </span>
            <p className="mt-2.5 line-clamp-2 text-[13px] font-bold leading-tight text-gray-900">
              {service.name}
            </p>
            {service.desc && (
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-500">
                {service.desc}
              </p>
            )}

            {/* Why this is here. Stated as a fact about our own catalogue —
                which is what it is — rather than as a claim about customers.
                Nobody has booked anything to produce this number, and the
                copy on a pre-launch shop must not imply otherwise. */}
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-plum-600">
              {shared >= 2
                ? `In ${shared} of the same occasions`
                : `Also for ${occasionCount(id) > 1 ? 'these celebrations' : 'this celebration'}`}
            </p>

            <span className="mt-2 flex items-center gap-1 text-[11px] font-bold text-gray-400">
              See options <ArrowRight size={11} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
