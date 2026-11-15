/**
 * Your planners (Mode B, migration 210) — every planner the brief went to,
 * live: asked → on it → proposal → accepted, or declined.
 *
 * Two rules from the brief, kept visibly: an acknowledgement is never shown
 * as a proposal; and a proposal's planner fee is never mixed with what
 * vendors will cost, nor an estimate shown as a confirmed price. A vendor a
 * planner brings themselves is labelled theirs — never Sambramo-verified.
 * Accepting goes through api/accept-custom-quote like any quote (the other
 * planners' requests close); paying the fee makes them the event's planner.
 */
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Check, Clock3, Loader2, MessageCircle, X } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { usePlan } from '../state/PlanContext'
import { ensureEvent } from '../lib/eventSpine'
import { briefFor, proposalsFor, engagementFor } from '../lib/planner'
import { acceptQuote } from '../lib/bookings'
import { rupees, timeLabel } from '../lib/format'
import { supabase } from '../../lib/supabase'
import { ActionBar, BackHeader } from '../ui/kit'
import { useAuth } from '../../context/AuthContext'

const STATUS = {
  asked: ['Asked', 'bg-[#F4F1F8] text-[var(--ink-3)]'], acknowledged: ['On it', 'bg-[#EAF2FF] text-[#1D4ED8]'],
  proposal: ['Proposal in', 'bg-[#EAF8EF] text-[#0B5B30]'], accepted: ['Accepted', 'bg-[#1C1033] text-white'], declined: ['Declined', 'bg-[#FFF1F0] text-[#B42318]'],
}
const SOURCE = { sambramo_partner: 'Sambramo partner', planner_sourced: 'Their own vendor', planner_fee: 'Planning fee' }
const hhmm = iso => (iso ? timeLabel(new Date(iso).toTimeString().slice(0, 5)) : null)

function Proposal({ x, onAccept, busy }) {
  const r = x.response, p = r?.proposal ?? {}
  const [q, setQ] = useState(''), [sent, setSent] = useState(false)
  const ask = async () => {
    if (!q.trim()) return
    const { error } = await supabase.from('sambramo_quote_messages').insert({ quote_request_id: x.request.id, sender_role: 'customer', kind: 'clarification', body: q.trim() })
    if (!error) { setQ(''); setSent(true) }
  }
  const [label, cls] = STATUS[x.status]
  return (
    <article className="rounded-[20px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE8F6]" data-planner={x.request.id} data-status={x.status}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[15px] font-black tracking-[-0.02em]">{x.request.service_name}</p>
        <span className={'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ' + cls}>{label}</span>
      </div>
      {x.status === 'acknowledged' && <p className="mt-1 text-[12px] font-semibold text-[var(--ink-3)]">They’re preparing your proposal.</p>}
      {r && (
        <div className="mt-2 space-y-2 text-[12.5px]">
          {r.customer_amount_paise ? <p className="cx-num text-[18px] font-black">{rupees(r.customer_amount_paise)} <span className="text-[11.5px] font-bold text-[var(--ink-3)]">planning fee</span></p> : null}
          {p.approach && <p className="font-semibold text-[var(--ink-2)]">{p.approach}</p>}
          {(r.inclusions ?? []).length > 0 && <ul className="space-y-0.5">{r.inclusions.map(s => <li key={s} className="flex gap-1.5 font-semibold"><Check size={14} className="mt-0.5 shrink-0 text-[#0C831F]" />{s}</li>)}</ul>}
          {(r.exclusions ?? []).length > 0 && <ul className="space-y-0.5">{r.exclusions.map(s => <li key={s} className="flex gap-1.5 font-semibold text-[var(--ink-3)]"><X size={14} className="mt-0.5 shrink-0" />{s}</li>)}</ul>}
          {x.vendors.length > 0 && (
            <div className="rounded-[12px] bg-[#FAF8FD] p-2.5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--ink-3)]">What vendors will cost</p>
              {x.vendors.map((l, i) => (
                <p key={i} className="mt-1 flex justify-between gap-2 font-semibold">
                  <span>{l.description}{l.source && <span className="text-[var(--ink-3)]"> · {SOURCE[l.source] ?? l.source}</span>}</span>
                  <span className="shrink-0">{l.unit_take_home_paise ? <span className="cx-num font-extrabold">{l.is_estimate ? '≈ ' : ''}{rupees(l.unit_take_home_paise * (Number(l.quantity) || 1))}</span> : null}
                    {l.is_estimate && <span className="ml-1 rounded-full bg-[#FFF6E0] px-2 text-[10.5px] font-extrabold text-[#8A5300]">estimate</span>}</span>
                </p>
              ))}
            </div>
          )}
          {(p.timeline ?? []).length > 0 && <p className="font-semibold text-[var(--ink-2)]">Timeline: {p.timeline.map(t => `${t.when} — ${t.what}`).join(' · ')}</p>}
          {(p.payment_schedule ?? []).length > 0 && <p className="font-semibold text-[var(--ink-2)]">Paid: {p.payment_schedule.map(t => `${t.pct}% ${t.when}`).join(', ')}</p>}
          {r.quote_valid_until && <p className="flex items-center gap-1 font-bold text-[var(--ink-3)]"><Clock3 size={12} />Valid until {new Date(r.quote_valid_until).toLocaleDateString('en-IN')}</p>}
        </div>
      )}
      {['acknowledged', 'proposal'].includes(x.status) && (
        <div className="mt-2.5 flex gap-1.5">
          <input value={q} onChange={e => { setQ(e.target.value.slice(0, 1000)); setSent(false) }} placeholder={sent ? 'Sent — they’ll reply here' : 'Ask a question'}
            className="h-10 min-w-0 flex-1 rounded-full bg-[#FAF8FD] px-3.5 text-[13px] font-semibold shadow-[inset_0_0_0_1px_#EEE9F5] outline-none" data-ask />
          <button type="button" onClick={ask} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F4EEFF] text-[var(--brand)]" aria-label="Send question"><MessageCircle size={16} /></button>
          {x.status === 'proposal' && <button type="button" disabled={busy} onClick={() => onAccept(x)} className="cx-press h-10 shrink-0 rounded-full bg-[var(--brand)] px-4 text-[12.5px] font-extrabold text-white" data-accept>Choose</button>}
        </div>
      )}
    </article>
  )
}

