import { PiggyBank, Ticket, Truck, ArrowUpRight, Sparkles } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * What this basket has saved, and the one thing still worth doing.
 *
 * ── Two figures that must never be added together ───────────────────────
 * `saved` is money already off the bill. `potential` includes a coupon that is
 * sitting there uncollected. Those are different claims and this component
 * keeps them visually apart on purpose: the big number is only ever `saved`,
 * and anything claimable is rendered as an action, in a different colour, with
 * a verb on it.
 *
 * That separation is the entire reason this exists as a component rather than
 * a line in the summary card. The natural thing to build — one "You saved
 * ₹700!" badge summing everything available — is read by the customer as the
 * bill they are about to pay, and it is wrong by however much they never
 * claimed. The correction arrives on the payment screen, which is the worst
 * possible place for it.
 *
 * ── One nudge, never three ──────────────────────────────────────────────
 * `savings.nudge` has already picked the single most valuable next action (see
 * lib/savings). This renders that one and no others. A cart that simultaneously
 * asks you to apply a code, add ₹212 for free delivery and add ₹500 for a
 * better coupon has issued three instructions, and three instructions reliably
 * produce none.
 */
export default function SavingsStack({ savings, onUseCode, className = '' }) {
  if (!savings) return null
  const { saved, earned, claimable, nudge } = savings
  if (saved <= 0 && claimable.length === 0 && !nudge) return null

  return (
    <div className={`space-y-2 ${className}`}>

      {/* ── Banked ──
          Only rendered when there is something in it. A "₹0 saved" row is a
          reminder that you are paying full price, printed by us, next to the
          total. */}
      {saved > 0 && (
        <div className="overflow-hidden rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
          <div className="flex items-center gap-2 border-b border-emerald-100/70 px-3.5 py-2.5">
            <PiggyBank size={15} className="shrink-0 text-emerald-600" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-emerald-700">
              You’re saving
            </span>
            <span className="ml-auto text-[15px] font-extrabold text-emerald-700">
              {formatINR(saved)}
            </span>
          </div>
          <ul className="divide-y divide-emerald-100/60">
            {earned.map(line => (
              <li key={line.key} className="flex items-center gap-2 px-3.5 py-2">
                {line.key === 'delivery'
                  ? <Truck size={12} className="shrink-0 text-emerald-500" />
                  : <Ticket size={12} className="shrink-0 text-emerald-500" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-bold text-emerald-800">{line.label}</p>
                  <p className="truncate text-[10.5px] text-emerald-600/80">{line.detail}</p>
                </div>
                <span className="shrink-0 text-[11.5px] font-bold text-emerald-700">
                  −{formatINR(line.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── The one next thing ──
          A claim is a button, because it is one tap and costs nothing. A gap
          is a sentence, because the action is "go and shop", which no button
          on this card can perform honestly. */}
      {nudge && nudge.kind === 'claim' && (
        <button
          type="button"
          onClick={() => onUseCode?.(nudge.code)}
          className="flex w-full items-center gap-2.5 rounded-2xl border border-dashed border-chilli-300 bg-chilli-50 px-3.5 py-3 text-left transition-colors hover:bg-chilli-100"
        >
          <Ticket size={16} className="shrink-0 text-chilli-600" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-extrabold leading-tight text-chilli-800">
              Take {formatINR(nudge.amount)} off with{' '}
              <span className="font-mono">{nudge.code}</span>
            </p>
            <p className="mt-0.5 text-[10.5px] text-chilli-600">
              Your bag already qualifies — tap to apply
            </p>
          </div>
          <ArrowUpRight size={15} className="shrink-0 text-chilli-500" />
        </button>
      )}

      {nudge && nudge.kind !== 'claim' && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 px-3.5 py-3 ring-1 ring-amber-100">
          <Sparkles size={15} className="mt-px shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="text-[11.5px] font-bold leading-snug text-amber-900">{nudge.text}</p>
            {/* The gap, drawn. A number in a sentence is information; a bar
                that is nearly full is a reason to close it. */}
            {nudge.shortfall > 0 && (
              <ProgressToThreshold
                shortfall={nudge.shortfall}
                subtotal={savings.subtotal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * How close the basket is to the threshold in the nudge above it.
 *
 * Scaled against the threshold itself (subtotal + shortfall), so the bar means
 * "how much of the way there you are" rather than an arbitrary fraction. Given
 * a floor of 8% so that a nearly-empty bag still shows a bar with something in
 * it — an empty track reads as broken rather than as early.
 */
function ProgressToThreshold({ shortfall, subtotal }) {
  const threshold = subtotal + shortfall
  const pct = threshold > 0 ? Math.max(8, Math.min(100, (subtotal / threshold) * 100)) : 0

  return (
    <div className="mt-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-amber-200/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-saffron-500 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] font-semibold text-amber-700/80">
        {formatINR(subtotal)} of {formatINR(threshold)}
      </p>
    </div>
  )
}
