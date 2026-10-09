/**
 * Admin: listing versions (Anchor & MC pricing engine).
 *
 *   Review     submitted versions — profile, every pricing model, generated
 *              vs partner-edited package prices, add-ons, terms — and
 *              approve (publishes the whole version, starts the 15-day lock),
 *              request changes, or reject. review_sambramo_listing_version.
 *   Seasons    open / close seasonal price-update windows.
 *   Settings   sambramo_pricing_config: fee, Signature uplift, VIP factor,
 *              lock days, sane hourly range, payout-required-for-instant.
 *   Decisions  what the booking engine decided and why, last 30 days —
 *              how automated coverage is measured rather than claimed.
 */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Check, X, AlertTriangle, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { rupees } from '../../lib/tierPackages'

const TABS = [['review', 'Listings to review'], ['seasons', 'Seasonal windows'], ['settings', 'Pricing settings'], ['decisions', 'Booking decisions']]
const MODEL = { hour: 'Per hour', session: 'Per session', event: 'Per event', half_day: 'Half-day', full_day: 'Full-day', multi_day: 'Multi-day' }

export default function AnchorListingAdmin() {
  const [tab, setTab] = useState('review')
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-[22px] font-extrabold text-plum-950">Anchor & MC pricing</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-[13px] font-extrabold ${tab === id ? 'bg-plum-700 text-white' : 'bg-white text-ink/70 ring-1 ring-ink/10'}`}>{label}</button>
        ))}
      </div>
      {tab === 'review' && <Review />}
      {tab === 'seasons' && <Seasons />}
      {tab === 'settings' && <Settings />}
      {tab === 'decisions' && <Decisions />}
    </div>
  )
}

function Review() {
  const [rows, setRows] = useState(null)
  const [cfg, setCfg] = useState(null)
  const load = useCallback(async () => {
    const [{ data: vs }, { data: c }] = await Promise.all([
      supabase.from('sambramo_listing_versions')
        .select('id, vendor_id, vendor_service_id, trade, version, status, seasonal_window_id, effective_from, effective_to, profile, booking_rules, travel_rules, submitted_at, review_note, vendors(business_name, city, is_verified)')
        .in('status', ['UNDER_REVIEW', 'ACTION_REQUIRED']).order('submitted_at', { ascending: true }),
      supabase.from('sambramo_pricing_config').select('*').maybeSingle(),
    ])
    setCfg(c)
    const ids = (vs ?? []).map(v => v.id)
    if (!ids.length) { setRows([]); return }
    const [{ data: rules }, { data: addons }, { data: pkgs }] = await Promise.all([
      supabase.from('sambramo_rate_rules').select('*').in('listing_version_id', ids),
      supabase.from('sambramo_addon_rules').select('*').in('listing_version_id', ids),
      supabase.from('sambramo_trade_packages').select('id, listing_version_id, name, status, commercial_inputs, trade_inputs, calculation_snapshot').in('listing_version_id', ids),
    ])
    setRows(vs.map(v => ({
      ...v,
      rules: (rules ?? []).filter(r => r.listing_version_id === v.id),
      addons: (addons ?? []).filter(a => a.listing_version_id === v.id),
      pkgs: (pkgs ?? []).filter(p => p.listing_version_id === v.id && p.status !== 'ARCHIVED'),
    })))
  }, [])
  useEffect(() => { load() }, [load])

  if (!rows) return <Loader2 className="animate-spin text-plum-600" />
  if (!rows.length) return <p className="rounded-2xl bg-white p-6 text-center text-[13px] text-ink/55 ring-1 ring-ink/10">Nothing waiting for review.</p>
  return rows.map(v => <VersionCard key={v.id} v={v} cfg={cfg} onDone={load} />)
}

