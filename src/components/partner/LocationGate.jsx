import { useCallback, useEffect, useState } from 'react'
import { MapPin, Loader2, Settings, ShieldCheck } from 'lucide-react'
import {
  locationPermissionState, requestLocationPermission,
  openDeviceSettings, SETTINGS_STEPS,
} from '../../lib/partnerLocation'

/**
 * "Turn on location" — the real dialog, not a sentence about one.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT WAS WRONG BEFORE
 * ══════════════════════════════════════════════════════════════════════
 *
 * When a fix was refused, the tracking screen printed:
 *
 *   "Location permission is off, so we cannot show where you are. Turn
 *    it on in your phone settings and start the trip again."
 *
 * True, and useless. It named a problem, put the work on the partner,
 * offered no way to do it, and then made them restart the trip. A
 * partner already sitting in the van reads that and rings support.
 *
 * Android's permission dialog can only be raised by asking for the
 * permission, so this component's main button IS the OS prompt — the
 * one with "While using the app" on it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ANDROID ONLY ASKS TWICE
 * ══════════════════════════════════════════════════════════════════════
 *
 * After two refusals the dialog stops appearing and the request returns
 * denied immediately, for ever. A button that silently does nothing is
 * worse than no button, so once the state is `denied` this stops
 * offering the prompt and shows the route through Settings instead.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "ALL THE TIME" IS NOT ASKED FOR, AND THAT IS DELIBERATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Background location needs ACCESS_BACKGROUND_LOCATION, which the
 * manifest deliberately omits. It also needs a Play Console
 * declaration, a recorded video of the flow, and a review that is
 * refused far more often than granted.
 *
 * "While using the app" is what this asks for, and it is enough: the
 * tracking screen is open, in the foreground, in a cradle, for the
 * whole journey. If the partner backgrounds the app the fixes pause and
 * resume when they return — the honest behaviour, and what the banner
 * on the screen above already describes.
 */
export default function LocationGate({ onGranted, compact = false }) {
  const [state, setState] = useState('checking')
  const [busy, setBusy] = useState(false)
  const [steps, setSteps] = useState(null)

  const check = useCallback(async () => {
    const s = await locationPermissionState()
    setState(s)
    if (s === 'granted') onGranted?.()
    return s
  }, [onGranted])

  useEffect(() => { check() }, [check])

  async function ask() {
    setBusy(true)
    try {
      /* This call is the dialog. Nothing else raises it. */
      const result = await requestLocationPermission()
      const s = result.granted ? 'granted' : await locationPermissionState()
      setState(s)
      if (result.granted) onGranted?.()
      else if (s === 'denied') setSteps(SETTINGS_STEPS.app)
    } finally {
      setBusy(false)
    }
  }

  async function toSettings() {
    const opened = await openDeviceSettings('app')
    /* Where the platform will not open Settings for us, the taps are
       written out rather than the button quietly failing. */
    if (!opened) setSteps(SETTINGS_STEPS.app)
  }

  if (state === 'granted' || state === 'checking') return null

  const permanently = state === 'denied'

  return (
    <div className={`rounded-[16px] bg-saffron-400/10 px-3.5 py-3 ring-1 ring-saffron-300/60 ${compact ? '' : 'mt-3'}`}>
      <p className="flex items-center gap-2 text-[12.5px] font-extrabold text-saffron-900">
        <MapPin size={14} className="shrink-0" />
        {permanently ? 'Location is switched off for Sambramo' : 'Turn on location to start'}
      </p>

      <p className="mt-1 text-[11.5px] leading-snug text-saffron-900">
        {permanently
          ? 'Android stops asking after two refusals, so this has to be changed in Settings.'
          : 'We need it only while this trip is running, so the customer can see you are on the way. It stops the moment you arrive.'}
      </p>

      <button
        type="button"
        onClick={permanently ? toSettings : ask}
        disabled={busy}
        className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-plum-700 text-[13px] font-extrabold text-white disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" />
          : permanently ? <Settings size={15} /> : <ShieldCheck size={15} />}
        {busy ? 'Waiting for you…' : permanently ? 'Open Settings' : 'Turn on location'}
      </button>

      {steps && (
        <ol className="mt-2.5 space-y-1 pl-4">
          {steps.map((step, i) => (
            <li key={step} className="list-decimal text-[11.5px] leading-snug text-saffron-900">
              {step}
              {i === steps.length - 1 && (
                <span className="font-extrabold"> — choose &ldquo;While using the app&rdquo;</span>
              )}
            </li>
          ))}
        </ol>
      )}

      {/* Checked again on return: Android does not tell a page when a
          permission changed in Settings, so without this the partner is
          left guessing whether it worked. */}
      {(steps || permanently) && (
        <button
          type="button" onClick={check}
          className="mt-2 w-full text-[12px] font-extrabold text-plum-800 underline"
        >
          I have turned it on — check again
        </button>
      )}
    </div>
  )
}
