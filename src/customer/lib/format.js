/** Money and dates, the way the customer app writes them. */
const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** ₹17,935 — whole rupees; the engine's paise are never shown as decimals. */
export const rupees = paise => (Number(paise) > 0 ? `₹${INR.format(Math.round(Number(paise) / 100))}` : null)

export const iso = d => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
export const fromIso = s => (s ? new Date(`${s}T00:00:00`) : null)

const FULL = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

/** "Today", "Tomorrow", or "Sat, 14 Dec". */
export function dayLabel(s) {
  const d = fromIso(s)
  if (!d) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 864e5)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return FULL.format(d)
}

/** "in 23 days", "tomorrow", "today", or null once it has passed. */
export function countdown(s) {
  const d = fromIso(s)
  if (!d) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const n = Math.round((d - today) / 864e5)
  if (n < 0) return null
  return n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** '19:30' → '7:30 PM'. */
export function timeLabel(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** "Sat, 24 Oct · 7:30 PM", or whichever half is known. */
export const whenLabel = (date, time) => [dayLabel(date), timeLabel(time)].filter(Boolean).join(' · ') || null
