import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Loader2, RefreshCw, Settings, Crosshair, Pencil } from 'lucide-react'
import {
  diagnoseLocation, reverseAddress, saveAddress,
  openDeviceSettings, SETTINGS_STEPS,
} from '../../lib/partnerLocation'

/**
 * Getting the fix, and saying the right thing when there isn't one.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FIVE FAILURES, NOT ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * This screen used to have three states: working, denied, and "we
 * couldn't detect your location" for everything else. The last one
 * covered a phone with location switched off device-wide, a permission
 * refused permanently, and a GPS cold start indoors — three problems
 * whose fixes are in three different places, described by one sentence
 * that points at none of them.
 *
 * A partner told "try again" when the real answer is "you turned this
 * off in Settings" taps Try Again until they close the app. So the
 * diagnosis is made in lib/partnerLocation.js and each state gets its
 * own sentence and its own way out.
 *
 * ── The Settings button is real or it is absent ────────────────────
 * Opening the OS settings page needs a native plugin that is not
 * installed. Rather than render a button that does nothing, the screen
 * TRIES to open settings and, when it cannot, shows the exact taps. See
 * openDeviceSettings().
 */

const COPY = {
  services_off: {
    title: 'Location services are off',
    body: 'Location is switched off on your device, so no app can find you. Turn it on and we will try again.',
    cta: 'Open location settings',
    target: 'location',
  },
  denied: {
    title: 'Location permission is needed',
    body: 'Sambramo uses your location to find event opportunities near you. Nothing is shared with customers.',
    cta: 'Allow location',
    target: null,
  },
  permanently_denied: {
    title: 'Location is blocked for Sambramo',
    body: 'Location access has been turned off for Sambramo in your device settings, so we cannot ask again from here.',
    cta: 'Open app settings',
    target: 'app',
  },
  timeout: {
    title: 'We could not detect your location',
    body: 'That took longer than it should — usually a weak signal indoors. Step outside and try again.',
    cta: 'Try again',
    target: null,
  },
  unavailable: {
    title: 'Your phone could not get a fix',
    body: 'The device tried and could not find a position just now.',
    cta: 'Try again',
    target: null,
  },
  unsupported: {
    title: 'This device cannot share a location',
    body: 'You can still set your service area during setup.',
    cta: 'Continue anyway',
    target: null,
  },
}

export default function LocationCapture() {
  const navigate = useNavigate()
  const [state, setState] = useState('working')
  const [steps, setSteps] = useState(null)
  const started = useRef(false)

  /* ── Typing an address is a last resort, not an alternative ────────
     The manual box used to appear on the first failure, beside "Try
     again", which made it the quicker of the two and therefore the one
     people took. A typed city is not the same fact as a fix: dispatch
     measures distance from a point, and the market gate is only
     meaningful against a real one.

     So it stays hidden until the device has genuinely been given a
     couple of chances. §6: a fallback, clearly labelled, never the
     preferred path. */
  const [attempts, setAttempts] = useState(0)
  const exhausted = attempts >= 2

  const run = async () => {
    setState('working')
    setSteps(null)

    const { state: result, fix } = await diagnoseLocation()
    if (!fix) { setState(result); setAttempts(n => n + 1); return }

    /* The address is a nicety, not a gate. If the geocoder is slow or
       unreachable the coordinates are already saved and the next screen
       simply has no line to print. */
    const addr = await reverseAddress(fix.lat, fix.lng)
    if (addr) saveAddress({ ...addr, accuracy: fix.accuracy ?? null })

    /* Approximate goes onward too. It is a legitimate answer a partner
       chose, everything downstream works at that precision, and the
       confirmation screen offers to improve it. Blocking here would be
       demanding a precision Android does not require us to have. */
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

  async function act(copy) {
    if (!copy.target) { run(); return }
    const opened = await openDeviceSettings(copy.target)
    /* Could not send them. Show the taps rather than leave them looking
       at a button that did nothing. */
    if (!opened) setSteps(SETTINGS_STEPS[copy.target])
  }

  const copy = COPY[state] ?? COPY.unavailable

  return (
    <div className="native-screen flex flex-col items-center justify-center bg-white px-8">
      <div className="relative mb-10 h-40 w-40">
        <span aria-hidden="true" className="loc-pulse absolute inset-0 rounded-full bg-plum-500/25" />
        <span aria-hidden="true" className="loc-pulse loc-pulse-late absolute inset-0 rounded-full bg-plum-500/25" />
        <span className="absolute inset-[26%] flex items-center justify-center rounded-full bg-plum-600">
          <MapPin size={34} className="text-white" strokeWidth={2.2} />
        </span>
      </div>

      {state === 'working' ? (
        <>
          <h1 className="text-center text-[20px] font-extrabold text-plum-950">
            Getting your location&hellip;
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
      ) : (
        <>
          <h1 data-loc-state={state} className="text-center text-[20px] font-extrabold text-plum-950">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-[18rem] text-center text-[13.5px] leading-relaxed text-ink/65">
            {copy.body}
          </p>

          {/* The taps, when we could not make them for them. */}
          {steps && (
            <ol className="mt-5 w-full max-w-xs rounded-2xl bg-ink/[0.03] p-4 text-[12.5px] text-ink-soft ring-1 ring-ink/[0.07]">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-2 py-0.5">
                  <span className="font-extrabold text-plum-600">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-8 w-full max-w-xs">
            <button
              type="button"
              onClick={() => act(copy)}
              data-loc-cta={state}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full
                         bg-gradient-to-r from-plum-700 to-plum-500 text-[15px] font-extrabold text-white
                         transition active:scale-[0.99]"
            >
              {copy.target ? <Settings size={17} /> : <RefreshCw size={17} />}
              {copy.cta}
            </button>

            {/* A second way forward on every failure. A partner who
                cannot give us a location still has an app to sign into,
                and setup asks for a service area regardless. */}
            {copy.target && (
              <button
                type="button"
                onClick={run}
                className="mt-2 flex min-h-[46px] w-full items-center justify-center gap-1.5
                           text-[13.5px] font-bold text-plum-600"
              >
                <Crosshair size={15} /> Try again
              </button>
            )}
            {exhausted && (
            <button
              type="button"
              data-fallback="manual"
              onClick={() => navigate('/partner/market')}
              className="mt-1 flex min-h-[46px] w-full items-center justify-center gap-1.5
                         text-[13.5px] font-bold text-ink/55"
            >
              <Pencil size={14} /> Unable to detect location?
            </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
