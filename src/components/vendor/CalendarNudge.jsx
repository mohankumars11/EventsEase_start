import { useMemo } from 'react'
import { CalendarDays, ArrowRight } from 'lucide-react'

/**
 * "Tell us when you cannot work."
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
 * That is the sentence on the card, because it is the actual cost.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT COUNTS AS OUT OF DATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nothing marked in the next 30 days. Not "never touched" — a partner
 * who genuinely has an open month is right to have an empty calendar and
 * should not be told off for it, which is why this can be dismissed for
 * the session and why it never appears twice in one sitting.
 *
 * The threshold is deliberately generous. A card that fires on a
 * partner who blocked one day last week would be wrong more often than
 * right, and being wrong is what teaches people to ignore it.
 */

const DAY = 86400000
const WINDOW_DAYS = 30

export default function CalendarNudge({ availability, onOpen, onDismiss }) {
  const stale = useMemo(() => {
    const rows = Object.values(availability ?? {})
    if (!rows.length) return true

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const horizon = today.getTime() + WINDOW_DAYS * DAY

    // Anything said about a day inside the window counts as up to date,
    // blocked or limited alike — the point is that they told us.
    return !rows.some(a => {
      if (!a?.slot_date) return false
      const t = new Date(`${a.slot_date}T00:00:00`).getTime()
      return t >= today.getTime() && t <= horizon
    })
  }, [availability])

  if (!stale) return null

  return (
    <div className="mb-4 rounded-[22px] bg-plum-600 p-4 text-white">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          <CalendarDays size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-extrabold leading-snug">
            Block the days you are already busy
          </p>
          {/* The cost, not the instruction. "Please update your calendar"
              says nothing a partner can weigh; this says what happens if
              they do not. */}
          <p className="mt-1 text-[12.5px] leading-relaxed text-white/85">
            We will keep offering you jobs on days you cannot work. Accepting
            one and cancelling later costs you a strike — three in 90 days and
            the account is suspended.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1.5 rounded-full bg-saffron-400 px-4 py-2 text-[13px] font-extrabold text-plum-950 transition active:scale-[0.98]"
            >
              Open my calendar <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full px-3 py-2 text-[12.5px] font-bold text-white/70"
            >
              My month is open
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
