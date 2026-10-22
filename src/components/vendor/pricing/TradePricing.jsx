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
import { Loader2, ArrowRight, CircleAlert, Hourglass, Lock, Pencil, Eye, RefreshCw, CalendarRange } from 'lucide-react'
import ReadinessChecklist from './ReadinessChecklist'
import PricingControlCenter, { SeasonalUpdate } from './PricingControlCenter'
import { Sheet } from '../anchor/ui'
import { supabase } from '../../../lib/supabase'
import { rupees } from '../../../lib/tierPackages'
import PackageCarousel from '../packages/PackageCarousel'
import TradeCustomerPreviewScreen from './TradeCustomerPreviewScreen'
import { stageForSection } from '../../customer/storefront/storefrontModel'
import { fetchWork, signedUrlsFor } from '../../../lib/partnerWork'
import { configFor } from '../../../data/trades'
import { RULE_KINDS } from '../../../data/trades/schema'
import { buildTradePayload } from '../listing/payload'
import { useToast, friendlyError } from '../../../context/ToastContext'

/* The six moderation states a listing version can be in, said in words
   a partner can act on. The raw enum is DRAFT / UNDER_REVIEW /
   ACTION_REQUIRED / LIVE / ARCHIVED / REJECTED. */
const PREVIEW_NOTE = {
  DRAFT: 'A preview of your draft. Customers cannot see this yet.',
  UNDER_REVIEW: 'This version is with our team. Customers still see your live listing, if you have one.',
  ACTION_REQUIRED: 'This version needs a change before it can go live.',
  REJECTED: 'This version was not accepted. Make the changes and send it again.',
  ARCHIVED: 'This version is hidden from customers.',
}

const STATUS_LABEL = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'In review',
  ACTION_REQUIRED: 'Action needed',
  LIVE: 'Live',
  REJECTED: 'Needs changes',
  ARCHIVED: 'Hidden',
}

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

