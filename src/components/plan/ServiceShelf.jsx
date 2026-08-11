import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Check } from 'lucide-react'
import { SERVICES_BY_CATEGORY, TOP_SERVICES } from '../../data/planCatalog'

/**
 * "I only need one thing."
 *
 * The single biggest hole in the planner. Sambramo sells ~39 distinct services
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
 * ── The design ─────────────────────────────────────────────────────────
 * Chips, then a grid. The chip row is the category filter (Decor, Catering,
 * Venue…) and defaults to "Most booked", which is genuinely derived — a service
 * wanted by twelve of the fifteen occasions really is the common request, and
 * that ranking comes out of the data rather than out of an editor's opinion.
 *
 * Every card names its own price band. The catalogue has honest ranges
 * (`priceHint`) and showing them here is the whole point: "what does a cook
 * cost" is the question that brings people to the page, and a card that answers
 * it converts far better than one that says "enquire".
 *
 * Selection is multi-pick and accumulates into a single enquiry. Someone who
 * taps cook + decor + photographer has just described a small event without
 * being asked to choose a package, which is exactly the journey the old design
 * refused to allow. The wizard receives the picks and skips ahead.
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
        <h2 id="services-heading" className="text-[17px] font-extrabold text-white">
          Need just one thing?
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-white/60">
          You don't have to book a whole celebration. Pick a single service — a cook,
          a decorator, a photographer — and we'll arrange only that.
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
                : 'bg-white/10 text-white/70 ring-1 ring-white/15'
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
                  : 'bg-white/10 text-white/70 ring-1 ring-white/15'
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
        <p className="px-4 py-6 text-center text-sm text-white/50">
          Nothing matches “{query}”. Try a service name like “cook” or “decor”.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 px-4">
          {list.map(svc => {
            const on = picked.includes(svc.id)
            return (
              <button
                key={svc.id}
                onClick={() => toggle(svc.id)}
                aria-pressed={on}
                className={`home-card p-3 text-left transition-all ${
                  on ? 'ring-2 ring-saffron-400' : ''
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-2xl leading-none" aria-hidden="true">{svc.emoji}</span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                      on ? 'bg-saffron-400 text-plum-950' : 'bg-gray-100 text-transparent'
                    }`}
                  >
                    <Check size={12} strokeWidth={3.5} />
                  </span>
                </span>

                <span className="mt-2 block text-[13px] font-extrabold leading-tight text-gray-900">
                  {svc.name}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-gray-500 line-clamp-2">
                  {svc.desc}
                </span>
                {/* The number people came for. */}
                <span className="mt-1.5 block text-[11px] font-bold text-plum-700">
                  {svc.priceHint}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── The accumulator ────────────────────────────────────────────
          Appears only once something is picked. A permanent CTA under a grid
          nobody has touched is furniture; one that appears the instant you
          choose is a response. */}
      {picked.length > 0 && (
        <div className="animate-pop-in sticky bottom-20 z-20 mt-4 px-4 md:bottom-4">
          <Link
            to={enquiryHref}
            className="flex items-center gap-3 rounded-2xl bg-saffron-400 px-4 py-3 shadow-xl shadow-black/30"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-plum-950 text-xs font-extrabold text-saffron-300">
              {picked.length}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold leading-tight text-plum-950">
                Get a quote for {picked.length === 1 ? 'this service' : `these ${picked.length}`}
              </span>
              <span className="block text-[11px] text-plum-900/70">
                Free, no obligation — a coordinator replies with real prices
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-plum-950" />
          </Link>
        </div>
      )}
    </section>
  )
}
