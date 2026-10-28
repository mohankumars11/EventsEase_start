/**
 * Sharing and outside links that work inside the APK (Mohan, 2026-10-28:
 * "the sharing link is not even working").
 *
 * Android's WebView has no `navigator.share`, and it ignores
 * `<a target="_blank">` / `window.open` — so on the phone every Share
 * button fell through to a clipboard write that the WebView also refuses,
 * and every WhatsApp link did nothing. On the phone these use the native
 * plugins already in the app (@capacitor/share for the share sheet,
 * @capacitor/browser for wa.me / maps); on the web, the web APIs.
 */
const native = () => typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

/** Copy text — the Clipboard API, then the old textarea route the WebView allows. */
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true } catch { /* WebView refuses — try the old way */ }
  try {
    const a = document.createElement('textarea')
    a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'
    document.body.appendChild(a); a.select(); a.setSelectionRange(0, t.length)
    const ok = document.execCommand('copy'); a.remove(); return ok
  } catch { return false }
}

/** The share sheet: native on the phone, Web Share on the web, else copy. → 'shared' | 'dismissed' | 'copied' | 'failed' */
export async function shareOut({ title = 'Sambramo', text = '', url = '' } = {}) {
  if (native()) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text, url: url || undefined, dialogTitle: title })
      return 'shared'
    } catch (e) { if (/cancel/i.test(String(e?.message ?? e))) return 'dismissed' /* else fall through to copy */ }
  } else if (navigator.share) {
    try { await navigator.share({ title, text, ...(url ? { url } : {}) }); return 'shared' } catch { return 'dismissed' }
  }
  return (await copyText([text, url].filter(Boolean).join('\n'))) ? 'copied' : 'failed'
}

/** Open a link outside the app (WhatsApp, Maps, the website). */
export async function openExternal(url) {
  if (!url) return false
  if (native()) {
    try { const { Browser } = await import('@capacitor/browser'); await Browser.open({ url }); return true } catch { /* fall through */ }
  }
  window.open(url, '_blank', 'noopener')
  return true
}

/** WhatsApp, to one number or to the chooser. */
export const whatsappLink = (text, phone = null) => `https://wa.me/${phone ? String(phone).replace(/\D/g, '') : ''}?text=${encodeURIComponent(text)}`

/** On the phone, send every <a target="_blank"> and http(s) link that leaves the app through openExternal. Once. */
export function installExternalLinks() {
  if (!native() || window.__sbmExternalLinks) return
  window.__sbmExternalLinks = true
  document.addEventListener('click', e => {
    const a = e.target?.closest?.('a[href]')
    if (!a) return
    const href = a.getAttribute('href') ?? ''
    const outside = /^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)
    if (a.target === '_blank' || outside || /^(whatsapp|tel|mailto):/i.test(href)) {
      if (/^(tel|mailto):/i.test(href)) return // the WebView hands these to the dialer / mail app itself
      e.preventDefault()
      openExternal(href)
    }
  }, true)
}
