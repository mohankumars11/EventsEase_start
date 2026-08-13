import { useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, Sparkles, ChevronRight, SearchX } from 'lucide-react'
import { EVENT_LIST } from '../../data/eventServicesData'
import { PACKAGE_COUNT } from '../../data/occasionPackages'
import { leadSample, SAMPLES_BY_EVENT } from '../../config/decorSamples'
import { useAuth } from '../../context/AuthContext'
import AppBar from '../../components/layout/AppBar'
import ProductImage from '../../components/shop/ProductImage'

/**
 * The occasions catalogue — every celebration we price, in one grid.
 *
 * ── What this screen used to arrive wearing ─────────────────────────────
 * It was the last page still inside CustomerLayout, and for a signed-in
 * customer that meant two navigation bars fixed to the bottom of the same
 * phone screen: CustomerLayout's five-tab marigold bar at z-40, and the app's
 * real tab bar at z-50 directly on top of it. The lower one was unreachable —
 * you could see a sliver of it under the other — and it was painted in a
 * palette the app retired at the concierge pivot.
 *
 * Above the fold it stacked the marketing navbar, the "Pilot — Bengaluru —
 * Somewhere else? [notify me]" banner and a "Back" link, then a desktop
 * sub-nav, before the heading. Six navigation surfaces on one screen.
 *
 * It now carries the same app bar as home, the shop and the planner, and the
 * search moved into it — the bar is where every other screen in the app puts
 * search, and a page whose entire job is "find your occasion" should not make
 * that field the fourth thing on the page.
 *
 * ── Why the dark ground ─────────────────────────────────────────────────
 * Its neighbours are dark: /services/:eventId is the occasion canvas,
 * /service/:id is the home canvas, /plan is the home canvas. This page sat
 * between them in white, so tapping an occasion crossed from a light document
 * to a dark app and back — the "different website" seam the app bars were
 * introduced to close. The occasion tiles stay light; a light card on a dark
 * ground is the app's card pattern everywhere else.
 */
export default function ServicesPicker() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  // The hub sends ?type= here whenever it could not resolve the occasion to a
  // catalog page — a festival, or "something else". Rather than dumping the
  // visitor on an unfiltered list of fifteen, seed the search with what they
  // told us so the page opens already looking for it.
  const [query, setQuery] = useState(() => {
    const seed = searchParams.get('q') || searchParams.get('festival') || searchParams.get('type') || ''
    return seed.replace(/[-_]/g, ' ')
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return EVENT_LIST
    return EVENT_LIST.filter(ev =>
      ev.name.toLowerCase().includes(q) ||
      ev.tagline?.toLowerCase().includes(q) ||
      ev.services.some(s => s.name.toLowerCase().includes(q))
    )
  }, [query])

  return (
    <div className="home-canvas min-h-screen pb-bottom-nav">
      <AppBar
        tone="plum"
        backTo="/"
        title="Every occasion we plan"
        subtitle={`${EVENT_LIST.length} celebrations · ${PACKAGE_COUNT} scales each`}
      >
        {/* Search lives in the bar, as it does on home and in the shop, so it
            stays reachable at every scroll position on a 15-card grid. */}
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-plum-600" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            enterKeyHint="search"
            aria-label="Search celebrations and services"
            placeholder="Search celebrations or services…"
            className="h-12 w-full rounded-2xl bg-white pl-11 pr-11 text-sm font-medium text-gray-900 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.9)] outline-none ring-2 ring-transparent placeholder:text-gray-400 focus:ring-saffron-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-500"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </AppBar>

      <div className="mx-auto max-w-3xl px-4 pb-8 pt-5">

        <p className="text-[13px] leading-relaxed text-white/55">
          Pick your function or festival — we'll show you exactly what's typically
          needed: cooks, priests, pooja items, decorations and more. Add only what you want.
        </p>

        {/* A guest arrives here cold, with no dashboard around the page to
            explain it and no sign that the other door exists. */}
        {!user && (
          <Link
            to="/plan/custom"
            className="home-glass mt-4 flex items-center gap-3 p-3.5 transition-transform active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron-400/15 text-saffron-300">
              <Sparkles size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-white">
                Browse freely — nothing to fill in
              </span>
              <span className="block text-[11px] leading-snug text-white/50">
                You only sign in when you add something. Or let us plan the whole thing.
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-white/30" />
          </Link>
        )}

        {filtered.length === 0 ? (
          <div className="home-glass mt-5 flex flex-col items-center gap-3 px-6 py-12 text-center">
            <SearchX size={26} className="text-white/30" />
            <p className="text-sm font-bold text-white">No occasion matches “{query}”</p>
            <p className="max-w-xs text-[12px] leading-relaxed text-white/45">
              Try a broader word — “birthday”, “wedding”, “pooja” — or tell a
              coordinator what you're planning and we'll build it from scratch.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setQuery('')}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-[12.5px] font-bold text-white ring-1 ring-white/15"
              >
                Show all {EVENT_LIST.length}
              </button>
              <Link
                to="/plan/custom"
                className="rounded-xl bg-saffron-400 px-4 py-2.5 text-[12.5px] font-extrabold text-plum-950"
              >
                Tell us your plan
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map(ev => {
              // The occasion's own décor setup, already resolved and committed
              // in config/decorSamples. This card used to run a live Unsplash
              // search — fifteen cards, fifteen of the 24 searches
              // lib/unsplash.js permits per page load, to fetch a photograph
              // this repo already holds. ProductImage still takes the query as
              // its fallback for an occasion with no samples yet.
              const lead = leadSample(ev.id)
              const samples = SAMPLES_BY_EVENT[ev.id]?.length ?? 0
              return (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/services/${ev.id}`)}
                  className="home-card flex flex-col text-left"
                >
                  <ProductImage
                    src={lead?.photo}
                    alt={lead?.alt}
                    query={`Indian ${ev.name} celebration`}
                    emoji={ev.emoji}
                    className="h-24 w-full sm:h-28"
                  />
                  {/* flex-1 + a fixed footer line keeps every tile in a row the
                      same height whatever the tagline runs to — the old grid
                      had a two-line tagline pushing one card taller than its
                      neighbours, so the row's bottom edge zig-zagged. */}
                  <div className="flex flex-1 flex-col p-3">
                    <p className="text-[13px] font-extrabold leading-tight text-gray-900">{ev.name}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-500">{ev.tagline}</p>
                    <p className="mt-auto pt-2 text-[10.5px] font-semibold text-plum-600">
                      {ev.services.length} services · {PACKAGE_COUNT} scales
                      {samples > 0 && ` · ${samples} décor`}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
