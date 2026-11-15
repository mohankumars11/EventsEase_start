/**
 * "Find everything for my celebration" — one tap, many requirements.
 *
 *   POST /api/anchor?op=dispatch-batch
 *   { planId, clientKey, lines: [{ planServiceId, vendorServiceId, request, venue?, note?, backups? }] }
 *   backups: [{ serviceId, chosenBy, request }] — the customer's own picks
 *   first (197); each is held to the same experience by priceBackups.
 *
 * ── What the server owns, and why ───────────────────────────────────
 * The customer's phone already knows how to match a trade (liveMatch) and
 * how to shape a request for it (lib/booking requestFor) — it does both
 * today for a single service, and neither needs doing twice. What it must
 * NOT own is the two things that go wrong at scale:
 *
 *   · WHAT MAY BE SENT. sambramo_open_dispatch_batch (202) decides, in one
 *     transaction, which requirements are eligible and claims them. A
 *     double-tap, a retry on a flaky connection, or a service already sent
 *     an hour ago on its own, all come back claimed-by-someone-else and
 *     are not sent again. Any line this endpoint is handed that is not in
 *     that claimed set is refused — so the list the client sends is a
 *     request, never permission.
 *
 *   · WHAT IT COSTS. Every line still goes through the same anchorBook
 *     path as a single booking, so resolve_booking prices it and the
 *     client's numbers are never read. 059's rule, unchanged.
 *
 * ── One failing service must not stop the others ────────────────────
 * Each line is dispatched on its own and its outcome recorded on its own.
 * The batch is closed with the ones that actually went out, and 202's
 * close puts the rest back to `ready` — so a décor partner being
 * unreachable leaves décor sendable again rather than stuck pretending.
 */
import { createClient } from '@supabase/supabase-js'
import { cors } from './cors.js'
import { authenticatedUser } from './auth.js'
import book from './anchorBook.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const MAX_LINES = 20

/* Run one line through the real booking endpoint. A fake res collects what
   it would have sent, so the money path is the SAME code a single booking
   takes — there is no second, laxer way to create a line. */
async function dispatchOne(req, line) {
  let status = 500, payload = { error: 'no response' }
  const res = {
    status(c) { status = c; return this },
    json(b) { payload = b; return this },
    setHeader() { return this },
    end() { return this },
  }
  await book({
    ...req,
    method: 'POST',
    query: { op: 'book' },
    body: {
      vendorServiceId: line.vendorServiceId,
      request: line.request,
      venue: line.venue ?? {},
      note: line.note ?? null,
      mode: 'request',          // 197: an exclusive request, never a broadcast
      backups: Array.isArray(line.backups) ? line.backups.slice(0, 6) : [],
    },
  }, res)
  return { status, payload }
}

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const authn = await authenticatedUser(req, db)
  if (authn.error) return res.status(401).json({ error: 'Sign in to find professionals.' })

  const body = req.body ?? {}
  const planId = String(body.planId ?? '')
  const clientKey = String(body.clientKey ?? '')
  const lines = Array.isArray(body.lines) ? body.lines.slice(0, MAX_LINES) : []
  if (!planId || clientKey.length < 8) return res.status(400).json({ error: 'planId and clientKey are required.' })

  /* The claim is made AS THE CUSTOMER: 202's function checks the event is
     theirs against auth.uid(), and running it with the service role would
     skip the only check that matters. */
  const asUser = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: req.headers.authorization ?? '' } },
  })
  const { data: opened, error: openErr } = await asUser.rpc('sambramo_open_dispatch_batch', {
    p_plan_id: planId, p_client_key: clientKey,
  })
  if (openErr) return res.status(openErr.code === '42501' ? 403 : 500).json({ error: openErr.message })

  const batch = opened?.[0] ?? {}
  const claimed = new Set(batch.out_ready ?? [])
  const skipped = batch.out_skipped ?? []

  /* Already finished — a retried tap. Report it rather than sending again. */
  if (!claimed.size) {
    return res.status(200).json({ batchId: batch.out_batch_id, status: batch.out_status, sent: [], failed: [], skipped })
  }

  const sent = [], failed = []
  for (const line of lines) {
    if (!claimed.has(line.planServiceId)) {
      failed.push({ planServiceId: line.planServiceId, reason: 'not_claimed_by_this_batch' })
      continue
    }
    if (!line.vendorServiceId || !line.request) {
      failed.push({ planServiceId: line.planServiceId, reason: 'incomplete_request' })
      continue
    }
    try {
      const { status, payload } = await dispatchOne(req, line)
      const path = payload?.path
      if (status === 200 && ['INSTANT', 'REQUEST', 'QUOTE'].includes(path)) {
        const linked = payload.line_id ?? payload.lineId
        if (linked) {
          await db.rpc('sambramo_link_line_to_requirement', { p_line_id: linked, p_plan_service_id: line.planServiceId })
        }
        const lineId = payload.line_id ?? payload.lineId ?? null
        sent.push({ planServiceId: line.planServiceId, path, lineId, requestId: payload.request_id ?? payload.bookingRequestId ?? null,
          replyBy: payload.replyBy ?? null, backups: payload.backups ?? 0, price: payload.customer_paise ?? null })
      } else {
        failed.push({ planServiceId: line.planServiceId, reason: path ?? payload?.error ?? `http_${status}`, reasons: payload?.reasons_text ?? [] })
      }
    } catch (e) {
      failed.push({ planServiceId: line.planServiceId, reason: e.message })
    }
  }

  /* Anything claimed and not sent — including a requirement the client
     never got round to listing — goes back to `ready` here. */
  await db.rpc('sambramo_close_dispatch_batch', {
    p_batch_id: batch.out_batch_id, p_dispatched: sent.map(s => s.planServiceId),
  })

  return res.status(200).json({
    batchId: batch.out_batch_id,
    status: sent.length === 0 ? 'failed' : sent.length < claimed.size ? 'partial' : 'done',
    sent, failed, skipped,
  })
}
