import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, ArrowRight } from 'lucide-react'
import { useDateDemand } from '../../hooks/useDateDemand'
import { demandForDate, addDaysISO, DEMAND_TONES } from '../../lib/demand'
import { todayISO } from '../../utils/format'
import { useCity } from '../../context/CityContext'
import { useAutoScrollRail } from '../../hooks/useAutoScrollRail'

/**
 * The dates that are under real pressure, on the way past.
 *
 * Somebody browsing the home screen has no reason to hurry. This gives them
 * one — but only a true one. Every card states a fact about the calendar (a
 * festival, a Saturday in wedding season, a muhurtham an admin recorded with
 * a source) or a real count of real enquiries against a real ceiling. There
 * is no invented number here and no way to add one: everything comes from
 * lib/demand.js, which refuses to print a count until there is something
 * genuine to count.
 *
 * Tapping a date carries it into the wizard, so the urgency and the capture
 * are one motion rather than two.
 *
 * Sits on the plum home surface, so it takes the rail shape and the glass
 * treatment its neighbours use rather than arriving as a white slab.
 */

const HORIZON_DAYS = 120
const MAX_CARDS = 8

export default function DatesFillingFast() {
  // `city` is always a string — it falls back to a default nobody picked. Only
  // a deliberate choice should narrow the counts or get named in the copy;
  // the same reason PlanningWizard gates its city prefill on `chosen`.
  const { city: cityName, chosen } = useCity()
  const city = chosen ? cityName : null
  const { demandByDate, peaks } = useDateDemand(city)

  const today = todayISO()
  const ctx = useMemo(
    () => ({ today, city, demandByDate, peaks }),
    [today, city, demandByDate, peaks],
  )

  /**
   * The busiest dates in the next few months, soonest first.
   *
   * Deliberately not "the next eight weekends" — a list that always looks the
   * same teaches people to ignore it. Only dates that actually rank above
   * "booking up" earn a card, which means this gets quieter in a genuinely
   * quiet month. That is the point.
   */
  const picks = useMemo(() => {
    const out = []
    for (let i = 1; i <= HORIZON_DAYS; i++) {
      const iso = addDaysISO(today, i)
      if (!iso) continue
      const info = demandForDate(iso, ctx)
      if (info.tone.rank >= DEMAND_TONES.IN_DEMAND.rank) out.push(info)
    }
    return out
      .sort((a, b) => (b.tone.rank - a.tone.rank) || a.iso.localeCompare(b.iso))
      .slice(0, MAX_CARDS)
      .sort((a, b) => a.iso.localeCompare(b.iso))
  }, [today, ctx])

  const rail = useAutoScrollRail(picks.length)

  // Nothing genuinely under pressure? Render nothing. An empty urgency
  // section is worse than no urgency section — the same rule the reviews
  // rail follows for an empty review list.
  if (picks.length === 0) return null

  return (
    <section aria-labelledby="filling-heading">
      <div className="px-4">
        <h2 id="filling-heading" className="flex items-center gap-2 text-[15px] font-extrabold text-white">
          <CalendarClock size={16} className="text-saffron-300" /> Filling fast
        </h2>
        <p className="mt-0.5 text-[11px] text-white/50">
          Festivals, muhurthams and weekends put every decorator and caterer
          {city ? ` in ${city}` : ''} under the same pressure at once.
        </p>
      </div>

      <div
        ref={rail.ref}
        {...rail.handlers}
        className="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory scroll-pl-4"
      >
        {picks.map(info => {
          const [, m, d] = info.iso.split('-').map(Number)
          const date = new Date(Number(info.iso.slice(0, 4)), m - 1, d)
          return (
            <Link
              key={info.iso}
              to={`/plan/custom?date=${info.iso}`}
              className="home-glass group w-[168px] shrink-0 snap-start p-3"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-display text-xl font-extrabold leading-none text-white">
                  {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-white/40">
                  {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
              </span>

              <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${info.tone.chipDark}`}>
                {info.showCount ? info.headline : info.tone.label}
              </span>

              <span className="mt-1.5 block text-[11px] leading-snug text-white/55 line-clamp-3">
                {info.subtext}
              </span>

              <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold ${info.tone.accentDark}`}>
                Check this date <ArrowRight size={10} />
              </span>
            </Link>
          )
        })}
      </div>

      <div className="mt-1 flex justify-center gap-1.5" aria-hidden="true">
        {picks.map((p, i) => (
          <span
            key={p.iso}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === rail.active ? 'w-4 bg-saffron-400' : 'w-1 bg-white/25'
            }`}
          />
        ))}
      </div>

      <div className="mt-3 px-4">
        <Link
          to="/plan/custom"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 py-2.5 text-[12px] font-bold text-white/80 ring-1 ring-white/10"
        >
          Check your own date <ArrowRight size={13} />
        </Link>
        <p className="mt-1.5 text-center text-[10px] text-white/35">
          Free to enquire. We'll tell you honestly if a date is already full.
        </p>
      </div>
    </section>
  )
}
