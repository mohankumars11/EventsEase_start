import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Check, Plus, ArrowRight } from 'lucide-react'
import { SERVICES_BY_CATEGORY, TOP_SERVICES } from '../../data/planCatalog'
import { isBookable, BOOKABLE_SERVICE_IDS } from '../../data/singleService'
import OptionArt from '../service/OptionArt'

/**
 * "I only need one thing."
 *
 * The single biggest hole in the planner. Sambramo sells ~55 distinct services
 * and every one of them was buried inside an occasion page: to discover that we
 * supply cooks, you first had to declare you were planning a birthday. Someone
 * who wants a cook for Sunday lunch, a decorator for a small pooja, or just a
 * photographer had no way to say so, and the whole funnel answered them with
 * "which celebration package would you like?" — so they left.
 *
 * That is also bad commercially, not just bad UX. A single service is the
 * cheapest possible first transaction and the most common way somebody tries a
 * new supplier. Hiding it behind a package means the only door into the
 * business is the most expensive one.
 *
 * ── What tapping a card does, and what it used to do ────────────────────
 * It opens that service's own page, where the real options are — eighty
 * decoration setups, sixteen cuisines with every dish, three to five priced
 * packages — and where the booking is completed.
 *
 * It used to tick a chip. The only button under the grid then sent every
 * selection to /plan/custom: the six-step celebration wizard, whose first
 * question is which occasion you are planning. So the shelf promised "pick a
 * single service and we'll arrange only that" and its one exit did the exact
 * opposite, without ever showing a decoration, a dish or a price.
 *
 * The multi-pick survives as a *secondary* action, on the ⊕ button, because it
 * genuinely serves the other customer: somebody who wants a cook, a decorator
 * and a photographer quoted together has described a small event without being
 * asked to choose a package, and one enquiry beats three. It is no longer the
 * only thing a tap can do.
 *
 * ── The design ─────────────────────────────────────────────────────────
 * Chips, then a grid. The chip row defaults to "Most booked", which is
 * genuinely derived — a service wanted by twelve of the fifteen occasions
 * really is the common request, and that ranking comes out of the data rather
 * than out of an editor's opinion.
 *
 * Every card names its own price band. The catalogue has honest ranges
 * (`priceHint`) and showing them here is the whole point: "what does a cook
 * cost" is the question that brings people to the page, and a card that answers
 * it converts far better than one that says "enquire".
 */
