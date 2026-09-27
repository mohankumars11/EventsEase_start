import { useState } from 'react'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { formatINR } from '../../utils/format'
import PayoutReceipt from './PayoutReceipt'

/**
 * Every payout this partner has asked for, and what happened to it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE TABLE EXISTED AND NOTHING SHOWED IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `payout_claims` has carried the request, the amount, the destination,
 * the settlement time and the bank reference since migration 091. The
 * earnings screen read three of those columns and used them only to
 * decide which bucket a job belonged in, so a partner asking "when did
 * that one actually arrive, and what was the reference" had nowhere to
 * look — and that is the question somebody asks with their bank
 * statement open in the other hand.
 *
 * So: the whole row, newest first, with the reference printed where one
 * exists. `rejected` is shown too. A payout that did not happen is
 * exactly the thing a partner must not have to discover by its absence.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FIGURE HERE IS THE CLAIMED AMOUNT, AND IT SAYS SO
 * ══════════════════════════════════════════════════════════════════════
 *
 * `payout_claims.amount_paise` is written by the `claim_payment` RPC
 * from `booking_lines.partner_amount_paise` — the share, with the
 * platform fee already out of it but before TCS and TDS. The rest of
 * this screen shows net, so printing this number bare would read as a
 * third, larger figure appearing from nowhere.
 *
 * It is not recomputed into a net, because payouts here are run by hand
 * against the ledger and this component cannot know what was actually
 * transferred. It reports the amount the row records and names what
 * still comes off it. An explained figure is honest; a derived one we
 * cannot verify would not be.
 */

const TONE = {
  paid:      'bg-forest-50 text-forest-800 ring-forest-200',
  requested: 'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  rejected:  'bg-rose-50 text-rose-700 ring-rose-200',
}

const SAYS = {
  paid:      'Sent',
  requested: 'On its way',
  rejected:  'Not sent',
}

const when = iso => iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : null

export default function PayoutHistory({ claims, jobsByLine, hasPan, annualGrossInr }) {
  /* One open receipt at a time, in place of the list. A payout is read
     on its own — with a bank statement in the other hand — and a list
     that expands five receipts inline is a list nobody can scan. */
  const [open, setOpen] = useState(null)
  const rows = [...(claims ?? [])].sort(
    (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime())

  if (!rows.length) return null

  if (open) {
    const claim = rows.find(c => (c.id ?? c.line_id) === open)
    return (
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <button
          type="button" onClick={() => setOpen(null)}
          className="mb-3 flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink-mute"
        >
          <ArrowLeft size={14} /> All payouts
        </button>
        <PayoutReceipt
          claim={claim}
          job={jobsByLine?.[claim?.line_id] ?? null}
          hasPan={hasPan}
          annualGrossInr={annualGrossInr}
        />
      </div>
    )
  }

  return (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <p className="text-[12px] font-extrabold uppercase tracking-wider text-ink-mute">
        Your payouts
      </p>
      <p className="mt-0.5 text-[12px] font-semibold text-ink-mute">
        Everything you have asked for, and where it got to. Amounts are your
        share of the job — TCS and TDS are deposited for you out of it.
      </p>
      <ul className="mt-2 divide-y divide-ink/[0.06]">
        {rows.map(c => (
          <li key={c.id ?? c.line_id}>
           <button
             type="button"
             onClick={() => setOpen(c.id ?? c.line_id)}
             className="flex w-full items-start gap-3 py-2.5 text-left"
           >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13.5px] font-extrabold tabular-nums text-ink">
                  {formatINR(Math.round((c.amount_paise ?? 0) / 100))}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${TONE[c.status] ?? TONE.requested}`}>
                  {SAYS[c.status] ?? c.status}
                </span>
              </span>
              <span className="mt-0.5 block text-[11.5px] font-semibold leading-snug text-ink-mute">
                Asked {when(c.requested_at)}
                {c.destination ? ` · to ${c.destination}` : ''}
              </span>
              {c.status === 'paid' && (
                <span className="block text-[11.5px] font-semibold leading-snug text-forest-700">
                  Sent {when(c.settled_at) ?? 'recently'}
                  {/* The reference is what a partner quotes at the bank
                      counter. It is the whole reason this list is worth
                      having, so it is not hidden behind a tap. */}
                  {c.reference ? ` · ref ${c.reference}` : ''}
                </span>
              )}
              {c.status === 'rejected' && (
                <span className="block text-[11.5px] font-semibold leading-snug text-rose-700">
                  {c.note || 'We could not send this one. Please get in touch.'}
                </span>
              )}
            </span>
            <ChevronRight size={15} className="mt-1 shrink-0 text-ink-mute" />
           </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
