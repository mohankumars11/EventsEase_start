import { Lock, LockOpen, Check, Clock3, Info, ArrowRight, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { formatINR } from '../../utils/format'
import {
  buildSchedule, PLAN_LIST, GST_NOTE, defaultPlanFor, SCHEDULE_VERSION,
} from '../../config/celebrationPayments'

/**
 * What is owed, when, and — the part that matters — what each payment starts.
 *
 * ── Why the unlocks are the feature ───────────────────────────────────────
 * A percentage is an ask. "This buys the provisions and confirms your cooks"
 * is a reason. Asking somebody for ₹40,000 with a due date and no explanation
 * is how a booking stalls; asking with the sentence attached is how it gets
 * paid, and it costs nothing to build because the services are already
 * recorded on the booking.
 *
 * ── The customer picks the split ──────────────────────────────────────────
 * Four plans — 25% × 4, 50% × 2, 75% + 25%, or all of it — and every one of
 * them finishes before the day. Nothing is collected after the celebration,
 * because chasing money from somebody whose wedding is over is a collections
 * problem nobody in this business wants.
 *
 * The gates that release work are keyed on HOW MUCH is paid, not on which
 * instalment carried it, so switching plans or paying early never releases
 * less. See UNLOCK_GATES.
 *
 * ── A claim unlocks nothing ───────────────────────────────────────────────
 * A tick appears only for `ADMIN_VERIFIED` or `GATEWAY_VERIFIED`. Pressing
 * "I've paid" moves the row to *Checking* and moves no lock. Direct UPI has
 * no callback, so a claim is a sentence somebody typed — and a gate a
 * sentence can open is decoration the first customer to notice will take as
 * licence to disbelieve everything else here.
 */
export default function PaymentLadder({
  subjectType,
  subjectId,
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
  const [paying, setPaying] = useState(null)
  const [error, setError] = useState(null)

  const chosen = plan ?? defaultPlanFor(confirmedTotal)
  const schedule = buildSchedule({
    confirmedTotal, taxTotal, eventDate, approvedAt, payments, services, plan: chosen,
  })
  const priced = schedule.basis === 'confirmed'

  /**
   * Open a payment for one instalment.
   *
   * The amount is deliberately NOT sent — the endpoint recomputes it from the
   * confirmed quote server-side. A client that could name its own amount
   * could name ₹1.
   */
  async function pay(row) {
    if (!subjectId || paying) return
    setPaying(row.id)
    setError(null)
    try {
      const res = await fetch('/api/create-milestone-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectType, subjectId, milestoneId: row.id,
          plan: chosen, scheduleVersion: SCHEDULE_VERSION,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // The gateway not being configured yet is the expected state
        // pre-launch, and says so rather than looking broken.
        setError(data?.error ?? 'Could not open a payment just now.')
        return
      }
      window.dispatchEvent(new CustomEvent('sambramo:milestone-payment', { detail: { ...data, row } }))
    } catch {
      setError('Could not reach the payment service. Please try again.')
    } finally {
      setPaying(null)
    }
  }

  return (
    <section className={`overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline/[0.08] ${className}`}>
      <div className="border-b border-hairline/[0.08] px-4 py-3.5">
        <h3 className="text-[14px] font-extrabold text-ink">How you pay for this</h3>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">
          {priced
            ? 'Pick how to split it. Every plan is settled before your day, and each payment releases the next piece of work.'
            : 'Your coordinator confirms the price first — then these become real amounts.'}
        </p>
      </div>

      {/* ── How much progress the money has made ────────────────────
          One bar, before any detail. On a phone this is the answer to the
          only question somebody opens this panel with. */}
      {priced && (
        <div className="border-b border-hairline/[0.08] px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12px] font-bold text-ink-soft">
              {formatINR(schedule.paidTotal)} paid
            </span>
            <span className="text-[12px] font-bold text-ink-mute">
              {schedule.outstanding > 0 ? `${formatINR(schedule.outstanding)} to go` : 'Fully paid 🎉'}
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunk/[0.08]"
            role="progressbar"
            aria-valuenow={Math.round(schedule.paidPct * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Payment progress"
          >
            <span
              className="block h-full rounded-full bg-forest-500 transition-all duration-500"
              style={{ width: `${Math.max(schedule.paidPct * 100, schedule.paidTotal > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── The split ────────────────────────────────────────────────
          Offered only once there is a confirmed number to compare. Before
          that every plan is the same list of percentages, and a chooser
          with nothing to choose between is furniture. */}
      {priced && onPlanChange && !schedule.allSettled && (
        <div className="border-b border-hairline/[0.08] px-4 py-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-mute">
            Choose your split
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PLAN_LIST.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPlanChange(p.id)}
                aria-pressed={chosen === p.id}
                className={`rounded-xl px-3 py-2.5 text-left transition-colors ${
                  chosen === p.id
                    ? 'bg-accent/[0.08] ring-2 ring-accent'
                    : 'bg-surface-sunk/[0.05] ring-1 ring-hairline/10 hover:bg-surface-sunk/[0.08]'
                }`}
              >
                <span className="flex items-baseline justify-between gap-1">
                  <span className="text-[12.5px] font-extrabold text-ink">{p.label}</span>
                  <span className="text-[10.5px] font-bold text-ink-mute">{p.short}</span>
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-mute">{p.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── The line-by-line ─────────────────────────────────────── */}
      <ol className="divide-y divide-hairline/[0.06]">
        {schedule.hold.lines.length > 0 && (
          <Rung
            row={{
              id: 'hold', label: 'Hold your date', amount: schedule.hold.amount,
              gst: null, dueAt: null, settled: schedule.hold.settled,
              status: schedule.hold.status, share: null, n: 0, of: 0,
              customerCopy: 'Your coordinator stops offering your date to anyone else. It comes off your first payment.',
            }}
            priced
            taxLabel={schedule.taxLabel}
          />
        )}

        {schedule.rows.map(row => (
          <Rung
            key={row.id}
            row={row}
            priced={priced}
            taxLabel={schedule.taxLabel}
            onPay={priced && subjectId ? () => pay(row) : null}
            paying={paying === row.id}
          />
        ))}
      </ol>

      {error && (
        <p className="border-t border-hairline/[0.08] bg-chilli-50 px-4 py-3 text-[11.5px] leading-relaxed text-chilli-800">
          {error}
        </p>
      )}

      {/* ── What the money has released ──────────────────────────── */}
      {schedule.gates.length > 0 && (
        <div className="border-t border-hairline/[0.08] px-4 py-3.5">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-mute">
            What your payments release
          </p>
          <ol className="space-y-3">
            {schedule.gates.map(gate => (
              <li key={gate.atPct}>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      gate.open ? 'bg-forest-500 text-white' : 'bg-surface-sunk/[0.1] text-ink-mute'
                    }`}
                  >
                    {gate.open ? <Check size={12} strokeWidth={3.5} /> : <Lock size={10} />}
                  </span>
                  <span className={`text-[12px] font-extrabold ${gate.open ? 'text-ink' : 'text-ink-mute'}`}>
                    {gate.label}
                  </span>
                  <span className="ml-auto text-[10.5px] font-bold text-ink-mute">
                    at {Math.round(gate.atPct * 100)}%
                  </span>
                </div>
                <ul className="ml-7 mt-1 space-y-0.5">
                  {gate.lines.map(l => (
                    <li key={l.key} className="flex items-start gap-1.5">
                      {gate.open
                        ? <LockOpen size={10} className="mt-[3px] shrink-0 text-forest-600" />
                        : <Lock size={10} className="mt-[3px] shrink-0 text-ink-mute/70" />}
                      <span className={`text-[11.5px] leading-snug ${gate.open ? 'text-ink-soft' : 'text-ink-mute'}`}>
                        {l.line}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── The sentence that does the persuading ────────────────────
          Most people in this market assume instalments carry a surcharge,
          because they usually do. Saying plainly that ours do not is worth
          more than any badge — and check-payment-schedule.mjs asserts the
          arithmetic matches it, so it cannot quietly become false. */}
      <div className="border-t border-hairline/[0.08] bg-surface-sunk/[0.04] px-4 py-3.5">
        <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft">
          <Info size={13} className="mt-0.5 shrink-0 text-forest-600" />
          <span>
            <span className="font-extrabold text-ink">{GST_NOTE.headline}</span>{' '}
            {GST_NOTE.body}
          </span>
        </p>
        {priced && <p className="mt-2 text-[11px] text-ink-mute">{GST_NOTE.estimated}</p>}
      </div>
    </section>
  )
}

/* ── One line ─────────────────────────────────────────────────────────── */

const STATUS_CHIP = {
  paid:      { label: 'Received',  cls: 'bg-forest-50 text-forest-700 ring-forest-500/20' },
  checking:  { label: 'Checking',  cls: 'bg-saffron-400/15 text-saffron-700 ring-saffron-500/25' },
  refunded:  { label: 'Refunded',  cls: 'bg-surface-sunk/[0.08] text-ink-mute ring-hairline/10' },
  cancelled: { label: 'Cancelled', cls: 'bg-surface-sunk/[0.08] text-ink-mute ring-hairline/10' },
}

function Rung({ row, priced, taxLabel, onPay, paying }) {
  const chip = STATUS_CHIP[row.status]
  const settled = row.settled

  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        {/* The tick. One glance down this column says how far along you are. */}
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            settled ? 'bg-forest-500 text-white' : 'bg-surface-sunk/[0.07] text-ink-mute ring-1 ring-hairline/10'
          }`}
        >
          {settled ? <Check size={15} strokeWidth={3.5} /> : <Lock size={12} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-[13px] font-extrabold text-ink">
              {row.label}
              {row.share != null && (
                <span className="ml-1.5 text-[11px] font-bold text-ink-mute">
                  {Math.round(row.share * 100)}%
                </span>
              )}
            </span>
            <span className="text-[13px] font-extrabold tabular-nums text-ink">
              {/* Percentages until a coordinator has confirmed a price. A
                  rupee figure before then would be derived from the estimate
                  range — a number with a due date that no supplier has agreed
                  to. See config/celebrationPayments.js. */}
              {priced && row.amount != null
                ? formatINR(row.amount)
                : `${Math.round((row.share ?? 0) * 100)}%`}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
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
              <span className="text-[11px] text-ink-mute">₹1,000 hold taken off</span>
            )}
            {row.gst != null && (
              <span className="text-[11px] text-ink-mute">incl. {formatINR(row.gst)} {taxLabel}</span>
            )}
          </div>

          {row.customerCopy && (
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">{row.customerCopy}</p>
          )}

          {/* ── The pay link, on the line it pays ──────────────────
              48px tall, full width, on the row itself — a payment button
              that lives at the bottom of the card makes you scroll away
              from the amount you are agreeing to. */}
          {onPay && !settled && row.status !== 'refunded' && row.status !== 'cancelled' && (
            <button
              type="button"
              onClick={onPay}
              disabled={paying}
              className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-forest-600 px-4 text-[13px] font-extrabold text-white transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              {paying
                ? <><Loader2 size={15} className="animate-spin" /> Opening…</>
                : <>
                    {row.status === 'checking' ? 'Pay again' : `Pay ${formatINR(row.amount)}`}
                    <ArrowRight size={14} strokeWidth={3} />
                  </>}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
