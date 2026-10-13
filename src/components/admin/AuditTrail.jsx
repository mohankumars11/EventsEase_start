/**
 * Every movement of money, and who caused it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * READ-ONLY, DELIBERATELY
 * ══════════════════════════════════════════════════════════════════════
 *
 * `money_audit` is append-only in the database — 136 puts a BEFORE
 * UPDATE OR DELETE trigger on it — so there is nothing this screen
 * could offer to change even if it wanted to. That is the point: an
 * audit trail somebody can edit is a diary, not evidence.
 *
 * `actor_role` is read straight off the row rather than joined to the
 * profile, because 136 snapshots it on purpose: the question is what
 * somebody was allowed to do AT THE TIME, not what they are allowed to
 * do now.
 *
 * ── Why amounts are not summed here ─────────────────────────────────
 * An audit row records a movement, not a balance, and the same rupee
 * appears in several rows as it moves. A total across this table would
 * be a number with no meaning that somebody would eventually quote.
 * The money console answers "how much"; this answers "what happened".
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Search, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { EmptyNote, SectionHead } from './viz/Primitives'

const money = paise => paise == null ? '—'
  : `₹${Math.round(Number(paise) / 100).toLocaleString('en-IN')}`
const when = iso => iso
  ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : ''

/* The ten actions 136 allows, in words a founder reads rather than
   enum names. Anything outside the list renders its raw value instead
   of being silently relabelled. */
const ACTION = {
  claim_created: ['Payout claimed', 'text-ink'],
  claim_settled: ['Payout paid', 'text-forest-700'],
  claim_failed: ['Payout failed', 'text-chilli-700'],
  claim_rejected: ['Payout rejected', 'text-chilli-700'],
  batch_opened: ['Batch opened', 'text-ink'],
  batch_settled: ['Batch paid', 'text-forest-700'],
  batch_failed: ['Batch failed', 'text-chilli-700'],
  adjustment_added: ['Adjustment added', 'text-plum-700'],
  adjustment_reversed: ['Adjustment reversed', 'text-saffron-800'],
  escrow_released: ['Escrow released', 'text-forest-700'],
}

function isMissing(error) {
  return error?.code === '42P01' || /does not exist/i.test(error?.message ?? '')
}

export default function AuditTrail() {
  const [rows, setRows] = useState(undefined)
  const [missing, setMissing] = useState(false)
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('all')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('money_audit')
      .select('*, vendors(business_name), profiles:actor_id(full_name)')
      .order('at', { ascending: false })
      .limit(500)
    if (error) {
      if (isMissing(error)) { setMissing(true); setRows([]); return }
      setRows([]); return
    }
    setRows(data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    let r = rows ?? []
    if (kind === 'payouts') r = r.filter(x => x.action.startsWith('claim') || x.action.startsWith('batch'))
    if (kind === 'adjustments') r = r.filter(x => x.action.startsWith('adjustment'))
    if (kind === 'escrow') r = r.filter(x => x.action === 'escrow_released')
    const t = q.trim().toLowerCase()
    if (!t) return r
    return r.filter(x =>
      (x.vendors?.business_name ?? '').toLowerCase().includes(t)
      || (x.profiles?.full_name ?? '').toLowerCase().includes(t)
      || (x.reason ?? '').toLowerCase().includes(t)
      || x.action.includes(t))
  }, [rows, q, kind])

  if (rows === undefined) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-plum-600" /></div>
  }
  if (missing) {
    return <EmptyNote icon="🔎">
      The money audit table is not in this database. It arrives with
      <code className="mx-1 rounded bg-ink/[0.06] px-1.5 py-0.5 text-[12px]">136_every_movement_has_a_witness.sql</code>.
    </EmptyNote>
  }

  return (
    <div className="space-y-4">
      <SectionHead
        title="Money audit"
        sub="Append-only in the database. Nothing on this screen can change a row, by design.">
        <div className="flex items-center gap-1.5">
          {[['all', 'All'], ['payouts', 'Payouts'], ['adjustments', 'Adjustments'], ['escrow', 'Escrow']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold transition ${
                kind === k ? 'bg-plum-700 text-white' : 'bg-ink/[0.04] text-ink/60 hover:bg-ink/[0.07]'}`}>
              {l}
            </button>
          ))}
          <button type="button" onClick={load} aria-label="Refresh"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.04] text-ink/60">
            <RefreshCw size={14} />
          </button>
        </div>
      </SectionHead>

      <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 ring-1 ring-ink/[0.08]">
        <Search size={15} className="shrink-0 text-ink/40" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Partner, who did it, or why"
          className="w-full bg-transparent text-[13.5px] font-semibold text-ink outline-none placeholder:text-ink/35" />
      </div>

      {!shown.length ? (
        <EmptyNote icon="🗂️">Nothing recorded yet.</EmptyNote>
      ) : (
        <div className="overflow-hidden rounded-[18px] bg-white ring-1 ring-ink/[0.07]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/[0.06] bg-ink/[0.015]">
                {['When', 'What', 'Partner', 'Amount', 'Who', 'Why'].map((h, i) => (
                  <th key={h} className={`px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/45 ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map(r => {
                const [label, tone] = ACTION[r.action] ?? [r.action, 'text-ink']
                return (
                  <tr key={r.id} className="border-b border-ink/[0.04] last:border-0 hover:bg-plum-50/40">
                    <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-ink/50">{when(r.at)}</td>
                    <td className={`px-3 py-2.5 text-[13px] font-extrabold ${tone}`}>{label}</td>
                    <td className="px-3 py-2.5 text-ink/70">{r.vendors?.business_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-ink/80">{money(r.amount_paise)}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-ink/60">
                      {r.profiles?.full_name ?? (r.actor_role === 'service_role' ? 'Automation' : '—')}
                      {r.actor_role && <span className="ml-1 text-ink/35">· {r.actor_role}</span>}
                    </td>
                    <td className="max-w-[260px] px-3 py-2.5 text-[12.5px] text-ink/55">
                      <span className="line-clamp-2">{r.reason ?? ''}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink/40">
        <ShieldCheck size={13} /> Showing the most recent {shown.length} of up to 500 rows.
      </p>
    </div>
  )
}
