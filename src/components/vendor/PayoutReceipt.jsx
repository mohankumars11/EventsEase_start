import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { formatINR } from '../../utils/format'
import { jobMoney } from '../../lib/earningsStatement'

/**
 * One payout, itemised — the thing a partner opens with their bank
 * statement in the other hand.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE REFERENCE RECEIPT DOES NOT ADD UP, AND THIS ONE HAS TO
 * ══════════════════════════════════════════════════════════════════════
 *
 * The design for this screen reads: customer price ₹21,200, commission
 * (15%) −₹3,200, your earnings ₹18,000. That is 15.09%, and the three
 * numbers do not close. On a receipt — the one artefact a partner might
 * hand to an accountant — that is the worst possible place for
 * arithmetic that does not work.
 *
 * So every figure here comes from `jobMoney`, the same call the earnings
 * list and the job screen use, and the rows are printed in the order
 * they are deducted. TCS and TDS appear, because they come out before
 * the money lands and the design leaves them out.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CLAIMED AMOUNT AND THE NET ARE BOTH SHOWN
 * ══════════════════════════════════════════════════════════════════════
 *
 * `payout_claims.amount_paise` is the partner's SHARE — fee out,
 * statutory deductions not yet. Printing it alone next to an earnings
 * screen that shows net would look like a third figure appearing from
 * nowhere, so the receipt states it, names what comes off it, and ends
 * on what reaches the account.
 */

const STATE = {
  paid: {
    icon: CheckCircle2, tone: 'text-forest-700', ring: 'ring-forest-200 bg-forest-50',
    title: 'Sent', line: at => (at ? `Paid on ${when(at)}` : 'Paid'),
  },
  requested: {
    icon: Clock, tone: 'text-saffron-800', ring: 'ring-saffron-300/60 bg-saffron-400/10',
    title: 'On its way', line: () => 'Usually two working days from when you asked.',
  },
  rejected: {
    icon: XCircle, tone: 'text-rose-700', ring: 'ring-rose-200 bg-rose-50',
    title: 'Not sent', line: () => 'Please get in touch and we will sort it out.',
  },
}

const when = iso => iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : null

export default function PayoutReceipt({ claim, job, hasPan = false, annualGrossInr = 0 }) {
  if (!claim) return null

  const s = STATE[claim.status] ?? STATE.requested
  const Icon = s.icon
  const r = p => formatINR(Math.round(p / 100))

  /* The job behind the claim, when the caller has it. Without it the
     receipt still states the claimed amount and what came off it — it
     just cannot show what the customer paid, and says so rather than
     guessing. */
  const money = job ? jobMoney(job, { hasPan, annualGrossInr }) : null

  return (
    <div className="space-y-3">
      <div className={`flex flex-col items-center rounded-[20px] p-5 text-center ring-1 ${s.ring}`}>
        <Icon size={28} className={s.tone} />
        <p className="mt-2 font-serif text-[30px] font-extrabold leading-none tabular-nums text-ink">
          {r(claim.amount_paise ?? 0)}
        </p>
        <p className={`mt-1.5 text-[12.5px] font-extrabold ${s.tone}`}>{s.title}</p>
        <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-ink-mute">
          {s.line(claim.settled_at)}
        </p>
      </div>

      <dl className="rounded-[20px] bg-white p-4 text-[12.5px] ring-1 ring-ink/[0.06]">
        {job && (
          <Line label="Booking" value={job.occasion_name ?? job.service_name} strong />
        )}
        {job?.event_date && (
          <Line label="Event" value={when(`${job.event_date}T00:00:00`)} />
        )}

        {money?.itemised ? (
          <>
            <Line label="The customer paid" value={r(money.customerPaise)} />
            <Line label="Sambramo's fee"
                  note={`${Math.round(money.commissionRate * 100)}%`}
                  value={`− ${r(money.commissionPaise)}`} />
            <Line label="Your share" value={r(money.sharePaise)} />
          </>
        ) : (
          <>
            <Line label="Your share of the job" value={r(claim.amount_paise ?? 0)} />
            {job && (
              <p className="py-1 text-[11px] leading-snug text-ink-mute">
                This booking predates the itemised record, so what the customer
                paid cannot be shown against it.
              </p>
            )}
          </>
        )}

        {money && (
          <>
            <Line label="TCS (GST)" note="deposited for you" value={`− ${r(money.tcsPaise)}`} />
            <Line label="TDS"
                  note={money.tdsWaived ? 'waived — PAN on file' : 'deposited for you'}
                  value={money.tdsPaise ? `− ${r(money.tdsPaise)}` : r(0)} />
            <div className="mt-1.5 flex justify-between gap-3 border-t border-ink/[0.08] pt-2">
              <dt className="font-extrabold text-ink">Reaches your account</dt>
              <dd className="font-extrabold tabular-nums text-ink">{r(money.netPaise)}</dd>
            </div>
          </>
        )}

        {claim.destination && (
          <Line label="Sent to" value={claim.destination} />
        )}
        <Line label="Requested" value={when(claim.requested_at)} />
        {claim.reference && (
          /* The number a partner quotes at the bank counter, and the
             reason a receipt is worth opening at all. */
          <Line label="Bank reference" value={claim.reference} mono />
        )}
        {claim.status === 'rejected' && claim.note && (
          <p className="mt-1.5 rounded-[12px] bg-rose-50 px-3 py-2 text-[11.5px] leading-snug text-rose-800">
            {claim.note}
          </p>
        )}
      </dl>
    </div>
  )
}

function Line({ label, note, value, strong, mono }) {
  if (value == null) return null
  return (
    <div className="flex justify-between gap-3 py-1">
      <dt className="text-ink-soft">
        {label}
        {note && <span className="ml-1 text-ink-mute">· {note}</span>}
      </dt>
      <dd className={`shrink-0 text-right tabular-nums ${
        mono ? 'font-mono text-[11.5px] text-ink-soft'
        : strong ? 'font-extrabold text-ink' : 'font-semibold text-ink'}`}>
        {value}
      </dd>
    </div>
  )
}
