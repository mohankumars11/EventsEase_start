/**
 * Two things that must happen before React renders.
 *
 * ══════════════════════════════════════════════════════════════════════
 * 1 · EVICT A SERVICE WORKER THAT SHOULD NEVER HAVE SHIPPED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every partner apk built before this change contains vite-plugin-pwa's
 * worker, because the local build script never set CAPACITOR_BUILD (see
 * scripts/build-native.mjs for the whole story).
 *
 * Fixing the build fixes the NEXT apk. It does nothing for a phone that
 * already ran an old one, because a WebView's service worker and Cache
 * Storage survive an apk-over-apk install -- only a true uninstall or
 * "clear data" removes them. Those installs would keep booting a stale
 * shell, keep asking for chunk hashes that no longer exist, and keep
 * landing on "Something went wrong" for as long as the app stays
 * installed.
 *
 * So the new build evicts the old worker on first launch. Idempotent:
 * once there is nothing to unregister this costs one resolved promise.
 *
 * ── Only on native ──────────────────────────────────────────────────
 * On the web the worker is wanted -- it is what makes the site work on
 * a bad connection, and `push.js` registers its OWN worker for FCM,
 * which this must never touch. The guard is `window.Capacitor`, the
 * same bridge test `partnerLocation.js` uses.
 *
 * ══════════════════════════════════════════════════════════════════════
 * 2 · A MISSING CHUNK IS A RELOAD, NOT A DEAD END
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every partner route is `React.lazy`. When a dynamic import 404s --
 * after a deploy on the web, or after the eviction above on native --
 * the rejection reaches no handler at all, so it surfaces as a render
 * error and the partner sees the error boundary.
 *
 * Vite fires `vite:preloadError` for exactly this. Reloading once
 * fetches the current index.html and the chunk names in it.
 *
 * ── Once, and provably once ─────────────────────────────────────────
 * A reload that fails the same way is an infinite loop, which is worse
 * than the error screen: the error screen at least stops. The flag
 * lives in sessionStorage so it clears when the app is really
 * restarted, and every access is wrapped -- a storage read that throws
 * must not become the thing that breaks the boot.
 */

/** The bridge test. True inside the apk, false in a browser. */
export const isNative = () =>
  typeof window !== 'undefined' && !!window.Capacitor

const RELOADED = 'sb_chunk_reload_v1'

const flagged = () => {
  try { return sessionStorage.getItem(RELOADED) === '1' } catch { return false }
}
const flag = () => {
  try { sessionStorage.setItem(RELOADED, '1') } catch { /* private mode */ }
}
/** Called once the app has rendered, so the next failure gets its reload. */
export const clearReloadFlag = () => {
  try { sessionStorage.removeItem(RELOADED) } catch { /* private mode */ }
}

/**
 * Unregister every service worker and drop every cache. Native only.
 *
 * Returns whether anything was actually removed, so the caller can
 * decide to reload -- a page already being served BY the worker it just
 * unregistered is still running the stale shell until it does.
 */
export async function evictServiceWorkers() {
  if (!isNative()) return false
  let removed = false

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) {
        /* eslint-disable-next-line no-await-in-loop -- there is at most one */
        const gone = await reg.unregister()
        removed = removed || gone
      }
      if (regs.length) {
        console.warn(`[Sambramo] Removed ${regs.length} service worker(s) left by an older apk.`)
      }
    }
  } catch (err) {
    /* Never fatal. A WebView that cannot enumerate its workers is still
       a WebView that can run the app. */
    console.warn('[Sambramo] Could not enumerate service workers:', err?.message ?? err)
  }

  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      for (const key of keys) {
        /* eslint-disable-next-line no-await-in-loop */
        await caches.delete(key)
      }
      if (keys.length) {
        removed = true
        console.warn(`[Sambramo] Dropped ${keys.length} stale cache(s).`)
      }
    }
  } catch (err) {
    console.warn('[Sambramo] Could not clear caches:', err?.message ?? err)
  }

  return removed
}

/** Guards the one reload below, so an eviction cannot become a loop. */
const EVICTED = 'sb_sw_evicted_v1'

/**
 * Evict, and then RELOAD if anything was there.
 *
 * ---- Why the reload is the whole point --------------------------
 * Unregistering a service worker does not un-serve the page it already
 * served. On a phone upgrading from one of the old apks, the stale
 * worker answers the launch navigation from its precache, THEN this
 * runs and removes it -- and the partner spends that entire session
 * looking at the previous build. Every new screen is in the apk and
 * none of it is on screen.
 *
 * That is exactly what "the apk is completely old, nothing is visible"
 * looks like from the outside, and the first version of this file
 * returned `removed` with a comment saying the caller should decide to
 * reload, and then main.jsx threw the answer away.
 *
 * So the decision lives here, where the fact is. One reload, flagged in
 * sessionStorage: the flag survives the reload and is gone on the next
 * cold start, so a device that somehow always has something to evict
 * reloads once per launch rather than for ever.
 */
export async function evictAndRefresh() {
  let alreadyTried = false
  try { alreadyTried = sessionStorage.getItem(EVICTED) === '1' } catch { /* private mode */ }

  const removed = await evictServiceWorkers()
  if (!removed || alreadyTried) return removed

  try { sessionStorage.setItem(EVICTED, '1') } catch { /* private mode */ }
  console.warn('[Sambramo] A stale worker was serving this page. Reloading into the installed build.')
  window.location.reload()
  return removed
}

/**
 * Turn a failed chunk fetch into one reload.
 *
 * `vite:preloadError` is cancelable; preventing the default stops Vite
 * rethrowing it into the render, which is what produced the boundary.
 */
export function handleChunkFailures() {
  if (typeof window === 'undefined') return

  const recover = event => {
    if (flagged()) {
      /* Already tried. Let it through to the error boundary, which can
         at least offer a way out of the flow. */
      console.error('[Sambramo] A chunk is still missing after a reload.', event?.payload ?? event)
      return
    }
    event?.preventDefault?.()
    flag()
    console.warn('[Sambramo] A code chunk was missing. Reloading once.')
    window.location.reload()
  }

  window.addEventListener('vite:preloadError', recover)

  /* The same failure arrives as an unhandled rejection when the import
     was not a preload -- a lazy route entered by navigation rather than
     by a link hover. Matched on the message because there is no error
     type to test for. */
  window.addEventListener('unhandledrejection', event => {
    const msg = String(event?.reason?.message ?? event?.reason ?? '')
    if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg)) {
      recover(event)
    }
  })
}
