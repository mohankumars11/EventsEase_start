import { Lock, LockOpen, Check, Clock3, Info } from 'lucide-react'
import { formatINR } from '../../utils/format'
import {
  buildSchedule, PAYMENT_PLANS, GST_NOTE, defaultPlanFor,
} from '../../config/celebrationPayments'

/**
 * What is owed, when, and — the part that matters — what each payment starts.
 *
 * ── Why the unlocks are the feature ───────────────────────────────────────
 * A percentage is an ask. "This buys the provisions and confirms your cooks"
 * is a reason. Asking somebody for ₹40,000 with a due date and no explanation
 * is how a booking stalls; asking for it with the sentence attached is how it
 * gets paid, and the difference costs nothing to build because the services
 * are already recorded on the booking.
 *
 * Every line is derived from THIS celebration's own services — see
 * `unlocksFor()`. A booking with no catering is never told a payment buys
 * groceries, which is the same invented-progress failure the tracker exists to
 * avoid, wearing a friendlier face.
 *
 * ── Locked steps are shown, not hidden ────────────────────────────────────
 * The whole road is on screen from the first day, greyed ahead of where the
 * money has reached. Hiding future work would make the plan look shorter than
 * it is and rob the ladder of the one thing it is for: showing somebody that
 * their money moves a real process forward, in a real order.
 *
 * ── A claim unlocks nothing ───────────────────────────────────────────────
 * `isSettled()` accepts only `ADMIN_VERIFIED` or `GATEWAY_VERIFIED`. A
 * customer pressing "I've paid" changes the row to `checking` and moves no
 * lock. Direct UPI has no callback, so a claim is a sentence somebody typed —
 * and if a sentence opened the gate, the gate would be decoration, which the
 * first customer to notice would take as licence to disbelieve everything else
 * on this screen.
 */
export default function PaymentLadder({
  confirmedTotal = null,
  taxTotal = null,
  eventDate = null,
  approvedAt = null,
  payments = [],
  services = [],
  plan,
  onPlanChange,
  className = '',
}) {
  const chosen = plan ?? defaultPlanFor(confirmedTotal)
  const schedule = buildSchedule({
    confirmedTotal, taxTotal, eventDate, approvedAt, payments, services, plan: chosen,
  })
  const priced = schedule.basis === 'confirmed'

  return (
    <section className={`overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline/[0.08] ${className}`}>
      <div className="border-b border-hairline/[0.08] px-4 py-3.5">
        <h3 className="text-[14px] font-extrabold text-ink">How you pay for this</h3>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">
          {priced
            ? 'Each payment releases the next piece of work on your celebration.'
            : 'Your coordinator confirms the price first — then these become real amounts.'}
        </p>
      </div>

      {/* ── The plan choice ──────────────────────────────────────────
          Offered only once there is a confirmed number to compare. Before
          that both plans are the same list of percentages, and a chooser
          with nothing to choose between is furniture. */}
      {priced && onPlanChange && (
        <div className="flex gap-2 border-b border-hairline/[0.08] px-4 py-3">
          {Object.values(PAYMENT_PLANS).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPlanChange(p.id)}
              aria-pressed={chosen === p.id}
              className={`flex-1 rounded-xl px-3 py-2.5 text-left transition-colors ${
                chosen === p.id
                  ? 'bg-accent/[0.08] ring-2 ring-accent'
                  : 'bg-surface-sunk/[0.05] ring-1 ring-hairline/10 hover:bg-surface-sunk/[0.08]'
              }`}
            >
              <span className="block text-[12.5px] font-extrabold text-ink">{p.label}</span>
              <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-mute">{p.blurb}</span>
            </button>
          ))}
        </div>
      )}

      <ol className="divide-y divide-hairline/[0.06]">
        {schedule.rows.map(row => (
          <Rung key={row.id} row={row} priced={priced} taxLabel={schedule.taxLabel} />
        ))}
      </ol>

      {/* ── The sentence that does the persuading ────────────────────
          Most people in this market assume instalments carry a surcharge,
          because they usually do. Saying plainly that ours do not is worth
          more than any badge — and `check-payment-schedule.mjs` asserts the
          arithmetic actually matches it, so it cannot quietly become false. */}
      <div className="border-t border-hairline/[0.08] bg-surface-sunk/[0.04] px-4 py-3.5">
        <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft">
          <Info size={13} className="mt-0.5 shrink-0 text-forest-600" />
          <span>
            <span className="font-extrabold text-ink">{GST_NOTE.headline}</span>{' '}
            {GST_NOTE.body}
          </span>
        </p>
        {priced && (
          <p className="mt-2 text-[11px] text-ink-mute">
            {GST_NOTE.estimated}
            {schedule.outstanding > 0 && (
              <> · <span className="font-bold text-ink-soft">{formatINR(schedule.outstanding)}</span> still to pay</>
            )}
          </p>
        )}
      </div>
    </section>
  )
}

