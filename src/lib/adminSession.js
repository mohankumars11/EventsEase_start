import { supabase } from './supabase'

/**
 * A token the server will still accept by the time it arrives.
 *
 * ── The bug this exists for ──────────────────────────────────────────────
 * Both AI endpoints authenticated by taking `getSession().access_token` and
 * sending it. That looks right and fails in a specific, very reproducible way:
 * a Supabase access token lasts about an hour, and `getSession()` hands back
 * whatever is in local storage — including a token that expired while the
 * admin console sat open in a tab. The server then correctly rejects it, and
 * the admin is told their sign-in expired while they are visibly signed in,
 * on a page that is otherwise working.
 *
 * That is the worst shape a bug can take: the message is technically accurate
 * and completely unactionable, because reloading is the fix and nothing says
 * so. Anyone who leaves the console open through a lunch break hits it.
 *
 * So the token is checked for freshness and refreshed before it is used. The
 * refresh token is long-lived, so this succeeds silently in every case except
 * a genuine sign-out — and only then is "sign in again" the truth.
 */

/** Refresh if the token is already dead or dies within this window. */
const SKEW_MS = 60_000

export async function adminAuthHeader({ force = false } = {}) {
  let { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('You are not signed in. Reload the page and sign in again.')
  }

  const expiresAt = (session.expires_at ?? 0) * 1000
  const stale = !session.expires_at || expiresAt < Date.now() + SKEW_MS

  if (force || stale) {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data?.session) {
      // Now — and only now — is the instruction the right one.
      throw new Error('Your sign-in has fully expired. Reload the page and sign in again.')
    }
    session = data.session
  }

  return `Bearer ${session.access_token}`
}

/**
 * POST to one of the admin AI endpoints, with one retry on a rejected token.
 *
 * The retry matters because the freshness check above is a clock comparison,
 * and clocks disagree: a laptop running a few minutes fast believes a token is
 * still good after the server has stopped accepting it. One forced refresh
 * costs a round trip and removes a whole class of "it worked yesterday".
 */
export async function postAdmin(url, body, { onNotDeployed } = {}) {
  async function attempt(force) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: await adminAuthHeader({ force }),
      },
      body: JSON.stringify(body),
    })

    let payload = null
    try {
      payload = await res.json()
    } catch {
      // No JSON body at all. Two cases worth naming, because both look
      // identical to a person and neither is their fault.
      if (res.status === 404) throw new Error(onNotDeployed ?? 'That endpoint is not deployed.')
      if (res.status === 413) {
        throw new Error('That file was too big to send directly. Run migration 052_ai_upload_bucket.sql in the Supabase SQL editor — after that there is no size limit.')
      }
      throw new Error(`The server returned ${res.status}.`)
    }

    return { res, payload }
  }

  let { res, payload } = await attempt(false)

  if (res.status === 401 && payload?.stage === 'bad-token') {
    ;({ res, payload } = await attempt(true))
  }

  if (!res.ok) {
    // The stage is appended so a screenshot is enough to place the failure —
    // 'not-admin' and 'bad-service-key' are very different problems that used
    // to arrive looking the same.
    const suffix = payload?.stage && payload.stage !== 'bad-token' ? ` [${payload.stage}]` : ''
    throw new Error((payload?.error || `The server returned ${res.status}.`) + suffix)
  }

  return payload
}
