/**
 * What each partner is owed, and the adjustments on their account.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NINE OPERATOR RPCs EXISTED HERE WITH NO SCREEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * `claim_all_ready`, `open_payout_batch`, `settle_payout_batch`,
 * `fail_payout_batch`, `settle_payout_claim`, `reject_payout_claim`,
 * `fail_payout_claim`, `add_partner_adjustment`,
 * `reverse_partner_adjustment` — all built, all gated on
 * `caller_is_operator()`, none reachable from the console. Paying a
 * partner meant opening the Supabase dashboard.
 *
 * This screen exposes the two that are safe to drive from a UI and
 * shows the state of the rest. Settling a batch is deliberately NOT a
 * button here: it asserts money actually left a bank account, and a
 * button that is one mis-click from claiming that is the wrong shape.
 * It belongs with whoever is looking at the bank statement.
 *
 * ── Adjustments are the thing a founder actually needs ──────────────
 * A bonus, a penalty, a reimbursement, a recovery. Each is append-only
 * (140), each needs a reason longer than three characters, and the sign
 * is enforced server-side — a penalty cannot be positive however the
 * form is filled in. The screen states the rule rather than discovering
 * it through an error.
 *
 * ── Reversal, not deletion ──────────────────────────────────────────
 * `reverse_partner_adjustment` writes an opposite row and refuses if the
 * original was already carried by a payout. That refusal is correct and
 * is surfaced verbatim rather than being softened.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Loader2, Search, RefreshCw, Plus, Undo2, X, AlertCircle, Banknote,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { EmptyNote, SectionHead, StatTile } from './viz/Primitives'

const money = paise => `₹${Math.round((Number(paise) || 0) / 100).toLocaleString('en-IN')}`
const when = iso => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

/* Sign is enforced in add_partner_adjustment (140:159-166). Stating it
   here means the form cannot be filled in a way the server will reject. */
const KINDS = [
  { id: 'bonus', label: 'Bonus', sign: +1, help: 'A payment on top, for something done well.' },
  { id: 'incentive', label: 'Incentive', sign: +1, help: 'A campaign or scheme payment.' },
  { id: 'reimbursement', label: 'Reimbursement', sign: +1, help: 'Money they spent that we are paying back.' },
  { id: 'penalty', label: 'Penalty', sign: -1, help: 'A deduction for a breach. Comes off the next payout.' },
  { id: 'recovery', label: 'Recovery', sign: -1, help: 'Taking back money already paid out.' },
]
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]))

const CLAIM_LOOK = {
  requested: ['Waiting', 'bg-saffron-50 text-saffron-800 ring-saffron-200'],
  paid: ['Paid', 'bg-forest-50 text-forest-700 ring-forest-200'],
  failed: ['Failed', 'bg-chilli-50 text-chilli-700 ring-chilli-200'],
  rejected: ['Rejected', 'bg-ink/[0.05] text-ink/55 ring-ink/10'],
}

function isMissing(error) {
  return error?.code === '42P01' || /does not exist/i.test(error?.message ?? '')
}

