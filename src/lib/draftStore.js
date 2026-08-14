/**
 * Keeping a half-finished flow alive across a navigation.
 *
 * ── Why this is not the draft the two planners already had ──────────────
 * Both the wizard and the builder already write a `sessionStorage` draft, and
 * neither can be reused for this. Theirs is a *login hand-off*: written once,
 * at the moment a signed-out customer presses send, and read back by an effect
 * that puts the answers on screen and — in the builder's case — submits them
 * immediately. Restoring that on an ordinary page visit would fire an enquiry
 * to a coordinator because somebody wandered back to a page.
 *
 * The two mechanisms want opposite things, so they get separate keys. The
 * hand-off draft still means "this was ready to send, finish it". This one
 * means "this is what was on screen, put it back", and nothing else.
 *
 * ── Why it is written continuously ──────────────────────────────────────
 * Because the interruption is never announced. Nobody presses Home *intending*
 * to save; a phone rings, a notification opens, the back gesture fires from the
 * edge of the screen. The only save that survives that is the one that already
 * happened, so state is committed as it changes rather than at exits nobody
 * reaches. The throttle is what keeps that from being a write per keystroke.
 *
 * ── sessionStorage, and a TTL on top ────────────────────────────────────
 * Same lifetime as lib/journey, which is what offers these drafts back — one
 * cannot outlive the other or the app offers to restore something that is
 * gone. The TTL then handles the tab left open for a day: at that point the
 * guest count and the date belong to a plan the customer has stopped making,
 * and silently repopulating a form with them is worse than an empty one.
 */

/** Six hours. Long enough to cover an evening of thinking about it with the
 *  tab open, short enough that nothing stale is ever put back on screen. */
const TTL_MS = 6 * 60 * 60 * 1000

/** One in-flight timer per key, so two flows can autosave independently. */
const timers = new Map()

/**
 * Save, at most once every 400ms per key.
 *
 * Trailing-edge: the last state within the window is the one written, which is
 * the correct one — an autosave that persists the *first* keystroke of a burst
 * and drops the rest saves the least useful version of the work.
 */
export function saveDraft(key, value, { delay = 400 } = {}) {
  clearTimeout(timers.get(key))
  timers.set(key, setTimeout(() => {
    timers.delete(key)
    try {
      sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }))
    } catch { /* storage off or quota — the flow itself still works */ }
  }, delay))
}

/** The saved state, or null if there is none, it is stale, or it is unreadable. */
export function loadDraft(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.value) return null
    if (Date.now() - (parsed.savedAt ?? 0) > TTL_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    return parsed.value
  } catch {
    return null
  }
}

/**
 * Forget it. Called when the work is finished rather than paused — a sent
 * enquiry, a placed order — so the app never offers to resume something the
 * customer has already completed.
 */
export function clearDraft(key) {
  clearTimeout(timers.get(key))
  timers.delete(key)
  try { sessionStorage.removeItem(key) } catch { /* nothing to clear */ }
}
