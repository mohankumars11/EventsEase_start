import { CalendarDays, ArrowRight, Check } from 'lucide-react'
import { track, EVENTS } from '../../lib/track'
import { istTodayISO } from '../../lib/istTime'
import { useCalendarCoverage } from '../../hooks/useCalendarCoverage'

/**
 * "Your calendar is set through 30 October."
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT A NAG
 * ══════════════════════════════════════════════════════════════════════
 *
 * The obvious version of this is a banner that says "Please update your
 * calendar" on every load, for ever. That is trained-blindness by
 * design: within a week nobody sees it, including on the day it would
 * have mattered.
 *
 * So it appears only when it is TRUE that the calendar is out of date,
 * and it says what the partner loses by leaving it — which is the only
 * argument that works. `match_partners` excludes a vendor whose
 * availability says BLOCKED, and it does NOT exclude one who simply
 * never said. A partner with an empty calendar is offered jobs on days
 * they are already booked, accepts one by reflex, cancels, and collects
 * a strike for it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT CHANGED: A DISTANCE, NOT A YES OR NO
 * ══════════════════════════════════════════════════════════════════════
 *
 * This used to ask one question — is there anything at all marked in the
 * next thirty days — and it had two failures at the same time.
 *
 * It fired at a partner who had set a standing week. Somebody who told
 * us once that they never work Sundays has told us about every Sunday
 * there will ever be, and asking them to repeat it monthly is asking for
 * our convenience, not theirs.
 *
 * And it went quiet the moment a single date was marked. A partner who
 * blocked one day in October was treated as fully up to date, for the
 * rest of the year, on the strength of one tap.
 *
 * `coverageOf` in lib/calendarAlerts.js answers the better question:
 * how far ahead does this calendar actually say anything? Weddings are
 * booked months out, so a calendar that stops in nine days is losing the
 * partner work whatever is written in those nine days.
 *
 * ── Dismissal is remembered now ─────────────────────────────────────
 * It used to be `useState(false)` in the dashboard, so "My month is
 * open" lasted until the next reload and the card came straight back.
 * `vendors.calendar_reviewed_through` has existed since migration 096
 * and nothing has written to it since the old calendar tab was retired;
 * pressing the button now records the date they confirmed through, which
 * is a fact worth keeping rather than a flag worth forgetting.
 */
