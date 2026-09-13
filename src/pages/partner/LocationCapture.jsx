import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Loader2, RefreshCw, Settings } from 'lucide-react'
import {
  captureLocation, reverseAddress, saveAddress,
} from '../../lib/partnerLocation'

/**
 * Getting the fix.
 *
 * This screen does the work the previous one asked permission for: it
 * requests the position, reverse-geocodes it, stores both, and moves on.
 * It is a route of its own rather than a spinner on the permission screen
 * because it has three outcomes a partner may have to act on -- refused,
 * unavailable, timed out -- and each needs its own words and its own way
 * forward. A spinner that turns into an error is a dead end.
 *
 * ── No typing here ─────────────────────────────────────────────────
 * The brief is explicit that the partner should not be made to type an
 * address at this point, and they are not. Every failure path offers a
 * retry or a way onward, never a text field.
 *
 * ── Honest about precision ─────────────────────────────────────────
 * The copy says "Detecting your location", not "Detecting precise
 * location", until a fix is actually in hand. Android may hand back a
 * coarse cell-tower fix when the partner chose approximate, and claiming
 * precision we were not given is the one thing the brief rules out
 * outright. The accuracy that comes back is what decides the wording on
 * the next screen.
 */
export default function LocationCapture() {
  const navigate = useNavigate()
  const [state, setState] = useState('working')   // working | denied | unavailable
  const started = useRef(false)

  const run = async () => {
    setState('working')
    const res = await captureLocation()

    if (!res.ok) {
      setState(res.reason === 'denied' ? 'denied' : 'unavailable')
      return
    }

    /* The address is a nicety, not a gate. If the geocoder is slow or
       unreachable the coordinates are already saved and the confirmation
       screen simply has no line to print. */
    const addr = await reverseAddress(res.fix.lat, res.fix.lng)
    if (addr) saveAddress({ ...addr, accuracy: res.fix.accuracy ?? null })
    navigate('/partner/location-confirmation', { replace: true })
  }

  useEffect(() => {
    // Once. In StrictMode this effect runs twice in development, and two
    // permission requests in a row is two dialogs.
    if (started.current) return
    started.current = true
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="native-screen flex flex-col items-center justify-center bg-white px-8">
      <div className="relative mb-10 h-40 w-40">
        <span aria-hidden="true" className="loc-pulse absolute inset-0 rounded-full bg-plum-500/25" />
        <span aria-hidden="true" className="loc-pulse loc-pulse-late absolute inset-0 rounded-full bg-plum-500/25" />
        <span className="absolute inset-[26%] flex items-center justify-center rounded-full bg-plum-600">
          <MapPin size={34} className="text-white" strokeWidth={2.2} />
        </span>
      </div>

      {state === 'working' && (
        <>
          <h1 className="text-center text-[20px] font-extrabold text-plum-950">
            Getting your location…
          </h1>
          <p className="mt-2 max-w-[17rem] text-center text-[13.5px] leading-relaxed text-ink/65">
            Please wait while we find your current location
          </p>
          <div className="mt-8 w-full max-w-xs rounded-2xl bg-ink/[0.03] p-4 ring-1 ring-ink/[0.07]">
            <p className="flex items-center gap-2 text-[13px] font-extrabold text-ink">
              <Loader2 size={15} className="animate-spin text-plum-600" />
              Detecting your location
            </p>
            <p className="mt-1 pl-[23px] text-[12px] text-ink-mute">
              This will only take a few seconds
            </p>
          </div>
        </>
      )}

      {state !== 'working' && (
        <>
          <h1 className="text-center text-[20px] font-extrabold text-plum-950">
            {state === 'denied'
              ? 'Location access is needed'
              : "We couldn't detect your location"}
          </h1>
          <p className="mt-2 max-w-[18rem] text-center text-[13.5px] leading-relaxed text-ink/65">
            {state === 'denied'
              ? 'Sambramo uses it to find event opportunities near you. You can allow it in your device settings.'
              : 'Your device could not get a fix. Check that location services are on, then try again.'}
          </p>

          <div className="mt-8 w-full max-w-xs">
            <button
              type="button"
              onClick={run}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full
                         bg-gradient-to-r from-plum-700 to-plum-500 text-[15px] font-extrabold text-white
                         transition active:scale-[0.99]"
            >
              {state === 'denied' ? <Settings size={17} /> : <RefreshCw size={17} />}
              {state === 'denied' ? 'Turn on Location Services' : 'Try Again'}
            </button>
            {/* Always a way onward. A partner who cannot give a location
                still has an app to sign into, and setup asks for a
                service area anyway. */}
            <button
              type="button"
              onClick={() => navigate('/partner/login')}
              className="mt-2 min-h-[46px] w-full text-[13.5px] font-bold text-ink/55"
            >
              Continue without location
            </button>
          </div>
        </>
      )}
    </div>
  )
}
