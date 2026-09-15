import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatINR } from '../../utils/format'
import { jobMoney } from '../../lib/earningsStatement'

/**
 * One job in the work history, and the arithmetic behind its figure.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ROW SHOWED A NUMBER THE TOTALS ABOVE IT DISAGREED WITH
 * ══════════════════════════════════════════════════════════════════════
 *
 * This list printed `partner_amount_paise` while every total above it
 * was computed net of TCS and TDS, so a partner adding the rows up got a
 * different answer from the one on the dark card — on the one screen
 * where that must never happen. Both now come from `jobMoney`.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AND IT IS OPENABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Collapsed, the row answers "what did this job pay me". Opened, it
 * answers "why is that less than what the customer paid" — the question
 * a supplier eventually asks of every marketplace, and the one this app
 * previously had no screen for. The commission is named with its rate;
 * the two statutory lines say who they went to, because a partner who
 * reads TCS as our margin has been told something false by omission.
 */
export default function JobMoneyRow({ job, where, hasPan, annualGrossInr }) {
  const [open, setOpen] = useState(false)
  const m = jobMoney(job, { hasPan, annualGrossInr })

  const rupees = p => formatINR(Math.round(p / 100))
  const date = job.event_date
    ? new Date(`${job.event_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <li className="py-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-1.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-extrabold text-ink">
            {job.service_name}
          </span>
          <span className="block truncate text-[11.5px] font-semibold text-ink-mute">
            {date ?? '—'}{job.area_label ? ` · ${job.area_label}` : ''} · {where}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[13.5px] font-extrabold tabular-nums text-ink">
            {rupees(m.netPaise)}
          </span>
          {m.itemised && (
            <span className="block text-[10.5px] font-semibold tabular-nums text-ink-mute">
              of {rupees(m.customerPaise)}
            </span>
          )}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <dl className="mb-2 mt-1 space-y-1.5 rounded-[16px] bg-ink/[0.03] p-3 text-[12px]">
          {m.itemised ? (
            <>
              <Line label="The customer paid" value={rupees(m.customerPaise)} sign="" />
              <Line
                label="Sambramo's fee"
                note={`${Math.round(m.commissionRate * 100)}% commission`}
                value={rupees(m.commissionPaise)}
                sign="−"
              />
            </>
          ) : (
            <>
              <Line label="Your share of the job" value={rupees(m.sharePaise)} sign="" />
              {/* Said plainly rather than filled in with a plausible
                  figure. An older row does not carry the customer price,
                  and a guessed commission on an earnings screen is worse
                  than an absent one. */}
              <p className="text-[11px] leading-snug text-ink-mute">
                This job predates the itemised record, so the customer price
                and the fee cannot be shown for it.
              </p>
            </>
          )}
          <Line label="TCS (GST)" note="deposited for you" value={rupees(m.tcsPaise)} sign="−" />
          <Line
            label="TDS"
            note={m.tdsWaived ? 'waived — PAN on file' : 'deposited for you'}
            value={rupees(m.tdsPaise)}
            sign={m.tdsPaise ? '−' : ''}
          />
          <div className="flex justify-between gap-3 border-t border-ink/[0.08] pt-1.5">
            <dt className="font-extrabold text-ink">Reaches you</dt>
            <dd className="font-extrabold tabular-nums text-ink">{rupees(m.netPaise)}</dd>
          </div>
        </dl>
      )}
    </li>
  )
}

function Line({ label, note, value, sign }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="font-semibold text-ink-soft">
        {label}
        {note && <span className="ml-1 font-medium text-ink-mute">· {note}</span>}
      </dt>
      <dd className="shrink-0 font-semibold tabular-nums text-ink-soft">{sign}{value}</dd>
    </div>
  )
}
