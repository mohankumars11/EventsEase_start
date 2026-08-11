import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Sparkles, ShoppingBag, Clock, Phone } from 'lucide-react'
import { BRAND, CTA } from '../../config/sambramo'
import { occasionMeta, CATALOG_TOTALS } from '../../data/occasionMap'
import { useCart } from '../../context/CartContext'
import { formatINR } from '../../utils/format'

/**
 * The plan hub — one page every "plan" button in the app now lands on.
 *
 * Before this, every CTA dropped the visitor straight into a six-step form. That
 * suited someone ready to hand the whole thing over and nobody else: a person who
 * only wanted to know what a birthday package costs had no way to ask, and the
 * catalog that answers exactly that question was sitting behind a login with no
 * route to it from the front end. Half the business was invisible.
 *
 * A chooser page is a risk — put a speed bump in front of the funnel and you pay
 * for it on every visit — so the rules below are load-bearing rather than
 * decoration:
 *
 *   1. Each door is one whole-card click target. One read, one tap.
 *   2. Each door states its cost in time. Not knowing whether a door leads to a
 *      form or a catalog is what makes a chooser feel like an obstacle.
 *   3. Context is never dropped. Arriving from the Wedding card names the wedding,
 *      counts its real services and packages, and points both doors at it.
 *   4. One screen, and no network work. This page now sits in front of the whole
 *      funnel, so it has no photo fetches and nothing below the fold to wait for.
 *
 * Deliberately absent: an occasion grid. It would turn a two-choice page into a
 * seventeen-choice page and duplicate both the wizard's first step and the catalog
 * index. Choosing the occasion belongs inside whichever door you picked.
 */

const DRAFT_KEY = 'sambramo_plan_draft'

