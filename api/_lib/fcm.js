import crypto from 'crypto'

/**
 * Send a push through FCM HTTP v1.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE OAUTH TOKEN IS MINTED BY HAND
 * ══════════════════════════════════════════════════════════════════════
 *
 * FCM v1 wants a Google OAuth2 access token, and the documented way to
 * get one is `google-auth-library` — which pulls in `googleapis`,
 * `gaxios`, `gcp-metadata` and a dozen more for a serverless function
 * whose entire job is one POST.
 *
 * The exchange itself is a signed JWT and a form post: about thirty
 * lines, no dependency, and a cold start that does not have to load a
 * cloud SDK before it can tell a decorator there is work.
 *
 * The legacy `/fcm/send` endpoint with a server key would be simpler
 * still and is deprecated — it stops working, so it is not an option.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A FAILED PUSH IS NOT A FAILED DISPATCH
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nothing here throws upward. A booking whose notification failed is
 * still a real booking with real offers on it, and the master will see
 * them the moment they open the app — Realtime and polling are the
 * floor, and push is the thing that makes them look.
 *
 * So every failure is reported and swallowed. The one exception is a
 * token FCM tells us is dead, which is recorded so the sender can prune
 * it rather than buzzing a reinstalled phone forever.
 */

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  try {
    // Accepts the JSON verbatim, or base64 — a private key pasted into a
    // dashboard field survives base64 intact and sometimes does not
    // survive JSON with real newlines in it.
    const text = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8')
    const sa = JSON.parse(text)
    if (!sa.client_email || !sa.private_key || !sa.project_id) return null
    // Dashboards commonly store the key with literal \n sequences.
    sa.private_key = sa.private_key.replace(/\\n/g, '\n')
    return sa
  } catch {
    return null
  }
}

export function pushConfigured() {
  return !!serviceAccount()
}

const b64url = buf =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** Access tokens last an hour; a warm function should not re-mint per send. */
let cached = { token: null, expiresAt: 0 }

async function accessToken(sa) {
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token

  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))

  const signature = b64url(
    crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key),
  )

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  })

  const body = await res.json()
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description ?? body.error ?? 'FCM token exchange failed')
  }

  cached = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 }
  return cached.token
}

/**
 * Send one message to one device.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DATA-ONLY FOR A BROWSER. A REAL NOTIFICATION FOR A PHONE.
 * ══════════════════════════════════════════════════════════════════════
 *
 * This used to be data-only for everything, and the reasoning was sound
 * for the web: a `notification` payload is rendered by the browser
 * before the service worker sees it, so there is no control over the
 * tag, the actions, or what happens on tap — and two banners for the
 * same job when a later wave arrives. Data-only hands every message to
 * `onBackgroundMessage` in public/firebase-messaging-sw.js, which
 * collapses them by line id.
 *
 * On a phone it is simply wrong, and silently so.
 *
 * A data-only message on Android is delivered to the APP, not to the
 * system tray. `@capacitor/push-notifications` raises
 * `pushNotificationReceived` and nothing else — no banner, no sound, no
 * icon — and if the app is backgrounded or killed, which is the only
 * state that matters for a 45-second job offer, absolutely nothing
 * happens. On iOS a data-only message without `content-available` is
 * not even guaranteed delivery.
 *
 * So a master with the app installed on their phone got exactly what was
 * reported: nothing. FCM accepted every send and returned 200.
 *
 * ── The fix, and why it is per-platform and not global ──────────────
 * `platform` comes from the `push_tokens` row, written by whichever
 * path registered the device (lib/push.js writes 'web',
 * lib/nativePush.js writes 'android' or 'ios'). A native token gets a
 * `notification` block so the OS draws the banner; a web token keeps
 * data-only so the service worker keeps its control.
 *
 * `data` travels in BOTH cases, because the tap handler on either side
 * reads the same fields.
 */
/**
 * The FCM v1 message, shaped for the device that will receive it.
 *
 * Split out because the difference between a phone that buzzes and a
 * phone that does nothing is four lines of JSON, and those four lines
 * deserve to be readable rather than buried in a fetch call.
 */
