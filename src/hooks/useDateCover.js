import { useEffect, useMemo, useState } from 'react'
import { coverMapFor, COVER } from '../lib/partnerCover'

/**
 * "Is anybody free that day?", asked once for a whole date grid.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DATE GRIDS HAVE NEVER ASKED ANYBODY ANYTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * Both customer date pickers offer the next fourteen or twenty-one days
 * as equally tappable, because that is what `nextDays()` returns. A
 * customer picks a Saturday when every decorator within 15 km is already
 * booked, fills in an address, answers the options, and finds out at
 * dispatch.
 *
 * ── Returns null, loudly, rather than guessing ──────────────────────
 * `null` means "we could not ask" — no trade chosen yet, no location
 * yet, the function not deployed, the request failed. Callers render
 * NOTHING in that case. The one outcome that must never occur is a
 * date being marked unavailable because a lookup failed; see the header
 * of lib/partnerCover.
 *
 * ── It is deliberately not a gate ───────────────────────────────────
 * Nothing here disables a date. The count can go stale between the
 * lookup and the tap, and the server decides anyway. A hint that turns
 * out to be pessimistic costs a customer a raised eyebrow; a gate that
 * turns out to be pessimistic costs a partner the job.
 */
export function useDateCover({
  trades, lat, lng, radiusKm = 15, dates, allowSynthetic = false, enabled = true,
}) {
  const [cover, setCover] = useState(null)

  /* The dependency is the CONTENT, not the array identity — `dates` is
     rebuilt by nextDays() on every render, so depending on the array
     itself would re-query forever. */
  const tradeKey = useMemo(
    () => (Array.isArray(trades) ? [...trades].sort().join(',') : String(trades ?? '')),
    [trades])
  const dateKey = useMemo(() => (dates ?? []).join(','), [dates])

  useEffect(() => {
    if (!enabled || !tradeKey || !dateKey) { setCover(null); return }
    let live = true
    coverMapFor({
      trades: tradeKey.split(',').filter(Boolean),
      lat, lng, radiusKm,
      dates: dateKey.split(',').filter(Boolean),
      allowSynthetic,
    }).then(map => { if (live) setCover(map) })
    return () => { live = false }
  }, [enabled, tradeKey, dateKey, lat, lng, radiusKm, allowSynthetic])

  return cover
}

export { COVER }
export default useDateCover
