import { useMemo, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { formatINR } from '../../../utils/format'
import { STATE_LABEL, STATE_TONE, PAYOUT_STATES } from '../../../lib/payoutState'

/**
 * Every job and what happened to its money — as cards on a phone, as a
 * table on a desktop, from one array and one vocabulary.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY BOTH RENDERINGS LIVE IN ONE FILE
 * ══════════════════════════════════════════════════════════════════════
 *
 * They are the same rows with the same statuses and the same money. Two
 * files is two places to add a column, and the failure mode is not a
 * missing column — it is a job that reads "Ready" on a phone and "Held"
 * on a laptop because one of the two got a new state and the other did
 * not. They share `STATE_LABEL` and they share this file, so the drift
 * has nowhere to happen.
 *
 * A table is genuinely better at twelve columns and genuinely worse at
 * 390px, which is why this is not one responsive component: a table that
 * scrolls sideways on a phone is a table nobody reads.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FILTER STATES ARE THE ONES THAT EXIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not the spec's Pending/Processing/Paid/Failed/Cancelled/Refunded/
 * Disputed. `payout_claims.status` holds three values today and four
 * after migration 137, and `payoutState()` derives nine. Offering a
 * "Refunded" filter that can never match anything is a control that
 * teaches a partner the screen is broken.
 */

const TONE = {
  forest:  'bg-forest-50 text-forest-700 ring-forest-200',
  saffron: 'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  ink:     'bg-ink/[0.03] text-ink-mute ring-ink/[0.07]',
}

const rupees = p => formatINR(Math.round(p / 100))

const shortDate = iso => {
  if (!iso) return '—'
  const d = new Date(`${iso.slice(0, 10)}T00:00:00+05:30`)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

export function StateChip({ state }) {
  const s = STATE_LABEL[state] ?? STATE_LABEL.held
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ring-1 ${TONE[STATE_TONE[state]] ?? TONE.ink}`}>
      {s.label}
    </span>
  )
}

/**
 * The filter bar. Shown above both renderings.
 *
 * `states` is derived from the rows present, not from the full list of
 * nine — a partner with no failed payouts should not be offered a
 * "Payout failed" filter that returns an empty screen.
 */
export function TransactionFilters({ rows, value, onChange }) {
  const present = useMemo(() => {
    const seen = new Set(rows.map(r => r.state))
    return PAYOUT_STATES.filter(s => seen.has(s))
  }, [rows])

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 rounded-full bg-ink/[0.04] px-3">
        <Search size={14} className="shrink-0 text-ink-mute" />
        <input
          type="search"
          value={value.q}
          onChange={e => onChange({ ...value, q: e.target.value })}
          placeholder="Search a job, occasion or area"
          className="min-h-[38px] w-full border-0 bg-transparent p-0 text-[13px] text-ink placeholder:text-ink-mute focus:ring-0"
        />
      </label>

      {present.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => onChange({ ...value, state: null })}
            aria-pressed={!value.state}
            className={`min-h-[30px] shrink-0 rounded-full px-3 text-[11.5px] font-extrabold ${
              !value.state ? 'bg-plum-600 text-white' : 'bg-ink/[0.04] text-ink-soft'
            }`}
          >
            All
          </button>
          {present.map(s => {
            const on = value.state === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ ...value, state: on ? null : s })}
                aria-pressed={on}
                className={`min-h-[30px] shrink-0 rounded-full px-3 text-[11.5px] font-extrabold ${
                  on ? 'bg-plum-600 text-white' : 'bg-ink/[0.04] text-ink-soft'
                }`}
              >
                {STATE_LABEL[s].label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Apply the filter bar's value to the enriched rows. */
export function filterRows(rows, { q, state }) {
  const needle = q?.trim().toLowerCase()
  return rows.filter(e => {
    if (state && e.state !== state) return false
    if (!needle) return true
    const r = e.row
    return [r.service_name, r.occasion_name, r.area_label, r.trade, r.line_id]
      .some(v => String(v ?? '').toLowerCase().includes(needle))
  })
}

/* ── Phone: a card per job ─────────────────────────────────────────── */

export function TransactionList({ rows = [], onOpen, limit = 25 }) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? rows : rows.slice(0, limit)

  if (!rows.length) {
    return (
      <p className="rounded-[16px] bg-ink/[0.02] px-4 py-5 text-center text-[12.5px] leading-relaxed text-ink-mute">
        No jobs match this filter.
      </p>
    )
  }

  return (
    <div>
      <ul className="space-y-1.5">
        {shown.map(e => (
          <li key={e.row.line_id}>
            <button
              type="button"
              onClick={() => onOpen?.(e.row.line_id)}
              className="flex w-full items-center gap-3 rounded-[16px] bg-white p-3 text-left ring-1 ring-ink/[0.06]"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="min-w-0 truncate text-[13px] font-extrabold text-ink">
                    {e.row.service_name ?? 'Job'}
                  </span>
                  <StateChip state={e.state} />
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-ink-mute">
                  {shortDate(e.row.event_date)}
                  {e.row.occasion_name ? ` · ${e.row.occasion_name}` : ''}
                  {e.row.area_label ? ` · ${e.row.area_label}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[14px] font-extrabold tabular-nums text-ink">
                  {rupees(e.money.netPaise)}
                </span>
                {e.money.customerPaise != null && (
                  <span className="block text-[10.5px] tabular-nums text-ink-mute">
                    of {rupees(e.money.customerPaise)}
                  </span>
                )}
              </span>
              <ChevronRight size={15} className="shrink-0 text-ink-faint" />
            </button>
          </li>
        ))}
      </ul>

      {rows.length > limit && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 w-full rounded-full bg-ink/[0.04] py-2.5 text-[12.5px] font-extrabold text-ink-soft"
        >
          Show all {rows.length}
        </button>
      )}
    </div>
  )
}

