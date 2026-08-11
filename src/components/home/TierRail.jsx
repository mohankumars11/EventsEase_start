import { Link } from 'react-router-dom'
import { Users, Lock, ArrowRight, Check, Ticket } from 'lucide-react'
import { CELEBRATION_TIERS, LOCK_AMOUNT } from '../../data/celebrationTiers'
import { formatINR } from '../../utils/format'
import { useAutoScrollRail } from '../../hooks/useAutoScrollRail'

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
 * `coordinationFee` is the one number a tier owns outright: the fixed human
 * cost of running it — site visit, vendor calls, the day itself. It is stated
 * as what it is. The *total* is deliberately not shown, because a total
 * depends on the menu and the decor and the builder computes it honestly from
 * those; a made-up "from ₹40,000" here would be the one number on the page
 * that came from nowhere.
 *
 * The price lock is real (LOCK_AMOUNT, migration 034): ₹1,000 holds a built
 * quote. It is named here as the thing that happens at the end so the ladder
 * has a visible destination, and it links to the builder where a quote can
 * actually be produced — not to a payment for something not yet configured.
 */
export default function TierRail({ offer }) {
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
        <p className="mt-0.5 text-[11px] text-white/50">
          However many are coming, one team handles all of it. Pick your scale.
        </p>
      </div>

      <div
        ref={trackRef}
        {...handlers}
        className="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory scroll-pl-4"
      >
        {CELEBRATION_TIERS.map(t => (
          <Link
            key={t.id}
            to={`/plan/build?tier=${t.id}`}
            className="home-card flex w-[210px] shrink-0 snap-start flex-col p-4"
          >
            <span className="flex items-start gap-2.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-xl">
                {t.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-extrabold leading-tight text-gray-900">
                  {t.name}
                </span>
                {/* The Kannada name is why these read as Sambramo's own
                    rather than as Small/Medium/Large. */}
                <span className="block truncate text-[11px] font-medium italic text-plum-500">
                  {t.localName}
                </span>
              </span>
            </span>

            <span className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-plum-50 px-2 py-1.5">
              <Users size={12} className="shrink-0 text-plum-500" />
              <span className="text-[11px] font-extrabold text-plum-800">
                {t.guests.min}–{t.guests.max} guests
              </span>
            </span>

            <span className="mt-2 block text-[10px] leading-snug text-gray-500 line-clamp-2">
              {t.tagline}
            </span>

            <span className="mt-2.5 space-y-1">
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

            <span className="mt-auto pt-3">
              <span className="flex items-center justify-between gap-1 border-t border-gray-100 pt-2.5">
                <span className="min-w-0">
                  <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                    Coordination
                  </span>
                  <span className="block text-[13px] font-extrabold leading-none text-gray-900">
                    {formatINR(t.coordinationFee)}
                  </span>
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-plum-600 text-white">
                  <ArrowRight size={14} strokeWidth={2.6} />
                </span>
              </span>
            </span>
          </Link>
        ))}
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
