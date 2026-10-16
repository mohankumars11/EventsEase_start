import {
  Inbox, Check, IndianRupee, PartyPopper, Wallet,
  Navigation, MapPin, ClipboardCheck, TriangleAlert,
} from 'lucide-react'

/**
 * A job, from the request arriving to the money landing.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SAME FIVE STEPS EVERY REAL JOB SHOWS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `timelineFor` in `src/lib/jobDetail.js:25-29` defines the vocabulary
 * the app already uses on every booking:
 *
 *   Request received → You accepted → Customer paid → Event day
 *   → Payment released
 *
 * This explainer uses those exact five, in that order, with the same
 * words. An explainer that invents its own stages teaches a partner a
 * vocabulary the app will never repeat back to them, and the first time
 * the two disagree the partner is right not to trust either.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "CUSTOMER PAID" IS A STEP, AND IT IS THE POINT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The obvious version of this screen goes Accept → Event Day, because
 * that is how it feels to the partner: you say yes, then you turn up.
 *
 * `MyJobs.jsx:68` carries the sentence "Do not buy anything for this job
 * yet", and its own comment calls that "the most important sentence on
 * the partner side". A decorator who buys flowers on an acceptance that
 * never gets funded is out of pocket for a booking that was never real,
 * and that decorator does not answer the next notification.
 *
 * So the funding step is here, in the middle, with the warning attached.
 * Skipping it would make this screen teach the exact mistake the rest of
 * the app spends a card warning against.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING HERE IS A PROMISE
 * ══════════════════════════════════════════════════════════════════════
 *
 * No timings, no amounts, no "you will get more jobs". Every line says
 * what the app does or what the partner does. Demand is the customer's
 * decision and this marketplace does not get to promise it.
 */

const STEPS = [
  {
    id: 'requested',
    icon: Inbox,
    label: 'Request received',
    body: 'A customer describes their celebration and we match it against the partners who can actually do it — your trade, your area, your capacity, and the days your calendar has spoken for.',
    note: 'Where your calendar says nothing, you are not in the running.',
  },
  {
    id: 'accepted',
    icon: Check,
    label: 'You accepted',
    body: 'The request lands on your Jobs tab with the date, the area and what you earn. You accept it or you pass. Passing costs you nothing.',
    warn: 'Do not buy anything for this job yet. You are not confirmed until the customer has paid.',
  },
  {
    id: 'funded',
    icon: IndianRupee,
    label: 'Customer paid',
    body: 'The customer pays Sambramo and the money is held, not sent on. Now the booking is real: you get their name and number, and the job moves to Confirmed.',
    note: 'This is the moment it is safe to spend on the job.',
  },
  {
    id: 'event',
    icon: PartyPopper,
    label: 'Event day',
    body: 'Open the job on the day. Start the trip and the app navigates you there and shows the customer you are on the way. When the work is done, mark it done.',
    sub: [
      { icon: Navigation, text: 'Start trip — turn-by-turn to the venue' },
      { icon: MapPin, text: 'Arrived — the customer can see you are there' },
      { icon: ClipboardCheck, text: 'Mark it done — this starts your payout' },
    ],
  },
  {
    id: 'paid_out',
    icon: Wallet,
    label: 'Payment released',
    body: 'Once the event is completed and nothing is disputed, your earnings are released to the account on your Bank & payments screen. There is no wallet and no balance held here.',
    note: 'You can follow every rupee of it on the Earnings tab.',
  },
]

export default function HowJobsWorkScreen() {
  return (
    <div className="space-y-3">
      <p className="rounded-[16px] bg-plum-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-plum-900 ring-1 ring-plum-100">
        These are the same five stages you will see on every job you take.
        Nothing here is a guarantee of work — it is how a job travels once
        a customer chooses you.
      </p>

      <ol className="space-y-2.5">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <li
              key={s.id}
              data-step={s.id}
              className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-plum-600 text-white">
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-0.5 text-[14.5px] font-extrabold leading-tight text-ink">
                    {s.label}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                    {s.body}
                  </p>

                  {/* The three things that happen inside Event day. Nested
                      rather than promoted to steps of their own, because
                      the app's own timeline counts them as one. */}
                  {s.sub && (
                    <ul className="mt-2.5 space-y-1.5">
                      {s.sub.map(({ icon: SubIcon, text }) => (
                        <li key={text} className="flex items-start gap-2 text-[12px] font-semibold leading-snug text-ink-soft">
                          <SubIcon size={13} className="mt-0.5 shrink-0 text-plum-600" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  )}

                  {s.warn && (
                    <p className="mt-2.5 flex items-start gap-2 rounded-[14px] bg-saffron-400/15 px-3 py-2 text-[12px] font-bold leading-snug text-saffron-900 ring-1 ring-saffron-300/60">
                      <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                      {s.warn}
                    </p>
                  )}

                  {s.note && (
                    <p className="mt-2 text-[11.5px] leading-snug text-ink-faint">
                      {s.note}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
