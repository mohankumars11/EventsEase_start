import { partnerEarnings, partnerDeductions } from './instantPricing'
import { PLATFORM_FEE_RATE } from '../config/instantBooking'

/**
 * One job's money, broken into the four parts a partner asks about.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE CUSTOMER PRICE IS ON THIS SCREEN AT ALL
 * ══════════════════════════════════════════════════════════════════════
 *
 * The earnings screen used to print the partner's share and nothing
 * else, on the reasoning that "a partner who sees the gross and works
 * out the fee themselves feels something was hidden".
 *
 * That reasoning is backwards. A partner who is never shown the customer
 * price cannot check the commission, and the one thing every marketplace
 * supplier eventually wants to check is the commission. Hiding the
 * numerator does not make the fee feel smaller; it makes it feel
 * unverifiable, and an unverifiable deduction is the one people assume
 * the worst about.
 *
 * So all four are shown together, and they add up on screen:
 *
 *   Customer paid        quoted_amount_paise
 *   − Sambramo's fee     the commission, with its rate named
 *   − TCS and TDS        deposited with the authorities, not our income
 *   = Reaches you        what lands in the account
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING HERE IS INVENTED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every figure is derived from columns on `partner_jobs`. A job whose
 * row carries no `quoted_amount_paise` — older rows predate the column
 * being populated — returns `itemised: false` and its commission is
 * null rather than a guess. The screen says so rather than printing a
 * plausible number nobody can trace.
 */

/**
 * The Indian financial year containing `date`: 1 April to 31 March.
 * Statements, the TDS threshold and every accountant's question are all
 * on this calendar, not the Gregorian one.
 */
export function financialYear(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  // Jan/Feb/Mar belong to the year that began the previous April.
  const startYear = d.getMonth() < 3 ? y - 1 : y
  return {
    startYear,
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`,
    label: `FY ${startYear}–${String(startYear + 1).slice(-2)}`,
  }
}

/** Is this job's event inside that financial year? */
export function inFY(job, fy) {
  if (!job?.event_date) return false
  return job.event_date >= fy.start && job.event_date <= fy.end
}

/**
 * The partner's gross for the year, in rupees, for the s.194-O test.
 *
 * Measured on the CUSTOMER price rather than the share. That is the
 * conservative direction: a larger annual figure is more likely to cross
 * the threshold, which means TDS is applied, which means the net shown
 * is the lower of the two possible answers. Being pleasantly wrong is
 * survivable on this screen; being optimistically wrong is not.
 *
 * Cancelled and expired lines are excluded — they are not sales.
 */
export function annualGrossInr(jobs, fy = financialYear()) {
  let paise = 0
  for (const j of jobs ?? []) {
    if (j.status === 'cancelled' || j.status === 'expired') continue
    if (!inFY(j, fy)) continue
    paise += j.quoted_amount_paise ?? j.partner_amount_paise ?? 0
  }
  return Math.round(paise / 100)
}

/**
 * One job, split four ways.
 *
 * `opts.hasPan` and `opts.annualGrossInr` decide only whether TDS
 * applies; they never change the commission or the customer price.
 */
export function jobMoney(job, opts = {}) {
  const quoted = job?.quoted_amount_paise ?? null
  const share = job?.partner_amount_paise ?? null

  if (quoted) {
    const e = partnerEarnings(quoted, opts)
    return {
      itemised: true,
      customerPaise: e.grossPaise,
      commissionPaise: e.feePaise,
      commissionRate: e.feeRate,
      sharePaise: e.grossPaise - e.feePaise,
      tcsPaise: e.tcsPaise,
      tdsPaise: e.tdsPaise,
      tdsWaived: e.tdsWaived,
      netPaise: e.netPaise,
    }
  }

  /* No quote on the row. The share is still a fact, and the statutory
     slices still come off it, so three of the four parts are knowable.
     The commission is not, and is returned as null. */
  const d = partnerDeductions(share ?? 0, opts)
  return {
    itemised: false,
    customerPaise: null,
    commissionPaise: null,
    commissionRate: PLATFORM_FEE_RATE,
    sharePaise: d.sharePaise,
    tcsPaise: d.tcsPaise,
    tdsPaise: d.tdsPaise,
    tdsWaived: d.tdsWaived,
    netPaise: d.netPaise,
  }
}

/**
 * A year's worth of those, added up — the statement.
 *
 * `taxDepositedPaise` is kept apart from `commissionPaise` on purpose.
 * Folding them together would overstate what Sambramo earned and
 * understate what was remitted to the authorities on the partner's
 * behalf, which are the two worst directions to be wrong in, and the
 * numbers in this object are the ones an accountant is handed.
 */
export function statement(jobs, { fy = financialYear(), ...opts } = {}) {
  const rows = (jobs ?? [])
    .filter(j => j.status !== 'cancelled' && j.status !== 'expired')
    .filter(j => inFY(j, fy))

  const t = {
    fy,
    jobs: rows.length,
    customerPaise: 0,
    commissionPaise: 0,
    tcsPaise: 0,
    tdsPaise: 0,
    netPaise: 0,
    /** Jobs whose commission could not be itemised, so the customer
        total is a floor rather than a total. Named, not hidden. */
    unitemised: 0,
  }

  for (const j of rows) {
    const m = jobMoney(j, opts)
    if (!m.itemised) t.unitemised += 1
    t.customerPaise += m.customerPaise ?? 0
    t.commissionPaise += m.commissionPaise ?? 0
    t.tcsPaise += m.tcsPaise
    t.tdsPaise += m.tdsPaise
    t.netPaise += m.netPaise
  }

  t.taxDepositedPaise = t.tcsPaise + t.tdsPaise
  return t
}
