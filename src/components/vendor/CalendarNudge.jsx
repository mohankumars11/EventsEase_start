import { useMemo } from 'react'
import { CalendarDays, ArrowRight, Check } from 'lucide-react'
import { istTodayISO } from '../../lib/istTime'
import { coverageOf, LEVEL } from '../../lib/calendarAlerts'

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
  const todayISO = istTodayISO()

  const coverage = useMemo(
    () => coverageOf({ availability, weeklyRules, todayISO }),
    [availability, weeklyRules, todayISO])

  /* What the partner last confirmed. A confirmation that has since been
     overtaken by the calendar is no longer a reason to stay quiet. */
  const confirmedThrough = vendor?.calendar_reviewed_through ?? null
  const confirmedAhead = confirmedThrough && confirmedThrough > todayISO
    ? Math.round((new Date(`${confirmedThrough}T00:00:00Z`) - new Date(`${todayISO}T00:00:00Z`)) / 86400000)
    : 0

  /* Only the warn level earns a card. The informational level of
     `coverageOf` is for the calendar screen itself, where the partner
     came to think about dates anyway. */
  if (coverage.level !== LEVEL.WARN) return null
  if (confirmedAhead >= 30) return null

  return (
    <div className="mb-4 rounded-[22px] bg-plum-600 p-4 text-white">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          <CalendarDays size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-extrabold leading-snug">
            {coverage.throughISO
              ? `Your calendar stops at ${pretty(coverage.throughISO)}`
              : 'Your calendar is empty'}
          </p>
          {/* The cost, not the instruction. "Please update your calendar"
              says nothing a partner can weigh; this says what happens if
              they do not. */}
          <p className="mt-1 text-[12.5px] leading-relaxed text-white/85">
            We will keep offering you jobs on days you cannot work. Accepting
            one and cancelling later costs you a strike — three in 90 days and
            the account is suspended. Most celebrations are booked weeks
            ahead, so the further out you go, the more you are offered.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1.5 rounded-full bg-saffron-400 px-4 py-2 text-[13px] font-extrabold text-plum-950 transition active:scale-[0.98]"
            >
              Set my dates <ArrowRight size={14} />
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

const pretty = iso => new Date(`${iso}T00:00:00Z`)
  .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' })

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
