import { Clock, CalendarDays, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'

/**
 * "We are reading it. Meanwhile, do the one thing that pays."
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS SAYS MORE THAN "UNDER REVIEW"
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner who has just spent ten minutes describing their business and
 * is told only "under review" has nothing to do and no reason to come
 * back. The gap between submitting and going live is the most likely
 * moment for somebody to lose interest in the whole thing, and it is a
 * gap we create.
 *
 * So it does three jobs at once:
 *
 *   · says what is happening, honestly and with a timeframe
 *   · gives them the ONE thing worth doing while they wait — the
 *     calendar, because dispatch offers jobs on days nobody has blocked
 *     and a partner who has never opened it will be offered work on a
 *     day they are already shooting a wedding
 *   · says what happens when it clears, so the wait has an end
 *
 * The calendar is not a filler task. It is the highest-value thing an
 * unlisted partner can do, and it is the one they are least likely to do
 * unprompted.
 *
 * ── No fake urgency ─────────────────────────────────────────────────
 * "Usually the same day" is what the operator actually does. A countdown
 * or a "3 partners approved this hour" would read as marketing to
 * somebody who has just handed us their business, and the first thing
 * they would do when it slipped is stop believing the rest of the app.
 */

export default function ReviewBanner({ count, rejected = 0, onOpenCalendar }) {
  if (rejected > 0) {
    return (
      <div className="rounded-[22px] bg-amber-50 p-4 ring-1 ring-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-extrabold leading-tight text-ink">
              {rejected === 1 ? 'One listing needs a change' : `${rejected} listings need a change`}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              We have written what to fix on each one. Change it and it goes
              back for checking straight away.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!count) return null

  return (
    <div className="overflow-hidden rounded-[22px] bg-plum-950 text-white">
      <div className="p-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]">
          <Clock size={12} /> Under review
        </span>

        <p className="mt-2.5 font-serif text-[19px] font-extrabold leading-tight tracking-tight">
          {count === 1
            ? 'We are reading your listing now'
            : `We are reading your ${count} listings now`}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-white/70">
          Somebody at Sambramo checks every one by hand — usually the same
          day. You will be told the moment it is live, and jobs can start
          arriving that week.
        </p>
      </div>

      {/* The one useful thing to do while waiting, and it is genuinely
          useful: dispatch offers jobs on days nobody has blocked. */}
      <button
        type="button"
        onClick={onOpenCalendar}
        className="flex w-full items-center gap-3 border-t border-white/10 bg-white/[0.06] p-4 text-left transition active:bg-white/[0.12]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-400 text-plum-950">
          <CalendarDays size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold">
            Block the days you are busy
          </span>
          <span className="block text-[12px] leading-snug text-white/65">
            Two minutes, and it is the difference between the right job and
            one you have to turn down.
          </span>
        </span>
        <ArrowRight size={17} className="shrink-0 text-white/60" />
      </button>
    </div>
  )
}

/**
 * The per-row badge.
 *
 * Small, and it says which of three states a row is in. A partner
 * scanning eleven services should be able to see at a glance which ones
 * can actually bring them work.
 */
export function ReviewPill({ status }) {
  if (status === 'live' || !status) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5 text-[10.5px] font-extrabold text-forest-700">
        <CheckCircle2 size={10} /> Live
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-extrabold text-amber-800">
        <AlertCircle size={10} /> Needs a change
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10.5px] font-extrabold text-ink-mute">
      <Clock size={10} /> Under review
    </span>
  )
}
