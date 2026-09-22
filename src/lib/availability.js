/**
 * One answer to "am I free that day", and only one.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Before it, the question had no implementation in JavaScript at all.
 * The single definition of partner availability was a SQL predicate
 * inside `match_partners` -- copied verbatim across six migrations --
 * and the partner's month grid derived its colours from a different set
 * of rules written inline in the component. The customer surface had no
 * rules whatsoever: its date grids offered every day as tappable.
 *
 * So three surfaces could disagree about one date, and did.
 *
 * This module is the client-side half of that answer, and it is PURE:
 * rows in, verdict out. No Supabase import, no fetching, no clock of its
 * own beyond the IST day it is handed. That is what lets it be tested
 * exhaustively by scripts/check-availability-rules.mjs without a
 * database, and what lets the partner app and the customer app share it.
 *
 * ── It is not the enforcement ────────────────────────────────────────
 * The server decides. `match_partners` (134) chooses who is asked and
 * `accept_offer` (133) decides who is booked, and neither trusts
 * anything computed here. This module exists so the UI tells the same
 * story the database will -- not so the UI can be believed.
 *
 * ── What outranks what ───────────────────────────────────────────────
 * A `vendor_availability` row is a statement about ONE DATE and beats
 * everything. The standing week (`vendor_weekly_rules`) is the fallback
 * for a date with no row. That ordering is what makes "closed Sundays,
 * but open this Sunday" expressible, and it is duplicated -- on purpose,
 * because it is the rule -- in 131, 133 and 134.
 */
import { istTodayISO } from './istTime'

/** The five things a day can be. */
export const STATUS = {
  OPEN: 'OPEN',
  LIMITED: 'LIMITED',
  BOOKED: 'BOOKED',
  BLOCKED: 'BLOCKED',
  UNSET: 'UNSET',
}

/**
 * Where a verdict came from. The UI needs this: a day that is closed
 * because the partner blocked it reads differently from one closed by
 * their standing week, and only the first has a reason to show.
 */
export const SOURCE = { DAY: 'day', WEEKLY: 'weekly', JOBS: 'jobs', NONE: 'none' }

/* The partner's word for each blocking reason. `reason` is the database
   value -- migration 130's CHECK list -- and these are never shown to a
   customer, who is told "unavailable" and nothing else. */
const REASON_LABELS = {
  personal: 'Personal',
  holiday: 'Holiday',
  travel: 'Travelling',
  maintenance: 'Maintenance',
  committed: 'Already committed',
  unavailable: 'Unavailable',
  other: 'Other',
}

export function reasonLabel(reason, detail = null) {
  if (!reason) return null
  if (reason === 'other') return detail?.trim() || REASON_LABELS.other
  return REASON_LABELS[reason] ?? REASON_LABELS.unavailable
}

/**
 * The weekday of a calendar date: 0 = Sunday, matching getDay(),
 * config/vendor.js WEEKDAYS and vendor_weekly_rules.weekday (131).
 *
 * Anchored to UTC ON PURPOSE, and this is the one place in the codebase
 * where +05:30 is the WRONG answer. 'YYYY-MM-DD' names a calendar day,
 * not an instant -- 27 September 2026 is a Sunday everywhere, and asking
 * which weekday it is should not involve a timezone at all. Anchoring it
 * to IST and then reading getUTCDay() returns the weekday of the instant
 * 18:30 the PREVIOUS evening, so every standing day off lands one day
 * early. Anchoring to UTC and reading UTC fields keeps the arithmetic
 * inside the date string, where it belongs.
 *
 * lib/istTime is still what converts an INSTANT to an Indian date; this
 * takes a date that is already a date.
 */
