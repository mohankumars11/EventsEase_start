/**
 * Can this partner actually get from one event to the next?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE QUESTION A CALENDAR USUALLY DOES NOT ASK
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two bookings that do not overlap look fine on any month grid. A
 * caterer finishing in Whitefield at 4pm and starting in Mysuru at 5pm
 * has a clear calendar and an impossible day, and they find out on the
 * morning of the second one.
 *
 * So an event is not just its hours. It is:
 *
 *   travel in  ->  setup  ->  the event  ->  teardown  ->  travel out
 *
 * and two jobs conflict when those spans touch, not when the event
 * hours do.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ESTIMATES ARE LABELLED AS ESTIMATES
 * ══════════════════════════════════════════════════════════════════════
 *
 * `distance_m` is real — dispatch measures it from the partner's own
 * point. Everything derived from it here is not: road speed in
 * Bengaluru is a guess, and setup time varies by trade and by job.
 *
 * Every result therefore carries `confidence`, and the UI says
 * "estimated". A warning stated as fact, that turns out wrong twice,
 * is a warning nobody reads the third time — which is the time it
 * mattered.
 */

/** Minutes per km, city driving. Deliberately pessimistic. */
const MIN_PER_KM = 2.5

/** The floor: even next door costs loading and parking. */
const MIN_TRAVEL_MIN = 20

/**
 * Setup and teardown, per trade, in minutes.
 *
 * Read off what these trades actually do rather than one number for
 * everybody: a decorator builds a mandap for three hours and a
 * photographer arrives with a bag. A trade that is not listed gets the
 * default, which is deliberately modest — over-warning is its own
 * failure.
 */
const SETUP = {
  'Decoration & Floral':  { setup: 180, teardown: 90 },
  'Tent & Furniture':     { setup: 240, teardown: 120 },
  'Catering & Food':      { setup: 120, teardown: 90 },
  'Sound & AV':           { setup: 90,  teardown: 60 },
  'Event Lighting':       { setup: 120, teardown: 60 },
  'Power & Cooling':      { setup: 90,  teardown: 60 },
  'Photography':          { setup: 30,  teardown: 15 },
  'Videography':          { setup: 45,  teardown: 20 },
  'Mehendi Artist':       { setup: 20,  teardown: 15 },
  'Bridal Makeup & Hair': { setup: 30,  teardown: 15 },
}
const DEFAULT_SETUP = { setup: 45, teardown: 30 }

export function shapeFor(trade) {
  return SETUP[trade] ?? DEFAULT_SETUP
}

/** Straight-line metres to a road-time estimate in minutes. */
export function travelMinutes(distanceM) {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return MIN_TRAVEL_MIN
  /* Straight line under-reads road distance; 1.3 is the usual fudge for
     a city laid out like Bengaluru. */
  const km = (distanceM / 1000) * 1.3
  return Math.max(MIN_TRAVEL_MIN, Math.round(km * MIN_PER_KM))
}

/**
 * The full span a job occupies, in minutes from midnight.
 *
 * Jobs carry `time_note` ("10:00 AM – 10:00 PM") rather than start and
 * end columns, so the hours are parsed from it where possible. When
 * they cannot be, the job is treated as a whole-day commitment, which
 * is the safe direction to be wrong in: it warns rather than reassures.
 */
export function spanOf(job) {
  const shape = shapeFor(job.trade)
  const travel = travelMinutes(job.distance_m)
  const parsed = parseTimeNote(job.time_note)

  const start = parsed?.start ?? 9 * 60
  const end = parsed?.end ?? 22 * 60

  return {
    id: job.line_id ?? job.offer_id,
    label: job.occasion_name ?? job.service_name ?? 'Booking',
    trade: job.trade,
    where: job.area_label ?? job.city ?? null,
    exact: !!parsed,
    eventStart: start,
    eventEnd: end,
    /* What the day actually costs them, door to door. */
    blockStart: start - shape.setup - travel,
    blockEnd: end + shape.teardown + travel,
    travel,
    setup: shape.setup,
    teardown: shape.teardown,
  }
}

const HH = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi

/** "10:00 AM – 10:00 PM" -> minutes from midnight. Null when unreadable. */
export function parseTimeNote(note) {
  if (!note || typeof note !== 'string') return null
  const hits = [...note.matchAll(HH)]
  if (hits.length < 2) return null

  const toMin = m => {
    let h = Number(m[1])
    const min = Number(m[2] ?? 0)
    const ap = (m[3] ?? '').toLowerCase()
    if (ap === 'pm' && h !== 12) h += 12
    if (ap === 'am' && h === 12) h = 0
    if (h > 23 || min > 59) return null
    return h * 60 + min
  }

  const a = toMin(hits[0])
  const b = toMin(hits[1])
  if (a === null || b === null) return null
  /* An end before a start means it runs past midnight. */
  return { start: a, end: b > a ? b : b + 24 * 60 }
}

export const SEVERITY = {
  CLASH: 'CLASH',       // the events themselves overlap
  TIGHT: 'TIGHT',       // they fit, but the gap is smaller than the travel
  OK: 'OK',
}

/**
 * Every conflict among one day's jobs.
 *
 * Compares each pair once. A day has at most a handful of jobs, so the
 * quadratic is irrelevant and the clarity is worth more than a sweep
 * line nobody will want to read.
 *
 * @returns [{ a, b, severity, shortfallMin, message }]
 */
export function conflictsFor(jobs = []) {
  const spans = jobs.map(spanOf).sort((x, y) => x.eventStart - y.eventStart)
  const out = []

  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i]
      const b = spans[j]

      /* The events themselves collide. Nothing to estimate — they
         cannot both be done, whatever the roads are like. */
      if (a.eventEnd > b.eventStart) {
        out.push({
          a, b, severity: SEVERITY.CLASH, shortfallMin: a.eventEnd - b.eventStart,
          message: `${a.label} runs until ${clock(a.eventEnd)}, and ${b.label} starts at ${clock(b.eventStart)}.`,
        })
        continue
      }

      /* They do not overlap — but does the gap cover teardown, the
         drive and setup? This is the one a month grid never shows. */
      const gap = b.eventStart - a.eventEnd
      const needed = a.teardown + a.travel + b.travel + b.setup
      if (gap < needed) {
        out.push({
          a, b, severity: SEVERITY.TIGHT, shortfallMin: needed - gap,
          message: `${mins(gap)} between them. Packing up, travelling and setting up needs about ${mins(needed)}.`,
        })
      }
    }
  }
  return out
}

/** The worst thing about a day, for a calendar dot. */
export function daySeverity(jobs = []) {
  const c = conflictsFor(jobs)
  if (c.some(x => x.severity === SEVERITY.CLASH)) return SEVERITY.CLASH
  if (c.length) return SEVERITY.TIGHT
  return SEVERITY.OK
}

/** 615 -> "10:15 am". Past midnight wraps and is marked. */
export function clock(minutes) {
  const m = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const h24 = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  const ap = h24 >= 12 ? 'pm' : 'am'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  const next = minutes >= 24 * 60 ? ' (next day)' : ''
  return `${h}:${mm} ${ap}${next}`
}

/** 150 -> "2h 30m". Used in every warning, so it is written once. */
export function mins(total) {
  const t = Math.max(0, Math.round(total))
  const h = Math.floor(t / 60)
  const m = t % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}
