import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Sparkles, ChevronRight, ShieldCheck, Phone, Users, Star, SearchX,
} from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import { occasionMeta } from '../../data/occasionMap'
import { OCCASIONS, CATALOG_STATS } from '../../data/planCatalog'
import { CELEBRATION_TIERS } from '../../data/celebrationTiers'
import { useCart } from '../../context/CartContext'
import { useCity } from '../../context/CityContext'
import { formatINR } from '../../utils/format'
import PlanAppBar from '../../components/plan/PlanAppBar'
import ServiceShelf from '../../components/plan/ServiceShelf'
import PerksDeck from '../../components/plan/PerksDeck'
import OffersRail from '../../components/shop/OffersRail'

/**
 * The plan hub — everything Sambramo can be asked for, on one screen.
 *
 * ── What was here before, and why it went ──────────────────────────────
 * A chooser: two big cards asking "how would you like to plan?" — concierge or
 * self-serve — later joined by a third for the price builder. Three doors, all
 * described in process terms ("tell us and we call back", "browse the
 * catalogue", "build the menu"), presented to somebody who had just tapped
 * "Plan a celebration" and wanted to plan a celebration.
 *
 * That is a question about *our* internal workflow, asked before we have shown
 * a single thing we sell. A customer arriving with "my daughter turns five in
 * three weeks" cannot answer it, because the answer depends on prices and
 * options they have not been shown yet. So the page put a decision in front of
 * the funnel and gave nothing back for making it.
 *
 * The rule now is the opposite: **show the goods, let the door follow.** The
 * occasion grid, the individual services and the scale ladder are all visible
 * without choosing anything, and each of them lands in the right flow on its
 * own. Nobody has to know what "concierge" means to use this page.
 *
 * ── The four things it shows ───────────────────────────────────────────
 *   Occasions   all 15, cheapest entry first, each with its real "from" price
 *   Services    the ~39 individual services — book one cook, not a package.
 *               This is new; they were previously reachable only *through* an
 *               occasion, so a customer who wanted one thing had no door.
 *   Scale       the six celebration tiers, which existed in data and in the
 *               builder but were never shown to anyone deciding
 *   Perks       live coupons, referral, and the Bandhu membership
 *
 * It keeps its own app bar (see PlanAppBar) rather than the marketing chrome,
 * which is what made this page feel like a different website mid-journey.
 */

const DRAFT_KEY = 'sambramo_plan_draft'

