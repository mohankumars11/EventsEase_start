/**
 * Date demand — one source of truth for what a date "feels like".
 *
 * Pure functions, no React and no Supabase, so the calendar sheet, the
 * landing band and the wizard summary physically cannot tell a customer
 * three different stories about the same day.
 *
 * ── The rule this file exists to enforce ─────────────────────────────
 *
 * Every number shown to a customer is a real count of real rows. There is no
 * seeding, no floor, no "100+", no multiplier. Two guards make that hold
 * even if a caller forgets:
 *
 *   1. `showCount` is false below COUNT_FLOOR_RATIO. A pre-launch calendar
 *      announcing "0 of 12 taken" on all 365 days is both useless and an
 *      advertisement that nobody has booked. Below the floor a date shows
 *      *why* it's busy (muhurtham, festival, Saturday in wedding season)
 *      instead of *how* busy, which is true, useful, and reads as confident.
 *
 *   2. `spotsLeft` is capacity − consumed, exactly. It is never shrunk to
 *      manufacture pressure.
 *
 * Calendar pressure (weekends, seasons, festivals, admin-marked muhurthams)
 * carries no numbers at all, which is what lets it be honest on day one with
 * an empty database.
 */

import {
  UPCOMING_FESTIVALS,
  MUHURTHAM_DATES,
  SEASON_WINDOWS,
  FESTIVAL_HALO_DAYS,
} from '../data/peakCalendar'

// Below this share of capacity, no number is shown — only the calendar reason.
const COUNT_FLOOR_RATIO = 0.25
// At or above this share, the remaining spots are the headline.
const LAST_FEW_RATIO = 0.70

/**
 * The six tones.
 *
 * The first four are all a yes — a busy date is an invitation to hurry, never
 * a refusal, so none of them is red or struck through. AT_CAPACITY is the one
 * state that genuinely means "not this day", and it earns that by being a
 * real count against a real ceiling. It's slate rather than red: red reads as
 * an error the customer caused, and this is just a full day.
 */
