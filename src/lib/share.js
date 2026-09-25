/**
 * Open the phone's own share sheet.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `navigator.share` DOES NOT EXIST INSIDE AN ANDROID WEBVIEW
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is the whole bug. The Web Share API is implemented by Chrome, not
 * by the WebView component Capacitor embeds — Android System WebView
 * does not expose `navigator.share` at all unless the host app wires up
 * `WebChromeClient` itself.
 *
 * So `if (navigator.share) { … } else { copy to clipboard }` looked
 * correct, passed in a desktop browser, and in the apk silently took the
 * else branch every single time. A partner tapping "Share your code"
 * got nothing visible: no sheet, no WhatsApp, no confirmation. It had
 * copied something to a clipboard nobody asked about.
 *
 * `@capacitor/share` is the plugin that bridges to Android's
 * `Intent.ACTION_SEND`, which is the thing that actually raises the
 * chooser with WhatsApp, Instagram, Messages and the rest.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE ROUTES, AND THE CALLER IS TOLD WHICH ONE RAN
 * ══════════════════════════════════════════════════════════════════════
 *
 *   native     the OS sheet, via the plugin          — in the apk
 *   web        `navigator.share`                     — a real browser
 *   clipboard  copied, and the caller must SAY so    — last resort
 *
 * The last one is why this returns a result instead of a boolean. A
 * fallback that happens silently is indistinguishable from a button
 * that does nothing, which is the bug being fixed here — so the caller
 * gets `how` and has to put something on screen for it.
 */

export const SHARE = {
  NATIVE: 'native',
  WEB: 'web',
  CLIPBOARD: 'clipboard',
  DISMISSED: 'dismissed',
  FAILED: 'failed',
}

/**
 * @returns {Promise<{ ok: boolean, how: string }>}
 */
export async function shareText({ title = null, text, url = null, dialogTitle = 'Share' }) {
  const payload = { title, text, url, dialogTitle }

  /* ── 1 · The plugin, when the bridge is there ──────────────────────
     Tested on `window.Capacitor` rather than `isNativePlatform()`:
     that call has been wrong three times in this codebase and it
     decides, here, whether a partner sees a share sheet at all.

     Imported dynamically so a web build never pays for it and so this
     module stays loadable outside a bundler. */
  if (typeof window !== 'undefined' && window.Capacitor) {
    try {
      const { Share } = await import('@capacitor/share')
      const can = await Share.canShare()
      if (can?.value) {
        await Share.share(payload)
        return { ok: true, how: SHARE.NATIVE }
      }
    } catch (err) {
      /* A dismissed sheet rejects on Android, and a dismissal is not a
         failure — the partner decided not to share. Anything else falls
         through to the routes below. */
      if (/cancel|dismiss|abort/i.test(String(err?.message ?? ''))) {
        return { ok: false, how: SHARE.DISMISSED }
      }
    }
  }

  /* ── 2 · A real browser ──────────────────────────────────────────── */
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: title ?? undefined, text, url: url ?? undefined })
      return { ok: true, how: SHARE.WEB }
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, how: SHARE.DISMISSED }
    }
  }

  /* ── 3 · The clipboard, said out loud ─────────────────────────────
     `navigator.clipboard` needs a secure context and is absent on some
     older WebViews, so the textarea trick stays as the floor. */
  const full = [text, url].filter(Boolean).join(' ')
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(full)
      return { ok: true, how: SHARE.CLIPBOARD }
    }
    const el = document.createElement('textarea')
    el.value = full
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const done = document.execCommand('copy')
    document.body.removeChild(el)
    return done ? { ok: true, how: SHARE.CLIPBOARD } : { ok: false, how: SHARE.FAILED }
  } catch {
    return { ok: false, how: SHARE.FAILED }
  }
}

/** What to put on screen for each outcome. Never silence. */
export function shareSaid(how) {
  switch (how) {
    case SHARE.NATIVE:
    case SHARE.WEB:       return null                    // the sheet WAS the feedback
    case SHARE.CLIPBOARD: return 'Copied. Paste it into WhatsApp or a message.'
    case SHARE.DISMISSED: return null
    default:              return 'That did not work. Read the code out instead.'
  }
}