export default function PlanHub() {
  const [searchParams] = useSearchParams()
  const { totalCount, cartPath } = useCart()
  const { city, chosen } = useCity()
  const [query, setQuery] = useState('')

  const meta = occasionMeta(searchParams.get('type'), searchParams.get('festival'))

  const qs = searchParams.toString()
  const wizardHref = '/plan/custom' + (qs ? `?${qs}` : '')

  const [hasDraft] = useState(() => {
    try { return !!sessionStorage.getItem(DRAFT_KEY) } catch { return false }
  })

  // An escape hatch for ad landing pages that want to skip straight to the form.
  if (searchParams.get('go') === 'custom') return <Navigate to={wizardHref} replace />

  const q = query.trim().toLowerCase()
  const searching = q.length >= 2
  const matchedOccasions = searching
    ? OCCASIONS.filter(o =>
        o.name.toLowerCase().includes(q) || o.tagline?.toLowerCase().includes(q)
      )
    : OCCASIONS

  return (
    <div className="home-canvas min-h-screen pb-bottom-nav">
      <PlanAppBar query={query} onQueryChange={setQuery} />

      <div className="mx-auto max-w-3xl space-y-8 pb-32 pt-4">

        {/* ── Unfinished business ───────────────────────────────────── */}
        {(hasDraft || totalCount > 0) && (
          <div className="px-4">
            <Link
              to={hasDraft ? wizardHref : cartPath}
              className="flex items-center gap-3 rounded-2xl bg-saffron-400 px-4 py-3 text-plum-950"
            >
              <span className="min-w-0 flex-1 text-[13px] font-extrabold leading-tight">
                {hasDraft
                  ? 'You have a half-finished request — pick up where you left off'
                  : `${totalCount} ${totalCount === 1 ? 'service' : 'services'} waiting in your cart`}
              </span>
              <ArrowRight size={16} className="shrink-0" />
            </Link>
          </div>
        )}

        {/* ── The welcome ──────────────────────────────────────────────
            Names the customer's situation back to them and states the two
            promises that actually reduce hesitation — it costs nothing to
            ask, and a person is accountable. The old page opened by asking
            them to categorise themselves instead. */}
        <header className="px-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-saffron-300">
            {meta.known ? `Planning ${meta.label?.toLowerCase()}` : 'Tell us the occasion'}
          </p>
          <h1 className="mt-1.5 font-serif text-[26px] font-bold leading-tight text-white sm:text-3xl">
            {meta.known
              ? `Let's make this ${meta.label?.toLowerCase()} yours.`
              : "What are we celebrating?"}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-white/65">
            {CATALOG_STATS.occasions} occasions, {CATALOG_STATS.services} services
            {chosen ? ` in ${city}` : ''} — book the whole celebration or a single
            piece of it. Asking is free, and you approve every rupee before anything
            is booked.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="home-chip bg-white/10 text-white/75 ring-1 ring-white/15">
              <ShieldCheck size={12} className="text-saffron-300" /> No advance to enquire
            </span>
            <span className="home-chip bg-white/10 text-white/75 ring-1 ring-white/15">
              <Users size={12} className="text-saffron-300" /> One coordinator, one number
            </span>
            <span className="home-chip bg-white/10 text-white/75 ring-1 ring-white/15">
              <Star size={12} className="text-saffron-300" /> Vetted local vendors
            </span>
          </div>
        </header>

        {/* Live coupons — the same rail the storefront runs, so an offer is
            advertised identically on both halves of the business. */}
        <OffersRail />

        {/* ── Occasions ─────────────────────────────────────────────── */}
        <section aria-labelledby="occasions-heading">
          <div className="px-4">
            <h2 id="occasions-heading" className="text-[17px] font-extrabold text-white">
              Plan a full celebration
            </h2>
            <p className="mt-1 text-[12px] text-white/60">
              Pick the occasion — we'll show you what it includes and what it costs.
            </p>
          </div>

          {matchedOccasions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <SearchX size={26} className="mx-auto text-white/30" />
              <p className="mt-2 text-sm text-white/55">
                No occasion matches “{query}” — try the services below.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 px-4">
              {matchedOccasions.map(o => (
                <Link
                  key={o.id}
                  to={`/services/${o.id}`}
                  className="home-card group flex flex-col p-3.5"
                >
                  <span className="text-[26px] leading-none" aria-hidden="true">{o.emoji}</span>
                  <span className="mt-2 block text-[14px] font-extrabold leading-tight text-gray-900">
                    {o.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-gray-500 line-clamp-2">
                    {o.tagline}
                  </span>

                  <span className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-gray-400">
                    <span>{o.serviceCount} services</span>
                    <span aria-hidden="true">·</span>
                    <span>{o.packageCount} packages</span>
                  </span>

                  {/* The entry price, from real package data. "Starting at" is
                      the number that decides whether someone taps at all. */}
                  {Number.isFinite(o.fromPrice) && (
                    <span className="mt-2 flex items-center justify-between gap-1 rounded-xl bg-plum-50 px-2.5 py-1.5">
                      <span className="text-[10px] font-semibold text-plum-500">from</span>
                      <span className="text-[12px] font-extrabold text-plum-800">
                        {formatINR(o.fromPrice)}
                      </span>
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Individual services — the door that never existed ─────── */}
        <ServiceShelf query={query} />

        {/* ── Scale ─────────────────────────────────────────────────────
            The six tiers were real data driving the price builder, and no
            customer deciding whether to engage had ever seen them. They answer
            "what does a celebration my size actually look like", which is the
            question underneath most budget anxiety. */}
        <section aria-labelledby="tiers-heading">
          <div className="px-4">
            <h2 id="tiers-heading" className="text-[17px] font-extrabold text-white">
              However big it is
            </h2>
            <p className="mt-1 text-[12px] text-white/60">
              From thirty people on a terrace to eight hundred on banana leaf — the
              same team, scaled to the day.
            </p>
          </div>

          <div className="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {CELEBRATION_TIERS.map(t => (
              <Link
                key={t.id}
                to={`/plan/build?tier=${t.id}`}
                className="home-card flex w-[178px] shrink-0 flex-col p-3.5"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl leading-none" aria-hidden="true">{t.emoji}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-extrabold leading-tight text-gray-900">
                      {t.name}
                    </span>
                    {/* The Kannada name is the brand's own voice and the
                        reason these read as ours rather than as S/M/L. */}
                    <span className="block truncate text-[10px] font-medium italic text-plum-500">
                      {t.localName}
                    </span>
                  </span>
                </span>

                <span className="mt-2 block text-[10px] leading-snug text-gray-500 line-clamp-2">
                  {t.tagline}
                </span>

                <span className="mt-auto pt-2.5">
                  <span className="block rounded-lg bg-plum-50 px-2 py-1 text-center text-[11px] font-extrabold text-plum-700">
                    {t.guests.min}–{t.guests.max} guests
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <div className="px-4">
            <Link
              to="/plan/build"
              className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1]"
            >
              <Sparkles size={17} className="shrink-0 text-saffron-300" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-white">
                  See the price before you talk to anyone
                </span>
                <span className="block text-[11px] leading-relaxed text-white/55">
                  Pick a size, build the menu, watch the estimate move. No account needed.
                </span>
              </span>
              <ChevronRight size={17} className="shrink-0 text-white/30" />
            </Link>
          </div>
        </section>

        {/* ── Perks ─────────────────────────────────────────────────── */}
        <PerksDeck />

        {/* ── Hand it over ──────────────────────────────────────────────
            Last, not first. This is the highest-commitment action on the page
            and it converts far better after somebody has seen the prices,
            the services and the scale than it did as one of three doors
            shown before anything else. */}
        <section className="px-4">
          <div className="rounded-3xl bg-gradient-to-br from-plum-700 to-berry-700 p-5 ring-1 ring-white/10">
            <h2 className="font-serif text-[20px] font-bold leading-tight text-white">
              Or just tell us, and we'll take it from here.
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/70">
              Six questions, about two minutes. A coordinator reads it, sources the
              vendors, negotiates, and comes back with one proposal and one price.
              You approve it before anything is booked.
            </p>
            <Link
              to={wizardHref}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-4 py-3.5 text-[14px] font-extrabold text-plum-950 transition-transform active:scale-[0.98]"
            >
              Tell us what you're planning <ArrowRight size={16} />
            </Link>

            <a
              href={`tel:${BRAND.supportPhone.replace(/\s/g, '')}`}
              className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[13px] font-bold text-white ring-1 ring-white/15"
            >
              <Phone size={14} /> Prefer to talk? {BRAND.supportPhone}
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