export default function ServiceShelf({ query = '' }) {
  const [activeCategory, setActiveCategory] = useState('top')
  const [picked, setPicked] = useState([])

  const q = query.trim().toLowerCase()

  // A search from the app bar overrides the chips entirely: someone typing
  // "cook" wants every match, not the matches inside whichever category
  // happened to be selected.
  const list = q
    ? TOP_SERVICES.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.desc?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      )
    : activeCategory === 'top'
      ? TOP_SERVICES.slice(0, 12)
      : SERVICES_BY_CATEGORY.find(g => g.category === activeCategory)?.services ?? []

  function toggle(id) {
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
  }

  /**
   * The picks travel to the wizard as service *names*, not catalogue ids.
   *
   * `form.services` there is a list of display strings that is written to the
   * enquiry and read by a human coordinator — sending `cooks,decor` would file
   * a request containing two slugs nobody outside this repo can interpret.
   * The wizard pre-selects them and renders anything outside its own chip list
   * under "Already chosen", so the customer can still see and drop them.
   */
  const pickedNames = TOP_SERVICES.filter(s => picked.includes(s.id)).map(s => s.name)
  const enquiryHref = `/plan/custom?services=${encodeURIComponent(pickedNames.join(','))}`

  return (
    <section aria-labelledby="services-heading" className="scroll-mt-24">
      <div className="px-4">
        <h2 id="services-heading" className="text-[17px] font-extrabold text-ink">
          Need just one thing?
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
          You don't have to book a whole celebration. Tap any service to see its real
          options — every decoration, every cuisine, every package — priced, and bookable
          on its own.
        </p>
        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-teal-400/10 px-2.5 py-1 text-[10.5px] font-bold text-teal-700 ring-1 ring-teal-300/25">
          <Check size={11} /> {BOOKABLE_SERVICE_IDS.length} services bookable end to end
        </p>
      </div>

      {/* ── Category chips ─────────────────────────────────────────── */}
      {!q && (
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveCategory('top')}
            className={`home-chip ${
              activeCategory === 'top'
                ? 'bg-saffron-400 text-plum-950'
                : 'bg-surface-sunk/[0.07] text-ink-soft ring-1 ring-hairline/10'
            }`}
          >
            ⭐ Most booked
          </button>
          {SERVICES_BY_CATEGORY.map(g => (
            <button
              key={g.category}
              onClick={() => setActiveCategory(g.category)}
              className={`home-chip ${
                activeCategory === g.category
                  ? 'bg-saffron-400 text-plum-950'
                  : 'bg-surface-sunk/[0.07] text-ink-soft ring-1 ring-hairline/10'
              }`}
            >
              {g.emoji} {g.category}
              <span className="opacity-60">{g.services.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── The services ───────────────────────────────────────────── */}
      {list.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-mute">
          Nothing matches “{query}”. Try a service name like “cook” or “decor”.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 px-4">
          {list.map((svc, i) => {
            const on = picked.includes(svc.id)
            const bookable = isBookable(svc.id)
            return (
              <div
                key={svc.id}
                className={`home-card rise-in relative ${on ? 'ring-2 ring-saffron-400' : ''}`}
                style={{ '--rise-delay': `${Math.min(i, 10) * 40}ms` }}
              >
                {/* The card is the door into the service. A whole card as the
                    primary target is the difference between "look at this" and
                    "here is a checkbox". */}
                <Link to={`/service/${svc.id}`} className="block">
                  <OptionArt tint={tintFor(svc.category)} emoji={svc.emoji} height={62} seed={i + svc.name.length} />

                  <div className="p-3">
                    <span className="block text-[13px] font-extrabold leading-tight text-gray-900">
                      {svc.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-gray-500 line-clamp-2">
                      {svc.desc}
                    </span>

                    {/* The number people came for. */}
                    <span className="mt-1.5 block text-[11px] font-bold text-plum-700">
                      {svc.priceHint}
                    </span>

                    <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold text-saffron-600">
                      {bookable ? 'See options & book' : 'Ask for a price'}
                      <ArrowRight size={10} />
                    </span>
                  </div>
                </Link>

                {/* Secondary: gather several into one enquiry. Deliberately a
                    small target in the corner — it is the minority journey, and
                    it used to be the only one. */}
                <button
                  type="button"
                  onClick={() => toggle(svc.id)}
                  aria-pressed={on}
                  aria-label={on ? `Remove ${svc.name} from your quote` : `Add ${svc.name} to a combined quote`}
                  className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-colors ${
                    on ? 'bg-saffron-400 text-plum-950' : 'bg-black/35 text-white backdrop-blur-sm'
                  }`}
                >
                  {on ? <Check size={13} strokeWidth={3.5} /> : <Plus size={13} strokeWidth={3} />}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── The accumulator ────────────────────────────────────────────
          Appears only once something is picked. A permanent CTA under a grid
          nobody has touched is furniture; one that appears the instant you
          choose is a response. */}
      {picked.length > 0 && (
        <div className="animate-pop-in above-bottom-nav sticky z-20 mt-4 px-4 md:bottom-4">
          <Link
            to={enquiryHref}
            className="flex items-center gap-3 rounded-2xl bg-saffron-400 px-4 py-3 shadow-xl shadow-black/30"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-plum-950 text-xs font-extrabold text-saffron-300">
              {picked.length}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold leading-tight text-plum-950">
                Get one quote for {picked.length === 1 ? 'this service' : `these ${picked.length}`}
              </span>
              <span className="block text-[11px] text-plum-900/70">
                Free, no obligation — or tap a card to price and book it yourself
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-plum-950" />
          </Link>
        </div>
      )}
    </section>
  )
}

/** The card's two colours, by category — see heroTint in ServiceDetail. */
function tintFor(category) {
  return {
    Decor:          ['#c026d3', '#f59e0b'],
    Catering:       ['#b45309', '#facc15'],
    'F&B':          ['#0891b2', '#fbbf24'],
    Photography:    ['#1e3a8a', '#38bdf8'],
    Video:          ['#0f172a', '#22d3ee'],
    Entertainment:  ['#7c3aed', '#ec4899'],
    Lighting:       ['#f59e0b', '#4c1d95'],
    Venue:          ['#15803d', '#fde68a'],
    Beauty:         ['#be123c', '#f9a8d4'],
    Ritual:         ['#d97706', '#fde68a'],
    Gifts:          ['#7c2d12', '#fbbf24'],
    Logistics:      ['#334155', '#94a3b8'],
    Infrastructure: ['#0f766e', '#5eead4'],
    Safety:         ['#b91c1c', '#fca5a5'],
    Hospitality:    ['#db2777', '#fbcfe8'],
    Stationery:     ['#a16207', '#fef08a'],
    Furniture:      ['#78350f', '#d6d3d1'],
    Security:       ['#1f2937', '#9ca3af'],
    Cleanup:        ['#0e7490', '#a5f3fc'],
    Corporate:      ['#1e293b', '#93c5fd'],
    Effects:        ['#0f172a', '#f59e0b'],
    Bakery:         ['#db2777', '#fed7aa'],
  }[category] ?? ['#6d28d9', '#f59e0b']
}
