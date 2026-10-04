import { useCallback, useEffect, useMemo, useState } from 'react'
import './TradePricingStudio.css'
import './TradeCustomerPreview.css'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronDown, ChevronLeft,
  CirclePlus, Eye, FileText, Images, Info, Loader2, Package, Pencil,
  Plus, Ruler, ShieldCheck, Sparkles, Trash2, WalletCards,
  Camera, Clock3, Truck, Users, Flower2, Music2, Utensils, Video, MapPin, Boxes, Zap,
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
import SambramoPartnerPreviewCard, { SAMBRAMO_EVENT_OPTIONS, readSupportedEvents } from './SambramoPartnerPreviewCard'

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
      inclusions: [],
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
    travel_policy: 'included',
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
        if (!hasFieldValue(draft.trade_inputs?.[field.key])) problems.push('Complete ' + field.label + '.')
      }
    }
    return [...new Set(problems)]
  }, [draft, fields, addons])

  const ready = useMemo(() => {
    const detailsReady = !fields.some(field => field.required !== false && !hasFieldValue(draft.trade_inputs?.[field.key]))
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
      const first = validation[0] ?? ''
      if (/package name/i.test(first)) {
        setActiveStep('package')
        requestAnimationFrame(() => document.querySelector('[data-pricing-package-name]')?.focus())
      } else if (/description|package tier|pricing unit/i.test(first)) {
        setActiveStep('package')
      } else if (/complete /i.test(first)) {
        setActiveStep('details')
      } else if (/minimum order|base price|lead time|travel|booking mode|cancellation|payment requirement/i.test(first)) {
        setActiveStep('pricing')
      } else if (/add-on/i.test(first)) {
        setActiveStep('addons')
      }
      return
    }

    setSaving(true)
    try {
      let packageName = String(draft.name ?? '').trim()

      // A draft is allowed to be incomplete. Give an unnamed draft a
      // deterministic, unique placeholder so repeated "Save draft" taps
      // can never collide with the listing's unique package-name key.
      if (!packageName) {
        const baseName = config.name + ' draft'
        const { data: existingNames, error: nameError } = await supabase
          .from('sambramo_trade_packages')
          .select('name')
          .eq('vendor_service_id', service.id)
          .neq('status', 'ARCHIVED')
          .ilike('name', baseName + '%')
        if (nameError) throw nameError
        const taken = new Set((existingNames ?? []).map(row => String(row.name ?? '').trim().toLowerCase()))
        packageName = baseName
        let suffix = 2
        while (taken.has(packageName.toLowerCase())) {
          packageName = baseName + ' ' + suffix
          suffix += 1
        }
      } else {
        // The database intentionally enforces one package name per listing.
        // Catch that before the RPC so the partner gets an actionable error
        // instead of a dead-looking button / raw 23505 response.
        const { data: duplicate, error: duplicateError } = await supabase
          .from('sambramo_trade_packages')
          .select('id,name')
          .eq('vendor_service_id', service.id)
          .neq('status', 'ARCHIVED')
          .eq('name', packageName)
          .limit(1)
          .maybeSingle()
        if (duplicateError) throw duplicateError
        if (duplicate?.id && String(duplicate.id) !== String(draft.id ?? '')) {
          setActiveStep('package')
          setLocalError('A package named "' + packageName + '" already exists for this listing. Rename this package, then save or submit again.')
          requestAnimationFrame(() => document.querySelector('[data-pricing-package-name]')?.focus())
          return
        }
      }

      const pPackage = {
        name: packageName,
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
      if (error) {
        const message = String(error.message ?? '')
        if (/duplicate key value violates unique constraint/i.test(message)) {
          throw new Error('A package with that name already exists for this listing. Rename the package and try again.')
        }
        throw error
      }
      if (data?.ok === false) throw new Error(data.reason ?? 'Could not save this pricing package.')

      // Keep the returned package id in editor state immediately. This makes
      // a second save an UPDATE instead of accidentally starting a duplicate
      // package, even before the parent dashboard finishes refreshing.
      setDraft(d => ({ ...d, id: data?.package_id ?? d.id, name: packageName, status }))
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
      {saveNotice ? <section role="status" aria-live="polite" className="trade-pricing-save-success"><Check size={16} /><span>{saveNotice}</span></section> : null}
      {localError ? <section role="alert" aria-live="assertive" className="trade-pricing-save-error"><Info size={16} /><span>{localError}</span></section> : null}
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
        <PreviewStep vendor={vendor} service={service} packages={packages} config={config} draft={draft} fields={fields} addons={addons} media={media} onOpenListings={onOpenListings} onManageMedia={() => setMediaOpen(true)} onPreviewAction={message => setPreviewAction(message)} onEditStep={goTo} />
      ) : null}

      {!readOnly && isPreview ? (
        <div className="trade-pricing-review-summary">
          <strong>{validation.length ? validation.length + ' required ' + (validation.length === 1 ? 'item' : 'items') + ' remaining' : 'Ready for Sambramo review'}</strong>
          <span>{validation.length ? 'Tap Submit to see exactly what needs to be completed.' : 'All mandatory pricing inputs are complete.'}</span>
        </div>
      ) : null}

      {!readOnly ? (
        <div className="trade-pricing-bottom">
          <button type="button" data-pricing-action="save-draft" onClick={() => save('DRAFT')} disabled={saving} aria-disabled={saving} className="trade-pricing-secondary-action">
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          {isPreview ? (
            <button type="button" data-pricing-action="submit-review" onClick={() => save('UNDER_REVIEW')} disabled={saving} aria-disabled={saving} className="trade-pricing-primary-action">
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
  const inclusions = Array.isArray(draft?.commercial_inputs?.inclusions) ? draft.commercial_inputs.inclusions : []
  const suggestions = Array.from(new Set([
    ...(INCLUSIONS_BY_MODE[config.mode] ?? []),
    ...(config?.fields ?? []).map(field => 'Standard ' + String(field.label || '').toLowerCase()).filter(Boolean),
  ])).slice(0, 10)
  const toggleInclusion = item => {
    const next = inclusions.includes(item) ? inclusions.filter(x => x !== item) : [...inclusions, item]
    onUpdateCommercial('inclusions', next)
  }
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

        <div className="trade-pricing-inclusions-editor">
          <div className="trade-pricing-description-head">
            <div><p className="trade-pricing-label">What is included?</p><p className="trade-pricing-helper">Select only what you will actually deliver in this package. Customers see these exact choices.</p></div>
            <Pencil size={16} className="shrink-0 text-[#6D28D9]" />
          </div>
          <div className="trade-pricing-inclusion-chip-grid">
            {suggestions.map(item => <button key={item} type="button" disabled={readOnly} onClick={() => toggleInclusion(item)} className={'trade-pricing-inclusion-chip ' + (inclusions.includes(item) ? 'is-selected' : '')}>{inclusions.includes(item) ? <Check size={12}/> : <Plus size={12}/>}<span>{item}</span></button>)}
          </div>
          <label className="trade-pricing-custom-inclusion">
            <span>Add your own</span>
            <input disabled={readOnly} placeholder="e.g. 2 proof rounds, delivery + setup" onKeyDown={e => { if(e.key==='Enter'){e.preventDefault(); const v=e.currentTarget.value.trim(); if(v&&!inclusions.includes(v)){onUpdateCommercial('inclusions',[...inclusions,v]);e.currentTarget.value=''}}}} />
          </label>
          {inclusions.length ? <div className="trade-pricing-selected-summary"><strong>{inclusions.length} included</strong><div className="trade-pricing-selected-list">{inclusions.map(item => <button key={item} type="button" disabled={readOnly} onClick={() => onUpdateCommercial('inclusions', inclusions.filter(x => x !== item))}>{item}<span>×</span></button>)}</div></div> : <div className="trade-pricing-selected-summary is-empty"><strong>Nothing selected yet</strong><span>Add only the inclusions you truly provide.</span></div>}
        </div>
      </div>
    </section>
  )
}

function DetailsStep({ config, fields, draft, readOnly, onUpdate }) {
  const selectedEvents = readSupportedEvents(draft?.trade_inputs ?? {})
  const setEvents = next => onUpdate('supported_events', next)
  const showEventSelector = String(config?.trade_id ?? '').startsWith('E') || config?.trade_id === 'L08'
  return (
    <section className="trade-pricing-panel trade-step-details">
      <div className="trade-pricing-card">
        <SectionHeader icon={Ruler} title="Trade specific fields" subtitle={'Only the controls for ' + config.name + ' are shown.'} />
        {showEventSelector ? (
          <div className="trade-event-multiselect">
            <div className="trade-event-multiselect-head">
              <div>
                <p className="trade-pricing-label">Events you serve</p>
                <p className="trade-event-help">Select every occasion this package is suitable for. Customers will see the selected occasions in your preview.</p>
              </div>
              <span>{selectedEvents.length} selected</span>
            </div>
            <div className="trade-event-chips">
              {SAMBRAMO_EVENT_OPTIONS.map(event => {
                const selected = selectedEvents.includes(event)
                return <button key={event} type="button" disabled={readOnly} onClick={() => setEvents(selected ? selectedEvents.filter(x => x !== event) : [...selectedEvents, event])} className={'trade-event-chip ' + (selected ? 'is-selected' : '')}>{event}</button>
              })}
            </div>
          </div>
        ) : null}
        <div className="trade-pricing-fields-grid trade-specific-grid">
          {fields.filter(field => !(showEventSelector && field.key === 'event_type')).map(field => (
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
  const name = String(config?.name || '').toLowerCase()
  const isCatalog = ['CATALOG'].includes(config?.mode) || /print|invitation|gift|cake|food|material|supplier/.test(name)
  const usesDuration = units.some(u => /hour|day/.test(u))
  const usesQuantity = units.some(u => /guest|person|plate|item|piece|set|unit|trip|vehicle|staff|guard/.test(u))
  const usesSiteSetup = /venue|decor|rental|equipment|tent|stage|logistics|catering|crew|setup/.test(name) && !/print|invitation|photo|video/.test(name)
  return (
    <section className="trade-pricing-panel trade-step-pricing">
      <div className="trade-pricing-card">
        <SectionHeader icon={WalletCards} title="Set your price" subtitle="Only the pricing choices relevant to this service are shown." />

        <div className="trade-pricing-field-row">
          <ChoiceField required label="Package level" value={draft.tier} disabled={readOnly} options={PACKAGE_TIERS} allowCustom onChange={v => onUpdate('tier', v)} />
        </div>

        <div className="trade-pricing-base-price">
          <div className="min-w-0">
            <p className="trade-pricing-label">What should customers pay?</p>
            <div className="trade-pricing-price-presets">
              {PRICE_PRESETS.slice(0, 4).map(amount => (
                <button key={amount} type="button" disabled={readOnly} onClick={() => onUpdate('base_price', String(amount))} className={'trade-pricing-price-chip ' + (Number(draft.base_price) === amount ? 'is-selected' : '')}>{formatINR(amount)}</button>
              ))}
              <button type="button" disabled={readOnly} onClick={() => onUpdate('base_price', '')} className="trade-pricing-price-chip">Custom</button>
            </div>
          </div>
          <CurrencyPresetField required label="Your price (₹)" value={draft.base_price} disabled={readOnly} presets={[500,1000,2500,5000,7500,10000,15000,25000,50000,100000,250000,500000]} onChange={v => onUpdate('base_price', v)} />
        </div>

        <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-3">
          <ChoiceField required label="Charge as" value={draft.pricing_unit} disabled={readOnly} options={units.map(x => [x, titleizeUnit(x)])} onChange={v => onUpdate('pricing_unit', v)} />
          <PresetNumberField required label={isCatalog ? 'Minimum quantity' : 'Minimum booking'} value={draft.minimum_order} disabled={readOnly} presets={presetsForMinimum(config, draft.pricing_unit)} suffix={minimumSuffix(draft.pricing_unit)} onChange={v => onUpdate('minimum_order', v)} />
          {usesDuration ? <PresetNumberField label="Included time" value={draft.included_duration} disabled={readOnly} presets={durationPresets(config, draft.pricing_unit)} suffix="hours / days" onChange={v => onUpdate('included_duration', v)} /> : <div className="trade-pricing-optional-placeholder"><span>Included time</span><strong>Not needed for this service</strong></div>}
        </div>

        <div className="trade-pricing-simple-rules">
          <PresetNumberField required label={isCatalog ? 'Ready in' : 'How much notice?'} value={draft.lead_time} disabled={readOnly} presets={LEAD_TIME_PRESETS} suffix="days" onChange={v => onUpdate('lead_time', v)} />
          <ChoiceField required label="Where do you serve?" value={draft.travel_policy} disabled={readOnly} options={TRAVEL_POLICIES} onChange={v => onUpdate('travel_policy', v)} />
          <ChoiceField required label="How should customers book?" value={draft.availability_policy} disabled={readOnly} options={[['instant','Book instantly'],['request','Request approval'],['schedule','Choose a date'],['quote','Get a quote']]} onChange={v => onUpdate('availability_policy', v)} />
        </div>

        {(usesQuantity || usesDuration) ? (
          <details className="trade-pricing-advanced">
            <summary>More pricing options</summary>
            <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-2">
              {usesQuantity ? <CurrencyPresetField label="Extra unit price" value={draft.additional_unit_rate} disabled={readOnly} presets={[50,100,250,500,750,1000,1500,2500,5000,10000]} onChange={v => onUpdate('additional_unit_rate', v)} /> : null}
              {usesDuration ? <CurrencyPresetField label="Extra time price" value={draft.additional_duration_rate} disabled={readOnly} presets={[100,250,500,750,1000,1500,2500,5000,10000]} onChange={v => onUpdate('additional_duration_rate', v)} /> : null}
            </div>
            {usesSiteSetup ? <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-2"><FeeChoice label="Setup fee" value={draft.setup_fee} disabled={readOnly} onChange={v => onUpdate('setup_fee', v)} /><FeeChoice label="Pack-down / teardown" value={draft.teardown_fee} disabled={readOnly} onChange={v => onUpdate('teardown_fee', v)} /></div> : null}
            <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-2">
              <ChoiceField required label="Cancellation" value={draft.cancellation_policy} disabled={readOnly} options={[['flexible','Flexible'],['standard','48-hour notice'],['strict','7-day notice'],['non_refundable','Non-refundable'],['custom','Custom']]} allowCustom onChange={v => onUpdate('cancellation_policy', v)} />
              <ChoiceField required label="Payment" value={draft.payment_policy} disabled={readOnly} options={[['full','Full at booking'],['deposit25','25% deposit'],['deposit50','50% deposit'],['completion','Pay on completion'],['custom','Custom']]} allowCustom onChange={v => onUpdate('payment_policy', v)} />
            </div>
          </details>
        ) : null}

        <div className="trade-pricing-rule-strip">
          <span><strong>Customer sees</strong>{formatINR(draft.base_price || 0)}</span>
          <span><strong>Minimum</strong>{draft.minimum_order ? draft.minimum_order + ' ' + minimumSuffix(draft.pricing_unit) : 'Select'}</span>
          <span><strong>Ready in</strong>{draft.lead_time === '' ? 'Select' : draft.lead_time + ' days'}</span>
        </div>
      </div>
    </section>
  )
}

function addonArtwork(name) {
  const text = String(name ?? '').toLowerCase()
  if (/photo|camera|album|drone/.test(text)) return { Icon: Camera, tone: 'rose', note: 'Photo / visual upgrade' }
  if (/video|film|reel|edit/.test(text)) return { Icon: Video, tone: 'blue', note: 'Video / content upgrade' }
  if (/travel|trip|vehicle|pickup|truck|transport|fuel/.test(text)) return { Icon: Truck, tone: 'mint', note: 'Transport or route extra' }
  if (/crew|staff|worker|guard|operator|person|host/.test(text)) return { Icon: Users, tone: 'lilac', note: 'Additional people or support' }
  if (/flower|floral|decor|stage|backdrop|mandap/.test(text)) return { Icon: Flower2, tone: 'amber', note: 'Decor / setup upgrade' }
  if (/music|sound|dj|artist|perform/.test(text)) return { Icon: Music2, tone: 'blue', note: 'Entertainment upgrade' }
  if (/food|meal|menu|drink|catering|live counter/.test(text)) return { Icon: Utensils, tone: 'mint', note: 'Food / service extra' }
  if (/time|hour|duration|overtime|extended|priority/.test(text)) return { Icon: Clock3, tone: 'amber', note: 'Extra time or priority' }
  if (/box|item|material|equipment|inventory|rental|storage/.test(text)) return { Icon: Boxes, tone: 'lilac', note: 'Extra item or equipment' }
  if (/location|venue|distance|coverage|travel/.test(text)) return { Icon: MapPin, tone: 'rose', note: 'Location / coverage extra' }
  if (/power|electric|fast|express|upgrade/.test(text)) return { Icon: Zap, tone: 'amber', note: 'Service upgrade' }
  return { Icon: Package, tone: 'lilac', note: 'Optional service extra' }
}

function AddonsStep({ config, addons, suggestions, readOnly, onAdd, onUpdate, onRemove }) {
  return (
    <section className="trade-pricing-panel trade-step-addons">
      <div className="trade-pricing-card">
        <div className="trade-pricing-section-heading">
          <SectionHeader icon={CirclePlus} title="Add-ons" subtitle={'Optional extras for ' + config.name + '. Select only extras you can deliver.'} />
          {!readOnly ? <button type="button" onClick={() => onAdd()} className="trade-pricing-small-action"><Plus size={14} /> Add custom</button> : null}
        </div>
        <div className="trade-pricing-addon-guidance"><ShieldCheck size={15} /><span>These are optional upgrades. Add a rate and unit only for extras you genuinely offer. Customers will see your selections and prices.</span></div>

        <div className="trade-pricing-addon-grid">
          {suggestions.map(template => {
            const selected = addons.some(item => String(item.name).trim().toLowerCase() === template.name.trim().toLowerCase())
            const art = addonArtwork(template.name)
            const ArtIcon = art.Icon
            return (
              <button key={template.id} type="button" disabled={readOnly || selected} onClick={() => onAdd(template)} className={'trade-pricing-addon-card addon-tone-' + art.tone + (selected ? ' is-selected' : '')}>
                <span className="trade-pricing-addon-art"><ArtIcon size={25} strokeWidth={1.8} /></span>
                <span className="trade-pricing-addon-copy"><strong>{template.name}</strong><small>{art.note}</small><em>{selected ? <><Check size={11} /> Added to your package</> : <><Plus size={11} /> Add this extra</>}</em></span>
                {selected ? <span className="trade-pricing-addon-check"><Check size={14} /></span> : null}
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

function PreviewStep({ vendor, service, config, packages = [], draft, fields, addons, media, onManageMedia, onPreviewAction, onEditStep }) {
  const action = message => onPreviewAction?.(message)
  return (
    <section className="trade-pricing-panel trade-step-preview sambramo-preview-page">
      <div className="sambramo-preview-toolbar">
        <div className="min-w-0">
          <p className="trade-pricing-overline">Partner preview · customer storefront</p>
          <h2>Preview your customer-facing catalog</h2>
          <p>The card below is generated from the package, event types, pricing, inclusions, add-ons and approved portfolio media you have entered.</p>
        </div>
        <button type="button" onClick={onManageMedia} className="sambramo-preview-manage">
          <Images size={16} /> Manage media
        </button>
      </div>
      <SambramoPartnerPreviewCard
        vendor={vendor}
        service={service}
        config={config}
        draft={draft}
        packages={packages}
        addons={addons}
        media={media}
        onEdit={step => onEditStep?.(step)}
        onManageMedia={value => {
          if (value === 'back') action('Preview stays on this pricing step.')
          else if (value === 'events') onEditStep?.('details')
          else if (String(value || '').startsWith('addon:')) onEditStep?.('addons')
          else onManageMedia?.()
        }}
      />
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

function hasFieldValue(value) {
  return Array.isArray(value) ? value.length > 0 : value !== '' && value != null
}

function TradeFieldControl({ field, config, value, disabled, onChange, required = false }) {
  const schema = getFieldSchema(field, config)
  if (schema.multi) return <MultiChoiceField required={required} label={field.label} value={value} disabled={disabled} options={schema.options ?? []} onChange={onChange} />
  if (schema.control === 'currency') return <CurrencyPresetField required={required} label={field.label} value={value} disabled={disabled} presets={schema.presets ?? [50,100,250,500,1000,2500,5000,10000]} onChange={onChange} />
  if (schema.control === 'stepper' || schema.control === 'duration') return <PresetNumberField required={required} label={field.label} value={value} disabled={disabled} presets={schema.presets} suffix={schema.control === 'duration' ? 'value' : field.key.includes('km') ? 'km' : field.key.includes('hour') ? 'hours' : field.key.includes('day') ? 'days' : field.key.includes('people') || field.key.includes('staff') || field.key.includes('guards') ? 'people' : 'units'} onChange={onChange} />
  return <ChoiceField required={required} label={field.label} value={value} disabled={disabled} options={schema.options ?? []} allowCustom onChange={onChange} />
}

function MultiChoiceField({ label, value, options, disabled = false, required = false, onChange }) {
  const selected = Array.isArray(value) ? value : String(value ?? '').split(',').map(x => x.trim()).filter(Boolean)
  const [custom, setCustom] = useState('')
  const toggle = option => onChange(selected.includes(option) ? selected.filter(x => x !== option) : [...selected, option])
  const addCustom = () => {
    const v = custom.trim()
    if (!v) return
    if (!selected.includes(v)) onChange([...selected, v])
    setCustom('')
  }
  return (
    <label className="trade-pricing-field trade-multi-choice">
      <span className="trade-pricing-field-label">{label}{required ? <span className="trade-pricing-required">*</span> : null}<small>Select all that apply</small></span>
      <div className="trade-multi-choice-options">
        {(options ?? []).map(option => {
          const [id,text] = Array.isArray(option) ? option : [option, option]
          const chosen = selected.includes(id)
          return <button key={id} type="button" disabled={disabled} onClick={() => toggle(id)} className={'trade-multi-choice-chip ' + (chosen ? 'is-selected' : '')}>{chosen ? <Check size={12}/> : <Plus size={12}/>}<span>{text}</span></button>
        })}
      </div>
      {!disabled ? <div className="trade-multi-custom"><input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => {if(e.key==='Enter'){e.preventDefault();addCustom()}}} placeholder="Add custom option" /><button type="button" onClick={addCustom}>Add</button></div> : null}
    </label>
  )
}

function TextField({ label, value, onChange, placeholder = '', disabled = false, required = false }) {
  const packageNameField = label === 'Package name'
  return (
    <label className="trade-pricing-field">
      <span className="trade-pricing-field-label">{label}{required ? <span className="trade-pricing-required">*</span> : null}</span>
      <input
        data-pricing-package-name={packageNameField ? 'true' : undefined}
        value={value ?? ''}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
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
