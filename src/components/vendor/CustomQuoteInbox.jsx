import { useCallback, useEffect, useState } from 'react'
import BriefNote from './BriefNote'
import { MenuBrief, MenuQuoteSheet } from './MenuQuote'
import { Camera, CheckCircle2, Clock3, MapPin, Send, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'
import QuoteEditor from './quote/QuoteEditor'
import { rupees } from '../../lib/tierPackages'
import { configFor } from '../../data/trades'

const secondsLeft = iso => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000))

export default function CustomQuoteInbox({ vendorId }) {
  const [requests, setRequests] = useState([])
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null)

  const read = useCallback(async () => {
    if (!vendorId) return
    const { data } = await supabase
      .from('sambramo_quote_requests')
      /* '*': picks up planner_brief_id and acknowledged_at once migration 210
         is pasted, and still works before it — naming them would not. */
      .select('*')
      .eq('vendor_id', vendorId)
      .in('state', ['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'])
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('expires_at', { ascending: true })
    setRequests(data ?? [])
  }, [vendorId])

  useEffect(() => {
    read()
    const t = setInterval(read, 5000)
    return () => clearInterval(t)
  }, [read])

  async function submit(requestId, payload) {
    setBusy(true)
    setFlash(null)
    const result = await apiFetch('/api/submit-custom-quote', {
      method: 'POST',
      headers: payload.headers,
      body: JSON.stringify({ quoteRequestId: requestId, ...payload.body }),
    })
    setBusy(false)
    if (!result.ok) {
      setFlash(result.error)
      return
    }
    setFlash(payload.body?.decline ? 'Request declined. It has left your queue.' : 'Quote sent to Sambramo. The customer compares it here.')
    setOpen(null)
    read()
  }

  return (
    <section className="space-y-3" data-custom-quote-inbox>
      {flash && <p className="rounded-2xl bg-surface p-3 text-[12px] font-bold text-ink-soft">{flash}</p>}
      {requests.length > 0 && requests.map(r => (
        <QuoteCard key={r.id} request={r} onRespond={() => setOpen(r)} onAck={async () => {
          const { error } = await supabase.rpc('sambramo_planner_acknowledge', { p_quote_request_id: r.id })
          setFlash(error ? error.message : 'The customer can see you are on it.'); read()
        }} />
      ))}
      {open && open.canonical_demand?.menu && <MenuQuoteSheet request={open} busy={busy} onClose={() => setOpen(null)} onSubmit={submit} />}
      {open && open.planner_brief_id && <PlannerProposalSheet request={open} busy={busy} onClose={() => setOpen(null)} onSubmit={submit} />}
      {open && !open.planner_brief_id && !open.canonical_demand?.menu && (/^(anchor|trades)-engine/.test(String(open.canonical_demand?.engine ?? ''))
        ? <DirectedQuoteSheet request={open} busy={busy} onClose={() => setOpen(null)} onSubmit={submit} />
        : <QuoteSheet request={open} busy={busy} onClose={() => setOpen(null)} onSubmit={submit} />)}
    </section>
  )
}

