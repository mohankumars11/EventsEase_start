// Vercel serverless function — creates a Razorpay order server-side.
// The amount charged always comes from the order row already sitting
// in Supabase (payment_status='pending'), never from a value the
// client hands us directly — a tampered client can't pay less than
// what the order actually totals to.
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { orderId } = req.body || {}
  if (!orderId) return res.status(400).json({ error: 'orderId is required' })

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return res.status(503).json({ error: 'Payment gateway is not configured yet' })
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: order, error } = await supabase
    .from('orders').select('id, total, payment_status').eq('id', orderId).single()
  if (error || !order) return res.status(404).json({ error: 'Order not found' })
  if (order.payment_status === 'paid') return res.status(400).json({ error: 'Order is already paid' })

  const amountPaise = Math.round(Number(order.total) * 100)
  if (!(amountPaise > 0)) return res.status(400).json({ error: 'Invalid order amount' })

  const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: order.id }),
  })
  if (!rpRes.ok) {
    return res.status(502).json({ error: 'Could not create payment order', detail: await rpRes.text() })
  }
  const rpOrder = await rpRes.json()

  // Temporarily park the Razorpay order id here — verify-razorpay-payment.js
  // checks it matches before trusting a signature, then overwrites it with
  // the final payment id on success.
  await supabase.from('orders').update({ payment_ref: rpOrder.id }).eq('id', order.id)

  return res.status(200).json({
    razorpayOrderId: rpOrder.id,
    amount: rpOrder.amount,
    currency: rpOrder.currency,
    keyId,
  })
}
