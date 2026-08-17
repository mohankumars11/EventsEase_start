import { useState } from 'react'
import { Check, ChevronDown, Info, Package } from 'lucide-react'
import { LEDGER_STEPS } from '../../lib/serviceLedger'

/**
 * Every service on this celebration, each with its own six ticks.
 *
 * ── Why a per-service list and not just a stage word ──────────────────────
 * "Arranging" is the right answer to the first question somebody has and the
 * wrong answer to the second. A wedding is eleven bookings; a customer who has
 * paid for eleven wants to know which eleven are done, not that the whole
 * thing is somewhere in the middle. That question is asked of a coordinator on
 * the phone constantly, and answering it on a screen is most of what this
 * tracker is for.
 *
 * ── Green means booked, and nothing else ──────────────────────────────────
 * Every tick here traces to a row somebody wrote — see `lib/serviceLedger.js`
 * for which row, per step. A grey step is not "probably fine", it is "not yet",
 * and the note at the bottom says so in those words. That is the entire value
 * of the screen: a tick nobody can trust makes the ten beside it worthless.
 *
 * ── Collapsed by default, and why ─────────────────────────────────────────
 * Eleven services × six steps is sixty-six dots. Expanded, that is a wall
 * nobody reads; as one row per service with a six-dot rail and a state word,
 * it scans in about four seconds on a phone. The detail is one tap away for
 * the one service somebody actually came to check.
 */
export default function ServiceLedger({ ledger, className = '' }) {
  if (!ledger || ledger.services.length === 0) return null

  const { counts } = ledger

  return (
    <section className={`overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline/[0.08] ${className}`}>
      <div className="border-b border-hairline/[0.08] px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[14px] font-extrabold text-ink">Everything you ordered</h2>
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-ink-mute">
            {counts.total} {counts.total === 1 ? 'service' : 'services'}
          </span>
        </div>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">
          {/* Two numbers, never one. "3 of 11 delivered" on the morning of a
              wedding reads as a disaster when in fact all eleven are booked —
              booked is the number that answers the worry. */}
          {ledger.cancelled
            ? 'This celebration was cancelled.'
            : counts.delivered === counts.total
              ? 'All delivered. Thank you for celebrating with us.'
              : `${counts.booked} of ${counts.total} booked and confirmed for your date.`}
        </p>
      </div>

      {/* The package the services came out of, named. Somebody who chose the
          complete package should see it called that, above the list it
          expands into. */}
      {ledger.packages.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline/[0.06] bg-surface-sunk/[0.03] px-4 py-2.5">
          <Package size={13} className="shrink-0 text-accent" />
          {ledger.packages.map(p => (
            <span key={p.id} className="text-[11.5px] font-extrabold text-ink">{p.name}</span>
          ))}
        </div>
      )}

      <ul className="divide-y divide-hairline/[0.06]">
        {ledger.services.map(svc => <ServiceRow key={svc.key} service={svc} />)}
      </ul>

      {ledger.notes.length > 0 && (
        <div className="space-y-1.5 border-t border-hairline/[0.08] bg-surface-sunk/[0.04] px-4 py-3">
          {ledger.notes.map(n => (
            <p key={n} className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-mute">
              <Info size={12} className="mt-0.5 shrink-0" />
              {n}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}

/* ── One service ──────────────────────────────────────────────────────── */

function ServiceRow({ service }) {
  const [open, setOpen] = useState(false)

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-sunk/[0.04]"
      >
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[15px] ${
            service.complete ? 'bg-forest-50' : 'bg-surface-sunk/[0.06]'
          }`}
        >
          {service.emoji}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="truncate text-[13px] font-extrabold text-ink">{service.name}</span>
            {service.quantity > 1 && (
              <span className="shrink-0 text-[11px] font-bold text-ink-mute">× {service.quantity}</span>
            )}
          </span>
          {service.detail && (
            <span className="mt-0.5 block truncate text-[11px] text-ink-mute">{service.detail}</span>
          )}
          <StepRail steps={service.steps} cancelled={service.cancelled} />
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className={`text-[11px] font-extrabold ${
            service.cancelled ? 'text-ink-mute'
              : service.complete ? 'text-forest-700'
              : 'text-ink-soft'
          }`}>
            {service.currentLabel}
          </span>
          <ChevronDown
            size={14}
            className={`text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <ol className="space-y-2 border-t border-hairline/[0.05] bg-surface-sunk/[0.02] px-4 py-3">
          {service.steps.map(step => (
            <li key={step.key} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className={`mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  step.reached
                    ? 'bg-forest-500 text-white'
                    : 'bg-surface-sunk/[0.1] text-ink-mute ring-1 ring-hairline/10'
                }`}
              >
                {step.reached ? <Check size={11} strokeWidth={4} /> : step.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className={`text-[12px] ${step.reached ? 'font-extrabold text-ink' : 'font-bold text-ink-mute'}`}>
                    {step.label}
                  </span>
                  {/* Three distinct truths, never collapsed: a real time, a
                      step that happened but was never timestamped, and a step
                      that has not happened. The same rule JourneyStepper
                      follows. */}
                  <span className="text-[10.5px] tabular-nums text-ink-mute">
                    {step.at
                      ? new Date(step.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : step.reached ? 'time not recorded' : ''}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-mute">
                  {step.reached ? step.done : step.waiting}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}

/* ── The six-dot rail ─────────────────────────────────────────────────────
 *
 * Deliberately not a percentage bar. A bar invites the reading "60% done",
 * which is not what six discrete bookings-and-confirmations mean; six dots
 * with the reached ones filled says exactly as much as is true and no more.
 */
function StepRail({ steps, cancelled }) {
  const reached = steps.filter(s => s.reached).length
  return (
    <span
      className="mt-1.5 flex items-center gap-1"
      role="img"
      aria-label={`${reached} of ${steps.length} steps complete`}
    >
      {steps.map((s, i) => (
        <span
          key={s.key}
          aria-hidden="true"
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            cancelled ? 'bg-ink/10'
              : s.reached ? 'bg-forest-500'
              : 'bg-surface-sunk/[0.12]'
          }`}
          style={{ maxWidth: 26 }}
          data-step={i}
        />
      ))}
    </span>
  )
}

/** The step vocabulary, for anything that wants to print a legend. */
export { LEDGER_STEPS }
