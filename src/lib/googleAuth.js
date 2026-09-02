import { supabase } from './supabase'
import { isNativeApp } from './nativePush'

/**
 * "Continue with Google", in a WebView Google refuses to sign anyone into.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE BUTTON WAS HIDDEN IN THE APK
 * ══════════════════════════════════════════════════════════════════════
 *
 * `LoginPage` and `SignupPage` both wrapped the Google button in
 * `!isNativeApp()`. That was not an oversight — it was the only honest
 * option at the time. Google blocks OAuth from embedded WebViews
 * outright (`disallowed_useragent`), so the plain `signInWithOAuth()`
 * call that works in a browser navigates the Capacitor WebView to a
 * Google error page and strands somebody mid-sign-in with no way back.
 *
 * Hiding it meant the APK — the thing partners actually install — had no
 * Google sign-in at all, which is what was reported: "there is no
 * continue with Google".
 *
 * ══════════════════════════════════════════════════════════════════════
 * SO THE APP HANDS THE SIGN-IN TO A REAL BROWSER AND TAKES IT BACK
 * ══════════════════════════════════════════════════════════════════════
 *
 *   1  ask Supabase for the OAuth URL but DO NOT follow it
 *      (`skipBrowserRedirect`) — the WebView must never load it
 *   2  open that URL in a Custom Tab via @capacitor/browser. A Custom Tab
 *      is Chrome, not a WebView, so Google allows it — and it already
 *      holds the Google session on the device, which is the whole reason
 *      somebody taps this button instead of typing an email
 *   3  Google returns to `com.sambramo.partner://auth`, which the
 *      manifest claims, so Android reopens the app
 *   4  `appUrlOpen` fires with that URL; exchange the code for a session
 *      and close the tab
 *
 * ── Why PKCE and not the implicit flow ──────────────────────────────
 * The code comes back in the query string and is exchanged over HTTPS by
 * the app itself. A custom scheme can, in principle, be claimed by
 * another installed app; PKCE means intercepting the redirect is not
 * enough to steal the session, because the verifier never leaves this
 * device's storage. Tokens in a URL fragment would have no such
 * protection.
 *
 * ── The one thing that is not in this file ──────────────────────────
 * `com.sambramo.app://auth` and `com.sambramo.partner://auth` must be
 * listed under Supabase → Authentication → URL Configuration → Redirect
 * URLs. Supabase refuses to redirect anywhere not on that list, so
 * without it this returns a Supabase error page in the Custom Tab rather
 * than coming home. That is a dashboard setting; nothing in the repo can
 * assert it.
 */

/* The scheme the manifest claims is the applicationId, so it differs per
   flavour and cannot be hardcoded. Capacitor exposes the running app's
   id, and the web build never reaches this branch. */
async function nativeRedirectUrl() {
  const { App } = await import('@capacitor/app')
  const { id } = await App.getInfo()
  return `${id}://auth`
}

let listening = false

/**
 * Start Google sign-in. Resolves once the browser has been handed the
 * URL — the session arrives later, through the deep link, and the
 * AuthContext subscription picks it up the same way it picks up any
 * other sign-in.
 */
export async function startGoogleSignIn() {
  /* On the web, nothing exotic: a normal redirect, which is what every
     other site does and what the browser expects. */
  if (!isNativeApp()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) throw error
    return
  }

  const redirectTo = await nativeRedirectUrl()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (!data?.url) throw new Error('Google sign-in is unavailable right now.')

  await registerReturnListener()

  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url: data.url })
}

/**
 * Catch the redirect back into the app.
 *
 * Registered at boot by PushRouter, and again defensively when the
 * button is tapped — the `listening` flag makes the second call a no-op.
 *
 * At boot rather than on tap because Android can kill a backgrounded app
 * while the Custom Tab is in front of it. Google then redirects into a
 * cold start, and `appUrlOpen` fires before any button handler has run;
 * a listener registered only by the button would miss it entirely.
 *
 * Exactly once because registering twice would exchange the same
 * single-use code twice, and the second attempt fails — surfacing as
 * "sign-in failed" on a sign-in that had in fact just succeeded.
 */
export async function registerReturnListener() {
  if (listening || !isNativeApp()) return
  listening = true

  const { App } = await import('@capacitor/app')
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url || !url.includes('://auth')) return

    /* A custom-scheme URL is not something `new URL()` parses usefully
       across platforms, so read the query off the string itself. */
    const q = url.split('?')[1] ?? ''
    const params = new URLSearchParams(q)
    const code = params.get('code')

    try {
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      } else if (url.includes('#access_token=')) {
        /* Implicit fallback, for a project not configured for PKCE.
           Same outcome, weaker guarantee — see the note above. */
        const h = new URLSearchParams(url.split('#')[1] ?? '')
        const access_token = h.get('access_token')
        const refresh_token = h.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }
      }
    } finally {
      /* Close the tab whatever happened. Leaving a Custom Tab sitting on
         top of a signed-in app looks like the sign-in hung. */
      const { Browser } = await import('@capacitor/browser')
      await Browser.close().catch(() => {})
    }
  })
}
