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
  /* The device stamp, one tap away rather than always on screen.
     Separate from `diag`, which holds the result of a push scan --
     one is "what am I running", the other is "why did a send fail". */
  const [showDetails, setShowDetails] = useState(false)

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
      {/* ══════════════════════════════════════════════════════════════
          WORKING, IT IS ONE LINE
          ══════════════════════════════════════════════════════════════

          This card sat at the very top of the Jobs tab — above the offers
          the app exists to show — at 120-140px even when everything was
          fine. A 40px icon badge, a heading, a sentence, three buttons of
          equal weight, and a <pre> of diagnostics.

          Everything in it except the on/off state is for us. A partner
          whose alerts are on has nothing to do here, and the tab's whole
          job is the offer underneath.

          So: on and healthy, one row. Off, or broken, it keeps its full
          size — those are the two states that have to earn a tap. */}
      <div className={`flex gap-3 ${on && !problem ? 'items-center' : 'items-start'}`}>
        <span className={`shrink-0 flex items-center justify-center rounded-full ${
          on && !problem ? 'h-7 w-7' : 'mt-0.5 h-10 w-10'
        } ${on ? 'bg-forest-600 text-white' : 'bg-saffron-400/20 text-saffron-700'}`}>
          {on ? <Bell size={on && !problem ? 14 : 17} /> : <BellOff size={17} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`font-extrabold leading-tight text-ink ${
            on && !problem ? 'text-[13px]' : 'text-[14.5px]'
          }`}>
            {on ? 'Job alerts are on' : 'Turn on job alerts'}
          </p>

          {/* On and healthy, the sentence goes: a partner who has already
              turned them on does not need to be told what they do. Off, it
              has to earn a tap, so it keeps the reason — a master who
              understands WHY 45 seconds matters leaves alerts on. */}
          {!(on && !problem) && (
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
              {on
                ? 'We will buzz your phone when a job near you comes up.'
                : 'A job is offered to a few masters at once and the first to accept gets it. Without alerts you will only see jobs while this page is open.'}
            </p>
          )}

          {problem && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] font-semibold leading-snug text-amber-800">
              <TriangleAlert size={13} className="mt-0.5 shrink-0" />
              {problem}
            </p>
          )}

          {/* The build stamp and the registration line moved behind
              Details. They were built while chasing a push bug that is
              fixed, and on a working app they are debug output above the
              two controls that do something. Still one tap away, because
              the next time push breaks an APK and a home-screen shortcut
              look identical and behave completely differently. */}
          {showDetails && (
            <div className="mt-2 rounded-xl bg-ink/[0.03] p-2.5 text-[11px] font-bold text-ink-mute">
              <p>
                <span className={NATIVE ? 'text-forest-700' : 'text-amber-700'}>
                  {NATIVE ? '● Android app' : '● Browser / home-screen shortcut'}
                </span>
                <span className="ml-1.5 font-semibold">build {BUILD}</span>
              </p>
              {on && registered[0]?.platform && (
                <p className="mt-1">
                  Registered as {registered[0].platform === 'web' ? 'a browser' : 'the Android app'}
                </p>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TWO CONTROLS, ON ONE ROW
              ══════════════════════════════════════════════════════════

              This was a stacked column: a full-width test button, then
              Details, then Turn off — three rows of chrome for a setting
              that is already on and working, sitting directly above the
              jobs the app was opened for.

              Alerts are a switch. A switch is one line of text and the
              controls that change it, side by side, the way every other
              row of settings in this app is laid out. Test sits next to
              it because "is this actually working" is the only other
              question anybody has about a notification, and the honest
              answer is a buzz in your hand rather than a status label. */}
          {/* ── Off, or broken: the full row ────────────────────────
              Turning them ON is the decision worth a big button, and a
              partner whose alerts are broken needs Test and Details right
              there. Neither is true of somebody whose alerts are simply
              working. */}
          {!(on && !problem) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                onClick={on ? turnOff : turnOn}
                disabled={busy}
                className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-[13px] font-extrabold transition active:scale-[0.98] disabled:opacity-50 ${
                  on ? 'bg-white text-ink-soft ring-1 ring-ink/[0.08]' : 'bg-saffron-400 text-plum-950'
                }`}
              >
                {busy && <Loader2 size={13} className="animate-spin" />}
                {on ? 'Turn off' : 'Turn on alerts'}
              </button>

              {on && (
                <button
                  onClick={sendTest}
                  disabled={testing}
                  className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2 text-[13px] font-extrabold text-ink ring-1 ring-ink/[0.08] disabled:opacity-60"
                >
                  {testing && <Loader2 size={13} className="animate-spin" />}
                  Test alert
                </button>
              )}

              {on && (
                <button
                  onClick={() => {
                    setShowDetails(v => !v)
                    setDiag(d => (d ? null : nativeDiagnostics()))
                  }}
                  className="ml-auto text-[11.5px] font-bold text-ink-mute underline-offset-2 hover:underline"
                >
                  {showDetails ? 'Hide' : 'Details'}
                </button>
              )}
            </div>
          )}

          {/* ── On and healthy: everything behind one dot ───────────────
              Turn off, Test and the diagnostics still exist and are one
              tap away. They are simply not three controls of equal weight
              at the top of the screen a partner opened to see their
              offers. */}

          {on && !problem && showDetails && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={turnOff}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.08] disabled:opacity-50"
              >
                {busy && <Loader2 size={12} className="animate-spin" />}
                Turn off
              </button>
              <button
                onClick={sendTest}
                disabled={testing}
                className="flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-ink ring-1 ring-ink/[0.08] disabled:opacity-60"
              >
                {testing && <Loader2 size={12} className="animate-spin" />}
                Test alert
              </button>
            </div>
          )}

          {diag && (
            <pre className="mt-1.5 overflow-x-auto rounded-xl bg-ink/[0.04] p-2.5 text-[10.5px] leading-relaxed text-ink-soft">
              {Object.entries(diag).map(([k, v]) =>
                `${k.padEnd(11)}${v === null ? '-' : String(v)}`).join(String.fromCharCode(10))}
            </pre>
          )}

          {tested && (
            <p className="mt-2 text-[11.5px] font-semibold leading-snug text-ink-soft">{tested}</p>
          )}
        </div>
        {on && !problem && (
          <button
            onClick={() => {
              setShowDetails(v => !v)
              setDiag(d => (d ? null : nativeDiagnostics()))
            }}
            aria-label={showDetails ? 'Hide alert settings' : 'Alert settings'}
            aria-expanded={showDetails}
            className="shrink-0 rounded-full px-2 py-1 text-[15px] font-extrabold leading-none text-ink-mute active:bg-ink/[0.05]"
          >
            ···
          </button>
        )}
      </div>
    </div>
  )
}
