// Vercel serverless function — opens a Razorpay order for ONE milestone of
// one celebration.
//
// ── Why this is a new file and not a widened create-razorpay-order ───────
// That endpoint is live-path code for the shop and it works. Teaching it a
// second subject shape would put every shop checkout at risk for a feature
// that has not shipped yet, and the two have genuinely different rules: a
// shop order has one amount stored on its own row, whereas a milestone is a
// SHARE of a confirmed quote that has to be recomputed here.
//
// ── The amount never comes from the browser ──────────────────────────────
// The client sends a celebration and a milestone id. The share, the credited
// hold and the total are read from the database and multiplied server-side.
// A client that could name its own amount could name ₹1.
//
// ── This alone does not make a payment known ─────────────────────────────
// The browser's success callback is not a reliable witness — somebody who
// pays and closes the tab leaves a captured payment this app never hears
// about. `api/razorpay-webhook.js` is what actually marks money received.
// This endpoint only opens the order and parks a PENDING row.
import { createClient } from '@supabase/supabase-js'

// Kept in step with src/config/celebrationPayments.js. Duplicated rather
// than imported because a Vercel function cannot import from src/ — so the
// two are checked against each other by scripts/check-payment-schedule.mjs
// rather than trusted to stay in step by memory.
const SHARES = { confirmation: 0.25, sourcing: 0.40, balance: 0.35, settle: 1.00 }
const HOLD_CREDITING = new Set(['confirmation', 'settle'])
const LOCK_AMOUNT = 1000

/**
 * The only method a milestone may be paid by.
 *
 * UPI (and RuPay debit) carry zero MDR in India by statute, so this is the
 * one collection route that costs the business nothing per transaction.
 * Everything else at every gateway is roughly 2% + GST.
 *
 * Set to null to accept all methods — but read the note at the order call
 * first, and move `PLATFORM_FEE_RATE` before you do.
 */
const PAYMENT_METHOD = 'upi'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subjectType, subjectId, milestoneId, scheduleVersion } = req.body || {}
  if (!subjectType || !subjectId || !milestoneId) {
    return res.status(400).json({ error: 'Missing subjectType, subjectId or milestoneId' })
  }
  if (subjectType !== 'event' && subjectType !== 'enquiry') {
    return res.status(400).json({ error: 'Unknown subjectType' })
  }
  const share = SHARES[milestoneId]
  if (!share) return res.status(400).json({ error: 'Unknown milestone' })

  // `RAZORPAY_KEY_ID` first, matching the sibling create-razorpay-order.js.
  // The VITE_-prefixed one is the browser's copy (it is a publishable id, so
  // that is correct) and is accepted as a fallback only so a project that set
  // just the one variable still works rather than 503-ing with no explanation.
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    // Honest 503, never a fake success — the same posture LockPayment takes
    // when no UPI id is configured.
    return res.status(503).json({ error: 'Payment gateway is not configured yet' })
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // ── The confirmed total, from the database, never from the client ─────
  // Only an APPROVED proposal or a coordinator's `quoted_price` counts. The
  // estimate range is deliberately not a source: it is a number no supplier
  // has agreed to, and putting a due date on it is what the range exists to
  // prevent.
  let confirmedTotal = null
  let lockPaid = 0

  if (subjectType === 'event') {
    const { data: ev } = await supabase
      .from('events').select('id, lock_payment_status').eq('id', subjectId).single()
    if (!ev) return res.status(404).json({ error: 'Celebration not found' })
    if (ev.lock_payment_status === 'confirmed') lockPaid = LOCK_AMOUNT

    const { data: proposal } = await supabase
      .from('event_proposals').select('total_amount')
      .eq('event_id', subjectId).eq('status', 'APPROVED')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    confirmedTotal = proposal?.total_amount ?? null
  } else {
    const { data: enq } = await supabase
      .from('service_enquiries').select('id, quoted_price, lock_payment_status')
      .eq('id', subjectId).single()
    if (!enq) return res.status(404).json({ error: 'Celebration not found' })
    if (enq.lock_payment_status === 'confirmed') lockPaid = LOCK_AMOUNT
    confirmedTotal = enq.quoted_price ?? null
  }

  if (!confirmedTotal || Number(confirmedTotal) <= 0) {
    return res.status(409).json({ error: 'This celebration has no confirmed quote yet' })
  }

  const gross = Math.round(Number(confirmedTotal) * share)
  const credit = HOLD_CREDITING.has(milestoneId) ? lockPaid : 0
  const amount = Math.max(0, gross - credit)
  if (amount <= 0) return res.status(409).json({ error: 'Nothing to pay on this milestone' })

  // ── Razorpay ──────────────────────────────────────────────────────────
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amount * 100,                 // paise
      currency: 'INR',
      receipt: `${subjectId.slice(0, 8)}-${milestoneId}`.slice(0, 40),
      notes: { subjectType, subjectId, milestoneId },
      // ── UPI only, and this is a commercial decision made structural ────
      // UPI and RuPay debit are zero-MDR in India by law (the 2019 Finance
      // Act amendment to the Payments and Settlement Systems Act), so a
      // milestone collected over UPI costs the business nothing. Cards and
      // netbanking are ~2% + GST, which on a ₹1,00,000 celebration is about
      // ₹2,360 against a platform fee of ₹2,000 — the gateway would eat the
      // entire margin and then some, on every single instalment.
      //
      // Restricting it on the ORDER rather than in the checkout options is
      // deliberate: a client-side `method` filter is a suggestion the
      // browser can be talked out of, and a card payment that slips through
      // is a real loss on a five-figure sum. Razorpay refuses anything but
      // UPI against this order.
      //
      // If cards are ever wanted, `PLATFORM_FEE_RATE` has to move first.
      method: PAYMENT_METHOD,
    }),
  })
  if (!rzpRes.ok) {
    const detail = await rzpRes.text()
    return res.status(502).json({ error: 'Could not open a payment', detail: detail.slice(0, 300) })
  }
  const rzpOrder = await rzpRes.json()

  // ── Park the milestone as PENDING ─────────────────────────────────────
  // Upserted on (subject, milestone) — the unique indexes in migration 046
  // mean a customer who opens the payment sheet twice gets one row, not two.
  const subjectColumn = subjectType === 'event' ? 'event_id' : 'enquiry_id'
  const { error: upsertErr } = await supabase.from('event_payments').upsert({
    [subjectColumn]: subjectId,
    milestone_id: milestoneId,
    schedule_version: scheduleVersion ?? null,
    amount,
    payment_type: milestoneId === 'balance' || milestoneId === 'settle' ? 'full' : 'advance',
    status: 'PENDING',
    gateway_order_id: rzpOrder.id,
  }, { onConflict: `${subjectColumn},milestone_id` })

  if (upsertErr) return res.status(500).json({ error: upsertErr.message })

  return res.status(200).json({
    razorpayOrderId: rzpOrder.id,
    amount,
    currency: 'INR',
    keyId,
    // So the checkout sheet opens straight on UPI rather than showing a card
    // tab the order will refuse. Belt and braces: the order is the guarantee,
    // this is the courtesy.
    method: PAYMENT_METHOD,
  })
}
