/**
 * The trades a partner picked, walked one at a time.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A QUEUE AT ALL
 * ══════════════════════════════════════════════════════════════════════
 *
 * "What you offer" takes several trades. The listing flow takes one —
 * it always has, because its questions ARE one trade's questions, and
 * that is the part the brief is explicit about not rebuilding.
 *
 * So the multi-select has to become a sequence somewhere, and this is
 * it: Continue writes the list down, the listing flow finishes one trade
 * and asks what is next.
 *
 * ── Device-local, and that is the honest place for it ──────────────
 * This is an INTENTION, not a record. The record is partner_listings:
 * every trade picked already has a container row by the time this is
 * written, so a partner who loses this queue loses the running order and
 * nothing else — My Services still lists all four, each resumable.
 *
 * Putting the running order on the server would mean a column that has
 * to be cleaned up when somebody abandons it, and a stale row telling a
 * partner three months later to go and finish Videography.
 */

const KEY = 'sb_partner_trade_queue_v1'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : null
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list))
    else localStorage.removeItem(KEY)
  } catch { /* private mode — the queue is a convenience, not a record */ }
}

/** Start a walk. Replaces any half-finished one: the partner just chose. */
export function queueTrades(trades = []) {
  write([...new Set(trades)])
}

/** What is still to do, in order. */
export function pendingTrades() {
  return read()
}

/**
 * One trade finished. Returns the next, or null when the walk is over.
 *
 * Takes the trade by name rather than shifting blindly: a partner who
 * backed out of Catering and finished Decoration instead should have
 * Decoration struck off, not whatever happened to be first.
 */
export function completeTrade(trade) {
  const rest = read().filter(t => t !== trade)
  write(rest)
  return rest[0] ?? null
}

/** They stopped. Nothing is lost — every trade already has a container. */
export function clearQueue() {
  write([])
}
