import { useState } from 'react'
import { Check, Copy, Gift, Info, TrendingDown, Sparkles } from 'lucide-react'
import { OFFERS, offerAvailability } from '../../data/celebrationOffers'
import { formatINR } from '../../utils/format'

/**
 * What this celebration can save, as things you take rather than things you
 * are told.
 *
 * ── Why tickets and not another row of cards ────────────────────────────
 * The builder is already a page made of cards — tier cards, dish tiles,
 * service rows, décor levels. Putting offers in the same container as all of
 * those makes them the ninth thing on a page of eight, and they get scrolled
 * past. A coupon has a shape people have recognised since before the app
 * existed: two notches, a perforation, a code on a stub. Borrowing it is not
 * decoration, it is the single cheapest way to say "this one is different,
 * this one is for you to take".
 *
 * ── The claim is real, and the card says exactly how ────────────────────
 * Nothing here alters the number in the quote panel, and no ticket implies
 * it does. Sambramo is human-assisted: the quote engine prices the
 * celebration, and a coordinator sends a confirmed figure to approve. So a
 * claimed offer travels in the enquiry note the coordinator reads and comes
 * off THAT document — which is what the stub says, in those words.
 *
 * The alternative was showing a struck-through total the backend has never
 * heard of. That converts better for about a week and then turns every
 * saving into a complaint, which is the opposite of what a page built around
 * a transparent price is for. See data/celebrationOffers.js.
 *
 * ── One at a time ───────────────────────────────────────────────────────
 * Only one coupon may be claimed, because the terms say so and because two
 * stacked percentages on an estimate nobody has confirmed is a promise this
 * business cannot keep. Claiming a second replaces the first, visibly,
 * rather than silently failing on the coordinator's side a week later.
 */
export default function OffersRail({ offers = OFFERS, appliedId, onApply, eventDate, bundleSaving = 0 }) {
  const [copied, setCopied] = useState(null)

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(c => (c === code ? null : c)), 1800)
    } catch {
      /* Clipboard blocked (insecure origin, or the user said no). The code is
         on screen in a selectable element, so nothing is actually lost. */
    }
  }

  return (
    <section aria-labelledby="offers-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <h2 id="offers-heading" className="flex items-center gap-2 text-base font-extrabold text-ink">
            <Gift size={17} className="text-saffron-400" />
            Offers on this celebration
          </h2>
          <p className="text-xs text-ink-mute">
            Claim one now — your coordinator applies it to the confirmed quote.
          </p>
        </div>

        {/* The saving they have already earned, stated next to the ones they
            have to claim. It is the only number here that is real arithmetic
            today, so it is the one that gets the green. */}
        {bundleSaving > 0 && (
          <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
            <TrendingDown size={13} />
            {formatINR(bundleSaving)} already saved
          </span>
        )}
      </div>

      {bundleSaving > 0 && (
        <p className="sm:hidden inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
          <TrendingDown size={13} />
          {formatINR(bundleSaving)} already saved by booking together
        </p>
      )}

      {/* A rail on a phone, a grid on a desktop. `snap` so a thumb-flick lands
          on a ticket rather than between two. The negative margin lets the
          first and last cards sit against the screen edge while the rail
          itself keeps the page's gutter. */}
      <div className="plan-rail-scroll -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {offers.map((offer, i) => (
          <Ticket
            key={offer.id}
            offer={offer}
            index={i}
            applied={appliedId === offer.id}
            availability={offerAvailability(offer, { eventDate })}
            onApply={onApply}
            onCopy={copyCode}
            copied={copied === offer.code}
          />
        ))}
      </div>
    </section>
  )
}

const ACCENTS = {
  saffron: { chip: 'bg-saffron-100 text-saffron-800', big: 'text-saffron-600', btn: 'bg-saffron-500 active:bg-saffron-600' },
  emerald: { chip: 'bg-emerald-100 text-emerald-800', big: 'text-emerald-600', btn: 'bg-emerald-600 active:bg-emerald-700' },
  plum:    { chip: 'bg-plum-100 text-plum-800',       big: 'text-plum-700',    btn: 'bg-plum-700 active:bg-plum-800' },
  rose:    { chip: 'bg-rose-100 text-rose-800',       big: 'text-rose-600',    btn: 'bg-rose-600 active:bg-rose-700' },
}

function Ticket({ offer, index, applied, availability, onApply, onCopy, copied }) {
  const accent = ACCENTS[offer.accent] ?? ACCENTS.plum
  const claimable = offer.kind === 'coupon'
  const blocked = claimable && !availability.ok

  return (
    <article
      className={`plan-ticket plan-rise plan-shine flex min-h-[13.5rem] w-[16.5rem] shrink-0 snap-start flex-col sm:w-auto ${
        applied ? 'ring-2 ring-saffron-400' : ''
      }`}
      style={{ '--rise-delay': `${index * 70}ms`, '--shine-delay': `${index * 900}ms` }}
    >
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${accent.chip}`}>
            {offer.emoji} {offer.name}
          </span>
          {applied && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-saffron-500 px-2 py-0.5 text-[10px] font-extrabold text-plum-950">
              <Check size={11} /> Claimed
            </span>
          )}
        </div>

        <p className={`mt-2.5 text-2xl font-extrabold leading-none ${accent.big}`}>{offer.headline}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{offer.blurb}</p>

        {/* Why it cannot be taken yet, and what to do about it. A greyed-out
            card that does not say is just a card that looks broken. */}
        {blocked && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-amber-700">
            <Info size={12} className="mt-0.5 shrink-0" />
            {availability.reason}
          </p>
        )}
      </div>

      <div className="plan-perf flex items-center gap-2 px-4">
        {claimable ? (
          <>
            <button
              type="button"
              onClick={() => onCopy(offer.code)}
              title="Copy this code"
              className="min-w-0 flex-1 truncate py-3 text-left font-mono text-[13px] font-bold tracking-wide text-gray-700 active:text-gray-900"
            >
              {copied ? <span className="text-emerald-600">Copied ✓</span> : (
                <span className="inline-flex items-center gap-1.5">
                  <Copy size={12} className="shrink-0 text-gray-500" />
                  {offer.code}
                </span>
              )}
            </button>
            {/* Claim needs somewhere to apply the offer to. On the plan hub
                there is no basket yet — the rail is there to say the offer
                exists — so the code stays copyable and the button is simply
                absent, rather than present and inert. */}
            {onApply && (
              <button
                type="button"
                onClick={() => onApply(applied ? null : offer.id)}
                disabled={blocked}
                aria-pressed={applied}
                className={`shrink-0 min-h-[44px] rounded-lg px-3 py-3 text-xs font-extrabold text-ink transition-colors disabled:cursor-not-allowed disabled:bg-gray-300 ${
                  applied ? 'bg-gray-800 active:bg-gray-900' : accent.btn
                }`}
              >
                {applied ? 'Remove' : 'Claim'}
              </button>
            )}
          </>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
            <Sparkles size={12} className={accent.big} />
            {offer.kind === 'referral' ? 'Share after you book' : 'Earned automatically'}
          </p>
        )}
      </div>
    </article>
  )
}