/* ── Desktop: the table the spec asks for ──────────────────────────── */

export function TransactionTable({ rows = [], onOpen }) {
  if (!rows.length) {
    return (
      <p className="rounded-[16px] bg-ink/[0.02] px-4 py-5 text-center text-[12.5px] text-ink-mute">
        No jobs match this filter.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-[16px] ring-1 ring-ink/[0.06]">
      <table className="w-full border-collapse text-[12.5px]">
        <thead className="bg-page-sunk">
          <tr className="text-left text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-mute">
            <th className="px-3 py-2 font-extrabold">Date</th>
            <th className="px-3 py-2 font-extrabold">Job</th>
            <th className="px-3 py-2 font-extrabold">Event</th>
            <th className="px-3 py-2 text-right font-extrabold">Customer paid</th>
            <th className="px-3 py-2 text-right font-extrabold">Fee</th>
            <th className="px-3 py-2 text-right font-extrabold">Tax</th>
            <th className="px-3 py-2 text-right font-extrabold">Net</th>
            <th className="px-3 py-2 font-extrabold">Status</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map(e => (
            <tr
              key={e.row.line_id}
              onClick={() => onOpen?.(e.row.line_id)}
              className="cursor-pointer border-t border-ink/[0.06] hover:bg-plum-50/50"
            >
              <td className="whitespace-nowrap px-3 py-2 text-ink-soft">
                {shortDate(e.row.event_date)}
              </td>
              <td className="max-w-[180px] truncate px-3 py-2 font-extrabold text-ink">
                {e.row.service_name ?? 'Job'}
              </td>
              <td className="max-w-[160px] truncate px-3 py-2 text-ink-soft">
                {e.row.occasion_name ?? '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink-soft">
                {e.money.customerPaise == null ? '—' : rupees(e.money.customerPaise)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink-soft">
                {e.money.commissionPaise == null ? '—' : `−${rupees(e.money.commissionPaise)}`}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink-soft">
                −{rupees(e.money.tcsPaise + e.money.tdsPaise)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-extrabold tabular-nums text-ink">
                {rupees(e.money.netPaise)}
              </td>
              <td className="px-3 py-2"><StateChip state={e.state} /></td>
              <td className="px-2 py-2 text-right">
                <ChevronRight size={14} className="inline text-ink-faint" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