export default function TradePricing({ service, vendor, onEdit, onOpenPayout }) {
  const config = configFor(service.category)
  const d = useListingPricing(service)
  const toast = useToast()
  const [sheet, setSheet] = useState(null)

  /* ── "Preview my customer listing", for every trade ───────────────
     listing_preview() serves the version the partner should be looking
     at -- the pending one while it is in review, the live one after --
     and returns nothing to anyone but the owner.

     Until 20261012_01 is pasted the function does not exist, so a
     PGRST202 falls back to listing_public(), which answers only for a
     live listing. The preview then works exactly as well as it did
     before the migration and no better, which is the honest failure. */
  const [preview, setPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [previewRequest, setPreviewRequest] = useState(0)
  const [previewError, setPreviewError] = useState('')
  const [previewMedia, setPreviewMedia] = useState({ loading: false, rows: [], unavailable: false })
  const [selectedPreviewPackage, setSelectedPreviewPackage] = useState(null)
  const [previewActionNote, setPreviewActionNote] = useState('')
  useEffect(() => {
    if (!preview) return
    let alive = true
    setPreviewData(null)
    setPreviewError('')
    setPreviewActionNote('')
    ;(async () => {
      try {
        let { data, error } = await supabase.rpc('listing_preview', { p_vendor_service_id: service.id })
        if (error?.code === 'PGRST202') {
          const fallback = await supabase.rpc('listing_public', { p_vendor_service_id: service.id })
          data = fallback.data ? { ...fallback.data, is_live: true } : fallback.data
          error = fallback.error
        }
        if (error) throw error
        if (alive) setPreviewData(data ?? { state: 'NONE' })
      } catch (error) {
        if (alive) {
          setPreviewError(error?.message || 'Could not load this listing preview.')
          setPreviewData({ state: 'ERROR' })
        }
      }
    })()
    return () => { alive = false }
  }, [preview, service.id, previewRequest])

  useEffect(() => {
    if (!preview || !vendor?.id) {
      setPreviewMedia({ loading: false, rows: [], unavailable: false })
      return
    }
    let alive = true
    setPreviewMedia({ loading: true, rows: [], unavailable: false })
    ;(async () => {
      try {
        const result = await fetchWork(vendor.id)
        const sourceRows = (result.rows ?? []).filter(row => ['photo', 'video'].includes(row.kind))
        const visibleRows = previewData?.is_live === true
          ? sourceRows.filter(row => row.review_status === 'live')
          : sourceRows
        const urls = await signedUrlsFor(visibleRows.map(row => row.storage_path), 600)
        if (alive) setPreviewMedia({
          loading: false,
          unavailable: !!result.unavailable,
          rows: visibleRows.map(row => ({ ...row, url: urls[row.storage_path] || '' })).filter(row => row.url),
        })
      } catch {
        if (alive) setPreviewMedia({ loading: false, rows: [], unavailable: false })
      }
    })()
    return () => { alive = false }
  }, [preview, vendor?.id, previewData?.is_live])
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
  const profile = v.profile && typeof v.profile === 'object' ? v.profile : {}
  const booking = v.booking_rules && typeof v.booking_rules === 'object' ? v.booking_rules : {}
  const travel = v.travel_rules && typeof v.travel_rules === 'object' ? v.travel_rules : {}
  const asList = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(Boolean) : []
  const displayValue = value => typeof value === 'string' || typeof value === 'number' ? String(value) : value?.label ?? value?.name ?? value?.value ?? value?.id ?? ''
  const positiveNumber = value => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null
  const humanize = value => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
  const modelNames = { hour: 'Per hour', session: 'Per session', event: 'Per event', half_day: 'Half-day', full_day: 'Full-day', multi_day: 'Multi-day' }
  const modelUnits = { hour: '/hr', session: '/session', event: '/event', half_day: '/half-day', full_day: '/day', multi_day: '/day' }
  const controlPackages = d.packages.map((item, index) => {
    const inputs = item.trade_inputs && typeof item.trade_inputs === 'object' ? item.trade_inputs : {}
    const commercial = item.commercial_inputs && typeof item.commercial_inputs === 'object' ? item.commercial_inputs : {}
    const snapshot = item.calculation_snapshot && typeof item.calculation_snapshot === 'object' ? item.calculation_snapshot : {}
    const inclusions = asList(commercial.inclusions ?? inputs.inclusions).map(displayValue).filter(Boolean)
    const rate = positiveNumber(inputs.take_home_paise ?? snapshot.take_home_paise ?? item.take_home_paise)
    const customerPrice = positiveNumber(inputs.customer_paise ?? snapshot.customer_paise ?? item.customer_paise)
    const hours = positiveNumber(inputs.duration_hours ?? inputs.included_hours ?? snapshot.duration_hours)
    return {
      key: item.id ?? commercial.tier ?? item.name ?? String(index),
      tier: commercial.tier ?? inputs.tier ?? item.name,
      name: item.name || humanize(commercial.tier) || 'Package',
      status: item.status,
      price_paise: customerPrice,
      take_home_paise: rate,
      rate_paise: rate,
      hours,
      sessions: positiveNumber(inputs.included_sessions ?? snapshot.included_sessions),
      inclusions,
      description: item.description || commercial.description || inputs.description || '',
      edited: inputs.edited_by_partner === true,
      basis: snapshot.basis,
    }
  })
  const controlModels = d.rules.map((rule, index) => {
    const id = rule.model || rule.rule_kind || rule.id || ('model_' + index)
    const includedHours = positiveNumber(rule.included_hours)
    const minHours = positiveNumber(rule.min_hours)
    const maxHours = positiveNumber(rule.max_hours)
    const includedSessions = positiveNumber(rule.included_sessions)
    const maxDays = positiveNumber(rule.multi_day?.max_days)
    const ruleSummary = [
      includedHours ? includedHours + ' hrs included' : null,
      minHours ? 'min ' + minHours + ' hrs' : null,
      maxHours ? 'max ' + maxHours + ' hrs' : null,
      includedSessions ? includedSessions + ' session' + (includedSessions === 1 ? '' : 's') : null,
      maxDays ? 'up to ' + maxDays + ' days' : null,
    ].filter(Boolean).join(' · ') || 'Saved rate'
    return {
      id,
      label: modelNames[id] || humanize(id),
      customer_paise: positiveNumber(rule.customer_paise),
      unit: modelUnits[id] || (rule.unit ? '/' + humanize(rule.unit) : ''),
      rules: ruleSummary,
    }
  })
  const controlAddons = d.addons.map((addon, index) => ({
    id: addon.id || addon.addon_id || addon.label || String(index),
    name: addon.label || addon.name || 'Optional extra',
    paise: positiveNumber(addon.take_home_paise),
    unit: humanize(addon.unit || 'per event'),
    in: asList(addon.included_in).map(value => humanize(value)),
  }))
  const chargeRows = []
  for (const rule of d.rules) {
    const overtime = positiveNumber(rule.extra_hour_take_home_paise)
    if (overtime) chargeRows.push({ k: 'Overtime · ' + (modelNames[rule.model] || humanize(rule.model)), v: rupees(overtime) + ' per hour' })
    const extraSession = positiveNumber(rule.extra_session_take_home_paise)
    if (extraSession) chargeRows.push({ k: 'Extra session · ' + (modelNames[rule.model] || humanize(rule.model)), v: rupees(extraSession) + ' each' })
    if (rule.overtime_step_minutes) chargeRows.push({ k: 'Overtime increments', v: rule.overtime_step_minutes + '-minute steps after ' + (rule.overtime_grace_minutes || 0) + ' min' })
  }
  for (const charge of asList(booking.charges)) {
    if (charge && typeof charge === 'object') chargeRows.push({
      k: charge.label || charge.name || 'Booking charge',
      v: positiveNumber(charge.take_home_paise) ? rupees(charge.take_home_paise) : displayValue(charge.value ?? charge.description) || 'As listed',
    })
  }
  const travelModel = travel.model || travel.scope || travel.policy
  const travelLabels = { included_radius: 'Included within your area', included: 'Included within your area', flat: 'Flat outstation fee', per_km: 'Per km beyond your area', customer_arranged: 'Customer arranges travel and stay', actuals_capped: 'Actuals, capped', custom: 'Custom quote' }
  if (travelModel) chargeRows.push({ k: 'Travel', v: travelLabels[travelModel] || humanize(travelModel) })
  const flatTravel = positiveNumber(travel.flat_take_home_paise)
  if (flatTravel) chargeRows.push({ k: 'Outstation fee', v: rupees(flatTravel) })
  const perKm = positiveNumber(travel.per_km_take_home_paise)
  if (perKm) chargeRows.push({ k: 'Travel per km', v: rupees(perKm) + ' per km' })

  const bookingRules = []
  const pushRule = (label, value) => { if (value !== undefined && value !== null && value !== '') bookingRules.push({ k: label, v: value }) }
  if (booking.instant !== undefined && booking.instant !== null) pushRule('Instant booking', booking.instant === true || booking.instant === 'true' ? 'On' : 'Off')
  if (booking.custom_quotes !== undefined && booking.custom_quotes !== null) pushRule('Custom quotes', booking.custom_quotes === false ? 'Off' : 'On' + (booking.quote_hours ? ' · reply within ' + booking.quote_hours + ' hrs' : ''))
  if (booking.advance_pct != null) pushRule('Advance payment', booking.advance_pct + '% at booking')
  if (booking.payment_policy) pushRule('Payment terms', humanize(booking.payment_policy))
  if (booking.min_notice_days != null) pushRule('Minimum notice', booking.min_notice_days + ' day' + (Number(booking.min_notice_days) === 1 ? '' : 's'))
  if (booking.cancellation) pushRule('Cancellation', humanize(booking.cancellation))
  if (booking.cancellation_details) pushRule('Cancellation details', booking.cancellation_details)
  if (booking.reschedule_policy) pushRule('Rescheduling', humanize(booking.reschedule_policy))
  if (booking.waiting?.free_minutes != null) pushRule('Waiting time', booking.waiting.free_minutes + ' min free')
  if (booking.surcharge?.pct != null) pushRule('Surcharges', '+' + booking.surcharge.pct + '%')
  if (booking.minimum_order != null) pushRule('Minimum order', String(booking.minimum_order))
  const events = asList(profile.events ?? profile.event_types ?? profile.supported_events ?? profile.specialties).map(displayValue).filter(Boolean)
  const languages = asList(profile.languages ?? profile.language).map(displayValue).filter(Boolean)
  const formats = asList(profile.formats ?? profile.service_formats ?? profile.service_types).map(displayValue).filter(Boolean)
  const cityValues = [profile.locality, profile.city, service.city, vendor?.area, vendor?.city].filter(Boolean).map(displayValue).filter(Boolean)
  const city = cityValues.filter((value, index) => cityValues.indexOf(value) === index).join(', ')
  const displayName = profile.stage_name || profile.display_name || profile.business_name || profile.name || vendor?.business_name || service.name || config.name
  const years = profile.years ?? profile.years_experience ?? profile.years_active
  const audience = profile.max_audience ?? profile.max_guests ?? profile.capacity
  const controlData = {
    status: v.status === 'REJECTED' ? 'ACTION_REQUIRED' : v.status,
    version: v.version,
    published_at: d.live?.published_at || v.published_at,
    price_locked_until: d.live?.price_locked_until || v.price_locked_until,
    now: new Date().toISOString(),
    editable: !d.live,
    seasonal: d.window ? { name: d.window.name, deadline: d.window.closes_at } : null,
    packages: controlPackages,
    listing: {
      initials: String(displayName || 'S').slice(0, 2).toUpperCase(),
      stage_name: displayName,
      role: profile.role ? humanize(profile.role) : config.name,
      years,
      tagline: profile.tagline || profile.bio || profile.about || '',
      city,
      travel: travel.scope ? (/^\d+$/.test(String(travel.scope)) ? 'up to ' + travel.scope + ' km' : humanize(travel.scope)) : '',
      languages: languages.join(' · '),
      audience: audience != null && audience !== '' ? (Number.isFinite(Number(audience)) ? Number(audience).toLocaleString('en-IN') : String(audience)) : '',
      formats: formats.join(', '),
      events,
    },
    models: controlModels,
    addons: controlAddons,
    charges: chargeRows,
    rules: bookingRules,
  }
  const controlBanner = (
    <>
      {(v.status === 'ACTION_REQUIRED' || v.status === 'REJECTED') ? (
        <div className="flex gap-2.5 rounded-[20px] bg-rose-50 p-4 ring-1 ring-rose-200">
          <CircleAlert size={17} className="mt-0.5 shrink-0 text-rose-600" />
          <div><p className="text-[13.5px] font-extrabold text-rose-900">Sambramo asked for changes</p><p className="mt-0.5 text-[12.5px] text-rose-900/80">{v.review_note || 'Open your listing to see what to change.'}</p><button type="button" onClick={onEdit} className="mt-2 text-[12.5px] font-extrabold text-rose-800 underline">Update listing</button></div>
        </div>
      ) : null}
      {(d.live && d.pending) ? <div className="flex gap-2.5 rounded-[20px] bg-amber-50 p-4 ring-1 ring-amber-200"><Hourglass size={17} className="mt-0.5 shrink-0 text-amber-700"/><p className="text-[12.5px] font-semibold text-amber-900">Version {d.pending.version} is with our team. Customers keep seeing your live prices until it is approved.</p></div> : null}
      {d.seasonal.filter(item => item.status === 'LIVE').map(item => <div key={item.id} className="flex gap-2.5 rounded-[20px] bg-white p-4 ring-1 ring-amber-200"><CalendarRange size={17} className="mt-0.5 shrink-0 text-amber-600"/><p className="text-[12.5px] font-semibold text-ink/75">Seasonal prices are live for {fmt(item.effective_from)} – {fmt(item.effective_to)}.</p></div>)}
    </>
  )

  return (
    <div className="space-y-3">
      <PricingControlCenter
        data={controlData}
        banner={controlBanner}
        onEdit={() => onEdit?.()}
        onPayout={onOpenPayout}
        onSeasonal={() => setSheet('seasonal')}
        onPreview={() => setPreview(true)}
        onViewPackage={key => {
          const item = d.packages.find(pkg => [pkg.id, pkg.commercial_inputs?.tier, pkg.name].filter(Boolean).some(candidate => String(candidate) === String(key)))
          if (!item) { setSelectedPreviewPackage(null); return }
          const inputs = item.trade_inputs || {}
          const snapshot = item.calculation_snapshot || {}
          const included = asList(item.commercial_inputs?.inclusions ?? inputs.inclusions).map(displayValue).filter(Boolean)
          const rate = positiveNumber(inputs.take_home_paise ?? snapshot.take_home_paise)
          setSelectedPreviewPackage({
            name: item.name,
            rate_paise: rate,
            customer_paise: rate,
            hours: positiveNumber(inputs.duration_hours ?? inputs.included_hours ?? snapshot.duration_hours),
            description: item.description || item.commercial_inputs?.description || '',
            inclusions: included,
            addons: [],
          })
        }}
      />
      {preview && (
        <TradeCustomerPreviewScreen
          vendor={vendor}
          service={service}
          config={config}
          tradeName={config?.name || service?.category || service?.name}
          listing={previewData ? {
            ...previewData,
            terms: previewData.terms || (previewData.booking_rules ? { ...previewData.booking_rules } : {}),
            business_name: previewData.business_name ?? vendor?.business_name,
            avatar_url: previewData.avatar_url ?? vendor?.avatar_url,
            city: previewData.city ?? [vendor?.area, vendor?.city].filter(Boolean).join(', '),
            rating: previewData.rating ?? vendor?.rating_avg,
            review_count: previewData.review_count ?? vendor?.review_count,
            /* The green badge is for a partner Sambramo has approved. */
            is_verified: (previewData.is_verified ?? vendor?.is_verified) === true || vendor?.verification_status === 'approved',
          } : null}
          previewLoading={!previewData && !previewError}
          previewError={previewError}
          previewState={previewData?.status || previewData?.state}
          onRetry={() => { setPreviewData(null); setPreviewError(''); setPreviewRequest(value => value + 1) }}
          media={previewMedia.rows.length ? previewMedia.rows : undefined}
          onClose={() => setPreview(false)}
          onAction={message => setPreviewActionNote(message)}
          /* Edit beside a section opens the form at that section. */
          onEditSection={section => { setPreview(false); onEdit?.(stageForSection(section, config)) }}
        />
      )}

      <Sheet open={!!selectedPreviewPackage} onOpenChange={o => !o && setSelectedPreviewPackage(null)} title={selectedPreviewPackage?.name ?? 'Package details'}>
        {selectedPreviewPackage && (
          <div className="space-y-3">
            <div className="rounded-[22px] bg-gradient-to-br from-plum-50 to-white p-4 ring-1 ring-plum-100">
              <p className="text-[25px] font-extrabold tracking-tight text-plum-950">{Number(selectedPreviewPackage.rate_paise ?? selectedPreviewPackage.customer_paise) > 0 ? rupees(selectedPreviewPackage.rate_paise ?? selectedPreviewPackage.customer_paise) : 'Price on request'}</p><p className="text-[11.5px] font-bold text-ink/55">Your rate</p>
              {selectedPreviewPackage.hours && <p className="mt-1 text-[12px] font-bold text-ink/55">{selectedPreviewPackage.hours} hours included</p>}
              {selectedPreviewPackage.description && <p className="mt-2 text-[12.5px] leading-relaxed text-ink/70">{selectedPreviewPackage.description}</p>}
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Included in this package</p>
            {(selectedPreviewPackage.inclusions ?? []).length
              ? selectedPreviewPackage.inclusions.map((item, i) => <p key={i} className="flex items-start gap-2 text-[12.5px] font-semibold text-ink/75"><span className="text-emerald-700">✓</span><span>{typeof item === 'string' ? item : item.label ?? item.id}</span></p>)
              : <p className="text-[12.5px] text-ink/55">The saved listing does not provide a separate inclusions list for this package.</p>}
            {(selectedPreviewPackage.addons ?? []).length > 0 && (
              <>
                <p className="pt-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Available extras</p>
                {selectedPreviewPackage.addons.map((item, i) => <Line key={item.addon_id ?? item.id ?? i} k={item.label ?? item.name} v={item.customer_paise ? rupees(item.customer_paise) : 'As listed'} sub={item.unit} />)}
              </>
            )}
          </div>
        )}
      </Sheet>

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
