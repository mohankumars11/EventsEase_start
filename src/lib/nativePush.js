import { supabase } from './supabase'

/**
 * Push inside the native shell.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE PLACES, TWO MECHANISMS, ONE TABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * This app runs in three environments and push works differently in two
 * of them:
 *
 *   browser        Web Push — a service worker and a VAPID key.
 *                  lib/push.js handles it.
 *
 *   Android app    Native FCM through the OS.
 *   iOS app        Native APNs, which FCM forwards to.
 *                  Both handled here, by @capacitor/push-notifications.
 *
 * All three write the same `push_tokens` row and are sent to by the same
 * `api/_lib/fcm.js`. The server does not need to know which kind of
 * device it is talking to — FCM abstracts that — so the split lives
 * entirely on this side.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS AT ALL, GIVEN WEB PUSH WORKS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Web Push does not work on iOS unless the user has manually added the
 * site to their home screen, on 16.4 or later. In practice that means an
 * iPhone master never receives a job alert — and a master who is not
 * alerted is not a master. Native push is the entire reason the app is
 * a Capacitor shell rather than a TWA.
 *
 * On Android both work; native is used inside the app because it is more
 * reliable under battery optimisation, which is precisely when a
 * 45-second offer arrives.
 */

/** Is the code running inside the Capacitor shell rather than a browser? */
export function isNativeApp() {
  if (typeof window === 'undefined') return false
  return !!window.Capacitor?.isNativePlatform?.()
}

export function nativePlatform() {
  if (!isNativeApp()) return 'web'
  return window.Capacitor?.getPlatform?.() ?? 'web'
}

/**
 * Ask for permission and register this device.
 *
 * The plugin is imported lazily: a browser visitor should not download
 * native bridge code that can never run there, and most visitors are
 * customers who will never register as a partner.
 */
/**
 * The Android channel, without which the OS drops the notification.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ANDROID 8 AND LATER DISCARD A NOTIFICATION WITH NO CHANNEL
 * ══════════════════════════════════════════════════════════════════════
 *
 * Silently. No error to the sender, no entry in logcat that says why,
 * and FCM still returns 200 — the message was delivered and the OS threw
 * it away. `api/_lib/fcm.js` names `sambramo_jobs`, so this is the other
 * half of that line, and shipping one without the other is a system that
 * reports success and buzzes nothing.
 *
 * IMPORTANCE_HIGH, and it is the difference between a banner and a line
 * in the shade. A job offer expires in 45 seconds: a master who has to
 * pull down the notification shade to discover it has already lost it.
 * This is the one alert in the product that earns the interruption.
 */
async function ensureChannel(PushNotifications) {
  if (nativePlatform() !== 'android') return
  try {
    await PushNotifications.createChannel({
      id: 'sambramo_jobs',
      name: 'Job offers',
      description: 'A customer near you needs what you do',
      importance: 5,          // IMPORTANCE_HIGH — heads-up banner + sound
      visibility: 1,          // VISIBILITY_PUBLIC — readable on the lock screen
      sound: 'default',
      vibration: true,
      lights: true,
    })
  } catch {
    /* Already exists, or an Android version that does not have channels.
       Neither is a reason to stop registering the device. */
  }
}

export async function enableNativePush({ profileId, app = 'partner' }) {
  if (!isNativeApp()) return { ok: false, reason: 'not_native' }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await ensureChannel(PushNotifications)

    let permission = await PushNotifications.checkPermissions()
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await PushNotifications.requestPermissions()
    }
    if (permission.receive !== 'granted') {
      return { ok: false, reason: 'declined', scan: 'You said no to alerts' }
    }

    /* Registration is EVENT-DRIVEN, not a promise.
     *
     * `register()` resolves as soon as the request is handed to the OS —
     * the token arrives later on the `registration` event, or never, if
     * the device is offline or APNs is having a bad day. Awaiting
     * `register()` and then reading a token would read nothing.
     *
     * So the listener is attached first and the whole thing is wrapped in
     * a timeout: a master who taps "turn on alerts" and gets no response
     * must be told something, rather than watching a spinner. */
    const token = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('registration timed out')), 15_000)

      PushNotifications.addListener('registration', t => {
        clearTimeout(timer)
        resolve(t.value)
      })
      PushNotifications.addListener('registrationError', err => {
        clearTimeout(timer)
        reject(new Error(err?.error ?? 'registration failed'))
      })

      PushNotifications.register()
    })

    const { error } = await supabase.from('push_tokens').upsert({
      profile_id: profileId,
      token,
      // The platform the token belongs to, because a dead-token prune
      // needs to know which service reported it dead.
      platform: nativePlatform() === 'ios' ? 'ios' : 'android',
      app,
      device_label: nativePlatform() === 'ios' ? 'iPhone' : 'Android',
      last_seen_at: new Date().toISOString(),
      failure_count: 0,
    }, { onConflict: 'token' })

    if (error) return { ok: false, reason: 'save_failed', detail: error.message }

    return { ok: true, token, platform: nativePlatform() }
  } catch (err) {
    return { ok: false, reason: 'error', detail: err?.message ?? String(err) }
  }
}

