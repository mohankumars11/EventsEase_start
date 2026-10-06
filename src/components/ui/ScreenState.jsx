import { RefreshCw, WifiOff } from 'lucide-react'

/**
 * Loading, empty and failed — the three states every screen has and
 * almost none of them wrote down.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY ONE COMPONENT AND NOT TWENTY-ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Before this there was no shared primitive at all: `animate-pulse` and
 * retry buttons were hand-written in eight different components, each
 * slightly different, and most screens had no error state whatsoever —
 * a failed read rendered as an empty list, which tells a partner their
 * jobs are gone rather than that the request failed.
 *
 * Writing the three states twenty-one times would produce twenty-one
 * dialects and no way to tell which screens were done. One component
 * means one dialect, and `check-one-partner-ui` can count the screens
 * that import it — so a half-finished job fails a guard instead of
 * needing somebody to remember.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A SKELETON, NOT A SPINNER
 * ══════════════════════════════════════════════════════════════════════
 *
 * A spinner says "wait"; a skeleton says "this is what is coming and
 * roughly how much of it". On a list that usually has three rows, three
 * grey rows is honest and stops the layout jumping when the real ones
 * land. `rows` is how many the caller expects, not a decoration.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AN ERROR NAMES THE THING THAT FAILED
 * ══════════════════════════════════════════════════════════════════════
 *
 * "We could not load your jobs" and a Retry, not "Something went wrong".
 * The partner knows which screen they are on; what they need is
 * permission to believe it is not their fault, and one tap to try again.
 */
export default function ScreenState({
  loading, error, empty,
  rows = 3,
  what = 'this',
  title, message, action,
  onRetry,
  children,
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading {what}…</span>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i}
               className="animate-pulse rounded-[18px] bg-ink/[0.04] ring-1 ring-ink/[0.04]"
               /* Staggered heights: a stack of identical bars reads as a
                  loading GRAPHIC, which is the thing it is pretending
                  not to be. */
               style={{ height: i === 0 ? 76 : 64 }} />
        ))}
      </div>
    )
  }

  if (error) {
    /* Offline is worth its own words. "Check your connection" is
       actionable; "we could not load this" sends somebody to support
       for something they can fix by walking outside. */
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    return (
      <div className="rounded-[18px] bg-white p-5 text-center ring-1 ring-ink/[0.07]">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-ink/[0.04] text-ink-mute">
          {offline ? <WifiOff size={17} /> : <RefreshCw size={17} />}
        </span>
        <p className="mt-2.5 text-[13.5px] font-extrabold text-ink">
          {offline ? 'You are offline' : `We could not load ${what}`}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-ink-mute">
          {offline
            ? 'It will load as soon as you have a connection.'
            : 'It is not gone — the request did not get through.'}
        </p>
        {onRetry && (
          <button
            type="button" onClick={onRetry}
            className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-plum-600 px-5 text-[13px] font-extrabold text-white"
          >
            <RefreshCw size={13} /> Try again
          </button>
        )}
      </div>
    )
  }

  if (empty) {
    return (
      <div className="rounded-[18px] bg-ink/[0.02] px-5 py-6 text-center">
        <p className="text-[13.5px] font-extrabold text-ink">{title}</p>
        {message && (
          <p className="mx-auto mt-1 max-w-[30ch] text-[12.5px] leading-relaxed text-ink-mute">
            {message}
          </p>
        )}
        {action}
      </div>
    )
  }

  return children ?? null
}
