import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, BadgeCheck, CalendarDays, Check, ChevronDown, ChevronLeft,
  CirclePlus, Clock3, Eye, FileText, Home, Images, Info, Loader2,
  Package, Pencil, Plus, Ruler, ShieldCheck, Sparkles, Trash2,
  Upload, WalletCards, X,
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
} from '../../data/sambramoPricingCatalog'

const UNIT_OPTIONS = {
  PACKAGE: ['package', 'per event', 'per hour', 'per day', 'per function'],
  RATE_CARD: ['per trip', 'per km', 'per hour', 'per day', 'per event'],
  CATALOG: ['per item', 'per piece', 'per batch', 'package', 'per event'],
  HYBRID: ['package', 'per person', 'per guest', 'per hour', 'per event'],
  CUSTOM: ['custom quote', 'per event', 'per day', 'per project'],
}

const ADDON_UNITS = [
  ['per item', 'Per item'],
  ['per piece', 'Per piece'],
  ['per guest', 'Per guest'],
  ['per hour', 'Per hour'],
  ['per day', 'Per day'],
  ['per trip', 'Per trip'],
  ['per event', 'Per event'],
]

const SECTIONS = [
  ['package', 'Package', 'Package card'],
  ['details', 'Trade Fields', 'Trade-specific fields'],
  ['pricing', 'Pricing', 'Pricing rules'],
  ['addons', 'Add-ons', 'Optional extras'],
  ['preview', 'Preview', 'Customer preview'],
]

const SITE_DEPENDENT = new Set(['E04', 'E05', 'E10', 'E13', 'E17', 'E22', 'E23', 'L08'])

function blankPackage(config, service) {
  const units = UNIT_OPTIONS[config.mode] ?? UNIT_OPTIONS.PACKAGE
  return {
    id: null,
    source: 'PARTNER_CUSTOM',
    template_id: '',
    name: '',
    tier: '',
    description: '',
    revision_round: 0,
    commercial_inputs: {
      inclusions: INCLUSIONS_BY_MODE[config.mode] ?? [],
      exclusions: EXCLUSIONS_BY_MODE[config.mode] ?? [],
    },
    trade_inputs: {},
    base_price: service?.price != null ? String(service.price) : '',
    pricing_unit: units.includes(service?.unit) ? service.unit : units[0],
    minimum_order: String(service?.min_quantity ?? 1),
    included_quantity: '',
    included_duration: '',
    additional_unit_rate: '',
    additional_duration_rate: '',
    setup_fee: '',
    teardown_fee: '',
    travel_policy: '',
    lead_time: service?.lead_time_days ?? '',
    status: 'DRAFT',
    pricing_version: 0,
    addons: [],
  }
}

function normalizeLoaded(pkg, priceBook, service) {
  const q = priceBook?.quantity_formula ?? {}
  const c = pkg.commercial_inputs ?? {}
  return {
    id: pkg.id,
    source: pkg.source ?? 'PARTNER_CUSTOM',
    template_id: pkg.template_id ?? '',
    name: pkg.name ?? '',
    tier: c.tier ?? '',
    description: pkg.description ?? '',
    revision_round: pkg.revision_round ?? 0,
    commercial_inputs: c,
    trade_inputs: pkg.trade_inputs ?? {},
    base_price: priceBook?.rate_paise != null
      ? String(Number(priceBook.rate_paise) / 100)
      : (service?.price != null ? String(service.price) : ''),
    pricing_unit: priceBook?.unit ?? 'package',
    minimum_order: priceBook?.minimum_quantity ?? 1,
    included_quantity: priceBook?.included_quantity ?? '',
    included_duration: q.included_duration ?? '',
    additional_unit_rate: q.additional_unit_rate ?? '',
    additional_duration_rate: q.additional_duration_rate ?? '',
    setup_fee: q.setup_fee ?? '',
    teardown_fee: q.teardown_fee ?? '',
    travel_policy: q.travel_policy ?? '',
    lead_time: q.lead_time ?? service?.lead_time_days ?? '',
    status: pkg.status ?? 'DRAFT',
    pricing_version: priceBook?.version ?? 0,
    addons: pkg.addons ?? [],
  }
}

