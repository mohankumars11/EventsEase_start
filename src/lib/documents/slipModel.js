import { jobMoney, financialYear } from '../earningsStatement'
import { destinationOf } from './mask'

/**
 * A payment slip, as data — before anything decides whether it is a
 * screen or a PDF.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE MODEL, TWO RENDERERS, NO SECOND DERIVATION
 * ══════════════════════════════════════════════════════════════════════
 *
 * `PayoutReceipt.jsx` renders a receipt on screen and `renderPdf.js`
 * renders the same thing as a file. Today the receipt calls `jobMoney()`
 * itself and the two happen to agree — which is not a guarantee, it is a
 * coincidence maintained by hand.
 *
 * So the arithmetic happens exactly once, here, and both renderers
 * consume the result. `check-earnings-math.mjs` asserts that the lines
 * in this model sum to its own total, and that the total equals
 * `jobMoney().netPaise` for the same row. A slip that disagrees with the
 * screen then fails a guard rather than a partner.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT IS A PAYMENT SLIP AND IT SAYS SO
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not an invoice. A GST tax invoice needs the partner's GSTIN, a
 * statutorily continuous invoice number and a place of supply. This
 * project stores a PAN and not a GSTIN, numbers nothing continuously,
 * and records no place of supply — so a document calling itself an
 * invoice would be one in name only, which is worse than not issuing
 * one. The footnote says this outright on every slip.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DOCUMENT NUMBER IS DERIVED, NOT STORED
 * ══════════════════════════════════════════════════════════════════════
 *
 * `SB/PS/FY2526/<first 8 of the claim id>`. A partner quoting that on
 * the phone can be found in one query, and it is stable because the
 * claim id is. Storing generated documents would buy a bucket, a policy,
 * a generator, a regeneration story when a reference is corrected, and a
 * second source of truth that can disagree with the screen — for a
 * document nothing is filed with and no counterparty receives.
 */

const money = (label, paise, opts = {}) => ({ label, paise, ...opts })

/** SB/PS/FY2526/A1B2C3D4 */
export function documentNo(kind, id, when) {
  const fy = financialYear(when)
  const tag = `FY${String(fy.startYear).slice(2)}${String(fy.startYear + 1).slice(2)}`
  const tail = String(id ?? '').replace(/-/g, '').slice(0, 8).toUpperCase() || 'PENDING'
  return `SB/${kind}/${tag}/${tail}`
}

/**
 * @param row        a partner_jobs / partner_earnings row
 * @param claim      the payout_claims row, when one exists
 * @param opts       { hasPan, annualGrossInr, partner, payout, adjustments, state }
 */