export default function MoneyConsole() {
  const [tab, setTab] = useState('adjustments')
  const [adjustments, setAdjustments] = useState(undefined)
  const [claims, setClaims] = useState([])
  const [missing, setMissing] = useState(false)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const [a, c] = await Promise.all([
      supabase.from('partner_adjustments')
        .select('*, vendors(business_name, city)')
        .order('created_at', { ascending: false }).limit(400),
      supabase.from('payout_claims')
        .select('*, vendors(business_name)')
        .order('requested_at', { ascending: false }).limit(200),
    ])
    if (a.error && isMissing(a.error)) { setMissing(true); setAdjustments([]); return }
    setAdjustments(a.data ?? [])
    setClaims(c.error ? [] : (c.data ?? []))
  }, [])

  useEffect(() => { load() }, [load])

  const totals = useMemo(() => {
    const a = adjustments ?? []
    const plus = a.filter(x => x.amount_paise > 0).reduce((n, x) => n + Number(x.amount_paise), 0)
    const minus = a.filter(x => x.amount_paise < 0).reduce((n, x) => n + Number(x.amount_paise), 0)
    return {
      plus, minus, net: plus + minus,
      waiting: claims.filter(c => c.status === 'requested').length,
    }
  }, [adjustments, claims])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    const rows = tab === 'adjustments' ? (adjustments ?? []) : claims
    if (!t) return rows
    return rows.filter(r =>
      (r.vendors?.business_name ?? '').toLowerCase().includes(t)
      || (r.reason ?? '').toLowerCase().includes(t)
      || (r.kind ?? '').toLowerCase().includes(t))
  }, [tab, adjustments, claims, q])

  if (adjustments === undefined) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-plum-600" /></div>
  }
  if (missing) {
    return <EmptyNote icon="🏦">
      The money tables are not in this database. They arrive with
      <code className="mx-1 rounded bg-ink/[0.06] px-1.5 py-0.5 text-[12px]">137</code>–
      <code className="mx-1 rounded bg-ink/[0.06] px-1.5 py-0.5 text-[12px]">141</code>.
    </EmptyNote>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Credited to partners" value={money(totals.plus)} sub="bonus, incentive, reimbursement" />
        <StatTile label="Deducted" value={money(Math.abs(totals.minus))} sub="penalty, recovery" />
        <StatTile label="Net on accounts" value={money(totals.net)} sub="before any payout" />
        <StatTile label="Payout claims waiting" value={totals.waiting} sub="partners asking to be paid" />
      </div>

      <SectionHead title="Accounts" sub="Every adjustment is append-only. A mistake is corrected with an opposite row, never deleted.">
        <div className="flex items-center gap-1.5">
          {[['adjustments', 'Adjustments'], ['claims', 'Payout claims']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold transition ${
                tab === k ? 'bg-plum-700 text-white' : 'bg-ink/[0.04] text-ink/60 hover:bg-ink/[0.07]'}`}>
              {l}
            </button>
          ))}
          <button type="button" onClick={() => setAdding(true)}
            className="ml-1 flex items-center gap-1.5 rounded-full bg-plum-700 px-3 py-1.5 text-[12px] font-extrabold text-white">
            <Plus size={13} /> Adjustment
          </button>
          <button type="button" onClick={load} aria-label="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.04] text-ink/60">
            <RefreshCw size={14} />
          </button>
        </div>
      </SectionHead>

      <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 ring-1 ring-ink/[0.08]">
        <Search size={15} className="shrink-0 text-ink/40" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Partner, reason or kind"
          className="w-full bg-transparent text-[13.5px] font-semibold text-ink outline-none placeholder:text-ink/35" />
      </div>

      {!shown.length ? (
        <EmptyNote icon="📭">Nothing here yet.</EmptyNote>
      ) : tab === 'adjustments' ? (
        <AdjustmentTable rows={shown} onChanged={load} />
      ) : (
        <ClaimTable rows={shown} />
      )}

      {adding && <AddAdjustment onClose={() => setAdding(false)} onDone={() => { setAdding(false); load() }} />}
    </div>
  )
}

function AdjustmentTable({ rows, onChanged }) {
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)

  const reverse = async row => {
    const why = window.prompt(`Reverse ${money(row.amount_paise)} for ${row.vendors?.business_name ?? 'this partner'}?\n\nWhy?`)
    if (!why || why.trim().length < 4) return
    setBusy(row.id); setErr(null)
    const { data, error } = await supabase.rpc('reverse_partner_adjustment', {
      p_id: row.id, p_reason: why.trim(),
    })
    setBusy(null)
    /* 140 returns { ok:false, reason } rather than raising when the row
       was already carried by a payout. Surfaced as-is: "already_paid"
       means a recovery is the correct instrument, not a reversal. */
    if (error) { setErr(error.message); return }
    if (data && data.ok === false) { setErr(data.reason ?? 'Could not reverse it'); return }
    onChanged()
  }

  return (
    <>
      {err && (
        <p className="flex items-start gap-1.5 rounded-[14px] bg-chilli-50 px-3.5 py-2.5 text-[12.5px] font-bold text-chilli-800 ring-1 ring-chilli-200">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />{err}
        </p>
      )}
      <div className="overflow-hidden rounded-[18px] bg-white ring-1 ring-ink/[0.07]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.06] bg-ink/[0.015]">
              {['Partner', 'Kind', 'Amount', 'Why', 'When', ''].map((h, i) => (
                <th key={h || i} className={`px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/45 ${i === 2 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-ink/[0.04] last:border-0 hover:bg-plum-50/40">
                <td className="px-3 py-2.5">
                  <p className="font-bold text-ink">{r.vendors?.business_name ?? '—'}</p>
                  <p className="text-[11.5px] text-ink/45">{r.vendors?.city ?? ''}</p>
                </td>
                <td className="px-3 py-2.5 text-[13px] font-semibold text-ink/70">
                  {KIND_BY_ID[r.kind]?.label ?? r.kind}
                  {r.reverses_id && <span className="ml-1 text-[11px] text-ink/40">· reversal</span>}
                </td>
                <td className={`px-3 py-2.5 text-right tabular-nums font-extrabold ${
                  r.amount_paise < 0 ? 'text-chilli-700' : 'text-forest-700'}`}>
                  {r.amount_paise < 0 ? '−' : '+'}{money(Math.abs(r.amount_paise))}
                </td>
                <td className="max-w-[280px] px-3 py-2.5 text-[12.5px] text-ink/60"><span className="line-clamp-2">{r.reason}</span></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-ink/45">{when(r.created_at)}</td>
                <td className="px-3 py-2.5 text-right">
                  {!r.reverses_id && (
                    <button type="button" disabled={busy === r.id} onClick={() => reverse(r)}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-extrabold text-ink/55 ring-1 ring-ink/10 hover:text-chilli-700 disabled:opacity-50">
                      {busy === r.id ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />} Reverse
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ClaimTable({ rows }) {
  return (
    <>
      <p className="flex items-start gap-1.5 rounded-[14px] bg-ink/[0.03] px-3.5 py-2.5 text-[12.5px] font-semibold text-ink/65 ring-1 ring-ink/[0.07]">
        <Banknote size={14} className="mt-0.5 shrink-0" />
        Settling a claim asserts money left a bank account, so it is not a button here. Do it where
        the bank statement is, and this will reflect it.
      </p>
      <div className="overflow-hidden rounded-[18px] bg-white ring-1 ring-ink/[0.07]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.06] bg-ink/[0.015]">
              {['Partner', 'Amount', 'State', 'To', 'Asked', 'Paid'].map((h, i) => (
                <th key={h} className={`px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/45 ${i === 1 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const [label, look] = CLAIM_LOOK[r.status] ?? [r.status, 'bg-ink/[0.05] text-ink/55 ring-ink/10']
              return (
                <tr key={r.id} className="border-b border-ink/[0.04] last:border-0">
                  <td className="px-3 py-2.5 font-bold text-ink">{r.vendors?.business_name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink/80">{money(r.amount_paise)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${look}`}>{label}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-ink/55">{r.destination ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-ink/45">{when(r.requested_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-ink/45">{when(r.settled_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function AddAdjustment({ onClose, onDone }) {
  const [vendors, setVendors] = useState([])
  const [vendorId, setVendorId] = useState('')
  const [kind, setKind] = useState('bonus')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    supabase.from('vendors').select('id, business_name, city')
      .eq('is_synthetic', false).order('business_name').limit(500)
      .then(({ data }) => setVendors(data ?? []))
  }, [])

  const k = KIND_BY_ID[kind]
  const magnitude = Math.round((Number(String(amount).replace(/[^\d.]/g, '')) || 0) * 100)
  const paise = magnitude * k.sign

  const save = async () => {
    if (!vendorId) return setErr('Pick a partner')
    if (magnitude <= 0) return setErr('Enter an amount')
    if (reason.trim().length < 4) return setErr('Say why — it goes on their statement')
    setBusy(true); setErr(null)
    const { data, error } = await supabase.rpc('add_partner_adjustment', {
      p_vendor_id: vendorId, p_kind: kind, p_amount_paise: paise, p_reason: reason.trim(), p_line_id: null,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    if (data && data.ok === false) return setErr(data.says ?? data.reason ?? 'Refused')
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Add an adjustment"
        className="relative w-full max-w-[460px] rounded-t-[24px] bg-white p-5 shadow-2xl sm:rounded-[24px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[17px] font-extrabold text-ink">Adjust an account</p>
            <p className="text-[12.5px] text-ink/55">This appears on the partner&rsquo;s earnings screen.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 hover:bg-ink/[0.05]"><X size={18} /></button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Partner</p>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)}
              className="h-11 w-full rounded-xl bg-[#f7f6fb] px-3 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] outline-none focus:ring-2 focus:ring-plum-500">
              <option value="">Choose…</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name ?? v.id.slice(0, 8)}{v.city ? ` · ${v.city}` : ''}</option>)}
            </select>
          </div>

          <div>
            <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Kind</p>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map(x => (
                <button key={x.id} type="button" onClick={() => setKind(x.id)}
                  className={`rounded-full px-3 py-1.5 text-[12.5px] font-extrabold transition ${
                    kind === x.id ? 'bg-plum-700 text-white' : 'bg-ink/[0.04] text-ink/60'}`}>
                  {x.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-ink/50">{k.help}</p>
          </div>

          <div>
            <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Amount</p>
            <div className="flex items-center gap-2">
              <span className={`text-[17px] font-extrabold ${k.sign < 0 ? 'text-chilli-700' : 'text-forest-700'}`}>
                {k.sign < 0 ? '−₹' : '+₹'}
              </span>
              <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric"
                className="h-11 w-full rounded-xl bg-[#f7f6fb] px-3 text-[16px] font-extrabold text-ink ring-1 ring-ink/[0.08] outline-none focus:ring-2 focus:ring-plum-500" />
            </div>
            <p className="mt-1 text-[12px] text-ink/45">
              {k.sign < 0 ? 'Comes off what they are owed.' : 'Added to what they are owed.'}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Why</p>
            <input value={reason} onChange={e => setReason(e.target.value)} maxLength={160}
              placeholder="They read this. Be specific."
              className="h-11 w-full rounded-xl bg-[#f7f6fb] px-3 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] outline-none focus:ring-2 focus:ring-plum-500" />
          </div>

          {err && <p className="text-[12.5px] font-bold text-chilli-700">{err}</p>}

          <button type="button" onClick={save} disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" />}
            {magnitude > 0 ? `${k.sign < 0 ? 'Deduct' : 'Credit'} ${money(magnitude)}` : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