function inferTier(name) {
  const value = String(name ?? '').toLowerCase()
  if (value.includes('luxury')) return 'luxury'
  if (value.includes('premium')) return 'premium'
  if (value.includes('classic')) return 'classic'
  if (value.includes('basic') || value.includes('essential')) return 'essential'
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
      const ids = (rows ?? []).map(x => x.id)
      const [pricesRes, addonsRes] = await Promise.all([
        ids.length
          ? supabase.from('sambramo_partner_price_books')
              .select('id,vendor_service_id,offering_id,unit,rate_paise,minimum_quantity,included_quantity,quantity_formula,status,version,effective_from,effective_to')
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
        price: prices.find(p => p.offering_id === String(pkg.id) && p.status === 'draft')
          ?? prices.find(p => p.offering_id === String(pkg.id))
          ?? null,
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

  function startCustom() {
    setEditor(blankPackage(config, service))
  }

  function startTemplate(template) {
    setEditor({
      ...blankPackage(config, service),
      source: 'SAMBRAMO_TEMPLATE',
      template_id: template[0],
      name: template[1],
      tier: inferTier(template[1]),
    })
  }

  function openExisting(pkg) {
    setEditor(normalizeLoaded(pkg, pkg.price, service))
  }

  if (editor) {
    return (
      <TradePackageEditor
        vendor={vendor}
        service={service}
        config={config}
        draft={editor}
        setDraft={setEditor}
        onBack={() => setEditor(null)}
        onSaved={async () => { setEditor(null); await load() }}
        readOnly={editor.status === 'LIVE'}
        onOpenListings={onOpenListings}
      />
    )
  }

  return (
    <div className="trade-pricing-catalog w-full min-w-0 space-y-4 pb-5">
      <header className="flex min-w-0 items-center gap-3 px-1 pt-1">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Back" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#2A085C] ring-1 ring-[#E7E2EF]">
            <ChevronLeft size={21} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#665A7B]">Pricing catalog</p>
          <h2 className="truncate text-[24px] font-black leading-tight text-[#211735]">{config.name}</h2>
        </div>
      </header>

      <section className="rounded-[24px] bg-[#F6F2FB] p-4 ring-1 ring-[#E8E0F2]">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#2A085C] ring-1 ring-[#E1D9EE]"><WalletCards size={19} /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#786A8A]">Listed service only</p>
            <h3 className="mt-1 text-[20px] font-black text-[#211735]">{service?.name || config.name}</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6B5B85]">Build a clear package catalog for this exact partner listing. Unrelated trades stay outside this pricing lane.</p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl bg-[#FFF1F3] p-3.5 text-[12px] text-[#8B1830] ring-1 ring-[#F2C6CF]">
          <p className="font-extrabold">Pricing could not be loaded</p>
          <p className="mt-1 break-words">{error}</p>
          <button type="button" onClick={load} className="mt-2 rounded-xl bg-white px-3 py-2 font-extrabold ring-1 ring-[#E8C5CD]">Try again</button>
        </section>
      ) : null}

      <section className="rounded-[24px] bg-white p-3.5 ring-1 ring-[#E7E2EF]">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#786A8A]">Your packages</p>
            <h3 className="mt-1 text-[19px] font-black text-[#211735]">{packages.length} package{packages.length === 1 ? '' : 's'}</h3>
          </div>
          <button type="button" onClick={startCustom} className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-full bg-[#F0EAF8] px-4 text-[12px] font-extrabold text-[#2A085C] ring-1 ring-[#E0D5F0]"><Plus size={15} /> Add</button>
        </div>

        {loading ? (
          <div className="flex min-h-[120px] items-center justify-center"><Loader2 size={23} className="animate-spin text-[#6D28D9]" /></div>
        ) : packages.length ? (
          <div className="space-y-2.5">
            {packages.map(pkg => (
              <button type="button" key={pkg.id} onClick={() => openExisting(pkg)} className="w-full min-w-0 rounded-[20px] bg-[#FBFAFD] p-3.5 text-left ring-1 ring-[#E8E2EE]">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#EEE7FA] text-[#2A085C]">{pkg.source === 'SAMBRAMO_TEMPLATE' ? <Sparkles size={17} /> : <Package size={17} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-extrabold text-[#211735]">{pkg.name || 'Unnamed package'}</span>
                    <span className="mt-1 block text-[11.5px] text-[#6B5B85]">
                      {pkg.status === 'LIVE' ? 'Live' : pkg.status === 'UNDER_REVIEW' ? 'Under review' : 'Draft'}
                      {pkg.price?.rate_paise != null ? ' · ' + formatINR(Math.round(Number(pkg.price.rate_paise) / 100)) + ' ' + pkg.price.unit : ' · price not set'}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#F0EAF8] px-2.5 py-1.5 text-[10px] font-extrabold text-[#5B21B6]">{pkg.status === 'UNDER_REVIEW' ? 'Reviewing' : pkg.status === 'LIVE' ? 'Enabled' : 'Draft'}</span>
                </div>
                <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-[#EBE6F0]">
                  <span className="min-w-0 truncate text-[11px] font-bold text-[#665A7B]">{(pkg.addons ?? []).filter(a => a.active).length} active add-ons · {pkg.description || 'Trade-specific package'}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-[#2A085C]">Edit <ArrowRight size={13} /></span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-[#DCCFEA] bg-[#FBFAFD] p-5 text-center">
            <CirclePlus className="mx-auto text-[#6D28D9]" size={23} />
            <p className="mt-2 text-[14px] font-extrabold text-[#211735]">No package yet</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#6B5B85]">Choose a ready structure or create your own package.</p>
            <button type="button" onClick={() => startTemplate(config.templates?.[0])} disabled={!config.templates?.length} className="mt-3 rounded-2xl bg-[#EEE7FA] px-4 py-2.5 text-[11.5px] font-extrabold text-[#2A085C] disabled:opacity-50">Use first template</button>
          </div>
        )}
      </section>
    </div>
  )
}

function TradePackageEditor({ vendor, service, config, draft, setDraft, onBack, onSaved, readOnly, onOpenListings }) {
  const [activeStep, setActiveStep] = useState('package')
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')
  const [addons, setAddons] = useState(draft.addons ?? [])
  const [media, setMedia] = useState([])

  useEffect(() => {
    setAddons(draft.addons ?? [])
  }, [draft.id])

  useEffect(() => {
    let alive = true
    async function loadMedia() {
      if (!vendor?.id) return
      const { rows } = await fetchWork(vendor.id)
      const live = (rows ?? []).filter(x => x.review_status === 'live' && ['photo', 'video'].includes(x.kind)).slice(0, 6)
      const urls = await signedUrlsFor(live.map(x => x.storage_path), 900)
      if (alive) setMedia(live.map(x => ({ ...x, url: urls[x.storage_path] })).filter(x => x.url))
    }
    loadMedia()
    return () => { alive = false }
  }, [vendor?.id])

  const fields = config.fields ?? []
  const descriptionSuggestions = useMemo(() => getDescriptionSuggestions(config), [config])
  const addonSuggestions = useMemo(() => getAddonSuggestions(config), [config])
  const nameSuggestions = useMemo(() => getPackageNameSuggestions(config), [config])

  const update = (key, value) => setDraft(d => ({ ...d, [key]: value }))
  const updateTrade = (key, value) => setDraft(d => ({ ...d, trade_inputs: { ...(d.trade_inputs ?? {}), [key]: value } }))
  const updateCommercial = (key, value) => setDraft(d => ({ ...d, commercial_inputs: { ...(d.commercial_inputs ?? {}), [key]: value } }))

  const validation = useMemo(() => {
    const out = []
    if (!String(draft.name ?? '').trim()) out.push('Package name is required.')
    if (!String(draft.description ?? '').trim()) out.push('Choose a short customer-ready description.')
    if (draft.base_price !== '' && Number(draft.base_price) < 0) out.push('Base price cannot be negative.')
    if (Number(draft.minimum_order || 0) <= 0) out.push('Minimum order must be greater than zero.')
    if (config.mode !== 'CUSTOM' && Number(draft.base_price || 0) <= 0) out.push('Enter a positive base rate before submitting.')
    for (const field of fields) {
      if (field.required === false) continue
      if (draft.trade_inputs?.[field.key] === '' || draft.trade_inputs?.[field.key] == null) out.push('Complete ' + field.label + '.')
    }
    return [...new Set(out)]
  }, [draft, config.mode, fields])

  const stepReady = useMemo(() => {
    const detailsReady = !fields.some(field => field.required !== false && (draft.trade_inputs?.[field.key] === '' || draft.trade_inputs?.[field.key] == null))
    return {
      package: Boolean(String(draft.name ?? '').trim() && String(draft.description ?? '').trim() && draft.tier && draft.pricing_unit),
      details: detailsReady,
      pricing: config.mode === 'CUSTOM' || Number(draft.base_price || 0) > 0,
      addons: true,
      preview: validation.length === 0,
    }
  }, [draft, fields, config.mode, validation])

  useEffect(() => {
    const targets = SECTIONS
      .map(([id]) => document.getElementById('trade-pricing-' + id))
      .filter(Boolean)
    if (!targets.length || !('IntersectionObserver' in window)) return undefined
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible?.target?.id) setActiveStep(visible.target.id.replace('trade-pricing-', ''))
    }, { rootMargin: '-18% 0px -62% 0px', threshold: [0.15, 0.4, 0.7] })
    targets.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [draft.id])

  function scrollTo(id) {
    setActiveStep(id)
    requestAnimationFrame(() => {
      document.getElementById('trade-pricing-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function continueToNext() {
    const index = Math.max(0, SECTIONS.findIndex(x => x[0] === activeStep))
    const next = SECTIONS[index + 1]
    if (next) scrollTo(next[0])
  }

  async function save(status) {
    if (readOnly || saving) return
    setLocalError('')
    if (status === 'UNDER_REVIEW' && validation.length) {
      setLocalError(validation.join(' '))
      return
    }
    setSaving(true)
    try {
      const pPackage = {
        name: draft.name,
        source: draft.source,
        template_id: draft.template_id || null,
        description: draft.description || null,
        revision_round: Number(draft.revision_round || 0),
        commercial_inputs: { ...(draft.commercial_inputs ?? {}), tier: draft.tier || null },
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
        .filter(a => String(a.name ?? '').trim())
        .map((a, i) => ({ ...a, sort_order: i }))
      const { data, error } = await supabase.rpc('save_sambramo_trade_package', {
        p_vendor_service_id: service.id,
        p_package_id: draft.id || null,
        p_package: pPackage,
        p_addons: payloadAddons,
        p_pricing: pPricing,
      })
      if (error) throw error
      if (data?.ok === false) throw new Error(data.reason ?? 'Could not save this pricing package.')
      await onSaved()
    } catch (e) {
      setLocalError(e?.message ?? 'Could not save this pricing package.')
    } finally {
      setSaving(false)
    }
  }

  const currentLabel = SECTIONS.find(x => x[0] === activeStep)?.[1] ?? 'Package'
  const nextSection = SECTIONS[Math.min(SECTIONS.length - 1, SECTIONS.findIndex(x => x[0] === activeStep) + 1)]
  const isPreview = activeStep === 'preview'

  return (
    <div className="trade-pricing-screen w-full min-w-0 overflow-x-clip pb-[calc(10rem+env(safe-area-inset-bottom))]">
      <header className="trade-pricing-header flex w-full min-w-0 items-center gap-3 px-1 pb-3 pt-1">
        <button type="button" onClick={onBack} aria-label="Back" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#2A085C] ring-1 ring-[#E5DFEB]">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#2A085C]">Pricing · {config.name}</p>
          <h1 className="mt-1 truncate text-[25px] font-black leading-[1.05] tracking-[-0.02em] text-[#211735]">{draft.name || service?.name || 'New package'}</h1>
        </div>
        <button type="button" onClick={() => scrollTo('preview')} aria-label="Customer preview" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#2A085C] ring-1 ring-[#E5DFEB]">
          <Eye size={20} />
        </button>
      </header>

      <StepRail activeStep={activeStep} ready={stepReady} onSelect={scrollTo} />

      {localError ? (
        <section role="alert" className="mx-0 mb-3 rounded-2xl bg-[#FFF1F3] p-3 text-[12px] font-semibold leading-relaxed text-[#8B1830] ring-1 ring-[#F0C6CF]">
          {localError}
        </section>
      ) : null}

      <section id="trade-pricing-package" className="trade-pricing-panel bg-white">
        <PackageSection
          config={config}
          draft={draft}
          readOnly={readOnly}
          nameSuggestions={nameSuggestions}
          descriptionSuggestions={descriptionSuggestions}
          update={update}
          updateCommercial={updateCommercial}
          onSelectTemplate={template => updateDraftFromTemplate(template, draft, setDraft)}
        />
      </section>

      <section id="trade-pricing-details" className="trade-pricing-panel bg-white">
        <TradeDetailsSection fields={fields} config={config} draft={draft} readOnly={readOnly} updateTrade={updateTrade} />
      </section>

      <section id="trade-pricing-pricing" className="trade-pricing-panel bg-white">
        <PricingSection config={config} draft={draft} readOnly={readOnly} update={update} />
      </section>

      <section id="trade-pricing-addons" className="trade-pricing-panel bg-white">
        <AddonsSection config={config} addons={addons} readOnly={readOnly} suggestions={addonSuggestions} addAddon={addAddon} updateAddon={updateAddon} removeAddon={removeAddon} />
      </section>

      <section id="trade-pricing-preview" className="trade-pricing-panel bg-white">
        <CustomerPreviewSection config={config} draft={draft} fields={fields} addons={addons} media={media} />
      </section>

      <div className="trade-pricing-bottom">
        <button type="button" onClick={() => save('DRAFT')} disabled={readOnly || saving} className="trade-pricing-secondary-action">
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        {isPreview ? (
          <button type="button" onClick={() => save('UNDER_REVIEW')} disabled={readOnly || saving || validation.length > 0} className="trade-pricing-primary-action">
            {saving ? 'Submitting…' : 'Submit pricing for review'}
          </button>
        ) : (
          <button type="button" onClick={continueToNext} disabled={readOnly || saving || !stepReady[activeStep]} className="trade-pricing-primary-action">
            Continue to {nextSection[0] === 'preview' ? 'Preview' : nextSection[1]} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )

  function addAddon(template = null) {
    const next = template
      ? { id: globalThis.crypto?.randomUUID?.() ?? ('tmp-' + Date.now()), name: template.name, rate_paise: '', unit: defaultAddonUnit(config), minimum_quantity: '1', included_quantity: '0', active: true, sort_order: addons.length }
      : { id: globalThis.crypto?.randomUUID?.() ?? ('tmp-' + Date.now()), name: '', rate_paise: '', unit: defaultAddonUnit(config), minimum_quantity: '1', included_quantity: '0', active: true, sort_order: addons.length }
    setAddons(current => [...current, next])
  }

  function updateAddon(id, patch) {
    setAddons(current => current.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  function removeAddon(id) {
    setAddons(current => current.filter(x => x.id !== id))
  }
}

function updateDraftFromTemplate(template, draft, setDraft) {
  if (!template) return
  setDraft(current => ({
    ...current,
    source: 'SAMBRAMO_TEMPLATE',
    template_id: template[0],
    name: template[1],
    tier: inferTier(template[1]),
  }))
}

function StepRail({ activeStep, ready, onSelect }) {
  return (
    <nav className="trade-pricing-steps" aria-label="Pricing setup steps">
      {SECTIONS.map(([id, label], index) => {
        const active = id === activeStep
        const complete = ready[id] && id !== active
        return (
          <button key={id} type="button" onClick={() => onSelect(id)} className={'trade-pricing-step ' + (active ? 'is-active' : '')}>
            <span className={'trade-pricing-step-circle ' + (complete ? 'is-complete' : '')}>{complete ? <Check size={13} strokeWidth={3} /> : index + 1}</span>
            <span className="trade-pricing-step-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function PackageSection({ config, draft, readOnly, nameSuggestions, descriptionSuggestions, update, updateCommercial, onSelectTemplate }) {
  const selectedDescription = draft.description
  return (
    <div className="trade-pricing-card">
      <SectionHeader icon={Package} title="Package card" subtitle="Choose a package template or create your own." action={
        <select value={draft.template_id || ''} disabled={readOnly} onChange={e => {
          const template = config.templates.find(t => t[0] === e.target.value)
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
        <div className="trade-pricing-field-row trade-pricing-field-row-2">
          <ChoiceField label="Package name" value={draft.name} disabled={readOnly} options={nameSuggestions.map(x => [x, x])} allowCustom onChange={v => update('name', v)} />
          <ChoiceField label="Package tier" value={draft.tier} disabled={readOnly} options={PACKAGE_TIERS} allowCustom onChange={v => update('tier', v)} />
        </div>
        <div className="trade-pricing-field-row trade-pricing-field-row-2">
          <ChoiceField label="Pricing unit" value={draft.pricing_unit} disabled={readOnly} options={(UNIT_OPTIONS[config.mode] ?? UNIT_OPTIONS.PACKAGE).map(x => [x, titleizeUnit(x)])} onChange={v => update('pricing_unit', v)} />
          <CurrencyField label="Base commercial rate" value={draft.base_price} disabled={readOnly} onChange={v => update('base_price', v)} />
        </div>
      </div>

      <div className="trade-pricing-description-head">
        <div className="min-w-0">
          <p className="trade-pricing-label">Recommended description</p>
          <p className="trade-pricing-helper">Choose a description or edit it to match your business.</p>
        </div>
        <Pencil size={16} className="shrink-0 text-[#6D28D9]" />
      </div>

      <div className="trade-pricing-description-grid">
        {descriptionSuggestions.slice(0, 5).map((text, index) => {
          const selected = selectedDescription === text
          return (
            <button key={text} type="button" disabled={readOnly} onClick={() => update('description', text)} className={'trade-pricing-description-card ' + (selected ? 'is-selected' : '')}>
              <span className="trade-pricing-radio">{selected ? <Check size={12} /> : null}</span>
              <span className="trade-pricing-description-text">{text}</span>
            </button>
          )
        })}
      </div>

      <div className="trade-pricing-edit-description">
        <textarea value={draft.description ?? ''} disabled={readOnly} rows={3} onChange={e => update('description', e.target.value)} placeholder="Edit the selected description here…" />
      </div>

      <div className="trade-pricing-field-row trade-pricing-field-row-2">
        <PresetNumberField label="Minimum order" value={draft.minimum_order} disabled={readOnly} presets={getMinimumOrderPresets(config, draft.pricing_unit)} suffix={minimumSuffix(draft.pricing_unit)} onChange={v => update('minimum_order', v)} />
        <PresetNumberField label="Included quantity" value={draft.included_quantity} disabled={readOnly} presets={getIncludedQuantityPresets(config, draft.pricing_unit)} suffix={quantitySuffix(draft.pricing_unit)} onChange={v => update('included_quantity', v)} />
      </div>

      <div className="trade-pricing-field-row trade-pricing-field-row-2">
        <PresetNumberField label="Included duration" value={draft.included_duration} disabled={readOnly} presets={[1, 2, 4, 6, 8, 12, 24]} suffix="value" onChange={v => update('included_duration', v)} />
        <PresetNumberField label="Lead time" value={draft.lead_time} disabled={readOnly} presets={LEAD_TIME_PRESETS} suffix="days" onChange={v => update('lead_time', v)} />
      </div>

      <ChoiceField label="Travel policy" value={draft.travel_policy} disabled={readOnly} options={TRAVEL_POLICIES} onChange={v => update('travel_policy', v)} />

      <StructuredList label="Inclusions" values={draft.commercial_inputs?.inclusions ?? []} suggested={INCLUSIONS_BY_MODE[config.mode] ?? []} disabled={readOnly} onChange={v => updateCommercial('inclusions', v)} />
      <StructuredList label="Exclusions" values={draft.commercial_inputs?.exclusions ?? []} suggested={EXCLUSIONS_BY_MODE[config.mode] ?? []} disabled={readOnly} onChange={v => updateCommercial('exclusions', v)} />
    </div>
  )
}

function TradeDetailsSection({ fields, config, draft, readOnly, updateTrade }) {
  return (
    <div className="trade-pricing-card">
      <SectionHeader icon={Ruler} title="Trade specific fields" subtitle="Help customers understand your service better." />
      <div className="trade-pricing-fields-grid">
        {fields.map(field => (
          field.key === 'sku'
            ? <TextField key={field.key} label={field.label} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} placeholder="Partner SKU" onChange={v => updateTrade(field.key, v)} />
            : <TradeFieldControl key={field.key} field={field} config={config} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} onChange={v => updateTrade(field.key, v)} />
        ))}
      </div>
      {SITE_DEPENDENT.has(config.trade_id) ? (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#FBF7FF] p-3 text-[11px] leading-relaxed text-[#6B5B85] ring-1 ring-[#E9DFF4]">
          <Info size={15} className="mt-0.5 shrink-0 text-[#6D28D9]" />
          <span>Site measurements, access, route complexity or physical unknowns can move the final request into a survey / quote lane.</span>
        </div>
      ) : null}
    </div>
  )
}

function PricingSection({ config, draft, readOnly, update }) {
  return (
    <div className="trade-pricing-card">
      <SectionHeader icon={WalletCards} title="Pricing rules" subtitle="Set your base pricing and conditions." />

      <div className="trade-pricing-base-price">
        <div className="min-w-0 flex-1">
          <p className="trade-pricing-label">Base price</p>
          <div className="trade-pricing-price-presets">
            {PRICE_PRESETS.slice(0, 3).map(amount => (
              <button key={amount} type="button" disabled={readOnly} onClick={() => update('base_price', String(amount))} className={'trade-pricing-price-chip ' + (Number(draft.base_price) === amount ? 'is-selected' : '')}>{formatINR(amount)}</button>
            ))}
            <button type="button" disabled={readOnly} onClick={() => update('base_price', '')} className="trade-pricing-price-chip">Custom</button>
          </div>
        </div>
        <CurrencyField label="Your price (₹)" value={draft.base_price} disabled={readOnly} onChange={v => update('base_price', v)} />
      </div>

      <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-3">
        <ChoiceField label="Price applies to" value={draft.pricing_unit} disabled={readOnly} options={(UNIT_OPTIONS[config.mode] ?? UNIT_OPTIONS.PACKAGE).map(x => [x, titleizeUnit(x)])} onChange={v => update('pricing_unit', v)} />
        <PresetNumberField label="Minimum order" value={draft.minimum_order} disabled={readOnly} presets={getMinimumOrderPresets(config, draft.pricing_unit)} suffix={minimumSuffix(draft.pricing_unit)} onChange={v => update('minimum_order', v)} />
        <PresetNumberField label="Included duration" value={draft.included_duration} disabled={readOnly} presets={[1, 2, 4, 6, 8, 12, 24]} suffix="value" onChange={v => update('included_duration', v)} />
      </div>

      <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-4">
        <PresetNumberField label="Lead time" value={draft.lead_time} disabled={readOnly} presets={LEAD_TIME_PRESETS} suffix="days" onChange={v => update('lead_time', v)} />
        <ChoiceField label="Travel policy" value={draft.travel_policy} disabled={readOnly} options={TRAVEL_POLICIES} onChange={v => update('travel_policy', v)} />
        <FeeChoice label="Setup charge" value={draft.setup_fee} disabled={readOnly} onChange={v => update('setup_fee', v)} />
        <FeeChoice label="Teardown charge" value={draft.teardown_fee} disabled={readOnly} onChange={v => update('teardown_fee', v)} />
      </div>

      <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-2">
        <CurrencyField label="Additional unit rate" value={draft.additional_unit_rate} disabled={readOnly} onChange={v => update('additional_unit_rate', v)} />
        <CurrencyField label="Additional duration rate" value={draft.additional_duration_rate} disabled={readOnly} onChange={v => update('additional_duration_rate', v)} />
      </div>
    </div>
  )
}

function AddonsSection({ config, addons, readOnly, suggestions, addAddon, updateAddon, removeAddon }) {
  return (
    <div className="trade-pricing-card">
      <div className="trade-pricing-section-heading">
        <SectionHeader icon={CirclePlus} title="Add-ons" subtitle="Offer additional services to increase your earnings." />
        {!readOnly ? <button type="button" onClick={() => addAddon()} className="trade-pricing-small-action"><Plus size={14} /> Add custom</button> : null}
      </div>

      <div className="trade-pricing-addon-grid">
        {suggestions.map(template => {
          const selected = addons.some(x => String(x.name).trim().toLowerCase() === template.name.trim().toLowerCase())
          return (
            <button key={template.id} type="button" disabled={readOnly || selected} onClick={() => addAddon(template)} className={'trade-pricing-addon-card ' + (selected ? 'is-selected' : '')}>
              <span className="trade-pricing-addon-check">{selected ? <Check size={13} /> : null}</span>
              <span className="block min-w-0 truncate text-[11px] font-extrabold">{template.name}</span>
              <span className="mt-0.5 block text-[10px] font-bold text-[#6B5B85]">{selected ? 'Selected' : 'Tap to add'}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 space-y-2">
        {addons.map(addon => (
          <div key={addon.id} className="rounded-2xl bg-[#FBFAFD] p-3 ring-1 ring-[#E7E2EF]">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <TextField label="Add-on name" value={addon.name} disabled={readOnly} placeholder="Custom add-on" onChange={v => updateAddon(addon.id, { name: v })} />
              </div>
              {!readOnly ? <button type="button" onClick={() => removeAddon(addon.id)} aria-label="Remove add-on" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#6B5B85] ring-1 ring-[#E7E2EF]"><Trash2 size={13} /></button> : null}
            </div>
            <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-2 mt-2">
              <CurrencyField label="Rate ₹" value={addon.rate_paise === '' ? '' : String(Number(addon.rate_paise || 0) / 100)} disabled={readOnly} onChange={v => updateAddon(addon.id, { rate_paise: v === '' ? '' : Math.round(Number(v) * 100) })} />
              <ChoiceField label="Unit" value={addon.unit} disabled={readOnly} options={ADDON_UNITS} onChange={v => updateAddon(addon.id, { unit: v })} />
            </div>
          </div>
        ))}
      </div>

      {!addons.length ? (
        <div className="mt-3 rounded-2xl border border-dashed border-[#DCCFEA] bg-[#FBFAFD] p-4 text-center">
          <Plus className="mx-auto text-[#6D28D9]" size={20} />
          <p className="mt-1.5 text-[11.5px] font-extrabold text-[#211735]">No add-ons selected</p>
          <p className="mt-1 text-[10.5px] text-[#6B5B85]">Choose a recommended extra above or add your own.</p>
        </div>
      ) : null}
    </div>
  )
}

function CustomerPreviewSection({ config, draft, fields, addons, media }) {
  const selectedFields = fields.filter(f => draft.trade_inputs?.[f.key] !== '' && draft.trade_inputs?.[f.key] != null)
  const heroMedia = media[0]
  return (
    <div className="trade-pricing-customer-preview">
      <div className="trade-pricing-preview-heading">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white"><Eye size={17} /></span>
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold text-white">Customer preview</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/72">This is how your package will appear to customers.</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10.5px] font-extrabold text-white">View full preview <ArrowRight size={13} className="ml-1 inline" /></span>
      </div>

      <div className="trade-pricing-preview-body">
        <div className="trade-pricing-preview-media">
          {heroMedia?.kind === 'video' ? (
            <video src={heroMedia.url} muted playsInline controls className="h-full w-full object-cover" />
          ) : heroMedia?.url ? (
            <img src={heroMedia.url} alt="Partner catalog" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/10 text-white/75">
              <Images size={28} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="trade-pricing-preview-overline">{config.name}</p>
          <h3 className="mt-1 text-[21px] font-black leading-tight text-white">{draft.name || 'Your package'}</h3>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/78">{draft.description || 'Choose a customer-ready description above.'}</p>

          <div className="trade-pricing-preview-metrics">
            <PreviewMetric label="Price" value={draft.base_price ? formatINR(Number(draft.base_price)) + ' / ' + titleizeUnit(draft.pricing_unit) : 'Quote'} />
            <PreviewMetric label="Minimum" value={String(draft.minimum_order || 1) + ' ' + minimumSuffix(draft.pricing_unit)} />
            <PreviewMetric label="Lead time" value={draft.lead_time === '' ? '—' : draft.lead_time + ' days'} />
            {selectedFields.slice(0, 1).map(field => <PreviewMetric key={field.key} label={field.label} value={String(draft.trade_inputs[field.key])} />)}
          </div>
        </div>
      </div>

      {media.length > 1 ? (
        <div className="trade-pricing-preview-media-strip">
          {media.slice(0, 4).map(item => item.url ? (
            <div key={item.id} className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10">
              {item.kind === 'video' ? <video src={item.url} muted playsInline className="h-full w-full object-cover" /> : <img src={item.url} alt="" className="h-full w-full object-cover" />}
            </div>
          ) : null)}
          <span className="self-center text-[10px] font-extrabold text-white/65">{media.length} catalog items</span>
        </div>
      ) : null}

      <div className="trade-pricing-preview-footer">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-white/78"><ShieldCheck size={13} /> Real approved partner work can appear here.</span>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-white/78"><BadgeCheck size={13} /> Review-ready catalog</span>
      </div>
    </div>
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
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

function ChoiceField({ label, value, onChange, options, disabled = false, allowCustom = false }) {
  const normalized = (options ?? []).map(x => Array.isArray(x) ? x : [x, x])
  const isCustom = allowCustom && value !== '' && !normalized.some(x => x[0] === value)
  return (
    <label className="trade-pricing-field">
      <span className="trade-pricing-field-label">{label}</span>
      <span className="trade-pricing-select-wrap">
        <select value={isCustom ? '__custom__' : (value ?? '')} disabled={disabled} onChange={e => onChange(e.target.value === '__custom__' ? '' : e.target.value)}>
          <option value="">Select</option>
          {normalized.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
          {allowCustom ? <option value="__custom__">Custom / type my own</option> : null}
        </select>
        <ChevronDown size={15} />
      </span>
      {allowCustom && isCustom ? <input value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} className="trade-pricing-custom-inline" placeholder="Custom value" /> : null}
    </label>
  )
}

function TextField({ label, value, onChange, placeholder = '', disabled = false }) {
  return (
    <label className="trade-pricing-field">
      <span className="trade-pricing-field-label">{label}</span>
      <input value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </label>
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

function PresetNumberField({ label, value, onChange, presets = [], suffix = '', disabled = false }) {
  const numbers = presets.map(Number)
  const current = value === '' || value == null ? '' : Number(value)
  const selected = numbers.includes(Number(current))
  return (
    <label className="trade-pricing-field">
      <span className="trade-pricing-field-label">{label}</span>
      <span className="trade-pricing-select-wrap">
        <select value={current === '' ? '' : selected ? String(current) : '__custom__'} disabled={disabled} onChange={e => onChange(e.target.value === '__custom__' ? '' : e.target.value)}>
          <option value="">Select</option>
          {numbers.slice(0, 8).map(x => <option key={x} value={x}>{x} {suffix}</option>)}
          <option value="__custom__">Custom value</option>
        </select>
        <ChevronDown size={15} />
      </span>
      {!disabled && !selected && current !== '' ? <input type="number" min="0" value={current} onChange={e => onChange(e.target.value)} placeholder="Custom value" className="trade-pricing-custom-inline" /> : null}
    </label>
  )
}

function FeeChoice({ label, value, onChange, disabled = false }) {
  const included = Number(value || 0) === 0
  return (
    <ChoiceField
      label={label}
      value={included ? 'included' : String(value)}
      disabled={disabled}
      options={[['included', 'Included'], ['250', '₹250'], ['500', '₹500'], ['1000', '₹1,000'], ['2500', '₹2,500']]}
      allowCustom
      onChange={v => onChange(v === 'included' ? '0' : v)}
    />
  )
}

function StructuredList({ label, values, suggested, disabled, onChange }) {
  const current = Array.isArray(values) ? values : []
  const toggle = item => current.includes(item) ? onChange(current.filter(x => x !== item)) : onChange([...current, item])
  return (
    <div className="trade-pricing-structured">
      <p className="trade-pricing-label">{label}</p>
      <div className="trade-pricing-pills">
        {suggested.map(item => {
          const selected = current.includes(item)
          return (
            <button key={item} type="button" disabled={disabled} onClick={() => toggle(item)} className={'trade-pricing-pill ' + (selected ? 'is-selected' : '')}>{selected ? '✓ ' : '+ '}{item}</button>
          )
        })}
      </div>
      <p className="mt-1.5 text-[10.5px] text-[#6B5B85]">Selected: {current.length ? current.join(' · ') : 'None'}</p>
    </div>
  )
}

function TradeFieldControl({ field, config, value, disabled, onChange }) {
  const schema = getFieldSchema(field, config)
  if (schema.control === 'currency') return <CurrencyField label={field.label} value={value} disabled={disabled} onChange={onChange} />
  if (schema.control === 'stepper' || schema.control === 'duration') return <PresetNumberField label={field.label} value={value} disabled={disabled} presets={schema.presets} suffix={schema.control === 'duration' ? 'value' : field.key.includes('km') ? 'km' : 'units'} onChange={onChange} />
  return <ChoiceField label={field.label} value={value} disabled={disabled} options={schema.options ?? []} allowCustom onChange={onChange} />
}

function PreviewMetric({ label, value }) {
  return (
    <div className="trade-pricing-preview-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function titleizeUnit(value) {
  return String(value ?? '').split(' ').map(x => x ? x[0].toUpperCase() + x.slice(1) : x).join(' ')
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
  return 'units'
}

function quantitySuffix(unit) { return minimumSuffix(unit) }

function defaultAddonUnit(config) {
  if (config?.mode === 'RATE_CARD') return 'per trip'
  if (config?.mode === 'CATALOG') return 'per item'
  if (config?.trade_id === 'E01') return 'per guest'
  return 'per event'
}
