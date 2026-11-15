/**
 * The planner's workspace (Mode B, migration 210): every event they are
 * engaged on, its brief and its requirements — and a way to propose a
 * service on it, with the same template questions a customer answers.
 *
 * A proposal waits as "waiting for the customer" until they approve it
 * (sambramo_customer_decide_requirement): a planner adds nothing to an
 * event, and commits no money, on their own. A service the customer is
 * arranging themselves is refused by the server, so two people never
 * book the same thing. Renders nothing for a partner with no engagement.
 */
import { useEffect, useState } from 'react'
import { ClipboardList, Loader2, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TRADES, TRADE } from '../../customer/data/trades'

const OWNER = { ask_customer: 'Waiting for the customer', planner: 'Yours to arrange', customer: 'The customer arranges',
  marketplace: 'The customer is booking it', arranged: 'Already arranged', not_needed: 'Not needed' }

export default function PlannerWorkspace({ vendorId }) {
  const [list, setList] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [event, setEvent] = useState(null)
  const [trade, setTrade] = useState('')
  const [tpl, setTpl] = useState(null)
  const [config, setConfig] = useState({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('sambramo_planner_engagements').select('id, plan_id, status, scope, created_at').eq('vendor_id', vendorId)
      .in('status', ['engaged', 'planning', 'approved', 'execution']).then(({ data, error }) => setList(error ? [] : data ?? []))
  }, [vendorId])
  const loadEvent = async planId => {
    const { data, error } = await supabase.rpc('sambramo_planner_event', { p_plan_id: planId })
    setEvent(error ? null : data)
    if (error) setMsg(error.message)
  }
  useEffect(() => { if (openId) loadEvent(openId) }, [openId])
  useEffect(() => {
    setConfig({}); setTpl(null)
    if (trade) supabase.from('sambramo_requirement_templates').select('fields').eq('trade_id', trade).eq('published', true).maybeSingle()
      .then(({ data }) => setTpl((data?.fields ?? []).filter(f => ['single', 'multi', 'toggle'].includes(f.kind))))
  }, [trade])

  if (!list?.length) return null
  async function propose() {
    setBusy(true); setMsg('')
    const { data, error } = await supabase.rpc('sambramo_planner_propose_requirement', { p_plan_id: openId, p_trade_id: trade, p_config: config, p_note: note.trim() || null })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    const r = data?.[0]
    setMsg(`${r?.out_code ?? 'Proposed'} — waiting for the customer${r?.out_missing?.length ? ` (still missing: ${r.out_missing.join(', ')})` : ''}`)
    setTrade(''); setNote(''); loadEvent(openId)
  }
  const toggle = (k, v) => setConfig(c => { const cur = c[k] ?? []; return { ...c, [k]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] } })
  const pick = (f, o) => (f.kind === 'single' ? setConfig(c => ({ ...c, [f.key]: o.value })) : toggle(f.key, o.value))
  const isOn = (f, o) => (f.kind === 'single' ? config[f.key] === o.value : (config[f.key] ?? []).includes(o.value))

  return (
    <section className="space-y-2" data-planner-workspace>
      <p className="type-overline text-ink-mute">Events you are planning</p>
      {list.map(e => (
        <button key={e.id} type="button" onClick={() => setOpenId(openId === e.plan_id ? null : e.plan_id)}
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-ink/[0.06]" data-engagement={e.id}>
          <ClipboardList size={18} className="shrink-0 text-plum-700" />
          <span className="min-w-0 flex-1 text-[13px] font-extrabold text-ink">{e.scope === 'full' ? 'Complete management' : e.scope === 'plan_coordinate' ? 'Plan and coordinate' : 'Plan'} · {e.status}</span>
        </button>
      ))}
      {openId && event && (
        <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06]" data-planner-event={event.plan?.code}>
          <p className="text-[15px] font-extrabold text-ink">{event.plan?.code} · {event.plan?.occasion_id}</p>
          {event.brief && <p className="text-[12px] leading-relaxed text-ink-soft">{[event.brief.theme && `Theme: ${event.brief.theme}`,
            event.brief.priorities?.length && `Priorities: ${event.brief.priorities.join(', ')}`, event.brief.must_not_change && `Must not change: ${event.brief.must_not_change}`].filter(Boolean).join(' · ')}</p>}
          <ul className="divide-y divide-ink/[0.05]">
            {(event.requirements ?? []).map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-[12.5px]">
                <span className="min-w-0"><span className="font-extrabold text-ink">{TRADE[r.trade_id]?.label ?? r.trade_id}</span> <span className="text-ink-mute">{r.code}</span></span>
                <span className="shrink-0 font-bold text-ink-soft">{OWNER[r.owner] ?? r.owner}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 rounded-xl bg-surface p-3">
            <p className="text-[12px] font-extrabold text-ink">Propose a service</p>
            <select value={trade} onChange={e => setTrade(e.target.value)} className="h-10 w-full rounded-xl bg-white px-2 text-[13px] ring-1 ring-ink/10" data-propose-trade>
              <option value="">Choose a service…</option>
              {TRADES.filter(t => t.id !== 'wedding_planning').map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            {(tpl ?? []).map(f => (
              <div key={f.key}>
                <p className="text-[11.5px] font-bold text-ink-soft">{f.title}{f.required ? ' *' : ''}</p>
                {f.kind === 'toggle'
                  ? <input type="checkbox" checked={!!config[f.key]} onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.checked }))} />
                  : <div className="mt-1 flex flex-wrap gap-1">{f.options.slice(0, 24).map(o => (
                      <button key={o.value} type="button" onClick={() => pick(f, o)}
                        className={'rounded-full px-2.5 py-1 text-[11.5px] font-bold ' + (isOn(f, o) ? 'bg-plum-700 text-white' : 'bg-white ring-1 ring-ink/10')}>{o.label}</button>
                    ))}</div>}
              </div>
            ))}
            <input value={note} onChange={e => setNote(e.target.value.slice(0, 300))} placeholder="A note for the customer (optional)" className="h-10 w-full rounded-xl bg-white px-3 text-[13px] ring-1 ring-ink/10" />
            <button type="button" disabled={!trade || busy} onClick={propose} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-saffron-400 text-[12.5px] font-extrabold text-plum-950 disabled:opacity-50" data-propose>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Send to the customer for approval
            </button>
          </div>
          {msg && <p className="text-[12px] font-bold text-ink-soft" data-planner-msg>{msg}</p>}
        </div>
      )}
    </section>
  )
}
