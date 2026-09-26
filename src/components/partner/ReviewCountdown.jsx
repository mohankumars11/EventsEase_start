import { useEffect, useState } from 'react'
import ReviewDial from './ReviewDial'
import { BadgeCheck, Clock, TriangleAlert, ArrowRight, ChevronRight } from 'lucide-react'

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

/**
 * ── Why the minutes are always shown ─────────────────────────────────
 * This used to read "23 hours left" above two hours, and the clock
 * behind it ticks once a minute. So the words changed once an HOUR: a
 * partner who watched it, waiting, saw a number that never moved and
 * reasonably concluded it was a static label somebody had typed.
 *
 * The countdown was real the whole time. It just had nothing visible to
 * show for a 59-minute stretch. Showing the minutes makes every tick of
 * the clock land somewhere a person can see, which is the entire point
 * of putting a countdown on the screen instead of a date.
 *
 * `23h 47m`, not `23 hours 47 minutes left`: it sits inside a status
 * pill a few characters wide, and the long form wrapped.
 */
/**
 * The promised window, for the dial's denominator only.
 *
 * `review_sla_hours()` is the real one and it lives in the database
 * (142). This is not a second source of truth: nothing is written from
 * it and no deadline is computed from it. It is the scale the ring is
 * drawn against when there is no deadline to drain, and being an hour
 * out would move a ring by a few degrees.
 */
const SLA_HOURS = 24

/** "23h" / "47m" / "12s" — small enough to sit inside a 54px ring. */
function shortLeft(left) {
  if (!left) return null
  if (left.hours >= 1) return `${left.hours}h`
  if (left.minutes >= 1) return `${left.minutes}m`
  return `${left.seconds}s`
}

/** The same, counting the other way. */
function shortElapsed(e) {
  if (!e) return null
  if (e.hours >= 24) return `${Math.floor(e.hours / 24)}d`
  if (e.hours >= 1) return `${e.hours}h`
  if (e.minutes >= 1) return `${e.minutes}m`
  return `${e.seconds}s`
}

export function reviewWording(left) {
  if (!left) return null
  if (left.over) return 'Taking a little longer'
  if (left.hours >= 1) return `${left.hours}h ${String(left.minutes).padStart(2, '0')}m left`
  if (left.minutes >= 1) return `${left.minutes}m ${String(left.seconds).padStart(2, '0')}s left`
  return `${left.seconds}s left`
}

/**
 * One clock, shared.
 *
 * The header's status pill and the card below it both show this
 * deadline. Two components each running their own interval would drift
 * apart by up to a minute -- the pill saying "3 hours left" above a card
 * saying "2 hours left" is the kind of thing that makes a partner stop
 * believing either of them.
 *
 * Returns `{ left, words, fraction }`. `fraction` is how much of the
 * promised window has elapsed, for the progress bar; it needs
 * `submittedAt` and is null without it rather than guessed.
 */
