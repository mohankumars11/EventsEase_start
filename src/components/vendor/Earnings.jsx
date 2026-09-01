import { useCallback, useEffect, useMemo, useState } from 'react'
import { Wallet, Clock, ShieldCheck, Banknote, TriangleAlert, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLivePoll } from '../../hooks/useLivePoll'
import { formatINR } from '../../utils/format'

/**
 * What this partner has earned, and where each rupee currently is.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FOUR BUCKETS, BECAUSE MONEY IS IN ONE OF FOUR PLACES
 * ══════════════════════════════════════════════════════════════════════
 *
 *   Not yours yet    accepted, customer has not paid. Zero risk to them
 *                    and zero claim for you — shown so nobody counts it.
 *   Held for you     paid and held by Sambramo until the job is done.
 *                    This is the number that makes the model trustworthy:
 *                    the money already exists before you set out.
 *   Ready            delivered, past the 24-hour window, nobody objected.
 *                    Owed to you now.
 *   Paid out         gone to your account.
 *
 * A single "total earnings" figure would be a lie by aggregation: it
 * would add money a customer has not paid to money already in somebody's
 * bank, and a partner planning their week needs those apart.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHERE EACH NUMBER COMES FROM
 * ══════════════════════════════════════════════════════════════════════
 *
 * `partner_jobs.partner_amount_paise` — what the master earns, already
 * net of the platform fee. Not the customer price. A partner who sees
 * the gross and works out the fee themselves feels something was hidden.
 *
 * Bucketed on `paid_at`, `delivered_at` and `status`, which are the same
 * columns the job timeline ticks from. The two screens cannot disagree,
 * because they read the same row.
 *
 * ── Ready is computed, not stored ───────────────────────────────────
 * `settled_at` exists and nothing writes it: payouts are run by hand
 * against the ledger. So "ready" means delivered and more than 24 hours
 * past the event, which is the rule the terms state — and it is labelled
 * as owed rather than as sent, because nothing here can prove it was
 * sent.
 */

const DAY = 86400000

