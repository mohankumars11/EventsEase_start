import { useState } from 'react'
import { Lock, LockOpen, Check, Clock3, Info, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { formatINR } from '../../utils/format'
import { buildSettlement, PAYMENT_NOTE } from '../../config/celebrationPayments'
import { openCelebrationPayment, PAYMENT_RESULT } from '../../lib/celebrationPayment'

/**
 * What this celebration costs, and the one button that pays it.
 *
 * ── Why this replaced the instalment ladder ───────────────────────────────
 * This panel used to offer four splits and three unlock gates. The reasoning
 * for dropping them is in the header of `config/celebrationPayments.js` and it
 * is operational, not cosmetic: a part-paid celebration is a part-booked
 * celebration, and there is no honest position to hold three days out with
 * half the money. What survives is the part that was actually doing the work —
 * saying what the payment sets in motion.
 *
 * ── The unlocks are still the feature ─────────────────────────────────────
 * A number is an ask. "This buys the provisions and confirms your cooks" is a
 * reason. Asking somebody for ₹40,000 with a due date and no explanation is
 * how a booking stalls; asking with the sentence attached is how it gets paid,
 * and it costs nothing to build because the services are already recorded on
 * the booking.
 *
 * ── A claim releases nothing ──────────────────────────────────────────────
 * The tick appears only for `ADMIN_VERIFIED` or `GATEWAY_VERIFIED`. Paying at
 * the gateway moves the row to *Checking* and moves no lock, because direct
 * UPI has no callback and the webhook is the only witness. A lock a claim can
 * open is decoration, and the first customer to notice would take it as
 * licence to disbelieve everything else on this screen.
 */
export default function SettlePayment({
  subjectType,
  subjectId,
  confirmedTotal = null,
  taxTotal = null,
  eventDate = null,
  approvedAt = null,
  payments = [],
  services = [],
  contact = {},
  label,
  onPaid,
  className = '',
}) {
  const settlement = buildSettlement({
    confirmedTotal, taxTotal, eventDate, approvedAt, payments, services,
  })
  const priced = settlement.basis === 'confirmed'
  const row = settlement.settlement

  return (
    <section className={`overflow-hidden a-card ${className}`}>
      <div className="border-b border-hairline/[0.08] px-4 py-3.5">
        <h3 className="text-[14px] font-extrabold text-ink">How you pay for this</h3>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">
          {priced
            ? 'One payment for the whole celebration. Nothing is collected after the day, and there is no balance to remember.'
            : 'One payment, once your coordinator has confirmed the price. The amount fills in here.'}
        </p>
      </div>

      {/* ── Why there is nothing to pay yet ──────────────────────────
          Without this the panel is a heading and no button, and a customer
          reasonably reads that as broken. It is not broken — there is
          genuinely no number to charge against until a coordinator has
          priced the celebration, because the estimate is a range nobody has
          agreed to. Saying which step unlocks it is the difference between
          a dead panel and a queue position. */}
      {!priced && (
        <p className="flex items-start gap-2 border-b border-hairline/[0.08] bg-saffron-400/[0.12] px-4 py-3 text-[11.5px] leading-relaxed text-ink-soft">
          <Info size={13} className="mt-0.5 shrink-0 text-saffron-700" />
          <span>
            <span className="font-extrabold text-ink">Nothing to pay yet.</span>{' '}
            Your coordinator is sourcing and pricing this. When your plan arrives and
            you approve it, the confirmed price appears here with a payment link beside it.
          </span>
        </p>
      )}

      {/* ── The amount, and the button ──────────────────────────────── */}
      {priced && (
        <div className="border-b border-hairline/[0.08] px-4 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-bold text-ink-soft">
              {settlement.settled ? 'Paid in full' : 'To pay'}
            </span>
            <span className="text-[22px] font-extrabold leading-none tabular-nums text-ink">
              {formatINR(settlement.settled ? settlement.confirmedTotal : row.amount)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <StatusChip status={row.status} />
            {row.dueAt && !settlement.settled && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${row.overdue ? 'text-chilli-700' : 'text-ink-mute'}`}>
                <Clock3 size={11} />
                due {new Date(row.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {row.gst != null && (
              <span className="text-[11px] text-ink-mute">incl. {formatINR(row.gst)} {settlement.taxLabel}</span>
            )}
          </div>

          {/* Credits, itemised. Somebody who paid the ₹1,000 hold, or an
              instalment under the retired ladder, must be able to see their
              money in this number rather than take our word for the total. */}
          {(row.creditsHold || row.creditsLadder) && !settlement.settled && (
            <ul className="mt-2.5 space-y-1 rounded-xl bg-surface-sunk/[0.04] px-3 py-2">
              <li className="flex items-baseline justify-between gap-2 text-[11.5px] text-ink-mute">
                <span>Your celebration</span>
                <span className="tabular-nums">{formatINR(settlement.confirmedTotal)}</span>
              </li>
              {row.creditsHold && (
                <li className="flex items-baseline justify-between gap-2 text-[11.5px] text-forest-700">
                  <span>Less the hold you already paid</span>
                  <span className="tabular-nums">− {formatINR(settlement.hold.amount)}</span>
                </li>
              )}
              {row.creditsLadder && (
                <li className="flex items-baseline justify-between gap-2 text-[11.5px] text-forest-700">
                  <span>Less what you have already sent us</span>
                  <span className="tabular-nums">− {formatINR(settlement.legacyPaid)}</span>
                </li>
              )}
            </ul>
          )}

          {!settlement.settled && (
            <PayButton
              subjectType={subjectType}
              subjectId={subjectId}
              amount={row.amount}
              contact={contact}
              label={label}
              onPaid={onPaid}
              again={row.status === 'checking'}
              className="mt-3"
            />
          )}
        </div>
      )}

      {/* ── The hold, if one was taken ───────────────────────────────
          Listed as what it is — a pre-quote hold that comes off the one
          payment — rather than as a rung on a ladder that no longer exists. */}
      {settlement.hold.settled && (
        <div className="flex items-start gap-3 border-b border-hairline/[0.08] px-4 py-3">
          <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-500 text-white">
            <Check size={13} strokeWidth={3.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-extrabold text-ink">
              Your date is held — {formatINR(settlement.hold.amount)} received
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-mute">
              Your coordinator stopped offering your date to anyone else.
              {priced ? ' It has come off the amount above.' : ' It comes off your payment.'}
            </span>
          </span>
        </div>
      )}

      {/* ── What the money sets in motion ────────────────────────────
          One list, released together. That is the point of taking it in one
          payment: there is no state in which a celebration is three-quarters
          arranged. */}
      {settlement.releases.length > 0 && (
        <div className="px-4 py-3.5">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-mute">
            {settlement.released
              ? <><LockOpen size={11} className="text-forest-600" /> What your payment released</>
              : <><Lock size={11} /> What your payment sets in motion</>}
          </p>
          <ul className="space-y-1.5">
            {settlement.releases.map(l => (
              <li key={l.key} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                    settlement.released ? 'bg-forest-500 text-white' : 'bg-surface-sunk/[0.1] text-ink-mute'
                  }`}
                >
                  {settlement.released ? <Check size={10} strokeWidth={4} /> : <Lock size={8} />}
                </span>
                <span className={`text-[11.5px] leading-snug ${settlement.released ? 'text-ink-soft' : 'text-ink-mute'}`}>
                  {l.line}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── The sentence that does the persuading ────────────────────
          check-payment-schedule.mjs asserts the arithmetic behind every
          clause of it, so it cannot quietly become false. */}
      <div className="border-t border-hairline/[0.08] bg-surface-sunk/[0.04] px-4 py-3.5">
        <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft">
          <Info size={13} className="mt-0.5 shrink-0 text-forest-600" />
          <span>
            <span className="font-extrabold text-ink">{PAYMENT_NOTE.headline}</span>{' '}
            {PAYMENT_NOTE.body}
          </span>
        </p>
        {priced && <p className="mt-2 text-[11px] text-ink-mute">{PAYMENT_NOTE.estimated}</p>}
      </div>
    </section>
  )
}

/* ── The pay button ───────────────────────────────────────────────────────
 *
 * Exported, because the same payment is offered in two places on this screen:
 * here, and beside the confirmed total on the plan itself — which is where
 * somebody is actually looking at the number they are agreeing to. Two
 * buttons, one code path, so they cannot disagree about what is being charged.
 */
export function PayButton({
  subjectType, subjectId, amount, contact, label, onPaid,
  again = false, size = 'block', className = '',
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function pay() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const { result } = await openCelebrationPayment({ subjectType, subjectId, contact, label })
      if (result === PAYMENT_RESULT.claimed) onPaid?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const compact = size === 'compact'

  return (
    <div className={className}>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className={`flex items-center justify-center gap-2 rounded-xl bg-forest-600 font-extrabold text-white transition-transform active:scale-[0.99] disabled:opacity-60 ${
          compact
            ? 'min-h-[40px] px-3.5 text-[12.5px]'
            : 'min-h-[48px] w-full px-4 text-[13.5px]'
        }`}
      >
        {busy
          ? <><Loader2 size={15} className="animate-spin" /> Opening…</>
          : <>
              {again ? 'Pay again' : compact ? 'Pay now' : `Pay ${formatINR(amount)}`}
              <ArrowRight size={14} strokeWidth={3} />
            </>}
      </button>

      {/* Said once, next to the button, rather than in a terms page: this is
          a five-figure sum going out over UPI and the reassurance belongs at
          the moment of the tap. */}
      {!compact && !error && (
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[10.5px] text-ink-mute">
          <ShieldCheck size={11} className="text-forest-600" />
          Paid securely over UPI. We are told the moment it lands.
        </p>
      )}

      {error && (
        <p className="mt-2 rounded-xl bg-chilli-50 px-3 py-2 text-[11.5px] leading-relaxed text-chilli-800">
          {error}
        </p>
      )}
    </div>
  )
}

/* ── Status ───────────────────────────────────────────────────────────── */

const STATUS_CHIP = {
  paid:      { label: 'Received',  cls: 'bg-forest-50 text-forest-700 ring-forest-500/20' },
  checking:  { label: 'Checking',  cls: 'bg-saffron-400/15 text-saffron-700 ring-saffron-500/25' },
  refunded:  { label: 'Refunded',  cls: 'bg-surface-sunk/[0.08] text-ink-mute ring-hairline/10' },
  cancelled: { label: 'Cancelled', cls: 'bg-surface-sunk/[0.08] text-ink-mute ring-hairline/10' },
}

function StatusChip({ status }) {
  const chip = STATUS_CHIP[status]
  if (!chip) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${chip.cls}`}>
      {chip.label}
    </span>
  )
}
