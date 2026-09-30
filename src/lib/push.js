import { supabase } from './supabase'

/**
 * Push notifications, and the honest reason they are not optional.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WITHOUT THIS, DISPATCH DOES NOT WORK IN THE REAL WORLD
 * ══════════════════════════════════════════════════════════════════════
 *
 * A master has 45 seconds to answer a job. The offer inbox updates over
 * Supabase Realtime with polling underneath, which is correct and
 * complete — while the app is OPEN.
 *
 * It is almost never open. A decorator is in their shop, driving a van,
 * or with a customer. Every offer sent to a closed app expires unseen,
 * and the customer's screen shows "still looking" while a master three
 * kilometres away had no idea they were asked. That is not a degraded
 * experience; it is the marketplace not functioning.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERY PATH DEGRADES TO SILENCE, NEVER TO AN ERROR
 * ══════════════════════════════════════════════════════════════════════
 *
 * Firebase config absent, permission denied, Safari on iOS below 16.4,
 * a private window, a browser that has never supported the Push API —
 * all of these are ordinary and none of them is a fault. This module
 * returns a reason and lets the caller decide what to say.
 *
 * The one thing it must never do is block. A master who declines the
 * permission prompt still has a working app; they just have to open it.
 */

const CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

/** Is push even possible here, before anything is asked of the user? */
export function pushAvailability() {
  if (!CONFIG.apiKey || !CONFIG.projectId || !VAPID_KEY) {
    return { ok: false, reason: 'not_configured', scan: 'Alerts not set up yet' }
  }
  if (typeof window === 'undefined') return { ok: false, reason: 'no_window' }
  if (!('serviceWorker' in navigator)) {
    return { ok: false, reason: 'no_service_worker', scan: 'This browser cannot show alerts' }
  }
  if (!('Notification' in window)) {
    return { ok: false, reason: 'no_notifications', scan: 'This browser cannot show alerts' }
  }
  if (Notification.permission === 'denied') {
    return {
      ok: false,
      reason: 'denied',
      scan: 'Alerts are blocked',
      detail: 'Turn notifications back on for this site in your browser settings, then reload.',
    }
  }
  return { ok: true, granted: Notification.permission === 'granted' }
}

/**
 * The SDK is imported only when it is actually going to be used.
 *
 * Firebase is a large dependency and most visitors are customers who
 * will never register for partner alerts. A static import would put it
 * in the entry bundle for all of them.
 */
async function messaging() {
  const [{ initializeApp, getApps }, { getMessaging, isSupported }] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ])
  if (!(await isSupported())) return null
  const app = getApps().length ? getApps()[0] : initializeApp(CONFIG)
  return getMessaging(app)
}

/**
 * FCM's own service worker, at its own scope.
 *
 * `vite-plugin-pwa` already owns `/sw.js` at scope `/`. FCM registers
 * `/firebase-messaging-sw.js` at `/firebase-cloud-messaging-push-scope`,
 * so the two coexist — registering a second worker at the SAME scope
 * would replace the first and take the PWA's offline behaviour with it.
 */
