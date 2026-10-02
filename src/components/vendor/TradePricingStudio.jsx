import { useCallback, useEffect, useMemo, useState } from 'react'
import './TradePricingStudio.css'
import './TradeCustomerPreview.css'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronDown, ChevronLeft,
  CirclePlus, Eye, FileText, Images, Info, Loader2, Package, Pencil,
  Plus, Ruler, ShieldCheck, Sparkles, Trash2, WalletCards,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { fetchWork, signedUrlsFor } from '../../lib/partnerWork'
import {
  EXCLUSIONS_BY_MODE,
  INCLUSIONS_BY_MODE,
  LEAD_TIME_PRESETS,
  PACKAGE_TIERS,
  PRICE_PRESETS,
  TRAVEL_POLICIES,
  getAddonSuggestions,
  getDescriptionSuggestions,
  getFieldSchema,
  getIncludedQuantityPresets,
  getMinimumOrderPresets,
  getPackageNameSuggestions,
  getTradePricingFields,
} from '../../data/sambramoPricingCatalog'
import WorkLibrary from './WorkLibrary'

const DEFAULT_UNITS = {
  PACKAGE: ['package', 'per event', 'per hour', 'per day', 'per function'],
  RATE_CARD: ['per trip', 'per hour', 'per day', 'per event'],
  CATALOG: ['per item', 'per piece', 'per batch', 'package', 'per event'],
  HYBRID: ['package', 'per guest', 'per person', 'per hour', 'per day', 'per event'],
  CUSTOM: ['custom quote', 'per event', 'per day', 'per project'],
}

const TRADE_UNITS = {
  E01: ['per guest', 'per plate', 'per event'],
  E02: ['per event', 'per hour', 'package'],
  E03: ['per event', 'per hour', 'package'],
  E04: ['per event', 'per function', 'package'],
  E05: ['per day', 'per event', 'per plate'],
  E06: ['per hour', 'per event', 'package'],
  E07: ['per set', 'per hour', 'per event'],
  E08: ['per function', 'per event', 'package'],
  E09: ['custom quote', 'per event', 'per project'],
  E10: ['per event', 'per day', 'package'],
  E11: ['per piece', 'per set', 'per event'],
  E12: ['per trip', 'per hour', 'per day'],
  E13: ['per event', 'per day', 'package'],
  E14: ['per kg', 'per cake', 'per item', 'package'],
  E15: ['per bride', 'per hour', 'per event'],
  E16: ['per hour', 'per event', 'package'],
  E17: ['per event', 'per hour', 'package'],
  E18: ['per vehicle', 'per hour', 'per event'],
  E19: ['per guard', 'per hour', 'per event'],
  E20: ['per guest', 'per event', 'package'],
  E21: ['per staff', 'per hour', 'per event'],
  E22: ['per day', 'per event', 'package'],
  E23: ['per unit', 'per day', 'per event'],
  E24: ['per ceremony', 'per event', 'package'],
  E25: ['per item', 'per piece', 'per event'],
  E26: ['per item', 'per set', 'per event'],
  L01: ['per trip', 'per hour', 'per day'],
  L02: ['per trip', 'per hour', 'per day'],
  L03: ['per trip', 'per hour', 'per day'],
  L04: ['per day', 'per item', 'package'],
  L05: ['per worker', 'per shift', 'per hour'],
  L06: ['per month', 'per day', 'per sq ft'],
  L07: ['per item', 'per piece', 'per batch'],
  L08: ['custom quote', 'per event', 'per project'],
}

const SECTION_META = [
  ['package', 'Package', 'Package card'],
  ['details', 'Trade Fields', 'Trade-specific details'],
  ['pricing', 'Pricing', 'Price and conditions'],
  ['addons', 'Add-ons', 'Optional extras'],
  ['preview', 'Preview', 'Customer-facing catalog'],
]

const SITE_DEPENDENT = new Set(['E04', 'E05', 'E10', 'E13', 'E17', 'E22', 'E23', 'L08'])

function unitsFor(config) {
  return TRADE_UNITS[config.trade_id] ?? DEFAULT_UNITS[config.mode] ?? DEFAULT_UNITS.PACKAGE
}

function presetsForMinimum(config, unit) {
  if (config.trade_id === 'L06') return unit === 'per month' ? [1, 3, 6, 12] : unit === 'per sq ft' ? [50, 100, 250, 500, 1000] : [1, 7, 14, 30]
  if (config.trade_id === 'E01' || unit.includes('guest') || unit.includes('person')) return [10, 25, 50, 75, 100, 150, 200, 300]
  if (unit.includes('hour')) return [1, 2, 4, 6, 8, 10]
  if (unit.includes('day')) return [1, 2, 3, 5, 7, 14]
  if (unit.includes('trip')) return [1, 2, 3, 4, 5]
  if (unit.includes('item') || unit.includes('piece')) return [1, 5, 10, 25, 50, 100]
  if (unit.includes('month')) return [1, 3, 6, 12]
  return getMinimumOrderPresets(config, unit)
}

function presetsForIncluded(config, unit) {
  if (config.trade_id === 'L06') return unit === 'per sq ft' ? [50, 100, 250, 500, 1000] : [0, 1, 3, 6, 12, 24]
  if (unit.includes('guest') || unit.includes('person')) return [10, 25, 50, 75, 100, 150, 200, 300]
  if (unit.includes('item') || unit.includes('piece')) return [0, 1, 5, 10, 25, 50, 100]
  return getIncludedQuantityPresets(config, unit)
}

function durationPresets(config, unit) {
  if (config.trade_id === 'L06' && unit === 'per month') return [1, 3, 6, 12, 24]
  if (unit.includes('hour')) return [1, 2, 4, 6, 8, 10, 12, 24]
  if (unit.includes('day')) return [1, 2, 3, 5, 7, 14, 30]
  return [1, 2, 4, 6, 8, 12]
}

function minimumSuffix(unit) {
  const u = String(unit ?? '')
  if (u.includes('guest')) return 'guests'
  if (u.includes('person')) return 'people'
  if (u.includes('hour')) return 'hours'
  if (u.includes('day')) return 'days'
  if (u.includes('trip')) return 'trips'
  if (u.includes('item')) return 'items'
  if (u.includes('piece')) return 'pieces'
  if (u.includes('month')) return 'months'
  if (u.includes('sq ft')) return 'sq ft'
  return 'units'
}

function titleizeUnit(value) {
  return String(value ?? '').split(' ').map(x => x ? x[0].toUpperCase() + x.slice(1) : x).join(' ')
}

function blankPackage(config, service) {
  const units = unitsFor(config)
  return {
    id: null,
    source: 'PARTNER_CUSTOM',
    template_id: '',
    name: '',
    tier: 'standard',
    description: '',
    revision_round: 0,
    commercial_inputs: {
      inclusions: INCLUSIONS_BY_MODE[config.mode] ?? [],
      exclusions: EXCLUSIONS_BY_MODE[config.mode] ?? [],
    },
    trade_inputs: {},
    base_price: '',
    pricing_unit: units.includes(service?.unit) ? service.unit : units[0],
    minimum_order: '',
    included_quantity: '',
    included_duration: '',
    additional_unit_rate: '',
    additional_duration_rate: '',
    setup_fee: '0',
    teardown_fee: '0',
    travel_policy: '',
    lead_time: service?.lead_time_days ?? '',
    availability_policy: 'instant',
    cancellation_policy: 'standard',
    payment_policy: 'full',
    status: 'DRAFT',
    addons: [],
  }
}

