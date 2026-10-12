/**
 * The customer's materials money arrived. Record it — and only it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT bookingCapture.js
 * ══════════════════════════════════════════════════════════════════════
 *
 * bookingCapture writes escrow_ledger HOLDs against booking_lines and
 * the webhook then calls routeTransfersForCapture, which pays
 * partner_amount_paise to the partner's Route account ON CAPTURE.
 *
 * Materials money must not go down that path. Three things would
 * happen, each verified in the code it happens in:
 *
 *   - routeTransfersForCapture (routeTransfers.js:25-58) would pay the
 *     partner cash up front, which is the early advance this workflow
 *     exists to replace.
 *   - routeRelease.js:74-78 computes platformPaise = held - partner, so
 *     a hold with no matching transfer is booked as RELEASE_PLATFORM:
 *     the customer's flower money quietly becomes platform commission.
 *   - booking_lines_split_balances (059:179-183) enforces
 *     customer = commission + share, which materials break.
 *
 * So: procurement_ledger, its own solvency trigger, and NO call to
 * routeTransfersForCapture from this path. That omission is the whole
 * enforcement of "no partner cash advance", which is why
 * scripts/check-materials-no-partner-advance.mjs asserts it rather than
 * leaving it to this comment.
 *
 * ── Order notes are read back from Razorpay ────────────────────────
 * For the reason bookingCapture.js:21-36 gives: Razorpay does not copy
 * order notes onto the payment entity in every flow, so the notes are
 * fetched from the ORDER rather than trusted from the payment.
 *
 * ── Ledger first, then status ──────────────────────────────────────
 * bookingCapture.js:96-101's rule. A row in the ledger with a stale
 * status is recoverable; a quote marked funded with no ledger row is
 * money that arrived and was never recorded.
 */
import { fetchOrder } from './bookingCapture.js'

/** The materials quote this payment is for, or null if it is not one. */
export async function materialsQuoteFor(entity) {
  const orderId = entity?.order_id
  if (!orderId) return null

  const order = await fetchOrder(orderId)
  const notes = order?.notes ?? null
  if (!notes || notes.kind !== 'materials_quote') return null
  if (!notes.quoteId) return null

  return {
    quoteId: notes.quoteId,
    lineId: notes.lineId ?? null,
    customerId: notes.customerId ?? null,
    totalPaise: Number(notes.totalPaise) || 0,
  }
}

export async function captureMaterialsPayment(db, { entity, quote }) {
  const paymentId = entity?.id
  if (!paymentId || !quote?.quoteId) return { ok: false, error: 'missing payment or quote' }

  /* The CAPTURED amount, not the quoted one. A ₹1 live smoke test and a
     part capture are both real, and the solvency trigger then correctly
     refuses to spend more than actually arrived. Same rule as
     bookingCapture.js:103-108. */
  const capturedPaise = Number(entity.amount) || 0
  if (capturedPaise <= 0) return { ok: false, error: 'captured amount is zero' }

  const { data: row, error: readErr } = await db
    .from('procurement_quotes')
    .select('id, line_id, status, total_paise')
    .eq('id', quote.quoteId)
    .maybeSingle()

  if (readErr) return { ok: false, error: readErr.message }
  if (!row) return { ok: false, error: 'quote not found' }

  // The ledger first.
  const { error: ledgerErr } = await db.from('procurement_ledger').insert({
    quote_id: row.id,
    line_id: row.line_id,
    kind: 'HOLD',
    amount_paise: capturedPaise,
    counterparty: 'customer',
    gateway_payment_id: paymentId,
    adapter: 'Razorpay',
    note: 'materials funded by customer',
  })

  // 23505 is success: the index already holds this exact delivery.
  if (ledgerErr && ledgerErr.code !== '23505') {
    return { ok: false, error: ledgerErr.message }
  }
  const duplicate = ledgerErr?.code === '23505'

  // Then the statuses. Filtered on the state we expect, so a retry
  // matches nothing and that is not an error.
  await db.from('procurement_quotes')
    .update({ status: 'funded' })
    .eq('id', row.id)
    .eq('status', 'approved')

  await db.from('booking_material_requirements')
    .update({ status: 'funded', updated_at: new Date().toISOString() })
    .eq('id', (await db.from('procurement_quotes').select('requirement_id').eq('id', row.id).maybeSingle())
      .data?.requirement_id ?? '00000000-0000-0000-0000-000000000000')
    .eq('status', 'quoted')

  return { ok: true, quoteId: row.id, paise: capturedPaise, duplicate }
}

/** A refund of materials money, recorded against the same quote. */
export async function refundMaterialsPayment(db, { entity, quote }) {
  const refundId = entity?.id
  if (!refundId || !quote?.quoteId) return { ok: false, error: 'missing refund or quote' }
  const paise = Number(entity.amount) || 0
  if (paise <= 0) return { ok: false, error: 'refund amount is zero' }

  const { data: row } = await db
    .from('procurement_quotes').select('id, line_id').eq('id', quote.quoteId).maybeSingle()
  if (!row) return { ok: false, error: 'quote not found' }

  const { error } = await db.from('procurement_ledger').insert({
    quote_id: row.id,
    line_id: row.line_id,
    kind: 'REFUND_CUSTOMER',
    amount_paise: -paise,
    counterparty: 'customer',
    gateway_refund_id: refundId,
    adapter: 'Razorpay',
    note: 'unspent materials money returned',
  })
  if (error && error.code !== '23505') return { ok: false, error: error.message }
  return { ok: true, quoteId: row.id, paise }
}
