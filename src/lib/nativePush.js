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
export async function enableNativePush({ profileId, app = 'partner' }) {
  if (!isNativeApp()) return { ok: false, reason: 'not_native' }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

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
  if (!isNativeApp()) return () => {}

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
