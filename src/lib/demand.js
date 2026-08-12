/**
 * Date interest — one source of truth for what a date says to a customer.
 *
 * Pure functions, no React and no Supabase, so the home card, the calendar
 * and the wizard summary physically cannot tell three different stories
 * about the same day.
 *
 * ── What this deliberately does NOT do ───────────────────────────────
 *
 * An earlier version scored every date from festivals, weekends, seasons and
 * vendor availability. The result was a calendar where nearly every day came
 * back amber, which teaches people to ignore it — and it let vendors' own
 * availability decide what a customer was told. Both are gone.
 *
 * Now there is exactly one thing a date can say, and only when it is true:
 * how many people have asked about it. That number is the sum of enquiries
 * submitted through the site and enquiries the team logged from WhatsApp,
 * calls and walk-ins, each with a note saying where they came from.
 *
 * ── Every date is available ──────────────────────────────────────────
 *
 * Nothing here can block, cap or refuse a date. There is no "full" state to
 * reach. A busy date is an invitation to hurry, and that is the only thing
 * pressure is ever allowed to mean.
 */

/**
 * Below this, a date says nothing at all.
 *
 * Two people asking is not a signal, it is noise, and "1 enquiry" printed on
 * a date reads as "nobody wants this". Under the floor the date renders
 * exactly like every other — plain, available, no badge.
 */
export const INTEREST_FLOOR = 3

/** Above this, the date gets the stronger treatment. Still just a count. */
export const INTEREST_HIGH = 8

export const INTEREST_LEVELS = {
  NONE: {
    key: 'NONE',
    rank: 0,
    // The default for most of the year. A calendar where 340 days shout is a
    // calendar nobody scans — the same reasoning as the vendor-side OPEN cell.
    dot: '',
    cell: 'bg-white/5 text-white/85 border-white/10 hover:border-teal-400/50',
    chip: '',
    chipDark: '',
    accentDark: 'text-white/50',
  },
  INTEREST: {
    key: 'INTEREST',
    rank: 1,
    label: 'People are asking',
    dot: 'bg-teal-400',
    cell: 'bg-teal-400/15 text-teal-100 border-teal-400/40 hover:border-teal-300',
    chip: 'bg-teal-400/15 text-teal-100 border-teal-400/30',
    chipDark: 'bg-teal-400/15 text-teal-200 border-teal-400/30',
    accentDark: 'text-teal-300',
  },
  HIGH_INTEREST: {
    key: 'HIGH_INTEREST',
    rank: 2,
    label: 'In demand',
    dot: 'bg-teal-300',
    cell: 'bg-teal-400/30 text-white border-teal-300/60 ring-1 ring-teal-300/40 hover:border-teal-200',
    chip: 'bg-teal-400/25 text-teal-50 border-teal-300/40',
    chipDark: 'bg-teal-400/25 text-teal-100 border-teal-300/40',
    accentDark: 'text-teal-200',
  },
}

export const TIME_SLOTS = [
  { key: 'MORNING',   label: 'Morning',   hint: '6 AM – 12 PM', start: '06:00', end: '12:00', emoji: '🌅' },
  { key: 'AFTERNOON', label: 'Afternoon', hint: '12 PM – 4 PM',  start: '12:00', end: '16:00', emoji: '☀️' },
  { key: 'EVENING',   label: 'Evening',   hint: '4 PM – 9 PM',   start: '16:00', end: '21:00', emoji: '🌇' },
  { key: 'FULL_DAY',  label: 'Full day',  hint: 'Morning to night', start: '08:00', end: '22:00', emoji: '🎊' },
]

export function slotByKey(key) {
  return TIME_SLOTS.find(s => s.key === key) ?? null
}

// ── date helpers ────────────────────────────────────────────────────
//
// Everything parses yyyy-mm-dd field by field. `new Date('2026-11-22')` is
// read as UTC midnight, which in IST renders as the 21st — the same class of
// bug utils/format.js documents at length.

