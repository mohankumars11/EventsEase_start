import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import {
  captureLocation, hasFreshLocation, locationPermissionState,
} from '../../lib/partnerLocation'

/**
 * Asks for location once, immediately after the launch screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THERE IS A SCREEN BEFORE THE SYSTEM DIALOG
 * ══════════════════════════════════════════════════════════════════════
 *
 * Firing the OS permission prompt cold, with no context, is the single
 * best way to get it denied -- and on Android a denial is close to
 * permanent, because the second refusal sets "don't ask again" and the
 * only route back is app settings, which nobody finds.
 *
 * So the reason goes first, in one line, in the partner's terms: jobs are
 * dispatched by distance. Then the system asks. This is also what Google
 * Play's location policy expects of any app whose dispatch depends on it,
 * and it is what the apps this is measured against do.
 *
 * ── While using the app, not all the time ───────────────────────────
 * This screen asks for foreground location only, and says so. Background
 * location -- the "all the time" option -- is a separate permission that
 * Android will not grant in the same dialog, that Play gates behind a
 * declaration form and a review, and that belongs on the "go online"
 * action where a partner can see why it is being asked. See the long note
 * in lib/partnerLocation.js.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT IS A GATE THAT DOES NOT GATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Deny, dismiss, no GPS indoors, a device with the radio off -- every one
 * of those lands on the same place as Allow: the login underneath. A
 * master who cannot give a location can still sign in and pick their city
 * by hand, and an app that refuses to open without a permission is an app
 * that gets uninstalled rather than one that gets the permission.
 *
 * It also renders nothing at all when the answer is already known: a
 * fresh fix, or a permission the browser reports as granted or denied.
 * Asking a second time is how a one-off becomes a nag.
 */
export default function PartnerLocationGate({ onDone }) {
  const [phase, setPhase] = useState('checking') // checking | asking | working | done
  const settled = useRef(false)

  const finish = () => {
    if (settled.current) return
    settled.current = true
    setPhase('done')
    onDone?.()
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Already have something recent? Nothing to ask.
      if (hasFreshLocation()) return finish()

      const state = await locationPermissionState()
      if (cancelled) return

      /* Granted already: take the fix silently, with no screen at all.
         This is the returning-partner path and it must be invisible. */
      if (state === 'granted') {
        captureLocation().finally(() => { if (!cancelled) finish() })
        return
      }

      /* Denied already: never re-prompt. The browser would not show a
         dialog anyway, and a screen explaining a permission they have
         refused is just an obstacle between them and signing in. */
      if (state === 'denied') return finish()

      setPhase('asking')
    })()
    return () => { cancelled = true }
    // Mount-only: this is a one-shot decision, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ask = async () => {
    setPhase('working')
    await captureLocation()   // resolves either way; the result is stored inside
    finish()
  }

  if (phase === 'done' || phase === 'checking') return null

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-6 bg-white px-7">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-royal-50">
        <MapPin size={30} className="text-royal-600" strokeWidth={2.2} />
      </div>

      <div className="max-w-xs text-center">
        <h1 className="text-[22px] font-extrabold leading-tight text-ink">
          Work near you
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink/70">
          Sambramo sends you jobs by distance, so the closest work reaches you
          first. Allow location and we will do that from the start.
        </p>
        {/* Said plainly, because it is what the OS is about to ask and a
            partner should not be surprised by the wording. */}
        <p className="mt-3 text-[12px] font-semibold text-ink/45">
          While you are using the app. You can change this any time in settings.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2.5">
        <button
          type="button"
          onClick={ask}
          disabled={phase === 'working'}
          className="a-btn inline-flex items-center justify-center gap-2 bg-royal-600 text-white
                     disabled:opacity-60"
        >
          {phase === 'working'
            ? <><Loader2 size={17} className="animate-spin" /> Getting your location…</>
            : 'Allow location'}
        </button>
        {/* Not a dead end. See the docblock: refusing must cost nothing. */}
        <button
          type="button"
          onClick={finish}
          className="min-h-[44px] text-[13.5px] font-bold text-ink/55"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
