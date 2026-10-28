import { splitCharge } from './testCharge.js'
import { lineList } from './listPrice.js'
import { discountsFor } from './discounts.js'
import { sendPush } from './fcm.js'

/**
 * One captured payment → N escrow holds, one per line.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE HALF THE WEBHOOK WAS MISSING
 * ══════════════════════════════════════════════════════════════════════
 *
 * `api/razorpay-webhook.js` knew how to settle a milestone payment on the
 * pre-book journey and nothing else. An instant booking could be paid
 * for — the order opened, the UPI PIN was entered, Razorpay captured the
 * money — and the webhook found no `event_payments` row for the order,
 * answered `{ ignored: true }`, and the booking stayed unpaid forever.
 *
 * Money in, nothing recorded. That is the exact failure the webhook's own
 * header says it exists to prevent, on the newer of the two payment
 * paths.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE LINE IDS COME FROM THE ORDER AND NOT FROM THE PAYMENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `create-booking-payment.js` writes them into the ORDER's notes. Razorpay
 * copies order notes onto the payment entity in most flows but not in
 * every one, and "most" is not a basis for deciding whether somebody's
 * ₹31,200 was recorded. So the order is fetched back over the API and its
 * notes are read from the authoritative copy.
 *
 * The alternative was a `booking_payments` table, which is a migration —
 * and migrations here are applied by hand, so it is also a deployment
 * that is broken until somebody pastes SQL. The order already carries the
 * fact. Reading it back is one HTTP call on a path that runs once per
 * payment.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IDEMPOTENCY IS THE DATABASE'S JOB
 * ══════════════════════════════════════════════════════════════════════
 *
 * Razorpay retries until it gets a 2xx, so this runs more than once for
 * the same payment as a matter of course. `uq_escrow_hold_per_payment_line`
 * (migration 062) is a partial unique index on (line_id, gateway_payment_id)
 * for HOLD rows: the second delivery raises 23505 and that is success,
 * not an error to report. Nothing here counts retries or checks first —
 * a check-then-insert has a race and the index does not.
 */

const RZP = 'https://api.razorpay.com/v1'

/** Read an order back from Razorpay, for its notes.
 *  Exported so materialsCapture reads notes the same way, rather than
 *  keeping a second copy of the reason they cannot be trusted from the
 *  payment entity. */
export async function fetchOrder(orderId) {
  const id = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) return null

  const auth = Buffer.from(`${id}:${secret}`).toString('base64')
  const res = await fetch(`${RZP}/orders/${orderId}`, {
    headers: { authorization: `Basic ${auth}` },
  })
  if (!res.ok) return null
  return res.json()
}

/**
 * Is this captured payment one of ours, and which lines does it fund?
 *
 * Returns null for anything that is not a booking payment — a shop order,
 * a milestone, somebody else's webhook. The caller must then fall through
 * to its other handlers rather than treating this as a failure.
 */
export async function bookingLinesFor(entity) {
  // The mock provider puts notes directly on its payment entity, because
  // there is no Razorpay to fetch an order back from.
  const direct = entity?.notes
  if (direct?.kind === 'booking_lines' && direct.lineIds) return parse(direct)

  const order = await fetchOrder(entity.order_id)
  const notes = order?.notes
  if (notes?.kind !== 'booking_lines' || !notes.lineIds) return null
  return parse(notes)
}

function parse(notes) {
  return {
    customerId: notes.customerId ?? null,
    lineIds: String(notes.lineIds).split(',').map(s => s.trim()).filter(Boolean),
    quotedPaise: Number(notes.quotedPaise ?? 0) || 0,
    isTestCharge: notes.testCharge === 'true',
    // Set by create-booking-payment when a voucher was applied (193).
    voucherId: notes.voucherId || null,
    voucherCode: notes.voucherCode || null,
    lineDiscounts: String(notes.lineDiscounts ?? '').split(',').map(x => Math.max(0, Math.round(Number(x) || 0))),
  }
}

/**
 * Record the money and mark the lines paid.
 *
 * ── The order of the two writes ──────────────────────────────────────
 * Ledger first, status second. If the process dies between them the
 * result is money recorded against a line that still says `accepted` —
 * recoverable, visible, and reconcilable against Razorpay. The other
 * order gives a line that says `paid` with no record of payment, which
 * is indistinguishable from a booking that was never paid for.
 *
 * ── Why the HOLD is the CAPTURED amount, not the quote ───────────────
 * They are the same number in normal operation. They differ in the ₹1
 * test, and under a part-capture. In both cases the ledger must say what
 * arrived: escrow is a claim about money that exists, and a HOLD for
 * ₹12,400 backed by ₹1 is the thing the solvency trigger in migration 062
 * exists to make impossible.
 */