export default function Earnings({ vendorId, onAddPayout }) {
  const [jobs, setJobs] = useState([])
  const [payout, setPayout] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const read = useCallback(async () => {
    if (!vendorId) return
    const [{ data: j }, { data: p }] = await Promise.all([
      supabase.from('partner_jobs')
        .select('line_id, service_name, status, partner_amount_paise, paid_at, delivered_at, event_date, occasion_name, area_label')
        .order('event_date', { ascending: false }),
      supabase.from('vendor_payout_details')
        .select('method, upi_id, account_number, verified_at').eq('vendor_id', vendorId).maybeSingle(),
    ])
    setJobs(j ?? [])
    setPayout(p ?? null)
    setLoaded(true)
  }, [vendorId])

  useEffect(() => { read() }, [read])
  useLivePoll(read, 20_000, [read])

  const buckets = useMemo(() => {
    const now = Date.now()
    const b = { pending: [], held: [], ready: [], paid: [] }
    for (const j of jobs) {
      if (j.status === 'cancelled' || j.status === 'expired') continue
      if (j.status === 'settled') { b.paid.push(j); continue }
      if (!j.paid_at) { b.pending.push(j); continue }
      const eventOver = j.event_date
        ? now > new Date(`${j.event_date}T00:00:00`).getTime() + DAY
        : false
      if (j.delivered_at && eventOver) b.ready.push(j)
      else b.held.push(j)
    }
    return b
  }, [jobs])

  const sum = list => list.reduce((n, j) => n + (j.partner_amount_paise ?? 0), 0)

  const cards = [
    {
      id: 'ready', icon: Banknote, tone: 'forest',
      label: 'Ready to be paid out', value: sum(buckets.ready), n: buckets.ready.length,
      scan: 'Delivered, and past the 24-hour window.',
    },
    {
      id: 'held', icon: ShieldCheck, tone: 'saffron',
      label: 'Held for you', value: sum(buckets.held), n: buckets.held.length,
      scan: 'The customer has paid. Yours once the job is done.',
    },
    {
      id: 'pending', icon: Clock, tone: 'ink',
      label: 'Not yours yet', value: sum(buckets.pending), n: buckets.pending.length,
      scan: 'Accepted, but the customer has not paid.',
    },
    {
      id: 'paid', icon: Wallet, tone: 'ink',
      label: 'Paid out', value: sum(buckets.paid), n: buckets.paid.length,
      scan: 'Already sent to your account.',
    },
  ]

  const TONE = {
    forest:  'bg-forest-50 text-forest-700 ring-forest-200',
    saffron: 'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
    ink:     'bg-ink/[0.03] text-ink-mute ring-ink/[0.07]',
  }

  if (!loaded) {
    return <div className="card p-5 text-[13px] text-ink-mute">Working out your earnings…</div>
  }

  const nothingYet = jobs.length === 0

  return (
    <div className="space-y-3.5">
      {/* ── The one that needs an answer ──────────────────────────────
          A partner with money ready and nowhere to send it is the worst
          state this screen can show, so it is the first thing on it. */}
      {!payout && (
        <button
          type="button"
          onClick={onAddPayout}
          className="flex w-full items-center gap-3 rounded-[22px] bg-saffron-400/15 p-4 text-left ring-1 ring-saffron-300/70"
        >
          <TriangleAlert size={19} className="shrink-0 text-saffron-800" />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-extrabold text-ink">
              We cannot pay you yet
            </span>
            <span className="block text-[12.5px] leading-snug text-ink-soft">
              Add where your money should go. It takes a minute.
            </span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-saffron-800" />
        </button>
      )}

      {payout && !payout.verified_at && (
        <p className="rounded-[18px] bg-ink/[0.03] px-4 py-3 text-[12.5px] font-semibold text-ink-soft">
          We are checking your payout details. Jobs carry on as normal meanwhile.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <div key={c.id} className={`rounded-[20px] p-3.5 ring-1 ${TONE[c.tone]}`}>
              <Icon size={17} />
              <p className="mt-2 font-serif text-[21px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
                {formatINR(Math.round(c.value / 100))}
              </p>
              <p className="mt-1.5 text-[12px] font-extrabold leading-snug text-ink">{c.label}</p>
              <p className="mt-0.5 text-[11.5px] font-semibold leading-snug opacity-80">
                {c.n === 0 ? c.scan : `${c.n} job${c.n === 1 ? '' : 's'} · ${c.scan}`}
              </p>
            </div>
          )
        })}
      </div>

      {nothingYet && (
        <p className="rounded-[20px] bg-ink/[0.02] p-5 text-center text-[13px] leading-relaxed text-ink-mute">
          No earnings yet. Keep your list and your calendar current — that is
          what decides how often you are matched.
        </p>
      )}

      {/* ── Where it goes ─────────────────────────────────────────── */}
      {payout && (
        <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <p className="text-[12px] font-extrabold uppercase tracking-wider text-ink-mute">
            Paid into
          </p>
          <p className="mt-1 text-[14px] font-extrabold text-ink">
            {payout.method === 'upi'
              ? payout.upi_id
              : `Account ending ${String(payout.account_number ?? '').slice(-4)}`}
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-ink-mute">
            {payout.verified_at ? 'Verified' : 'Being checked'}
          </p>
        </div>
      )}

      {/* ── Job by job, so a number can be traced ─────────────────── */}
      {jobs.length > 0 && (
        <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
          {/* Named "your work", not "every job". This list IS the work
              history a partner goes looking for, and the bar no longer
              has a tab called My work pointing somewhere else. */}
          <p className="text-[12px] font-extrabold uppercase tracking-wider text-ink-mute">
            Your work
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-ink-mute">
            Every job you have taken, and what it paid.
          </p>
          <ul className="mt-2 divide-y divide-ink/[0.06]">
            {jobs.slice(0, 25).map(j => {
              const where =
                j.status === 'settled' ? 'Paid out'
                : !j.paid_at ? 'Not paid yet'
                : j.delivered_at ? 'Delivered'
                : 'Held for you'
              return (
                <li key={j.line_id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-extrabold text-ink">
                      {j.service_name}
                    </span>
                    <span className="block text-[11.5px] font-semibold text-ink-mute">
                      {j.event_date
                        ? new Date(`${j.event_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '—'}
                      {j.area_label ? ` · ${j.area_label}` : ''} · {where}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13.5px] font-extrabold tabular-nums text-ink">
                    {formatINR(Math.round((j.partner_amount_paise ?? 0) / 100))}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
