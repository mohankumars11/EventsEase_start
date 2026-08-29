import { useCallback, useEffect, useState } from 'react'
import { apiUrl } from '../../lib/api'
import { Bell, BellOff, Loader2, TriangleAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { alertsAvailability, enableAlerts, disableAlerts } from '../../lib/push'
import { nativeDiagnostics } from '../../lib/nativePush'

/**
 * "Turn on job alerts."
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONE CONTROL THE DISPATCH MODEL RESTS ON
 * ══════════════════════════════════════════════════════════════════════
 *
 * A master has 45 seconds to answer a job. The offer inbox updates over
 * Realtime with polling underneath, which works perfectly — while the app
 * is open. It is almost never open.
 *
 * Without this button no device is registered, `notifyPartners` finds
 * nobody to send to, and every offer to a closed app expires unseen while
 * the customer's screen says "still looking". That is not a missing
 * feature; it is the marketplace not functioning, and it is exactly what
 * was observed the first time this was tested end to end.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PROMPT IS SPENT ONCE, SO IT IS SPENT HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A browser gives one chance at the notification permission. Refuse it
 * and the app cannot ask again — the master has to find it in browser
 * settings, which nobody does.
 *
 * So it is never requested on page load. It is requested from a deliberate
 * tap on a button that says what it is for, at the moment the answer is
 * obviously yes. Everything above the button exists to make that yes
 * informed rather than reflexive.
 */
/* Read once, at module load. `isNativeApp()` reads window.Capacitor,
   which the bundled APK injects before any of this evaluates. */
const NATIVE = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

/* Stamped by the build. Short enough to read aloud over a phone call,
   which is how this will actually be used. */
const BUILD = (import.meta.env?.VITE_BUILD ?? 'dev').slice(0, 7)

export default function JobAlerts({ vendorId }) {
  const { user } = useAuth()

  const [availability, setAvailability] = useState(null)
  const [registered, setRegistered] = useState(null)   // null = still checking
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const [tested, setTested] = useState(null)
  const [testing, setTesting] = useState(false)
  const [diag, setDiag] = useState(null)

  /** Is a device already registered for this master? */
  const refresh = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('push_tokens')
      .select('id, device_label, platform')
      .eq('profile_id', user.id)
      .eq('app', 'partner')
      .limit(5)
    setRegistered(data ?? [])
  }, [user?.id])

  useEffect(() => {
    setAvailability(alertsAvailability())
    refresh()
  }, [refresh])

  async function turnOn() {
    setBusy(true); setProblem(null)
    const r = await enableAlerts({ profileId: user.id, app: 'partner' })
    setBusy(false)

    if (!r.ok) {
      /* Every reason the two paths can return, named.
       *
       * The map used to cover four of them, so `no_notifications` — the
       * one an Android WebView always produces — fell through to
       * "Could not turn alerts on", which is what a real device
       * reported and which says nothing at all.
       *
       * A message a person cannot act on is the same as no message. */
      const SAYS = {
        not_configured:   'Alerts are not set up on this build.',
        declined:         'You said no to alerts. Turn them on in your phone settings for Sambramo, then try again.',
        unsupported:      'This browser cannot show alerts. The app can — install it from the banner above.',
        no_notifications: 'This browser cannot show alerts. The app can — install it from the banner above.',
        no_service_worker:'This browser cannot show alerts. The app can — install it from the banner above.',
        denied:           'Alerts are blocked for Sambramo. Turn them back on in your phone settings, then try again.',
        no_token:         'Could not get a device id. Check your connection and try again.',
        save_failed:      'Could not save this device. Sign out and back in, then try again.',
        not_native:       'The push plugin is missing from this build.',
        error:            'Something went wrong turning alerts on.',
      }

      setProblem(
        [SAYS[r.reason] ?? r.scan ?? 'Could not turn alerts on.',
         // The technical reason, kept. Withholding it is what turned
         // this into three rounds of guessing.
         r.detail ? `(${String(r.detail).slice(0, 90)})` : `[${r.reason ?? 'unknown'}]`,
        ].filter(Boolean).join(' '),
      )
      return
    }
    await refresh()
  }

  /**
   * Send one push to this device, now.
   *
   * "No notifications are coming" cannot be answered from the server:
   * FCM accepts every send and returns 200, the token is healthy, and
   * the dispatcher reports it pushed. Every signal on our side says it
   * worked while the phone stays silent.
   *
   * At least six things cause that and none is visible from a server —
   * permission granted but muted at OS level, a service worker that
   * never initialised, battery optimisation, Do Not Disturb, a dropped
   * notification channel, or an app that was never really installed.
   *
   * One button collapses all six into: it buzzed, or it did not.
   */
  async function sendTest() {
    setTesting(true); setTested(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(apiUrl('/api/test-alert'), {
        method: 'POST',
        headers: { authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const body = await res.json().catch(() => ({}))
      /* The reason travels with the sentence.
       *
       * "Could not send to this device" was the whole diagnosis, and
       * nobody can act on it — while the endpoint already knew whether
       * FCM said UNREGISTERED, or the credential was rejected, or the
       * platform was wrong. Withholding what we know is not brevity. */
      const why = (body.why ?? []).filter(Boolean).join(' · ')
      setTested([body.scan, why].filter(Boolean).join('  —  '))

      // A pruned dead token means the row is gone; the card must stop
      // claiming alerts are on.
      if (body.deadRemoved) await refresh()
    } catch {
      setTested('Could not reach the server.')
    } finally {
      setTesting(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    await disableAlerts({ profileId: user.id })
    setBusy(false)
    await refresh()
  }

  if (registered === null) {
    return (
      <div className="flex items-center gap-2 rounded-[22px] bg-white p-4 text-[13px] text-ink-mute ring-1 ring-ink/[0.06]">
        <Loader2 size={15} className="animate-spin" /> Checking your alerts…
      </div>
    )
  }

  const on = registered.length > 0

  /* Alerts cannot work here at all — an old browser, or Safari on an
     iPhone that has not added the site to the home screen. Said plainly,
     with the thing that WOULD work, rather than a dead toggle. */
  if (!availability?.ok && !on) {
    return (
      <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
          <BellOff size={16} className="text-ink-mute" />
          Alerts are not available here
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
          {availability?.detail
            ?? availability?.scan
            ?? 'This browser cannot show alerts.'}
          {' '}Install the Sambramo Partners app and jobs will reach you even
          when it is closed.
        </p>
        <p className="mt-2 text-[11.5px] leading-snug text-ink-mute">
          Until then, keep this page open to see jobs as they arrive.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-[22px] p-4 ring-1 ${
      on ? 'bg-forest-50 ring-forest-200/70' : 'bg-white ring-ink/[0.06]'
    }`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          on ? 'bg-forest-600 text-white' : 'bg-saffron-400/20 text-saffron-700'
        }`}>
          {on ? <Bell size={17} /> : <BellOff size={17} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-extrabold leading-tight text-ink">
            {on ? 'Job alerts are on' : 'Turn on job alerts'}
          </p>

          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
            {on
              ? `We will buzz your ${registered.map(r => r.device_label ?? 'device').join(' and ')} the moment a job near you comes up.`
              /* States the real constraint. A master who understands WHY
                 45 seconds matters is a master who leaves alerts on. */
              : 'A job is offered to a few masters at once and the first to accept gets it. Without alerts you will only see jobs while this page is open.'}
          </p>

          {problem && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] font-semibold leading-snug text-amber-800">
              <TriangleAlert size={13} className="mt-0.5 shrink-0" />
              {problem}
            </p>
          )}

          {/* What KIND of device this is.
              A token registered as 'web' from something the owner
              believes is the Android app means the Android app is not
              what is installed — and that difference decides whether a
              missing notification is a bug or a build that never
              happened. Worth two words on screen. */}
          {/* ══════════════════════════════════════════════════════
              What is actually running, always visible
              ══════════════════════════════════════════════════════

              Two apps with the same name and the same icon can sit
              side by side on an Android home screen: the installed APK,
              and a shortcut to the website added earlier. Tapping the
              wrong one looks identical and behaves completely
              differently — no bridge, no native push, and code cached
              from whenever the shortcut was last opened.

              Hours were spent on "I installed it and nothing changed"
              without either of us being able to tell which one was
              open. This line answers it in two words, with no tapping,
              and the build id proves whether the code is current. */}
          <p className="mt-1.5 text-[11px] font-bold">
            <span className={NATIVE ? 'text-forest-700' : 'text-amber-700'}>
              {NATIVE ? '● Android app' : '● Browser / home-screen shortcut'}
            </span>
            <span className="ml-1.5 font-semibold text-ink-mute">build {BUILD}</span>
          </p>

          {on && registered[0]?.platform && (
            <p className="mt-1.5 text-[11px] font-bold text-ink-mute">
              Registered as {registered[0].platform === 'web'
                ? 'a browser / home-screen app'
                : `the ${registered[0].platform} app`}
            </p>
          )}

          {on && (
            <>
              <button
                onClick={sendTest}
                disabled={testing}
                className="mt-2.5 flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-[12.5px] font-extrabold text-ink ring-1 ring-ink/[0.08] disabled:opacity-60"
              >
                {testing && <Loader2 size={13} className="animate-spin" />}
                Send me a test alert
              </button>
              {/* Only when the answer is surprising.

                  An installed APK that reports itself as a browser has
                  one of two problems needing opposite fixes, and which
                  one it is can only be read off the device. */}
              <button
                onClick={() => setDiag(d => (d ? null : nativeDiagnostics()))}
                className="mt-2 block text-[11px] font-bold text-ink-mute underline-offset-2 hover:underline"
              >
                {diag ? 'Hide' : 'Why does it say that?'}
              </button>

              {diag && (
                <pre className="mt-1.5 overflow-x-auto rounded-xl bg-ink/[0.04] p-2.5 text-[10.5px] leading-relaxed text-ink-soft">
                  {Object.entries(diag).map(([k, v]) =>
                    `${k.padEnd(11)}${v === null ? '-' : String(v)}`).join(String.fromCharCode(10))}
                </pre>
              )}

              {tested && (
                <p className="mt-2 text-[11.5px] font-semibold leading-snug text-ink-soft">{tested}</p>
              )}
            </>
          )}

          <button
            onClick={on ? turnOff : turnOn}
            disabled={busy}
            className={`mt-3 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13.5px] font-extrabold transition active:scale-[0.98] disabled:opacity-50 ${
              on
                ? 'bg-white text-ink-soft ring-1 ring-ink/[0.08]'
                : 'bg-saffron-400 text-plum-950'
            }`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {on ? 'Turn off' : 'Turn on alerts'}
          </button>
        </div>
      </div>
    </div>
  )
}
