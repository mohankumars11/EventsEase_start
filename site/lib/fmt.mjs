/**
 * Formatting. Indian digit grouping, guest ranges, dates.
 *
 * Every number a visitor reads goes through here, so a rupee amount cannot
 * appear as ₹7500 on one page and ₹7,500 on another.
 */

/** ₹7,500 — Indian grouping (2,2,3), not the Western 3,3,3. */
export function inr(n) {
  if (n == null || !Number.isFinite(Number(n))) return ''
  const num = Math.round(Number(n))
  const s = String(Math.abs(num))
  let out
  if (s.length <= 3) out = s
  else {
    const last3 = s.slice(-3)
    const rest = s.slice(0, -3)
    out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3
  }
  return (num < 0 ? '-₹' : '₹') + out
}

/**
 * A price band as prose.
 *
 * Deliberately NOT reusing SVC.priceHint verbatim everywhere: some hints
 * carry a unit ("₹250 – ₹800/plate", "₹50 – ₹200/seat") and some do not, and
 * a scanner reads the first number of a per-plate range as the price of
 * catering. Where the hint has a unit we keep the hint, because dropping it
 * is what makes the number wrong. Where it does not, we render from the
 * numbers so the grouping is ours.
 */
export function band(service) {
  const hint = service.priceHint ?? ''
  if (/\/(plate|seat|head|person|unit|kg|hour|day)/i.test(hint)) return hint
  if (!service.priceMax) return ''
  if (service.priceMin === service.priceMax) return inr(service.priceMax)
  return `${inr(service.priceMin)} – ${inr(service.priceMax)}`
}

/** "75 to 150 guests" */
export const guests = g =>
  !g ? '' : g.max ? `${g.min} to ${g.max} guests` : `${g.min} guests and up`

/** "19 September 2026" from an ISO date or datetime. */
export function longDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
}

/** YYYY-MM-DD, for <time datetime> and schema dateModified. */
export const isoDay = iso => (iso ? String(iso).slice(0, 10) : '')

/** Sentence-safe truncation for meta descriptions. Never mid-word. */
export function clamp(text, max = 158) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '), cut.lastIndexOf(' '))
  return cut.slice(0, stop > max * 0.6 ? stop : cut.length).replace(/[,.\s]+$/, '') + '…'
}

/**
 * Deterministic rotation of a sibling list.
 *
 * Every occasion page needs "other occasions", and taking the first six of
 * the same array on all 25 pages points the whole site at the same six
 * children — a crawl graph with a bottleneck instead of a mesh. Hashing the
 * page's own id spreads it, and a hash rather than a random keeps the build
 * reproducible: the same input must always emit the same bytes.
 *
 * `self` is excluded. EventFooter.jsx makes the point that a "you might also
 * want" row containing the page you are standing on is the classic tell that
 * nothing on it was chosen deliberately.
 */
export function siblings(all, selfId, count = 6, key = 'id') {
  const pool = all.filter(x => x[key] !== selfId)
  if (pool.length <= count) return pool
  let hash = 0
  for (const ch of String(selfId)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const start = hash % pool.length
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length])
}

/**
 * A <title> that fits.
 *
 * Google renders roughly 580px of title, which is about 60 characters at
 * typical widths, and truncates the rest with an ellipsis. The brand suffix
 * is the least useful part of a long title — the reader already knows whose
 * result they are looking at from the URL beneath it — so it is the part
 * that gets dropped rather than the words describing the page.
 *
 * Returns `main | Brand` when that fits inside `max`, `main` alone when it
 * does not, and a trimmed `main` when even that is too long.
 */
export function fitTitle(main, brand = 'Sambramo', max = 60) {
  const m = String(main).trim()
  const withBrand = `${m} | ${brand}`
  if (withBrand.length <= max) return withBrand
  if (m.length <= max) return m
  const cut = m.slice(0, max)
  const sp = cut.lastIndexOf(' ')
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,–—-]+$/, '')
}