export function weekdayOf(dateISO) {
  if (typeof dateISO !== 'string') return NaN
  const d = new Date(`${dateISO.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? NaN : d.getUTCDay()
}

/** Is this date already gone, in India? Past days are read-only. */
export function isPast(dateISO, todayISO = istTodayISO()) {
  if (!dateISO) return false
  return dateISO < todayISO
}

/** Is this the day it is, in India? */
export function isToday(dateISO, todayISO = istTodayISO()) {
  return Boolean(dateISO) && dateISO === todayISO
}

/**
 * The standing week's verdict for one date.
 *
 * `rules` is every row of vendor_weekly_rules for this partner. Only the
 * newest rule that has come into effect for that weekday applies; older
 * ones are history, not policy. No rule at all means open -- the same
 * default `weekday_is_open()` uses in 131, because a partner who has
 * never opened the screen must not find themselves closed.
 */
export function weeklyRuleFor(rules, dateISO) {
  if (!Array.isArray(rules) || rules.length === 0 || !dateISO) return null
  const weekday = weekdayOf(dateISO)
  return rules
    .filter(r => r.weekday === weekday
      && (r.effective_from ?? '') <= dateISO
      && (!r.effective_to || r.effective_to >= dateISO))
    .sort((a, b) => String(b.effective_from).localeCompare(String(a.effective_from)))[0] ?? null
}

/**
 * How many jobs this day can hold, and how many it already does.
 *
 * The cap is the day's own `slots_total` when the partner set one, their
 * standing `max_events_per_day` otherwise, and 1 if neither is set. An
 * unset cap must never read as unlimited -- that is the reading which
 * let LIMITED mean nothing for as long as it did.
 *
 * `booked` prefers a real count of confirmed jobs over the stored
 * `slots_booked`. The column is true as of 132, but the jobs the screen
 * is already holding are truer still, and a screen that renders two
 * bookings above the words "0 confirmed" is worse than either number.
 */
export function capacityFor({ row = null, jobsOnDay = null, maxPerDay = null } = {}) {
  const total = row?.slots_total ?? maxPerDay ?? 1
  const booked = Array.isArray(jobsOnDay) ? jobsOnDay.length : (row?.slots_booked ?? 0)
  return { total, booked, remaining: Math.max(0, total - booked) }
}

/**
 * The whole verdict for one date.
 *
 * Returns the shape every calendar surface needs, rather than a bare
 * string, because each of these was previously recomputed inline by
 * whoever needed it:
 *
 *   { status, source, total, booked, remaining, reason, past, today }
 */
export function dayStatus({
  dateISO,
  row = null,
  weeklyRules = null,
  jobsOnDay = null,
  maxPerDay = null,
  todayISO = istTodayISO(),
} = {}) {
  const rule = weeklyRuleFor(weeklyRules, dateISO)
  const { total, booked, remaining } = capacityFor({ row, jobsOnDay, maxPerDay })
  const base = {
    total, booked, remaining,
    reason: null,
    past: isPast(dateISO, todayISO),
    today: isToday(dateISO, todayISO),
  }

  /* 1 · An explicit block is the partner's clearest statement. It wins
         over everything, including confirmed jobs -- blocking a day with
         work on it does not cancel the work, and the calendar must not
         pretend the block did not happen. */
  if (row?.status === 'BLOCKED') {
    return { ...base, status: STATUS.BLOCKED, source: SOURCE.DAY,
             reason: reasonLabel(row.reason, row.reason_detail) }
  }

  /* 2 · The standing week, consulted only where the partner said nothing
         about this particular date. */
  if (!row && rule && rule.is_available === false) {
    return { ...base, status: STATUS.BLOCKED, source: SOURCE.WEEKLY,
             reason: 'Standing day off' }
  }

  /* 3 · Full is full, however it got there. A LIMITED day whose last
         slot went is BOOKED, not LIMITED with nothing left -- which is
         the transition requirement 6 asks for and the state
         match_partners has always tested for. */
  if (booked > 0 && remaining <= 0) {
    return { ...base, status: STATUS.BOOKED, source: SOURCE.JOBS }
  }

  /* 4 · Declared LIMITED and with room: say how much room. */
  if (row?.status === 'LIMITED') {
    return { ...base, status: STATUS.LIMITED, source: SOURCE.DAY }
  }

  /* 5 · Work on the books, and room for more. Shown as BOOKED because
         what the partner needs to see first is that the day is not
         empty. `remaining` carries the rest. */
  if (booked > 0) {
    return { ...base, status: STATUS.BOOKED, source: SOURCE.JOBS }
  }

  /* 6 · A deliberate OPEN is kept and shown back. This is the tap that
         used to vanish -- see the header of useVendorAccount.setDayStatus
         and scripts/check-availability-persistence.mjs. */
  if (row?.status === 'OPEN') {
    return { ...base, status: STATUS.OPEN, source: SOURCE.DAY }
  }

  /* 7 · Nothing said, nothing booked. Bookable, but the partner has not
         confirmed it -- which is a different thing from OPEN and is why
         UNSET exists rather than defaulting to it. */
  return { ...base, status: STATUS.UNSET, source: SOURCE.NONE }
}

/**
 * The windows the partner works that day.
 *
 * A day row's `hours` (130) beats the standing week's times, which beat
 * the partner's default day on `vendors`. Always an array, so a split
 * shift and a single window are the same shape to render.
 */
export function hoursFor({ row = null, weeklyRules = null, dateISO = null, vendor = null } = {}) {
  if (Array.isArray(row?.hours) && row.hours.length > 0) return row.hours

  const rule = weeklyRuleFor(weeklyRules, dateISO)
  if (rule?.start_time && rule?.end_time) {
    return [{ start: trimSeconds(rule.start_time), end: trimSeconds(rule.end_time) }]
  }
  return [{
    start: trimSeconds(vendor?.working_start) ?? '09:00',
    end: trimSeconds(vendor?.working_end) ?? '22:00',
  }]
}

/* Postgres hands back TIME as 'HH:MM:SS'; nobody wants to read the
   seconds on a working day. */
function trimSeconds(t) {
  return typeof t === 'string' ? t.slice(0, 5) : t ?? null
}

/** '14:00' -> '2:00 PM'. The partner's clock, not ISO's. */
export function clockLabel(hhmm) {
  if (typeof hhmm !== 'string') return ''
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return ''
  const suffix = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

/** '9:00 AM – 10:00 PM', or a split shift joined for one line of UI. */
export function hoursLabel(windows) {
  if (!Array.isArray(windows) || windows.length === 0) return ''
  return windows
    .map(w => `${clockLabel(w.start)} – ${clockLabel(w.end)}`)
    .join(', ')
}

/**
 * What a CUSTOMER is allowed to be told about a date.
 *
 * Deliberately narrow, and deliberately in this file rather than in a
 * customer component, so the boundary is visible in one place. It takes
 * a COUNT -- what partners_free_on (134) returns -- and never a row,
 * because there is no arrangement of a `vendor_availability` row that a
 * customer should be handed: `note`, `reason` and `reason_detail` are
 * partner-facing and a customer must never receive them.
 */
export const COVER = { GOOD: 'good', THIN: 'thin', NONE: 'none', UNKNOWN: 'unknown' }

export function coverFor(freeCount) {
  if (freeCount === null || freeCount === undefined) return COVER.UNKNOWN
  if (freeCount <= 0) return COVER.NONE
  if (freeCount <= 2) return COVER.THIN
  return COVER.GOOD
}

export function coverLabel(cover) {
  switch (cover) {
    case COVER.NONE: return 'No one free'
    case COVER.THIN: return 'Few free'
    case COVER.GOOD: return ''
    default: return ''
  }
}
