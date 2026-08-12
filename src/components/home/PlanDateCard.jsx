import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ArrowRight, Users, Check } from 'lucide-react'
import MonthGrid from '../common/MonthGrid'
import { useDateInterest } from '../../hooks/useDateDemand'
import { TIME_SLOTS, interestForDate } from '../../lib/demand'
import { humanDate } from '../../utils/format'
import { useCity } from '../../context/CityContext'

/**
 * The front door's own calendar: pick the day before the wizard is opened.
 *
 * The date used to be question two of a six-step form, which meant the most
 * valuable thing an enquiry can carry sat behind a step most browsers never
 * reached. Here it is the first thing on the card, and the choice travels
 * into the wizard, so somebody arriving with a date in mind can give it in
 * one tap.
 *
 * ── Every date is available ──────────────────────────────────────────
 *
 * Nothing is blocked or greyed. The only thing a date can carry is how many
 * families have already asked about it, and only once that count is real and
 * worth showing — so most days are deliberately plain. A calendar where
 * everything is flagged is one nobody reads.
 */
export default function PlanDateCard() {
  const navigate = useNavigate()
  // `city` always has a value — it falls back to a default nobody picked, so
  // only a deliberate choice narrows the counts.
  const { city: cityName, chosen } = useCity()
  const city = chosen ? cityName : null

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState('')
  const [slot, setSlot] = useState('')

  const { interestByDate } = useDateInterest(city)
  const ctx = useMemo(() => ({ interestByDate, city }), [interestByDate, city])
  const info = selected ? interestForDate(selected, ctx) : null

  function go() {
    const params = new URLSearchParams()
    if (selected) params.set('date', selected)
    if (slot) params.set('slot', slot)
    const qs = params.toString()
    navigate(`/plan/custom${qs ? `?${qs}` : ''}`)
  }

  return (
    <section aria-labelledby="plan-date-heading" className="px-4">
      <div className="home-card overflow-hidden p-4">
        <h2 id="plan-date-heading" className="flex items-center gap-2 text-[15px] font-extrabold text-white">
          <CalendarDays size={16} className="text-saffron-300" />
          Plan a celebration
        </h2>
        <p className="mt-0.5 text-[11px] text-white/50">
          Tell us the day. A coordinator sources the vendors and brings back one price.
        </p>

        {/* The grid is built for a white surface, so it sits on its own light
            panel rather than being restyled for plum — a calendar is dense
            enough that fighting the ground for contrast is not worth it. */}
        <div className="mt-3 rounded-2xl bg-white p-3">
          <MonthGrid
            cursor={cursor}
            onCursor={setCursor}
            minDate={today}
            renderDay={(date, { iso, isToday, isPast }) => {
              if (isPast) {
                return (
                  <div className="flex h-full w-full items-center justify-center rounded-lg text-[11px] text-gray-300">
                    {date.getDate()}
                  </div>
                )
              }
              const day = interestForDate(iso, ctx)
              const isSelected = iso === selected
              const title = day.showCount
                ? `${date.toDateString()} · ${day.headline}`
                : date.toDateString()
              return (
                <button
                  type="button"
                  onClick={() => setSelected(iso)}
                  title={title}
                  aria-label={title}
                  aria-pressed={isSelected}
                  className={[
                    'relative flex h-full w-full flex-col items-center justify-center gap-0.5',
                    'rounded-lg border text-[11px] font-semibold transition-colors',
                    day.level.cell,
                    isSelected ? 'ring-2 ring-plum-500 ring-offset-1' : '',
                    isToday && !isSelected ? 'ring-1 ring-plum-300' : '',
                  ].join(' ')}
                >
                  {date.getDate()}
                  {day.showCount
                    ? <span className={`h-1 w-1 rounded-full ${day.level.dot}`} />
                    : <span className="h-1 w-1" />}
                </button>
              )
            }}
          />
          <p className="mt-2 flex items-center gap-1.5 border-t border-orange-100 pt-2 text-[10px] text-gray-400">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
            Dates other families are already asking about
          </p>
        </div>

        {info?.showCount && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-saffron-300">
            <Users size={12} />
            {info.headline} already for {humanDate(selected)}
          </p>
        )}

        {/* Time of day appears once a date is chosen — asking "morning or
            evening?" before there is a day to attach it to is noise. */}
        {selected && (
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {TIME_SLOTS.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSlot(s.key)}
                aria-pressed={slot === s.key}
                className={[
                  'rounded-xl px-1.5 py-2 text-[10px] font-bold transition-colors',
                  slot === s.key
                    ? 'bg-saffron-400 text-plum-950'
                    : 'bg-white/5 text-white/70 ring-1 ring-white/10',
                ].join(' ')}
              >
                <span className="block text-[13px] leading-none">{s.emoji}</span>
                <span className="mt-1 block leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={go}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950"
        >
          {selected
            ? <><Check size={15} /> Plan for {humanDate(selected)}</>
            : <>Plan a celebration</>}
          <ArrowRight size={15} />
        </button>
        <p className="mt-1.5 text-center text-[10px] text-white/35">
          Free to enquire. Every date is open.
        </p>
      </div>
    </section>
  )
}
