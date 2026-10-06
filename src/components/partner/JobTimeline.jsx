import { Check } from 'lucide-react'
import { timelineFor } from '../../lib/jobDetail'

/**
 * Where this booking has got to, in five steps.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT READS THE SAME TIMESTAMPS AS EVERYTHING ELSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `timelineFor` derives every step from `accepted_at`, `is_funded`,
 * `delivered_at`, the event date and the payout claim — the same columns
 * the Jobs list and the earnings buckets read. A stepper with its own
 * idea of progress would eventually show "Customer paid" on a screen
 * whose earnings row says "Waiting on the customer", and the partner
 * would be right not to believe either.
 *
 * Steps behind the current one are ticked. The current one is filled.
 * Steps ahead are outlined — not greyed into invisibility, because a
 * partner wants to see what is still coming.
 */
export default function JobTimeline({ job, claim }) {
  const { steps, currentIndex } = timelineFor(job, { claim })

  return (
    <div>
      <p className="mb-2.5 text-[12px] font-extrabold uppercase tracking-wider text-ink-mute">
        Booking timeline
      </p>
      <ol className="flex items-start">
        {steps.map((s, i) => {
          const isCurrent = i === currentIndex
          return (
            <li key={s.id} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {/* The rail either side, so the dots read as a sequence
                    rather than five separate badges. */}
                <span className={`h-px flex-1 ${i === 0 ? 'bg-transparent'
                  : steps[i - 1].done ? 'bg-forest-400' : 'bg-ink/15'}`} />
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                  s.done ? 'bg-forest-600 text-white'
                  : isCurrent ? 'bg-plum-950 text-white ring-4 ring-plum-200'
                  : 'bg-white text-ink-mute ring-1 ring-ink/15'}`}>
                  {s.done ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                <span className={`h-px flex-1 ${i === steps.length - 1 ? 'bg-transparent'
                  : s.done ? 'bg-forest-400' : 'bg-ink/15'}`} />
              </div>
              <span className={`mt-1.5 text-center text-[9.5px] font-bold leading-tight ${
                s.done || isCurrent ? 'text-ink' : 'text-ink-mute'}`}>
                {s.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
