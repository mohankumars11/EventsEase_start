/**
 * While a sheet is open it owns the page's scroll, and Escape closes it.
 *
 * ── The bug this exists for ─────────────────────────────────────────
 * The three Calendar sheets — AvailabilityRangeSheet, DayDetailSheet and
 * RecurringAvailability — had none of this. Dragging inside "Set a range
 * of dates" scrolled the month grid behind it, because the sheet's own
 * overflow-y-auto chains to the document once it hits either end and
 * nothing was holding the body still. That is the reported bug.
 *
 * CitySheet and PairingSheet already did it correctly and independently,
 * each with its own copy of the effect. This is that effect, once, so a
 * fourth sheet does not have to rediscover it:
 *
 *   - body overflow is pinned while open and RESTORED TO ITS PREVIOUS
 *     VALUE, not to '' — two stacked sheets must not have the inner one
 *     unlock the page on the way out.
 *   - Escape closes, which is the only keyboard way out on desktop.
 *
 * It deliberately does NOT portal. Portalling is per-sheet, because a
 * sheet with a `sm:` centred-dialog variant positions against the
 * viewport either way, and moving it changes nothing except which
 * ancestors can trap it with a transform.
 */
import { useEffect } from 'react'

export function useSheetLock(open, onClose) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])
}

export default useSheetLock