async function pushWorker() {
  /* The config travels on the URL.
   *
   * A service worker runs outside the bundler: it cannot read
   * `import.meta.env`, cannot import from `src/`, and is fetched as a
   * static file. Query parameters are the one channel a registration has,
   * and the worker reads them from its own `location.search`.
   *
   * Nothing here is secret. The Firebase web config identifies the
   * project and authorises nothing — the key that authorises SENDING is
   * FIREBASE_SERVICE_ACCOUNT on the server and never reaches a browser.
   */
  const qs = new URLSearchParams({
    apiKey: CONFIG.apiKey,
    authDomain: CONFIG.authDomain,
    projectId: CONFIG.projectId,
    senderId: CONFIG.messagingSenderId,
    appId: CONFIG.appId,
  })

  return navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${qs}`,
    { scope: '/firebase-cloud-messaging-push-scope' },
  )
}

/**
 * Ask for permission and record the device.
 *
 * Called from a real tap, never on page load. A permission prompt that
 * appears unbidden is refused by most people and cannot be asked again —
 * so it is spent at the one moment the answer is obviously yes: a master
 * pressing "turn on job alerts".
 */
export async function enablePush({ profileId, app = 'partner' }) {
  const can = pushAvailability()
  if (!can.ok) return can

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { ok: false, reason: 'declined', scan: 'You said no to alerts' }
    }

    const m = await messaging()
    if (!m) return { ok: false, reason: 'unsupported', scan: 'This browser cannot show alerts' }

    const { getToken } = await import('firebase/messaging')
    const token = await getToken(m, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await pushWorker(),
    })

    if (!token) return { ok: false, reason: 'no_token', scan: 'Could not turn on alerts' }

    // `token` is unique per install and FCM reissues it to whichever
    // install currently holds it — which is why `uq_push_tokens_token`
    // (migration 065) is on the token rather than on (profile, device).
    const { error } = await supabase.from('push_tokens').upsert({
      profile_id: profileId,
      token,
      platform: 'web',
      app,
      device_label: deviceLabel(),
      last_seen_at: new Date().toISOString(),
      failure_count: 0,
    }, { onConflict: 'token' })

    if (error) return { ok: false, reason: 'save_failed', detail: error.message }

    return { ok: true, token }
  } catch (err) {
    // A thrown Firebase error is still just "no alerts today".
    return { ok: false, reason: 'error', detail: err?.message ?? String(err) }
  }
}

/**
 * Stop this device receiving alerts.
 *
 * Deletes the row rather than flagging it. A master who turns alerts off
 * has withdrawn consent, and keeping the token against a disabled flag is
 * keeping a contactable address they asked us not to use.
 */
export async function disablePush({ profileId }) {
  try {
    const m = await messaging()
    if (m) {
      const { getToken, deleteToken } = await import('firebase/messaging')
      const token = await getToken(m, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await pushWorker(),
      }).catch(() => null)
      if (token) {
        await supabase.from('push_tokens').delete().eq('token', token)
        await deleteToken(m).catch(() => {})
      }
    }
    return { ok: true }
  } catch {
    // Best effort. If the token cannot be read, the row is orphaned and
    // the send path prunes it after repeated failures.
    await supabase.from('push_tokens').delete().eq('profile_id', profileId)
    return { ok: true }
  }
}

/**
 * A message arriving while the app is in the foreground.
 *
 * FCM does not show a system notification in that case — the page is
 * already visible and a banner over content somebody is looking at is
 * noise. The caller decides: usually refresh the offer list.
 */
export async function onForegroundPush(handler) {
  const can = pushAvailability()
  if (!can.ok) return () => {}
  const m = await messaging().catch(() => null)
  if (!m) return () => {}
  const { onMessage } = await import('firebase/messaging')
  return onMessage(m, handler)
}

function deviceLabel() {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad/i.test(ua)) return 'iPhone'
  if (/windows/i.test(ua)) return 'Windows'
  if (/mac/i.test(ua)) return 'Mac'
  return 'Browser'
}

/* ══════════════════════════════════════════════════════════════════════
   ONE DOOR, WHICHEVER SHELL THIS IS RUNNING IN
   ══════════════════════════════════════════════════════════════════════

   Everything above is Web Push — a service worker and a VAPID key, which
   is what a browser has. Inside the Capacitor apps the OS provides push
   directly, through FCM on Android and APNs on iOS, and that path lives
   in lib/nativePush.js.

   Callers should not have to know which. A screen with a "turn on job
   alerts" button wants to turn on job alerts; picking the mechanism is
   this module's problem, not that button's.

   Both paths write the same `push_tokens` row and are sent to by the
   same api/_lib/fcm.js. FCM abstracts the difference server-side, so the
   split exists only here.
*/

import { isNativeApp, enableNativePush, disableNativePush, nativePlatform } from './nativePush'

/** Can this device receive alerts at all, and if not, why not. */
export function alertsAvailability() {
  // Same rule as enableAlerts: a bridge means native, whatever
  // isNativePlatform() happens to answer.
  if (typeof window !== 'undefined' && window.Capacitor) {
    // The native shell always can. The only question is permission, and
    // that is asked at the moment the master taps.
    return { ok: true, via: 'native', platform: nativePlatform() }
  }
  return { ...pushAvailability(), via: 'web' }
}

/**
 * Turn alerts on, whichever shell this is.
 *
 * The one call a screen should make. Native first: inside the app the
 * OS path is more reliable under battery optimisation, which is exactly
 * when a 45-second offer arrives.
 */
export async function enableAlerts({ profileId, app = 'partner' }) {
  /* ══════════════════════════════════════════════════════════════════
     THE WEB PATH CANNOT WORK INSIDE THE APP, SO IT MUST NOT BE TRIED
     ══════════════════════════════════════════════════════════════════

     An Android WebView does not implement the Notification API at all.
     `'Notification' in window` is false, so `pushAvailability()` returns
     `no_notifications` and the whole thing fails INSTANTLY — before any
     permission dialog, with a message that says nothing.

     That is exactly what a real device reported: tap "Turn on alerts",
     no system dialog, immediate "Could not turn alerts on".

     The old test was `isNativeApp()`, which reads
     `window.Capacitor.isNativePlatform()`. If the bridge is present but
     that one function is missing or throws, the code silently chose a
     path that CANNOT succeed in a WebView.

     So the test is now "is there a Capacitor bridge at all", and the
     native attempt goes first. Web push is the fallback for an actual
     browser — never a fallback for a bridge that answered oddly. */
  const hasBridge = typeof window !== 'undefined' && !!window.Capacitor

  if (hasBridge) {
    const r = await enableNativePush({ profileId, app })
    // Only 'not_native' means the plugin genuinely is not there. Every
    // other failure is a real native failure and must be reported as
    // itself rather than retried down a path that cannot work.
    if (r.reason !== 'not_native') return r
  }

  return enablePush({ profileId, app })
}

export async function disableAlerts({ profileId }) {
  if (isNativeApp()) return disableNativePush({ profileId })
  return disablePush({ profileId })
}
