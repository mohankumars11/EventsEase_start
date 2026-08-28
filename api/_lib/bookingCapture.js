import { splitCharge } from './testCharge.js'

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

/** Read an order back from Razorpay, for its notes. */
async function fetchOrder(orderId) {
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
    .select('id, status, quoted_amount_paise, service_name')
    .in('id', booking.lineIds)

  if (readErr) return { ok: false, error: readErr.message }
  if (!lines?.length) return { ok: false, error: 'no such lines' }

  // Lines already settled or cancelled between the order opening and the
  // capture landing. Rare, and paying for a cancelled line must not write
  // a hold against it.
  const fundable = lines.filter(l => l.status === 'accepted' || l.status === 'paid')
  if (!fundable.length) return { ok: true, ignored: 'no fundable lines' }

  // Weighted by the quote, so a ₹1 test distributes the way a real
  // payment would rather than evenly across unequal lines.
  const shares = splitCharge(capturedPaise, fundable.map(l => l.quoted_amount_paise || 1))

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

  const { error: statusErr } = await db
    .from('booking_lines')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .in('id', held)
    .eq('status', 'accepted')

  // A line that was already `paid` is not matched by the filter above and
  // is not an error — that is the retry path, again.
  if (statusErr) return { ok: false, error: statusErr.message }

  return { ok: true, lines: held.length, capturedPaise, testCharge: booking.isTestCharge }
}
