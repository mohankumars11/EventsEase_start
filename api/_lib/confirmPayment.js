/**
 * Confirm a booking payment from the app, without waiting for the webhook.
 *
 *   POST /api/anchor?op=confirm-payment
 *   { orderId, paymentId, signature }   ← exactly what Razorpay's checkout returns
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS NEXT TO THE WEBHOOK
 * ══════════════════════════════════════════════════════════════════════
 * The webhook is the authority, and stays it. But it can only reach a
 * public URL: when the API runs anywhere Razorpay cannot call (a laptop on
 * a home network during testing, a preview behind protection) a paid
 * booking stayed `accepted` forever and the partner was never told. And
 * even in production a customer should not stare at "confirming…" for
 * however long Razorpay takes to deliver.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING IS TRUSTED FROM THE CLIENT BUT THE IDS
 * ══════════════════════════════════════════════════════════════════════
 *   1. The signature is Razorpay's HMAC-SHA256 of "orderId|paymentId" with
 *      the key SECRET — only Razorpay and this server can produce it.
 *   2. The payment is then fetched back from Razorpay's API; its status,
 *      amount and order are read from there, never from the request.
 *   3. An `authorized` payment is captured here (orders do not always
 *      auto-capture); anything else that is not `captured` is not money.
 *   4. It is recorded by captureBookingPayment — the SAME function the
 *      webhook calls. The escrow index (migration 062) makes the second of
 *      the two arrivals a no-op, whichever comes second.
 */
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { cors } from './cors.js'
import { authenticatedUser } from './auth.js'
import { bookingLinesFor, captureBookingPayment } from './bookingCapture.js'
import { routeTransfersForCapture } from './routeTransfers.js'
import { notifyCustomersPaid, notifyPartnersPaid } from './fcm.js'

const RZP = 'https://api.razorpay.com/v1'

export default async function confirmPayment(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const url = process.env.VITE_SUPABASE_URL, serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const keyId = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET
  if (!url || !serviceKey || !keyId || !secret) return res.status(500).json({ error: 'Payments not configured' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const authn = await authenticatedUser(req, db)
  if (authn.error) return res.status(401).json({ error: 'Sign in again to confirm the payment.' })

  const { orderId, paymentId, signature } = req.body ?? {}
  if (![orderId, paymentId, signature].every(v => typeof v === 'string' && v.length < 200)) {
    return res.status(400).json({ error: 'orderId, paymentId and signature are required' })
  }
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
  const a = Buffer.from(expected), b = Buffer.from(signature)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ error: 'That payment could not be verified.' })

  const auth = { authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}` }
  let pr = await fetch(`${RZP}/payments/${encodeURIComponent(paymentId)}`, { headers: auth })
  let payment = await pr.json().catch(() => null)
  if (!pr.ok || !payment?.id) return res.status(502).json({ error: 'Razorpay did not return the payment.' })
  if (payment.order_id !== orderId) return res.status(400).json({ error: 'That payment belongs to another order.' })

  if (payment.status === 'authorized') {
    pr = await fetch(`${RZP}/payments/${encodeURIComponent(paymentId)}/capture`, {
      method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ amount: payment.amount, currency: payment.currency ?? 'INR' }),
    })
    const captured = await pr.json().catch(() => null)
    if (pr.ok && captured?.id) payment = captured
  }
  if (payment.status !== 'captured') return res.status(202).json({ ok: false, pending: true, status: payment.status })

  const booking = await bookingLinesFor(payment)
  if (!booking) return res.status(404).json({ error: 'No booking is attached to that payment.' })
  if (booking.customerId && booking.customerId !== authn.user.id) return res.status(403).json({ error: 'Not your booking.' })

  const r = await captureBookingPayment(db, { entity: payment, booking })
  if (!r.ok) return res.status(500).json({ error: r.error })
  let route = null, told = null
  if (r.lines > 0) {
    route = await routeTransfersForCapture(db, { entity: payment, lineIds: booking.lineIds }).catch(e => ({ error: e.message }))
    told = { customer: await notifyCustomersPaid(db, booking.lineIds), partners: await notifyPartnersPaid(db, booking.lineIds) }
  }
  return res.status(200).json({ ok: true, ...r, route, told })
}
