import { Rocket } from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import CityInterestForm from '../common/CityInterestForm'

/**
 * Permanent pilot-launch notice. Unlike FestivalBanner this never disappears,
 * since "which cities are we even live in" is standing information rather than
 * a rotating promotion.
 *
 * Two things were wrong with the first cut:
 *
 * The words "pilot launch" only existed inside a `hidden sm:inline` span, so on
 * a phone — which is most of the traffic — the bar read "Live in Bengaluru &
 * Mysore" and nothing else. Anyone outside those two cities had no idea whether
 * that was the whole company or the first chapter of one.
 *
 * And the row was a single flex line with an `ml-auto shrink-0` form on the end
 * whose input was a fixed 160px. On a 360px screen that could not fit, so it
 * wrapped into an off-centre stack that looked broken rather than designed.
 *
 * It now stacks deliberately on mobile and sits on one line from `sm` up, and
 * the pilot badge is the first thing you see at every width. The framing is an
 * invitation rather than an apology — being early is the offer, and "tell us
 * where next" turns a limitation into a way to take part.
 */
export default function ServiceAreaBanner() {
  const cities = BRAND.pilotCities.join(' & ')

  return (
    <div className="bg-gradient-to-r from-saffron-50 via-white to-plum-50 border-b border-amber-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">

        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-plum-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-saffron-300">
            <Rocket size={10} className="shrink-0" />
            Pilot
          </span>
          {/* min-w-0 + truncate so a long city list shortens rather than
              pushing the row wider than the screen. */}
          <span className="min-w-0 truncate text-xs sm:text-sm font-semibold text-plum-900">
            We're live in {cities}
          </span>
          <span className="hidden md:inline text-xs text-gray-500 shrink-0">
            — first two cities, more on the way
          </span>
        </div>

        <div className="sm:ml-auto min-w-0 w-full sm:w-auto">
          <CityInterestForm source="banner" prompt="Somewhere else?" />
        </div>
      </div>
    </div>
  )
}
