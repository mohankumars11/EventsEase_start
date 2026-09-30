import { formatINR } from '../../utils/format'

/**
 * The year, in the four figures an accountant asks for.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A YEAR AND NOT "ALL TIME"
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner needs these numbers for exactly one reason: somebody is
 * filing something. Filing is on the Indian financial year — 1 April to
 * 31 March — so an all-time total, however impressive, is not usable for
 * the purpose the figures are wanted for, and would have to be
 * re-derived by hand.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TCS AND TDS ARE NOT OUR INCOME
 * ══════════════════════════════════════════════════════════════════════
 *
 * They are shown as a separate line from the commission, and labelled as
 * deposited rather than deducted. Folding them into "Sambramo's fee"
 * would overstate what the platform earned and understate what was
 * remitted on the partner's behalf — and it is the remitted figure a
 * partner claims credit for.
 *
 * Nothing here is a projection. Every number is the sum of rows this
 * partner's own account carries; a year with no work shows the year and
 * zeroes, not an encouraging estimate.
 */
export default function EarningsStatement({ statement: s }) {
  const r = p => formatINR(Math.round(p / 100))

  const rows = [
    ['Billed to customers', r(s.customerPaise), 'What your jobs were sold for'],
    ["Sambramo's commission", `− ${r(s.commissionPaise)}`, 'Our fee for the booking'],
    ['Tax deposited for you', `− ${r(s.taxDepositedPaise)}`, 'TCS and TDS, paid to the authorities'],
  ]

  /* ── Why this row exists ────────────────────────────────────────────
     A job from before the itemised record has a share but no customer
     price and no commission, so its money is in the total below and in
     none of the three lines above it. Without this row a reader doing
     the arithmetic gets a smaller number than the total printed beside
     it, and a statement that visibly does not add up is worse than one
     that shows less. With it, the column closes exactly. */
  if (s.unitemisedSharePaise > 0) {
    rows.push([
      'Older jobs, your share',
      `+ ${r(s.unitemisedSharePaise)}`,
      `${s.unitemised === 1 ? 'One job predates' : `${s.unitemised} jobs predate`} the itemised record`,
    ])
  }

  return (
    <div id="your-statement" className="scroll-mt-24 rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] font-extrabold uppercase tracking-wider text-ink-mute">
          Your statement
        </p>
        <p className="text-[11.5px] font-extrabold tabular-nums text-ink-mute">{s.fy.label}</p>
      </div>
      <p className="mt-0.5 text-[12px] font-semibold text-ink-mute">
        {s.jobs === 0
          ? 'No jobs in this financial year yet.'
          : `${s.jobs} job${s.jobs === 1 ? '' : 's'} between 1 April and 31 March.`}
      </p>

      <dl className="mt-3 space-y-2">
        {rows.map(([label, value, hint]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <dt className="min-w-0">
              <span className="block text-[13px] font-extrabold leading-tight text-ink">{label}</span>
              <span className="block text-[11px] leading-snug text-ink-mute">{hint}</span>
            </dt>
            <dd className="shrink-0 text-[13.5px] font-extrabold tabular-nums text-ink">{value}</dd>
          </div>
        ))}
        <div className="flex items-start justify-between gap-3 border-t border-ink/[0.08] pt-2">
          <dt className="text-[13.5px] font-extrabold text-ink">Yours for the year</dt>
          <dd className="shrink-0 font-serif text-[18px] font-extrabold tabular-nums text-ink">
            {r(s.netPaise)}
          </dd>
        </div>
      </dl>

      {/* The column closes now, but a reader still needs to know WHY
          one line is shaped differently from the others. An asterisk on
          a tax figure is a small embarrassment; a silently wrong one is
          a real problem for whoever files against it. */}
      {s.unitemised > 0 && (
        <p className="mt-2.5 rounded-[14px] bg-ink/[0.03] px-3 py-2 text-[11.5px] leading-snug text-ink-mute">
          We cannot show what the customer paid for
          {s.unitemised === 1 ? ' that older job' : ' those older jobs'}, so the
          billed and commission figures cover the rest. Your own share of
          {s.unitemised === 1 ? ' it' : ' them'} is on its own line and is in
          the total.
        </p>
      )}
    </div>
  )
}