function buildMessage({ token, title, body, url, lineId, platform, ttlSeconds }) {
  const isNative = platform === 'android' || platform === 'ios'

  const data = {
    title:  String(title ?? 'New job'),
    body:   String(body ?? ''),
    url:    String(url ?? '/dashboard/vendor'),
    lineId: String(lineId ?? ''),
  }

  const message = { token, data }

  if (isNative) {
    /* The OS draws this one. Without it there is no banner, no sound and
       no icon — the app is simply handed some JSON, and a killed app is
       not handed anything at all. */
    message.notification = { title: data.title, body: data.body }
  }

  message.android = {
    // A job offer lives 45 seconds. A notification delivered after it
    // expired is worse than none — it sends a master to a job that is
    // gone, which is exactly how they learn to ignore the alerts.
    ttl: `${ttlSeconds}s`,
    priority: 'HIGH',
    ...(isNative && {
      notification: {
        // A named channel, because on Android 8 and later a notification
        // with no channel is dropped by the OS without a word. The
        // channel is created by the app at startup.
        channel_id: 'sambramo_jobs',
        sound: 'default',
        // Collapses waves of the same job into one banner rather than
        // three, which is what the service worker does on the web.
        tag: data.lineId || undefined,
        // Opens the app rather than merely dismissing.
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    }),
  }

  if (platform === 'ios') {
    message.apns = {
      headers: {
        'apns-priority': '10',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + ttlSeconds),
      },
      payload: {
        aps: {
          alert: { title: data.title, body: data.body },
          sound: 'default',
          // Wakes the app so it can refresh the offer list behind the
          // banner. Without it iOS may deliver the alert and never run
          // any of our code.
          'content-available': 1,
          'thread-id': data.lineId || undefined,
        },
      },
    }
  }

  if (platform === 'web') {
    message.webpush = { headers: { TTL: String(ttlSeconds), Urgency: 'high' } }
  }

  return message
}

export async function sendPush({ token, title, body, url, lineId, platform = 'web', ttlSeconds = 120 }) {
  const sa = serviceAccount()
  if (!sa) return { ok: false, reason: 'not_configured' }

  try {
    const bearer = await accessToken(sa)

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: buildMessage({ token, title, body, url, lineId, platform, ttlSeconds }),
        }),
      },
    )

    if (res.ok) return { ok: true }

    const err = await res.json().catch(() => ({}))
    const status = err?.error?.status

    // FCM's way of saying the app was uninstalled or the token replaced.
    const dead = status === 'NOT_FOUND' || status === 'UNREGISTERED'
      || res.status === 404 || res.status === 410

    return { ok: false, reason: dead ? 'dead_token' : 'send_failed', status, detail: err?.error?.message }
  } catch (err) {
    return { ok: false, reason: 'error', detail: err?.message ?? String(err) }
  }
}

/**
 * Tell every device belonging to a set of masters about a job.
 *
 * Takes the Supabase client rather than making one: the caller already
 * has a service-role connection and a second would double the cold-start
 * cost of the one request a customer is waiting on.
 */
export async function notifyPartners(db, { vendorIds, title, body, url, lineId }) {
  if (!pushConfigured()) return { sent: 0, skipped: 'not_configured' }
  if (!vendorIds?.length) return { sent: 0 }

  const { data: vendors } = await db
    .from('vendors').select('profile_id').in('id', vendorIds).not('profile_id', 'is', null)

  const profileIds = (vendors ?? []).map(v => v.profile_id)
  if (!profileIds.length) return { sent: 0 }

  const { data: tokens } = await db
    .from('push_tokens')
    .select('token, profile_id, platform')
    .in('profile_id', profileIds)
    .eq('app', 'partner')
    .lt('failure_count', 5)

  if (!tokens?.length) return { sent: 0 }

  let sent = 0
  const dead = []

  await Promise.all(tokens.map(async t => {
    const r = await sendPush({ token: t.token, platform: t.platform, title, body, url, lineId })
    if (r.ok) sent++
    else if (r.reason === 'dead_token') dead.push(t.token)
  }))

  // A reinstalled phone leaves a token that will never work again.
  // Pruning keeps the fan-out from slowly filling with corpses.
  if (dead.length) await db.from('push_tokens').delete().in('token', dead)

  return { sent, pruned: dead.length, attempted: tokens.length }
}
