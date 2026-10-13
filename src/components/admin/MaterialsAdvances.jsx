/**
 * Materials advances: fund an order, or check a bill against the goods.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE TWO DECISIONS ON THIS SCREEN BOTH MOVE REAL MONEY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Approving a request puts Sambramo's cash in a partner's hands before
 * the event. Approving a bill pays the balance. Neither is reversible by
 * closing the tab, so both say the amount back to you, both make you
 * type a reason when you change the number, and the bill cannot be
 * approved without the evidence open in front of you.
 *
 * ── Why the arithmetic is shown and not just the total ──────────────
 * `review_materials_advance` pays `approved − advanced`. A reviewer who
 * does not know ₹18,000 was already advanced will read "approve
 * ₹17,420" as "pay ₹17,420" and be wrong by the whole advance. So the
 * sum is spelled out on the button itself: what is owed, or what comes
 * back.
 *
 * ── The verdict is the server's, not this screen's ──────────────────
 * Every write is an RPC gated on `caller_is_operator()`. This screen
 * cannot grant itself anything, and a partner loading the same URL gets
 * rows RLS will not return. The buttons are a convenience over a rule
 * that holds without them.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Loader2, Receipt, Wallet, Check, X, Clock, AlertCircle, ExternalLink, RefreshCw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { signedUrlFor, signedUrlsFor } from '../../lib/materialsAdvance'
import { EmptyNote, SectionHead, StatTile } from './viz/Primitives'

const money = paise => `₹${Math.round((Number(paise) || 0) / 100).toLocaleString('en-IN')}`
const ago = iso => {
  if (!iso) return ''
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

const STATE = {
  requested: ['Wants funding', 'bg-saffron-50 text-saffron-800 ring-saffron-200'],
  advance_approved: ['Funded, buying', 'bg-plum-50 text-plum-800 ring-plum-200'],
  under_review: ['Bill to check', 'bg-saffron-50 text-saffron-800 ring-saffron-200'],
  paid: ['Settled', 'bg-forest-50 text-forest-700 ring-forest-200'],
  rejected: ['Sent back', 'bg-chilli-50 text-chilli-700 ring-chilli-200'],
  not_needed: ['Nothing needed', 'bg-ink/[0.04] text-ink/60 ring-ink/10'],
}

function Chip({ status }) {
  const [label, look] = STATE[status] ?? [status, 'bg-ink/[0.04] text-ink/60 ring-ink/10']
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${look}`}>{label}</span>
}

/** A table that does not exist yet is a feature that is off, not a crash. */
function isMissingTable(error) {
  return error?.code === '42P01' || /does not exist/i.test(error?.message ?? '')
}

