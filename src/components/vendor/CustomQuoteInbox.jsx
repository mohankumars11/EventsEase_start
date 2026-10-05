import { useCallback, useEffect, useState } from 'react'
import { Camera, CheckCircle2, Clock3, MapPin, Send, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'

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
      .select('id, trade_id, offering_id, service_name, event_date, start_time, end_time, service_location, canonical_demand, state, required_actions, expires_at, quote_group_id, reference_photo_url, created_at')
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
    setFlash('Quote sent to Sambramo. The customer compares it here.')
    setOpen(null)
    read()
  }

  return (
    <section className="space-y-3" data-custom-quote-inbox>
      {flash && <p className="rounded-2xl bg-surface p-3 text-[12px] font-bold text-ink-soft">{flash}</p>}
      {requests.length > 0 && requests.map(r => (
        <QuoteCard key={r.id} request={r} onRespond={() => setOpen(r)} />
      ))}
      {open && <QuoteSheet request={open} busy={busy} onClose={() => setOpen(null)} onSubmit={submit} />}
    </section>
  )
}

function QuoteCard({ request, onRespond }) {
  const seconds = request.expires_at ? secondsLeft(request.expires_at) : null
  const demand = request.canonical_demand ?? {}
  const loc = request.service_location ?? {}
  const scope = demand.summary ?? demand.note ?? demand.scope ?? 'Open the request to review the structured requirement.'
  return (
    <article className="rounded-[24px] bg-white p-4 shadow-[var(--shadow-1)] ring-1 ring-hairline/10">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-plum-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-plum-700">Custom Sambramo request</span>
        {seconds != null && <span className="flex items-center gap-1 text-[11px] font-extrabold text-amber-700"><Clock3 size={12} /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>}
      </div>
      <h3 className="mt-2 text-[19px] font-extrabold text-ink">{request.service_name ?? request.offering_id ?? request.trade_id}</h3>
      <p className="mt-1 text-[12px] font-bold text-ink-soft">
        {request.event_date ? new Date(request.event_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date to be confirmed'}
      </p>
      <p className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-mute"><MapPin size={12} /> {loc.area ?? loc.city ?? 'Location shared in request'}</p>
      {request.reference_photo_url && <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-ink-mute"><Camera size={12} /> Reference attached</p>}
      <div className="mt-3 rounded-2xl bg-surface p-3 text-[11.5px] leading-relaxed text-ink-soft"><strong>Scope:</strong> {scope}</div>
      <button type="button" onClick={onRespond} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950">
        <Send size={14} /> Respond with quote
      </button>
    </article>
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
          <div className="rounded-2xl bg-surface p-3 text-[11.5px] leading-relaxed text-ink-soft">Enter your <strong>supply quote</strong>. Sambramo calculates and displays the customer commercial result.</div>
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