export function useReviewClock({ dueAt, submittedAt }) {
  const [now, setNow] = useState(() => Date.now())
  const left = dueAt ? remaining(dueAt, now) : null

  /* ── It keeps ticking in every state that has a clock ──────────────
     This used to stop on two conditions: no `dueAt`, and `left.over`.
     Both are states a real partner sits in — four of seven under review
     have no deadline, and an overdue review is precisely the one
     somebody stares at — and in both the card froze. A frozen clock on
     a card about waiting reads as a stalled process, which is the worst
     available reading and was the reported bug.

     It now ticks whenever there is anything to count: a deadline to
     count down to, or a submission time to count up from. */
  const ticking = !!dueAt || !!submittedAt
  const insideLastHour = !!left && !left.over && left.ms < 3_600_000

  useEffect(() => {
    if (!ticking) return undefined
    /* Per second in the last hour and while overdue, per minute
       otherwise. A 24-hour countdown re-rendering every second for a
       day is a battery leak nobody attributes to the right screen; an
       overdue clock is one somebody is watching. */
    const step = insideLastHour || left?.over ? 1000 : 60_000
    const id = setInterval(() => setNow(Date.now()), step)
    return () => clearInterval(id)
  }, [ticking, insideLastHour, left?.over])

  /* ── Elapsed, for a review with no deadline on it ──────────────────
     Four of the seven partners under review have no `review_due_at`:
     they submitted through the fallback path that writes the status
     with a plain UPDATE and computes nothing. Migration 157 backfills
     them and stops it recurring, but a card must still work on a
     database where 157 has not been pasted.

     Counting UP from `submitted_at` invents nothing. It is arithmetic
     on a real column and it never implies a finish time we have not
     got -- unlike `submitted_at + 24h`, which would BE a deadline
     dressed as a display. */
  let elapsed = null
  if (submittedAt) {
    const since = now - new Date(submittedAt).getTime()
    if (Number.isFinite(since) && since >= 0) {
      elapsed = {
        ms: since,
        hours: Math.floor(since / 3_600_000),
        minutes: Math.floor((since % 3_600_000) / 60_000),
        seconds: Math.floor((since % 60_000) / 1000),
      }
    }
  }

  let fraction = null
  if (dueAt && submittedAt) {
    const start = new Date(submittedAt).getTime()
    const end = new Date(dueAt).getTime()
    const span = end - start
    if (Number.isFinite(span) && span > 0) {
      fraction = Math.min(1, Math.max(0, (now - start) / span))
    }
  }

  /* ── What the dial shows, decided once ────────────────────────────
     Three cases, one place. A component branching on `dueAt` AND
     `left.over` AND `submittedAt` at the point of render is how the
     header and the card started disagreeing about a minute. */
  const dialFraction = fraction != null
    ? fraction
    : elapsed
      ? Math.min(1, elapsed.ms / (SLA_HOURS * 3_600_000))
      : 0

  const dialLabel = left && !left.over
    ? shortLeft(left)
    : elapsed
      ? shortElapsed(elapsed)
      : null

  return {
    left,
    words: reviewWording(left),
    fraction,
    elapsed,
    dial: { fraction: dialFraction, label: dialLabel, over: !!left?.over },
  }
}

