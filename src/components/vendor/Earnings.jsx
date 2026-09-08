import { useCallback, useEffect, useMemo, useState } from 'react'
import { Wallet, Clock, ShieldCheck, Banknote, TriangleAlert, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLivePoll } from '../../hooks/useLivePoll'
import { formatINR } from '../../utils/format'
import { partnerEarnings } from '../../lib/instantPricing'
import ClaimPayment from './ClaimPayment'

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
  const [claims, setClaims] = useState([])
  const [loaded, setLoaded] = useState(false)

  const read = useCallback(async () => {
    if (!vendorId) return
    const [{ data: j }, { data: p }, { data: c }] = await Promise.all([
      /* quoted_amount_paise and is_funded were always on this view and
         this screen never selected either. It reconstructed "has the
         customer paid" from `paid_at`, when `is_funded` is the real fact,
         computed from an escrow HOLD. */
      supabase.from('partner_jobs')
        .select('line_id, service_name, status, partner_amount_paise, quoted_amount_paise, is_funded, paid_at, delivered_at, event_date, occasion_name, area_label')
        .order('event_date', { ascending: false }),
      supabase.from('vendor_payout_details')
        .select('method, upi_id, account_number, verified_at').eq('vendor_id', vendorId).maybeSingle(),
      /* Claims exist and nothing has ever read them, so a job stayed
         "ready to claim" after the partner had claimed it. */
      supabase.from('payout_claims')
        .select('line_id, status, requested_at').eq('vendor_id', vendorId),
    ])
    setJobs(j ?? [])
    setPayout(p ?? null)
    setClaims(c ?? [])
    setLoaded(true)
  }, [vendorId])

  useEffect(() => { read() }, [read])
  useLivePoll(read, 20_000, [read])

  /* line_id -> claim. A claim is the partner having asked; `paid` is us
     having sent it. */
  const claimBy = useMemo(
    () => Object.fromEntries((claims ?? []).map(c => [c.line_id, c])), [claims])

  const buckets = useMemo(() => {
    const now = Date.now()
    const b = { pending: [], held: [], ready: [], asked: [], paid: [] }
    for (const j of jobs) {
      if (j.status === 'cancelled' || j.status === 'expired') continue

      const claim = claimBy[j.line_id]
      /* `status === 'settled'` was the only test for paid, and nothing in
         this codebase ever writes that value — so the Paid tile was
         structurally always zero. A settled CLAIM is the thing that
         actually happens. */
      if (claim?.status === 'paid' || j.status === 'settled') { b.paid.push(j); continue }
      if (claim?.status === 'requested') { b.asked.push(j); continue }

      /* is_funded comes from an escrow HOLD. `paid_at` was a proxy for it
         and this view has carried the real thing all along. */
      if (!j.is_funded && !j.paid_at) { b.pending.push(j); continue }

      const eventOver = j.event_date
        ? now > new Date(`${j.event_date}T00:00:00`).getTime() + DAY
        : false
      if (j.delivered_at && eventOver) b.ready.push(j)
      else b.held.push(j)
    }
    return b
  }, [jobs, claimBy])

  /* ══════════════════════════════════════════════════════════════
     THE SAME NUMBER THE OFFER PROMISED
     ══════════════════════════════════════════════════════════════

     This screen printed `partner_amount_paise` — the job value less the
     platform fee. The offer card prints `partnerEarnings().netPaise`,
     which is that MINUS TCS and TDS, because net is what reaches the
     account and it is what a master accepts on.

     So one job read ₹10,540 here and ₹10,416 there, and the smaller one
     was what arrived. instantPricing.js:400 names this exact mistake —
     "a master shown ₹10,540 who receives ₹10,416 will conclude they were
     short-changed, and they will be right to ask" — and this screen was
     making it.

     Net everywhere, computed from `quoted_amount_paise` the same way the
     offer computes it, so the two cannot drift. */
  const net = j => (j.quoted_amount_paise
    ? partnerEarnings(j.quoted_amount_paise).netPaise
    /* An older row without a quote falls back to what it has. Shown
       rather than dropped: a job missing from a total is worse than one
       whose deductions we cannot itemise. */
    : (j.partner_amount_paise ?? 0))

  const sum = list => list.reduce((n, j) => n + net(j), 0)

  /* ══════════════════════════════════════════════════════════════
     ONE TOTAL, THEN THE STAGES IN THE ORDER SOMEBODY ASKS THEM
     ══════════════════════════════════════════════════════════════

     Four tiles in a 2x2 grid, deliberately never summed, answered
     "where is each part of my money" and never answered "how much have I
     made" — which is the question. A new partner met four ₹0 tiles with
     abstract sentences under them.

     So: the total first, in one number, and then the stages as rows a
     person reads top to bottom in the order the money actually moves.
     Rows rather than a grid because they are a sequence, not four
     categories, and a sequence read left-to-right-then-down is a
     sequence nobody can see. */
  const stages = [
    {
      id: 'pending', icon: Clock, tone: 'ink',
      label: 'Waiting on the customer',
      value: sum(buckets.pending), n: buckets.pending.length,
      scan: 'You have the job. The customer has not paid yet.',
    },
    {
      id: 'held', icon: ShieldCheck, tone: 'saffron',
      label: 'Paid, and held for you',
      value: sum(buckets.held), n: buckets.held.length,
      scan: 'The money exists. It is yours once the job is done.',
    },
    {
      id: 'ready', icon: Banknote, tone: 'forest',
      label: 'Ready to claim',
      value: sum(buckets.ready), n: buckets.ready.length,
      scan: 'Done and cleared. Ask for it whenever you like.',
    },
    {
      id: 'asked', icon: Clock, tone: 'saffron',
      label: 'You have asked for it',
      value: sum(buckets.asked), n: buckets.asked.length,
      scan: 'We are sending it. Usually two working days.',
    },
    {
      id: 'paid', icon: Wallet, tone: 'ink',
      label: 'In your account',
      value: sum(buckets.paid), n: buckets.paid.length,
      scan: 'Already sent.',
    },
  ]

  /* Everything that is or will be theirs. Not "paid out" alone, which
     reads as though the rest might never arrive, and not everything
     including cancelled work either. */
  const earnedPaise = sum(buckets.held) + sum(buckets.ready)
    + sum(buckets.asked) + sum(buckets.paid)

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

      {/* ── Asking for it happens HERE ────────────────────────────
          "Ready to claim" said money was ready and offered no way to ask
          for it: the button lived on the job card, on the Jobs tab,
          behind a disclosure. A partner reading a screen that says money
          is theirs should be able to ask for it on that screen. */}
      {buckets.ready.length > 0 && (
        <div className="rounded-[22px] bg-forest-50 p-4 ring-1 ring-forest-200">
          <p className="text-[13.5px] font-extrabold leading-tight text-forest-900">
            {buckets.ready.length === 1
              ? 'One job is ready to be paid out'
              : `${buckets.ready.length} jobs are ready to be paid out`}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-forest-800">
            {formatINR(Math.round(sum(buckets.ready) / 100))} in total. Ask for
            it whenever you like — it does not expire.
          </p>
          <div className="mt-2.5 space-y-2">
            {buckets.ready.map(j => (
              <div key={j.line_id} className="rounded-2xl bg-white p-2.5 ring-1 ring-forest-200/70">
                <p className="mb-1.5 truncate text-[12.5px] font-extrabold text-ink">
                  {j.service_name}
                  <span className="ml-1.5 font-serif text-[13px] tabular-nums text-ink-soft">
                    {formatINR(Math.round(net(j) / 100))}
                  </span>
                </p>
                <ClaimPayment lineId={j.line_id} onClaimed={read} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── What you have earned ─────────────────────────────────
          One number, because "how much have I made" is the question this
          screen exists to answer and four un-summed tiles never did. */}
      <div className="overflow-hidden rounded-[22px] bg-plum-950 p-4 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/70">
          Yours, all in
        </p>
        <p className="mt-1 font-serif text-[32px] font-extrabold leading-none tracking-tight tabular-nums">
          {formatINR(Math.round(earnedPaise / 100))}
        </p>
        <p className="mt-1.5 text-[12px] font-semibold leading-snug text-white/75">
          {jobs.length === 0
            ? 'Nothing yet. It starts with your first accepted job.'
            : 'After the platform fee and the tax deposited for you — the '
              + 'same figure the offer showed you when you accepted.'}
        </p>
      </div>

      <div className="space-y-2">
        {stages.filter(c => c.n > 0 || c.id === 'ready').map(c => {
          const Icon = c.icon
          return (
            <div key={c.id} className={`flex items-center gap-3 rounded-[20px] p-3.5 ring-1 ${TONE[c.tone]}`}>
              <Icon size={17} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold leading-snug text-ink">{c.label}</p>
                <p className="mt-0.5 text-[11.5px] font-semibold leading-snug opacity-80">
                  {c.n === 0 ? c.scan : `${c.n} job${c.n === 1 ? '' : 's'} · ${c.scan}`}
                </p>
              </div>
              <p className="shrink-0 font-serif text-[19px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
                {formatINR(Math.round(c.value / 100))}
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
              /* ── The same words as the rows above ────────────────
                 The stages said "Ready to be paid out" and this line
                 said "Delivered" for the same job, so a partner could
                 not trace a figure back to the work in it. One
                 vocabulary, derived from the same buckets rather than
                 re-tested here — two ladders drift. */
              const where =
                buckets.paid.includes(j) ? 'In your account'
                : buckets.asked.includes(j) ? 'You have asked for it'
                : buckets.ready.includes(j) ? 'Ready to claim'
                : buckets.held.includes(j) ? 'Paid, held for you'
                : 'Waiting on the customer'
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
