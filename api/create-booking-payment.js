/**
 * Open one payment for every master who has accepted so far.
 *
 * POST /api/create-booking-payment
 *   { customerId, lineIds: [uuid, ...] }
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE TAP, ONE CHARGE, FOR EVERYONE WHO SAID YES
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not one payment per master — five Razorpay checkouts for one birthday
 * is five UPI PINs and five chances to abandon, worst on masters four
 * and five, which are the hardest to fill anyway.
 *
 * Not all-or-nothing either — a four-line basket completes about
 * two-thirds of the time at the current card, so waiting for the last
 * master would leave most customers unable to pay anybody.
 *
 * So: the accepted lines, summed, in one order. When a sixth master
 * accepts an hour later, that is a second tap for that one line and the
 * first three are untouched.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE AMOUNT IS RE-READ FROM THE DATABASE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The client sends LINE IDS and nothing else that matters. Every amount
 * comes from `booking_lines.quoted_amount_paise`, which was written
 * server-side at dispatch. A client that could name its own amount could
 * name ₹1 — the same rule `api/create-milestone-payment.js` states, for
 * the same reason.
 *
 * Lines that are not `accepted`, not the caller's, or already paid are
 * silently dropped rather than erroring: a customer who taps Pay twice
 * on a slow connection should be charged once, not shown a failure.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS ENDPOINT DOES NOT MARK ANYTHING PAID
 * ══════════════════════════════════════════════════════════════════════
 *
 * It opens an order and parks the intent. `api/razorpay-webhook.js` is
 * the only witness that money arrived — the browser's success callback
 * is not one, because somebody who pays and closes the tab leaves a
 * captured payment this app never hears about.
 */
import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { createOrder, providerName } from './_lib/payments.js'
import { testChargePaise } from './_lib/testCharge.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // Preflight, and the headers every response needs. See _lib/cors.js.
  if (cors(req, res)) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const { customerId, lineIds } = req.body ?? {}
  if (!customerId) return res.status(400).json({ error: 'customerId required' })
  if (!Array.isArray(lineIds) || !lineIds.length) {
    return res.status(400).json({ error: 'lineIds required' })
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Ownership is checked here rather than trusted, because this runs with
  // the service role and RLS is not protecting anything on this path.
  const { data: lines, error } = await db
    .from('booking_lines')
    .select('id, service_name, quoted_amount_paise, status, request_id, booking_requests!inner(customer_id, event_date, area_label)')
    .in('id', lineIds)

  if (error) return res.status(500).json({ error: error.message })

  const payable = (lines ?? []).filter(
    l => l.booking_requests?.customer_id === customerId && l.status === 'accepted',
  )

  if (!payable.length) {
    return res.status(400).json({
      error: 'Nothing to pay for',
      detail: 'Those lines are not yours, not accepted yet, or already paid.',
    })
  }

  const quotedPaise = payable.reduce((n, l) => n + l.quoted_amount_paise, 0)
  const first = payable[0].booking_requests

  /* The ₹1 live-mode smoke test.
   *
   * Off unless PAYMENT_TEST_CHARGE_PAISE is set. When it is, the gateway
   * is handed that amount instead of the real one — see the header of
   * api/_lib/testCharge.js for why the mock provider cannot answer the
   * question this answers, and for the three things that stop it being
   * left on. The QUOTE is untouched: only what is charged changes. */
  const testPaise = testChargePaise()
  const amountPaise = testPaise ?? quotedPaise

  const order = await createOrder({
    amountPaise,
    // Razorpay caps receipts at 40 characters.
    receipt: `sb_${payable[0].request_id}`.slice(0, 40),
    // The webhook reads these back off the order to know which lines this
    // payment funds. It is the only link between one captured payment and
    // the N escrow holds it becomes, so nothing here is decoration.
    notes: {
      kind: 'booking_lines',
      customerId,
      lineIds: payable.map(l => l.id).join(','),
      eventDate: first?.event_date ?? '',
      area: first?.area_label ?? '',
      lines: String(payable.length),
      quotedPaise: String(quotedPaise),
      testCharge: testPaise ? 'true' : 'false',
    },
  })

  if (!order.ok) return res.status(502).json({ error: order.error })

  return res.status(200).json({
    provider: providerName(),
    orderId: order.id,
    amountPaise,
    keyId: order.keyId,
    // Stated rather than implied. A screen that shows ₹1 while the basket
    // says ₹31,200 and does not say why is a screen somebody deploys.
    testCharge: testPaise ? { chargedPaise: testPaise, quotedPaise } : null,
    lines: payable.map(l => ({
      id: l.id, name: l.service_name, paise: l.quoted_amount_paise,
    })),
    // The mock provider returns this so the dev UI can settle without a
    // real gateway. It is absent in production, and the client must treat
    // its absence as "open the real checkout".
    mockSettleUrl: order.mockSettleUrl ?? null,
  })
}
