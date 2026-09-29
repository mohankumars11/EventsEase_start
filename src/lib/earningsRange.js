import { istTodayISO, istDayStart } from './istTime'
import { financialYear } from './earningsStatement'

/**
 * The date windows the Earnings screen filters by, and the window
 * immediately before each one.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERY BOUNDARY IS INDIA'S MIDNIGHT, NOT THE DEVICE'S
 * ══════════════════════════════════════════════════════════════════════
 *
 * `event_date` is a DATE: a calendar day in India and nothing else. A
 * range built from `new Date()` on a phone left on UTC starts and ends
 * 5.5 hours out, which moves a day boundary — so at 23:30 UTC on the
 * 30th, "Today" would be the 30th while India is already on the 1st, and
 * a partner would be shown yesterday's earnings under today's heading.
 *
 * So the ranges are pure `YYYY-MM-DD` strings compared as strings, the
 * way `inFY()` already does, and "now" comes from `istTodayISO()`. No
 * Date arithmetic crosses a boundary anywhere in this file.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PREVIOUS WINDOW IS PART OF THE RANGE, NOT AN AFTERTHOUGHT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every KPI card shows a comparison, and a comparison needs a defined
 * "before". Computing it at the card would mean four components each
 * deciding what "last month" means. It is decided once, here, and the
 * rule is the same for all of them: the previous window is the SAME
 * LENGTH and ends the day before this one starts.
 *
 * `hasPrev` is the third state, and the one that matters. A partner in
 * their first month has no previous window — not a zero one. Zero means
 * "you earned nothing then"; absent means "there was no then". The card
 * renders those differently and `hasPrev` is how it knows.
 *
 * ── Note on "this month" vs "last month" ─────────────────────────────
 * `last-month` is a named calendar month, so its previous window is the
 * month before it, not a 30-day slide. Calendar presets compare against
 * calendar periods; only the rolling ones (today, week) slide.
 */

const DAY_MS = 86_400_000

/** YYYY-MM-DD, n days from an ISO date. Pure string in, string out. */
export function shiftISO(iso, days) {
  const ms = istDayStart(iso)
  if (!Number.isFinite(ms)) return null
  /* Shift the IST-anchored instant, then read the IST calendar day back.
     Going through istTodayISO keeps the offset in exactly one place. */
  return istTodayISO(ms + days * DAY_MS)
}

/** Whole days covered by an inclusive range. */
export function daysIn(from, to) {
  const a = istDayStart(from)
  const b = istDayStart(to)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.round((b - a) / DAY_MS) + 1
}

/** First day of the ISO week (Monday) containing an ISO date. */
function weekStart(iso) {
  const d = new Date(istDayStart(iso))
  /* getUTCDay because istDayStart returns a UTC instant pinned to IST
     midnight; reading local fields here would reintroduce the device. */
  const dow = (d.getUTCDay() + 6) % 7   // Monday = 0
  return shiftISO(iso, -dow)
}

/** First and last day of the calendar month containing an ISO date. */
function monthBounds(iso) {
  const start = `${iso.slice(0, 7)}-01`
  const [y, m] = iso.slice(0, 7).split('-').map(Number)
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { start, end: shiftISO(nextMonth, -1) }
}

export const PRESETS = ['today', 'week', 'month', 'last-month', 'fy']

/**
 * Build a range.
 *
 * @param id     one of PRESETS, or 'YYYY-MM-DD..YYYY-MM-DD' for custom
 * @param today  ISO date to treat as today (IST); injected for tests
 * @returns {{id, label, from, to, prevFrom, prevTo, hasPrev, custom}}
 */
export function buildRange(id = 'month', today = istTodayISO()) {
  const custom = typeof id === 'string' && id.includes('..')

  let from, to, label, prevFrom, prevTo

  if (custom) {
    const [a, b] = id.split('..')
    from = a.slice(0, 10)
    to = b.slice(0, 10)
    /* A custom window slides: the previous one is the same number of
       days, ending the day before. There is no calendar meaning to
       borrow, so length is the only honest rule. */
    const n = daysIn(from, to)
    prevTo = shiftISO(from, -1)
    prevFrom = shiftISO(prevTo, -(n - 1))
    label = 'Custom range'
  } else if (id === 'today') {
    from = to = today
    prevFrom = prevTo = shiftISO(today, -1)
    label = 'Today'
  } else if (id === 'week') {
    from = weekStart(today)
    to = today
    /* The same number of days in the week before, so a Wednesday is
       compared against a Wednesday and not against a full week that
       would always look larger. */
    const n = daysIn(from, to)
    prevFrom = shiftISO(from, -7)
    prevTo = shiftISO(prevFrom, n - 1)
    label = 'This week'
  } else if (id === 'month') {
    const b = monthBounds(today)
    from = b.start
    to = today
    const n = daysIn(from, to)
    const prev = monthBounds(shiftISO(b.start, -1))
    prevFrom = prev.start
    /* Same elapsed days into the previous month, clamped to its length —
       comparing 1-21 September against all of August would report a fall
       every single month until the 31st. */
    prevTo = shiftISO(prev.start, n - 1)
    if (istDayStart(prevTo) > istDayStart(prev.end)) prevTo = prev.end
    label = 'This month'
  } else if (id === 'last-month') {
    const b = monthBounds(shiftISO(monthBounds(today).start, -1))
    from = b.start
    to = b.end
    const prev = monthBounds(shiftISO(b.start, -1))
    prevFrom = prev.start
    prevTo = prev.end
    label = 'Last month'
  } else {
    /* The financial year, which is the window the tax figures are
       measured over and therefore the only one where the statement and
       the filter agree by construction. */
    const fy = financialYear(new Date(istDayStart(today)))
    from = fy.start
    to = fy.end
    const prevFy = financialYear(new Date(istDayStart(shiftISO(fy.start, -1))))
    prevFrom = prevFy.start
    prevTo = prevFy.end
    label = fy.label
    id = 'fy'
  }

  return { id, label, from, to, prevFrom, prevTo, hasPrev: true, custom }
}

/** Is an ISO date inside an inclusive range? String compare, like inFY. */
export function inRange(dateISO, from, to) {
  if (!dateISO) return false
  const d = dateISO.slice(0, 10)
  return d >= from && d <= to
}

/**
 * Whether a previous window is real for THIS partner.
 *
 * `buildRange` can always name a previous window — the calendar does not
 * run out. Whether that window means anything depends on whether the
 * partner existed during it, and the only evidence available on the
 * client is whether any job at all predates this range.
 *
 * Without this, every partner's first month reports "+100% vs last
 * month", which is a fabricated comparison against a period in which
 * they were not on the platform. The plan forbids exactly that.
 */
export function hasPriorData(rows, range, dateOf = r => r?.event_date) {
  if (!rows?.length) return false
  return rows.some(r => {
    const d = dateOf(r)
    return !!d && d.slice(0, 10) < range.from
  })
}
