import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Lock, ArrowRight, Check, Ticket, Sparkles } from 'lucide-react'
import { CELEBRATION_TIERS, LOCK_AMOUNT } from '../../data/celebrationTiers'
import { formatINR } from '../../utils/format'
import { TIER_ECONOMICS, MARKET_PLANNER_FEE, TIER_PHOTO_KEYS } from '../../utils/tierEconomics'
import { GENERATED_DECOR_PHOTOS } from '../../config/generatedDecorSamples'
import RotatingPhoto from './RotatingPhoto'
import { useAutoScrollRail } from '../../hooks/useAutoScrollRail'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * The eight scales of celebration — Aptaru through Jana Sagara.
 *
 * This replaces PackageRail, which showed one package per occasion ("Grand
 * Celebration", "Popular") on the home screen. Two things were wrong with that
 * as the front page's featured offer:
 *
 * It answered a question nobody had asked yet. A "Grand Celebration Birthday,
 * ₹75,000–₹1,50,000" card is the third or fourth screen of a birthday
 * decision, shown to someone who has not said they are planning a birthday.
 * And with one card per occasion it was ten variations of the same layout —
 * scrolling past nine irrelevant occasions to maybe reach yours.
 *
 * The tiers are the better front-page object because they are the axis every
 * customer actually starts on. Nobody opens this app thinking "I want the
 * premium package"; they think "there'll be about sixty people". The tiers are
 * indexed exactly that way, they are occasion-agnostic so one rail serves
 * everybody, and they were already real data — they drive the price builder's
 * whole calculation and no customer had ever been shown them.
 *
 * ── Prices ─────────────────────────────────────────────────────────────
 * Each card states a floor and a per-guest figure, both computed by
 * tierEconomics() from the same constants the builder uses — the cheapest
 * cuisine at this tier's batch band, its own default decor, coordination and
 * the platform fee. So "from ₹38,500" is a configuration somebody can
 * actually book, not a number invented to look approachable.
 *
 * The coordination fee is shown as a percentage and never in rupees. As a
 * rupee figure it was the largest number on the card, attached to the least
 * tangible thing we sell — "₹1,60,000 coordination" reads as the admin
 * charge being the product. The same fee expressed as its real share, 7–9%,
 * is an argument instead, because full-service planners in India charge
 * 10–15% (see tierEconomics for sources). Nothing about what is charged
 * changed; buildQuote still bills the flat fee.
 *
 * The price lock is real (LOCK_AMOUNT, migration 034): ₹1,000 holds a built
 * quote. It is named here as the thing that happens at the end so the ladder
 * has a visible destination, and it links to the builder where a quote can
 * actually be produced — not to a payment for something not yet configured.
 */
/**
 * What this rail is, asked as the customer's own question.
 *
 * Each line names a different thing the ladder actually covers, so somebody
 * who scrolled past thinking "this is for weddings" gets told, a few seconds
 * later, that it is also for a house-warming lunch for forty.
 */
const PROMPTS = [
  'Are you planning a full celebration — food, decor, the lot?',
  'Thirty people at home? That is a scale we do.',
  'One team handles venue, food, decor and photography.',
  'Two thousand guests on banana leaf? Also a scale we do.',
  'You approve every rupee before anything is booked.',
  'Not sure of the size yet? Start anywhere and change it.',
]

/** The two decor photographs chosen for this tier's scale. */
function tierPhotos(tierId) {
  return (TIER_PHOTO_KEYS[tierId] ?? [])
    .map(key => GENERATED_DECOR_PHOTOS[key]?.url)
    .filter(Boolean)
}

export default function TierRail({ offer }) {
  const reduced = useReducedMotion()
  const [promptIdx, setPromptIdx] = useState(0)
  const prompt = PROMPTS[promptIdx]

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setPromptIdx(i => (i + 1) % PROMPTS.length), 4600)
    return () => clearInterval(id)
  }, [reduced])

  // The rail advances itself — see useAutoScrollRail for why it uses the
  // real scroll container and why it never resumes after a touch.
  const { ref: trackRef, active, handlers } = useAutoScrollRail(CELEBRATION_TIERS.length)

  const offerLabel = offer
    ? offer.discount_type === 'percent'
      ? `${Number(offer.discount_value)}% off`
      : `${formatINR(offer.discount_value)} off`
    : null

  return (
    <section
      aria-labelledby="tier-heading"
      style={{ scrollMarginTop: 'var(--home-appbar-h, 7.75rem)' }}
    >
      <div className="px-4">
        <h2 id="tier-heading" className="text-[15px] font-extrabold text-white">
          Arranged by Sambramo
        </h2>
        {/* A line that changes, because a fixed subtitle cannot explain what
            this rail is to eight different people. "Pick your scale" means
            nothing to somebody who does not yet know we sell whole
            celebrations; these ask the question they are already asking
            themselves, one at a time, and each one names a different thing
            the ladder covers. */}
        <p className="mt-0.5 flex min-h-[15px] items-center text-[11px] text-white/55">
          <span key={prompt} className="fact-swap">{prompt}</span>
        </p>
      </div>

      <div
        ref={trackRef}
        {...handlers}
        className="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory scroll-pl-4"
      >
        {CELEBRATION_TIERS.map((t, i) => {
          const econ = TIER_ECONOMICS[t.id]
          return (
          <Link
            key={t.id}
            to={`/plan/build?tier=${t.id}`}
            className="home-card group flex w-[220px] shrink-0 snap-start flex-col"
          >
            {/* A photograph of a room at this size. The card used to carry an
                emoji, on the one surface whose whole job is helping somebody
                picture the scale of their own event. */}
            <span className="relative block">
              <RotatingPhoto
                photos={tierPhotos(t.id)}
                emoji={t.emoji}
                alt={`${t.name} — ${t.guests.min} to ${t.guests.max} guests`}
                className="aspect-[16/10] w-full"
                stagger={i * 340}
                interval={5200}
              />
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-plum-950/85 via-plum-950/10 to-transparent" />

              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[15px] font-bold leading-tight text-white drop-shadow">
                    {t.name}
                  </span>
                  {/* The Kannada name is why these read as Sambramo's own
                      rather than as Small/Medium/Large. */}
                  <span className="block truncate text-[10px] font-medium italic text-saffron-300">
                    {t.localName}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-plum-800">
                  <Users size={9} />
                  {t.guests.min}–{t.guests.max}
                </span>
              </span>
            </span>

            <span className="flex flex-1 flex-col p-3">
              <span className="block text-[10px] leading-snug text-gray-500 line-clamp-2">
                {t.tagline}
              </span>

              <span className="mt-2 space-y-1">
                {t.highlights.slice(0, 2).map(h => (
                  <span key={h} className="flex items-start gap-1.5">
                    <Check size={10} className="mt-0.5 shrink-0 text-plum-500" strokeWidth={3} />
                    <span className="text-[10px] leading-snug text-gray-600 line-clamp-1">{h}</span>
                  </span>
                ))}
              </span>

              {offerLabel && (
                <span className="mt-2 flex items-center gap-1 rounded-lg bg-chilli-50 px-2 py-1 text-[10px] font-bold text-chilli-700">
                  <Ticket size={10} className="shrink-0" />
                  <span className="truncate">{offerLabel} with {offer.code}</span>
                </span>
              )}

              {/* ── The money ────────────────────────────────────────────
                  A reachable floor, and our fee as a share rather than as a
                  lakh. "Coordination ₹1,60,000" was the biggest number on the
                  card and it was attached to the least tangible thing we sell.
                  The same fee at 9% is an argument, because full-service
                  planners in India charge 10–15%. */}
              {econ && (
                <span className="mt-auto pt-2.5">
                  <span className="flex items-end justify-between gap-1 border-t border-gray-100 pt-2.5">
                    <span className="min-w-0">
                      <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                        From
                      </span>
                      <span className="block truncate text-[14px] font-extrabold leading-none text-gray-900">
                        {formatINR(econ.from)}
                      </span>
                      <span className="mt-0.5 block text-[9px] font-medium text-gray-400">
                        about {formatINR(econ.perGuest)}/guest
                      </span>
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-plum-600 text-white transition-transform group-hover:translate-x-0.5">
                      <ArrowRight size={14} strokeWidth={2.6} />
                    </span>
                  </span>

                  <span className="mt-2 flex items-center gap-1 rounded-lg bg-plum-50 px-2 py-1 text-[9.5px] font-bold text-plum-700">
                    <Sparkles size={10} className="shrink-0" />
                    <span className="truncate">
                      {econ.coordinationPct}% coordination · market {MARKET_PLANNER_FEE.min}–{MARKET_PLANNER_FEE.max}%
                    </span>
                  </span>
                </span>
              )}
            </span>
          </Link>
          )
        })}
      </div>

      {/* Where you are in the deck. Also the only hint, on a phone, that
          there are eight of these rather than the two on screen. */}
      <div className="mt-1 flex justify-center gap-1.5" aria-hidden="true">
        {CELEBRATION_TIERS.map((t, i) => (
          <span
            key={t.id}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === active ? 'w-4 bg-saffron-400' : 'w-1 bg-white/25'
            }`}
          />
        ))}
      </div>

      {/* The destination of the ladder, stated once under it rather than
          repeated on every card. */}
      <div className="px-4">
        <Link
          to="/plan/build"
          className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron-400/15 text-saffron-300">
            <Lock size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-extrabold text-white">
              Build it, then hold the price for {formatINR(LOCK_AMOUNT)}
            </span>
            <span className="block text-[11px] leading-relaxed text-white/55">
              Pick the scale and the menu, see the number move, and lock it while you decide.
            </span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-white/30" />
        </Link>
      </div>
    </section>
  )
}
