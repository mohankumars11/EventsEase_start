/**
 * Open the payment for an APPROVED materials quote.
 *
 * POST /api/create-materials-payment
 *   { quoteId }
 *
 * ══════════════════════════════════════════════════════════════════════
 * A SEPARATE ORDER, NOT A SECOND BOOKING LINE
 * ══════════════════════════════════════════════════════════════════════
 *
 * create-booking-payment is keyed end to end on booking_lines ids in the
 * order notes, and bookingCapture writes escrow_ledger against them.
 * Reusing it for materials would need a materials booking_lines row,
 * which becomes a phantom job on the partner's calendar and earnings
 * (059:188-193 + 141:91), pays the partner cash on capture
 * (routeTransfers.js:25-58), and gets booked as platform commission on
 * release (routeRelease.js:74-78).
 *
 * So this is its own order, its own notes kind, and its own ledger.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE AMOUNT IS RE-READ FROM THE DATABASE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The client sends a quote id and nothing else that matters. The amount
 * is procurement_quotes.total_paise, written server-side, on a quote
 * that must be `approved` and unexpired. A client that could name its
 * own amount could name ₹1 — the rule create-booking-payment states.
 *
 * Nothing here marks anything paid. api/razorpay-webhook.js is the only
 * witness that money arrived.
 */
import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { authenticatedUser } from './_lib/auth.js'
import { createOrder, providerName, enabledMethods } from './_lib/payments.js'
import { testChargePaise } from './_lib/testCharge.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const user = await authenticatedUser(req, db)
  if (!user) return res.status(401).json({ error: 'Sign in to continue' })

  const { quoteId } = req.body ?? {}
  if (!quoteId) return res.status(400).json({ error: 'quoteId is required' })

  /* Live keys without a live webhook secret take money and lose it.
     Copied verbatim from create-booking-payment.js:97-110 rather than
     factored out, because the two endpoints must be able to refuse
     independently: a checklist is a thing somebody does once. */
  const isLive = String(process.env.RAZORPAY_KEY_ID ?? '').startsWith('rzp_live')
  const hasLiveWebhook = !!process.env.RAZORPAY_WEBHOOK_SECRET_LIVE
  if (isLive && !hasLiveWebhook) {
    return res.status(503).json({
      error: 'Payments are being switched on',
      detail:
        'Live keys are configured but the live webhook secret is not, so a '
        + 'payment could be taken without being recorded. Set '
        + 'RAZORPAY_WEBHOOK_SECRET_LIVE from the webhook created in Razorpay '
        + 'Live mode.',
      scan: 'Payments are back in a moment — nothing has been charged.',
    })
  }

  const { data: quote, error } = await db
    .from('procurement_quotes')
    .select('id, line_id, requirement_id, customer_id, status, total_paise, expires_at')
    .eq('id', quoteId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!quote) return res.status(404).json({ error: 'That materials quote no longer exists' })

  // Ownership, checked here because this runs with the service role and
  // RLS is not protecting anything on this path.
  if (quote.customer_id !== user.id) {
    return res.status(403).json({ error: 'That quote belongs to someone else' })
  }

  if (quote.status === 'funded' || quote.status === 'settled') {
    return res.status(409).json({ error: 'This materials quote is already paid' })
  }
  if (quote.status !== 'approved') {
    return res.status(409).json({
      error: 'This quote has not been approved yet',
      detail: 'Approve the materials list first, then pay.',
    })
  }
  if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
    return res.status(409).json({
      error: 'This materials quote has expired',
      detail: 'Prices move. Ask your partner for an updated list.',
    })
  }

  const quotedPaise = Number(quote.total_paise) || 0
  if (quotedPaise <= 0) return res.status(409).json({ error: 'Nothing to pay on this quote' })

  const testPaise = testChargePaise()
  const amountPaise = testPaise || quotedPaise

  const order = await createOrder({
    amountPaise,
    receipt: `mat_${String(quote.id).slice(0, 18)}`,
    // The link between this order and the quote it funds. The webhook
    // reads these back off the ORDER, because Razorpay does not copy
    // notes onto the payment entity in every flow.
    notes: {
      kind: 'materials_quote',
      quoteId: quote.id,
      lineId: quote.line_id,
      requirementId: quote.requirement_id,
      customerId: quote.customer_id,
      totalPaise: String(quotedPaise),
      testCharge: testPaise ? 'true' : 'false',
    },
  })

  if (!order.ok) return res.status(502).json({ error: order.error })

  const methods = await enabledMethods()

  return res.status(200).json({
    ok: true,
    provider: providerName(),
    orderId: order.orderId,
    amountPaise,
    quotedPaise,
    keyId: order.keyId,
    methods,
    testCharge: !!testPaise,
  })
}
