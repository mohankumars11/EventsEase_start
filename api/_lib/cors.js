/**
 * Let the Android app talk to these functions.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE APP IS NOW A DIFFERENT ORIGIN
 * ══════════════════════════════════════════════════════════════════════
 *
 * On the web the app and its API share an origin, so CORS never came up.
 * The bundled Android app serves its assets from `https://localhost` and
 * calls `https://sambramoh.vercel.app/api/…` — a cross-origin request,
 * which a browser blocks unless the response says otherwise.
 *
 * Every one of these calls sends `content-type: application/json`, which
 * makes it a *preflighted* request: the browser sends OPTIONS first and
 * refuses to send the real request unless that comes back OK. The
 * handlers all answer 405 to OPTIONS, so without this the preflight
 * fails and the app never gets to make a single API call.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY `*` IS SAFE HERE AND WOULD NOT BE EVERYWHERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `Access-Control-Allow-Origin: *` forbids credentialed requests, and
 * these endpoints use none: there is no cookie session. Authorisation is
 * either a Bearer token the caller must already hold, or an explicit id
 * the handler re-checks against the database.
 *
 * So a wildcard grants a stranger's browser exactly what curl already
 * had — the ability to send a request that will be rejected on its
 * merits. Narrowing it to `https://localhost` would also admit every
 * other app on the device using that origin, which is not narrower in
 * any way that matters.
 */
export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  // A day. The preflight is pure latency on every call otherwise, and on
  // a phone the one that matters is the payment.
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true          // handled — the caller must return immediately
  }
  return false
}
