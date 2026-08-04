// Vercel serverless function — the ONLY place an order is allowed to
// become payment_status='paid'. Verifies Razorpay's HMAC signature
// server-side before touching the database; the client never gets to
// declare a payment successful on its own.
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {}
  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Missing verification fields' })
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) return res.status(503).json({ verified: false, error: 'Payment gateway is not configured yet' })

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Signature mismatch' })
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Confirm this signature belongs to the Razorpay order we created for
  // THIS order row (payment_ref was set to razorpay_order_id in
  // create-razorpay-order.js) — stops a valid signature for a different
  // order being replayed against this one.
  const { data: order, error: fetchErr } = await supabase
    .from('orders').select('id, payment_ref').eq('id', orderId).single()
  if (fetchErr || !order) return res.status(404).json({ verified: false, error: 'Order not found' })
  if (order.payment_ref !== razorpay_order_id) {
    return res.status(400).json({ verified: false, error: 'Order/payment mismatch' })
  }

  const { error: updateErr } = await supabase.from('orders').update({
    payment_status: 'paid',
    payment_ref: razorpay_payment_id,
  }).eq('id', orderId)
  if (updateErr) return res.status(500).json({ verified: false, error: updateErr.message })

  return res.status(200).json({ verified: true })
}
