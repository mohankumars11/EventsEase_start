/**
 * Admin: listing versions for every trade on the shared engine.
 *
 *   Review     submitted versions — the trade's own answers, pricing rules,
 *              catalogue, packages (recommended vs partner-edited), add-ons,
 *              declared charges, resources and licences — then approve
 *              (publishes the whole version, starts the 15-day lock), request
 *              changes, or reject. review_sambramo_listing_version.
 *   Seasons    open / close seasonal price-update windows, per trade.
 *   Fees       per-trade commission and tier factors (sambramo_trade_pricing_policy).
 *   Settings   global sambramo_pricing_config defaults.
 *   Decisions  what the booking engine decided and why, last 30 days.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Check, X, AlertTriangle, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { rupees } from '../../lib/tierPackages'
import { TRADE_REGISTRY } from '../../data/trades/registry'
import { RULE_KINDS } from '../../data/trades/schema'
import { CONFIG_BY_ID, questionsOf } from '../../data/trades'

const TABS = [['review', 'Listings to review'], ['dishes', 'Dish proposals'], ['seasons', 'Seasonal windows'], ['fees', 'Trade fees'], ['settings', 'Global settings'], ['decisions', 'Booking decisions']]
const ruleName = r => (r.label ? `${RULE_KINDS[r.rule_kind ?? r.model]?.label ?? r.rule_kind} · ${r.label}` : RULE_KINDS[r.rule_kind ?? r.model]?.label ?? r.rule_kind)

export default function AnchorListingAdmin() {
  const [tab, setTab] = useState('review')
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-[22px] font-extrabold text-plum-950">Listing review · all trades</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-[13px] font-extrabold ${tab === id ? 'bg-plum-700 text-white' : 'bg-white text-ink/70 ring-1 ring-ink/10'}`}>{label}</button>
        ))}
      </div>
      {tab === 'review' && <Review />}
      {tab === 'dishes' && <DishProposals />}
      {tab === 'seasons' && <Seasons />}
      {tab === 'fees' && <Fees />}
      {tab === 'settings' && <Settings />}
      {tab === 'decisions' && <Decisions />}
    </div>
  )
}

const tradeIdOf = v => v.trade_id ?? TRADE_REGISTRY.find(t => t.name === v.trade)?.id ?? null

function Review() {
  const [rows, setRows] = useState(null)
  const [cfg, setCfg] = useState(null)
  const [trade, setTrade] = useState('all')
  const load = useCallback(async () => {
    const [{ data: vs }, { data: c }] = await Promise.all([
      supabase.from('sambramo_listing_versions')
        .select('*, vendors(business_name, city, is_verified)')
        .in('status', ['UNDER_REVIEW', 'ACTION_REQUIRED']).order('submitted_at', { ascending: true }),
      supabase.from('sambramo_pricing_config').select('*').maybeSingle(),
    ])
    setCfg(c)
    const ids = (vs ?? []).map(v => v.id)
    if (!ids.length) { setRows([]); return }
    const sids = [...new Set(vs.map(v => v.vendor_service_id))]
    const vids = [...new Set(vs.map(v => v.vendor_id))]
    const [{ data: rules }, { data: addons }, { data: pkgs }, cat, res, docs, cmenus, ccounters] = await Promise.all([
      supabase.from('sambramo_rate_rules').select('*').in('listing_version_id', ids),
      supabase.from('sambramo_addon_rules').select('*').in('listing_version_id', ids),
      supabase.from('sambramo_trade_packages').select('id, listing_version_id, name, status, commercial_inputs, trade_inputs, calculation_snapshot').in('listing_version_id', ids),
      supabase.from('sambramo_catalogue_items').select('*').in('listing_version_id', ids),
      supabase.from('sambramo_resources').select('vendor_service_id, kind, label, quantity, unit, active').in('vendor_service_id', sids),
      supabase.from('vendor_documents').select('vendor_id, requirement_id, status').in('vendor_id', vids),
      // Catering: menus with their dishes, and live counters (empty for other trades).
      supabase.from('sambramo_catering_menus').select('*, sambramo_catering_menu_items(dish_key, course_group, included, extra_take_home_paise, sort_order)').in('listing_version_id', ids),
      supabase.from('sambramo_live_counters').select('*').in('listing_version_id', ids),
    ])
    setRows(vs.map(v => ({
      ...v,
      rules: (rules ?? []).filter(r => r.listing_version_id === v.id),
      addons: (addons ?? []).filter(a => a.listing_version_id === v.id),
      pkgs: (pkgs ?? []).filter(p => p.listing_version_id === v.id && p.status !== 'ARCHIVED'),
      items: (cat.data ?? []).filter(i => i.listing_version_id === v.id),
      resources: (res.data ?? []).filter(r => r.vendor_service_id === v.vendor_service_id && r.active),
      docs: Object.fromEntries((docs.data ?? []).filter(d => d.vendor_id === v.vendor_id).map(d => [d.requirement_id, d.status])),
      menus: (cmenus.data ?? []).filter(m => m.listing_version_id === v.id),
      counters: (ccounters.data ?? []).filter(c => c.listing_version_id === v.id),
    })))
  }, [])
  useEffect(() => { load() }, [load])

  const counts = useMemo(() => {
    const c = {}
    for (const v of rows ?? []) { const t = tradeIdOf(v); c[t] = (c[t] ?? 0) + 1 }
    return c
  }, [rows])

  if (!rows) return <Loader2 className="animate-spin text-plum-600" />
  if (!rows.length) return <p className="rounded-2xl bg-white p-6 text-center text-[13px] text-ink/55 ring-1 ring-ink/10">Nothing waiting for review.</p>
  const shown = rows.filter(v => trade === 'all' || tradeIdOf(v) === trade)
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <Pill on={trade === 'all'} onClick={() => setTrade('all')}>All · {rows.length}</Pill>
        {TRADE_REGISTRY.filter(t => counts[t.id]).map(t => (
          <Pill key={t.id} on={trade === t.id} onClick={() => setTrade(t.id)}>{t.name} · {counts[t.id]}</Pill>
        ))}
      </div>
      {shown.map(v => <VersionCard key={v.id} v={v} cfg={cfg} onDone={load} />)}
    </>
  )
}

const Pill = ({ on, onClick, children }) => (
  <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${on ? 'bg-plum-700 text-white' : 'bg-white text-ink/70 ring-1 ring-ink/10'}`}>{children}</button>
)

/** An answer as an operator reads it: option labels, not ids. */
function answerText(config, key, value) {
  const q = config ? questionsOf(config).find(x => x.id === key) : null
  const lab = id => q?.options?.find(o => o.id === id)?.label ?? id
  if (Array.isArray(value)) return value.map(x => (typeof x === 'object' ? (x.caption || x.kind || '·') : lab(x))).join(', ')
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean).join(' × ')
  if (q?.type === 'money') return rupees(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return `${lab(value)}${q?.suffix ? ` ${q.suffix}` : ''}`
}