export default function PlannerProposals() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const { user } = useAuth()
  const [state, setState] = useState({ loading: true, brief: null, list: [], engagement: null })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    if (!user || !o) return
    const ev = await ensureEvent({ userId: user.id, occasionId: o.id, context: plan.event })
    if (!ev.ok) { setState(s => ({ ...s, loading: false })); return }
    const brief = await briefFor(ev.id)
    const [list, engagement] = await Promise.all([proposalsFor(brief?.id), engagementFor(ev.id)])
    setState({ loading: false, brief, list, engagement })
  }
  /* Server timestamps decide what is late; the phone only re-reads. */
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [user?.id, o?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <Navigate to="/" replace />
  if (!user) return <Navigate to={`/o/${o.id}/planner`} replace />
  const { brief, list, engagement } = state
  const n = k => list.filter(x => x.status === k).length

  async function accept(x) {
    setBusy(true); setMsg('')
    try { await acceptQuote(x.response.id); await load(); setMsg(`${x.request.service_name} chosen — pay their planning fee to begin.`) }
    catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+110px)]" data-planner-proposals>
      <BackHeader title="Your planners" onBack={() => navigate(`/o/${o.id}/plan`)} />
      {state.loading ? <p className="mx-4 mt-4 flex items-center gap-2 text-[13px] font-bold text-[var(--ink-3)]"><Loader2 size={15} className="animate-spin" />Checking on your Planning Masters…</p> : !brief ? (
        <p className="mx-4 mt-4 text-[13px] font-bold text-[var(--ink-3)]">No brief yet. <button type="button" className="text-[var(--brand)]" onClick={() => navigate(`/o/${o.id}/planner`)}>Write one</button></p>
      ) : (
        <>
          <section className="mx-4 mt-2 rounded-[18px] bg-[#F7F3FF] p-3 text-[12.5px] font-bold text-[#3B1670]" data-planner-summary>
            Asked {list.length} · on it {n('acknowledged')} · proposals {n('proposal') + n('accepted')} · declined {n('declined')}
            {brief.proposal_due_at && !engagement && <span className="block font-semibold text-[var(--ink-3)]">Planners aim to reply by {hhmm(brief.proposal_due_at)} — a target, not a promise. Proposals appear here as they come.</span>}
          </section>
          {engagement && (
            <section className="mx-4 mt-3 rounded-[18px] bg-[#EAF8EF] p-3 text-[13px] font-extrabold text-[#0B5B30]" data-engagement={engagement.status}>
              {engagement.status === 'pending_payment' ? 'Your Planning Master is chosen — pay their planning fee to begin.' : 'Your Planning Master is working on your event.'}
            </section>
          )}
          <section className="mx-4 mt-3 space-y-2.5">{list.map(x => <Proposal key={x.request.id} x={x} onAccept={accept} busy={busy || !!engagement} />)}</section>
        </>
      )}
      <ActionBar>
        {msg && <p className="mb-2 rounded-[12px] bg-[#F4EEFF] px-3 py-1.5 text-[12px] font-bold text-[#4C1D95]" data-planner-msg>{msg}</p>}
        {engagement?.status === 'pending_payment'
          ? <button type="button" onClick={() => navigate('/plans')} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center rounded-[18px] text-[16px] font-extrabold" data-pay-planner>Pay the planning fee</button>
          : <button type="button" onClick={() => navigate(`/o/${o.id}/board`)} className="cx-press flex h-[52px] w-full items-center justify-center rounded-[18px] text-[14.5px] font-extrabold text-[var(--brand)] shadow-[inset_0_0_0_1.5px_#E3D5FA]" data-to-board>My celebration</button>}
      </ActionBar>
    </main>
  )
}