// `chip` is for the light surfaces (the wizard, the date sheet); `chipDark`
// for the plum home screen, which is a different ground and needs its own
// contrast rather than a light chip dropped onto dark and left unreadable.
export const DEMAND_TONES = {
  OPEN: {
    key: 'OPEN',
    label: 'Open',
    rank: 0,
    dot: 'bg-emerald-500',
    cell: 'bg-white text-gray-700 border-gray-200 hover:border-plum-300',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    chipDark: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/25',
    accentDark: 'text-emerald-300',
  },
  BOOKING_UP: {
    key: 'BOOKING_UP',
    label: 'Booking up',
    rank: 1,
    dot: 'bg-amber-500',
    cell: 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-400',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    chipDark: 'bg-amber-400/10 text-amber-200 border-amber-400/25',
    accentDark: 'text-amber-300',
  },
  IN_DEMAND: {
    key: 'IN_DEMAND',
    label: 'In demand',
    rank: 2,
    dot: 'bg-saffron-500',
    cell: 'bg-saffron-50 text-saffron-900 border-saffron-300 hover:border-saffron-500',
    chip: 'bg-saffron-100 text-saffron-800 border-saffron-300',
    chipDark: 'bg-saffron-400/15 text-saffron-200 border-saffron-400/30',
    accentDark: 'text-saffron-300',
  },
  PEAK: {
    key: 'PEAK',
    label: 'Peak day',
    rank: 3,
    dot: 'bg-plum-600',
    cell: 'bg-plum-50 text-plum-900 border-plum-300 ring-1 ring-saffron-300 hover:border-plum-500',
    chip: 'bg-plum-100 text-plum-800 border-plum-300',
    chipDark: 'bg-saffron-400/20 text-saffron-100 border-saffron-400/40',
    accentDark: 'text-saffron-300',
  },
  LAST_FEW: {
    key: 'LAST_FEW',
    label: 'Last few',
    rank: 4,
    dot: 'bg-saffron-600',
    cell: 'bg-saffron-100 text-saffron-900 border-saffron-400 ring-1 ring-saffron-400 hover:border-saffron-600',
    chip: 'bg-saffron-200 text-saffron-900 border-saffron-400',
    chipDark: 'bg-saffron-400/25 text-saffron-100 border-saffron-400/50',
    accentDark: 'text-saffron-200',
  },
  AT_CAPACITY: {
    key: 'AT_CAPACITY',
    label: 'Full',
    rank: 5,
    dot: 'bg-slate-400',
    cell: 'bg-slate-100 text-slate-500 border-slate-300 hover:border-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-300',
    chipDark: 'bg-white/5 text-white/50 border-white/15',
    accentDark: 'text-white/50',
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
 * Is this MM-DD inside a season window? Windows may wrap the new year
 * (wedding season runs 11-15 → 02-15), in which case the test inverts.
 */
function inSeasonWindow(iso, win) {
  const md = iso.slice(5)
  return win.from <= win.to
    ? md >= win.from && md <= win.to
    : md >= win.from || md <= win.to
}

// ── the score ───────────────────────────────────────────────────────

/**
 * Calendar pressure for a date, as a score plus the single strongest reason.
 *
 * Returns the reason with the highest weight rather than concatenating all of
 * them: "Saturday, and wedding season, and two days before Diwali" is more
 * words and less persuasive than the one that actually matters.
 */
function calendarPressure(iso, ctx) {
  const date = parseISO(iso)
  if (!date) return { score: 0, reason: null, label: null }

  const reasons = []

  // Admin-marked peak dates (DB) and the static muhurtham list carry the
  // most weight — somebody with a panchang in hand asserted these.
  const peak = ctx.peaks?.get(iso)
  if (peak) {
    reasons.push({ weight: peak.weight ?? 2, label: peak.label, note: peak.note })
  }
  const muhurtham = MUHURTHAM_DATES.find(m => m.date === iso)
  if (muhurtham) {
    reasons.push({ weight: muhurtham.weight ?? 3, label: muhurtham.label, note: muhurtham.note })
  }

  // A festival pulls the days around it, not just its own date.
  for (const f of UPCOMING_FESTIVALS) {
    const gap = Math.abs(daysBetween(iso, f.date) ?? 999)
    if (gap <= FESTIVAL_HALO_DAYS) {
      reasons.push({
        weight: gap === 0 ? 3 : 2,
        label: gap === 0 ? f.name : `Near ${f.name}`,
        note: gap === 0
          ? `${f.name} itself — vendors across the city are committed well ahead.`
          : `${f.name} is ${gap} day${gap === 1 ? '' : 's'} away, so vendors are already stretched.`,
      })
    }
  }

  const day = date.getDay()
  if (day === 0 || day === 6) {
    reasons.push({
      weight: 2,
      label: day === 6 ? 'Saturday' : 'Sunday',
      note: 'Weekends go first — most families pick them, and so does everyone else planning.',
    })
  } else if (day === 5) {
    reasons.push({ weight: 1, label: 'Friday', note: 'Friday evenings fill up alongside the weekend.' })
  }

  for (const win of SEASON_WINDOWS) {
    if (inSeasonWindow(iso, win)) {
      reasons.push({ weight: win.weight, label: win.label, note: win.note })
    }
  }

  // Real supply pressure: approved partners who marked themselves busy or
  // reduced that day. Only meaningful once there's a bench to measure.
  const row = ctx.demandByDate?.get(iso)
  if (row && row.vendorsTotal >= 4) {
    const ratio = row.vendorsConstrained / row.vendorsTotal
    if (ratio >= 0.5) {
      reasons.push({
        weight: 3,
        label: 'Partners are booked',
        note: 'More than half our partner vendors are already committed that day.',
      })
    } else if (ratio >= 0.25) {
      reasons.push({
        weight: 1,
        label: 'Partners filling up',
        note: 'Several of our partner vendors are already committed that day.',
      })
    }
  }

  const score = reasons.reduce((sum, r) => sum + r.weight, 0)
  // Strongest positive reason wins the headline. A negative-weight window
  // (Ashada) only gets to speak when nothing else is pushing.
  const positive = reasons.filter(r => r.weight > 0).sort((a, b) => b.weight - a.weight)
  const best = positive[0] ?? reasons.sort((a, b) => a.weight - b.weight)[0] ?? null

  return { score, reason: best?.note ?? null, label: best?.label ?? null }
}

/**
 * Everything the UI needs about one date.
 *
 * ctx = {
 *   today:        yyyy-mm-dd
 *   city:         'Bengaluru'
 *   demandByDate: Map<iso, { consumed, capacity, vendorsTotal, vendorsConstrained }>
 *   peaks:        Map<iso, { label, note, weight }>
 *   maxLeadDays:  number | null
 * }
 */
export function demandForDate(iso, ctx = {}) {
  const row = ctx.demandByDate?.get(iso) ?? null
  const capacity = row?.capacity ?? null
  const consumed = row?.consumed ?? 0
  const spotsLeft = capacity == null ? null : Math.max(0, capacity - consumed)
  const util = capacity ? consumed / capacity : 0

  const pressure = calendarPressure(iso, ctx)
  const base = {
    iso,
    capacity,
    consumed,
    spotsLeft,
    reasonLabel: pressure.label,
    bookByISO: bookByDate(iso, ctx.maxLeadDays),
  }

  // ── Capacity beats calendar. A hard count always outranks a soft signal:
  // it would be absurd to call a date "in demand" while nine of twelve
  // spots sit open, or "open" when there is genuinely one left.
  if (capacity && consumed >= capacity) {
    return {
      ...base,
      tone: DEMAND_TONES.AT_CAPACITY,
      showCount: true,
      headline: 'Full',
      subtext: "We've taken all the celebrations we can properly serve that day.",
    }
  }

  if (capacity && util >= LAST_FEW_RATIO) {
    return {
      ...base,
      tone: DEMAND_TONES.LAST_FEW,
      showCount: true,
      headline: `Only ${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`,
      subtext: pressure.reason ?? 'This date is nearly full.',
    }
  }

  if (capacity && util >= COUNT_FLOOR_RATIO) {
    return {
      ...base,
      tone: DEMAND_TONES.BOOKING_UP,
      showCount: true,
      headline: `${consumed} of ${capacity} spots taken`,
      subtext: pressure.reason ?? 'Filling up — worth locking early.',
    }
  }

  // ── Below the count floor: reasons only, never numbers.
  const { score } = pressure
  if (score >= 5) {
    return {
      ...base,
      tone: DEMAND_TONES.PEAK,
      showCount: false,
      headline: pressure.label ?? 'Peak day',
      subtext: pressure.reason
        ? `${pressure.reason} Send your date now and we'll hold a coordinator for you.`
        : "A big day across the city. Send your date now and we'll hold a coordinator for you.",
    }
  }
  if (score >= 3) {
    return {
      ...base,
      tone: DEMAND_TONES.IN_DEMAND,
      showCount: false,
      headline: pressure.label ?? 'In demand',
      subtext: pressure.reason ?? `Vendors across ${ctx.city ?? 'the city'} book out early for dates like this.`,
    }
  }
  if (score >= 2) {
    return {
      ...base,
      tone: DEMAND_TONES.BOOKING_UP,
      showCount: false,
      headline: pressure.label ?? 'Booking up',
      subtext: pressure.reason ?? 'Worth locking in early.',
    }
  }

  return {
    ...base,
    tone: DEMAND_TONES.OPEN,
    showCount: false,
    headline: 'Open',
    subtext: pressure.reason ?? 'Good date. Plenty of room to plan properly.',
  }
}

/**
 * Dates near `iso` that are genuinely quiet — the "try these instead" chips.
 *
 * Same weekday first: somebody who picked a Saturday wants another Saturday,
 * not the Tuesday in between. Falls back to nearest calm date either side.
 */
export function nearbyCalmDates(iso, ctx = {}, n = 3, radius = 28) {
  const anchor = parseISO(iso)
  if (!anchor) return []
  const wanted = anchor.getDay()
  const today = ctx.today ?? isoOf(new Date())

  const found = []
  for (let offset = 1; offset <= radius && found.length < n * 4; offset++) {
    for (const dir of [1, -1]) {
      const candidate = addDaysISO(iso, offset * dir)
      if (!candidate || candidate < today) continue
      const info = demandForDate(candidate, ctx)
      if (info.tone.rank <= DEMAND_TONES.BOOKING_UP.rank) {
        found.push({ iso: candidate, offset, sameWeekday: parseISO(candidate).getDay() === wanted, info })
      }
    }
  }

  return found
    .sort((a, b) => {
      if (a.sameWeekday !== b.sameWeekday) return a.sameWeekday ? -1 : 1
      if (a.info.tone.rank !== b.info.tone.rank) return a.info.tone.rank - b.info.tone.rank
      return a.offset - b.offset
    })
    .slice(0, n)
}

/**
 * The last day it's still comfortable to enquire, given the longest vendor
 * lead time in play. Real arithmetic on a real number — the strongest kind
 * of urgency there is, because it's also useful.
 */
export function bookByDate(iso, maxLeadDays) {
  if (!maxLeadDays || !iso) return null
  // A week of sourcing and negotiating on top of the vendor's own notice.
  return addDaysISO(iso, -(maxLeadDays + 7))
}

export function leadTimePressure(iso, maxLeadDays, todayISOStr) {
  const today = todayISOStr ?? isoOf(new Date())
  const days = daysBetween(today, iso)
  if (days == null) return null
  const bookBy = bookByDate(iso, maxLeadDays)
  const slack = bookBy ? daysBetween(today, bookBy) : null
  return {
    days,
    bookByISO: bookBy,
    // Past the comfortable point but still doable — say so plainly rather
    // than refusing, because a coordinator can often still make it work.
    tight: slack != null && slack <= 0,
  }
}

/** Turn RPC rows into the Map demandForDate expects. */
export function indexDemandRows(rows = []) {
  const map = new Map()
  for (const r of rows) {
    map.set(r.d, {
      consumed: Number(r.consumed) || 0,
      capacity: Number(r.capacity) || null,
      vendorsTotal: Number(r.vendors_total) || 0,
      vendorsConstrained: Number(r.vendors_constrained) || 0,
    })
  }
  return map
}

/** Turn peak_dates rows into the Map demandForDate expects. */
export function indexPeakRows(rows = []) {
  const map = new Map()
  for (const r of rows) {
    map.set(r.peak_date, { label: r.label, note: r.note, weight: r.weight ?? 2, kind: r.kind })
  }
  return map
}
