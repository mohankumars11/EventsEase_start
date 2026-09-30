import { useCallback, useMemo, useState } from 'react'
import {
  AlertTriangle, BadgeCheck, Check, Clock, FileText, Loader2, ShieldAlert, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAsyncData } from '../../hooks/useAsyncData'
import { missingRelation } from '../../hooks/useEarnings'
import { reviewWording } from '../partner/ReviewCountdown'
import { explainRisk } from '../../lib/verification/risk'
import { compareNames, MATCH } from '../../lib/verification/matching'

/**
 * What a person sees before deciding somebody's livelihood.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ENTERED AND EXTRACTED, SIDE BY SIDE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The single most useful thing on this screen is the pair: what the
 * partner typed, and what came off the document. A queue that shows only
 * one of them makes the reviewer take somebody's word for it, and a
 * queue that shows a single merged "name" field hides the disagreement
 * entirely.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A SUSPICION IS NEVER SHOWN WITHOUT ITS ORDINARY EXPLANATION
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every risk signal is rendered with the innocent reading beside it --
 * "a household sharing one account", "a shared family handset". A queue
 * that lists only suspicions trains whoever reads it, over weeks, to
 * assume the worst of people who are almost always fine. That is how a
 * verification team becomes the reason good partners leave.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING HERE DECIDES BY ITSELF
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every action calls `decide_verification_case`, which is operator-gated
 * in SQL (145) and refuses a rejection with no reason. This component
 * cannot approve anybody on its own, and that is deliberate: the rule
 * lives where it cannot be bypassed by calling PostgREST directly.
 */

const TONE = {
  submitted: 'bg-amber-50 text-amber-800 ring-amber-200',
  verifying: 'bg-plum-50 text-plum-700 ring-plum-200',
  manual_review: 'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  requires_action: 'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  verified: 'bg-forest-50 text-forest-700 ring-forest-200',
  rejected: 'bg-ink/[0.05] text-ink-mute ring-ink/[0.10]',
  in_progress: 'bg-ink/[0.04] text-ink-mute ring-ink/[0.08]',
}

const RISK_TONE = {
  HIGH: 'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  MEDIUM: 'bg-amber-50 text-amber-800 ring-amber-200',
  LOW: 'bg-forest-50 text-forest-700 ring-forest-200',
}

function Field({ label, entered, extracted }) {
  /* Only compared when both sides exist. A missing OCR read is not a
     disagreement, and colouring it as one would send reviewers chasing
     documents that were never machine-read. */
  const verdict = entered && extracted ? compareNames(entered, extracted) : null
  const disagrees = verdict && verdict.result === MATCH.MISMATCH
  const soft = verdict && verdict.result === MATCH.PARTIAL

  return (
    <div className="grid grid-cols-[88px_1fr_1fr] items-baseline gap-2 py-1 text-[12px]">
      <span className="text-ink-mute">{label}</span>
      <span className="font-semibold text-ink">{entered || <em className="text-ink-faint">not given</em>}</span>
      <span className={
        disagrees ? 'font-extrabold text-saffron-800'
          : soft ? 'font-semibold text-amber-800'
          : 'text-ink-soft'
      }>
        {extracted || <em className="text-ink-faint">not read</em>}
      </span>
    </div>
  )
}

