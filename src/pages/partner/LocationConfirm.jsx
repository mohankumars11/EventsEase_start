import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, CheckCircle2, ArrowLeft } from 'lucide-react'
import { readSavedAddress, readSavedLocation } from '../../lib/partnerLocation'

/**
 * What we found, for the partner to agree with.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING HERE IS HARD-CODED
 * ══════════════════════════════════════════════════════════════════════
 *
 * The line under the marker is whatever Nominatim returned for the
 * device's own coordinates, stored by the previous screen. There is no
 * default city, no example address, and no fallback that names a place --
 * if the geocoder gave us nothing, this says so and offers the retry
 * rather than inventing somewhere plausible.
 *
 * ── The accuracy decides the wording ───────────────────────────────
 * Android hands back a coarse fix when the partner chose approximate
 * location, and the accuracy radius is how you tell. Under about 100
 * metres it is a real GPS fix and the screen says the location was
 * detected; above that it is a network fix and the screen says
 * approximate. Claiming precision we were not given is the thing the
 * brief rules out, and this is the only place the app could do it by
 * accident.
 *
 * ── No map tiles ───────────────────────────────────────────────────
 * A real map here would mean a tile provider, a key, an API budget and a
 * network round trip on a screen whose entire job is to print one line of
 * text the partner either recognises or does not. The drawn marker makes
 * the same point. If a map becomes a product requirement it belongs here,
 * but it is not one yet.
 */
export default function LocationConfirm() {
  const navigate = useNavigate()
  const [addr, setAddr] = useState(null)
  const [fix, setFix] = useState(null)

  useEffect(() => {
    setAddr(readSavedAddress())
    setFix(readSavedLocation())
  }, [])

  const approximate = typeof addr?.accuracy === 'number' && addr.accuracy > 100
  const haveSomething = !!fix

  return (
    <div className="native-screen flex flex-col bg-white">
      <div className="safe-top px-5 pt-3">
        <button
          type="button"
          onClick={() => navigate('/partner/location')}
          aria-label="Back to location detection"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink/70"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="relative mb-8 h-32 w-32">
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-forest-500/15" />
          <span className="absolute inset-[24%] flex items-center justify-center rounded-full bg-plum-600">
            <MapPin size={30} className="text-white" strokeWidth={2.2} />
          </span>
        </div>

        {haveSomething ? (
          <>
            <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-forest-700">
              <CheckCircle2 size={15} />
              {approximate ? 'Approximate location detected' : 'Location detected'}
            </p>
            <p className="mt-3 max-w-[18rem] text-[17px] font-extrabold leading-snug text-plum-950">
              {addr?.line ?? 'We have your location'}
            </p>
            {approximate && (
              <p className="mt-2 max-w-[18rem] text-[12px] leading-snug text-ink-mute">
                Your device shared an approximate position. You can set an exact
                service area during setup.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-[17px] font-extrabold text-plum-950">
              We don&apos;t have your location yet
            </p>
            <p className="mt-2 max-w-[18rem] text-[13px] leading-snug text-ink-mute">
              You can try again, or carry on and set your service area during setup.
            </p>
          </>
        )}
      </div>

      <div className="safe-cta px-7">
        <button
          type="button"
          onClick={() => navigate('/partner/login')}
          className="min-h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-plum-500
                     text-[15.5px] font-extrabold text-white transition active:scale-[0.99]"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={() => navigate('/partner/location')}
          className="mt-2 min-h-[46px] w-full text-[13.5px] font-bold text-plum-600"
        >
          {haveSomething ? 'Update' : 'Try Again'}
        </button>
      </div>
    </div>
  )
}
