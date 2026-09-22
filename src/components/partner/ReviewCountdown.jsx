import { useEffect, useState } from 'react'
import { BadgeCheck, Clock, TriangleAlert } from 'lucide-react'

/**
 * "Your listing will be reviewed within 24 hours" — and then the hours
 * actually counting down.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A PROMISE WITH A CLOCK ON IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Under review" with no end to it is the state a partner rings support
 * about on day two, and they are right to. A deadline costs nothing to
 * show and changes the whole experience of waiting: somebody who can see
 * "18 hours left" does not need to ask anybody anything.
 *
 * The deadline comes from `vendors.review_due_at`, set by
 * `submit_for_review()` (migration 142). It is NOT computed here from
 * `submitted_at + 24h`, and that distinction is the point: an operator
 * can extend it, and when they do, every screen counts to the new time
 * instead of continuing to display a promise that has already been
 * broken.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT HAPPENS WHEN IT RUNS OUT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not nothing, and not a lie. The card changes to say the review is
 * taking longer than expected and that somebody will come back — which
 * is true, and is better than a timer sitting at 00:00:00 or, worse,
 * counting up into negative hours.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE TICK IS ONE SECOND, AND IT STOPS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A 24-hour countdown re-rendering every second for a day is wasteful on
 * a phone, so the interval is one second only while under an hour
 * remains, and one minute above that. It also clears when the deadline
 * passes — a timer that keeps firing after it is done is a battery leak
 * nobody notices.
 */

function remaining(due, now) {
  const ms = new Date(due).getTime() - now
  if (!Number.isFinite(ms)) return null
  const clamped = Math.max(0, ms)
  return {
    ms: clamped,
    over: ms <= 0,
    hours: Math.floor(clamped / 3_600_000),
    minutes: Math.floor((clamped % 3_600_000) / 60_000),
    seconds: Math.floor((clamped % 60_000) / 1000),
  }
}

export function reviewWording(left) {
  if (!left) return null
  if (left.over) return 'Taking a little longer'
  if (left.hours >= 2) return `${left.hours} hours left`
  if (left.hours === 1) return `1 hour ${left.minutes} min left`
  if (left.minutes >= 1) return `${left.minutes} min ${String(left.seconds).padStart(2, '0')}s left`
  return `${left.seconds}s left`
}

export default function ReviewCountdown({
  status, dueAt, submittedAt, extended = 0, note, compact = false,
}) {
  const [now, setNow] = useState(() => Date.now())
  const left = dueAt ? remaining(dueAt, now) : null

  useEffect(() => {
    if (!dueAt) return undefined
    if (left?.over) return undefined
    /* Per second inside the last hour, per minute before that. */
    const step = (left?.ms ?? 0) < 3_600_000 ? 1000 : 60_000
    const id = setInterval(() => setNow(Date.now()), step)
    return () => clearInterval(id)
  }, [dueAt, left?.over, left?.ms === null, (left?.ms ?? 0) < 3_600_000])

  if (status === 'approved') {
    return (
      <div className={`flex items-center gap-2.5 rounded-[18px] bg-forest-50 px-3.5 py-3 ring-1 ring-forest-200 ${compact ? '' : 'mb-3'}`}>
        <BadgeCheck size={16} className="shrink-0 text-forest-700" />
        <p className="text-[12.5px] font-extrabold leading-snug text-forest-900">
          You are approved and live. Jobs will start reaching you.
        </p>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className={`rounded-[18px] bg-saffron-400/10 px-3.5 py-3 ring-1 ring-saffron-300/60 ${compact ? '' : 'mb-3'}`}>
        <p className="flex items-center gap-2 text-[12.5px] font-extrabold text-saffron-800">
          <TriangleAlert size={14} className="shrink-0" />
          We need something changed
        </p>
        {note && <p className="mt-1 text-[12px] leading-snug text-ink-soft">{note}</p>}
      </div>
    )
  }

  if (status !== 'submitted') return null

  const words = reviewWording(left)

  return (
    <div className={`rounded-[18px] bg-plum-950 px-3.5 py-3 text-white ${compact ? '' : 'mb-3'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12.5px] font-extrabold">
          <Clock size={14} className="shrink-0 text-white/70" />
          With our team
        </p>
        {words && (
          <p className={`shrink-0 text-[12.5px] font-extrabold tabular-nums ${
            left.over ? 'text-saffron-300' : 'text-white'
          }`}>
            {words}
          </p>
        )}
      </div>

      <p className="mt-1.5 text-[11.5px] leading-snug text-white/70">
        {/* Once a review has been extended, repeating the original 24-hour
            promise underneath a clock counting to a different time is a
            small lie the partner can see. The sentence changes. */}
        {left?.over
          ? 'This is taking longer than the 24 hours we promised. Somebody is on it and will come back to you — you do not need to do anything.'
          : extended > 0
            ? 'We needed a little longer on yours. The time above is when to expect an answer — nothing more is needed from you.'
            : 'We check every listing by hand within 24 hours. Nothing more is needed from you.'}
      </p>

      {/* Said out loud rather than hidden. A partner whose review has
          been pushed back twice deserves to know that, not to watch a
          fresh timer start over. */}
      {extended > 0 && (
        <p className="mt-1 text-[11px] text-white/55">
          Extended {extended === 1 ? 'once' : `${extended} times`}
          {note ? ` — ${note}` : ''}
        </p>
      )}

      {!left?.over && submittedAt && (
        <p className="mt-1 text-[11px] text-white/55">
          Sent {new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          {' · '}
          {new Date(submittedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
    </div>
  )
}
