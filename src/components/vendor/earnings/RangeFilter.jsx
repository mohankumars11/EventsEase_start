import { useState } from 'react'
import { CalendarRange, Check } from 'lucide-react'
import { istTodayISO } from '../../../lib/istTime'

/**
 * The date window, as chips plus a custom range.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SELECTION IS PURPLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `check-one-partner-ui.mjs` asserts the tab bar's active pill is
 * `bg-plum-600` and is NOT saffron, and the rule it encodes is app-wide:
 * saffron means something needs attention, purple means you chose this.
 * A saffron chip here would say the filter is a problem.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CUSTOM RANGE USES date INPUTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not a hand-built calendar. The native picker is the one the partner
 * already knows, it is keyboard and screen-reader accessible without any
 * work, and on Android it is the platform dialog rather than a web
 * approximation of it. The `max` is today in INDIA, not the device's
 * today, for the same reason every other boundary in this feature is —
 * a phone on UTC would otherwise offer tomorrow.
 */

const CHIPS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'fy', label: 'This year' },
]

export default function RangeFilter({ range, onChange }) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(range?.from ?? '')
  const [to, setTo] = useState(range?.to ?? '')
  const today = istTodayISO()

  const apply = () => {
    if (!from || !to) return
    /* Swap rather than refuse. Somebody who picks the end date first has
       not made a mistake, they have used the form in the other order. */
    const [a, b] = from <= to ? [from, to] : [to, from]
    onChange(`${a}..${b}`)
    setOpen(false)
  }

  return (
    <div className="rounded-[18px] bg-white p-2 ring-1 ring-ink/[0.06]">
      <div className="flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CHIPS.map(c => {
          const on = range?.id === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              aria-pressed={on}
              className={`min-h-[34px] shrink-0 rounded-full px-3 text-[12.5px] font-extrabold transition-colors ${
                on ? 'bg-plum-600 text-white' : 'bg-ink/[0.04] text-ink-soft'
              }`}
            >
              {c.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-extrabold transition-colors ${
            range?.custom ? 'bg-plum-600 text-white' : 'bg-ink/[0.04] text-ink-soft'
          }`}
        >
          <CalendarRange size={13} />
          {range?.custom ? `${range.from} – ${range.to}` : 'Custom'}
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-[14px] bg-page-sunk p-3">
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-mute">
                From
              </span>
              <input
                type="date" value={from} max={today}
                onChange={e => setFrom(e.target.value)}
                className="mt-1 w-full rounded-[10px] border-0 bg-white px-2.5 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.08]"
              />
            </label>
            <label className="min-w-0 flex-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-mute">
                To
              </span>
              <input
                type="date" value={to} max={today}
                onChange={e => setTo(e.target.value)}
                className="mt-1 w-full rounded-[10px] border-0 bg-white px-2.5 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.08]"
              />
            </label>
            <button
              type="button" onClick={apply} disabled={!from || !to}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-full bg-plum-600 px-3.5 text-[12.5px] font-extrabold text-white disabled:opacity-40"
            >
              <Check size={13} /> Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
