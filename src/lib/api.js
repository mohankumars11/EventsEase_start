/**
 * Where the API actually lives, from wherever this code is running.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `fetch('/api/…')` IS BROKEN IN THE NATIVE APP
 * ══════════════════════════════════════════════════════════════════════
 *
 * On the web it is right: the app and its API are served from the same
 * origin, so a relative path reaches the serverless function.
 *
 * In the bundled Android app there is no server. Capacitor serves the
 * assets from `https://localhost`, and that origin has no `/api`
 * anything — its local server answers unknown paths with `index.html`,
 * because that is what a single-page app needs.
 *
 * So the request "succeeds" with 200 and a body of HTML. `res.json()`
 * throws a parse error, and the customer is told the server sent
 * something unexpected — on the screen where they have just committed
 * to a booking, with a Try again button that will do exactly the same
 * thing forever.
 *
 * Every symptom followed from this one line being relative:
 *
 *   customer   "That did not go through" after Find my masters
 *   partner    "The server could not send to this device"
 *   payment    would have failed the same way, at the worst moment
 *
 * Nothing was wrong with the API. The app was asking itself.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE ORIGIN IS BAKED IN AND NOT DISCOVERED
 * ══════════════════════════════════════════════════════════════════════
 *
 * The native app has no way to work out where its backend is — there is
 * no hostname to read and no config served alongside it. So the build
 * stamps it, the same way it stamps the surface. A wrong value is then a
 * build-time mistake rather than a runtime one, and it is visible in the
 * diff.
 */

/* Both hostnames serve the same deployment, so either reaches the same
   functions. The customer host is canonical because it is the one that
   has always existed — the partner alias is a later addition and could
   be repointed without anybody thinking about the API. */
const FALLBACK_ORIGIN = 'https://sambramoh.vercel.app'

const NATIVE = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

/**
 * The origin API calls should go to. Empty string on the web, so paths
 * stay relative and previews, branch deploys and localhost all keep
 * working without knowing their own address.
 */
export const API_ORIGIN = NATIVE
  ? (import.meta.env?.VITE_API_ORIGIN || FALLBACK_ORIGIN).replace(/\/+$/, '')
  : ''

/** `apiUrl('/api/dispatch-booking')` → absolute in the app, relative on the web. */
export function apiUrl(path) {
  return `${API_ORIGIN}${path}`
}

/**
 * `fetch`, pointed at the right place, with the failure modes this app
 * actually hits turned into answers instead of exceptions.
 *
 * ── Why it reads text before JSON ────────────────────────────────────
 * A platform error page is HTML and `res.json()` on it throws a parse
 * error naming a character position, which tells nobody anything. The
 * raw first line is what identifies the problem, so it is kept.
 *
 * ── And why there is a timeout ───────────────────────────────────────
 * A serverless function on a cold start behind a phone on 3G can take
 * longer than anybody will wait. Without a deadline the promise simply
 * never settles and the screen sits on a spinner — the single worst
 * failure this app has, because a visible error is recoverable and a
 * spinner that never resolves is a dead end.
 */
export async function apiFetch(path, { timeoutMs = 25_000, ...init } = {}) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)

  try {
    const res = await fetch(apiUrl(path), { ...init, signal: ctl.signal })
    const raw = await res.text()

    let body = null
    try { body = raw ? JSON.parse(raw) : null } catch { /* not JSON */ }

    if (body === null && raw) {
      return {
        ok: false,
        status: res.status,
        error: res.ok
          ? 'The server sent something unexpected.'
          : `Service error (${res.status})`,
        raw: raw.slice(0, 200),
      }
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: body?.error ?? body?.detail ?? `Service error (${res.status})`, body }
    }

    return { ok: true, status: res.status, body }
  } catch (err) {
    const aborted = err?.name === 'AbortError'
    return {
      ok: false,
      status: 0,
      error: aborted
        ? 'That took too long. Nothing has been charged — please try again.'
        : 'Could not reach Sambramo. Check your connection — nothing has been charged.',
      aborted,
    }
  } finally {
    clearTimeout(timer)
  }
}
