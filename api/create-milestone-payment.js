// Vercel serverless function — opens a Razorpay order to settle ONE
// celebration, in full.
//
// ── Why this is a new file and not a widened create-razorpay-order ───────
// That endpoint is live-path code for the shop and it works. Teaching it a
// second subject shape would put every shop checkout at risk for a feature
// that has not shipped yet, and the two have genuinely different rules: a
// shop order has one amount stored on its own row, whereas a celebration's
// amount is a confirmed quote that has to be re-read and re-credited here.
//
// ── One payment, not four ────────────────────────────────────────────────
// This endpoint used to price any of `pay-25` / `pay-50` / `pay-75` /
// `pay-100` against a plan the browser named. It now issues exactly one
// settlement, `pay-100`, for the whole confirmed quote less anything already
// received. See the header of src/config/celebrationPayments.js for why the
// ladder went: a part-paid celebration is a part-booked celebration, and the
// business has no honest position to hold three days out with half the money.
//
// The id stays `pay-100` deliberately — `event_payments.milestone_id` and its
// unique index (migration 046) already hold that value for anybody who paid
// in full under the old config, and renaming it would re-ask them for money
// they have already sent.
//
// ── The amount never comes from the browser ──────────────────────────────
// The client sends a celebration id and nothing else that matters. The total,
// the credited hold and any legacy instalments are read from the database and
// subtracted server-side. A client that could name its own amount could name ₹1.
//
// ── This alone does not make a payment known ─────────────────────────────
// The browser's success callback is not a reliable witness — somebody who
// pays and closes the tab leaves a captured payment this app never hears
// about. `api/razorpay-webhook.js` is what actually marks money received.
// This endpoint only opens the order and parks a PENDING row.
import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'

// Kept in step with src/config/celebrationPayments.js by
// scripts/check-payment-schedule.mjs, which fails the build if these drift —
// a Vercel function is bundled separately and cannot import from src/, so
// this is a second source of truth for the amount charged to a real card.
const SETTLEMENT_ID = 'pay-100'
const LEGACY_MILESTONE_IDS = ['pay-25', 'pay-50', 'pay-75']
const SETTLED_STATUSES = ['ADMIN_VERIFIED', 'GATEWAY_VERIFIED']
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
  // Preflight, and the headers every response needs. See _lib/cors.js.
  if (cors(req, res)) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subjectType, subjectId, milestoneId, scheduleVersion } = req.body || {}
  if (!subjectType || !subjectId) {
    return res.status(400).json({ error: 'Missing subjectType or subjectId' })
  }
  if (subjectType !== 'event' && subjectType !== 'enquiry') {
    return res.status(400).json({ error: 'Unknown subjectType' })
  }
  // `milestoneId` is accepted but only one value is issued. A client asking
  // for `pay-25` is a client running a build from before the ladder was
  // removed; it is refused rather than quietly upgraded to the full amount,
  // because charging four times what the button said is worse than an error.
  if (milestoneId && milestoneId !== SETTLEMENT_ID) {
    return res.status(409).json({
      error: 'Celebrations are settled in one payment now. Please reload the page.',
    })
  }

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

  // ── What is already in ─────────────────────────────────────────
  // The ₹1,000 hold, plus anything the retired instalment ladder collected
  // before this change. Both are credit against the one payment. A celebration
  // that paid `pay-25` under the old config must never be asked for the whole
  // quote again — that is money already in our account.
  const subjectColumn = subjectType === 'event' ? 'event_id' : 'enquiry_id'
  const { data: priorRows } = await supabase
    .from('event_payments')
    .select('milestone_id, amount, status')
    .eq(subjectColumn, subjectId)
    .in('status', SETTLED_STATUSES)

  const ladderPaid = (priorRows ?? [])
    .filter(r => LEGACY_MILESTONE_IDS.includes(r.milestone_id))
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0)

  const alreadySettled = (priorRows ?? []).some(r => r.milestone_id === SETTLEMENT_ID)
  if (alreadySettled) {
    return res.status(409).json({ error: 'This celebration is already paid in full' })
  }

  const amount = Math.max(0, Number(confirmedTotal) - lockPaid - ladderPaid)
  if (amount <= 0) {
    return res.status(409).json({ error: 'Nothing left to pay on this celebration' })
  }

  // ── Razorpay ──────────────────────────────────────────────────────────
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amount * 100,                 // paise
      currency: 'INR',
      receipt: `${subjectId.slice(0, 8)}-${SETTLEMENT_ID}`.slice(0, 40),
      notes: { subjectType, subjectId, milestoneId: SETTLEMENT_ID },
      // ── UPI only, and this is a commercial decision made structural ────
      // UPI and RuPay debit are zero-MDR in India by law (the 2019 Finance
      // Act amendment to the Payments and Settlement Systems Act), so a
      // celebration collected over UPI costs the business nothing. Cards and
      // netbanking are ~2% + GST, which on a ₹1,00,000 celebration is about
      // ₹2,360 against a platform fee of ₹2,000 — the gateway would eat the
      // entire margin and then some. Taking it in one payment rather than
      // four does not change that arithmetic; it just means it would only be
      // wrong once.
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

  // ── Park the settlement as PENDING ───────────────────────────────
  // Upserted on (subject, milestone) — the unique indexes in migration 046
  // mean a customer who opens the payment sheet twice gets one row, not two.
  //
  // `payment_type: 'full'` unconditionally now. It was 'advance' for every
  // rung but the last; there are no rungs, so nothing on this platform records
  // an advance against a celebration any more.
  const { error: upsertErr } = await supabase.from('event_payments').upsert({
    [subjectColumn]: subjectId,
    milestone_id: SETTLEMENT_ID,
    schedule_version: scheduleVersion ?? null,
    amount,
    payment_type: 'full',
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