/* ── One rung ─────────────────────────────────────────────────────────── */

const STATUS_CHIP = {
  paid:      { label: 'Received',  cls: 'bg-forest-50 text-forest-700 ring-forest-500/20' },
  checking:  { label: 'Checking',  cls: 'bg-saffron-400/15 text-saffron-700 ring-saffron-500/25' },
  refunded:  { label: 'Refunded',  cls: 'bg-surface-sunk/[0.08] text-ink-mute ring-hairline/10' },
  cancelled: { label: 'Cancelled', cls: 'bg-surface-sunk/[0.08] text-ink-mute ring-hairline/10' },
}

function Rung({ row, priced, taxLabel }) {
  const chip = STATUS_CHIP[row.status]
  const settled = row.unlocked

  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            settled ? 'bg-forest-50 text-forest-700' : 'bg-surface-sunk/[0.07] text-ink-mute'
          }`}
        >
          {settled ? <Check size={14} strokeWidth={3} /> : <Lock size={13} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-[13px] font-extrabold text-ink">{row.label}</span>
            <span className="text-[13px] font-extrabold tabular-nums text-ink">
              {/* Percentages until a coordinator has confirmed a price. A
                  rupee figure here before then would be derived from the
                  estimate range — a number with a due date that no supplier
                  has agreed to. See config/celebrationPayments.js. */}
              {priced || row.kind === 'flat'
                ? formatINR(row.amount)
                : `${Math.round(row.share * 100)}%`}
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {chip && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${chip.cls}`}>
                {chip.label}
              </span>
            )}
            {row.dueAt && !settled && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${row.overdue ? 'text-chilli-700' : 'text-ink-mute'}`}>
                <Clock3 size={11} />
                due {new Date(row.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {row.creditsHold && (
              <span className="text-[11px] text-ink-mute">₹1,000 hold already taken off</span>
            )}
            {row.gst != null && (
              // `TAX_LABEL` verbatim — it is "GST (estimated)", and lowercasing
              // it produced "gst", which reads as a typo on a tax line.
              <span className="text-[11px] text-ink-mute">incl. {formatINR(row.gst)} {taxLabel}</span>
            )}
          </div>

          {row.customerCopy && (
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">{row.customerCopy}</p>
          )}

          {/* ── What it releases ─────────────────────────────────────
              Open padlocks once the money is verified, closed ones before.
              This is the whole reason the ask is legible. */}
          {row.unlocks.length > 0 && (
            <ul className="mt-2 space-y-1">
              {row.unlocks.map(u => (
                <li key={u.key} className="flex items-start gap-1.5">
                  {settled
                    ? <LockOpen size={11} className="mt-[3px] shrink-0 text-forest-600" />
                    : <Lock size={11} className="mt-[3px] shrink-0 text-ink-mute/70" />}
                  <span className={`text-[11.5px] leading-snug ${settled ? 'text-ink-soft' : 'text-ink-mute'}`}>
                    {u.line}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}
