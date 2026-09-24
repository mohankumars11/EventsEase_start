/**
 * What a calendar change actually costs, said before it happens.
 *
 * Pure functions, no React and no Supabase, for the same reason
 * lib/availability.js is: what blocking a date means must have one
 * answer, and a rule written inside a sheet is a rule only that sheet
 * obeys. scripts/check-calendar-alerts.mjs is what keeps it honest.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AN ALERT THAT FIRES ON EVERY BLOCK IS NOT AN ALERT
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is the whole design and it is worth stating before any of the
 * code. A partner blocking two Tuesdays in November is doing ordinary
 * admin. If that raises a red banner, then so does every other block,
 * and within a week the partner is dismissing red banners without
 * reading them — including the one that says they have just closed
 * their entire month.
 *
 * So red is rationed. It is reserved for three things, and nothing else
 * can produce it:
 *
 *   1. confirmed work on a date being blocked
 *   2. no open days left at all in the next thirty
 *   3. three or more dates that customers are actively asking about
 *
 * Everything else is a quiet line of grey text. That is not timidity;
 * it is what makes the red one mean something when it appears.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERY NUMBER HERE CAME FROM SOMEWHERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * "You will lose bookings" is a guess. "Four families asked about 12
 * October" is a row in date_enquiry_log. Only the second kind is
 * written here — no invented percentages, no "partners like you", no
 * projected earnings. If the data to support a sentence is absent, the
 * sentence is absent, and the caller renders nothing.
 */
import { STATUS, dayStatus, weekdayOf } from './availability'
import { INTEREST_FLOOR } from './demand'

/** Quiet, worth reading, and stop-and-think. */
export const LEVEL = { INFO: 'info', WARN: 'warn', RED: 'red' }

const RANK = { [LEVEL.INFO]: 0, [LEVEL.WARN]: 1, [LEVEL.RED]: 2 }

/** Only these three can reach red. Asserted by the guard. */
export const RED_SIGNALS = ['clash', 'blackout', 'demand']

/** How far ahead "am I about to go dark" is measured. */
export const BLACKOUT_WINDOW_DAYS = 30

/** Dates asked about, at or above which the demand signal turns red. */
export const DEMAND_RED_DATES = 3

const iso = d => d.toISOString().slice(0, 10)
const parse = s => new Date(`${s}T00:00:00Z`)

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

const pretty = s => parse(s).toLocaleDateString('en-IN',
  { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Inclusive of both ends, which is what a person means by "20th to 25th". */
export function expandRange(fromISO, toISO, cap = 90) {
  const a = parse(fromISO), b = parse(toISO)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) {
    return { days: [], truncated: false }
  }
  const out = []
  for (const d = new Date(a); d <= b; d.setUTCDate(d.getUTCDate() + 1)) {
    if (out.length >= cap) return { days: out, truncated: true }
    out.push(iso(d))
  }
  return { days: out, truncated: false }
}

/**
 * The named spans a partner reaches for.
 *
 * Each returns [label, fromISO, toISO], inclusive of both ends. Written
 * here rather than in the sheet because "this weekend" is date
 * arithmetic, and date arithmetic that nothing tests is date arithmetic
 * that is wrong on the last Saturday of a month.
 *
 * "This weekend" means the COMING Saturday and Sunday. On a Sunday that
 * is today and yesterday, which is useless, so a Sunday rolls forward to
 * the next one rather than offering a range that is half in the past.
 */
export function quickRanges(todayISO) {
  const add = (i, n) => {
    const x = parse(i)
    x.setUTCDate(x.getUTCDate() + n)
    return iso(x)
  }

  const t = parse(todayISO)
  const dow = t.getUTCDay()                  // 0 Sunday … 6 Saturday
  const sat = add(todayISO, (6 - dow + 7) % 7)

  const endOfMonth = iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)))

  return [
    ['This weekend', sat, add(sat, 1)],
    ['Next 7 days', todayISO, add(todayISO, 6)],
    ['Rest of this month', todayISO, endOfMonth],
    ['Next 30 days', todayISO, add(todayISO, 29)],
    ['Next 90 days', todayISO, add(todayISO, 89)],
  ]
}