function QuoteCard({ request, onRespond, onAck }) {
  const seconds = request.expires_at ? secondsLeft(request.expires_at) : null
  const demand = request.canonical_demand ?? {}
  const loc = request.service_location ?? {}
  /* The customer's own brief first (menu, theme, references); the engine's summary only when there is none. */
  const scope = demand.summary || demand.scope || (demand.note ? null : 'Open the request to review the structured requirement.')
  return (
    <article className="rounded-[24px] bg-white p-4 shadow-[var(--shadow-1)] ring-1 ring-hairline/10">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-plum-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-plum-700">{request.planner_brief_id ? 'Planning brief' : <>Instant Quote &amp; Pay</>}</span>
        {seconds != null && <span className="flex items-center gap-1 text-[11px] font-extrabold text-amber-700"><Clock3 size={12} /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>}
      </div>
      <h3 className="mt-2 text-[19px] font-extrabold text-ink">{request.service_name ?? request.offering_id ?? request.trade_id}</h3>
      <p className="mt-1 text-[12px] font-bold text-ink-soft">
        {request.event_date ? new Date(request.event_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date to be confirmed'}
      </p>
      <p className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-mute"><MapPin size={12} /> {loc.area ?? loc.city ?? 'Location shared in request'}</p>
      {request.reference_photo_url && <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-ink-mute"><Camera size={12} /> Reference attached</p>}
      {demand.menu ? <MenuBrief menu={demand.menu} compact /> : demand.note && <BriefNote text={demand.note} className="mt-3" />}
      {scope && <div className="mt-3 rounded-2xl bg-surface p-3 text-[11.5px] leading-relaxed text-ink-soft"><strong>Scope:</strong> {scope}</div>}
      {/* A planner says "on it" first; the customer sees it, and it is never taken for a proposal. */}
      {request.planner_brief_id && !request.acknowledged_at && (
        <button type="button" onClick={onAck} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-plum-50 py-3 text-[13px] font-extrabold text-plum-700" data-ack>
          <CheckCircle2 size={14} /> I’m on it — proposal to follow
        </button>
      )}
      <button type="button" onClick={onRespond} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950">
        <Send size={14} /> {request.planner_brief_id ? 'Send your proposal' : demand.menu ? 'Price this menu' : 'Respond with quote'}
      </button>
    </article>
  )
}

/* The trade's own quote lines (src/data/trades/<id>.js quoteTemplate) that
   the engine did not already price, as empty rows for the partner to fill —
   a caterer sees per-plate, counters and staff; a truck sees fare, distance,
   waiting and tolls. Rows left at ₹0 are dropped by the editor's own rules. */
function withTemplate(lines, template) {
  if (lines.length) return lines      // the engine's own priced + flagged lines win
  return (template ?? ['Service fee'])
    .map((t, i) => ({ id: `tpl-${i}`, description: t, qty: 1, unit: 'item', unit_paise: 0, needs: true }))
}

/* A request from the booking engine: every line it could
   price from the partner's own rates arrives filled; the rest are flagged.
   The partner finishes it, Sambramo computes the customer price (8%). */
function DirectedQuoteSheet({ request, busy, onClose, onSubmit }) {
  const [lines, setLines] = useState(null)
  useEffect(() => {
    supabase.from('sambramo_quote_line_items').select('*').eq('quote_request_id', request.id)
      .order('quote_version', { ascending: false }).order('sort_order').then(({ data }) => {
        const latest = data?.[0]?.quote_version
        setLines((data ?? []).filter(l => l.quote_version === latest).map(l => ({
          id: l.id, description: l.description, qty: Number(l.quantity), unit: l.unit,
          unit_paise: Number(l.unit_take_home_paise), auto: l.generated, needs: l.needs_partner,
          charged: l.charged, generated_unit_paise: l.generated_unit_paise,
        })))
      })
  }, [request.id])
  const d = request.canonical_demand ?? {}
  const headers = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
  }
  return (
    <div className="fixed inset-0 z-[96] overflow-y-auto bg-[#fbfaff]">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-4 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] backdrop-blur-xl ring-1 ring-ink/[0.05]">
        <p className="text-[16px] font-extrabold text-ink">Quote request</p>
        <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full"><X size={19} /></button>
      </div>
      <div className="mx-auto max-w-lg px-4 pb-8 pt-4">
        {d.note && <BriefNote text={d.note} className="mb-3" />}
        {!lines ? <p className="py-10 text-center text-[13px] text-ink/50">Loading…</p> : (
          <QuoteEditor expiresAt={request.expires_at} advancePct={Number(d.advance_pct) || 30}
            request={{
              title: `${request.service_name}${d.days > 1 ? ` · ${d.days} days` : ''}`,
              dates: request.event_date, venue: request.service_location?.city || request.service_location?.area || '—',
              guests: d.guests ?? '—', languages: (d.languages ?? []).join(', ') || '—', reason: d.summary || (d.note ? 'The customer’s brief is above — price exactly that' : 'Outside your standard packages'),
            }}
            lines={withTemplate(lines, configFor(d.tradeName ?? request.trade_id)?.quoteTemplate)}
            onReject={async () => {
              if (busy) return
              await onSubmit(request.id, { headers: await headers(), body: { decline: true } })
            }}
            onSend={async ls => {
              if (busy) return
              await onSubmit(request.id, { headers: await headers(), body: { lines: ls.map(l => ({
                description: l.description, quantity: l.qty, unit: l.unit, unit_take_home_paise: l.unit_paise || 0,
                charged: l.charged !== false, generated: !!l.auto, generated_unit_paise: l.generated_unit_paise ?? null, is_discount: !!l.discount,
              })) } })
            }} />
        )}
      </div>
    </div>
  )
}

function QuoteSheet({ request, busy, onClose, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [travel, setTravel] = useState('')
  const [crew, setCrew] = useState('')
  const [equipment, setEquipment] = useState('')
  const [inclusions, setInclusions] = useState('')
  const [exclusions, setExclusions] = useState('')
  const [notes, setNotes] = useState('')

  async function send() {
    if (Number(amount) <= 0) return
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    await onSubmit(request.id, {
      headers: { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: {
        partnerAmountPaise: Math.round(Number(amount) * 100),
        partnerComponents: {
          travel: Number(travel) > 0 ? Math.round(Number(travel) * 100) : 0,
          crew: crew.trim() || null,
          equipment: equipment.trim() || null,
        },
        inclusions: inclusions.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 50),
        exclusions: exclusions.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 50),
        notes: notes.trim() || null,
      },
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-plum-600">Custom quote response</p>
            <h3 className="mt-0.5 text-[18px] font-extrabold text-ink">{request.service_name}</h3>
          </div>
          <button onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="rounded-2xl bg-surface p-3 text-[11.5px] leading-relaxed text-ink-soft">Enter your <strong>supply quote</strong>. Sambramo calculates the customer price, keeps the request inside the quote lane, and gives the customer 10 minutes to accept and pay.</div>
          <Field label="Your quote" value={amount} onChange={setAmount} suffix="₹" type="number" />
          <Field label="Travel included" value={travel} onChange={setTravel} suffix="₹" type="number" />
          <Area label="Crew / labour" value={crew} onChange={setCrew} placeholder="e.g. 3 people · 8 hours" />
          <Area label="Equipment / production" value={equipment} onChange={setEquipment} placeholder="What you are bringing" />
          <Area label="Included" value={inclusions} onChange={setInclusions} placeholder="One item per line" />
          <Area label="Excluded" value={exclusions} onChange={setExclusions} placeholder="One item per line" />
          <div className="rounded-2xl bg-amber-50 p-3 text-[11.5px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
            <strong>Instant Quote lane:</strong> after you submit, the customer has 10 minutes to review, accept and pay. Sambramo controls this window.
          </div>
          <Area label="Notes" value={notes} onChange={setNotes} placeholder="Lead time, constraints, important assumptions" />
        </div>
        <div className="border-t border-gray-100 p-4">
          <button disabled={busy || Number(amount) <= 0} onClick={send} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 font-extrabold text-[13px] text-plum-950 disabled:opacity-50">
            <CheckCircle2 size={15} /> {busy ? 'Sending…' : 'Send quote to customer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, suffix = '', type = 'text' }) {
  return <label className="block rounded-2xl bg-surface p-3"><span className="block text-[10px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span><div className="mt-1 flex items-center gap-2"><input type={type} value={value} onChange={e => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[15px] font-extrabold outline-none" />{suffix && <span className="text-[11px] text-ink-mute">{suffix}</span>}</div></label>
}
function Area({ label, value, onChange, placeholder }) {
  return <label className="block rounded-2xl bg-surface p-3"><span className="block text-[10px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span><textarea rows={2} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full resize-none bg-transparent text-[12px] leading-relaxed outline-none" /></label>
}

/* A planner's proposal (migration 210) — structured so a customer can put
   two planners side by side: the planning fee (the only line charged), what
   vendors will cost as ESTIMATES that are never added to the fee, each
   saying whether it is a Sambramo partner or a vendor of the planner's own,
   then the approach, timeline and how it is paid. */
function PlannerProposalSheet({ request, busy, onClose, onSubmit }) {
  const [fee, setFee] = useState('')
  const [approach, setApproach] = useState('')
  const [inclusions, setInclusions] = useState('')
  const [exclusions, setExclusions] = useState('')
  const [vendors, setVendors] = useState([{ description: '', amount: '', source: 'sambramo_partner' }])
  const [timeline, setTimeline] = useState('')
  const [schedule, setSchedule] = useState('30% on booking\n70% a week before')
  const [staffing, setStaffing] = useState('')
  const [assumptions, setAssumptions] = useState('')
  const lines = t => t.split('\n').map(x => x.trim()).filter(Boolean)
  const setV = (i, patch) => setVendors(v => v.map((x, k) => (k === i ? { ...x, ...patch } : x)))

  async function send() {
    if (Number(fee) <= 0) return
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    const vend = vendors.filter(v => v.description.trim()).map(v => ({ description: v.description.trim(), quantity: 1, unit: 'estimate',
      unit_take_home_paise: Math.round((Number(v.amount) || 0) * 100), charged: false, is_estimate: true,
      estimate_note: 'An estimate until that vendor is booked', source: v.source }))
    await onSubmit(request.id, {
      headers: { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: {
        lines: [{ description: 'Planning fee', quantity: 1, unit: 'event', unit_take_home_paise: Math.round(Number(fee) * 100), charged: true, source: 'planner_fee' }, ...vend],
        inclusions: lines(inclusions).slice(0, 50), exclusions: lines(exclusions).slice(0, 50),
        proposal: {
          approach: approach.trim() || null, staffing: staffing.trim() || null,
          timeline: lines(timeline).map(l => { const [when, ...what] = l.split(/\s+[—-]\s+/); return { when, what: what.join(' — ') || when } }),
          payment_schedule: lines(schedule).map(l => { const m = l.match(/(\d+)\s*%\s*(.*)/); return m ? { pct: Number(m[1]), when: m[2] || 'on booking' } : null }).filter(Boolean),
          assumptions: lines(assumptions),
        },
      },
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl" data-planner-proposal>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div><p className="text-[10px] font-extrabold uppercase tracking-wide text-plum-600">Your proposal</p><h3 className="mt-0.5 text-[18px] font-extrabold text-ink">{request.service_name}</h3></div>
          <button onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {request.canonical_demand?.note && <BriefNote text={request.canonical_demand.note} />}
          <Field label="Your planning fee" value={fee} onChange={setFee} suffix="₹" type="number" />
          <Area label="Your approach" value={approach} onChange={setApproach} placeholder="How you would run this celebration" />
          <Area label="Included" value={inclusions} onChange={setInclusions} placeholder="One item per line" />
          <Area label="Not included" value={exclusions} onChange={setExclusions} placeholder="One item per line" />
          <div className="rounded-2xl bg-surface p-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">What vendors will cost — estimates, not added to your fee</p>
            {vendors.map((v, i) => (
              <div key={i} className="mt-2 grid grid-cols-[1fr_88px] gap-1.5">
                <input value={v.description} onChange={e => setV(i, { description: e.target.value.slice(0, 200) })} placeholder="e.g. Catering for 150" className="h-10 rounded-xl bg-white px-3 text-[13px] ring-1 ring-ink/10" />
                <input value={v.amount} onChange={e => setV(i, { amount: e.target.value })} placeholder="₹" inputMode="numeric" className="h-10 rounded-xl bg-white px-3 text-[13px] ring-1 ring-ink/10" />
                <select value={v.source} onChange={e => setV(i, { source: e.target.value })} className="col-span-2 h-9 rounded-xl bg-white px-2 text-[12px] ring-1 ring-ink/10">
                  <option value="sambramo_partner">A Sambramo partner</option><option value="planner_sourced">A vendor of my own</option>
                </select>
              </div>
            ))}
            <button type="button" onClick={() => setVendors(v => [...v, { description: '', amount: '', source: 'sambramo_partner' }])} className="mt-2 text-[12px] font-extrabold text-plum-700">+ Add a vendor cost</button>
          </div>
          <Area label="Timeline" value={timeline} onChange={setTimeline} placeholder={'One step per line: “2 weeks before — décor finalised”'} />
          <Area label="How you are paid" value={schedule} onChange={setSchedule} placeholder="30% on booking" />
          <Area label="Your team on the day" value={staffing} onChange={setStaffing} placeholder="e.g. 1 lead coordinator + 3 assistants" />
          <Area label="Assumptions" value={assumptions} onChange={setAssumptions} placeholder="One per line" />
        </div>
        <div className="border-t border-gray-100 p-4">
          <button disabled={busy || Number(fee) <= 0} onClick={send} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950 disabled:opacity-50" data-send-proposal>
            <CheckCircle2 size={15} /> {busy ? 'Sending…' : 'Send proposal'}
          </button>
        </div>
      </div>
    </div>
  )
}