function normalizeLoaded(pkg, priceBook, service, config) {
  const q = priceBook?.quantity_formula ?? {}
  const units = unitsFor(config)
  return {
    id: pkg.id,
    source: pkg.source ?? 'PARTNER_CUSTOM',
    template_id: pkg.template_id ?? '',
    name: pkg.name ?? '',
    tier: pkg.commercial_inputs?.tier ?? '',
    description: pkg.description ?? '',
    revision_round: pkg.revision_round ?? 0,
    commercial_inputs: pkg.commercial_inputs ?? {},
    trade_inputs: pkg.trade_inputs ?? {},
    base_price: priceBook?.rate_paise != null ? String(Number(priceBook.rate_paise) / 100) : '',
    pricing_unit: units.includes(priceBook?.unit) ? priceBook.unit : (priceBook?.unit || units[0]),
    minimum_order: priceBook?.minimum_quantity ?? '',
    included_quantity: priceBook?.included_quantity ?? '',
    included_duration: q.included_duration ?? '',
    additional_unit_rate: q.additional_unit_rate ?? '',
    additional_duration_rate: q.additional_duration_rate ?? '',
    setup_fee: q.setup_fee ?? '0',
    teardown_fee: q.teardown_fee ?? '0',
    travel_policy: q.travel_policy ?? '',
    lead_time: q.lead_time ?? service?.lead_time_days ?? '',
    availability_policy: pkg.commercial_inputs?.availability_policy ?? 'instant',
    cancellation_policy: pkg.commercial_inputs?.cancellation_policy ?? 'standard',
    payment_policy: pkg.commercial_inputs?.payment_policy ?? 'full',
    status: pkg.status ?? 'DRAFT',
    addons: pkg.addons ?? [],
  }
}

function inferTier(name) {
  const v = String(name ?? '').toLowerCase()
  if (v.includes('luxury')) return 'luxury'
  if (v.includes('premium')) return 'premium'
  if (v.includes('classic')) return 'classic'
  if (v.includes('basic') || v.includes('essential')) return 'essential'
  return 'standard'
}