/**
 * React to a notification the master taps.
 *
 * The payload carries the same `data` fields the web service worker
 * reads — `api/_lib/fcm.js` sends data-only messages precisely so both
 * paths see the same shape.
 */
export async function onNativePushAction(handler) {
  /* The bridge, not isNativePlatform().

     Same reason lib/push.js stopped trusting it: if the bridge is there
     but that one function is missing or throws, this returned a no-op
     and the listener was never registered -- which is indistinguishable
     from a notification that does nothing when you tap it. */
  const hasBridge = typeof window !== 'undefined' && !!window.Capacitor
  if (!hasBridge) return () => {}

  const { PushNotifications } = await import('@capacitor/push-notifications')

  const tapped = await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    action => handler({ tapped: true, data: action.notification?.data ?? {} }),
  )

  const received = await PushNotifications.addListener(
    'pushNotificationReceived',
    notification => handler({ tapped: false, data: notification?.data ?? {} }),
  )

  return () => { tapped.remove(); received.remove() }
}

/** Stop this device receiving alerts, and forget the token. */
export async function disableNativePush({ profileId }) {
  if (!isNativeApp()) return { ok: false, reason: 'not_native' }
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllListeners()
    // The row is deleted rather than flagged: a master who turned alerts
    // off has withdrawn consent, and keeping a contactable address they
    // asked us not to use is not a technical decision.
    await supabase.from('push_tokens').delete().eq('profile_id', profileId)
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: 'error', detail: err?.message ?? String(err) }
  }
}

/**
 * What the native bridge actually looks like from inside the page.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS ON A SCREEN AND NOT IN A CONSOLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A phone running an installed APK reported "Registered as a browser",
 * meaning `window.Capacitor` was absent inside the app. There are two
 * possible reasons and they need opposite fixes:
 *
 *   the shell is not Capacitor at all      the site was added to the
 *                                          home screen, not installed
 *
 *   Capacitor is there but did not inject  the WebView lacks
 *                                          DOCUMENT_START_SCRIPT, so
 *                                          the bridge never reaches a
 *                                          REMOTE server.url — the
 *                                          fallback injector only
 *                                          rewrites local assets
 *
 * The first is a misunderstanding; the second means abandoning
 * server.url and bundling the web assets, which changes how every
 * future deploy reaches a phone. Choosing between them by reasoning
 * about Android versions is guesswork. This reads the answer off the
 * device in one line.
 *
 * Costs nothing in a browser: the strings are short and the whole thing
 * is behind a tap.
 */
export function nativeDiagnostics() {
  if (typeof window === 'undefined') return { where: 'no window' }

  const ua = navigator.userAgent ?? ''
  const cap = window.Capacitor

  return {
    // The decisive one. `undefined` in an installed APK means the
    // bridge did not inject.
    bridge: cap ? 'present' : 'ABSENT',
    platform: cap?.getPlatform?.() ?? null,
    isNative: !!cap?.isNativePlatform?.(),
    // Which plugins the bridge exposed. An empty list with a present
    // bridge means `npx cap sync` did not run before the build.
    plugins: cap?.Plugins ? Object.keys(cap.Plugins).join(', ') : null,
    // A Capacitor WebView reports `wv` in its user agent; a Chrome tab
    // does not. This separates "installed APK whose bridge failed" from
    // "site added to the home screen", which is the whole question.
    webview: /\bwv\b/.test(ua),
    standalone: window.matchMedia?.('(display-mode: standalone)')?.matches ?? false,
    ua: ua.slice(0, 110),
  }
}