export function parseISO(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function isoOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function daysBetween(fromISO, toISO) {
  const a = parseISO(fromISO), b = parseISO(toISO)
  if (!a || !b) return null
  return Math.round((b - a) / 86400000)
}

export function addDaysISO(iso, n) {
  const d = parseISO(iso)
  if (!d) return null
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

/**
 * What one date says.
 *
 * ctx = { interestByDate: Map<iso, { site, logged, total }>, city }
 *
 * Returns `count` only when it is genuinely worth showing. Callers render
 * `showCount` or nothing — there is no rounding, no "100+", and no path that
 * produces a number the database cannot account for.
 */
export function interestForDate(iso, ctx = {}) {
  const row = ctx.interestByDate?.get(iso) ?? null
  const total = row?.total ?? 0

  if (total < INTEREST_FLOOR) {
    return {
      iso,
      count: total,
      showCount: false,
      level: INTEREST_LEVELS.NONE,
      headline: null,
      subtext: null,
    }
  }

  const level = total >= INTEREST_HIGH
    ? INTEREST_LEVELS.HIGH_INTEREST
    : INTEREST_LEVELS.INTEREST

  return {
    iso,
    count: total,
    showCount: true,
    level,
    headline: `${total} ${total === 1 ? 'enquiry' : 'enquiries'}`,
    subtext: total >= INTEREST_HIGH
      ? `${total} families have asked about this date. Vendors get committed early on days like this — worth telling us now.`
      : `${total} families have asked about this date already.`,
  }
}

/**
 * The dates worth putting in front of somebody, soonest first.
 *
 * Only dates that clear the floor appear, so this list is empty until real
 * interest exists — and the UI that consumes it renders nothing rather than
 * an empty shell.
 */
export function busiestDates(ctx = {}, { from, horizon = 150, limit = 8 } = {}) {
  const start = from ?? isoOf(new Date())
  const out = []
  for (let i = 1; i <= horizon; i++) {
    const iso = addDaysISO(start, i)
    if (!iso) continue
    const info = interestForDate(iso, ctx)
    if (info.showCount) out.push(info)
  }
  return out
    .sort((a, b) => (b.count - a.count) || a.iso.localeCompare(b.iso))
    .slice(0, limit)
    .sort((a, b) => a.iso.localeCompare(b.iso))
}

/**
 * Short notice, stated honestly — and never as a refusal.
 *
 * There is no booking limit anywhere in this feature: every date is accepted,
 * including tomorrow's. But a celebration needs decorators, cooks and
 * purohits who commit their week in advance, and pretending three days is the
 * same as three months would only move the disappointment from the enquiry
 * form to a phone call. So a close date says so, and still takes the booking.
 *
 * Two tiers, from what actually constrains sourcing:
 *   ≤ 1 day   nothing can be arranged from a standing start; it depends
 *             entirely on who happens to be free tomorrow.
 *   ≤ 7 days  a normal week's notice. Doable, but the pick is whoever has
 *             not already committed their weekend.
 * Past a week it says nothing, because past a week there is nothing to warn
 * about — and a warning on every date is a warning nobody reads.
 */
export const NOTICE_TIERS = [
  {
    key: 'VERY_SHORT',
    maxDays: 1,
    label: 'Very short notice',
    line: "At this notice our Masters are hard to source — send it anyway and a coordinator will call you straight back to see what's possible.",
  },
  {
    key: 'SHORT',
    maxDays: 7,
    label: 'Short notice',
    line: "Fewer of our Masters will be free at a week's notice, but we'll get you the best of whoever is.",
  },
]

export function noticeForDate(iso, todayISOStr) {
  const today = todayISOStr ?? isoOf(new Date())
  const days = daysBetween(today, iso)
  if (days == null || days < 0) return null
  const tier = NOTICE_TIERS.find(t => days <= t.maxDays)
  if (!tier) return null
  return {
    ...tier,
    days,
    when: days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`,
  }
}

/** Turn date_demand() rows into the Map interestForDate expects. */
export function indexInterestRows(rows = []) {
  const map = new Map()
  for (const r of rows) {
    map.set(r.d, {
      site: Number(r.site_count) || 0,
      logged: Number(r.logged_count) || 0,
      total: Number(r.total_count) || 0,
    })
  }
  return map
}