export default function TradePricingStudio({ vendor, service, config, onBack, onOpenListings }) {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState(null)

  const load = useCallback(async () => {
    if (!service?.id) {
      setPackages([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: rows, error: pkgError } = await supabase
        .from('sambramo_trade_packages')
        .select('id,vendor_id,vendor_service_id,template_id,source,name,description,commercial_inputs,trade_inputs,status,revision_round,submitted_at,reviewed_at,review_note,created_at,updated_at')
        .eq('vendor_service_id', service.id)
        .order('updated_at', { ascending: false })
      if (pkgError) throw pkgError

      const ids = (rows ?? []).map(row => row.id)
      const [pricesRes, addonsRes] = await Promise.all([
        ids.length
          ? supabase.from('sambramo_partner_price_books')
              .select('id,vendor_service_id,offering_id,unit,rate_paise,minimum_quantity,included_quantity,quantity_formula,status,version')
              .eq('vendor_service_id', service.id)
              .in('offering_id', ids.map(String))
              .order('version', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        ids.length
          ? supabase.from('sambramo_trade_package_addons')
              .select('id,package_id,name,unit,rate_paise,minimum_quantity,included_quantity,active,sort_order')
              .in('package_id', ids)
              .order('sort_order', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ])
      if (pricesRes.error) throw pricesRes.error
      if (addonsRes.error) throw addonsRes.error
      const prices = pricesRes.data ?? []
      const addons = addonsRes.data ?? []
      setPackages((rows ?? []).map(pkg => ({
        ...pkg,
        price: prices.find(p => p.offering_id === String(pkg.id) && p.status === 'draft') ?? prices.find(p => p.offering_id === String(pkg.id)) ?? null,
        addons: addons.filter(a => a.package_id === pkg.id),
      })))
    } catch (e) {
      setPackages([])
      setError(e?.message ?? 'Could not load pricing for this listing.')
    } finally {
      setLoading(false)
    }
  }, [service?.id])

  useEffect(() => { load() }, [load])

  function openNew(seed = null) {
    setEditor(seed ? { ...blankPackage(config, service), ...seed } : blankPackage(config, service))
  }

  function openTemplate(template) {
    const base = blankPackage(config, service)
    setEditor({
      ...base,
      source: 'SAMBRAMO_TEMPLATE',
      template_id: template[0],
      name: template[1],
      tier: inferTier(template[1]),
    })
  }

  function openExisting(pkg) {
    setEditor(normalizeLoaded(pkg, pkg.price, service, config))
  }

  if (editor) {
    return (
      <TradePackageEditor
        vendor={vendor}
        service={service}
        config={config}
        packages={packages}
        draft={editor}
        setDraft={setEditor}
        readOnly={editor.status === 'LIVE'}
        onBack={() => setEditor(null)}
        onSaved={async (result, status) => { await load(); if (status === 'UNDER_REVIEW') setEditor(null); else setEditor(prev => prev ? { ...prev, id: result?.package_id ?? prev.id, status: 'DRAFT' } : prev) }}
        onOpenListings={onOpenListings}
      />
    )
  }

  return (
    <div className="trade-pricing-catalog w-full min-w-0 space-y-4 pb-6">
      <header className="flex w-full items-center gap-3 px-1 pt-1">
        <button type="button" onClick={onBack} aria-label="Back" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#2A085C] ring-1 ring-[#E5DFEB]">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2A085C]">Pricing catalog</p>
          <h2 className="truncate text-[24px] font-black leading-tight text-[#211735]">{service?.name || config.name}</h2>
        </div>
      </header>

      <section className="rounded-[24px] bg-[#F6F2FB] p-4 ring-1 ring-[#E8E0F2]">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#5B21B6] ring-1 ring-[#E1D9EE]"><WalletCards size={19} /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#786A8A]">Listed service only</p>
            <h3 className="mt-1 text-[20px] font-black text-[#211735]">{service?.name || config.name}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#6B5B85]">Create customer-ready packages using the fields and commercial model defined for this trade.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-3.5 ring-1 ring-[#E7E2EF]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#786A8A]">Your packages</p>
            <h3 className="mt-1 text-[19px] font-black text-[#211735]">{packages.length} package{packages.length === 1 ? '' : 's'}</h3>
          </div>
          <button type="button" onClick={() => openNew()} className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-[#F0EAF8] px-4 text-[12px] font-extrabold text-[#2A085C] ring-1 ring-[#E0D5F0]"><Plus size={15} /> Add</button>
        </div>
        {loading ? (
          <div className="flex min-h-[100px] items-center justify-center"><Loader2 size={22} className="animate-spin text-[#6D28D9]" /></div>
        ) : packages.length ? (
          <div className="mt-3 space-y-2.5">
            {packages.map(pkg => (
              <button key={pkg.id} type="button" onClick={() => openExisting(pkg)} className="w-full rounded-[20px] bg-[#FBFAFD] p-3.5 text-left ring-1 ring-[#E8E2EE]">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#EEE7FA] text-[#2A085C]">{pkg.source === 'SAMBRAMO_TEMPLATE' ? <Sparkles size={17} /> : <Package size={17} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-extrabold text-[#211735]">{pkg.name || 'Unnamed package'}</span>
                    <span className="mt-1 block text-[11.5px] text-[#6B5B85]">
                      {pkg.status === 'LIVE' ? 'Live' : pkg.status === 'UNDER_REVIEW' ? 'Under review' : 'Draft'}
                      {pkg.price?.rate_paise != null ? ' · ' + formatINR(Math.round(Number(pkg.price.rate_paise) / 100)) + ' ' + titleizeUnit(pkg.price.unit) : ' · price not set'}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#F0EAF8] px-2.5 py-1.5 text-[10px] font-extrabold text-[#5B21B6]">{pkg.status === 'UNDER_REVIEW' ? 'Reviewing' : pkg.status === 'LIVE' ? 'Enabled' : 'Draft'}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-[20px] border border-dashed border-[#DCCFEA] bg-[#FBFAFD] p-5 text-center">
            <CirclePlus className="mx-auto text-[#6D28D9]" size={23} />
            <p className="mt-2 text-[14px] font-extrabold text-[#211735]">No package yet</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#6B5B85]">Start from the first trade-specific template and complete it in five focused screens.</p>
            <button type="button" onClick={() => openTemplate(config.templates?.[0])} disabled={!config.templates?.length} className="mt-3 rounded-2xl bg-[#EEE7FA] px-4 py-2.5 text-[11.5px] font-extrabold text-[#2A085C] disabled:opacity-50">Use first template</button>
          </div>
        )}
      </section>
    </div>
  )
}

function TradePackageEditor({ vendor, service, config, packages = [], draft, setDraft, readOnly, onBack, onSaved, onOpenListings }) {
  const [activeStep, setActiveStep] = useState('package')
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const [addons, setAddons] = useState(draft.addons ?? [])
  const [media, setMedia] = useState([])
  const [mediaOpen, setMediaOpen] = useState(false)
  const [mediaRefresh, setMediaRefresh] = useState(0)
  const [previewAction, setPreviewAction] = useState('')

  const fields = useMemo(() => getTradePricingFields(config), [config])
  const units = unitsFor(config)
  const descriptionSuggestions = useMemo(() => getDescriptionSuggestions(config).slice(0, 5), [config])
  const nameSuggestions = useMemo(() => getPackageNameSuggestions(config).slice(0, 5), [config])
  const addonSuggestions = useMemo(() => getAddonSuggestions(config).slice(0, 5), [config])

  useEffect(() => {
    setAddons(draft.addons ?? [])
  }, [draft.id])

  useEffect(() => {
    let alive = true
    async function loadMedia() {
      if (!vendor?.id) return
      const { rows } = await fetchWork(vendor.id)
      const available = (rows ?? [])
        .filter(row => ['photo', 'video'].includes(row.kind))
        .sort((a, b) => Number(b.review_status === 'live') - Number(a.review_status === 'live'))
        .slice(0, 8)
      const urls = await signedUrlsFor(available.map(row => row.storage_path), 900)
      if (alive) setMedia(available.map(row => ({ ...row, url: urls[row.storage_path] })).filter(row => row.url))
    }
    loadMedia()
    return () => { alive = false }
  }, [vendor?.id, mediaRefresh])

  const update = (key, value) => setDraft(d => ({ ...d, [key]: value }))
  const updateTrade = (key, value) => setDraft(d => ({ ...d, trade_inputs: { ...(d.trade_inputs ?? {}), [key]: value } }))
  const updateCommercial = (key, value) => setDraft(d => ({ ...d, commercial_inputs: { ...(d.commercial_inputs ?? {}), [key]: value } }))
  const updateTemplate = template => setDraft(d => ({
    ...d,
    source: 'SAMBRAMO_TEMPLATE',
    template_id: template[0],
    name: template[1],
    tier: inferTier(template[1]),
  }))

  const validation = useMemo(() => {
    const problems = []
    if (!String(draft.name ?? '').trim()) problems.push('Choose a package name.')
    if (!String(draft.description ?? '').trim()) problems.push('Choose a customer-ready description.')
    if (!draft.tier) problems.push('Choose a package tier.')
    if (!draft.pricing_unit) problems.push('Choose a pricing unit.')
    if (Number(draft.minimum_order || 0) <= 0) problems.push('Choose a valid minimum order.')
    if (Number(draft.base_price || 0) <= 0) problems.push('Set a positive base price.')
    if (draft.lead_time === '' || draft.lead_time == null) problems.push('Choose a lead time.')
    if (!String(draft.travel_policy ?? '').trim()) problems.push('Choose a travel / service-area policy.')
    if (!String(draft.availability_policy ?? '').trim()) problems.push('Choose a booking mode.')
    if (!String(draft.cancellation_policy ?? '').trim()) problems.push('Choose a cancellation policy.')
    if (!String(draft.payment_policy ?? '').trim()) problems.push('Choose a payment requirement.')
    for (const addon of addons) {
      if (!String(addon.name ?? '').trim()) continue
      if (addon.rate_paise === '' || addon.rate_paise == null || Number(addon.rate_paise) < 0) problems.push('Set a price for ' + addon.name + '.')
      if (!String(addon.unit ?? '').trim()) problems.push('Choose a unit for ' + addon.name + '.')
    }
    if (draft.status !== 'LIVE') {
      for (const field of fields) {
        if (field.required === false) continue
        if (draft.trade_inputs?.[field.key] === '' || draft.trade_inputs?.[field.key] == null) problems.push('Complete ' + field.label + '.')
      }
    }
    return [...new Set(problems)]
  }, [draft, fields, addons])

  const ready = useMemo(() => {
    const detailsReady = !fields.some(field => field.required !== false && (draft.trade_inputs?.[field.key] === '' || draft.trade_inputs?.[field.key] == null))
    return {
      package: Boolean(String(draft.name ?? '').trim() && String(draft.description ?? '').trim() && draft.tier && draft.pricing_unit),
      details: detailsReady,
      pricing: Boolean(Number(draft.minimum_order || 0) > 0 && Number(draft.base_price || 0) > 0 && draft.lead_time !== '' && draft.lead_time != null && String(draft.travel_policy ?? '').trim() && String(draft.availability_policy ?? '').trim() && String(draft.cancellation_policy ?? '').trim() && String(draft.payment_policy ?? '').trim()),
      addons: true,
      preview: validation.length === 0,
    }
  }, [draft, fields, config.mode, validation])

  function goTo(step) {
    setActiveStep(step)
    setLocalError('')
    setSaveNotice('')
    setPreviewAction('')
  }

  function goNext() {
    setPreviewAction('')
    const idx = SECTION_META.findIndex(x => x[0] === activeStep)
    const next = SECTION_META[idx + 1]
    if (next) {
      setLocalError('')
      setActiveStep(next[0])
    }
  }

  function goPrevious() {
    setSaveNotice('')
    setPreviewAction('')
    const idx = SECTION_META.findIndex(x => x[0] === activeStep)
    if (idx <= 0) return onBack()
    setActiveStep(SECTION_META[idx - 1][0])
    setLocalError('')
  }

  function addAddon(template = null) {
    const item = {
      id: globalThis.crypto?.randomUUID?.() ?? ('tmp-' + Date.now()),
      name: template?.name ?? '',
      rate_paise: '',
      unit: template?.unit ?? defaultAddonUnit(config),
      minimum_quantity: '1',
      included_quantity: '0',
      active: true,
      sort_order: addons.length,
    }
    setAddons(current => [...current, item])
  }

  function updateAddon(id, patch) {
    setAddons(current => current.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function removeAddon(id) {
    setAddons(current => current.filter(item => item.id !== id))
  }

  async function save(status) {
    if (readOnly || saving) return
    setLocalError('')
    setSaveNotice('')
    if (status === 'UNDER_REVIEW' && validation.length) {
      setLocalError(validation.join(' '))
      return
    }
    setSaving(true)
    try {
      const pPackage = {
        name: String(draft.name ?? '').trim() || (config.name + ' draft'),
        source: draft.source,
        template_id: draft.template_id || null,
        description: draft.description || null,
        revision_round: Number(draft.revision_round || 0),
        commercial_inputs: {
          ...(draft.commercial_inputs ?? {}),
          tier: draft.tier || null,
          availability_policy: draft.availability_policy || 'instant',
          cancellation_policy: draft.cancellation_policy || 'standard',
          payment_policy: draft.payment_policy || 'full',
        },
        trade_inputs: draft.trade_inputs ?? {},
        status,
      }
      const pPricing = {
        base_price: draft.base_price === '' ? 0 : Number(draft.base_price),
        pricing_unit: draft.pricing_unit,
        minimum_order: Number(draft.minimum_order || 1),
        included_quantity: Number(draft.included_quantity || 0),
        included_duration: draft.included_duration === '' ? null : Number(draft.included_duration),
        additional_unit_rate: Number(draft.additional_unit_rate || 0),
        additional_duration_rate: Number(draft.additional_duration_rate || 0),
        setup_fee: Number(draft.setup_fee || 0),
        teardown_fee: Number(draft.teardown_fee || 0),
        travel_policy: draft.travel_policy || null,
        lead_time: draft.lead_time === '' ? null : Number(draft.lead_time),
      }
      const payloadAddons = addons
        .filter(item => String(item.name ?? '').trim())
        .map((item, index) => ({
          ...item,
          rate_paise: item.rate_paise === '' || item.rate_paise == null ? 0 : Math.max(0, Math.round(Number(item.rate_paise))),
          minimum_quantity: item.minimum_quantity === '' || item.minimum_quantity == null ? 1 : Math.max(1, Number(item.minimum_quantity)),
          included_quantity: item.included_quantity === '' || item.included_quantity == null ? 0 : Math.max(0, Number(item.included_quantity)),
          sort_order: index,
        }))
      const { data, error } = await supabase.rpc('save_sambramo_trade_package', {
        p_vendor_service_id: service.id,
        p_package_id: draft.id || null,
        p_package: pPackage,
        p_addons: payloadAddons,
        p_pricing: pPricing,
      })
      if (error) throw error
      if (data?.ok === false) throw new Error(data.reason ?? 'Could not save this pricing package.')
      setSaveNotice(status === 'DRAFT' ? 'Draft saved successfully. You can continue editing this package.' : 'Pricing submitted to Sambramo review.')
      await onSaved(data, status)
    } catch (e) {
      setSaveNotice('')
      setLocalError(e?.message ?? 'Could not save this pricing package.')
    } finally {
      setSaving(false)
    }
  }

  const currentIndex = SECTION_META.findIndex(x => x[0] === activeStep)
  const next = SECTION_META[currentIndex + 1]
  const isPreview = activeStep === 'preview'

  return (
    <div className="trade-pricing-screen w-full min-w-0 pb-[calc(9rem+env(safe-area-inset-bottom))]">
      <header className="trade-pricing-editor-header">
        <button type="button" onClick={goPrevious} aria-label={activeStep === 'package' ? 'Back to pricing list' : 'Previous step'} className="trade-pricing-back">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="trade-pricing-overline">Pricing · {config.name}</p>
          <h1>{draft.name || service?.name || 'New package'}</h1>
        </div>
        <button type="button" onClick={() => setActiveStep('preview')} aria-label="Customer preview" className="trade-pricing-eye">
          <Eye size={20} />
        </button>
      </header>

      <StepRail activeStep={activeStep} ready={ready} onSelect={goTo} />

      {localError ? <section className="trade-pricing-error">{localError}</section> : null}
      {saveNotice ? <section className="trade-pricing-save-success"><Check size={16} /><span>{saveNotice}</span></section> : null}
      {previewAction ? <section className="trade-pricing-preview-action-note"><Info size={15} /><span>{previewAction}</span></section> : null}

      {activeStep === 'package' ? (
        <PackageStep
          config={config}
          draft={draft}
          readOnly={readOnly}
          nameSuggestions={nameSuggestions}
          descriptionSuggestions={descriptionSuggestions}
          units={units}
          onUpdate={update}
          onUpdateCommercial={updateCommercial}
          onSelectTemplate={updateTemplate}
        />
      ) : null}

      {activeStep === 'details' ? (
        <DetailsStep config={config} fields={fields} draft={draft} readOnly={readOnly} onUpdate={updateTrade} />
      ) : null}

      {activeStep === 'pricing' ? (
        <PricingStep config={config} units={units} draft={draft} readOnly={readOnly} onUpdate={update} />
      ) : null}

      {activeStep === 'addons' ? (
        <AddonsStep config={config} addons={addons} suggestions={addonSuggestions} readOnly={readOnly} onAdd={addAddon} onUpdate={updateAddon} onRemove={removeAddon} />
      ) : null}

      {activeStep === 'preview' ? (
        <PreviewStep vendor={vendor} config={config} draft={draft} fields={fields} addons={addons} media={media} onOpenListings={onOpenListings} onManageMedia={() => setMediaOpen(true)} onPreviewAction={message => setPreviewAction(message)} />
      ) : null}

      {!readOnly && isPreview ? (
        <div className="trade-pricing-review-summary">
          <strong>{validation.length ? validation.length + ' required ' + (validation.length === 1 ? 'item' : 'items') + ' remaining' : 'Ready for Sambramo review'}</strong>
          <span>{validation.length ? 'Tap Submit to see exactly what needs to be completed.' : 'All mandatory pricing inputs are complete.'}</span>
        </div>
      ) : null}

      {!readOnly ? (
        <div className="trade-pricing-bottom">
          <button type="button" onClick={() => save('DRAFT')} disabled={saving} className="trade-pricing-secondary-action">
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          {isPreview ? (
            <button type="button" onClick={() => save('UNDER_REVIEW')} disabled={saving} aria-disabled={saving} className="trade-pricing-primary-action">
              {saving ? 'Submitting…' : 'Submit pricing for review'}
            </button>
          ) : (
            <button type="button" onClick={goNext} disabled={saving} className="trade-pricing-primary-action">
              Continue to {next?.[1] ?? 'Preview'} <ArrowRight size={16} />
            </button>
          )}
        </div>
      ) : null}

      {mediaOpen ? (
        <div className="trade-pricing-media-backdrop" role="dialog" aria-modal="true" aria-label="Partner media library" onMouseDown={() => setMediaOpen(false)}>
          <div className="trade-pricing-media-sheet" onMouseDown={event => event.stopPropagation()}>
            <div className="trade-pricing-media-head">
              <div className="min-w-0">
                <p className="trade-pricing-overline">Partner catalog</p>
                <h3>Photos & videos</h3>
                <p>Upload real work for the customer catalog. New media stays under review until approved.</p>
              </div>
              <button type="button" onClick={() => { setMediaOpen(false); setMediaRefresh(value => value + 1) }} className="trade-pricing-round-button" aria-label="Close">×</button>
            </div>
            <WorkLibrary vendor={vendor} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StepRail({ activeStep, ready, onSelect }) {
  const currentIndex = SECTION_META.findIndex(x => x[0] === activeStep)
  return (
    <nav className="trade-pricing-steps" aria-label="Pricing setup steps">
      {SECTION_META.map(([id, label], index) => {
        const active = id === activeStep
        const enabled = true
        const complete = index < currentIndex || ready[id]
        return (
          <button key={id} type="button" disabled={!enabled} onClick={() => onSelect(id)} className={'trade-pricing-step ' + (active ? 'is-active' : '') + (!enabled ? ' is-locked' : '')}>
            <span className={'trade-pricing-step-circle ' + (complete ? 'is-complete' : '')}>{complete ? <Check size={13} strokeWidth={3} /> : index + 1}</span>
            <span className="trade-pricing-step-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function PackageStep({ config, draft, readOnly, nameSuggestions, descriptionSuggestions, units, onUpdate, onUpdateCommercial, onSelectTemplate }) {
  return (
    <section className="trade-pricing-panel trade-step-package">
      <div className="trade-pricing-card">
        <SectionHeader icon={Package} title="Package card" subtitle="Choose a package template or create your own." action={
          <select value={draft.template_id || ''} disabled={readOnly} onChange={e => {
            const template = (config.templates ?? []).find(item => item[0] === e.target.value)
            if (template) onSelectTemplate(template)
          }} className="trade-pricing-template-select">
            <option value="">Use template</option>
            {(config.templates ?? []).map(t => <option key={t[0]} value={t[0]}>{t[1]}</option>)}
          </select>
        } />

        <div className="trade-pricing-template-grid">
          {(config.templates ?? []).slice(0, 5).map(([id, label]) => {
            const selected = draft.template_id === id
            return (
              <button key={id} type="button" disabled={readOnly} onClick={() => onSelectTemplate([id, label])} className={'trade-pricing-template-card ' + (selected ? 'is-selected' : '')}>
                <span className="trade-pricing-template-icon"><Package size={16} /></span>
                <span className="trade-pricing-template-name">{label}</span>
                {selected ? <span className="trade-pricing-template-check"><Check size={12} /></span> : null}
              </button>
            )
          })}
        </div>

        <div className="trade-pricing-subcard">
          <ChoiceField required label="Package name" value={draft.name} disabled={readOnly} options={nameSuggestions.map(x => [x, x])} allowCustom onChange={v => onUpdate('name', v)} />
        </div>

        <div className="trade-pricing-description-head">
          <div className="min-w-0">
            <p className="trade-pricing-label">Recommended description</p>
            <p className="trade-pricing-helper">Pick one, then edit it to match what you actually deliver.</p>
          </div>
          <Pencil size={16} className="shrink-0 text-[#6D28D9]" />
        </div>

        <div className="trade-pricing-description-grid">
          {descriptionSuggestions.map((text, index) => {
            const selected = draft.description === text
            return (
              <button key={text} type="button" disabled={readOnly} onClick={() => onUpdate('description', text)} className={'trade-pricing-description-card ' + (selected ? 'is-selected' : '')}>
                <span className="trade-pricing-radio">{selected ? <Check size={12} /> : null}</span>
                <span className="trade-pricing-description-text">{text}</span>
              </button>
            )
          })}
        </div>

        <div className="trade-pricing-edit-description">
          <textarea aria-label="Customer-ready description" value={draft.description ?? ''} disabled={readOnly} rows={3} onChange={e => onUpdate('description', e.target.value)} placeholder="Edit the selected description here…" />
        </div>
      </div>
    </section>
  )
}

function DetailsStep({ config, fields, draft, readOnly, onUpdate }) {
  return (
    <section className="trade-pricing-panel trade-step-details">
      <div className="trade-pricing-card">
        <SectionHeader icon={Ruler} title="Trade specific fields" subtitle={'Only the controls for ' + config.name + ' are shown.'} />
        <div className="trade-pricing-fields-grid trade-specific-grid">
          {fields.map(field => (
            field.key === 'sku'
              ? <TextField key={field.key} label={field.label} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} placeholder="Partner SKU" onChange={v => onUpdate(field.key, v)} />
              : <TradeFieldControl key={field.key} required={field.required !== false} field={field} config={config} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} onChange={v => onUpdate(field.key, v)} />
          ))}
        </div>
        {SITE_DEPENDENT.has(config.trade_id) ? (
          <div className="trade-pricing-site-note">
            <Info size={15} />
            <span>Site measurements, access, route complexity or physical unknowns can move the final request into a survey / quote lane.</span>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function PricingStep({ config, units, draft, readOnly, onUpdate }) {
  return (
    <section className="trade-pricing-panel trade-step-pricing">
      <div className="trade-pricing-card">
        <SectionHeader icon={WalletCards} title="Pricing rules" subtitle={'Set the commercial rules for ' + config.name + '.'} />

        <div className="trade-pricing-field-row">
          <ChoiceField required label="Package tier" value={draft.tier} disabled={readOnly} options={PACKAGE_TIERS} allowCustom onChange={v => onUpdate('tier', v)} />
        </div>

        <div className="trade-pricing-base-price">
          <div className="min-w-0">
            <p className="trade-pricing-label">Base price</p>
            <div className="trade-pricing-price-presets">
              {PRICE_PRESETS.slice(0, 3).map(amount => (
                <button key={amount} type="button" disabled={readOnly} onClick={() => onUpdate('base_price', String(amount))} className={'trade-pricing-price-chip ' + (Number(draft.base_price) === amount ? 'is-selected' : '')}>{formatINR(amount)}</button>
              ))}
              <button type="button" disabled={readOnly} onClick={() => onUpdate('base_price', '')} className="trade-pricing-price-chip">Custom</button>
            </div>
          </div>
          <CurrencyPresetField required label="Your price (₹)" value={draft.base_price} disabled={readOnly} presets={[5000,10000,25000,50000,100000,250000,500000,1000000,2500000,5000000]} onChange={v => onUpdate('base_price', v)} />
        </div>

        <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-3">
          <ChoiceField required label="Price applies to" value={draft.pricing_unit} disabled={readOnly} options={units.map(x => [x, titleizeUnit(x)])} onChange={v => onUpdate('pricing_unit', v)} />
          <PresetNumberField required label="Minimum order" value={draft.minimum_order} disabled={readOnly} presets={presetsForMinimum(config, draft.pricing_unit)} suffix={minimumSuffix(draft.pricing_unit)} onChange={v => onUpdate('minimum_order', v)} />
          <PresetNumberField label="Included duration" value={draft.included_duration} disabled={readOnly} presets={durationPresets(config, draft.pricing_unit)} suffix={config.trade_id === 'L06' && draft.pricing_unit === 'per month' ? 'months' : 'value'} onChange={v => onUpdate('included_duration', v)} />
        </div>

        <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-4">
          <PresetNumberField required label="Lead time" value={draft.lead_time} disabled={readOnly} presets={LEAD_TIME_PRESETS} suffix="days" onChange={v => onUpdate('lead_time', v)} />
          <ChoiceField required label="Travel policy" value={draft.travel_policy} disabled={readOnly} options={TRAVEL_POLICIES} onChange={v => onUpdate('travel_policy', v)} />
          <FeeChoice label="Setup charge" value={draft.setup_fee} disabled={readOnly} onChange={v => onUpdate('setup_fee', v)} />
          <FeeChoice label="Teardown charge" value={draft.teardown_fee} disabled={readOnly} onChange={v => onUpdate('teardown_fee', v)} />
        </div>

        <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-2">
          <CurrencyPresetField label={'Additional ' + titleizeUnit(draft.pricing_unit) + ' rate'} value={draft.additional_unit_rate} disabled={readOnly} presets={[50,100,250,500,750,1000,1500,2500,5000,10000]} onChange={v => onUpdate('additional_unit_rate', v)} />
          <CurrencyPresetField label="Additional duration rate" value={draft.additional_duration_rate} disabled={readOnly} presets={[100,250,500,750,1000,1500,2500,5000,10000]} onChange={v => onUpdate('additional_duration_rate', v)} />
        </div>

        <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-3">
          <ChoiceField required label="Booking mode" value={draft.availability_policy} disabled={readOnly} options={[['instant','Instant booking'],['request','Request approval'],['schedule','Scheduled booking'],['quote','Quote before booking']]} onChange={v => onUpdate('availability_policy', v)} />
          <ChoiceField required label="Cancellation policy" value={draft.cancellation_policy} disabled={readOnly} options={[['flexible','Flexible'],['standard','48-hour notice'],['strict','7-day notice'],['non_refundable','Non-refundable'],['custom','Custom policy']]} allowCustom onChange={v => onUpdate('cancellation_policy', v)} />
          <ChoiceField required label="Payment requirement" value={draft.payment_policy} disabled={readOnly} options={[['full','Full payment at booking'],['deposit25','25% deposit'],['deposit50','50% deposit'],['completion','Pay on completion'],['custom','Custom']]} allowCustom onChange={v => onUpdate('payment_policy', v)} />
        </div>

        <div className="trade-pricing-rule-strip">
          <span><strong>Unit</strong>{titleizeUnit(draft.pricing_unit)}</span>
          <span><strong>Minimum</strong>{draft.minimum_order ? draft.minimum_order + ' ' + minimumSuffix(draft.pricing_unit) : 'Select'}</span>
          <span><strong>Lead time</strong>{draft.lead_time === '' ? 'Select' : draft.lead_time + ' days'}</span>
        </div>
      </div>
    </section>
  )
}

function AddonsStep({ config, addons, suggestions, readOnly, onAdd, onUpdate, onRemove }) {
  return (
    <section className="trade-pricing-panel trade-step-addons">
      <div className="trade-pricing-card">
        <div className="trade-pricing-section-heading">
          <SectionHeader icon={CirclePlus} title="Add-ons" subtitle={'Optional extras for ' + config.name + '.'} />
          {!readOnly ? <button type="button" onClick={() => onAdd()} className="trade-pricing-small-action"><Plus size={14} /> Add custom</button> : null}
        </div>

        <div className="trade-pricing-addon-grid">
          {suggestions.map(template => {
            const selected = addons.some(item => String(item.name).trim().toLowerCase() === template.name.trim().toLowerCase())
            return (
              <button key={template.id} type="button" disabled={readOnly || selected} onClick={() => onAdd(template)} className={'trade-pricing-addon-card ' + (selected ? 'is-selected' : '')}>
                <span className="trade-pricing-addon-check">{selected ? <Check size={13} /> : null}</span>
                <span className="block min-w-0 text-[11px] font-extrabold leading-snug">{template.name}</span>
                <span className="mt-0.5 block text-[10px] font-bold text-[#6B5B85]">{selected ? 'Selected' : 'Tap to add'}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 space-y-2">
          {addons.map(addon => (
            <div key={addon.id} className="rounded-2xl bg-[#FBFAFD] p-3 ring-1 ring-[#E7E2EF]">
              <div className="flex items-center gap-2">
                <ChoiceField required label="Add-on name" value={addon.name} disabled={readOnly} options={suggestions.map(item => [item.name, item.name])} allowCustom onChange={v => onUpdate(addon.id, { name: v })} />
                {!readOnly ? <button type="button" onClick={() => onRemove(addon.id)} aria-label="Remove add-on" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#6B5B85] ring-1 ring-[#E7E2EF]"><Trash2 size={13} /></button> : null}
              </div>
              <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-2 mt-2">
                <CurrencyPresetField required label="Add-on rate (₹)" value={addon.rate_paise === '' ? '' : String(Number(addon.rate_paise || 0) / 100)} disabled={readOnly} presets={[50,100,250,500,750,1000,1500,2500,5000,10000]} onChange={v => onUpdate(addon.id, { rate_paise: v === '' ? '' : Math.round(Number(v) * 100) })} />
                <ChoiceField required label="Unit" value={addon.unit} disabled={readOnly} options={[['per item','Per item'],['per piece','Per piece'],['per guest','Per guest'],['per hour','Per hour'],['per day','Per day'],['per trip','Per trip'],['per event','Per event']]} onChange={v => onUpdate(addon.id, { unit: v })} />
              </div>
            </div>
          ))}
        </div>

        {!addons.length ? (
          <div className="mt-3 rounded-2xl border border-dashed border-[#DCCFEA] bg-[#FBFAFD] p-4 text-center">
            <Plus className="mx-auto text-[#6D28D9]" size={20} />
            <p className="mt-1.5 text-[11.5px] font-extrabold text-[#211735]">No add-ons selected</p>
            <p className="mt-1 text-[10.5px] text-[#6B5B85]">Add-ons are optional. Continue when you are ready.</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function PreviewStep({ vendor, service, config, packages = [], draft, fields, addons, media, onManageMedia, onPreviewAction }) {
  const [favorite, setFavorite] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState(draft.id || 'current-draft')
  const selectedFields = fields
    .filter(field => draft.trade_inputs?.[field.key] !== '' && draft.trade_inputs?.[field.key] != null)
    .slice(0, 8)

  const businessName = vendor?.business_name || vendor?.name || 'Partner business'
  const location = [vendor?.city, vendor?.state].filter(Boolean).join(', ') || vendor?.location || service?.service_area || 'Service area not set'
  const verificationState = String(vendor?.verification_status ?? '').toLowerCase()
  const isVerified = vendor?.is_verified === true || vendor?.verified === true || verificationState === 'verified' || verificationState === 'approved'
  const hero = media[0]
  const heroUrl = hero?.url || vendor?.profile_photo_url || vendor?.avatar_url || vendor?.profile_image_url || ''

  const packagesForPreview = [
    ...packages
      .filter(pkg => pkg?.id && !['ARCHIVED', 'PAUSED'].includes(pkg.status))
      .map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        tier: pkg.commercial_inputs?.tier || '',
        description: pkg.description || '',
        status: pkg.status,
        price: pkg.price?.rate_paise != null ? Math.round(Number(pkg.price.rate_paise) / 100) : null,
        unit: pkg.price?.unit || '',
        minimum: pkg.price?.minimum_quantity ?? null,
        duration: pkg.price?.quantity_formula?.included_duration ?? null,
      })),
    ...(draft.id || draft.name || draft.base_price ? [{
      id: draft.id || 'current-draft',
      name: draft.name || 'Current package',
      tier: draft.tier || 'standard',
      description: draft.description || '',
      status: draft.status || 'DRAFT',
      price: draft.base_price !== '' && Number(draft.base_price) > 0 ? Number(draft.base_price) : null,
      unit: draft.pricing_unit || '',
      minimum: draft.minimum_order || null,
      duration: draft.included_duration || null,
    }] : []),
  ]
  const uniquePackages = Array.from(new Map(packagesForPreview.map(pkg => [pkg.id + '|' + pkg.name, pkg])).values()).slice(0, 5)
  const currentPackage = uniquePackages.find(pkg => String(pkg.id) === String(selectedPackageId)) || uniquePackages[0]
  const exactPrice = currentPackage?.price != null && currentPackage.price > 0 ? formatINR(currentPackage.price) : 'Price not set'
  const currentUnit = currentPackage?.unit ? titleizeUnit(currentPackage.unit) : (draft.pricing_unit ? titleizeUnit(draft.pricing_unit) : 'Set unit')
  const currentName = currentPackage?.name || draft.name || 'Your customer-ready package'
  const activeAddons = (addons ?? []).filter(addon => String(addon.name ?? '').trim() && addon.active !== false && addon.rate_paise !== '' && addon.rate_paise != null).slice(0, 8)
  const inclusions = (draft.commercial_inputs?.inclusions ?? []).filter(Boolean).slice(0, 8)

  const action = message => onPreviewAction?.(message)

  return (
    <section className="trade-pricing-panel trade-step-preview sambramo-preview-page">
      <div className="sambramo-preview-toolbar">
        <div className="min-w-0">
          <p className="trade-pricing-overline">Partner preview · future customer experience</p>
          <h2>How {businessName} can be discovered and booked</h2>
          <p>Real package data, exact rates and approved portfolio media are assembled into a customer-ready storefront.</p>
        </div>
        <button type="button" onClick={onManageMedia} className="sambramo-preview-manage">
          <Images size={16} />
          Manage media
        </button>
      </div>

      <article className="sambramo-storefront">
        <header className="sambramo-storefront-header">
          <button type="button" onClick={() => action('Preview back is connected to the previous pricing step.')} className="sambramo-icon-button" aria-label="Back preview"><ChevronLeft size={20} /></button>
          <div className="sambramo-brand-lockup">
            <span className="sambramo-brand-mark">S</span>
            <span>SAMBRAMO</span>
          </div>
          <div className="sambramo-header-actions">
            <button type="button" onClick={() => action('Customer search controls will connect in the Customer app.')} className="sambramo-icon-button" aria-label="Search"><span className="sambramo-search-glyph" /></button>
            <button type="button" onClick={() => { setFavorite(v => !v); action(favorite ? 'Removed from preview favourites.' : 'Added to preview favourites.') }} className={'sambramo-icon-button ' + (favorite ? 'is-favorite' : '')} aria-label="Save"><span className="sambramo-heart-glyph">{favorite ? '♥' : '♡'}</span></button>
          </div>
        </header>

        <section className="sambramo-gallery">
          {heroUrl ? (
            hero?.kind === 'video'
              ? <video src={heroUrl} muted playsInline controls className="sambramo-gallery-hero" />
              : <img src={heroUrl} alt={businessName + ' portfolio'} className="sambramo-gallery-hero" />
          ) : (
            <div className="sambramo-gallery-empty">
              <Images size={34} />
              <strong>Add approved business photos or video</strong>
              <span>Your first approved portfolio item becomes the cover image.</span>
            </div>
          )}
          {isVerified ? <span className="sambramo-verified-badge"><BadgeCheck size={15} /> Verified Partner</span> : <span className="sambramo-status-badge"><ShieldCheck size={14} /> Partner profile</span>}
          <div className="sambramo-gallery-counter"><Images size={14} /> {media.length ? '1 / ' + media.length : 'Portfolio'}</div>
          {media.some(item => item.kind === 'video') ? <button type="button" onClick={() => action('Video preview selected. The customer gallery will open videos in the Customer app.')} className="sambramo-gallery-video"><span className="sambramo-play">▶</span> Watch video</button> : null}
        </section>

        <section className="sambramo-business-bar">
          <div className="sambramo-business-avatar">
            {vendor?.logo_url || vendor?.business_logo_url ? <img src={vendor.logo_url || vendor.business_logo_url} alt="" /> : <span>{businessName.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><h3>{businessName}</h3>{isVerified ? <BadgeCheck size={16} className="text-[#6D28D9]" /> : null}</div>
            <p>{config.name} partner</p>
            <p><span className="sambramo-pin">⌖</span> {location}</p>
          </div>
          <button type="button" onClick={() => action('Availability is shown from the future customer availability service.')} className="sambramo-availability"><span className="sambramo-dot" /> {draft.availability_policy === 'instant' ? 'Available to book' : 'Booking by request'}</button>
        </section>

        <section className="sambramo-service-intro">
          <div className="min-w-0">
            <p className="sambramo-kicker">{config.pillar || 'EVENT SERVICES'} · {config.name}</p>
            <h1>{currentName}</h1>
            <p className="sambramo-story">{currentPackage?.description || draft.description || 'Choose a recommendation to tell customers exactly what you deliver and why it fits their celebration.'}</p>
          </div>
          <div className="sambramo-exact-price">
            <span>Exact package price</span>
            <strong>{exactPrice}</strong>
            <em>{currentUnit}</em>
          </div>
        </section>

        {draft.trade_inputs?.event_type || draft.trade_inputs?.function ? <div className="sambramo-emotion-strip"><Sparkles size={15} /><span>Built for <strong>{draft.trade_inputs?.event_type || draft.trade_inputs?.function}</strong> moments</span></div> : null}

        <section className="sambramo-detail-grid">
          {selectedFields.map((field, index) => (
            <div key={field.key} className={'sambramo-detail-card tone-' + (index % 4)}>
              <span>{field.label}</span>
              <strong>{String(draft.trade_inputs[field.key])}</strong>
            </div>
          ))}
        </section>

        <section className="sambramo-section">
          <div className="sambramo-section-heading">
            <div><h2>Choose your package</h2><p>Every option carries an exact configured rate.</p></div>
            <button type="button" onClick={() => action('Package comparison is a customer-facing preview interaction.')} className="sambramo-compare-link">Compare</button>
          </div>
          <div className="sambramo-package-list">
            {uniquePackages.length ? uniquePackages.map((pkg, index) => (
              <button key={pkg.id + '|' + pkg.name} type="button" onClick={() => { setSelectedPackageId(pkg.id); action((pkg.name || 'Package') + ' selected in preview.') }} className={'sambramo-package-option ' + (String(pkg.id) === String(selectedPackageId) ? 'is-selected' : '')}>
                <span className="sambramo-package-radio">{String(pkg.id) === String(selectedPackageId) ? '●' : '○'}</span>
                <span className="sambramo-package-copy">
                  <span className="sambramo-package-title-row"><strong>{pkg.name || 'Package'}</strong>{index === 0 ? <span className="sambramo-popular">Recommended</span> : null}</span>
                  <span className="sambramo-package-description">{pkg.description || 'Customer-ready package with clear scope and pricing.'}</span>
                  <small>{pkg.duration ? String(pkg.duration) + ' included' : 'Configured service scope'}{pkg.minimum ? ' · minimum ' + pkg.minimum : ''}</small>
                </span>
                <span className="sambramo-package-price"><strong>{pkg.price != null && pkg.price > 0 ? formatINR(pkg.price) : 'Price not set'}</strong><span>{pkg.unit ? titleizeUnit(pkg.unit) : 'Set unit'}</span></span>
              </button>
            )) : <div className="sambramo-empty-package">Complete the package price and trade details to build the comparison view.</div>}
          </div>
        </section>

        <section className="sambramo-addons-section">
          <div className="sambramo-section-heading"><div><h2>Popular add-ons</h2><p>Optional upgrades with their own exact prices.</p></div><Plus size={18} /></div>
          <div className="sambramo-addon-grid">
            {activeAddons.length ? activeAddons.map((addon, index) => (
              <button key={addon.id} type="button" onClick={() => action(addon.name + ' selected as a preview add-on.')} className={'sambramo-addon-card tone-' + (index % 4)}>
                <span className="sambramo-addon-icon"><Plus size={16} /></span>
                <span className="min-w-0"><strong>{addon.name}</strong><span>+{formatINR(Math.round(Number(addon.rate_paise) / 100))}</span></span>
              </button>
            )) : <div className="sambramo-empty-package">No paid extras selected for this package.</div>}
          </div>
        </section>

        <section className="sambramo-includes-section">
          <div className="sambramo-section-heading"><div><h2>What is included</h2><p>Make the promise easy to understand at a glance.</p></div></div>
          <div className="sambramo-include-grid">
            {(inclusions.length ? inclusions : ['Package-specific service coverage', 'Transparent pricing', 'Sambramo review before publishing']).map((item, index) => <div key={index} className="sambramo-include-card"><Check size={15} /><span>{typeof item === 'string' ? item : item?.label ?? item?.name ?? String(item)}</span></div>)}
          </div>
        </section>

        <section className="sambramo-portfolio-section">
          <div className="sambramo-section-heading"><div><h2>Real work by this partner</h2><p>Only partner portfolio media should appear here.</p></div><button type="button" onClick={onManageMedia} className="sambramo-compare-link">{media.length ? 'View all ' + media.length : 'Add work'}</button></div>
          <div className="sambramo-portfolio-grid">
            {media.length ? media.slice(0, 6).map((item, index) => <button key={item.id || item.storage_path || index} type="button" onClick={() => action('Portfolio media opened in preview.')} className="sambramo-portfolio-thumb">{item.kind === 'video' ? <video src={item.url} muted playsInline className="h-full w-full object-cover" /> : <img src={item.url} alt="" className="h-full w-full object-cover" />}{item.kind === 'video' ? <span className="sambramo-portfolio-video">▶</span> : null}</button>) : <div className="sambramo-portfolio-empty"><Images size={22} /><span>Upload approved business photos or video to build the catalogue.</span></div>}
          </div>
        </section>

        <div className="sambramo-preview-trust"><span><ShieldCheck size={15} /> Secure booking</span><span><Check size={15} /> Clear inclusions</span><span><BadgeCheck size={15} /> Verified work</span></div>
        <div className="sambramo-preview-cta-row">
          <button type="button" onClick={() => action('Ask a question is a preview-only action until the Customer app is connected.')} className="sambramo-preview-secondary">Ask a question</button>
          <button type="button" onClick={() => action('Select package is a preview-only action until the Customer booking journey is connected.')} className="sambramo-preview-primary">Select package <ArrowRight size={17} /></button>
        </div>
      </article>
    </section>
  )
}

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="trade-pricing-section-header">
      <span className="trade-pricing-section-icon"><Icon size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-black leading-tight text-[#211735]">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B5B85]">{subtitle}</p>
      </div>
      {action ? <div className="trade-pricing-section-action shrink-0">{action}</div> : null}
    </div>
  )
}

function TradeFieldControl({ field, config, value, disabled, onChange, required = false }) {
  const schema = getFieldSchema(field, config)
  if (schema.control === 'currency') return <CurrencyPresetField required={required} label={field.label} value={value} disabled={disabled} presets={schema.presets ?? [50,100,250,500,1000,2500,5000,10000]} onChange={onChange} />
  if (schema.control === 'stepper' || schema.control === 'duration') return <PresetNumberField required={required} label={field.label} value={value} disabled={disabled} presets={schema.presets} suffix={schema.control === 'duration' ? 'value' : field.key.includes('km') ? 'km' : field.key.includes('hour') ? 'hours' : field.key.includes('day') ? 'days' : field.key.includes('people') || field.key.includes('staff') || field.key.includes('guards') ? 'people' : 'units'} onChange={onChange} />
  return <ChoiceField required={required} label={field.label} value={value} disabled={disabled} options={schema.options ?? []} allowCustom onChange={onChange} />
}

function TextField({ label, value, onChange, placeholder = '', disabled = false, required = false }) {
  return (
    <label className="trade-pricing-field">
      <span className="trade-pricing-field-label">{label}{required ? <span className="trade-pricing-required">*</span> : null}</span>
      <input value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

function ChoiceField({ label, value, onChange, options, disabled = false, allowCustom = false, required = false }) {
  const normalized = (options ?? []).map(x => Array.isArray(x) ? x : [x, x])
  const isCustomOption = option => /^custom\b/i.test(String(option ?? '').trim())
  const inferredCustom = allowCustom && value !== '' && (
    !normalized.some(x => x[0] === value) ||
    normalized.some(x => x[0] === value && isCustomOption(x[1] ?? x[0]))
  )
  const [customMode, setCustomMode] = useState(inferredCustom)
  useEffect(() => { if (inferredCustom) setCustomMode(true) }, [inferredCustom])
  return (
    <label className="trade-pricing-field">
      <span className="trade-pricing-field-label">{label}{required ? <span className="trade-pricing-required">*</span> : null}</span>
      <span className="trade-pricing-select-wrap">
        <select value={customMode ? '__custom__' : (value ?? '')} disabled={disabled} onChange={e => { const next = e.target.value; const customSelected = next === '__custom__' || normalized.some(x => x[0] === next && isCustomOption(x[1] ?? x[0])); if (customSelected) { setCustomMode(true); onChange('') } else { setCustomMode(false); onChange(next) } }}>
          <option value="">Select</option>
          {normalized.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
          {allowCustom ? <option value="__custom__">Custom / type my own</option> : null}
        </select>
        <ChevronDown size={15} />
      </span>
      {customMode ? <input value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} className="trade-pricing-custom-inline" placeholder="Type custom value" /> : null}
    </label>
  )
}

function CurrencyPresetField({ label, value, onChange, presets = PRICE_PRESETS, disabled = false, required = false }) {
  const current = value === '' || value == null ? '' : Number(value)
  const chosen = current !== '' && presets.map(Number).includes(current)
  const [customMode, setCustomMode] = useState(current !== '' && !chosen)
  useEffect(() => { if (current !== '' && !chosen) setCustomMode(true) }, [current, chosen])
  return (
    <div className="trade-pricing-field">
      <span className="trade-pricing-field-label">{label}{required ? <span className="trade-pricing-required">*</span> : null}</span>
      <span className="trade-pricing-currency-wrap"><span>₹</span><input type="number" min="0" value={value ?? ''} disabled={disabled || !customMode} onChange={e => onChange(e.target.value)} placeholder={customMode ? "Enter custom amount" : "Select a preset"} /></span>
      {!disabled ? (
        <div className="trade-pricing-chip-row">
          {presets.slice(0, 6).map(amount => <button key={amount} type="button" onClick={() => { setCustomMode(false); onChange(String(amount)) }} className={'trade-pricing-mini-chip ' + (current === Number(amount) ? 'is-selected' : '')}>{formatINR(Number(amount))}</button>)}
          <button type="button" onClick={() => { setCustomMode(true); onChange('') }} className={'trade-pricing-mini-chip ' + (customMode && current === '' ? 'is-selected' : '')}>Custom</button>
        </div>
      ) : null}
    </div>
  )
}

function CurrencyField({ label, value, onChange, disabled = false }) {
  return (
    <label className="trade-pricing-field">
      <span className="trade-pricing-field-label">{label}</span>
      <span className="trade-pricing-currency-wrap"><span>₹</span><input type="number" min="0" value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder="Enter amount" /></span>
    </label>
  )
}

function PresetNumberField({ label, value, onChange, presets = [], suffix = '', disabled = false, required = false }) {
  const numbers = (presets ?? []).map(Number)
  const current = value === '' || value == null ? '' : Number(value)
  const selected = current !== '' && numbers.includes(Number(current))
  const [customMode, setCustomMode] = useState(current !== '' && !selected)
  useEffect(() => { if (current !== '' && !selected) setCustomMode(true) }, [current, selected])
  return (
    <label className="trade-pricing-field">
      <span className="trade-pricing-field-label">{label}{required ? <span className="trade-pricing-required">*</span> : null}</span>
      <span className="trade-pricing-select-wrap">
        <select value={customMode ? '__custom__' : (current === '' ? '' : String(current))} disabled={disabled} onChange={e => { const next = e.target.value; if (next === '__custom__') { setCustomMode(true); onChange('') } else { setCustomMode(false); onChange(next) } }}>
          <option value="">Select</option>
          {numbers.slice(0, 10).map(x => <option key={x} value={x}>{x} {suffix}</option>)}
          <option value="__custom__">Custom value</option>
        </select>
        <ChevronDown size={15} />
      </span>
      {!disabled && customMode ? <input type="number" min="0" value={current === '' ? '' : current} onChange={e => onChange(e.target.value)} placeholder={'Custom ' + (suffix || 'value')} className="trade-pricing-custom-inline" /> : null}
    </label>
  )
}

function FeeChoice({ label, value, onChange, disabled = false }) {
  return (
    <ChoiceField
      label={label}
      value={Number(value || 0) === 0 ? 'included' : String(value)}
      disabled={disabled}
      options={[['included', 'Included'], ['250', '₹250'], ['500', '₹500'], ['1000', '₹1,000'], ['2500', '₹2,500']]}
      allowCustom
      onChange={v => onChange(v === 'included' ? '0' : v)}
    />
  )
}

function PreviewMetric({ label, value }) {
  return (
    <div className="trade-pricing-preview-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function defaultAddonUnit(config) {
  if (config?.mode === 'RATE_CARD') return 'per trip'
  if (config?.mode === 'CATALOG') return 'per item'
  if (config?.trade_id === 'E01') return 'per guest'
  return 'per event'
}
