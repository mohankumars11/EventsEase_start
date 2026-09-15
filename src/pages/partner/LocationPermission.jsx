import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Sparkles, Truck } from 'lucide-react'

/**
 * The reason, before the system asks.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A SCREEN IN FRONT OF THE OS DIALOG
 * ══════════════════════════════════════════════════════════════════════
 *
 * Firing the permission prompt cold is the best way to have it refused,
 * and on Android a refusal is close to permanent: the second denial sets
 * "don't ask again" and the only way back is app settings, which nobody
 * finds. So the reason goes first, in the partner's own terms.
 *
 * It is also what Play's location policy expects of an app whose dispatch
 * depends on a fix, and it is the shape every serious marketplace app in
 * this market uses.
 *
 * ── While using the app, and it says so ─────────────────────────────
 * This asks for foreground location only. Background -- the "all the
 * time" option -- is a different permission that Android will not grant
 * in the same dialog, that Play gates behind a declaration form and a
 * review, and that belongs on the "go online" action where a partner can
 * see what it is for. The copy here does not promise otherwise.
 */

const BENEFITS = [
  { icon: Navigation, text: 'Find nearby event opportunities' },
  { icon: Sparkles,   text: 'Get better service requests' },
  { icon: Truck,      text: 'Accurate pickup and delivery support' },
]

export default function LocationPermission() {
  const navigate = useNavigate()

  return (
    <div className="native-screen flex flex-col bg-white">
      <div className="safe-top flex-1 overflow-hidden px-7 pt-10">
        {/* The map hint. A drawn suggestion of a map rather than a real
            one: there is nothing to plot yet, and loading a tile provider
            to decorate a permission screen spends a network round trip on
            an illustration. */}
        <div className="relative mx-auto mb-8 h-36 w-36">
          <span aria-hidden="true" className="loc-pulse absolute inset-0 rounded-full bg-plum-500/25" />
          <span aria-hidden="true" className="loc-pulse loc-pulse-late absolute inset-0 rounded-full bg-plum-500/25" />
          <span className="absolute inset-[22%] flex items-center justify-center rounded-full bg-plum-600">
            <MapPin size={34} className="text-white" strokeWidth={2.2} />
          </span>
        </div>

        <h1 className="text-[clamp(1.45rem,6.6vw,1.85rem)] font-extrabold leading-tight tracking-tight text-plum-950">
          Allow location access
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink/70">
          We use your location to show event opportunities near you, help customers
          find you, and provide accurate logistics support.
        </p>

        <ul className="mt-6 space-y-3.5">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-plum-50">
                <Icon size={16} className="text-plum-600" strokeWidth={2.2} />
              </span>
              <span className="text-[13.5px] font-semibold leading-snug text-ink/80">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="safe-cta px-7 pt-2">
        <button
          type="button"
          onClick={() => navigate('/partner/location')}
          className="min-h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-plum-500
                     text-[15.5px] font-extrabold text-white transition active:scale-[0.99]"
        >
          Allow Location Access
        </button>
        {/* ── There is deliberately no "Maybe Later" here ─────────────
            There was one, and it read as the reasonable choice: it went
            straight to the login, so the fastest way past this screen
            was to decline it. A partner who took it arrived with no
            location, which is the one fact everything downstream is
            built on — the market gate cannot run, dispatch has nothing
            to measure from, and the service area later defaults to a
            city nobody confirmed.

            Location is not a preference, it is the question this
            product is organised around, so the screen asks it and
            nothing else. Every refusal path the OS can produce is
            handled on the next screen, with its own words and its own
            way back — see LocationCapture. */}
      </div>
    </div>
  )
}
