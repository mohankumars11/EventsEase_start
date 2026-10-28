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
import { authenticatedUser } from './_lib/auth.js'
import { createOrder, providerName, enabledMethods } from './_lib/payments.js'
import { testChargePaise } from './_lib/testCharge.js'
import { lineList, lineAdvance, applyOffer, payNow, BOOKING_KINDS } from './_lib/listPrice.js'
import { discountsFor } from './_lib/discounts.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // Preflight, and the headers every response needs. See _lib/cors.js.
  if (cors(req, res)) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const { customerId: bodyCustomerId, lineIds, part: partRaw, voucherId, full } = req.body ?? {}
  // 'advance' (default) pays what a line needs to be confirmed; 'balance'
  // pays what is still owed on a confirmed (paid) line.
  const part = partRaw === 'balance' ? 'balance' : 'advance'
  if (!Array.isArray(lineIds) || !lineIds.length) {
    return res.status(400).json({ error: 'lineIds required' })
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const authn = await authenticatedUser(req, db)
  if (authn.error) return res.status(401).json({ error: 'Authentication required' })
  const customerId = authn.user.id
  if (bodyCustomerId && bodyCustomerId !== customerId) return res.status(403).json({ error: 'customer mismatch' })

  /* ══════════════════════════════════════════════════════════════
     LIVE KEYS WITHOUT A LIVE WEBHOOK SECRET TAKE MONEY AND LOSE IT
     ══════════════════════════════════════════════════════════════

     Razorpay's test and live webhooks are separate objects with
     separate secrets. Switching the API keys to live does not carry the
     test webhook across — so a live payment arrives signed with a
     secret this server has never seen, the signature check rejects it,
     and `api/_lib/bookingCapture.js` never runs.

     The customer is charged. Nothing is recorded. The line stays
     unpaid, the master is never confirmed, and the only trace is a row
     in somebody else's dashboard.

     That is the worst state this system can reach, and it is entirely
     preventable: refuse to open the checkout at all. No money is taken,
     the customer sees a sentence instead of a silent loss, and the fix
     is one environment variable.

     Deliberately checked here rather than trusted to a deployment
     checklist. A checklist is a thing somebody does once. */
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

  // `db` was created above, before authentication. Declaring it a second
  // time here was a SyntaxError that took down every instant payment.

  // Ownership is checked here rather than trusted, because this runs with
  // the service role and RLS is not protecting anything on this path.
  const { data: lines, error } = await db
    .from('booking_lines')
    .select('id, service_name, quoted_amount_paise, pricing_snapshot, status, request_id, booking_requests!inner(customer_id, event_date, area_label)')
    .in('id', lineIds)

  if (error) return res.status(500).json({ error: error.message })

  const mine = (lines ?? []).filter(l => l.booking_requests?.customer_id === customerId)

  /* What each line owes NOW, in the CUSTOMER's terms: the Sambramo price
     (pricing_snapshot.list_paise — api/_lib/listPrice.js). Lines booked
     before list pricing owe their quote, exactly as before.
     advance: an accepted line owes what payNow() says — in full under
       ₹25,000, within 7 days of the event, when the partner takes no
       advance, or when the customer chose to pay it all (`full`);
       otherwise its advance, never under the trade's floor (advanceFloor:
       50% for trades that buy goods before the day, 30% light, 20% labour).
     balance: a paid line owes its price, less what a voucher took off it,
       less what escrow already holds — so a saving is never charged back. */
  let payable = []
  if (part === 'advance') {
    payable = mine.filter(l => l.status === 'accepted').map(l => ({ ...l, due: payNow({ list: lineList(l), advance: lineAdvance(l), eventDate: l.booking_requests?.event_date, trade: l.pricing_snapshot?.trade_code ?? l.pricing_snapshot?.trade_id ?? null }, { full: full === true }) }))
  } else {
    const paidLines = mine.filter(l => l.status === 'paid')
    if (paidLines.length) {
      const { data: holds } = await db.from('escrow_ledger').select('line_id, amount_paise')
        .eq('kind', 'HOLD').in('line_id', paidLines.map(l => l.id))
      const held = {}
      for (const h of holds ?? []) held[h.line_id] = (held[h.line_id] ?? 0) + Number(h.amount_paise)
      let saved
      try { saved = await discountsFor(db, paidLines.map(l => l.id)) } catch (e) { return res.status(500).json({ error: e.message }) }
      payable = paidLines.map(l => ({ ...l, due: lineList(l) - (saved[l.id] ?? 0) - (held[l.id] ?? 0) })).filter(l => l.due > 0)
    }
  }

  if (!payable.length) {
    return res.status(400).json({
      error: 'Nothing to pay for',
      detail: part === 'balance'
        ? 'Nothing is owed on those bookings.'
        : 'Those lines are not yours, not accepted yet, or already paid.',
    })
  }

  /* ══════════════════════════════════════════════════════════════════
     A VOUCHER IS CHECKED HERE, NEVER TRUSTED FROM THE PHONE
     ══════════════════════════════════════════════════════════════════
     The client names a voucher; this decides whether it is the caller's,
     unused, unexpired, a booking offer, and (welcome) their first booking.
     The saving comes only out of Sambramo's margin — applyOffer never
     takes a line below the partner's price — so the partner is paid in
     full and settlement's held ≥ quoted rule still holds. It is applied
     at the first payment only: the whole line's saving is recorded at
     capture and taken off its balance later, at the same rate. */
  let voucher = null
  let offer = payable.map(l => ({ discount: 0, charge: l.due }))
  if (voucherId) {
    const no = (error, status = 400) => res.status(status).json({ error, code: 'voucher' })
    if (part !== 'advance') return no('Offers apply when you first pay for a booking.')
    const { data: v, error: vErr } = await db.from('customer_vouchers')
      .select('id, user_id, kind, code, status, expires_at, terms').eq('id', voucherId).maybeSingle()
    if (vErr) return no('Offers are not switched on yet — pay without it, or try again soon.', 503)
    if (!v || v.user_id !== customerId) return no('This offer is not on your account.')
    if (!BOOKING_KINDS.includes(v.kind)) return no('This offer is not for bookings.')
    if (v.status !== 'available' || (v.expires_at && new Date(v.expires_at) <= new Date())) return no('This offer has been used or has expired.')
    if (v.kind === 'welcome_pct') {
      const { count, error: cErr } = await db.from('booking_lines')
        .select('id, booking_requests!inner(customer_id)', { count: 'exact', head: true })
        .eq('booking_requests.customer_id', customerId).in('status', ['paid', 'in_progress', 'delivered', 'settled'])
      if (cErr) return res.status(500).json({ error: cErr.message })
      if (count > 0) return no('The welcome offer is for your first booking.')
    }
    offer = applyOffer(payable.map(l => ({ list: lineList(l), base: Number(l.quoted_amount_paise) || 0, due: l.due })), v)
    if (!offer.some(o => o.discount > 0)) return no('This offer does not lower this booking.')
    voucher = v
  }

  const listDuePaise = payable.reduce((n, l) => n + l.due, 0)
  const quotedPaise = offer.reduce((n, o) => n + o.charge, 0)
  const discountNowPaise = listDuePaise - quotedPaise
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
      part,
      // Read back at capture: which voucher, and each line's whole saving
      // (aligned with lineIds) — bookingCapture records them, then marks
      // the voucher used.
      ...(voucher ? {
        voucherId: voucher.id, voucherCode: voucher.code,
        lineDiscounts: offer.map(o => o.discount).join(','), discountNowPaise: String(discountNowPaise),
      } : {}),
    },
  })

  if (!order.ok) return res.status(502).json({ error: order.error })

  /* Which methods to put first in the sheet, decided here because
     the browser cannot ask: /v1/methods sends no CORS headers. */
  const methods = await enabledMethods()

  return res.status(200).json({
    provider: providerName(),
    // null when the probe could not answer. The client must treat null
    // as "do not force an order", never as "UPI is off".
    upiEnabled: methods ? methods.upi === true : null,
    orderId: order.id,
    amountPaise,
    keyId: order.keyId,
    // Stated rather than implied. A screen that shows ₹1 while the basket
    // says ₹31,200 and does not say why is a screen somebody deploys.
    testCharge: testPaise ? { chargedPaise: testPaise, quotedPaise } : null,
    // The bill as charged: before the offer, the saving now, and the offer.
    listPaise: listDuePaise,
    discountPaise: discountNowPaise,
    voucher: voucher ? { id: voucher.id, code: voucher.code, kind: voucher.kind } : null,
    lines: payable.map((l, i) => ({
      id: l.id, name: l.service_name, paise: lineList(l), discountPaise: offer[i].discount,
    })),
    // The mock provider returns this so the dev UI can settle without a
    // real gateway. It is absent in production, and the client must treat
    // its absence as "open the real checkout".
    mockSettleUrl: order.mockSettleUrl ?? null,
  })
}
