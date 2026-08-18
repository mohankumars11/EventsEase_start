import { useState, useMemo } from 'react'
import { Clock, Check, CalendarDays, Info } from 'lucide-react'
import { deliveryPlan, dayLabel, dayDate } from '../../lib/deliveryPromise'
import { formatINR } from '../../utils/format'

/**
 * When do you want it, and in which two hours.
 *
 * ── The one screen where this category loses people ──────────────────────
 * The pattern everywhere else is: pick a date, pay, and find out the window
 * afterwards (or never). That produces the two complaints that dominate every
 * review page in this market — "waited in all day" and "arrived after the
 * party". Both are scheduling decisions dressed up as logistics limits.
 *
 * So the slot is chosen BEFORE the money, it is two hours wide, and the board
 * only ever offers slots that are genuinely still reachable: `deliveryPlan`
 * filters against the product's own prep time and each slot's cut-off, so a
 * cake at 8 PM simply has no same-day row to tap rather than a greyed one
 * with an explanation.
 *
 * ── The fee is on the chip, not on the bill ──────────────────────────────
 * A midnight delivery costs more and that is fine. What is not fine is
 * discovering it as a line item after the basket. Every chip carries its own
 * price, and the free ones say FREE — which also flattens the evening peak
 * for nothing, because a good number of people genuinely do not mind when it
 * comes and will take the free slot if you show them one.
 */
export default function DeliveryPicker({
  product,
  value,                 // { date: iso, slot: id } | null
  onChange,
  className = '',
}) {
  const plan = useMemo(() => deliveryPlan(product, { horizon: 12 }), [product])
  const [showAll, setShowAll] = useState(false)

  // Three day chips fit a phone; the rest live behind "More dates". Opening
  // that is a deliberate act, so it stays open once tapped.
  const visibleDays = showAll ? plan.days : plan.days.slice(0, 3)

  const selectedDay = plan.days.find(d => d.iso === value?.date) ?? null
  const slots = selectedDay?.slots ?? []

  if (!plan.days.length) {
    return (
      <div className={`rounded-2xl border border-hairline/10 bg-surface-sunk/[0.03] p-4 ${className}`}>
        <p className="text-[12.5px] font-bold text-ink">We cannot schedule this one online yet.</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
          Add it to your bag and we will call to agree a date — rather than take your money against a
          slot we are not sure we can make.
        </p>
      </div>
    )
  }

  const freeCount = slots.filter(s => s.free).length

  return (
    <section className={`rounded-2xl border border-hairline/10 bg-white ${className}`}>
      <div className="flex items-center gap-2 border-b border-hairline/[0.08] px-4 py-3">
        <CalendarDays size={15} className="shrink-0 text-forest-700" />
        <h3 className="text-[13px] font-extrabold text-ink">When should it arrive?</h3>
      </div>

      <div className="p-4">
        {/* ── The days ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {visibleDays.map(d => {
            const active = d.iso === value?.date
            return (
              <button
                key={d.iso}
                onClick={() => onChange?.({ date: d.iso, slot: null })}
                className={[
                  'min-w-[86px] shrink-0 rounded-xl border px-3 py-2 text-left transition-colors',
                  active
                    ? 'border-forest-700 bg-forest-50'
                    : 'border-hairline/12 bg-white active:bg-surface-sunk/[0.04]',
                ].join(' ')}
              >
                <span className={`block text-[12px] font-extrabold leading-tight ${active ? 'text-forest-800' : 'text-ink'}`}>
                  {dayLabel(d.date, d.offset)}
                </span>
                <span className="mt-0.5 block text-[10.5px] font-semibold text-ink-mute">
                  {dayDate(d.date)}
                </span>
              </button>
            )
          })}

          {!showAll && plan.days.length > 3 && (
            <button
              onClick={() => setShowAll(true)}
              className="min-w-[70px] shrink-0 rounded-xl border border-dashed border-hairline/20 px-3 py-2 text-[11px] font-bold text-ink-soft"
            >
              More
              <span className="mt-0.5 block text-[10px] font-semibold text-ink-mute">dates</span>
            </button>
          )}
        </div>

        {/* ── The nudge ── */}
        {selectedDay && freeCount > 0 && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-forest-50 px-2.5 py-2 text-[11px] font-semibold leading-snug text-forest-800">
            <Info size={12} className="mt-px shrink-0" />
            {freeCount === slots.length
              ? 'Every window on this day is free.'
              : `${freeCount} of these windows cost nothing extra — they are marked FREE.`}
          </p>
        )}

        {/* ── The slots ── */}
        {selectedDay ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {slots.map(s => {
              const active = s.id === value?.slot
              return (
                <button
                  key={s.id}
                  onClick={() => onChange?.({ date: selectedDay.iso, slot: s.id })}
                  className={[
                    'relative rounded-xl border px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'border-forest-700 bg-forest-50'
                      : 'border-hairline/12 bg-white active:bg-surface-sunk/[0.04]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-1">
                    <span className={`text-[11.5px] font-extrabold ${active ? 'text-forest-800' : 'text-ink'}`}>
                      {s.label}
                    </span>
                    {active && <Check size={12} className="text-forest-700" />}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-ink-mute">
                    <Clock size={9} /> {s.window}
                  </span>
                  <span
                    className={`mt-1 inline-block rounded px-1 py-px text-[9px] font-extrabold uppercase tracking-wide ${
                      s.free ? 'bg-forest-100 text-forest-800' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {s.free ? 'Free' : `+${formatINR(s.fee)}`}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="mt-3 text-[11.5px] font-semibold text-ink-mute">
            Pick a day to see its delivery windows.
          </p>
        )}
      </div>
    </section>
  )
}
