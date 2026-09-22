/**
 * One clock, and it is India's.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG CLASS THIS CLOSES
 * ══════════════════════════════════════════════════════════════════════
 *
 * `booking_lines.event_date` is a DATE. It means a calendar day in
 * India -- "the wedding is on the 1st" -- and nothing else. But the app
 * kept reading it as
 *
 *     new Date(`${event_date}T00:00:00`)
 *
 * which is midnight in WHATEVER TIMEZONE THE DEVICE IS SET TO. On a
 * phone in IST that is right by accident. On a phone left on UTC, on a
 * partner travelling, on an emulator, or on a device whose timezone was
 * never set, it is 5.5 hours out -- enough to move a day boundary, so
 * "is it the event day yet" answers wrongly for a five-and-a-half hour
 * window around every midnight.
 *
 * Anchoring to `+05:30` explicitly makes the answer independent of the
 * device. `Date.parse('2026-10-01T00:00:00+05:30')` is the same instant
 * everywhere, which is the entire point.
 *
 * ── Why not a timezone library ───────────────────────────────────────
 * India has one offset, +05:30, with no daylight saving and no plans for
 * any. A fixed offset is not a simplification here, it is the rule. The
 * moment the app serves a second country this file gets an Intl-based
 * implementation and every caller keeps working.
 */

/** India Standard Time, in minutes east of UTC. No DST, ever. */
export const IST_OFFSET_MIN = 330

/** The literal suffix that pins an ISO string to IST. */
const IST_SUFFIX = '+05:30'

/**
 * Midnight IST on a YYYY-MM-DD, as epoch milliseconds.
 * Returns NaN for a missing or malformed date, so callers can test it.
 */
export function istDayStart(dateISO) {
  if (!dateISO || typeof dateISO !== 'string') return NaN
  return Date.parse(`${dateISO.slice(0, 10)}T00:00:00${IST_SUFFIX}`)
}

/**
 * Today's calendar date IN INDIA, as YYYY-MM-DD, whatever the device
 * thinks. Shift the instant by the offset and read the UTC fields --
 * the device's own timezone never enters into it.
 */
export function istTodayISO(now = Date.now()) {
  const shifted = new Date(now + IST_OFFSET_MIN * 60_000)
  return shifted.toISOString().slice(0, 10)
}

/** The calendar date in India for any instant. */
export function istDateISO(when) {
  const ms = when instanceof Date ? when.getTime() : Number(when)
  return Number.isFinite(ms) ? istTodayISO(ms) : null
}

/** Whole days from today (IST) to an event date. Negative = past. */
export function istDaysUntil(dateISO, now = Date.now()) {
  const start = istDayStart(dateISO)
  if (!Number.isFinite(start)) return NaN
  const todayStart = istDayStart(istTodayISO(now))
  return Math.round((start - todayStart) / 86_400_000)
}

/* ══════════════════════════════════════════════════════════════════════
   THE TRAVEL WINDOW
   ══════════════════════════════════════════════════════════════════════

   When may a partner tap "Start trip"?

   The rule was written in MyJobs and lived only there: from midnight the
   day before, to 36 hours after the event day begins. A caterer loading
   a van at 5am for a 7am start is inside it; a job next month is not.
   That reasoning is sound and is kept exactly.

   What was wrong is that it was a local variable in one component.
   JobDetails renders the same LiveTracking panel and never had the
   check, so a partner opening a job from the jobs list saw a Start trip
   button on a job weeks away -- which opens a real tracking session and
   starts following a phone for no reason, the one thing the feature
   promises never to do.

   One function, both callers, IST-anchored. */

/** How long before midnight on the event day the trip may start. */
const LEAD_MS  = 24 * 3600 * 1000
/** How long after midnight on the event day it stays open. */
const TRAIL_MS = 36 * 3600 * 1000

/**
 * @returns {{ open: boolean, start: number, end: number, opensIn: number }}
 *   `open`    may the trip be started right now
 *   `opensIn` ms until it opens; <= 0 once it has
 */
export function travelWindow(eventDateISO, now = Date.now()) {
  const day = istDayStart(eventDateISO)
  if (!Number.isFinite(day)) {
    return { open: false, start: NaN, end: NaN, opensIn: NaN }
  }
  const start = day - LEAD_MS
  const end   = day + TRAIL_MS
  return { open: now >= start && now <= end, start, end, opensIn: start - now }
}

/**
 * The sentence shown in place of the button when it is too early.
 * Plain about WHEN, because "not yet" on its own reads as a fault.
 */
export function travelOpensWording(eventDateISO, now = Date.now()) {
  const days = istDaysUntil(eventDateISO, now)
  if (!Number.isFinite(days)) return 'This job has no date yet.'
  if (days > 1)  return `Starts the day before — that is ${days - 1} day${days - 1 === 1 ? '' : 's'} from now.`
  if (days === 1) return 'You can start this trip from midnight tonight.'
  return 'This job is past.'
}

/** Is this ISO date today, in India? */
export function isIstToday(dateISO, now = Date.now()) {
  return !!dateISO && dateISO.slice(0, 10) === istTodayISO(now)
}
