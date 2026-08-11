import { Rocket, MapPin, ChevronDown, AlertCircle } from 'lucide-react'
import { LIVE_CITIES } from '../../config/cities'
import { useCity } from '../../context/CityContext'
import CityInterestForm from '../common/CityInterestForm'

/**
 * Permanent pilot-launch notice, and — on the pages that have no app bar —
 * the city control.
 *
 * Home and the storefront draw their own app bars, each carrying a CityButton.
 * Everything else in the app (the plan hub, the services catalogue, festival
 * pages, the product page, the shop cart) renders under the marketing Navbar,
 * which has no such control. Without this, the city was settable on two
 * screens and merely *asserted* on the other ten — the customer could read
 * "Bengaluru" above a Mysore price with no way to correct it.
 *
 * Rather than bolt a second city widget onto the Navbar and have two of them
 * on some pages, this banner became the control for the pages that need one.
 * It was already the surface that talked about which cities are live; now it
 * says which city *you* are in, and lets you change it. Same sheet, same act,
 * third entrance.
 *
 * Two earlier layout faults, still worth keeping fixed:
 *
 * The words "pilot launch" once existed only inside a `hidden sm:inline` span,
 * so on a phone — most of the traffic — the bar read "Live in Bengaluru &
 * Mysore" and nothing else. Anyone outside those cities had no idea whether
 * that was the whole company or its first chapter.
 *
 * And the row was one flex line ending in an `ml-auto shrink-0` form whose
 * input was a fixed 160px. On a 360px screen that could not fit, so it wrapped
 * into an off-centre stack that looked broken rather than designed. It stacks
 * deliberately on mobile and sits on one line from `sm` up.
 */
export default function ServiceAreaBanner() {
  const { city, chosen, servable, openCityPicker } = useCity()
  const cities = LIVE_CITIES.map(c => c.name).join(' & ')

  return (
    <div className="bg-gradient-to-r from-saffron-50 via-white to-plum-50 border-b border-amber-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">

        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-plum-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-saffron-300">
            <Rocket size={10} className="shrink-0" />
            Pilot
          </span>

          {/* The control. On these pages it is the only way to change city, so
              it is a button at every width rather than a line of text that
              becomes one. min-w-0 + truncate so a long city name shortens
              instead of pushing the row wider than the screen. */}
          <button
            onClick={openCityPicker}
            aria-haspopup="dialog"
            aria-label={chosen ? `Your city is ${city}. Change city` : 'Set your city'}
            className="group flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-0.5 transition-colors hover:bg-white/70"
          >
            {chosen && !servable
              ? <AlertCircle size={12} className="shrink-0 text-crimson-600" />
              : <MapPin size={12} className="shrink-0 text-plum-600" />}
            <span className={`min-w-0 truncate text-xs sm:text-sm font-semibold ${
              chosen && !servable ? 'text-crimson-700' : 'text-plum-900'
            }`}>
              {chosen ? city : 'Set your city'}
            </span>
            <ChevronDown size={12} className="shrink-0 text-plum-400 transition-colors group-hover:text-plum-700" />
          </button>

          {/* The standing fact, secondary to the customer's own city. Hidden
              on narrow screens, where the city they picked is the only part
              that fits and the only part that is about them. */}
          <span className="hidden md:inline shrink-0 text-xs text-gray-500">
            {chosen && !servable
              ? `— we're not live here yet, only ${cities}`
              : `— we're live in ${cities}, more on the way`}
          </span>
        </div>

        <div className="sm:ml-auto min-w-0 w-full sm:w-auto">
          <CityInterestForm source="banner" prompt="Somewhere else?" />
        </div>
      </div>
    </div>
  )
}
