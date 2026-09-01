import { Check, Loader2, Phone, Wallet, Truck, Banknote, Lock } from 'lucide-react'

/**
 * Every step of one job, and exactly which one it is on.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A JOB NEEDS A TIMELINE AND NOT A STATUS WORD
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner looking at "accepted" knows one thing and wonders about
 * four: has the customer paid, when do I get their number, when do I
 * get MY money, and what am I supposed to do next.
 *
 * Every one of those answers already exists in the row — `accepted_at`,
 * `paid_at`, `delivered_at`, `is_funded` — and none of them was shown.
 * So the same data becomes six steps, each either done with a time on
 * it, happening now with what to do, or not yet and greyed.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE RULE EVERY STEP FOLLOWS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A tick is a claim about the real world and every one traces to a
 * column somebody wrote. This is the same rule lib/serviceLedger.js
 * states for the customer's tracker, and it matters more here: a partner
 * who is told the money is released and finds it is not will not take
 * the next job.
 *
 * So there is no step for "we are processing your payout" or any other
 * phrase that means nothing happened. If a row cannot prove it, it is
 * not ticked.
 *
 * ── Payout is the one step with no column yet ───────────────────────
 * `settled_at` exists on booking_lines and nothing writes it, because
 * payouts are still run by hand against the ledger. Rather than fake a
 * tick, that step says when it is due and says it plainly.
 */

const DONE = 'bg-forest-600 text-white'
const NOW = 'bg-saffron-400 text-plum-950'
const WAIT = 'bg-ink/[0.07] text-ink-mute'

function when(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}

/**
 * @param job a row from `partner_jobs`
 */
export default function JobLifecycle({ job }) {
  const paid = !!job.paid_at || job.is_funded
  const delivered = !!job.delivered_at
  const settled = job.status === 'settled'

  /* Twenty-four hours after the event is when escrow releases — the
     rule the terms state and migration 061 implements. Shown as a date
     rather than a promise, and only once there is something to release. */
  const releaseDue = job.event_date
    ? new Date(new Date(`${job.event_date}T00:00:00`).getTime() + 86400000)
    : null

  const steps = [
    {
      id: 'accepted',
      icon: Check,
      title: 'You accepted',
      at: job.accepted_at,
      done: !!job.accepted_at,
      now: false,
      body: 'The date is held for you and we stopped looking for anyone else.',
    },
    {
      id: 'paid',
      icon: Wallet,
      title: paid ? 'Customer has paid' : 'Waiting for the customer to pay',
      at: job.paid_at,
      done: paid,
      now: !paid,
      body: paid
        ? 'Their money is held by Sambramo. It is yours once the job is delivered.'
        : 'You are not confirmed until this happens. Do not buy anything for this job yet.',
    },
    {
      id: 'call',
      icon: paid ? Phone : Lock,
      title: paid ? 'Call the customer' : 'Their number unlocks after payment',
      done: paid && !!job.delivered_at,
      now: paid && !delivered,
      body: paid
        ? 'Within 30 minutes. Agree colours, timings and exactly what you are bringing.'
        : 'We do not share a customer’s number before their payment clears.',
    },
    {
      id: 'deliver',
      icon: Truck,
      title: delivered ? 'Delivered' : 'Do the job',
      at: job.delivered_at,
      done: delivered,
      now: paid && !delivered,
      body: delivered
        ? 'You marked this done.'
        : job.event_date
          ? `On ${new Date(`${job.event_date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}. Mark it done when you finish.`
          : 'Mark it done when you finish.',
    },
    {
      id: 'payout',
      icon: Banknote,
      title: settled ? 'Paid out to you' : 'Your money is released',
      done: settled,
      now: delivered && !settled,
      body: settled
        ? 'Sent to your saved payout account.'
        : releaseDue
          ? `24 hours after the event — ${releaseDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} — if nobody raises a problem.`
          : '24 hours after the event, if nobody raises a problem.',
    },
  ]

  return (
    <ol className="mt-3 space-y-0">
      {steps.map((s, i) => {
        const Icon = s.icon
        const tone = s.done ? DONE : s.now ? NOW : WAIT
        const last = i === steps.length - 1
        return (
          <li key={s.id} className="flex gap-3">
            {/* The rail. A line between the marks rather than under them,
                so the eye reads it as one sequence and not five cards. */}
            <div className="flex flex-col items-center">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone}`}>
                {s.now && !s.done
                  ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />
                  : <Icon size={13} />}
              </span>
              {!last && (
                <span className={`w-0.5 flex-1 ${s.done ? 'bg-forest-600/30' : 'bg-ink/[0.08]'}`} />
              )}
            </div>

            <div className={`min-w-0 flex-1 ${last ? 'pb-0' : 'pb-4'}`}>
              <p className={`text-[13.5px] font-extrabold leading-snug ${
                s.done || s.now ? 'text-ink' : 'text-ink-mute'
              }`}>
                {s.title}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{s.body}</p>
              {s.at && (
                <p className="mt-0.5 text-[11.5px] font-bold tabular-nums text-ink-mute">
                  {when(s.at)}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
