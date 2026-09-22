import { formatINR } from '../../../utils/format'

/**
 * Money that no customer paid in.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT RENDERS ONLY WHEN THERE IS SOMETHING TO RENDER
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is the row the reference design called "Adjustments" and the
 * screen it replaces refused to draw, because there was no column behind
 * it and a row that always reads Rs 0 is a promise a partner reads as a
 * feature.
 *
 * Migration 140 gives it a column. That does not change the rule: the
 * panel returns null until an operator has actually granted something,
 * because an empty "Adjustments" card teaches a partner that the app
 * owes them an explanation it does not have.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEVER FOLDED INTO A JOB'S SPLIT
 * ══════════════════════════════════════════════════════════════════════
 *
 * An adjustment sits apart from customer / fee / tax / net and below the
 * net on a payment slip. Folding it in would break the identity
 * `customer = commission + share` that check-earnings-math asserts on
 * every job, and the screen would visibly stop adding up.
 *
 * The reason is shown, always. 140 makes `reason` NOT NULL for exactly
 * this: an unexplained change to somebody's money is the fastest way to
 * lose their trust in a payments product.
 */

const KIND = {
  bonus:         'Bonus',
  incentive:     'Incentive',
  reimbursement: 'Reimbursement',
  penalty:       'Penalty',
  correction:    'Correction',
  recovery:      'Recovery',
}

const rupees = p => formatINR(Math.round(Math.abs(p) / 100))

const onDate = iso => iso
  ? new Date(`${iso.slice(0, 10)}T00:00:00+05:30`)
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
  : ''

export default function AdjustmentsPanel({ adjustments = [] }) {
  if (!adjustments.length) return null

  const total = adjustments.reduce((n, a) => n + a.amount_paise, 0)

  return (
    <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[13.5px] font-extrabold text-ink">Adjustments</h2>
        <p className={`text-[14px] font-extrabold tabular-nums ${
          total < 0 ? 'text-saffron-800' : 'text-forest-700'
        }`}>
          {total < 0 ? '−' : '+'}{rupees(total)}
        </p>
      </div>
      <p className="mt-0.5 text-[11.5px] text-ink-mute">
        Separate from any single booking. These are added to your payouts.
      </p>

      <ul className="mt-2.5 space-y-1.5">
        {adjustments.map(a => (
          <li key={a.id} className="rounded-[14px] bg-page-sunk px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] font-extrabold text-ink">
                {KIND[a.kind] ?? 'Adjustment'}
              </p>
              <p className={`shrink-0 text-[13px] font-extrabold tabular-nums ${
                a.amount_paise < 0 ? 'text-saffron-800' : 'text-forest-700'
              }`}>
                {a.amount_paise < 0 ? '−' : '+'}{rupees(a.amount_paise)}
              </p>
            </div>
            <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{a.reason}</p>
            <p className="mt-0.5 text-[10.5px] text-ink-mute">
              {onDate(a.effective_on)}
              {a.settled_claim_id ? ' · paid out' : ' · with your next payout'}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
