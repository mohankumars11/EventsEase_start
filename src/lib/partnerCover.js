import { supabase } from './supabase'
import { COVER, coverFor } from './availability'

/**
 * How many partners are free, per date — the customer's only view of
 * the partner calendar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THE CUSTOMER IS ALLOWED TO RECEIVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A number. Nothing else ever crosses this boundary: not a status, not
 * a partner id, not `note`, not `reason`. "Nobody is free on the 20th"
 * is useful; "Ramesh is at a family function" is none of the customer's
 * business, and migration 130 marks those columns partner-facing for
 * exactly this reason.
 *
 * The boundary is enforced in SQL, not here — `partners_free_on` (134)
 * returns `(slot_date, free_count)` and is the only availability
 * function granted to anon. This module cannot leak what it is never
 * given.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT IS A HINT, NEVER A GATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The count is true at the moment it is asked and can be wrong a second
 * later — a partner accepts something, another comes online. The thing
 * that actually decides is `match_partners` at dispatch and
 * `accept_offer` at acceptance, both server-side, both in a transaction.
 *
 * So a screen using this may DISCOURAGE a date. It must not refuse one.
 * A customer told "nobody is free" for a date somebody would in fact
 * have taken has been turned away by a cache.
 *
 * ── An error is UNKNOWN, and UNKNOWN shows nothing ──────────────────
 * The one failure that must never happen here is a failed request
 * rendering as "nobody is free". That is the same class of bug as the
 * partner calendar showing an empty month on a failed read, and it is
 * worse, because it turns a customer away from a business that was open.
 * Every failure path below returns null.
 */

/** Trades asked about in one go. Each is a round trip; three is plenty. */
const MAX_TRADES = 3

/**
 * @returns {Promise<Record<string, number>|null>} dateISO → free count,
 *          or null when the question could not be asked or answered.
 */
export async function coverForDates({
  trades, lat, lng, radiusKm = 15, dates, allowSynthetic = false,
}) {
  const list = (Array.isArray(trades) ? trades : [trades]).filter(Boolean)
  if (!list.length || !dates?.length) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  try {
    const results = await Promise.all(
      list.slice(0, MAX_TRADES).map(trade =>
        supabase.rpc('partners_free_on', {
          p_trade: trade,
          p_lat: lat,
          p_lng: lng,
          p_radius_m: Math.round(radiusKm * 1000),
          p_dates: dates,
          p_allow_synthetic: allowSynthetic,
        })))

    /* Any failure at all — the function not deployed yet included —
       means we do not know. Saying so is the whole point. */
    if (results.some(r => r.error)) return null

    /* The BINDING constraint across trades. A customer needing a
       photographer and a caterer is stuck on whichever is scarcer, so
       reporting the larger of the two would be a promise the booking
       cannot keep. */
    const out = {}
    for (const { data } of results) {
      for (const row of data ?? []) {
        const n = Number(row.free_count) || 0
        out[row.slot_date] = out[row.slot_date] === undefined
          ? n : Math.min(out[row.slot_date], n)
      }
    }
    return out
  } catch {
    return null
  }
}

/**
 * The same call, reduced to the words a customer reads.
 * Returns a map of dateISO → COVER, or null when unknown.
 */
export async function coverMapFor(args) {
  const counts = await coverForDates(args)
  if (!counts) return null
  return Object.fromEntries(
    Object.entries(counts).map(([d, n]) => [d, coverFor(n)]))
}

export { COVER, coverFor }
