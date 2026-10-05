import { useEffect, useState } from 'react'
import { BadgeCheck, Check, Clock3, Sparkles, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'
import { formatINR } from '../../utils/format'

function remainingSeconds(iso) {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000))
}

function useRemaining(iso) {
  const [left, setLeft] = useState(() => remainingSeconds(iso))
  useEffect(() => {
    const tick = () => setLeft(remainingSeconds(iso))
    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [iso])
  return left
}

export default function SambramoQuoteBoard({ userId }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!userId) return
    let live = true
    async function load() {
      const { data: requests } = await supabase.from('sambramo_quote_requests')
        .select('id, trade_id, service_name, event_date, quote_group_id, state, created_at')
        .eq('customer_id', userId).order('created_at', { ascending: false })
      const reqs = requests ?? []
      const out = []
      for (const request of reqs) {
        const { data: responses } = await supabase.from('sambramo_quote_responses')
          .select('id, quote_request_id, vendor_id, customer_amount_paise, inclusions, exclusions, quote_valid_until, notes, status')
          .eq('quote_request_id', request.id).order('customer_amount_paise', { ascending: true })
        out.push({ request, responses: responses ?? [] })
      }
      if (!live) return
      const ids = [...new Set(out.flatMap(x => x.responses.map(r => r.vendor_id)))]
      const { data: vendors } = ids.length
        ? await supabase.from('vendors').select('id, business_name, avatar_url, city, area, years_experience, rating_avg, is_verified').in('id', ids)
        : { data: [] }
      const byId = Object.fromEntries((vendors ?? []).map(v => [v.id, v]))
      setGroups(out.map(x => ({ ...x, responses: x.responses.map(r => ({ ...r, vendor: byId[r.vendor_id] })) })))
    }
    load()
    const timer = setInterval(load, 10000)
    return () => { live = false; clearInterval(timer) }
  }, [userId])

  async function choose(responseId) {
    setBusy(responseId); setMessage(null)
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    const result = await apiFetch('/api/accept-custom-quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify({ quoteResponseId: responseId }),
    })
    setBusy(null)
    if (result.ok) {
      try { sessionStorage.setItem('sambramo_quote_auto_pay', String(result.body?.bookingRequestId ?? '')) } catch { /* storage unavailable */ }
      navigate('/book/instant?request=' + encodeURIComponent(result.body?.bookingRequestId ?? ''))
      return
    }
    setMessage(result.error)
  }

  if (!groups.length) return null
  return <section className="space-y-3">
    {message && <div className="rounded-2xl bg-forest-50 p-3 text-[11.5px] font-bold text-forest-700">{message}</div>}
    {groups.map(g => <QuoteGroup key={g.request.id} group={g} busy={busy} onChoose={choose} />)}
  </section>
}

function QuoteGroup({ group, busy, onChoose }) {
  const [open, setOpen] = useState(true)
  const r = group.request
  return <article className="overflow-hidden rounded-[26px] bg-white shadow-[var(--shadow-1)] ring-1 ring-hairline/10">
    <button type="button" onClick={() => setOpen(x => !x)} className="flex w-full items-start gap-3 p-4 text-left">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-plum-700"><Sparkles size={19} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Instant Quote &amp; Pay</span>
        <span className="mt-0.5 block text-[16px] font-extrabold text-ink">{r.service_name ?? r.trade_id}</span>
        <span className="mt-1 block text-[11px] text-ink-mute">{group.responses.length ? group.responses.length + ' responses inside Sambramo' : 'Waiting for responses'}</span>
      </span>
      <Clock3 size={16} className="shrink-0 text-ink-mute" />
    </button>
    {open && <div className="space-y-3 border-t border-hairline/[0.07] p-4">
      {group.responses.length === 0
        ? <div className="rounded-2xl bg-surface p-4 text-center text-[11.5px] text-ink-mute">Sambramo is collecting eligible partner responses. You do not need to contact anyone.</div>
        : group.responses.filter(x => x.status === 'SUBMITTED' || x.status === 'ACCEPTED').map(x => <ResponseCard key={x.id} response={x} busy={busy === x.id} onChoose={() => onChoose(x.id)} />)}
    </div>}
  </article>
}

function ResponseCard({ response, busy, onChoose }) {
  const v = response.vendor
  const seconds = useRemaining(response.quote_valid_until)
  const rating = Number(v?.rating_avg)
  return <div className="rounded-[22px] bg-surface p-3">
    <div className="flex items-center gap-3">
      {v?.avatar_url ? <img src={v.avatar_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="h-12 w-12 rounded-xl bg-plum-100" />}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[13px] font-extrabold text-ink">{v?.business_name ?? 'Sambramo Partner'} {v?.is_verified && <BadgeCheck size={13} className="text-plum-600" />}</p>
        <p className="mt-0.5 text-[10.5px] text-ink-mute">{v?.city ?? 'Service area'}{v?.area ? ' · ' + v.area : ''}</p>
      </div>
      {Number.isFinite(rating) && rating > 0 && <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-extrabold text-amber-800"><Star size={10} fill="currentColor" />{rating.toFixed(1)}</span>}
    </div>
    <p className="mt-3 rounded-2xl bg-white p-3"><span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">Sambramo price</span><span className="mt-1 block text-[21px] font-extrabold tabular-nums text-ink">{formatINR(response.customer_amount_paise / 100)}</span></p>
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <List title="Included" items={response.inclusions} />
      <List title="Excluded" items={response.exclusions} />
    </div>
    {response.status === 'SUBMITTED'
      ? <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-[10.5px] font-extrabold text-amber-900 ring-1 ring-amber-200"><span>Customer quote expires soon</span><span className="tabular-nums">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span></div>
          <button type="button" disabled={busy || seconds <= 0} onClick={onChoose} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950 disabled:opacity-50"><Check size={14}/>{busy ? 'Preparing payment…' : 'Accept & Pay'}</button>
          {seconds <= 0 && <p className="mt-1 text-center text-[10.5px] font-bold text-rose-700">This quote expired. Sambramo can request a fresh quote from eligible partners.</p>}
        </div>
      : <div className="mt-3 rounded-2xl bg-forest-50 py-3 text-center text-[12px] font-extrabold text-forest-700">Locked in Sambramo</div>}
  </div>
}

function List({ title, items }) {
  const values = Array.isArray(items) ? items : []
  return <div className="rounded-2xl bg-white p-3"><p className="text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{title}</p>{values.length ? <ul className="mt-1 space-y-1">{values.slice(0, 8).map((x, i) => <li key={i} className="text-[10.5px] text-ink-soft">• {x}</li>)}</ul> : <p className="mt-1 text-[10.5px] text-ink-mute">Not specified</p>}</div>
}
