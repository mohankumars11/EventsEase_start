import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ArrowRight } from 'lucide-react'
import { useDateDemand } from '../../hooks/useDateDemand'
import { demandForDate, addDaysISO, DEMAND_TONES } from '../../lib/demand'
import { todayISO } from '../../utils/format'
import { useCity } from '../../context/CityContext'

/**
 * The dates that are under real pressure, on the way past.
 *
 * Somebody browsing the landing page has no reason to hurry. This gives them
 * one — but only a true one. Every card states a fact about the calendar (a
 * festival, a Saturday in wedding season, a muhurtham an admin recorded with
 * a source) or a real count of real enquiries. There is no invented number
 * here and no way to add one: everything comes from lib/demand.js, which
 * refuses to show a count until there is something genuine to count.
 *
 * Tapping a date carries it into the wizard, so the urgency and the capture
 * are one motion rather than two.
 */

const HORIZON_DAYS = 120
const MAX_CARDS = 6

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
   * Deliberately not "the next six weekends" — a list that always looks the
   * same teaches people to ignore it. Only dates that actually rank above
   * "booking up" earn a card, which means the section gets quieter in a
   * genuinely quiet month. That is the point.
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

  // Nothing genuinely under pressure? Render nothing. An empty urgency
  // section is worse than no urgency section — the same rule CustomerVoices
  // follows for an empty review list.
  if (picks.length === 0) return null

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-10 reveal">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-saffron-600 mb-2">
            Filling fast
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Some dates go before others
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Festivals, muhurthams and weekends put every decorator and caterer in
            {city ? ` ${city}` : ' the city'} under the same pressure at once. Tell us your
            date early and we'll hold the right people for you.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 reveal reveal-delay-1">
          {picks.map(info => {
            const [, m, d] = info.iso.split('-').map(Number)
            const date = new Date(info.iso.slice(0, 4), m - 1, d)
            return (
              <Link
                key={info.iso}
                to={`/plan/custom?date=${info.iso}`}
                className={`group rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${info.tone.chip}`}
              >
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="font-serif text-2xl font-bold leading-none">
                    {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wide opacity-75">
                    {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </span>
                </div>
                <p className="text-xs font-bold mb-1">
                  {info.showCount ? info.headline : info.tone.label}
                </p>
                <p className="text-xs leading-relaxed opacity-85 line-clamp-2">
                  {info.subtext}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Check this date <ArrowRight size={11} />
                </span>
              </Link>
            )
          })}
        </div>

        <div className="text-center mt-8 reveal reveal-delay-2">
          <Link to="/plan/custom" className="btn-cta inline-flex items-center gap-2">
            <CalendarDays size={17} />
            Check your own date
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            Free to enquire. We'll tell you honestly if a date is already full.
          </p>
        </div>

      </div>
    </section>
  )
}