export async function captureBookingPayment(db, { entity, booking }) {
  const paymentId = entity.id
  const capturedPaise = Number(entity.amount ?? 0)

  const { data: lines, error: readErr } = await db
    .from('booking_lines')
    .select('id, status, quoted_amount_paise, pricing_snapshot, service_name')
    .in('id', booking.lineIds)

  if (readErr) return { ok: false, error: readErr.message }
  if (!lines?.length) return { ok: false, error: 'no such lines' }

  // Lines already settled or cancelled between the order opening and the
  // capture landing. Rare, and paying for a cancelled line must not write
  // a hold against it.
  const fundable = lines.filter(l => l.status === 'accepted' || l.status === 'paid')
  if (!fundable.length) return { ok: true, ignored: 'no fundable lines' }

  /* Weighted by what each line owes the customer — its Sambramo price less
     any voucher saving (this order's, from the notes, or one recorded on an
     earlier payment) — so a ₹1 test distributes the way a real payment
     would rather than evenly across unequal lines. */
  const fromNotes = Object.fromEntries(booking.voucherId ? booking.lineIds.map((id, i) => [id, booking.lineDiscounts[i] || 0]) : [])
  let saved = {}
  try { saved = await discountsFor(db, fundable.map(l => l.id)) } catch (e) { return { ok: false, error: e.message } }
  const net = l => Math.max(1, lineList(l) - (fromNotes[l.id] ?? saved[l.id] ?? 0))
  const shares = splitCharge(capturedPaise, fundable.map(net))

  const held = []
  for (let i = 0; i < fundable.length; i++) {
    const line = fundable[i]
    const { error } = await db.from('escrow_ledger').insert({
      line_id: line.id,
      kind: 'HOLD',
      amount_paise: shares[i],
      counterparty: 'customer',
      gateway_payment_id: paymentId,
      adapter: 'ManualPayout',
      note: booking.isTestCharge
        // Written into the row itself. A ₹1 hold against a ₹12,400 job
        // will be looked at one day by somebody who was not here today.
        ? `TEST CHARGE — ₹${(capturedPaise / 100).toFixed(2)} captured against a ₹${((booking.quotedPaise || 0) / 100).toFixed(0)} basket`
        : null,
    })

    // The retry landing again. The index did its job.
    if (error && error.code !== '23505') return { ok: false, error: error.message }
    held.push(line.id)
  }

  /* The voucher: each line's saving, then the voucher marked used. Before
     the status write, for the same reason the ledger is: a failure here
     returns an error, Razorpay retries, and every write so far is
     idempotent. A line marked paid without its saving recorded would have
     that saving charged back on its balance. */
  if (booking.voucherId) {
    const r = await recordVoucher(db, { booking, orderId: entity.order_id ?? paymentId, lineIds: held })
    if (!r.ok) return r
  }

  const { error: statusErr } = await db
    .from('booking_lines')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .in('id', held)
    .eq('status', 'accepted')

  // A line that was already `paid` is not matched by the filter above and
  // is not an error — that is the retry path, again.
  if (statusErr) return { ok: false, error: statusErr.message }

  /* And tell them, because "your date is blocked" is the sentence the
   * whole flow has been building towards and the customer may well have
   * closed the tab by now. Sent from the webhook rather than the browser
   * for exactly that reason — this is the only place that KNOWS. */
  await notifyPaid(db, held).catch(() => {})

  return { ok: true, lines: held.length, capturedPaise, testCharge: booking.isTestCharge }
}


/**
 * "Your date is blocked."
 *
 * Best effort and deliberately unawaited by its caller's error path: a
 * payment that was captured and recorded must not be reported as failed
 * because a push did not send. The webhook returning non-2xx would make
 * Razorpay retry a capture that already succeeded.
 */
async function recordVoucher(db, { booking, orderId, lineIds }) {
  const rows = booking.lineIds
    .map((id, i) => ({ line_id: id, voucher_id: booking.voucherId, voucher_code: booking.voucherCode ?? '', order_id: String(orderId), discount_paise: booking.lineDiscounts[i] || 0 }))
    .filter(r => lineIds.includes(r.line_id) && r.discount_paise > 0)
  if (rows.length) {
    const { error } = await db.from('booking_line_discounts').upsert(rows, { onConflict: 'line_id', ignoreDuplicates: true })
    if (error) return { ok: false, error: `voucher saving not recorded: ${error.message}` }
  }
  const usedOn = `order:${orderId}`.slice(0, 80)
  const { data: used, error } = await db.from('customer_vouchers')
    .update({ status: 'used', used_at: new Date().toISOString(), used_on: usedOn })
    .eq('id', booking.voucherId).eq('status', 'available').select('id')
  if (error) return { ok: false, error: `voucher not marked used: ${error.message}` }
  if (!used?.length) {
    /* Already used — by this order (a retry: fine) or by another one opened
       at the same moment (the customer was given the saving twice). The
       money is real either way; say so loudly for a human. */
    const { data: v } = await db.from('customer_vouchers').select('used_on').eq('id', booking.voucherId).maybeSingle()
    if (v?.used_on !== usedOn) console.error(`[voucher] ${booking.voucherCode} applied to ${usedOn} but already ${v?.used_on ?? 'gone'} — review`)
  }
  return { ok: true }
}

async function notifyPaid(db, lineIds) {
  const { data: lines } = await db
    .from('booking_lines')
    .select('id, service_name, booking_requests!inner(customer_id)')
    .in('id', lineIds)

  const customerId = lines?.[0]?.booking_requests?.customer_id
  if (!customerId) return

  const { data: tokens } = await db
    .from('push_tokens').select('token, platform')
    .eq('profile_id', customerId).eq('app', 'customer').lt('failure_count', 5)
  if (!tokens?.length) return

  const n = lines.length
  const title = 'Your date is blocked'
  const body = n === 1
    ? `${lines[0].service_name} is confirmed. Your master will call you shortly.`
    : `${n} masters confirmed. They will call you shortly.`

  await Promise.all(tokens.map(t => sendPush({
    token: t.token, platform: t.platform, title, body,
    url: '/track', lineId: lines[0].id, ttlSeconds: 3600,
  }).catch(() => {})))
}
