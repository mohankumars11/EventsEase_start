import { isNativeApp, nativePlatform } from '../../lib/nativePush'

/**
 * Which app is this, and how old is its code.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE QUESTION NOBODY COULD ANSWER FROM A SCREEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * An installed APK and a home-screen shortcut to the same site carry the
 * same name and the same icon on Android. Tapping the shortcut opens
 * Chrome with no Capacitor bridge and no native push, and looks
 * identical to opening the app.
 *
 * The partner side has carried this line for a while and it is what
 * finally settled "I installed it and nothing changed" — the answer was
 * that the thing on screen had never been the app. The customer side had
 * no equivalent, so the same hours were about to be spent again.
 *
 * Two facts, because either alone misleads:
 *
 *   native?   green means the real app, amber means a browser
 *   build     native code from three deploys ago is still wrong code
 *
 * Small, quiet, and always present. It costs nothing to carry and it is
 * the difference between diagnosing this in one glance or in an
 * afternoon.
 */

/* Inside the app, or in a browser?
 *
 * The test is the BRIDGE, not `isNativePlatform()`. That call has been
 * wrong three times in this codebase — it silently routed push down the
 * web path, it silently skipped registering the notification-tap
 * listener, and it decides this origin, where being wrong would make an
 * absolute URL come out relative.
 *
 * If `window.Capacitor` exists at all, this is the app. */
const NATIVE = typeof window !== 'undefined' && !!window.Capacitor
const BUILD = (import.meta.env?.VITE_BUILD ?? 'dev').slice(0, 7)

export default function AppBadge({ className = '' }) {
  return (
    <p className={`text-[11px] font-bold ${className}`}>
      <span className={NATIVE ? 'text-forest-700' : 'text-amber-700'}>
        {NATIVE ? `● Android app (${nativePlatform()})` : '● Browser / home-screen shortcut'}
      </span>
      <span className="ml-1.5 font-semibold text-ink-mute">build {BUILD}</span>
    </p>
  )
}

/** For anywhere that needs the fact rather than the badge. */
export { NATIVE as IS_NATIVE_APP, BUILD as APP_BUILD }
