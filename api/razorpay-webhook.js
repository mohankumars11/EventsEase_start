import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { bookingLinesFor, captureBookingPayment } from './_lib/bookingCapture.js'

/**
 * Razorpay's webhook — the only thing in this app that can say a milestone
 * payment actually arrived.
 *
 * ── Why a webhook is mandatory, not a nicety ─────────────────────────────
 * `api/verify-razorpay-payment.js` runs from the BROWSER's success callback.
 * That is fine as a fast path and useless as a guarantee: a customer who
 * pays and immediately closes the tab, loses signal in a lift, or gets a
 * crashed webview leaves a captured payment the database never hears about.
 * They have been charged and the app thinks they have not — which is the
 * precise failure "known rather than claimed" exists to eliminate, and on a
 * ₹40,000 instalment it is not a rounding error.
 *
 * Razorpay retries this endpoint until it 2xxs, so the webhook is what makes
 * the record eventually correct no matter what the browser did.
 *
 * ── The raw body matters ─────────────────────────────────────────────────
 * The signature is an HMAC over the EXACT bytes Razorpay sent. Vercel's JSON
 * body parser re-serialises the payload — key order, whitespace and unicode
 * escaping can all shift — so a signature computed over `JSON.stringify(req.body)`
 * will fail intermittently and inexplicably. `bodyParser: false` below, and
 * the stream is read by hand.
 *
 * ── Idempotency is enforced by the database ──────────────────────────────
 * Retries mean this handler WILL run more than once for the same payment.
 * `uq_event_payments_gateway` (migration 046) is a unique index on
 * `gateway_payment_id`, so a duplicate is a constraint violation rather than
 * a second row — a guarantee that survives somebody forgetting to check.
 */
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return res.status(503).json({ error: 'Webhook is not configured' })

  const raw = await readRawBody(req)
  const signature = req.headers['x-razorpay-signature']
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex')

  // Constant-time compare. A plain `!==` leaks timing, and this endpoint is
  // public by necessity.
  const ok = signature
    && signature.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  if (!ok) return res.status(400).json({ error: 'Signature mismatch' })

  let payload
  try { payload = JSON.parse(raw.toString('utf8')) }
  catch { return res.status(400).json({ error: 'Unparseable body' }) }

  const event = payload?.event
  const entity = payload?.payload?.payment?.entity ?? payload?.payload?.refund?.entity
  if (!entity) return res.status(200).json({ ignored: true })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // The Razorpay order id is the join back to the row this endpoint parked.
  const gatewayOrderId = entity.order_id
  const gatewayPaymentId = entity.id
  if (!gatewayOrderId) return res.status(200).json({ ignored: true })

  /* ── Instant booking, first ────────────────────────────────────────
   *
   * Two payment paths reach this one endpoint. The older one parks an
   * `event_payments` row for a milestone on the pre-book journey; the
   * newer one funds N booking lines with a single order and parks
   * nothing, because the order's own notes carry the line ids.
   *
   * Booking is tested first because it is the path that ANSWERS: the
   * milestone lookup below returns nothing for a booking order and used
   * to fall straight through to `{ ignored: true }`, which is how a
   * captured instant payment was recorded nowhere at all.
   *
   * Order-of-events note: `payment.captured` is the only event this path
   * acts on. An `authorized` payment is not money. */
  if (event === 'payment.captured') {
    const booking = await bookingLinesFor(entity)
    if (booking) {
      const r = await captureBookingPayment(supabase, { entity, booking })
      // A 5xx makes Razorpay retry, which is what we want when the write
      // failed — the index makes the retry safe.
      if (!r.ok) return res.status(500).json({ error: r.error })
      return res.status(200).json(r)
    }
  }

  const { data: row } = await supabase
    .from('event_payments')
    .select('id, status, amount, gateway_payment_id')
    .eq('gateway_order_id', gatewayOrderId)
    .maybeSingle()

  // Not one of ours — most likely a shop order, which has its own path.
  // 200 rather than 404: a non-2xx makes Razorpay retry forever for an event
  // that will never become relevant.
  if (!row) return res.status(200).json({ ignored: true })

  if (event === 'payment.captured') {
    // Already recorded. Retries land here and must be a no-op.
    if (row.gateway_payment_id === gatewayPaymentId && row.status === 'GATEWAY_VERIFIED') {
      return res.status(200).json({ ok: true, duplicate: true })
    }

    // The amount is checked, not trusted. A capture for less than the
    // milestone is a part payment and must not release the work it funds.
    const paisePaid = Number(entity.amount ?? 0)
    if (paisePaid < Number(row.amount) * 100) {
      await supabase.from('event_payments').update({
        status: 'CUSTOMER_CLAIMED_PAID',
        gateway_payment_id: gatewayPaymentId,
        claimed_at: new Date().toISOString(),
        notes: `Gateway captured ₹${paisePaid / 100} against ₹${row.amount} — short. Needs a human.`,
      }).eq('id', row.id)
      return res.status(200).json({ ok: true, short: true })
    }

    const { error } = await supabase.from('event_payments').update({
      status: 'GATEWAY_VERIFIED',
      gateway_payment_id: gatewayPaymentId,
      paid_at: new Date().toISOString(),
    }).eq('id', row.id)

    // A duplicate on the unique index means another delivery of this same
    // webhook won the race. That is success, not failure.
    if (error && error.code !== '23505') {
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ ok: true })
  }

  if (event === 'refund.processed') {
    await supabase.from('event_payments').update({ status: 'REFUNDED' }).eq('id', row.id)
    return res.status(200).json({ ok: true })
  }

  return res.status(200).json({ ignored: true })
}
