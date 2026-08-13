import { useEffect, useRef } from 'react'
import { Check, ArrowRight, Receipt, Lock } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * Where you are in the build, what it costs so far, and the way on — as one
 * band, directly under the title.
 *
 * ── What this replaces, and why it moved ────────────────────────────────
 * The six steps used to be a strip of chips *below* the offers rail and the
 * booking-mode cards: roughly two phone screens of scrolling from the top of
 * the page. So the customer's own question — "what am I being asked, and how
 * much of this is left?" — was answered somewhere they had to go looking, and
 * the number the whole page exists to show was pinned at the very bottom of
 * the screen in 14px type. People scrolled to the bottom, tapped the guest
 * count they had already given on the previous screen, and stalled.
 *
 * It is the first thing under the hero now, and it is sticky, so it is on
 * screen at the top of every step and after every scroll. Three things live
 * in it, in the order a customer wants them:
 *
 *   WHERE AM I    numbered steps, the current one opened out with its label,
 *                 completed ones ticked and carrying what was decided there,
 *                 so the rail doubles as a running summary of the build.
 *   WHAT IS IT    the estimate, stated at the size of a price rather than the
 *                 size of a caption, marked "incl. taxes" because that is the
 *                 promise this page makes. Tapping it goes to the review.
 *   WHAT NEXT     one primary control, saying where it goes ("Next: Food"),
 *                 at the top of the page as well as pinned at the bottom. It
 *                 pulses once the current step has been answered — the
 *                 difference between a button that is available and a button
 *                 that is now the thing to press.
 *
 * On a phone the steps scroll sideways and the active chip is scrolled into
 * view for you; the estimate and the forward button sit on their own row
 * beneath, which is the one arrangement that fits all three at 360px without
 * anything truncating to nonsense.
 */
export default function JourneyRail({
  steps, current, flow, done, summary, showQuote, quote,
  onGoTo, onOpenReview, primaryLabel, onPrimary, primaryDisabled, primaryReady,
  progressPct, settled = false,
}) {
  // The active chip is dragged into view rather than left off the right-hand
  // edge — a rail that has silently scrolled past the step you are on is a
  // rail that tells you nothing.
  const railRef = useRef(null)
  useEffect(() => {
    const el = railRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [current])

  return (
    /* Stuck under the app's navbar, not under the top of the window. The bar
       this replaces was `sticky top-0` beneath a `sticky top-0 z-50` Navbar of
       its own, so the moment the page scrolled the steps slid underneath 64px
       of chrome and stayed there — a navigation band nobody could see, which
       is a fair part of why the flow read as having no navigation at all. */
    <div className="plan-bar sticky top-16 z-30 border-b border-white/10 shadow-lg shadow-black/30">
      <div className="mx-auto max-w-6xl px-3 pt-2 sm:px-6">
        <div className="flex items-center gap-4">
          {/* ── The steps ─────────────────────────────────────────────── */}
          <div ref={railRef} className="plan-rail-scroll flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-2">
            {steps.map((s, i) => {
              const off = !flow.some(f => f.id === s.id)
              const locked = s.id === 'review' && !showQuote
              const disabled = off || locked
              const active = current === s.id
              const complete = done[s.id]
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  type="button"
                  data-active={active}
                  onClick={() => !disabled && onGoTo(s.id)}
                  disabled={disabled}
                  aria-current={active ? 'step' : undefined}
                  title={off ? `${s.label} — switched off` : s.label}
                  className={`plan-step group flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30 ${
                    active
                      ? 'plan-step-on bg-white text-plum-900 shadow-lg'
                      : complete
                        ? 'bg-emerald-400/15 text-white ring-1 ring-emerald-300/30 hover:bg-emerald-400/25'
                        : 'bg-white/[0.07] text-white/60 ring-1 ring-white/10 hover:bg-white/15'
                  }`}
                >
                  {/* The number is the affordance: six of them in a row read
                      as a sequence with an end, which a row of icons does
                      not. It becomes a tick once the step is answered. */}
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${
                      active
                        ? 'bg-gradient-to-br from-saffron-500 to-amber-600 text-white'
                        : complete
                          ? 'bg-emerald-400 text-emerald-950'
                          : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {locked ? <Lock size={11} /> : complete && !active ? <Check size={13} /> : i + 1}
                  </span>

                  {/* Only the step you are on spells itself out in full; the
                      rest carry their answer, or nothing. Six full labels on
                      a 360px screen is a rail nobody can read. */}
                  <span className={`min-w-0 text-left ${active ? 'block' : 'hidden sm:block'}`}>
                    <span className="flex items-center gap-1 whitespace-nowrap text-[12px] font-bold leading-tight">
                      {active && <Icon size={12} className="text-plum-500" />}
                      {s.label}
                    </span>
                    <span
                      className={`block max-w-[130px] truncate text-[10px] font-medium leading-tight ${
                        active ? 'text-plum-500' : complete ? 'text-emerald-200/80' : 'text-white/35'
                      }`}
                    >
                      {off ? 'switched off' : summary[s.id] ?? '—'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── The number and the way on, desktop ─────────────────────
              Beside the steps rather than under them, so the whole band is
              one line on a laptop and the price never leaves the top of the
              page. */}
          <div className="hidden shrink-0 items-center gap-3 pb-2 lg:flex">
            {showQuote ? (
              <button
                type="button"
                onClick={onOpenReview}
                className="rounded-xl bg-white/[0.07] px-3.5 py-1.5 text-right ring-1 ring-white/10 transition-colors hover:bg-white/15"
              >
                {/* "So far" until the configuration is sendable. The number
                    only counts what has actually been chosen, so calling a
                    half-built ₹17,000 "your estimate" next to a scale card
                    quoting ₹4,75,500 is how a transparent price loses the
                    customer's trust in one glance. */}
                <span className="flex items-center justify-end gap-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-saffron-300">
                  <Receipt size={9} /> Estimated{settled ? '' : ' so far'} · incl. taxes
                </span>
                <span className="block whitespace-nowrap text-[15px] font-extrabold leading-tight text-white">
                  {formatINR(quote.range.low)} – {formatINR(quote.range.high)}
                </span>
              </button>
            ) : (
              <span className="max-w-[190px] text-[11px] leading-snug text-white/40">
                Your estimate appears here the moment you pick an occasion.
              </span>
            )}

            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryDisabled}
              className={`flex min-h-[44px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-saffron-500 to-amber-500 px-4 text-sm font-extrabold text-white shadow-lg shadow-amber-900/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${
                primaryReady ? 'plan-cta-ready' : ''
              }`}
            >
              {primaryLabel} <ArrowRight size={15} />
            </button>
          </div>
        </div>

      </div>
      {/* No phone copy of the price and the forward button, on purpose. They
          are already pinned to the bottom of the screen where a thumb is (see
          BuilderActionBar), and a second set at the top would put roughly a
          fifth of a 360px viewport under fixed chrome saying the same two
          things twice. The phone gets the steps here and the money there;
          only the laptop, which has no pinned bar, needs both in this band. */}

      {/* How much of the build is behind you. On a six-step flow this is the
          difference between starting and not. */}
      <div className="h-0.5 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-saffron-400 to-amber-300 transition-[width] duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )
}
