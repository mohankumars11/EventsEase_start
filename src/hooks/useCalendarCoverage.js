import { useMemo } from 'react'
import { coverageOf } from '../lib/calendarAlerts'
import { istTodayISO } from '../lib/istTime'
import { CALENDAR_HORIZON_MONTHS } from '../config/vendor'

/**
 * How far ahead this partner's calendar actually speaks, in one place.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A HOOK AND NOT A FUNCTION CALL IN EACH COMPONENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `coverageOf` is already pure and already correct. What was missing is
 * a single answer to "is this partner behind, and by how much" that the
 * Jobs card, the Calendar tab and the server sweep all read the same
 * way.
 *
 * Without it, each surface picks its own threshold. The nudge card fired
 * at WARN; the sweep fired at WARN; the Calendar tab showed nothing at
 * all — so a partner could be told on Jobs that their calendar stops on
 * the 30th, tap through to the Calendar, and find no mention of it. Three
 * opinions about one fact is how a status stops being believed.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE HORIZON IS ROLLING, AND IT IS NEVER A DATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `today + CALENDAR_HORIZON_MONTHS`, recomputed every render. A fixed
 * end date is the bug this exists to prevent: it is right on the day it
 * is written, drifts for six months, and is then actively wrong for
 * ever — telling a partner in March that they are covered because
 * somebody typed "January 2027" into a constant in September.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SEVERITY IS NOT THE SAME QUESTION AS LEVEL
 * ══════════════════════════════════════════════════════════════════════
 *
 * `coverageOf().level` answers "should this interrupt them". `severity`
 * here answers "how far behind are they", which is a different axis: a
 * partner with four months stated is not urgent and is still short.
 *
 *   ok       at or past the horizon, or a standing week plus real dates
 *   thin     over half way — a gentle line, never a red one
 *   short    under half — worth a card
 *   empty    nothing at all — the only one that earns an interruption
 *
 * The sweep's job is to translate severity into how often to speak. It
 * is deliberately NOT decided here: this hook knows the calendar, not
 * the partner's tolerance for being nudged.
 */

/** Days in the rolling horizon. ~183 for six months; exactness is not the point. */
export function horizonDays(months = CALENDAR_HORIZON_MONTHS, todayISO = istTodayISO()) {
  const start = new Date(`${todayISO}T00:00:00Z`)
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + months)
  return Math.round((end - start) / 86_400_000)
}

export function severityOf({ fraction, statedDays, hasStandingWeek }) {
  if (!statedDays && !hasStandingWeek) return 'empty'
  if (fraction >= 1) return 'ok'
  if (fraction >= 0.5) return 'thin'
  return 'short'
}

/**
 * @param availability  the vendor_availability rows, keyed by ISO date
 * @param weeklyRules   the standing week
 * @param vendor        for `calendar_reviewed_through`, which is the
 *                      partner's own "I am open until then"
 */
export function useCalendarCoverage({ availability = {}, weeklyRules = [], vendor = null } = {}) {
  const todayISO = istTodayISO()

  return useMemo(() => {
    const target = horizonDays(CALENDAR_HORIZON_MONTHS, todayISO)
    const coverage = coverageOf({ availability, weeklyRules, todayISO, horizonDays: target })

    const statedDays = Object.keys(availability ?? {}).filter(d => d >= todayISO).length
    const severity = severityOf({
      fraction: coverage.fraction,
      statedDays,
      hasStandingWeek: coverage.hasStandingWeek,
    })

    /* ── What the partner last confirmed ──────────────────────────
       `calendar_reviewed_through` is a real date they stood behind, not
       a dismissal flag. A confirmation the calendar has since overtaken
       is no longer a reason to stay quiet, which is why this compares
       against today rather than trusting the column. */
    const confirmedThrough = vendor?.calendar_reviewed_through ?? null
    const confirmedAhead = confirmedThrough && confirmedThrough > todayISO
      ? Math.round((new Date(`${confirmedThrough}T00:00:00Z`) - new Date(`${todayISO}T00:00:00Z`)) / 86_400_000)
      : 0

    /* The last day of the horizon, as a date rather than a count. The
       coverage button opens a range sheet and a range sheet needs two
       ends; deriving it at the call site would put the six-month rule
       in two places. */
    const end = new Date(`${todayISO}T00:00:00Z`)
    end.setUTCMonth(end.getUTCMonth() + CALENDAR_HORIZON_MONTHS)

    return {
      ...coverage,
      todayISO,
      horizonISO: end.toISOString().slice(0, 10),
      coverageDays: coverage.days,
      targetDays: target,
      severity,
      statedDays,
      confirmedThrough,
      confirmedAhead,
      /* The one boolean a card should branch on. A partner who has said
         "I am open for the next sixty days" has answered the question,
         and asking again inside that window is nagging. */
      needsUpdate: severity !== 'ok' && confirmedAhead < 30,
    }
  }, [availability, weeklyRules, vendor?.calendar_reviewed_through, todayISO])
}