export default function CalendarNudge({
  availability, weeklyRules = [], vendor = null, onOpen, onDismiss,
}) {
  /* ── One answer, read by three surfaces ────────────────────────────
     This card, the Calendar tab's own coverage strip and the server
     sweep all used to decide independently whether a partner was
     behind. So a partner could be told here that their calendar stops
     on the 30th, tap through to the Calendar, and find no mention of
     it. Three opinions about one fact is how a status stops being
     believed. */
  const coverage = useCalendarCoverage({ availability, weeklyRules, vendor })
  const { todayISO } = coverage

  /* ── Why this is no longer gated on WARN ───────────────────────────
     It was, and so almost nobody ever saw it. WARN needs an empty
     calendar or one that stops inside a fortnight AND no standing week
     -- and a partner who has said "never on Sundays" has a standing
     week, so the card was silently switched off for exactly the people
     whose Decembers were blank.

     The real question is coverage, and a standing week does not answer
     it: "never on Sundays" says nothing about whether you are free on
     12 December. So the card appears whenever the calendar is short of
     the six months `CALENDAR_HORIZON_MONTHS` sets, which is a fact
     about the data rather than a judgement about the partner.

     It does not become a nag, because "I am open until then" records a
     real date on the vendor row and buys 60 days of silence. */
  if (!coverage.needsUpdate) return null

  /* Empty and merely short are different situations and get different
     headlines. Telling somebody with four months stated that their
     "calendar is empty" is the kind of wrong that makes the next card
     ignorable. */
  const empty = !coverage.throughISO

  return (
    <div className="mb-4 rounded-[22px] bg-plum-600 p-4 text-white">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          <CalendarDays size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-extrabold leading-snug">
            {empty
              ? 'Your calendar is empty'
              : `Your calendar stops at ${pretty(coverage.throughISO)}`}
          </p>
          {/* The cost, not the instruction. "Please update your calendar"
              says nothing a partner can weigh; this says what happens if
              they do not. */}
          {/* The cost first, in one breath. The strike rule is the part
              a partner has not usually worked out for themselves. */}
          <p className="mt-1 text-[12.5px] leading-relaxed text-white/85">
            Jobs reach you from the days you have spoken for. Where your
            calendar says nothing, we offer you work you may already be
            booked for — and cancelling costs a strike. Three in 90 days
            suspends the account.
          </p>

          {/* ── Six months, one row ────────────────────────────────────
              "38 days ahead" is a number a partner has to convert into
              months before it means anything. Six labelled bars do the
              conversion for them, and turn the whole thing from a
              scolding into a list of blanks to fill.

              Six because weddings are booked that far out. A calendar
              that stops in three weeks is not late for next week — it
              is invisible for the whole season. */}
          <MonthStrip months={coverage.months} />

          {coverage.firstBlank && (
            <p className="mt-2 text-[12px] font-bold leading-snug text-saffron-200">
              Nothing said about {coverage.firstBlank.label} yet — that is{' '}
              {coverage.firstBlank.openDays} days we cannot offer you.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                track(EVENTS.CALENDAR_PROMPT_CLICKED, {
                  severity: coverage.severity,
                  coverage_days: coverage.coverageDays,
                })
                onOpen?.()
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-saffron-400 px-4 py-2 text-[13px] font-extrabold text-plum-950 transition active:scale-[0.98]"
            >
              {coverage.firstBlank
                ? `Open up ${coverage.firstBlank.label}`
                : 'Set my dates'} <ArrowRight size={14} />
            </button>
            {/* Records a date rather than setting a flag: "I am open for
                the next sixty days" is a real statement about the
                calendar, and it is worth keeping. */}
            <button
              type="button"
              onClick={() => onDismiss?.(addDays(todayISO, 60))}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-bold text-white"
            >
              <Check size={13} /> I am open until then
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Six months as six bars, filled by how much of each has been spoken for.
 *
 * Deliberately not a percentage and not a chart. A partner reads this
 * from across a room in the half second before they tap something else,
 * so the only thing it has to carry is WHICH months are blank -- the
 * exact fill is decoration on top of that.
 *
 * The current month is short by definition (its early days are behind
 * us) and its bar is measured against the days that are left, not
 * against thirty. A month that is over cannot be "uncovered".
 */
function MonthStrip({ months = [] }) {
  if (!months.length) return null
  return (
    <ul className="mt-3 flex items-end gap-1.5" aria-hidden="true">
      {months.map(m => {
        const pct = Math.round((m.covered ?? 0) * 100)
        return (
          <li key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="flex h-9 w-full items-end overflow-hidden rounded-[6px] bg-white/15">
              {/* A month with only a standing week gets a thin floor
                  rather than an empty bar or a full one. Empty would say
                  we know nothing about it, which is not quite true; full
                  would say it is answered, which is not true at all. */}
              <span
                data-month={m.key}
                data-covered={pct}
                data-standing={m.standing ? '1' : '0'}
                className={`w-full rounded-[6px] ${
                  pct === 0
                    ? (m.standing ? 'bg-white/30' : '')
                    : 'bg-saffron-400'
                }`}
                style={{ height: pct === 0 ? (m.standing ? '14%' : '0%') : `${Math.max(12, pct)}%` }}
              />
            </span>
            <span className={`truncate text-[9.5px] font-bold uppercase tracking-wide ${
              pct === 0 ? 'text-white/45' : 'text-white/85'
            }`}>
              {m.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

const pretty = iso => new Date(`${iso}T00:00:00Z`)
  .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' })

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
