/** Customer-facing coverage scopes. These are requests without prices;
 * the selected hours and included extras are sent to the server for a fresh
 * partner capability/package check before any quote or booking is offered.
 */
export const SERVICE_COVERAGE = {
  photography: ['2 hours', '4 hours', '6 hours + printed album'],
  videography: ['2 hours', '4 hours', '6 hours'],
  dj_music: ['2 hours', '3 hours', '4 hours'],
  anchor_mc: ['2 hours', '4 hours', '6 hours + custom script'],
  live_entertainment: ['1 hour', '2 hours', '3 hours'],
  bridal_makeup_hair: ['1 hour', '2 hours', '3 hours'],
  mehendi_artist: ['1 hour', '2 hours', '3 hours'],
}

export const VIP_EXTRA = Object.freeze({ photography: 'Printed album', anchor_mc: 'Custom script writing' })

export function durationHours(value) {
  const direct = Number(value)
  if (Number.isFinite(direct) && direct > 0) return direct
  const parsed = Number(String(value ?? '').match(/\\d+(?:\\.\\d+)?/)?.[0])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function coverageSelection(tradeId, label, currentExtras = []) {
  const hours = durationHours(label)
  const vip = tradeId === 'photography' ? String(label).includes('printed album')
    : tradeId === 'anchor_mc' ? String(label).includes('custom script') : false
  const extra = VIP_EXTRA[tradeId]
  const extras = new Set(currentExtras)
  if (extra) {
    if (vip) extras.add(extra)
    else extras.delete(extra)
  }
  return { coverage: label, hours, extras: [...extras] }
}