export function slipModel(row, claim, opts = {}) {
  const { hasPan = false, annualGrossInr = 0, partner = {}, payout = null,
          adjustments = [], state = null } = opts

  const m = jobMoney(row, { hasPan, annualGrossInr })
  const issuedAt = new Date()

  const lines = []

  /* The customer price is knowable only for an itemised row. For older
     rows the share is a fact and the commission is not, and the
     statement says so rather than guessing — the same rule
     `JobMoneyRow` and `EarningsStatement` already follow. */
  if (m.itemised) {
    lines.push(money('Customer paid', m.customerPaise))
    lines.push(money("Sambramo's fee", -m.commissionPaise, {
      note: `${(m.commissionRate * 100).toFixed(m.commissionRate * 100 % 1 ? 2 : 0)}% of the booking`,
    }))
    lines.push(money('Your share', m.sharePaise, { subtotal: true }))
  } else {
    /* `strong`, NOT `subtotal`.
       A subtotal RESTATES the lines above it, so any sum over the lines
       has to skip it or it double-counts. Here there is nothing above
       it: the share is the base amount, the only positive figure on the
       slip, and marking it a subtotal made the document total to minus
       the tax alone. It is emphasised for the same visual reason and
       counted like any other line. */
    lines.push(money('Your share', m.sharePaise, {
      strong: true,
      note: 'This booking predates itemised pricing, so the customer price and fee are not recorded on it.',
    }))
  }

  lines.push(money('TCS deposited for you', -m.tcsPaise, { note: 'GST s.52, 1%' }))
  lines.push(
    m.tdsWaived
      ? money('TDS', 0, { note: 'Waived — PAN on file and under the s.194-O threshold' })
      : money('TDS deposited for you', -m.tdsPaise, { note: 'Income tax s.194-O, 1%' })
  )

  /* Adjustments are their own lines below the net and are never folded
     into the four-part split above — an adjustment is platform money
     that no customer paid in, and folding it would break the identity
     "customer = commission + share" that the guard asserts. */
  let total = m.netPaise
  for (const a of adjustments) {
    lines.push(money(adjustmentLabel(a), a.amount_paise, { note: a.reason, adjustment: true }))
    total += a.amount_paise
  }

  return {
    kind: 'payment-slip',
    title: 'Partner payment slip',
    documentNo: documentNo('PS', claim?.id ?? row?.line_id, issuedAt),
    issuedAt,
    partner: {
      name: partner.business_name || partner.name || 'Partner',
      code: partner.partner_code ?? null,
    },
    job: {
      bookingId: row?.line_id ?? null,
      service: row?.service_name ?? null,
      trade: row?.trade ?? null,
      occasion: row?.occasion_name ?? null,
      eventDate: row?.event_date ?? null,
      area: [row?.area_label, row?.city].filter(Boolean).join(', ') || null,
    },
    lines,
    total,
    totalLabel: 'Reaches your account',
    /* Snapshotted at claim time by migration 091, already masked. The
       live row is the fallback for a job not yet claimed, masked here. */
    destination: claim?.destination ?? destinationOf(payout),
    reference: claim?.reference ?? null,
    batchReference: row?.batch_reference ?? null,
    status: state,
    settledAt: claim?.settled_at ?? null,
    requestedAt: claim?.requested_at ?? null,
    footnotes: [
      'TCS and TDS are deposited with the authorities on your behalf.',
      'This is a payment slip, not a tax invoice.',
      'Generated electronically by Sambramo. No signature is required.',
    ],
  }
}

function adjustmentLabel(a) {
  const words = {
    bonus: 'Bonus', incentive: 'Incentive', reimbursement: 'Reimbursement',
    penalty: 'Penalty', correction: 'Correction', recovery: 'Recovery',
  }
  return words[a.kind] ?? 'Adjustment'
}

/**
 * The financial-year statement, in the same shape.
 *
 * `unitemisedSharePaise` is carried as its own line on purpose. It is
 * the term that makes the column close for rows written before itemised
 * pricing, and `check-earnings-math.mjs` asserts the statement only
 * balances when it is present. A PDF that quietly dropped it would
 * visibly not add up — the one thing worse than showing less.
 */
export function statementModel(stmt, opts = {}) {
  const { partner = {}, fy } = opts
  const issuedAt = new Date()

  const lines = [
    money('Billed to customers', stmt.customerPaise),
    money("Sambramo's commission", -stmt.commissionPaise),
    money('Tax deposited for you', -stmt.taxDepositedPaise, { note: 'TCS and TDS together' }),
  ]

  if (stmt.unitemised > 0) {
    lines.push(money('Older jobs, your share', stmt.unitemisedSharePaise, {
      note: `${stmt.unitemised} booking${stmt.unitemised === 1 ? '' : 's'} predating itemised pricing, where the customer price and fee are not recorded.`,
    }))
  }

  return {
    kind: 'statement',
    title: 'Partner payment statement',
    documentNo: documentNo('ST', `${fy?.startYear ?? ''}`, issuedAt),
    issuedAt,
    partner: { name: partner.business_name || partner.name || 'Partner', code: partner.partner_code ?? null },
    period: fy?.label ?? '',
    job: null,
    lines,
    total: stmt.netPaise,
    totalLabel: 'Yours for the year',
    jobCount: stmt.jobs,
    footnotes: [
      'TCS and TDS are deposited with the authorities on your behalf.',
      'This is a payment statement, not a tax invoice.',
      'Generated electronically by Sambramo. No signature is required.',
    ],
  }
}
