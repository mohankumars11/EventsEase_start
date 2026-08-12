import { Package, LayoutGrid, ArrowRight, Check, Sparkles } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * The two ways to buy, put where they can actually be found.
 *
 * ── Why this exists at all ──────────────────────────────────────────────
 * The choice between "arrange the whole celebration" and "book one service"
 * is the most consequential thing on the occasion page — it is the difference
 * between the business and the trust-builder, and everything below it changes
 * depending on the answer. It was expressed as a two-tab strip, 56px tall,
 * sitting under the hero, the guest control and a decor gallery. On a phone
 * that is roughly three screens of scrolling before a customer is told there
 * are two doors, and a tab strip does not look like a decision anyway: tabs
 * read as "views of the same thing", which these are not.
 *
 * So the decision is stated once, near the top, as two things that look like
 * offers — with the live price on the primary one, because "the whole
 * celebration" is an abstraction until it has a number attached. The sticky
 * tab strip further down survives, because once you are twenty cards into a
 * service list you do want a cheap way to flip; it just is not the first time
 * the choice is offered any more.
 *
 * ── Deliberately not two equal cards ────────────────────────────────────
 * Full-service is the product; individual services are the way somebody with
 * a smaller need still gets served, and the way a first-time customer tests
 * us. Rendering them as a matched pair would be a lie about which one this
 * business runs on. The primary is a white card on the dark ground carrying a
 * live estimate; the second is a glass row that is unmissable but plainly
 * secondary. Both are on screen together, which is the part that matters.
 */
export default function TwoDoors({
  event, tiers, tier, quote, entryPrice, guestCount, bespoke, active, onChoose,
}) {
  // Three services named rather than counted. "24 services" is a fact about a
  // database; "Catering, Decor, Photography and 21 more" is what a person
  // scanning for the one thing they came for actually needs.
  const named = event.services.slice(0, 3).map(s => s.name)
  const rest = Math.max(0, event.services.length - named.length)

  return (
    <section aria-label="How would you like to book this" className="space-y-2.5">
      {/* ── The business ───────────────────────────────────── */}
      <button
        type="button"
        onClick={() => onChoose('packages')}
        className={`event-card sheen-on-hover block w-full text-left ${
          active === 'packages' ? 'ring-2' : ''
        }`}
        style={active === 'packages' ? { '--tw-ring-color': 'var(--event-glow)' } : undefined}
      >
        <div className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white"
             style={{ background: 'var(--event-ink)' }}>
          <Sparkles size={11} /> The whole thing, arranged
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 text-[16px] font-extrabold leading-tight text-gray-900">
                <Package size={16} style={{ color: 'var(--event-ink)' }} />
                Complete celebration
              </h3>
              <p className="mt-1 text-[12px] leading-snug text-gray-500">
                Food, decor, coordination and every service this {event.name.toLowerCase()} needs —
                one team, one price, one person to call.
              </p>
            </div>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: 'var(--event-ink)' }}
            >
              <ArrowRight size={16} strokeWidth={2.6} />
            </span>
          </div>

          {/* The live number, which is the whole reason this card beats a tab.
              Keyed so it rises into place when the guest count moves, the same
              treatment the header gives it. */}
          <div className="mt-3 flex flex-wrap items-end justify-between gap-2 rounded-2xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-100">
            {bespoke ? (
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                  {guestCount.toLocaleString('en-IN')} guests
                </p>
                <p className="text-[14px] font-extrabold leading-tight text-gray-900">
                  Built with a coordinator
                </p>
              </div>
            ) : quote?.range ? (
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                  {tier?.name} · {guestCount.toLocaleString('en-IN')} guests
                </p>
                <p
                  key={`${quote.range.low}-${quote.range.high}`}
                  className="fact-swap text-[16px] font-extrabold leading-tight"
                  style={{ color: 'var(--event-ink)' }}
                >
                  {formatINR(quote.range.low)}–{formatINR(quote.range.high)}
                </p>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Starting at</p>
                <p className="text-[16px] font-extrabold leading-tight" style={{ color: 'var(--event-ink)' }}>
                  {Number.isFinite(entryPrice) ? formatINR(entryPrice) : 'On request'}
                </p>
              </div>
            )}
            <p className="text-[10px] font-semibold text-gray-500">
              {tiers.length} scales · 10–3,500 guests
            </p>
          </div>

          <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
            {['One coordinator answerable for all of it', 'You approve the price before anything is booked'].map(l => (
              <li key={l} className="flex items-center gap-1 text-[10.5px] font-semibold text-gray-500">
                <Check size={11} className="shrink-0 text-green-600" strokeWidth={3} />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </button>

      {/* ── The trust-builder ──────────────────────────────── */}
      <button
        type="button"
        onClick={() => onChoose('services')}
        className={`flex w-full items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 text-left ring-1 transition-colors hover:bg-white/[0.11] ${
          active === 'services' ? '' : 'ring-white/10'
        }`}
        style={active === 'services' ? { '--tw-ring-color': 'var(--event-glow)' } : undefined}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'color-mix(in srgb, var(--event-glow) 18%, transparent)', color: 'var(--event-glow)' }}
        >
          <LayoutGrid size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold leading-tight text-white">
            Or just one piece of it
          </span>
          <span className="block truncate text-[11px] leading-snug text-white/55">
            {named.join(' · ')}{rest ? ` · +${rest} more` : ''}
          </span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-white/35" />
      </button>
    </section>
  )
}
