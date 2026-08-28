/**
 * Send a test alert to the caller's own devices.
 *
 * POST /api/test-alert       Authorization: Bearer <supabase access token>
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * "No notifications are coming" is unfalsifiable from this side. FCM
 * accepted every send and returned 200; the token is registered and
 * healthy; the dispatcher reports `pushed: 1`. Every server-side signal
 * says it worked, and the phone stayed silent.
 *
 * There are at least six reasons that can happen and none of them is
 * visible from a server: permission granted but muted at OS level, a
 * service worker that never initialised, battery optimisation, Do Not
 * Disturb, a notification channel the OS dropped, or an app that was
 * never actually installed.
 *
 * A button that sends one push, on demand, from the device the person is
 * holding, collapses all six into one answer: it buzzed, or it did not.
 * That is worth more than any amount of reasoning about the payload.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT CAN ONLY EVER REACH THE CALLER
 * ══════════════════════════════════════════════════════════════════════
 *
 * The profile id is NOT taken from the body. It is resolved from the
 * caller's own Supabase access token, server-side. A `{ profileId }` in
 * the body would make this a public endpoint for sending a notification
 * to any user in the system, which is a spam cannon with a diagnostic
 * label on it.
 */
import { createClient } from '@supabase/supabase-js'
import { sendPush, pushConfigured } from './_lib/fcm.js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey || !anonKey) return res.status(500).json({ error: 'Supabase not configured' })

  if (!pushConfigured()) {
    return res.status(200).json({
      ok: false,
      reason: 'not_configured',
      scan: 'Alerts are not set up on the server (FIREBASE_SERVICE_ACCOUNT is missing).',
    })
  }

  const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!bearer) return res.status(401).json({ error: 'Sign in first' })

  // Resolved from the token, never from the body. See the header.
  const asCaller = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  })
  const { data: { user }, error: authErr } = await asCaller.auth.getUser()
  if (authErr || !user) return res.status(401).json({ error: 'Sign in again' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: tokens } = await db
    .from('push_tokens')
    .select('token, platform, app, device_label')
    .eq('profile_id', user.id)

  if (!tokens?.length) {
    return res.status(200).json({
      ok: false,
      reason: 'no_device',
      scan: 'This account has no device registered. Turn alerts on first.',
    })
  }

  const results = []
  for (const t of tokens) {
    const r = await sendPush({
      token: t.token,
      platform: t.platform,
      title: 'Sambramo test alert',
      body: 'If you can see this, alerts are working on this device.',
      url: t.app === 'partner' ? '/dashboard/vendor' : '/track',
      lineId: `test-${Date.now()}`,
      // Long, because a test that expires before somebody looks at their
      // phone teaches the wrong lesson.
      ttlSeconds: 600,
    })
    results.push({
      device: t.device_label ?? t.platform,
      platform: t.platform,
      app: t.app,
      ...r,
    })
  }

  const sent = results.filter(r => r.ok).length

  /* A dead token is the commonest failure and the only one with an
   * action attached, so it is handled rather than merely reported.
   *
   * FCM invalidates a token when the app is reinstalled, when browser
   * site data is cleared, or when the service worker is replaced —
   * which the config change just did to every existing web
   * registration. The row then points at nothing, and the honest fix is
   * to drop it and ask for alerts to be switched on again. */
  const dead = results.filter(r => r.reason === 'dead_token')
  if (dead.length) {
    await db.from('push_tokens').delete()
      .in('token', tokens.filter((_, i) => results[i].reason === 'dead_token').map(t => t.token))
  }

  return res.status(200).json({
    ok: sent > 0,
    sent,
    of: tokens.length,
    // The real reason, per device. Withholding it left "could not send"
    // as the entire diagnosis, which is not something anybody can act
    // on — and the answer was already in hand.
    why: results.filter(r => !r.ok).map(r => [r.platform, r.reason, r.detail].filter(Boolean).join(': ')),
    deadRemoved: dead.length,
    // The whole point. If FCM accepted it and nothing appeared, the fault
    // is on the device — and this says so rather than leaving somebody to
    // conclude the app is broken.
    scan: sent > 0
      ? 'Sent. If nothing appears within ten seconds, the block is on this phone — check that notifications are allowed for Sambramo in your phone settings, and that battery saver is off.'
      : dead.length
        ? 'This device had expired. It has been removed — turn alerts off and on again to re-register it.'
        : `Could not send. ${results.map(r => r.reason ?? '').filter(Boolean).join(', ')}`,
    results,
  })
}
