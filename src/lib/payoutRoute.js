import { apiUrl } from './api'
import { authHeaders } from './payLines'

/**
 * The existing Razorpay Route setup, called from the app.
 *
 *   POST /api/anchor?op=route-setup  { action: 'setup' | 'status' }
 *
 * The server (api/_lib/routeSetup.js) reads the partner's saved bank
 * details and PAN from vendor_payout_details, creates or continues the
 * Route linked account, and reads its status back from Razorpay. Nothing
 * sensitive is sent from here, and nothing here decides a status: the
 * answer is whatever Razorpay told the server.
 *
 * Returns { ok, body } — body carries route_status, or { error, step }
 * naming what is missing ('bank', 'pan', 'contact', 'location', …).
 * A reply that is not JSON (an HTML page from a host with no API behind
 * it) is a failure, never a success with an empty body.
 */
export async function routeSetup(action = 'status') {
  try {
    const r = await fetch(apiUrl('/api/anchor?op=route-setup'), {
      method: 'POST', headers: await authHeaders(), body: JSON.stringify({ action }),
    })
    let body = null
    try { body = await r.json() } catch { body = null }
    if (!body || typeof body !== 'object') {
      return { ok: false, body: { error: 'The payout service did not answer. Your details are saved — tap refresh to try again.' } }
    }
    return { ok: r.ok && body.ok !== false, body }
  } catch {
    return { ok: false, body: { error: 'Could not reach Sambramo just now. Your details are saved — tap refresh to try again.' } }
  }
}