function CaseCard({ row, onDecide, busy }) {
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const left = row.review_due_at
    ? reviewWording({
        ms: Math.max(0, new Date(row.review_due_at) - Date.now()),
        over: new Date(row.review_due_at) < Date.now(),
        hours: Math.floor(Math.max(0, new Date(row.review_due_at) - Date.now()) / 3_600_000),
        minutes: Math.floor((Math.max(0, new Date(row.review_due_at) - Date.now()) % 3_600_000) / 60_000),
        seconds: 0,
      })
    : null

  const signals = explainRisk({ signals: row.signals ?? [] })

  return (
    <li className="rounded-[18px] bg-white p-4 ring-1 ring-ink/[0.07]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-extrabold text-ink">
            {row.business_name ?? 'Partner'}
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-mute">
            {row.trades?.join(' · ') || 'No trades yet'}
            {row.attempt_no > 1 && ` · attempt ${row.attempt_no}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {row.risk_band && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ring-1 ${RISK_TONE[row.risk_band]}`}>
              {row.risk_band} risk
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ring-1 ${TONE[row.status] ?? TONE.in_progress}`}>
            {String(row.status).replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {left && (
        <p className={`mt-1.5 flex items-center gap-1.5 text-[11.5px] font-extrabold ${
          /longer/i.test(left) ? 'text-saffron-800' : 'text-ink-soft'
        }`}>
          <Clock size={12} /> {left}
        </p>
      )}

      {/* Entered vs extracted. The pair is the point. */}
      <div className="mt-3 rounded-[14px] bg-page-sunk p-3">
        <div className="grid grid-cols-[88px_1fr_1fr] gap-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-mute">
          <span />
          <span>Entered</span>
          <span>On the document</span>
        </div>
        <Field label="Name" entered={row.entered_name} extracted={row.document_name} />
        <Field label="Business" entered={row.business_name} extracted={row.registered_name} />
        <Field label="Number" entered={row.number_last4 ? `••${row.number_last4}` : ''} extracted={row.ocr_number} />
      </div>

      {/* Documents, with what each one is still missing. */}
      {!!row.documents?.length && (
        <ul className="mt-2.5 space-y-1">
          {row.documents.map(d => (
            <li key={d.id} className="flex items-center gap-2 text-[12px]">
              <FileText size={12} className="shrink-0 text-ink-mute" />
              <span className="min-w-0 flex-1 truncate text-ink-soft">{d.requirement_id}</span>
              <span className="shrink-0 text-[10.5px] font-extrabold uppercase text-ink-mute">
                {d.provider_status && d.provider_status !== 'not_checked'
                  ? d.provider_status
                  : d.checksum_ok ? 'checks out' : 'unchecked'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Every signal with its innocent reading. */}
      {!!signals.length && (
        <div className="mt-2.5 rounded-[14px] bg-saffron-400/[0.07] p-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-saffron-800">
            <ShieldAlert size={12} /> Worth a look
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {signals.map((s, i) => (
              <li key={i} className="text-[11.5px] leading-snug">
                <span className="font-semibold text-ink">{s.label}</span>
                {s.detail && <span className="text-ink-mute"> — {s.detail}</span>}
                <span className="block text-ink-mute">Usually: {s.innocent}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open ? (
        <div className="mt-3">
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="What needs to change? The partner reads this."
            className="w-full rounded-[12px] border-0 bg-white px-3 py-2 text-[12.5px] text-ink ring-1 ring-ink/[0.10] focus:ring-2 focus:ring-plum-500"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" disabled={busy}
              onClick={() => onDecide(row.id, 'requires_action', note)}
              className="min-h-[34px] rounded-full bg-saffron-500 px-3 text-[12px] font-extrabold text-plum-950 disabled:opacity-50">
              Send back
            </button>
            <button type="button" disabled={busy}
              onClick={() => onDecide(row.id, 'rejected', note)}
              className="min-h-[34px] rounded-full bg-ink/[0.06] px-3 text-[12px] font-extrabold text-ink-soft disabled:opacity-50">
              Reject
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="min-h-[34px] rounded-full px-3 text-[12px] font-extrabold text-ink-mute">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button type="button" disabled={busy}
            onClick={() => onDecide(row.id, 'verified', note || null)}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-forest-600 px-3.5 text-[12px] font-extrabold text-white disabled:opacity-50">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
          </button>
          <button type="button" onClick={() => setOpen(true)}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-ink/[0.05] px-3.5 text-[12px] font-extrabold text-ink-soft">
            <X size={12} /> Send back or reject
          </button>
          <button type="button" disabled={busy}
            onClick={() => onDecide(row.id, 'manual_review', null)}
            className="min-h-[34px] rounded-full px-3 text-[12px] font-extrabold text-ink-mute">
            Hold
          </button>
        </div>
      )}
    </li>
  )
}

export default function VerificationQueue() {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const read = useCallback(async () => {
    const cases = await supabase
      .from('verification_cases')
      .select('*')
      .in('status', ['submitted', 'verifying', 'manual_review'])
      .order('review_due_at', { ascending: true })

    /* 144 not pasted yet. The console keeps working and says so, rather
       than showing an error an operator cannot act on. */
    if (cases.error) {
      if (missingRelation(cases.error)) return { rows: [], unavailable: true }
      throw cases.error
    }

    const ids = (cases.data ?? []).map(c => c.vendor_id)
    if (!ids.length) return { rows: [], unavailable: false }

    const [vendors, docs, signals] = await Promise.all([
      supabase.from('vendors').select('id, business_name, contact_phone').in('id', ids),
      supabase.from('vendor_documents')
        .select('id, vendor_id, requirement_id, provider_status, checksum_ok, holder_name, number_last4')
        .in('vendor_id', ids),
      supabase.from('risk_signals').select('*').in('vendor_id', ids),
    ])

    const byVendor = Object.fromEntries((vendors.data ?? []).map(v => [v.id, v]))
    const docsFor = id => (docs.data ?? []).filter(d => d.vendor_id === id)
    const signalsFor = id => (signals.data ?? []).filter(s => s.vendor_id === id)

    return {
      unavailable: false,
      rows: (cases.data ?? []).map(c => {
        const d = docsFor(c.vendor_id)
        const identity = d.find(x => x.requirement_id === 'VER-ID-IDENTITY')
        return {
          ...c,
          business_name: byVendor[c.vendor_id]?.business_name,
          entered_name: identity?.holder_name ?? null,
          document_name: null,
          registered_name: null,
          ocr_number: null,
          number_last4: identity?.number_last4 ?? null,
          documents: d,
          signals: signalsFor(c.vendor_id).map(s => ({
            key: s.signal, label: s.signal, weight: s.weight, detail: s.detail,
            innocent: '',
          })),
        }
      }),
    }
  }, [])

  const { data, loading, error: readError, retry } = useAsyncData(read, [read])

  async function decide(caseId, decision, note) {
    setBusy(caseId); setError(null)
    try {
      const { data: out, error: err } = await supabase.rpc('decide_verification_case', {
        p_case_id: caseId, p_decision: decision, p_note: note,
      })
      if (err) throw err
      if (out && out.ok === false) throw new Error(out.says ?? out.reason)
      await retry()
    } catch (e) {
      setError(e?.message ?? 'That did not go through.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <p className="p-6 text-[13px] text-ink-mute">Loading the queue…</p>
  }
  if (readError && !data) {
    return (
      <div className="p-6">
        <p className="text-[13px] text-ink">We could not load the queue.</p>
        <button onClick={retry} className="mt-2 rounded-full bg-plum-600 px-4 py-2 text-[12.5px] font-extrabold text-white">
          Try again
        </button>
      </div>
    )
  }
  if (data?.unavailable) {
    return (
      <p className="p-6 text-[13px] leading-relaxed text-ink-mute">
        The verification tables are not in this database yet. Paste migrations
        144 to 147 and this queue starts filling.
      </p>
    )
  }

  const rows = data?.rows ?? []

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="text-[18px] font-extrabold text-ink">Verification queue</h1>
        <p className="text-[12px] text-ink-mute">
          {rows.length} waiting
        </p>
      </div>

      {error && (
        <p className="mb-3 flex items-start gap-1.5 rounded-[12px] bg-saffron-400/10 px-3 py-2 text-[12px] text-saffron-800">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />{error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="flex items-center gap-2 rounded-[16px] bg-forest-50 px-4 py-4 text-[13px] font-semibold text-forest-800 ring-1 ring-forest-200">
          <BadgeCheck size={15} /> Nothing waiting. Everybody who has asked has been answered.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(r => (
            <CaseCard key={r.id} row={r} onDecide={decide} busy={busy === r.id} />
          ))}
        </ul>
      )}
    </div>
  )
}
