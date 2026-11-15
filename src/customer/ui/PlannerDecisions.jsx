/**
 * On "My celebration": what the customer's planner has proposed and is
 * waiting for their yes (owner ask_customer), and what the planner is
 * arranging (owner planner). Approving hands the service to the planner;
 * "Not now" marks it not needed (sambramo_customer_decide_requirement).
 * Renders nothing when no planner is engaged.
 */
import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { TRADE } from '../data/trades'
import { ensureEvent, requirements } from '../lib/eventSpine'
import { decideRequirement, engagementFor } from '../lib/planner'

export default function PlannerDecisions({ userId, occasionId, context }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(null)
  const load = async () => {
    if (!userId) return
    const ev = await ensureEvent({ userId, occasionId, context })
    if (!ev.ok) return
    const [eng, reqs] = await Promise.all([engagementFor(ev.id), requirements(ev.id)])
    setState({ eng, reqs })
  }
  useEffect(() => { load() }, [userId, occasionId]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!state?.eng || ['cancelled', 'completed'].includes(state.eng.status)) return null
  const waiting = state.reqs.filter(r => r.owner === 'ask_customer')
  const theirs = state.reqs.filter(r => r.owner === 'planner')
  const decide = async (r, yes) => { setBusy(r.id); await decideRequirement(r.id, yes); setBusy(null); load() }
  return (
    <section className="mx-4 mt-4 rounded-[20px] bg-[#F7F3FF] p-3.5" data-planner-decisions>
      <p className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#3B1670]"><ClipboardList size={16} />
        {state.eng.status === 'pending_payment' ? 'Pay your planner’s fee to begin' : 'Your planner'}</p>
      {waiting.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--ink-3)]">Waiting for your yes</p>
          {waiting.map(r => (
            <div key={r.id} className="flex items-center gap-2 rounded-[14px] bg-white p-2.5" data-proposed={r.requirement_code}>
              <span className="min-w-0 flex-1 text-[13px] font-extrabold">{TRADE[r.trade_id]?.label ?? r.trade_id}<span className="block text-[11px] font-semibold text-[var(--ink-3)]">{r.requirement_code}</span></span>
              <button type="button" disabled={busy === r.id} onClick={() => decide(r, false)} className="h-8 rounded-full bg-[#F4F1F8] px-3 text-[11.5px] font-extrabold text-[var(--ink-2)]">Not now</button>
              <button type="button" disabled={busy === r.id} onClick={() => decide(r, true)} className="h-8 rounded-full bg-[var(--brand)] px-3 text-[11.5px] font-extrabold text-white" data-approve>Approve</button>
            </div>
          ))}
        </div>
      )}
      {theirs.length > 0 && (
        <p className="mt-2 text-[12px] font-bold text-[var(--ink-2)]">Arranging for you: {theirs.map(r => TRADE[r.trade_id]?.label ?? r.trade_id).join(', ')}</p>
      )}
    </section>
  )
}