function VersionCard({ v, cfg, onDone }) {
  const [note, setNote] = useState(v.review_note ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const tid = tradeIdOf(v)
  const config = CONFIG_BY_ID[tid]
  const isAnchor = tid === 'anchor_mc'
  const p = v.profile ?? {}, br = v.booking_rules ?? {}, ans = v.answers ?? {}
  const hour = v.rules.find(r => (r.rule_kind ?? r.model) === 'hour')
  const qLabel = k => (config ? questionsOf(config).find(x => x.id === k)?.label : null) ?? k.replace(/_/g, ' ')

  const otherText = Object.entries(ans).filter(([k, x]) => (k.endsWith('_other') || ['custom_category', 'other_service', 'other_description'].includes(k)) && String(x ?? '').trim())
  const licences = (br.compliance ?? [])
  const flags = [
    isAnchor && hour && cfg && hour.take_home_paise < cfg.min_take_home_hour_paise && `Hourly take-home ${rupees(hour.take_home_paise)} is below the floor ${rupees(cfg.min_take_home_hour_paise)}`,
    isAnchor && hour && cfg && hour.take_home_paise > cfg.max_take_home_hour_paise && `Hourly take-home ${rupees(hour.take_home_paise)} is above the ceiling ${rupees(cfg.max_take_home_hour_paise)}`,
    ...v.pkgs.map(k => {
      const s = k.calculation_snapshot ?? {}
      const gen = s.generated_take_home_paise, fin = s.final_take_home_paise
      if (!gen || !fin || gen === fin) return null
      const pct = Math.round((fin / gen - 1) * 100)
      return Math.abs(pct) >= 30 ? `${k.name} edited ${pct > 0 ? '+' : ''}${pct}% from the recommended price` : null
    }),
    !v.vendors?.is_verified && 'Partner identity is not verified yet',
    ...otherText.map(([k, x]) => `Free-text answer to review — ${qLabel(k.replace(/_other$/, ''))}: “${x}”`),
    ...licences.filter(d => v.docs[d] !== 'accepted').map(d => `${d} ${v.docs[d] ? `is ${v.docs[d]}` : 'not uploaded'} — stays on custom quotes until accepted`),
    !isAnchor && config && !['TIME_PERFORMER', 'PROJECT_QUOTE'].includes(config.archetype) && v.resources.length === 0 && 'No staff / stock / capacity declared — bookings cannot reserve anything',
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
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-600">{config?.name ?? v.trade}</p>
          <p className="text-[17px] font-extrabold">{p.display_name || p.stage_name || v.vendors?.business_name} <span className="text-ink/40">· v{v.version}</span></p>
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
          {(p.tagline || p.role) && <p className="text-[12.5px] font-bold">{p.tagline ?? p.role}</p>}
          {p.bio && <p className="text-[12.5px] text-ink/70">{p.bio}</p>}
          {isAnchor && <p className="text-[12.5px]">{(p.languages ?? []).map(l => `${l.name} (${l.level})`).join(', ')} · {(p.events ?? []).join(', ')}</p>}
          {p.video_url && <a className="text-[12.5px] font-bold text-plum-700" href={p.video_url} target="_blank" rel="noreferrer">Video</a>}
        </Box>
        {Object.keys(ans).length > 0 && (
          <Box title={`${config?.name ?? 'Trade'} answers`}>
            {Object.entries(ans).filter(([k, x]) => x !== null && x !== '' && !(Array.isArray(x) && !x.length) && !k.endsWith('_other'))
              .map(([k, x]) => <p key={k} className="text-[12.5px]"><span className="text-ink/55">{qLabel(k)}:</span> {answerText(config, k, x)}</p>)}
          </Box>
        )}
        <Box title="Pricing rules (take-home → customer)">
          {v.rules.length ? v.rules.map(r => (
            <p key={r.id} className="text-[12.5px]"><b>{ruleName(r)}</b> {rupees(r.take_home_paise)} → {rupees(r.customer_paise)}
              {r.included_hours ? ` · ${r.included_hours}h` : ''}{r.included_qty ? ` · ${r.included_qty} incl.` : ''}
              {r.min_qty ?? r.min_hours ? ` · min ${r.min_qty ?? r.min_hours}` : ''}{r.max_qty ?? r.max_hours ? ` · max ${r.max_qty ?? r.max_hours}` : ''}
              {r.price_mode === 'customer' ? ' · entered as customer price' : ''}{r.bands?.length ? ` · ${r.bands.length} bands` : ''}</p>
          )) : <p className="text-[12.5px] text-ink/50">Priced from the catalogue only.</p>}
          {(br.charges ?? []).map(c => <p key={c.id} className="text-[12.5px] text-ink/70">{c.label} ({c.role}): {rupees(c.take_home_paise)}</p>)}
        </Box>
        {v.menus?.length > 0 && (
          <Box title={`Menus (${v.menus.length})`}>
            {v.menus.map(m => {
              const dish = k => v.items.find(i => i.item_key === k)
              return <div key={m.id} className="mb-1.5"><p className="text-[12.5px]"><b>{m.name}</b> · {m.diet} · {m.price_model === 'quote' ? 'quote' : `${rupees(m.take_home_paise)} → ${rupees(m.customer_paise)} ${m.price_model === 'per_person' ? 'per guest' : 'fixed'}`} · min {m.min_guests ?? '—'}{m.max_guests ? `–${m.max_guests}` : ''}{m.child_take_home_paise ? ` · child ${rupees(m.child_take_home_paise)}` : ''}</p>
                <p className="text-[11.5px] text-ink/60">{(m.sambramo_catering_menu_items ?? []).sort((a, b) => a.sort_order - b.sort_order).map(i => `${dish(i.dish_key)?.name ?? '?'}${dish(i.dish_key)?.attributes?.diet === 'non_veg' ? ' (NV)' : ''}${i.included ? '' : ` +${rupees(i.extra_take_home_paise)}`}`).join(', ')}</p></div>
            })}
          </Box>
        )}
        {v.counters?.length > 0 && (
          <Box title={`Live counters (${v.counters.length})`}>
            {v.counters.map(c => <p key={c.id} className="text-[12.5px]"><b>{c.name}</b> · {c.price_model}{c.take_home_paise ? ` ${rupees(c.take_home_paise)}` : ''} · {c.duration_hours ?? '—'} h · {c.included_servings ?? '—'} servings · ×{c.available_qty}</p>)}
          </Box>
        )}
        {v.items.length > 0 && (
          <Box title={`${config?.catalogue?.title ?? 'Catalogue'} (${v.items.length})`}>
            {v.items.map(i => <p key={i.id} className="text-[12.5px]"><b>{i.name}</b>{i.attributes?.diet ? ` · ${i.attributes.diet}` : ''}{i.attributes?.allergens?.length ? ` · allergens: ${i.attributes.allergens.join(', ')}` : ''}{i.attributes?.legacy?.needs_review ? ' · ⚠ old value needs review' : ''} {i.take_home_paise != null ? `${rupees(i.take_home_paise)} → ${rupees(i.customer_paise)} / ${i.unit}` : (i.attributes?.menu_eligible ? 'in menus' : 'quote only')}
              {i.stock_qty != null ? ` · stock ${i.stock_qty}` : ''}{i.min_qty > 1 ? ` · min ${i.min_qty}` : ''}{i.lead_days ? ` · ${i.lead_days}d lead` : ''}</p>)}
          </Box>
        )}
        {v.pkgs.length > 0 && (
          <Box title="Packages (recommended → partner's)">
            {v.pkgs.map(k => {
              const s = k.calculation_snapshot ?? {}
              return <p key={k.id} className="text-[12.5px]"><b>{k.name}</b> {k.trade_inputs?.duration_hours ? `${k.trade_inputs.duration_hours}h · ` : ''}{s.generated_take_home_paise ? `${rupees(s.generated_take_home_paise)} → ` : ''}<b>{rupees(s.final_take_home_paise ?? k.trade_inputs?.take_home_paise)}</b> take-home · customer {rupees(k.trade_inputs?.customer_paise)}</p>
            })}
          </Box>
        )}
        <Box title="Add-ons, capacity & terms">
          {v.addons.map(a => <p key={a.id} className="text-[12.5px]">{a.label}: {rupees(a.take_home_paise)} ({a.unit}){a.included_in?.length ? ` · in ${a.included_in.join(', ')}` : ''}</p>)}
          {v.resources.map(r => <p key={r.label} className="text-[12.5px] text-ink/70">{r.label}: {r.quantity} {r.unit}</p>)}
          <p className="mt-1 text-[12.5px] text-ink/60">Advance {br.advance_pct}% · {br.cancellation} · notice {br.min_notice_days}d · quotes {br.custom_quotes === false ? 'off' : `${br.quote_hours}h`} · travel {v.travel_rules?.model ?? '—'}</p>
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

/* Partners' own dishes, proposed for the shared food catalogue. Accepting
   adds a reviewed master dish; nothing reaches other partners before that. */
function DishProposals() {
  const [rows, setRows] = useState(null)
  const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('sambramo_dish_proposals').select('*, vendors(business_name)').eq('status', 'pending').order('created_at')
    if (error) { setMsg(error.message); setRows([]); return }
    setRows(data ?? [])
  }, [])
  useEffect(() => { load() }, [load])
  async function decide(p, accept) {
    setMsg('')
    if (accept) {
      const id = 'SBM-PR-' + p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const { error } = await supabase.from('sambramo_master_dishes').upsert({ id, name: p.name, aliases: p.aliases ?? [], cuisine_ids: p.cuisine_ids ?? [],
        category_id: p.category_id, suggested_diet: p.suggested_diet, provenance: 'partner-proposal', review_status: 'reviewed', active: true }, { onConflict: 'id' })
      if (error) { setMsg(error.message); return }
      await supabase.from('sambramo_dish_proposals').update({ status: 'accepted', master_dish_id: id, reviewed_at: new Date().toISOString() }).eq('id', p.id)
    } else {
      await supabase.from('sambramo_dish_proposals').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', p.id)
    }
    load()
  }
  if (!rows) return <Loader2 className="animate-spin text-plum-600" />
  return (
    <div className="space-y-2">
      {msg && <p className="text-[12.5px] font-bold text-rose-700">{msg}</p>}
      {!rows.length && <p className="rounded-2xl bg-white p-6 text-center text-[13px] text-ink/55 ring-1 ring-ink/10">No dishes waiting.</p>}
      {rows.map(p => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4 ring-1 ring-ink/10">
          <div><p className="text-[14px] font-extrabold">{p.name}</p>
            <p className="text-[12px] text-ink/55">{p.vendors?.business_name} · {p.category_id ?? 'no category'} · {p.suggested_diet ?? 'diet not given'}{p.cuisine_ids?.length ? ` · ${p.cuisine_ids.join(', ')}` : ''}</p>
            {p.note && <p className="text-[12px] text-ink/60">{p.note}</p>}</div>
          <div className="flex gap-2">
            <button onClick={() => decide(p, true)} className="rounded-full bg-forest-600 px-4 py-2 text-[12.5px] font-extrabold text-white">Add to catalogue</button>
            <button onClick={() => decide(p, false)} className="rounded-full bg-rose-50 px-4 py-2 text-[12.5px] font-extrabold text-rose-700">Reject</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Seasons() {
  const [rows, setRows] = useState([])
  const [f, setF] = useState({ name: '', opens_at: '', closes_at: '', event_from: '', event_to: '', trades: [], permitted: ['hour', 'half_day', 'full_day'] })
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
      event_from: f.event_from, event_to: f.event_to, trades: f.trades, permitted_fields: f.permitted,
    })
    if (error) setErr(error.message); else { setF({ ...f, name: '' }); load() }
  }
  async function closeNow(id) { await supabase.from('sambramo_seasonal_windows').update({ closes_at: new Date().toISOString() }).eq('id', id); load() }
  const input = 'rounded-xl bg-[#f7f6fb] px-3 py-2 text-[13px] ring-1 ring-ink/10'
  const toggle = (k, x) => setF({ ...f, [k]: f[k].includes(x) ? f[k].filter(y => y !== x) : [...f[k], x] })
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
        <p className="pt-1 text-[12px] font-extrabold text-ink/55">Trades (none picked = every trade)</p>
        <div className="flex flex-wrap gap-1.5">{TRADE_REGISTRY.map(t => <Pill key={t.id} on={f.trades.includes(t.name)} onClick={() => toggle('trades', t.name)}>{t.name}</Pill>)}</div>
        <p className="pt-1 text-[12px] font-extrabold text-ink/55">Prices partners may change</p>
        <div className="flex flex-wrap gap-1.5">
          {[...Object.keys(RULE_KINDS).filter(k => k !== 'quote'), 'packages'].map(m => (
            <Pill key={m} on={f.permitted.includes(m)} onClick={() => toggle('permitted', m)}>{RULE_KINDS[m]?.label ?? 'Package prices'}</Pill>
          ))}
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
              <p className="text-[12px] text-ink/55">Submit {new Date(w.opens_at).toLocaleDateString('en-IN')} – {new Date(w.closes_at).toLocaleDateString('en-IN')} · events {w.event_from} → {w.event_to} · {w.trades?.length ? w.trades.join(', ') : 'all trades'} · {w.permitted_fields.join(', ')}</p></div>
            {open && <button onClick={() => closeNow(w.id)} className="rounded-full bg-rose-50 px-4 py-2 text-[12px] font-extrabold text-rose-700">Close now</button>}
          </div>
        )
      })}
    </div>
  )
}

