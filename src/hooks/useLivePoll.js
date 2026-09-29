import { useEffect, useRef } from 'react'

/**
 * A poll that stops when nobody is looking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ARITHMETIC THAT MAKES THIS MATTER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Six screens in this app poll on a fixed interval underneath their
 * Realtime subscription — the board every 4s, the partner's jobs every
 * 20s, the admin console every 60s. That is correct: a table nobody
 * added to the `supabase_realtime` publication is SILENT rather than
 * loud, so a poll is the only thing that keeps a screen honest.
 *
 * It is also unconditional, and that does not survive scale.
 *
 * At ten thousand partners with the app open — a Saturday morning — a
 * 20-second poll is 500 queries a second, forever, for screens that are
 * in a pocket. The phones pay for it in battery, Supabase pays for it in
 * connections, and not one of those queries changes a pixel anybody is
 * looking at.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HIDDEN IS NOT THE SAME AS GONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The poll stops while the tab is hidden and fires ONCE, immediately, on
 * return. That last part is the whole design: somebody coming back to a
 * screen must see the truth in the frame they see it, not up to twenty
 * seconds later. Skipping the catch-up would trade a real bug for a
 * saving.
 *
 * Realtime keeps running while hidden — a websocket costs almost
 * nothing and is what delivers a job offer to a backgrounded app. This
 * only stops the belt-and-braces query underneath it.
 */
export function useLivePoll(fn, intervalMs = 20_000, deps = []) {
  const saved = useRef(fn)
  saved.current = fn

  useEffect(() => {
    let timer = null

    const visible = () =>
      typeof document === 'undefined' || document.visibilityState !== 'hidden'

    const start = () => {
      stop()
      timer = setInterval(() => { if (visible()) saved.current?.() }, intervalMs)
    }

    const stop = () => { if (timer) { clearInterval(timer); timer = null } }

    const onVisibility = () => {
      if (visible()) {
        // The catch-up. Immediate, then resume the cadence.
        saved.current?.()
        start()
      } else {
        stop()
      }
    }

    if (visible()) start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps])
}