/** The next N dates from today, inclusive. */
function windowFrom(todayISO, n) {
  const out = []
  const d = parse(todayISO)
  for (let i = 0; i < n; i++) {
    out.push(iso(d))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

/**
 * Would this change leave the partner with nothing open?
 *
 * Counted against the calendar AS IT WOULD BE, not as it is — the
 * question is about the state being saved, so simulating it is the only
 * way to answer it. A day with confirmed work still counts as open:
 * they are working, which is the opposite of dark.
 */
function openDaysAfter({ dates, status, availability, byDay, weeklyRules, maxPerDay, todayISO }) {
  const changing = new Set(dates)
  let open = 0
  for (const day of windowFrom(todayISO, BLACKOUT_WINDOW_DAYS)) {
    const row = changing.has(day)
      ? (status ? { slot_date: day, status } : null)
      : (availability?.[day] ?? null)
    const verdict = dayStatus({
      dateISO: day, row, weeklyRules,
      jobsOnDay: byDay?.[day] ?? [], maxPerDay, todayISO,
    })
    if (verdict.status !== STATUS.BLOCKED) open++
  }
  return open
}

/**
 * Everything worth saying about a pending change.
 *
 * `status` is 'OPEN' | 'LIMITED' | 'BLOCKED', or null for a clear (which
 * deletes the rows and hands the days back to the standing week).
 */
/** "12 October", for one date named in a sentence. */
const prettyDay = iso => new Date(`${iso}T00:00:00Z`)
  .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' })

/**
 * " from 12 to 31 October" for a run of dates, or "" when they are
 * scattered. Scattered dates get no span rather than a wrong one: "from
 * 3 to 28 November" would be a lie about two Tuesdays.
 */
function dateSpan(dates) {
  if (dates.length < 2) return ''
  const sorted = [...dates].sort()
  const first = parse(sorted[0])
  const last = parse(sorted[sorted.length - 1])
  const span = Math.round((last - first) / 86400000) + 1
  if (span !== dates.length) return ''
  return `, ${prettyDay(sorted[0])} to ${prettyDay(sorted[sorted.length - 1])}`
}

export function assessChange({
  dates = [],
  status,
  availability = {},
  jobs = [],
  interestByDate = null,
  weeklyRules = [],
  maxPerDay = 1,
  todayISO,
}) {
  const signals = []
  if (!dates.length) return { level: LEVEL.INFO, signals, needsConfirm: false, headline: null }

  const byDay = {}
  for (const j of jobs) {
    if (!j?.event_date) continue
    if (['cancelled', 'expired'].includes(j.status)) continue
    ;(byDay[j.event_date] ??= []).push(j)
  }

  /* Dates customers have actually asked about. Reuses the floor the
     customer surface already uses, so a date that says "people are
     asking" to a customer says the same thing to the partner. */
  const wanted = interestByDate
    ? dates.filter(d => (interestByDate.get?.(d)?.total ?? 0) >= INTEREST_FLOOR)
    : []

  const blocking = status === 'BLOCKED'

  if (blocking) {
    const clashDates = dates.filter(d => (byDay[d]?.length ?? 0) > 0).sort()
    if (clashDates.length) {
      signals.push({
        id: 'clash',
        level: LEVEL.RED,
        says: `${clashDates.length === 1 ? 'One date here has' : `${clashDates.length} dates here have`} confirmed work. Blocking stops new offers and does not cancel anything already agreed.`,
        dates: clashDates,
      })
    }

    /* ── What blocking DOES, said every single time ────────────────
       This is not an alert and must not be read as one. The three red
       signals stay rare on purpose -- the header of this file argues
       that an alert which fires on every block trains people to press
       through the one that mattered -- but "you will get no offers on
       these days" is not a warning about a risk. It is a plain
       description of what the button does, and a partner is entitled to
       read it before pressing, every time, in the same quiet grey.

       It was missing entirely: blocking two Tuesdays in November
       produced no signals at all, so the sheet said nothing about the
       one consequence the partner actually cares about. */
    signals.push({
      id: 'blocked',
      level: LEVEL.INFO,
      says: dates.length === 1
        ? `No offers will reach you on ${prettyDay(dates[0])}. Work already agreed for that day is not cancelled.`
        : `No offers will reach you on ${dates.length} days${dateSpan(dates)}. Work already agreed on them is not cancelled.`,
      dates: [...dates],
    })

    const open = openDaysAfter({ dates, status, availability, byDay, weeklyRules, maxPerDay, todayISO })
    if (open === 0) {
      signals.push({
        id: 'blackout',
        level: LEVEL.RED,
        says: `This closes every day of the next ${BLACKOUT_WINDOW_DAYS}. You will not be offered a single job until you open a date.`,
      })
    } else if (open <= 3) {
      signals.push({
        id: 'blackout',
        level: LEVEL.WARN,
        says: `That leaves ${plural(open, 'open day', 'open days')} in the next ${BLACKOUT_WINDOW_DAYS}.`,
      })
    }

    if (wanted.length) {
      const top = wanted
        .map(d => ({ d, n: interestByDate.get(d).total }))
        .sort((a, b) => b.n - a.n)
      const red = wanted.length >= DEMAND_RED_DATES
      signals.push({
        id: 'demand',
        level: red ? LEVEL.RED : LEVEL.WARN,
        says: wanted.length === 1
          ? `${plural(top[0].n, 'family has', 'families have')} asked about ${pretty(top[0].d)}. Block it and none of them reach you.`
          : `${wanted.length} of these dates have families asking — ${top.slice(0, 3).map(t => pretty(t.d)).join(', ')}. Those enquiries will not reach you.`,
        dates: wanted,
      })
    }

    /* Informational only, and deliberately so. Weekends being busier is
       true of this trade but it is a generality, not a measurement of
       this partner, so it never escalates anything. */
    const weekendDays = dates.filter(d => [0, 6].includes(weekdayOf(d)))
    if (weekendDays.length >= 2) {
      signals.push({
        id: 'weekend',
        level: LEVEL.INFO,
        says: `${weekendDays.length} of these are weekend days, which is when most celebration work falls.`,
      })
    }

    if (dates.length > BLACKOUT_WINDOW_DAYS) {
      signals.push({
        id: 'long_range',
        level: LEVEL.INFO,
        says: `That is ${plural(dates.length, 'day', 'days')} in one go. You can reopen any of them at any time.`,
      })
    }
  } else if (status === null || status === undefined) {
    signals.push({
      id: 'standing',
      level: LEVEL.INFO,
      says: `${plural(dates.length, 'day goes', 'days go')} back to your usual week. Whatever your weekly pattern says will apply again.`,
    })
  } else {
    /* Opening up. There is nothing to warn about, but there IS something
       worth saying: the partner is doing the thing that earns them work,
       and a screen that only ever speaks when it disapproves teaches
       people to stop reading it. */
    const wasBlocked = dates.filter(d => availability?.[d]?.status === 'BLOCKED').length
    signals.push({
      id: 'reopen',
      level: LEVEL.INFO,
      says: wasBlocked
        ? `${plural(wasBlocked, 'blocked day reopens', 'blocked days reopen')}. Offers can reach you on ${wasBlocked === 1 ? 'it' : 'them'} again.`
        : `${plural(dates.length, 'day is', 'days are')} marked open, ahead of your usual week.`,
    })
    if (wanted.length) {
      signals.push({
        id: 'demand',
        level: LEVEL.INFO,
        says: `${wanted.length} of these ${wanted.length === 1 ? 'is a date' : 'are dates'} families are already asking about.`,
      })
    }
  }

  const level = signals.reduce(
    (worst, s) => (RANK[s.level] > RANK[worst] ? s.level : worst), LEVEL.INFO)

  /* The two-press arming is tied to red and to nothing else. If this
     ever reads `level !== INFO`, the confirm becomes routine and stops
     being a confirmation. */
  return {
    level,
    signals,
    needsConfirm: level === LEVEL.RED,
    headline: signals.find(s => s.level === level)?.says ?? null,
  }
}

/**
 * How far ahead does this calendar actually say anything?
 *
 * Used by the nudge. Deliberately not "have they opened the tab" — a
 * partner who visits the calendar daily and never states a date is
 * exactly the partner the nudge is for.
 *
 * A standing weekly rule counts: somebody who set "closed Sundays" once
 * has told us about every Sunday there will ever be, and nagging them
 * to repeat it monthly would be nagging them for our benefit.
 */
export function coverageOf({ availability = {}, weeklyRules = [], todayISO, horizonDays = 180 }) {
  const stated = Object.keys(availability ?? {}).filter(d => d >= todayISO).sort()
  const throughISO = stated.length ? stated[stated.length - 1] : null
  const days = throughISO
    ? Math.round((parse(throughISO) - parse(todayISO)) / 86400000)
    : 0

  const hasStandingWeek = (weeklyRules?.length ?? 0) > 0
  const fraction = Math.min(1, days / horizonDays)

  let level = LEVEL.INFO
  let says = null

  if (!stated.length && !hasStandingWeek) {
    level = LEVEL.WARN
    says = 'Your calendar says nothing about any date. Customers are matched by the day they are celebrating, so the more of the year you state, the more you are offered.'
  } else if (days < 14 && !hasStandingWeek) {
    level = LEVEL.WARN
    says = throughISO
      ? `Your calendar stops at ${pretty(throughISO)}. Most celebrations are booked weeks ahead of the day.`
      : 'Your calendar stops at today.'
  } else if (days < 60) {
    level = LEVEL.INFO
    says = throughISO
      ? `Your calendar is set through ${pretty(throughISO)} — ${plural(days, 'day', 'days')} ahead. Weddings are usually booked further out than that.`
      : null
  }

  /* ---- Month by month, for the next six ---------------------------
     A single "38 days ahead" number tells a partner they are behind and
     not what to do about it. Six labelled months, each with the count of
     days actually stated in it, turns the same fact into a list of
     blanks to fill -- and makes "December is empty" a thing somebody can
     see rather than work out.

     Six because CALENDAR_HORIZON_MONTHS is six, and because weddings are
     booked that far out: a calendar that stops in three weeks is not
     late for next week, it is invisible for the season. */
  const months = []
  const cursor = parse(todayISO)
  cursor.setUTCDate(1)

  for (let i = 0; i < 6; i++) {
    const y = cursor.getUTCFullYear()
    const m = cursor.getUTCMonth()
    const first = new Date(Date.UTC(y, m, 1))
    const last = new Date(Date.UTC(y, m + 1, 0))
    const total = last.getUTCDate()

    /* Only days from today onwards count. Half of this month is behind
       us and stating it would be no use to anybody. */
    let open = 0, stated_ = 0
    for (let d = 1; d <= total; d++) {
      const iso_ = iso(new Date(Date.UTC(y, m, d)))
      if (iso_ < todayISO) continue
      open++
      if (availability?.[iso_]) stated_++
    }

    months.push({
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
      label: first.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }),
      year: y,
      openDays: open,
      statedDays: stated_,
      /* ── A standing week is not coverage ───────────────────────────
         This used to return 1 for every month when a standing week
         existed. On screen that produced a card reading "your calendar
         stops at 30 September" above six completely full bars -- the
         headline and the picture contradicting each other on one card,
         which is worse than either alone.

         And it contradicted the argument the card is built on: "never
         on Sundays" says nothing about whether you are free on 12
         December. A rule is a default for days nobody has spoken about,
         not a statement about them.

         So `covered` is stated days over open days and nothing else.
         `standing` rides alongside, so the bar can show that a month is
         governed by a rule without claiming it is answered. */
      covered: open === 0 ? 1 : stated_ / open,
      standing: hasStandingWeek,
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  /* The first month from now that nothing has been said about. This is
     what the nudge points at: one place to go, not six. */
  const firstBlank = months.find(mo => mo.openDays > 0 && mo.covered === 0) ?? null

  return {
    throughISO, days, fraction, hasStandingWeek, level, says,
    months, firstBlank,
    stale: level === LEVEL.WARN,
  }
}