export default function ReviewCountdown({
  status, dueAt, submittedAt, extended = 0, note, compact = false,
  onOpenCalendar = null,
  onOpenListing = null, listingCount = 0, listingNames = null,
}) {
  const { left, words, elapsed, dial } = useReviewClock({ dueAt, submittedAt })

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

  /* `words` comes from the hook now, alongside the dial and the elapsed
     clock, so the header and this card cannot word the same moment two
     different ways. It was recomputed here as well, which was harmless
     until the hook started returning it and became a redeclaration. */
  return (
    <div className={`rounded-[18px] bg-plum-950 px-3.5 py-3 text-white ${compact ? '' : 'mb-3'}`}>
      <div className="flex items-start gap-3">
        {/* The dial, and it is never still. See ReviewDial's header for
            what it counts in each of the three states. */}
        <ReviewDial {...dial} />

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[12.5px] font-extrabold">
            <Clock size={14} className="shrink-0 text-white/70" />
            With our team
          </p>

          {/* ── The words beside the dial, not instead of it ──────────
              The dial carries "2h"; this carries "2h 21m left". One is
              glanceable and one is exact, and a partner checking a
              review wants both — which is why the elapsed case has a
              sentence of its own rather than borrowing the countdown's. */}
          <p className={`mt-0.5 text-[13px] font-extrabold tabular-nums ${
            left?.over ? 'text-saffron-300' : 'text-white'
          }`}>
            {words
              ?? (elapsed
                ? `With us ${elapsed.hours >= 1 ? `${elapsed.hours}h ` : ''}${String(elapsed.minutes).padStart(2, '0')}m`
                : 'Just sent')}
          </p>
        </div>
      </div>

      <p className="mt-1.5 text-[11.5px] leading-snug text-white/85">
        {/* Once a review has been extended, repeating the original 24-hour
            promise underneath a clock counting to a different time is a
            small lie the partner can see. The sentence changes.

            ── The fourth branch: no deadline at all ──────────────────
            `review_due_at` is NULL for a partner who submitted through
            the fallback path in ReviewPublishStep (the RPC missing), and
            for every partner whose row predates migration 142 — which is
            227 of the 228 rows in this database today.

            Until now that produced this card with NO time and NO
            explanation: a heading, a paragraph promising 24 hours, and
            nothing saying when they started or when they end. A partner
            reading it cannot tell whether the clock is broken or whether
            they are being ignored. Saying "we will confirm the time"
            is less than a countdown and is at least true. */}
        {!dueAt
          ? 'We have your profile. We will confirm when to expect an answer shortly — nothing more is needed from you.'
          : left?.over
            ? 'This is taking longer than the 24 hours we promised. Somebody is on it and will come back to you — you do not need to do anything.'
            : extended > 0
              ? 'We needed a little longer on yours. The time above is when to expect an answer — nothing more is needed from you.'
              : 'We check every listing by hand within 24 hours. Nothing more is needed from you.'}
      </p>

      {/* ── The waiting period, spent ──────────────────────────────────
          A partner under review can do nothing about the review, and
          there is exactly one thing they CAN do that changes what
          happens the moment it clears: say which days they can work.
          `match_partners` will not offer a date the calendar has not
          spoken for, so a partner approved on Friday with an empty
          calendar is approved into silence.

          It says what the calendar enables, not what it earns. */}
      {onOpenCalendar && (
        <div className="mt-2.5 border-t border-white/15 pt-2.5">
          <p className="text-[11.5px] leading-snug text-white/85">
            While we check your profile, tell us the days you can work. We can
            only match you on days your calendar has spoken for.
          </p>
          <button
            type="button"
            onClick={onOpenCalendar}
            className="mt-2 inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-saffron-400 px-3.5 text-[12px] font-extrabold text-plum-950 transition active:scale-[0.98]"
          >
            Update calendar <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* ── What is actually being reviewed ───────────────────────────
          The card said a review was happening and gave no way to look
          at the thing under review. A partner who submitted three
          trades and then wondered whether the photos went up, or
          whether they picked the right category, had to go More → My
          services and find it — on the one screen where they are
          already anxious and already being told to wait.

          Named, and plural when it is. "Your listing" when they
          submitted four is the kind of small wrongness that makes
          somebody check whether the other three arrived. */}
      {onOpenListing && listingCount > 0 && (
        <button
          type="button"
          onClick={onOpenListing}
          className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-[14px] bg-white/[0.08] px-3 py-2.5 text-left transition active:scale-[0.99]"
        >
          <span className="min-w-0">
            <span className="block text-[12px] font-extrabold text-white">
              {listingCount === 1
                ? 'See the listing being reviewed'
                : `See the ${listingCount} listings being reviewed`}
            </span>
            {listingNames && (
              <span className="mt-0.5 block truncate text-[11px] text-white/70">
                {listingNames}
              </span>
            )}
          </span>
          <ChevronRight size={15} className="shrink-0 text-white/60" />
        </button>
      )}

      {/* Said out loud rather than hidden. A partner whose review has
          been pushed back twice deserves to know that, not to watch a
          fresh timer start over. */}
      {extended > 0 && (
        <p className="mt-1 text-[11px] text-white/75">
          Extended {extended === 1 ? 'once' : `${extended} times`}
          {note ? ` — ${note}` : ''}
        </p>
      )}

      {!left?.over && submittedAt && (
        <p className="mt-1 text-[11px] text-white/75">
          Sent {new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          {' · '}
          {new Date(submittedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
    </div>
  )
}
