/**
 * Pricing Control Center for one listing of any trade on the shared engine.
 *
 * Read from the database (the published or pending listing version), never
 * regenerated on open: how the partner charges, their catalogue, packages,
 * add-ons and declared charges — each with what the CUSTOMER pays — plus the
 * server's readiness verdict (listing_readiness), the 15-day price lock and
 * any open seasonal window.
 *
 * A listing that was never re-listed on the new engine shows one thing only:
 * re-list it. Old setups are not bookable (forced re-onboarding).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, ArrowRight, CircleAlert, Hourglass, Lock, Pencil, Eye, Sparkles, RefreshCw } from 'lucide-react'
import ReadinessChecklist from './ReadinessChecklist'
import { SeasonalUpdate } from './PricingControlCenter'
import { Sheet } from '../anchor/ui'
import { supabase } from '../../../lib/supabase'
import { rupees } from '../../../lib/tierPackages'
import { configFor } from '../../../data/trades'
import { RULE_KINDS } from '../../../data/trades/schema'
import { buildTradePayload } from '../listing/payload'
import { useToast, friendlyError } from '../../../context/ToastContext'

const fmt = d => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const STATUS = {
  LIVE: ['Live', 'bg-forest-50 text-forest-700'], UNDER_REVIEW: ['In review', 'bg-amber-50 text-amber-800'],
  ACTION_REQUIRED: ['Changes needed', 'bg-rose-50 text-rose-700'], REJECTED: ['Changes needed', 'bg-rose-50 text-rose-700'], DRAFT: ['Draft', 'bg-ink/5 text-ink/60'],
}

export function useListingPricing(service) {
  const id = service?.id
  const [state, setState] = useState({ loading: true })
  const load = useCallback(async () => {
    if (!id) { setState({ loading: false }); return }
    setState(s => ({ ...s, loading: true }))
    const { data: versions, error } = await supabase.from('sambramo_listing_versions')
      .select('id, version, status, trade_id, seasonal_window_id, effective_from, effective_to, profile, answers, booking_rules, travel_rules, submitted_at, published_at, price_locked_until, review_note')
      .eq('vendor_service_id', id).order('version', { ascending: false })
    if (error) { setState({ loading: false, error: error.message }); return }
    const ordinary = (versions ?? []).filter(v => !v.seasonal_window_id)
    const live = ordinary.find(v => v.status === 'LIVE') ?? null
    const pending = ordinary.find(v => ['UNDER_REVIEW', 'ACTION_REQUIRED', 'DRAFT', 'REJECTED'].includes(v.status) && (!live || v.version > live.version)) ?? null
    const seasonal = (versions ?? []).filter(v => v.seasonal_window_id && ['LIVE', 'UNDER_REVIEW', 'ACTION_REQUIRED'].includes(v.status))
    const current = live ?? pending
    if (!current) { setState({ loading: false, empty: true }); return }
    const now = new Date().toISOString()
    const [rules, addons, packages, items, readiness, windows] = await Promise.all([
      supabase.from('sambramo_rate_rules').select('*').eq('listing_version_id', current.id),
      supabase.from('sambramo_addon_rules').select('*').eq('listing_version_id', current.id),
      supabase.from('sambramo_trade_packages').select('id, name, status, commercial_inputs, trade_inputs, calculation_snapshot').eq('listing_version_id', current.id),
      supabase.from('sambramo_catalogue_items').select('*').eq('listing_version_id', current.id).order('sort_order'),
      supabase.rpc('listing_readiness', { p_vendor_service_id: id }),
      supabase.from('sambramo_seasonal_windows').select('*').lte('opens_at', now).gte('closes_at', now),
    ])
    const window = (windows.data ?? []).find(w => !w.trades?.length || w.trades.includes(service.category)) ?? null
    setState({
      loading: false, live, pending, current, seasonal, window,
      rules: rules.data ?? [], addons: addons.data ?? [], items: items.data ?? [],
      packages: (packages.data ?? []).filter(p => p.status !== 'ARCHIVED'), readiness: readiness.data ?? null,
    })
  }, [id, service?.category])
  useEffect(() => { load() }, [load])
  return { ...state, reload: load }
}

export default function TradePricing({ service, onEdit, onOpenPayout }) {
  const config = configFor(service.category)
  const d = useListingPricing(service)
  const toast = useToast()
  const [sheet, setSheet] = useState(null)
  const [proposed, setProposed] = useState({})
  const [busy, setBusy] = useState(false)
  const answers = service.specs?.trade_v1 ?? null

  /* Fields a seasonal window lets the partner change: enabled rules whose kind
     it permits, and catalogue prices when it permits that kind of rule. */
  const seasonalFields = useMemo(() => {
    if (!d.window || !answers) return []
    const ok = k => d.window.permitted_fields?.includes(k)
    const rules = Object.entries(answers.rules ?? {}).filter(([, r]) => r?.on && r.amount_paise > 0)
      .map(([k, r]) => ({ id: `rule:${k}`, label: RULE_KINDS[k]?.label ?? k, current_paise: r.amount_paise, locked: !ok(k) }))
    const items = (answers.catalogue ?? []).map(it => {
      const id = ['price', 'unit_price', 'rate', 'base_rate', 'fee', 'per_piece'].find(x => Number(it.answers?.[x]) > 0)
      return id && { id: `item:${it.item_key}:${id}`, label: it.answers.name ?? it.item_key, current_paise: it.answers[id],
        locked: !(ok('catalogue') || ok('rental') || ok('space')) }
    }).filter(Boolean)
    const pkgs = (answers.packages ?? []).map(p => ({ id: `pkg:${p.key}`, label: `${p.name} package`, current_paise: p.take_home_paise, locked: !ok('packages') }))
    return [...rules, ...items, ...pkgs]
  }, [d.window, answers])

  async function submitSeasonal() {
    setBusy(true)
    try {
      const next = structuredClone(answers)
      for (const [key, typed] of Object.entries(proposed)) {
        if (String(typed).trim() === '') continue
        const paise = Math.round(Number(typed) * 100)
        const [kind, a, b] = key.split(':')
        if (kind === 'rule') next.rules[a].amount_paise = paise
        if (kind === 'item') { const it = next.catalogue.find(x => x.item_key === a); if (it) it.answers[b] = paise }
        if (kind === 'pkg') { const p = next.packages.find(x => x.key === a); if (p) p.take_home_paise = paise }
      }
      const payload = { ...buildTradePayload(config, next), seasonal_window_id: d.window.id,
        effective_from: d.window.event_from, effective_to: d.window.event_to }
      const { error } = await supabase.rpc('submit_listing_version', { p_vendor_service_id: service.id, p_payload: payload })
      if (error) throw error
      toast.success('Seasonal prices sent for review.')
      setSheet(null); setProposed({}); d.reload()
    } catch (e) { toast.error(friendlyError(e)) } finally { setBusy(false) }
  }

  if (!config) return null
  if (d.loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-plum-600" /></div>
  if (d.empty) {
    const legacy = !answers && (service.price || service.specs)
    return (
      <div className={`rounded-[22px] p-5 ring-1 ${legacy ? 'bg-amber-50 ring-amber-200' : 'bg-gradient-to-br from-plum-50 to-white ring-plum-100'}`}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-600">{config.name}</p>
        <p className="mt-1 text-[16px] font-extrabold text-plum-950">{legacy ? 'Re-list with the new flow' : `Finish your ${config.serviceNoun} setup`}</p>
        <p className="mt-1 text-[13px] text-ink/65">{legacy
          ? 'Sambramo now prices every service from your own rates, stock and capacity. Your old setup cannot be booked until you set it up again — it takes a few minutes, and your details are filled in.'
          : 'Your prices appear here once you submit them for review.'}</p>
        <button type="button" onClick={onEdit} className="mt-4 flex h-11 items-center gap-1.5 rounded-full bg-plum-700 px-5 text-[13.5px] font-extrabold text-white">
          {legacy ? <><RefreshCw size={15} /> Re-list now</> : <>Continue setup <ArrowRight size={15} /></>}
        </button>
      </div>
    )
  }

  const v = d.current
  // The trade's fee as the server applied it to this version.
  const priced = [...d.rules, ...d.items].find(r => r.take_home_paise > 0 && r.customer_paise > 0)
  const fee = Number(d.packages[0]?.calculation_snapshot?.platform_fee_rate)
    || (priced ? Math.round((1 - priced.take_home_paise / priced.customer_paise) * 1000) / 1000 : null)
  const locked = d.live?.price_locked_until && new Date(d.live.price_locked_until) > new Date()
  const [label, tone] = STATUS[v.status] ?? STATUS.DRAFT
  const cust = take => (fee ? Math.round(take / (1 - fee) / 10) * 10 : null)

  return (
    <div className="space-y-3">
      <div className="rounded-[22px] bg-gradient-to-br from-plum-700 to-plum-950 p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-200">{config.name} · v{v.version}</p>
            <p className="mt-1 truncate text-[18px] font-extrabold">{v.profile?.display_name ?? service.name}</p>
            {d.live?.published_at && <p className="text-[12px] text-plum-100">Live since {fmt(d.live.published_at)}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${tone}`}>{label}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={locked} onClick={onEdit}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-extrabold text-plum-800 disabled:opacity-60">
            {locked ? <><Lock size={14} /> Editable from {fmt(d.live.price_locked_until)}</> : <><Pencil size={14} /> Edit listing</>}
          </button>
          {d.live && <a href={`/book/s/${config.id}/${service.id}`} className="flex h-10 items-center gap-1.5 rounded-full bg-white/15 px-4 text-[13px] font-extrabold"><Eye size={14} /> Preview</a>}
        </div>
      </div>

      {(v.status === 'ACTION_REQUIRED' || v.status === 'REJECTED') && (
        <div className="flex gap-2.5 rounded-[20px] bg-rose-50 p-4 ring-1 ring-rose-200">
          <CircleAlert size={17} className="mt-0.5 shrink-0 text-rose-600" />
          <div><p className="text-[13.5px] font-extrabold text-rose-900">Sambramo asked for changes</p>
            <p className="mt-0.5 text-[12.5px] text-rose-900/80">{v.review_note || 'Open your listing to see what to change.'}</p>
            <button type="button" onClick={onEdit} className="mt-2 text-[12.5px] font-extrabold text-rose-800 underline">Update listing</button></div>
        </div>
      )}
      {d.live && d.pending && (
        <div className="flex gap-2.5 rounded-[20px] bg-amber-50 p-4 ring-1 ring-amber-200">
          <Hourglass size={17} className="mt-0.5 shrink-0 text-amber-700" />
          <p className="text-[12.5px] font-semibold text-amber-900">Version {d.pending.version} is with our team. Customers keep seeing your live prices until it is approved.</p>
        </div>
      )}
      {d.seasonal.filter(s => s.status === 'LIVE').map(s => (
        <div key={s.id} className="flex gap-2.5 rounded-[20px] bg-white p-4 ring-1 ring-amber-200">
          <Sparkles size={17} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-[12.5px] font-semibold text-ink/75">Seasonal prices are live for {fmt(s.effective_from)} – {fmt(s.effective_to)}.</p>
        </div>
      ))}
      {d.window && d.live && (
        <button type="button" onClick={() => setSheet('seasonal')}
          className="flex w-full items-center gap-2.5 rounded-[20px] bg-amber-100 p-4 text-left ring-1 ring-amber-300">
          <Sparkles size={17} className="shrink-0 text-amber-700" />
          <span className="flex-1 text-[13px] font-extrabold text-amber-900">{d.window.name} is open — update prices until {fmt(d.window.closes_at)}</span>
          <ArrowRight size={16} className="text-amber-800" />
        </button>
      )}

      {d.readiness?.items && <ReadinessChecklist state={d.readiness.state} items={d.readiness.items} quotesOk={d.readiness.quotes_ok}
        onOpen={item => (item.id === 'payout' ? onOpenPayout?.() : onEdit?.())} />}

      {d.rules.length > 0 && (
        <Section title="How you charge">
          {d.rules.map(r => <Line key={r.id} k={`${RULE_KINDS[r.rule_kind]?.label ?? r.rule_kind}${r.label ? ` · ${r.label}` : ''}`}
            v={rupees(r.customer_paise)} sub={`You earn ${rupees(r.take_home_paise)}${r.min_qty ? ` · min ${r.min_qty}` : ''}${r.included_hours ? ` · ${r.included_hours} hrs incl.` : ''}${r.included_qty ? ` · ${r.included_qty} incl.` : ''}`} />)}
        </Section>
      )}
      {d.items.length > 0 && (
        <Section title={config.catalogue?.title ?? 'Your list'}>
          {d.items.map(i => <Line key={i.id} k={i.name} v={i.customer_paise ? rupees(i.customer_paise) : 'On request'}
            sub={[i.take_home_paise && `You earn ${rupees(i.take_home_paise)} / ${i.unit}`, i.stock_qty != null && `${i.stock_qty} in stock`, i.lead_days && `${i.lead_days} days lead`].filter(Boolean).join(' · ')} />)}
        </Section>
      )}
      {d.packages.length > 0 && (
        <Section title="Packages">
          {d.packages.map(p => <Line key={p.id} k={p.name} v={rupees(p.trade_inputs?.customer_paise)}
            sub={`You earn ${rupees(p.trade_inputs?.take_home_paise)}${p.trade_inputs?.duration_hours ? ` · ${p.trade_inputs.duration_hours} hrs` : ''}`} />)}
        </Section>
      )}
      {(d.addons.length > 0 || (v.booking_rules?.charges ?? []).length > 0) && (
        <Section title="Extras & charges">
          {d.addons.map(a => <Line key={a.id} k={a.label} v={rupees(a.customer_paise)} sub={a.unit.replace('per_', 'per ')} />)}
          {(v.booking_rules?.charges ?? []).map(c => <Line key={c.id} k={c.label} v={cust(c.take_home_paise) ? rupees(cust(c.take_home_paise)) : rupees(c.take_home_paise)} sub={`You earn ${rupees(c.take_home_paise)}`} />)}
        </Section>
      )}

      <Sheet open={sheet === 'seasonal'} onOpenChange={o => !o && setSheet(null)} title="Update seasonal prices">
        {d.window && (seasonalFields.length
          ? <SeasonalUpdate window={{ from: d.window.event_from, to: d.window.event_to }} fields={seasonalFields}
              value={proposed} onChange={setProposed} onSubmit={busy ? undefined : submitSeasonal} />
          : <p className="text-[13px] text-ink/60">Open your listing once to refresh it, then come back here.</p>)}
      </Sheet>
    </div>
  )
}

const Section = ({ title, children }) => (
  <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
    <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">{title}</p>{children}
  </div>
)
const Line = ({ k, v, sub }) => (
  <div className="flex items-start justify-between gap-3 border-t border-ink/[0.05] py-2.5 first:border-0">
    <div className="min-w-0"><p className="text-[13.5px] font-extrabold text-ink">{k}</p>{sub && <p className="text-[11.5px] font-bold text-ink/50">{sub}</p>}</div>
    <p className="shrink-0 text-[14px] font-extrabold text-ink">{v}</p>
  </div>
)
