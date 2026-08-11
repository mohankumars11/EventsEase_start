export function formatINR(amount) {
  if (amount == null || amount === '') return '—'
  return '₹' + Number(amount).toLocaleString('en-IN')
}

export function formatINRRange(min, max) {
  if (!min && !max) return 'Price on request'
  if (!max) return `From ${formatINR(min)}`
  if (!min) return `Up to ${formatINR(max)}`
  if (Number(min) === Number(max)) return formatINR(min)
  return `${formatINR(min)} – ${formatINR(max)}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/**
 * Local-midnight yyyy-mm-dd, the format `<input type="date">` speaks.
 *
 * Not `toISOString().slice(0, 10)`: that converts to UTC first, so anywhere
 * east of Greenwich — all of India, at +05:30 — every time before 05:30 local
 * hands back *yesterday*. Used as the `min` on a delivery date picker, that
 * silently permits a date already in the past for the first five and a half
 * hours of every day.
 */
export function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function todayISO() {
  return toISODate(new Date())
}

/**
 * "Today" / "Tomorrow" / "Sat, 16 Aug" for a yyyy-mm-dd string.
 *
 * People think about a delivery in the first two and in weekdays after that —
 * "16/08/2026" makes you count. Parsed field-by-field rather than with
 * `new Date(iso)`, which reads a bare yyyy-mm-dd as UTC midnight and so
 * renders the previous day in Indian time.
 */
export function humanDate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((date - today) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