export default function MaterialsAdvances() {
  const [rows, setRows] = useState(undefined)
  const [missing, setMissing] = useState(false)
  const [open, setOpen] = useState(null)
  const [filter, setFilter] = useState('waiting')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('materials_advances')
      .select('*, vendors(business_name, city), booking_lines(service_name)')
      .order('created_at', { ascending: false })
      .limit(400)
    if (error) {
      if (isMissingTable(error)) { setMissing(true); setRows([]); return }
      setRows([]); return
    }
    setRows(data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => {
    const r = rows ?? []
    return {
      requested: r.filter(x => x.status === 'requested').length,
      review: r.filter(x => x.status === 'under_review').length,
      outstanding: r.filter(x => x.status === 'advance_approved')
        .reduce((n, x) => n + (Number(x.advance_paise) || 0), 0),
      settled: r.filter(x => x.status === 'paid')
        .reduce((n, x) => n + (Number(x.approved_paise) || 0), 0),
    }
  }, [rows])

  const shown = useMemo(() => {
    const r = rows ?? []
    if (filter === 'waiting') return r.filter(x => ['requested', 'under_review'].includes(x.status))
    if (filter === 'open') return r.filter(x => x.status === 'advance_approved')
    if (filter === 'done') return r.filter(x => ['paid', 'rejected'].includes(x.status))
    return r
  }, [rows, filter])

  if (rows === undefined) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-plum-600" /></div>
  }

  if (missing) {
    return (
      <EmptyNote icon="🧾">
        Materials advances are not switched on in this database yet. Paste
        <code className="mx-1 rounded bg-ink/[0.06] px-1.5 py-0.5 text-[12px]">20261013_01_materials_advance.sql</code>
        and <code className="mx-1 rounded bg-ink/[0.06] px-1.5 py-0.5 text-[12px]">20261013_02_advance_eligibility.sql</code>,
        then reload.
      </EmptyNote>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Waiting for funding" value={counts.requested} sub="partners asking" />
        <StatTile label="Bills to check" value={counts.review} sub="with evidence attached" />
        <StatTile label="Advanced, not settled" value={money(counts.outstanding)} sub="Sambramo's cash, out" />
        <StatTile label="Settled to date" value={money(counts.settled)} sub="approved against bills" />
      </div>

      <SectionHead title="The queue" sub="Oldest first within each state. Everything here moves money.">
        <div className="flex items-center gap-1.5">
          {[['waiting', 'Needs you'], ['open', 'Buying'], ['done', 'Closed'], ['all', 'All']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold transition ${
                filter === k ? 'bg-plum-700 text-white' : 'bg-ink/[0.04] text-ink/60 hover:bg-ink/[0.07]'}`}>
              {l}
            </button>
          ))}
          <button type="button" onClick={load} aria-label="Refresh"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.04] text-ink/60">
            <RefreshCw size={14} />
          </button>
        </div>
      </SectionHead>

      {!shown.length ? (
        <EmptyNote icon="✅">
          {filter === 'waiting' ? 'Nothing is waiting on you.' : 'Nothing here.'}
        </EmptyNote>
      ) : (
        <div className="overflow-hidden rounded-[18px] bg-white ring-1 ring-ink/[0.07]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/[0.06] bg-ink/[0.015]">
                {['Partner', 'Job', 'State', 'Asked', 'Bill', 'Advanced', 'When', ''].map((h, i) => (
                  <th key={h || i} className={`px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/45 ${i > 2 && i < 7 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.id} className="border-b border-ink/[0.04] last:border-0 hover:bg-plum-50/40">
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-ink">{r.vendors?.business_name ?? '—'}</p>
                    <p className="text-[11.5px] text-ink/45">{r.vendors?.city ?? ''}</p>
                  </td>
                  <td className="px-3 py-2.5 text-ink/70">{r.booking_lines?.service_name ?? r.trade_id}</td>
                  <td className="px-3 py-2.5"><Chip status={r.status} /></td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink/70">{r.requested_paise ? money(r.requested_paise) : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink/70">{r.bill_amount_paise ? money(r.bill_amount_paise) : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink/70">{r.advance_paise ? money(r.advance_paise) : '—'}</td>
                  <td className="px-3 py-2.5 text-right text-[12px] text-ink/45">{ago(r.created_at)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button type="button" onClick={() => setOpen(r)}
                      className="rounded-full bg-plum-700 px-3 py-1.5 text-[12px] font-extrabold text-white">
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <AdvanceDrawer row={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); load() }} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   The drawer, where the money is actually decided
   ═══════════════════════════════════════════════════════════════════ */

function AdvanceDrawer({ row, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [amount, setAmount] = useState(
    String(Math.round((Number(row.requested_paise ?? row.bill_amount_paise) || 0) / 100)))
  const [note, setNote] = useState('')
  const [billUrl, setBillUrl] = useState(null)
  const [photoUrls, setPhotoUrls] = useState({})

  useEffect(() => {
    if (row.bill_path) signedUrlFor(row.bill_path).then(setBillUrl)
    const paths = (row.goods_photos ?? []).map(p => p.path)
    if (paths.length) signedUrlsFor(paths).then(setPhotoUrls)
  }, [row])

  const paise = Math.round((Number(String(amount).replace(/[^\d.]/g, '')) || 0) * 100)
  const advanced = Number(row.advance_paise) || 0
  const owed = paise - advanced

  const call = async (fn, args) => {
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc(fn, args)
    setBusy(false)
    if (error) { setErr(error.message); return }
    onDone()
  }

  const isRequest = row.status === 'requested'
  const isBill = ['under_review', 'purchased', 'goods_evidenced'].includes(row.status)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-label="Materials advance"
        className="relative flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-white shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-ink/[0.06] bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[17px] font-extrabold text-ink">{row.vendors?.business_name ?? 'Partner'}</p>
              <p className="text-[12.5px] text-ink/50">{row.trade_id} · {ago(row.created_at)}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 hover:bg-ink/[0.05]"><X size={18} /></button>
          </div>
          <div className="mt-2"><Chip status={row.status} /></div>
        </header>

        <div className="flex-1 space-y-4 px-5 py-4">
          {row.request_reason && (
            <section>
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-ink/45">What they asked for</p>
              <p className="text-[14px] font-bold text-ink">{money(row.requested_paise)}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-ink/65">{row.request_reason}</p>
            </section>
          )}

          {row.bill_path && (
            <section>
              <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/45">The bill</p>
              <div className="flex items-center gap-2.5 rounded-[14px] bg-ink/[0.02] px-3.5 py-2.5 ring-1 ring-ink/[0.06]">
                <Receipt size={16} className="shrink-0 text-ink/50" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink">{row.supplier_name}</p>
                  <p className="text-[11.5px] text-ink/50">{money(row.bill_amount_paise)}</p>
                </div>
                {billUrl && (
                  <a href={billUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 rounded-full bg-plum-700 px-3 py-1.5 text-[12px] font-extrabold text-white">
                    Open <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </section>
          )}

          {!!(row.goods_photos ?? []).length && (
            <section>
              <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/45">
                What arrived · {row.goods_location === 'at_venue' ? 'at the venue' : 'with the partner'}
              </p>
              <div className="flex flex-wrap gap-2">
                {row.goods_photos.map(p => (
                  <a key={p.path} href={photoUrls[p.path]} target="_blank" rel="noreferrer">
                    <img src={photoUrls[p.path]} alt=""
                      className="h-24 w-24 rounded-xl object-cover ring-1 ring-ink/10" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {isBill && !row.goods_photos?.length && (
            <p className="flex items-start gap-1.5 rounded-[14px] bg-saffron-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-saffron-900 ring-1 ring-saffron-200">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              No photographs of the goods. A bill alone is a PDF — send it back and ask for them.
            </p>
          )}

          {row.review_note && (
            <section>
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-ink/45">Note</p>
              <p className="text-[13px] text-ink/70">{row.review_note}</p>
            </section>
          )}

          {(isRequest || isBill) && (
            <section className="rounded-[16px] bg-plum-50/60 p-4 ring-1 ring-plum-100">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-plum-900/60">
                {isRequest ? 'Release how much?' : 'Approve how much?'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[17px] font-extrabold text-ink/60">₹</span>
                <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric"
                  className="h-11 w-full rounded-xl bg-white px-3 text-[16px] font-extrabold text-ink ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-plum-500" />
              </div>

              {isBill && advanced > 0 && (
                /* The whole reason a reviewer gets this wrong. */
                <p className="mt-2 text-[12.5px] font-semibold leading-snug text-plum-900/75">
                  {money(advanced)} was already advanced.{' '}
                  {owed > 0 ? <>Approving this pays a further <b>{money(owed)}</b>.</>
                    : owed < 0 ? <><b>{money(-owed)}</b> will be recovered from their next payout.</>
                    : <>Nothing further is owed.</>}
                </p>
              )}
              {isBill && paise > (Number(row.bill_amount_paise) || 0) && (
                <p className="mt-2 text-[12.5px] font-bold text-chilli-700">
                  That is more than the bill ({money(row.bill_amount_paise)}). The server will refuse it.
                </p>
              )}

              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder={isRequest ? 'Note (optional)' : 'Why, if you are changing the amount'}
                className="mt-3 h-11 w-full rounded-xl bg-white px-3 text-[14px] font-semibold text-ink ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-plum-500" />

              {err && <p className="mt-2 text-[12.5px] font-bold text-chilli-700">{err}</p>}

              <div className="mt-3 flex gap-2">
                {isRequest ? (
                  <button type="button" disabled={busy || paise <= 0}
                    onClick={() => call('approve_materials_advance', {
                      p_advance_id: row.id, p_paise: paise, p_note: note || null })}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-plum-700 text-[14px] font-extrabold text-white disabled:opacity-50">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Wallet size={15} />}
                    Release {money(paise)}
                  </button>
                ) : (
                  <button type="button" disabled={busy || paise <= 0}
                    onClick={() => call('review_materials_advance', {
                      p_advance_id: row.id, p_verdict: 'approve',
                      p_approved_paise: paise, p_note: note || null })}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-forest-600 text-[14px] font-extrabold text-white disabled:opacity-50">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    Approve
                  </button>
                )}
                {isBill && (
                  <button type="button" disabled={busy || note.trim().length < 4}
                    onClick={() => call('review_materials_advance', {
                      p_advance_id: row.id, p_verdict: 'reject', p_approved_paise: null, p_note: note })}
                    title={note.trim().length < 4 ? 'Say why first' : undefined}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[14px] font-extrabold text-chilli-700 ring-2 ring-chilli-200 disabled:opacity-50">
                    Send back
                  </button>
                )}
              </div>
            </section>
          )}

          {row.status === 'advance_approved' && (
            <p className="flex items-start gap-1.5 rounded-[14px] bg-plum-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-plum-900 ring-1 ring-plum-200">
              <Clock size={14} className="mt-0.5 shrink-0" />
              {money(row.advance_paise)} is with this partner. Nothing to decide until they send the bill.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