function VersionCard({ v, cfg, onDone }) {
  const [note, setNote] = useState(v.review_note ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const p = v.profile ?? {}, br = v.booking_rules ?? {}
  const hour = v.rules.find(r => r.model === 'hour')
  const flags = [
    hour && cfg && hour.take_home_paise < cfg.min_take_home_hour_paise && `Hourly take-home ${rupees(hour.take_home_paise)} is below the floor ${rupees(cfg.min_take_home_hour_paise)}`,
    hour && cfg && hour.take_home_paise > cfg.max_take_home_hour_paise && `Hourly take-home ${rupees(hour.take_home_paise)} is above the ceiling ${rupees(cfg.max_take_home_hour_paise)}`,
    ...v.pkgs.map(k => {
      const s = k.calculation_snapshot ?? {}
      if (!s.edited_by_partner || !s.generated_take_home_paise) return null
      const pct = Math.round((s.final_take_home_paise / s.generated_take_home_paise - 1) * 100)
      return Math.abs(pct) >= 30 ? `${k.name} edited ${pct > 0 ? '+' : ''}${pct}% from the recommended price` : null
    }),
    !v.vendors?.is_verified && 'Partner identity is not verified yet',
  ].filter(Boolean)

  async function decide(decision) {
    if (decision !== 'approve' && !note.trim()) { setErr('Write what the partner should change.'); return }
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('review_sambramo_listing_version', { p_version_id: v.id, p_decision: decision, p_note: note.trim() || null })
    setBusy(false)
    if (error) setErr(error.message); else onDone()
  }

  return (
    <div className="space-y-3 rounded-[22px] bg-white p-5 ring-1 ring-ink/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[17px] font-extrabold">{p.stage_name || v.vendors?.business_name} <span className="text-ink/40">· v{v.version}</span></p>
          <p className="text-[12.5px] text-ink/55">{v.vendors?.business_name} · {v.vendors?.city} · submitted {new Date(v.submitted_at).toLocaleString('en-IN')}</p>
          {v.seasonal_window_id && <p className="mt-1 flex items-center gap-1 text-[12px] font-bold text-amber-700"><Sparkles size={13} />Seasonal: events {v.effective_from} → {v.effective_to}</p>}
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-900">{v.status === 'UNDER_REVIEW' ? 'Waiting' : 'Changes requested'}</span>
      </div>

      {flags.length > 0 && (
        <div className="space-y-1 rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-200">
          {flags.map(f => <p key={f} className="flex items-start gap-1.5 text-[12.5px] font-bold text-rose-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{f}</p>)}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Box title="Profile">
          <p className="text-[12.5px]">{p.role} · {p.years} yrs · up to {p.max_audience} guests</p>
          <p className="text-[12.5px]">{(p.languages ?? []).map(l => `${l.name} (${l.level})`).join(', ')}</p>
          <p className="text-[12.5px] text-ink/60">{(p.events ?? []).join(', ')}</p>
          {Object.values(p.events_other ?? {}).flat().length > 0 && <p className="text-[12px] font-bold text-amber-700">New event types to review: {Object.values(p.events_other).flat().join(', ')}</p>}
          {p.video_url && <a className="text-[12.5px] font-bold text-plum-700" href={p.video_url} target="_blank" rel="noreferrer">Performance video</a>}
        </Box>
        <Box title="Pricing models (take-home → customer)">
          {v.rules.map(r => <p key={r.id} className="text-[12.5px]"><b>{MODEL[r.model]}</b> {rupees(r.take_home_paise)} → {rupees(r.customer_paise)}{r.included_hours ? ` · ${r.included_hours}h` : ''}{r.min_hours ? ` · min ${r.min_hours}h` : ''}{r.max_hours ? ` · max ${r.max_hours}h` : ''}</p>)}
        </Box>
        <Box title="Packages (recommended → partner's)">
          {v.pkgs.map(k => {
            const s = k.calculation_snapshot ?? {}
            return <p key={k.id} className="text-[12.5px]"><b>{k.name}</b> {k.trade_inputs?.duration_hours}h · {rupees(s.generated_take_home_paise)} → <b>{rupees(s.final_take_home_paise)}</b> take-home · customer {rupees(k.trade_inputs?.customer_paise)}{s.edited_by_partner ? ' · edited' : ''}</p>
          })}
        </Box>
        <Box title="Add-ons & terms">
          {v.addons.map(a => <p key={a.id} className="text-[12.5px]">{a.label}: {rupees(a.take_home_paise)} ({a.unit}){a.included_in?.length ? ` · in ${a.included_in.join(', ')}` : ''}</p>)}
          <p className="mt-1 text-[12.5px] text-ink/60">Advance {br.advance_pct}% · {br.cancellation} · notice {br.min_notice_days}d · quotes {br.custom_quotes === false ? 'off' : `${br.quote_hours}h`} · travel {v.travel_rules?.model}</p>
        </Box>
      </div>

      <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Note to the partner (required for changes or reject)"
        className="w-full rounded-2xl bg-[#f7f6fb] p-3 text-[13px] outline-none ring-1 ring-ink/10" />
      {err && <p className="text-[12.5px] font-bold text-rose-700">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => decide('approve')} className="flex items-center gap-1.5 rounded-full bg-forest-600 px-5 py-2.5 text-[13px] font-extrabold text-white disabled:opacity-50"><Check size={15} />Approve & publish</button>
        <button disabled={busy} onClick={() => decide('request_changes')} className="rounded-full bg-amber-100 px-5 py-2.5 text-[13px] font-extrabold text-amber-900 disabled:opacity-50">Request changes</button>
        <button disabled={busy} onClick={() => decide('reject')} className="flex items-center gap-1.5 rounded-full bg-rose-50 px-5 py-2.5 text-[13px] font-extrabold text-rose-700 ring-1 ring-rose-200 disabled:opacity-50"><X size={15} />Reject</button>
      </div>
    </div>
  )
}

const Box = ({ title, children }) => (
  <div className="space-y-1 rounded-2xl bg-[#faf9fd] p-3 ring-1 ring-ink/[0.06]">
    <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink/45">{title}</p>{children}
  </div>
)

function Seasons() {
  const [rows, setRows] = useState([])
  const [f, setF] = useState({ name: '', opens_at: '', closes_at: '', event_from: '', event_to: '', permitted: ['hour', 'half_day', 'full_day'] })
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.from('sambramo_seasonal_windows').select('*').order('opens_at', { ascending: false })
    setRows(data ?? [])
  }, [])
  useEffect(() => { load() }, [load])
  async function create() {
    setErr('')
    const { error } = await supabase.from('sambramo_seasonal_windows').insert({
      name: f.name, opens_at: new Date(f.opens_at).toISOString(), closes_at: new Date(f.closes_at).toISOString(),
      event_from: f.event_from, event_to: f.event_to, trades: ['Anchor & MC'], permitted_fields: f.permitted,
    })
    if (error) setErr(error.message); else { setF({ ...f, name: '' }); load() }
  }
  async function closeNow(id) { await supabase.from('sambramo_seasonal_windows').update({ closes_at: new Date().toISOString() }).eq('id', id); load() }
  const input = 'rounded-xl bg-[#f7f6fb] px-3 py-2 text-[13px] ring-1 ring-ink/10'
  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-[22px] bg-white p-5 ring-1 ring-ink/10">
        <p className="text-[15px] font-extrabold">Open a window</p>
        <input className={`${input} w-full`} placeholder="Name, e.g. Wedding season 2026–27" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2 text-[12px] font-bold text-ink/55">
          <label>Partners can submit from<input type="datetime-local" className={`${input} mt-1 w-full`} value={f.opens_at} onChange={e => setF({ ...f, opens_at: e.target.value })} /></label>
          <label>until<input type="datetime-local" className={`${input} mt-1 w-full`} value={f.closes_at} onChange={e => setF({ ...f, closes_at: e.target.value })} /></label>
          <label>Applies to events from<input type="date" className={`${input} mt-1 w-full`} value={f.event_from} onChange={e => setF({ ...f, event_from: e.target.value })} /></label>
          <label>to<input type="date" className={`${input} mt-1 w-full`} value={f.event_to} onChange={e => setF({ ...f, event_to: e.target.value })} /></label>
        </div>
        <div className="flex flex-wrap gap-2">
          {[...Object.keys(MODEL), 'packages'].map(m => {
            const on = f.permitted.includes(m)
            return <button key={m} type="button" onClick={() => setF({ ...f, permitted: on ? f.permitted.filter(x => x !== m) : [...f.permitted, m] })}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${on ? 'bg-plum-700 text-white' : 'bg-[#f4f2f9] text-ink/70'}`}>{MODEL[m] ?? 'Package prices'}</button>
          })}
        </div>
        {err && <p className="text-[12.5px] font-bold text-rose-700">{err}</p>}
        <button disabled={!f.name || !f.opens_at || !f.closes_at || !f.event_from || !f.event_to} onClick={create}
          className="rounded-full bg-plum-700 px-5 py-2.5 text-[13px] font-extrabold text-white disabled:opacity-40">Open window</button>
      </div>
      {rows.map(w => {
        const open = new Date(w.opens_at) <= new Date() && new Date(w.closes_at) >= new Date()
        return (
          <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4 ring-1 ring-ink/10">
            <div><p className="text-[14px] font-extrabold">{w.name} {open && <span className="ml-1 rounded-full bg-forest-50 px-2 py-0.5 text-[11px] text-forest-700">Open</span>}</p>
              <p className="text-[12px] text-ink/55">Submit {new Date(w.opens_at).toLocaleDateString('en-IN')} – {new Date(w.closes_at).toLocaleDateString('en-IN')} · events {w.event_from} → {w.event_to} · {w.permitted_fields.join(', ')}</p></div>
            {open && <button onClick={() => closeNow(w.id)} className="rounded-full bg-rose-50 px-4 py-2 text-[12px] font-extrabold text-rose-700">Close now</button>}
          </div>
        )
      })}
    </div>
  )
}

function Settings() {
  const [c, setC] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(() => { supabase.from('sambramo_pricing_config').select('*').maybeSingle().then(({ data }) => setC(data)) }, [])
  if (!c) return <Loader2 className="animate-spin text-plum-600" />
  const field = (k, label, step = '0.01') => (
    <label className="block text-[12px] font-bold text-ink/55">{label}
      <input type="number" step={step} value={c[k]} onChange={e => setC({ ...c, [k]: e.target.value })} className="mt-1 w-full rounded-xl bg-[#f7f6fb] px-3 py-2 text-[14px] font-bold text-ink ring-1 ring-ink/10" />
    </label>
  )
  async function save() {
    const { error } = await supabase.from('sambramo_pricing_config').update({
      platform_fee_rate: Number(c.platform_fee_rate), signature_uplift: Number(c.signature_uplift), vip_factor: Number(c.vip_factor),
      price_lock_days: Number(c.price_lock_days), min_take_home_hour_paise: Number(c.min_take_home_hour_paise), max_take_home_hour_paise: Number(c.max_take_home_hour_paise),
      require_payout_for_instant: !!c.require_payout_for_instant, updated_at: new Date().toISOString(),
    }).eq('id', true)
    setMsg(error ? error.message : 'Saved. Applies to new submissions; live prices do not change.')
  }
  return (
    <div className="space-y-3 rounded-[22px] bg-white p-5 ring-1 ring-ink/10">
      <div className="grid gap-3 md:grid-cols-3">
        {field('platform_fee_rate', 'Platform fee (0.08 = 8%)', '0.001')}
        {field('signature_uplift', 'Signature × Essential')}
        {field('vip_factor', 'VIP × full-day / longest')}
        {field('price_lock_days', 'Price lock (days)', '1')}
        {field('min_take_home_hour_paise', 'Min hourly take-home (paise)', '100')}
        {field('max_take_home_hour_paise', 'Max hourly take-home (paise)', '100')}
      </div>
      <label className="flex items-center gap-2 text-[13px] font-bold">
        <input type="checkbox" checked={!!c.require_payout_for_instant} onChange={e => setC({ ...c, require_payout_for_instant: e.target.checked })} />
        Require an active Razorpay payout account for Instant Book (off only for testing)
      </label>
      <button onClick={save} className="rounded-full bg-plum-700 px-5 py-2.5 text-[13px] font-extrabold text-white">Save settings</button>
      {msg && <p className="text-[12.5px] font-bold text-ink/60">{msg}</p>}
    </div>
  )
}

function Decisions() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString()
    supabase.from('sambramo_booking_decisions').select('path, reasons').gte('created_at', since).limit(5000).then(({ data }) => setRows(data ?? []))
  }, [])
  if (!rows) return <Loader2 className="animate-spin text-plum-600" />
  const by = p => rows.filter(r => r.path === p).length
  const reasons = {}
  rows.forEach(r => (r.reasons ?? []).forEach(x => { reasons[x] = (reasons[x] ?? 0) + 1 }))
  const top = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 15)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {['INSTANT', 'QUOTE', 'NOT_ELIGIBLE'].map(p => (
          <div key={p} className="rounded-2xl bg-white p-4 text-center ring-1 ring-ink/10">
            <p className="text-[11px] font-extrabold text-ink/45">{p.replace('_', ' ')}</p>
            <p className="text-[24px] font-extrabold">{by(p)}</p>
            <p className="text-[11px] text-ink/45">{rows.length ? Math.round(by(p) / rows.length * 100) : 0}%</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
        <p className="mb-2 text-[13px] font-extrabold">Most common reasons (last 30 days)</p>
        {top.length ? top.map(([r, n]) => <p key={r} className="flex justify-between text-[12.5px]"><span>{r}</span><b>{n}</b></p>) : <p className="text-[12.5px] text-ink/50">No decisions yet.</p>}
      </div>
    </div>
  )
}
