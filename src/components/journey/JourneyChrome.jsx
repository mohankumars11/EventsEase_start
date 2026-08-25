import { ArrowLeft, ArrowRight, Check, SkipForward } from 'lucide-react'

/**
 * The frame every journey step is drawn in.
 *
 * ── What is deliberately NOT here ───────────────────────────────────────
 * A price. Not in the bar, not in the footer, not as a running total in the
 * corner. The celebration builder pins its estimate to the bottom of the
 * screen at all times and that is right for the builder — its whole pitch is
 * "watch the number move". This flow makes the opposite argument: a number on
 * screen while somebody is choosing their mother's sixtieth turns every
 * decision into an arithmetic problem, and in this market it turns a family
 * planning a celebration into a family defending a budget. The estimate
 * arrives once, at the end, against a plan they built.
 *
 * So the bar carries the only two facts worth carrying: what we are planning,
 * and how much of it is left.
 */

/** The top bar: an exit, the occasion, and how far along. */
export function JourneyBar({ title, emoji, stepIndex, stepCount, onBack, onExit }) {
  const pct = stepCount > 0 ? Math.round((stepIndex / stepCount) * 100) : 0
  return (
    <header className="a-appbar sticky top-0 z-30">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onBack ?? onExit}
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunk/[0.06]"
        >
          <ArrowLeft size={19} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-extrabold leading-tight text-ink">
            {emoji} {title}
          </p>
          <p className="text-[11px] leading-tight text-ink-mute">
            Step {Math.min(stepIndex + 1, stepCount)} of {stepCount}
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold text-ink-mute transition-colors hover:bg-surface-sunk/[0.06]"
        >
          Save &amp; exit
        </button>
      </div>
      {/* One hairline, not a segmented rail. Twenty-nine segments on a 360px
          phone is a barcode; a filling line is legible at any step count. */}
      <div className="h-[3px] w-full bg-surface-sunk/[0.08]">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-saffron-400 to-plum-500 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </header>
  )
}

/**
 * One question, presented as one question.
 *
 * The overline names the chapter, the heading asks, and `why` is the single
 * sentence that earns the question. That sentence is the whole difference
 * between a form and a conversation: "Who is photographing this?" is an
 * interrogation, and "Somebody has to be looking at the face when the candles
 * go out, and it cannot be the person holding the cake" is a reason.
 */
export function StepFrame({ overline, question, why, children, footnote }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-4 pt-6">
      {overline && (
        <p className="type-overline text-saffron-700">{overline}</p>
      )}
      <h1 className="mt-1.5 font-serif text-[26px] font-extrabold leading-[1.14] tracking-tight text-ink sm:text-[30px]">
        {question}
      </h1>
      {why && (
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">{why}</p>
      )}
      <div className="mt-5">{children}</div>
      {footnote && (
        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-mute">{footnote}</p>
      )}
    </div>
  )
}

/**
 * The way on, pinned.
 *
 * ── Why "skip" is a first-class control ─────────────────────────────────
 * Almost every chapter in this flow is optional, and the honest way to say so
 * is to put the refusal next to the acceptance rather than hiding it as a
 * small grey link. A flow that makes declining feel like failing is a flow
 * people abandon rather than decline — and an abandoned journey tells a
 * coordinator nothing, where "no photographer, a cousin is doing it" tells
 * them everything.
 *
 * The skip button is also what stops the wedding flow being punishing: a
 * family who wants six of the twenty-nine chapters can be through it in two
 * minutes of thumbing "not needed", and every one of those refusals is
 * recorded rather than guessed at.
 */
export function JourneyActions({
  primaryLabel = 'Continue',
  onPrimary,
  primaryDisabled = false,
  onSkip,
  skipLabel,
  ready = false,
  hint,
}) {
  return (
    <div
      /* Fixed, and mounted outside every animated container on the page.
         An ancestor with a transform — even an identity one from an entrance
         animation — makes `position: fixed` resolve against that ancestor
         instead of the viewport, and the bar renders somewhere off screen.
         This has bitten this codebase before; see the sheets. */
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline/10 bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-4 pb-1 pt-2.5">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="a-btn-ghost min-h-[52px] shrink-0 px-4 text-[13px] font-bold"
          >
            <SkipForward size={15} />
            <span className="hidden xs:inline">{skipLabel ?? 'Skip'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className={`a-btn-primary min-h-[52px] flex-1 ${ready ? 'animate-[pulse_2.4s_ease-in-out_infinite]' : ''}`}
        >
          {primaryLabel}
          {primaryLabel.startsWith('Show') ? <Check size={17} /> : <ArrowRight size={17} />}
        </button>
      </div>
      {hint && (
        <p className="px-4 pb-1.5 text-center text-[11px] text-ink-mute">{hint}</p>
      )}
    </div>
  )
}

/** Clearance so the last card of a step is never delivered under the bar. */
export const ACTION_BAR_CLEARANCE = 'pb-[calc(6rem+env(safe-area-inset-bottom))]'