export default function PlanHub() {
  const [searchParams] = useSearchParams()
  const { totalCount, cartPath } = useCart()

  const meta = occasionMeta(searchParams.get('type'), searchParams.get('festival'))

  // The wizard keeps the whole querystring — type, budget and festival all still
  // pre-select once it mounts. The catalog only gets the occasion, since it has no
  // budget concept and a stray param on a shareable URL is just noise.
  const qs = searchParams.toString()
  const wizardHref  = '/plan/custom' + (qs ? `?${qs}` : '')
  const catalogHref = meta.catalogId ? `/services/${meta.catalogId}` : '/services'

  // Read once on mount: a draft written later in this render tree should not make
  // the banner pop in underneath someone who is already reading.
  const [hasDraft] = useState(() => {
    try { return !!sessionStorage.getItem(DRAFT_KEY) } catch { return false }
  })

  // An escape hatch for ad landing pages and anywhere else that wants to skip the
  // chooser without a route change.
  if (searchParams.get('go') === 'custom') return <Navigate to={wizardHref} replace />

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Unfinished business, surfaced before anything else ────────── */}
      {(hasDraft || totalCount > 0) && (
        <div className="bg-saffron-400 text-plum-950">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-semibold">
            {hasDraft ? (
              <>
                <span>You have a half-finished request.</span>
                <Link to={wizardHref} className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80">
                  Pick up where you left off <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <span>{totalCount} {totalCount === 1 ? 'service' : 'services'} waiting in your cart.</span>
                <Link to={cartPath} className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80">
                  View cart <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header
        className={`bg-gradient-to-br ${meta.heroGradient ?? 'from-plum-950 via-plum-900 to-berry-900'} text-white`}
      >
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 text-center">
          {meta.known ? (
            <>
              <div className="text-4xl sm:text-5xl mb-3" aria-hidden="true">{meta.emoji}</div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-2">
                Planning {aOrAn(meta.label)}?
              </h1>
              {meta.tagline && (
                <p className="text-white/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                  {meta.tagline}
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-2">
                How would you like to plan?
              </h1>
              <p className="text-white/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                Two ways to get this done. Both start free, and neither needs an account
                to look around.
              </p>
            </>
          )}
        </div>
      </header>

      {/* ── The two doors ────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6">

          {/* Door A — concierge */}
          <Link
            to={wizardHref}
            className="group flex flex-col rounded-3xl bg-plum-950 text-white p-6 sm:p-8 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold tracking-wider uppercase text-saffron-300 bg-saffron-400/10 border border-saffron-400/25 rounded-full px-3 py-1 mb-4">
              <Sparkles size={12} /> Concierge
            </span>

            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-2">Hand it to us</h2>
            <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-5">
              Tell us the date, the guest count and your budget. A real coordinator
              sources the vendors, negotiates, and brings you one clear proposal to
              approve.
            </p>

            <ul className="space-y-2 mb-6 text-sm text-white/75 flex-1">
              {[
                'Free to ask — our fee is in the proposal, stated upfront',
                'Venue, food, décor, photography, entertainment — all of it',
                'One coordinator on WhatsApp until the day is done',
              ].map(point => (
                <li key={point} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-1.5 w-1 h-1 rounded-full bg-saffron-400 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>

            {/* Saying what the door costs in effort is the whole trick. An
                unlabelled choice between two unknowns is what stalls people. */}
            <p className="flex items-center gap-1.5 text-[11px] text-white/45 mb-4">
              <Clock size={12} /> 6 questions · about 2 minutes · no account needed to start
            </p>

            <span className="btn-cta w-full justify-center pointer-events-none">
              {CTA.planAction}
            </span>
          </Link>

          {/* Door B — self-serve catalog */}
          <Link
            to={catalogHref}
            className="group flex flex-col rounded-3xl bg-white border border-amber-100 p-6 sm:p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold tracking-wider uppercase text-plum-700 bg-plum-100 border border-plum-200 rounded-full px-3 py-1 mb-4">
              <ShoppingBag size={12} /> Self-serve
            </span>

            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Pick it yourself
            </h2>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-5">
              Browse the exact services and ready-made packages for your occasion.
              Add what you want and we quote only that — nothing you did not ask for.
            </p>

            <ul className="space-y-2 mb-6 text-sm text-gray-600 flex-1">
              {/* The live counts are the strongest self-select signal on this page:
                  they turn a vague "browse services" into a concrete promise. */}
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="mt-1.5 w-1 h-1 rounded-full bg-plum-500 shrink-0" />
                {meta.serviceCount
                  ? <><strong>{meta.serviceCount} services · {meta.packageCount} ready packages</strong> for {meta.label.toLowerCase()}</>
                  : <><strong>{CATALOG_TOTALS.occasions} occasions · {CATALOG_TOTALS.services}+ services</strong>, packages from {formatINR(CATALOG_TOTALS.cheapestPackage)}</>}
              </li>
              {[
                'See what each package includes before you commit',
                'A free gift hamper with every booking',
              ].map(point => (
                <li key={point} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-1.5 w-1 h-1 rounded-full bg-plum-500 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>

            <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-4">
              <Clock size={12} /> Nothing to fill in · browse now, decide later
            </p>

            <span className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-plum-600 text-plum-700 group-hover:bg-plum-600 group-hover:text-white font-bold px-6 py-3.5 transition-colors">
              {CTA.catalog} <ArrowRight size={17} />
            </span>
          </Link>
        </div>

        {/* ── The price question, answered without a door ─────────────────
            Deliberately a strip and not a third card. The two doors above are
            a choice about HOW you want to engage; "what does this cost" is not
            a third way to engage, it is the question people are holding while
            they read both cards. A strip answers it without re-opening the
            fork the page exists to close.

            Weighted above the shop strip because the intent is far closer: a
            visitor asking the price is planning, not shopping. */}
        <Link
          to={meta.catalogId ? `/plan/build/${meta.catalogId}` : '/plan/build'}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl bg-saffron-50 border-2 border-saffron-200 px-5 py-4 text-center hover:border-saffron-400 hover:shadow-sm transition-all"
        >
          <span aria-hidden="true">🧮</span>
          <span className="text-gray-700 text-sm">
            <strong>Want the number first?</strong> Pick your scale, build the menu dish by dish, choose the décor —
            the estimate updates as you go.
          </span>
          <span className="text-saffron-700 font-bold text-sm inline-flex items-center gap-1">
            Build &amp; price it <ArrowRight size={14} />
          </span>
        </Link>

        {/* ── Door C — the shop, at a third of the weight ─────────────────
            Anyone who arrived from the landing page already chose "plan" over
            "shop", so a third equal card would re-ask a settled question — the
            exact speed bump this page is designed to avoid. But the header, the
            footer and the phone tab bar all deposit people here with no prior
            fork, and "I actually just need a cake tomorrow" should not dead-end
            one tap from the answer. */}
        <Link
          to="/shop"
          className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl bg-white border border-gray-200 px-5 py-4 text-center hover:border-plum-300 hover:shadow-sm transition-all"
        >
          <span aria-hidden="true">🎂</span>
          <span className="text-gray-600 text-sm">
            Just need a cake, flowers or pooja items delivered? No planning involved.
          </span>
          <span className="text-plum-700 font-bold text-sm inline-flex items-center gap-1">
            {CTA.shop} <ArrowRight size={14} />
          </span>
        </Link>

        {/* ── Reassurance ─────────────────────────────────────────────── */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="mb-1">
            Not sure which? Start with the concierge — you can always browse the
            catalog afterwards.
          </p>
          <a
            href={`tel:${BRAND.supportPhone}`}
            className="inline-flex items-center gap-1.5 font-semibold text-plum-700 hover:text-plum-900"
          >
            <Phone size={14} /> Or just call us on {BRAND.supportPhone}
          </a>
        </div>
      </main>
    </div>
  )
}

/** "a Wedding" but "an Anniversary" — cheap, and its absence is the sort of thing
 *  that quietly makes a page feel machine-written. */
function aOrAn(label) {
  if (!label) return 'this'
  return `${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label}`
}
