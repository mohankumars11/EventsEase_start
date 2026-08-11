import { MapPin, ChevronDown, AlertCircle } from 'lucide-react'
import { useCity } from '../../context/CityContext'

/**
 * The city control, as it appears in an app bar.
 *
 * One component for both bars on purpose. Home and the storefront are
 * deliberately different colours, but the *act* of changing your city is one
 * act, so it gets one control in one position with one behaviour. Before
 * this, home printed the city beside a ChevronDown that belonged to no button
 * — an affordance that lied — and the storefront printed the same city with
 * no chevron at all, so the app disagreed with itself about whether the city
 * was changeable within two taps of each other.
 *
 * ── Three states, because there are three truths ───────────────────────
 *   unset      Nobody has chosen. The control *asks* — "Set your city" with
 *              a saffron dot — instead of asserting a city we guessed. An
 *              unanswered question should look unanswered; quietly printing
 *              "Bengaluru" to a customer in Mysore is how they discover the
 *              mismatch at the address field instead of at the top of the
 *              first screen.
 *   servable   The ordinary case. It states the city and stays quiet.
 *   unservable They picked somewhere we don't reach. Amber, and it says so,
 *              because every price and delivery promise below it is
 *              conditional on a city we can't serve — the customer should
 *              learn that here, not in checkout validation.
 *
 * `subtitle` is the caller's line — home says "Welcome back, Asha", the shop
 * says what it delivers there — because the second line is the only part that
 * legitimately differs by surface. When the city is unservable the component
 * overrides it: no surface's marketing line is more important than telling
 * someone we can't deliver to them.
 */
export default function CityButton({ subtitle, className = '' }) {
  const { city, chosen, servable, openCityPicker } = useCity()

  return (
    <button
      onClick={openCityPicker}
      aria-label={chosen ? `Delivering to ${city}. Change city` : 'Set your city'}
      aria-haspopup="dialog"
      className={`group -ml-1 min-w-0 flex-1 rounded-xl px-1 py-0.5 text-left transition-colors active:bg-white/10 ${className}`}
    >
      <span className="flex items-center gap-1 text-[13px] font-extrabold leading-tight text-white">
        {chosen && !servable
          ? <AlertCircle size={13} className="shrink-0 text-saffron-300" />
          : <MapPin size={13} className="shrink-0 text-saffron-300" />}

        <span className="truncate">{chosen ? city : 'Set your city'}</span>

        {/* The chevron now belongs to something. It brightens on hover so the
            control reads as pressable on a pointer device, where there is no
            touch feedback to do that job. */}
        <ChevronDown
          size={12}
          className="shrink-0 text-white/40 transition-transform group-hover:text-white/70 group-active:translate-y-px"
        />

        {/* Unset: a small saffron dot. It is the only thing on either app bar
            asking to be tapped, which is the point — this is the one decision
            that makes everything below it accurate. */}
        {!chosen && (
          <span className="relative ml-0.5 flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-saffron-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-saffron-400" />
          </span>
        )}
      </span>

      <span className="block truncate text-[11px] text-white/50">
        {chosen && !servable
          ? `We don't deliver to ${city} yet — tap to change`
          : subtitle}
      </span>
    </button>
  )
}
