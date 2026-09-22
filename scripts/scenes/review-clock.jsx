/**
 * The review clock, in every state it can be in.
 *
 * A countdown is the one component you cannot judge from its code: the
 * question is whether "18 hours left" reads as reassurance or as a
 * threat, and whether the overdue state still looks like somebody is
 * handling it.
 *
 * The deadlines below are relative to now, so this scene says the same
 * thing whenever it is shot.
 *
 *   node scripts/shoot-components.mjs shots/review-clock.png \
 *     --scenes scripts/scenes/review-clock.jsx --width 390 --wait 1200
 */
import React from 'react'
import ReviewCountdown from '../../src/components/partner/ReviewCountdown'

const inHours = h => new Date(Date.now() + h * 3_600_000).toISOString()
const agoHours = h => new Date(Date.now() - h * 3_600_000).toISOString()

function Case({ title, note, children }) {
  return (
    <section className="mb-5">
      <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
        {title}
      </p>
      {note && <p className="mb-2 text-[12px] leading-snug text-ink-soft">{note}</p>}
      {children}
    </section>
  )
}

export default function ReviewClock() {
  return (
    <div className="mx-auto max-w-[420px] bg-page p-4">
      <Case title="1 · Just submitted" note="The promise, with the clock already running.">
        <ReviewCountdown
          status="submitted" dueAt={inHours(23.6)} submittedAt={agoHours(0.4)} compact
        />
      </Case>

      <Case title="2 · Most of a day gone">
        <ReviewCountdown
          status="submitted" dueAt={inHours(3)} submittedAt={agoHours(21)} compact
        />
      </Case>

      <Case title="3 · Under an hour" note="Ticks per second only in here.">
        <ReviewCountdown
          status="submitted" dueAt={inHours(0.21)} submittedAt={agoHours(23.8)} compact
        />
      </Case>

      <Case title="4 · Overdue" note="Must not sit at 00:00 or count backwards.">
        <ReviewCountdown
          status="submitted" dueAt={agoHours(2)} submittedAt={agoHours(26)} compact
        />
      </Case>

      <Case title="5 · Extended by an operator" note="Said out loud, not hidden behind a fresh timer.">
        <ReviewCountdown
          status="submitted" dueAt={inHours(20)} submittedAt={agoHours(30)}
          extended={2} note="Waiting on a clearer photo of the FSSAI licence." compact
        />
      </Case>

      <Case title="6 · Approved">
        <ReviewCountdown status="approved" compact />
      </Case>

      <Case title="7 · Sent back">
        <ReviewCountdown
          status="rejected" compact
          note="The Aadhaar photo is cut off at the bottom. Please upload the whole card."
        />
      </Case>

      <Case title="8 · Nothing to say" note="A draft partner sees no card at all — this gap is correct.">
        <ReviewCountdown status="draft" compact />
      </Case>
    </div>
  )
}