/* Per-trade commission. Empty = the global default from Global settings. */
function Fees() {
  const [rows, setRows] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    supabase.from('sambramo_trade_pricing_policy').select('*').then(({ data, error }) => {
      if (error) { setMsg(`${error.message} — paste migration 20261010_07 first.`); setRows([]); return }
      setRows(TRADE_REGISTRY.map(t => ({ trade_id: t.id, name: t.name, ...(data ?? []).find(d => d.trade_id === t.id) })))
    })
  }, [])
  if (!rows) return <Loader2 className="animate-spin text-plum-600" />
  const set = (i, k, x) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: x, dirty: true } : r)))
  async function save() {
    setMsg('')
    const dirty = rows.filter(r => r.dirty)
    for (const r of dirty) {
      const num = x => (x === '' || x === null || x === undefined ? null : Number(x))
      const { error } = await supabase.from('sambramo_trade_pricing_policy').update({
        platform_fee_rate: num(r.platform_fee_rate), signature_uplift: num(r.signature_uplift), vip_factor: num(r.vip_factor),
        require_payout_for_instant: r.require_payout_for_instant ?? null, updated_at: new Date().toISOString(),
      }).eq('trade_id', r.trade_id)
      if (error) { setMsg(`${r.name}: ${error.message}`); return }
    }
    setRows(rows.map(r => ({ ...r, dirty: false })))
    setMsg(`Saved ${dirty.length} trade${dirty.length === 1 ? '' : 's'}. Applies to new submissions and new bookings; published prices do not change.`)
  }
  const cell = 'w-24 rounded-lg bg-[#f7f6fb] px-2 py-1.5 text-[13px] font-bold ring-1 ring-ink/10'
  return (
    <div className="space-y-3 rounded-[22px] bg-white p-5 ring-1 ring-ink/10">
      <p className="text-[12.5px] text-ink/60">Commission per trade (0.08 = 8%). Leave a box empty to use the global default.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead><tr className="text-[11px] uppercase tracking-[0.08em] text-ink/45"><th className="py-1">Trade</th><th>Fee</th><th>Signature ×</th><th>VIP ×</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.trade_id} className="border-t border-ink/[0.05]">
              <td className="py-1.5 pr-2 font-bold">{r.name}</td>
              <td><input type="number" step="0.005" className={cell} value={r.platform_fee_rate ?? ''} onChange={e => set(i, 'platform_fee_rate', e.target.value)} /></td>
              <td><input type="number" step="0.05" className={cell} value={r.signature_uplift ?? ''} onChange={e => set(i, 'signature_uplift', e.target.value)} /></td>
              <td><input type="number" step="0.05" className={cell} value={r.vip_factor ?? ''} onChange={e => set(i, 'vip_factor', e.target.value)} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <button onClick={save} className="rounded-full bg-plum-700 px-5 py-2.5 text-[13px] font-extrabold text-white">Save fees</button>
      {msg && <p className="text-[12.5px] font-bold text-ink/60">{msg}</p>}
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
        {field('platform_fee_rate', 'Default platform fee (0.08 = 8%)', '0.001')}
        {field('signature_uplift', 'Default Signature × Essential')}
        {field('vip_factor', 'Default VIP factor')}
        {field('price_lock_days', 'Price lock (days)', '1')}
        {field('min_take_home_hour_paise', 'Anchor min hourly take-home (paise)', '100')}
        {field('max_take_home_hour_paise', 'Anchor max hourly take-home (paise)', '100')}
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
