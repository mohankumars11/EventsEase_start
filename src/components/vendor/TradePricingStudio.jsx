import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronDown, CirclePlus,
  Clock3, Eye, Images, Info, Loader2, Pencil, Plus, Ruler, ShieldCheck,
  Sparkles, Trash2, Upload, WalletCards, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import WorkLibrary from './WorkLibrary'
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

const STEPS = [
  ['package', 'Package', 'Package card'],
  ['details', 'Trade Fields', 'Trade-specific fields'],
  ['pricing', 'Pricing', 'Pricing rules'],
  ['addons', 'Add-ons', 'Optional extras'],
  ['preview', 'Preview', 'Customer preview'],
]

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
    revision_round: 0,
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
    const next = blankPackage(config, service)
    setEditor(next)
  }

  function startTemplate(template) {
    if (!template) return
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
      <header className="flex w-full min-w-0 items-center gap-3 px-1 pt-1">
        <button type="button" onClick={onBack} aria-label="Back to pricing" className="trade-pricing-round-button">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="trade-pricing-overline">Pricing catalog</p>
          <h2 className="trade-pricing-page-title">{config.name}</h2>
        </div>
      </header>

      <section className="trade-pricing-intro">
        <span className="trade-pricing-icon-bubble"><WalletCards size={19} /></span>
        <div className="min-w-0">
          <p className="trade-pricing-overline">Listed service only</p>
          <h3 className="trade-pricing-intro-title">{service?.name || config.name}</h3>
          <p className="trade-pricing-intro-copy">Build a clean package catalog for this exact listing. Unrelated trades stay outside this pricing lane.</p>
        </div>
      </section>

      {error ? (
        <section className="trade-pricing-error">
          <strong>Pricing could not be loaded</strong>
          <span>{error}</span>
          <button type="button" onClick={load}>Try again</button>
        </section>
      ) : null}

      <section className="trade-pricing-list-card">
        <div className="trade-pricing-list-head">
          <div className="min-w-0">
            <p className="trade-pricing-overline">Your packages</p>
            <h3 className="trade-pricing-list-count">{packages.length} package{packages.length === 1 ? '' : 's'}</h3>
          </div>
          <button type="button" onClick={startCustom} className="trade-pricing-light-button"><Plus size={15} /> Add</button>
        </div>

        {loading ? (
          <div className="trade-pricing-loader"><Loader2 className="animate-spin" size={23} /></div>
        ) : packages.length ? (
          <div className="space-y-2.5">
            {packages.map(pkg => (
              <button key={pkg.id} type="button" onClick={() => openExisting(pkg)} className="trade-pricing-package-list-item">
                <span className="trade-pricing-package-symbol">{pkg.source === 'SAMBRAMO_TEMPLATE' ? <Sparkles size={17} /> : <WalletCards size={17} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-extrabold text-[#211735]">{pkg.name || 'Unnamed package'}</span>
                  <span className="mt-1 block truncate text-[11.5px] text-[#6B5B85]">
                    {pkg.status === 'UNDER_REVIEW' ? 'Under review' : pkg.status === 'LIVE' ? 'Live' : 'Draft'}
                    {pkg.price?.rate_paise != null ? ' · ' + formatINR(Math.round(Number(pkg.price.rate_paise) / 100)) + ' ' + pkg.price.unit : ' · price not set'}
                  </span>
                </span>
                <span className="trade-pricing-status-pill">{pkg.status === 'UNDER_REVIEW' ? 'Reviewing' : pkg.status === 'LIVE' ? 'Enabled' : 'Draft'}</span>
                <ArrowRight className="shrink-0 text-[#6B5B85]" size={16} />
              </button>
            ))}
          </div>
        ) : (
          <div className="trade-pricing-empty">
            <CirclePlus size={22} />
            <p>No package yet</p>
            <span>Choose a trade-specific starter or create your own package.</span>
            <div className="flex flex-wrap justify-center gap-2">
              {(config.templates ?? []).slice(0, 2).map(template => (
                <button key={template[0]} type="button" onClick={() => startTemplate(template)} className="trade-pricing-empty-button">{template[1]}</button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function TradePackageEditor({ vendor, service, config, draft, setDraft, onBack, onSaved, readOnly, onOpenListings }) {
  const [step, setStep] = useState('package')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const [addons, setAddons] = useState(draft.addons ?? [])
  const [media, setMedia] = useState([])

  const fields = config.fields ?? []
  const nameSuggestions = useMemo(() => getPackageNameSuggestions(config), [config])
  const descriptionSuggestions = useMemo(() => getDescriptionSuggestions(config), [config])
  const addonSuggestions = useMemo(() => getAddonSuggestions(config), [config])

  useEffect(() => { setAddons(draft.addons ?? []) }, [draft.id])

  useEffect(() => {
    let alive = true
    async function loadMedia() {
      if (!vendor?.id) return
      const { rows } = await fetchWork(vendor.id)
      const approved = (rows ?? []).filter(x => x.review_status === 'live' && ['photo', 'video'].includes(x.kind)).slice(0, 8)
      const urls = await signedUrlsFor(approved.map(x => x.storage_path), 900)
      if (alive) setMedia(approved.map(x => ({ ...x, url: urls[x.storage_path] })).filter(x => x.url))
    }
    loadMedia()
    return () => { alive = false }
  }, [vendor?.id])

  const update = (key, value) => setDraft(d => ({ ...d, [key]: value }))
  const updateTrade = (key, value) => setDraft(d => ({ ...d, trade_inputs: { ...(d.trade_inputs ?? {}), [key]: value } }))
  const updateCommercial = (key, value) => setDraft(d => ({ ...d, commercial_inputs: { ...(d.commercial_inputs ?? {}), [key]: value } }))

  const validation = useMemo(() => {
    const out = []
    if (!String(draft.name ?? '').trim()) out.push('Choose a package name.')
    if (!String(draft.description ?? '').trim()) out.push('Choose a customer-ready description.')
    if (config.mode !== 'CUSTOM' && Number(draft.base_price || 0) <= 0) out.push('Enter a positive base price.')
    if (Number(draft.minimum_order || 0) <= 0) out.push('Minimum order must be greater than zero.')
    for (const field of fields) {
      if (draft.trade_inputs?.[field.key] === '' || draft.trade_inputs?.[field.key] == null) {
        out.push('Complete ' + field.label + '.')
      }
    }
    return [...new Set(out)]
  }, [draft, config.mode, fields])

  const ready = useMemo(() => ({
    package: Boolean(String(draft.name ?? '').trim() && String(draft.description ?? '').trim()),
    details: fields.every(f => draft.trade_inputs?.[f.key] !== '' && draft.trade_inputs?.[f.key] != null),
    pricing: config.mode === 'CUSTOM' || Number(draft.base_price || 0) > 0,
    addons: true,
    preview: validation.length === 0,
  }), [draft, fields, config.mode, validation])

  function changeStep(target) {
    if (!target) return
    setSaveError('')
    setStep(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function continueStep() {
    const idx = STEPS.findIndex(x => x[0] === step)
    const next = STEPS[idx + 1]
    if (next) changeStep(next[0])
  }

  function previousStep() {
    const idx = STEPS.findIndex(x => x[0] === step)
    const prev = STEPS[idx - 1]
    if (prev) changeStep(prev[0])
    else onBack()
  }

  async function save(status) {
    if (readOnly || saving) return
    setSaveError('')
    if (status === 'UNDER_REVIEW' && validation.length) {
      setSaveError(validation.join(' '))
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
      const payloadAddons = addons.filter(a => String(a.name ?? '').trim()).map((a, i) => ({ ...a, sort_order: i }))
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
      setSaveError(e?.message ?? 'Could not save this pricing package.')
    } finally {
      setSaving(false)
    }
  }

  const activeMeta = STEPS.find(x => x[0] === step)
  const nextMeta = STEPS[Math.min(STEPS.length - 1, STEPS.findIndex(x => x[0] === step) + 1)]
  const progress = Math.round(((STEPS.findIndex(x => x[0] === step) + 1) / STEPS.length) * 100)

  return (
    <div className="trade-pricing-screen">
      <header className="trade-pricing-header">
        <button type="button" onClick={previousStep} aria-label="Back" className="trade-pricing-round-button">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="trade-pricing-overline">Pricing · {config.name}</p>
          <h1 className="trade-pricing-page-title">{draft.name || service?.name || 'New package'}</h1>
        </div>
        <button type="button" onClick={() => changeStep('preview')} aria-label="Customer preview" className="trade-pricing-round-button">
          <Eye size={20} />
        </button>
      </header>

      <StepRail step={step} ready={ready} onSelect={changeStep} />

      <div className="trade-pricing-progress-copy">
        <span>{activeMeta?.[1]}</span>
        <span>{progress}%</span>
      </div>

      {saveError ? (
        <section className="trade-pricing-save-error" role="alert">
          <Info size={16} />
          <span>{saveError}</span>
        </section>
      ) : null}

      {step === 'package' ? (
        <PackageStep
          config={config}
          draft={draft}
          readOnly={readOnly}
          nameSuggestions={nameSuggestions}
          descriptionSuggestions={descriptionSuggestions}
          update={update}
          updateCommercial={updateCommercial}
        />
      ) : null}

      {step === 'details' ? (
        <DetailsStep
          config={config}
          fields={fields}
          draft={draft}
          readOnly={readOnly}
          updateTrade={updateTrade}
          onOpenListings={onOpenListings}
        />
      ) : null}

      {step === 'pricing' ? (
        <PricingStep config={config} draft={draft} readOnly={readOnly} update={update} />
      ) : null}

      {step === 'addons' ? (
        <AddonsStep config={config} addons={addons} readOnly={readOnly} suggestions={addonSuggestions} addAddon={(t) => setAddons(a => [...a, addonDraft(config, t, a.length)])} updateAddon={(id, patch) => setAddons(a => a.map(x => x.id === id ? { ...x, ...patch } : x))} removeAddon={id => setAddons(a => a.filter(x => x.id !== id))} />
      ) : null}

      {step === 'preview' ? (
        <PreviewStep
          config={config}
          draft={draft}
          fields={fields}
          addons={addons}
          media={media}
          onManageMedia={() => setShowMediaLibrary(true)}
        />
      ) : null}

      <div className="trade-pricing-bottom">
        <button type="button" onClick={() => save('DRAFT')} disabled={readOnly || saving} className="trade-pricing-secondary-action">
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        {step === 'preview' ? (
          <button type="button" onClick={() => save('UNDER_REVIEW')} disabled={readOnly || saving || validation.length > 0} className="trade-pricing-primary-action">
            {saving ? 'Submitting…' : 'Submit pricing for review'}
          </button>
        ) : (
          <button type="button" onClick={continueStep} disabled={readOnly || saving || !ready[step]} className="trade-pricing-primary-action">
            Continue to {nextMeta?.[1] ?? 'Preview'} <ArrowRight size={16} />
          </button>
        )}
      </div>

      {showMediaLibrary ? (
        <div className="trade-pricing-sheet-backdrop" onMouseDown={() => setShowMediaLibrary(false)}>
          <div className="trade-pricing-sheet" onMouseDown={e => e.stopPropagation()}>
            <div className="trade-pricing-sheet-header">
              <div>
                <p className="trade-pricing-overline">Partner catalog</p>
                <h3 className="trade-pricing-sheet-title">Photos & videos customers can explore</h3>
                <p className="trade-pricing-sheet-copy">Add real work to your profile catalog. New uploads stay under Sambramo review until approved.</p>
              </div>
              <button type="button" onClick={() => setShowMediaLibrary(false)} className="trade-pricing-round-button"><X size={18} /></button>
            </div>
            <WorkLibrary vendor={vendor} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StepRail({ step, ready, onSelect }) {
  return (
    <nav className="trade-pricing-steps" aria-label="Pricing setup">
      {STEPS.map(([id, label], index) => {
        const active = id === step
        const complete = ready[id] && !active
        return (
          <button key={id} type="button" onClick={() => onSelect(id)} className={'trade-pricing-step ' + (active ? 'is-active' : '') + (complete ? ' is-complete' : '')}>
            <span className="trade-pricing-step-circle">{complete ? <Check size={14} strokeWidth={3} /> : index + 1}</span>
            <span className="trade-pricing-step-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function PackageStep({ config, draft, readOnly, nameSuggestions, descriptionSuggestions, update, updateCommercial }) {
  return (
    <div className="space-y-3">
      <section className="trade-pricing-card">
        <SectionHeader icon={Sparkles} title="Package card" subtitle="Choose a package template or create your own." />
        <div className="trade-pricing-template-grid">
          {(config.templates ?? []).slice(0, 5).map(([id, label]) => {
            const selected = draft.template_id === id
            return (
              <button key={id} type="button" disabled={readOnly} onClick={() => updateFromTemplate([id, label], update)} className={'trade-pricing-template-card ' + (selected ? 'is-selected' : '')}>
                <span className="trade-pricing-template-icon"><Sparkles size={16} /></span>
                <span className="trade-pricing-template-name">{label}</span>
                {selected ? <span className="trade-pricing-template-check"><Check size={12} /></span> : null}
              </button>
            )
          })}
        </div>

        <div className="trade-pricing-field-row trade-pricing-field-row-2">
          <ChoiceField label="Package name" value={draft.name} disabled={readOnly} options={nameSuggestions.map(x => [x, x])} allowCustom onChange={v => update('name', v)} />
          <ChoiceField label="Package tier" value={draft.tier} disabled={readOnly} options={PACKAGE_TIERS} allowCustom onChange={v => update('tier', v)} />
        </div>

        <div className="trade-pricing-field-row trade-pricing-field-row-2">
          <ChoiceField label="Pricing unit" value={draft.pricing_unit} disabled={readOnly} options={(UNIT_OPTIONS[config.mode] ?? UNIT_OPTIONS.PACKAGE).map(x => [x, titleizeUnit(x)])} onChange={v => update('pricing_unit', v)} />
          <CurrencyField label="Base commercial rate" value={draft.base_price} disabled={readOnly} onChange={v => update('base_price', v)} />
        </div>
      </section>

      <section className="trade-pricing-card">
        <div className="trade-pricing-section-heading">
          <SectionHeader icon={Pencil} title="Recommended description" subtitle="Choose one or edit it to match your business." />
        </div>
        <div className="trade-pricing-description-grid">
          {descriptionSuggestions.slice(0, 5).map((text, index) => {
            const selected = draft.description === text
            return (
              <button key={text} type="button" disabled={readOnly} onClick={() => update('description', text)} className={'trade-pricing-description-card ' + (selected ? 'is-selected' : '')}>
                <span className="trade-pricing-radio">{selected ? <Check size={12} /> : null}</span>
                <span className="trade-pricing-description-text">{index + 1}. {text}</span>
              </button>
            )
          })}
        </div>
        <div className="trade-pricing-edit-description">
          <textarea value={draft.description ?? ''} disabled={readOnly} rows={3} onChange={e => update('description', e.target.value)} placeholder="Edit the selected description here…" />
        </div>
      </section>

      <section className="trade-pricing-card">
        <SectionHeader icon={Info} title="Commercial basics" subtitle="Set the quantities and lead time that customers should see." />
        <div className="trade-pricing-field-row trade-pricing-field-row-2">
          <PresetNumberField label="Minimum order" value={draft.minimum_order} disabled={readOnly} presets={getMinimumOrderPresets(config, draft.pricing_unit)} suffix={minimumSuffix(draft.pricing_unit)} onChange={v => update('minimum_order', v)} />
          <PresetNumberField label="Included quantity" value={draft.included_quantity} disabled={readOnly} presets={getIncludedQuantityPresets(config, draft.pricing_unit)} suffix={quantitySuffix(draft.pricing_unit)} onChange={v => update('included_quantity', v)} />
        </div>
        <div className="trade-pricing-field-row trade-pricing-field-row-2">
          <PresetNumberField label="Included duration" value={draft.included_duration} disabled={readOnly} presets={[1, 2, 4, 6, 8, 12, 24]} suffix="units" onChange={v => update('included_duration', v)} />
          <PresetNumberField label="Lead time" value={draft.lead_time} disabled={readOnly} presets={LEAD_TIME_PRESETS} suffix="days" onChange={v => update('lead_time', v)} />
        </div>
        <ChoiceField label="Travel policy" value={draft.travel_policy} disabled={readOnly} options={TRAVEL_POLICIES} onChange={v => update('travel_policy', v)} />
        <StructuredList label="Inclusions" values={draft.commercial_inputs?.inclusions ?? []} suggested={INCLUSIONS_BY_MODE[config.mode] ?? []} disabled={readOnly} onChange={v => updateCommercial('inclusions', v)} />
        <StructuredList label="Exclusions" values={draft.commercial_inputs?.exclusions ?? []} suggested={EXCLUSIONS_BY_MODE[config.mode] ?? []} disabled={readOnly} onChange={v => updateCommercial('exclusions', v)} />
      </section>
    </div>
  )
}

function DetailsStep({ config, fields, draft, readOnly, updateTrade, onOpenListings }) {
  return (
    <div className="space-y-3">
      <section className="trade-pricing-card">
        <SectionHeader icon={Ruler} title={config.name + ' details'} subtitle="Only the controls that belong to this trade are shown here." />
        <div className="trade-pricing-trade-tag">
          <ShieldCheck size={14} />
          <span>{config.mode === 'RATE_CARD' ? 'Rate-card trade' : config.mode === 'CATALOG' ? 'Catalog trade' : config.mode === 'CUSTOM' ? 'Custom quote trade' : 'Structured package trade'}</span>
        </div>
        <div className="trade-pricing-fields-grid">
          {fields.map(field => {
            const schema = getFieldSchema(field, config)
            if (field.key === 'sku') return <TextField key={field.key} label={field.label} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} placeholder="Partner SKU" onChange={v => updateTrade(field.key, v)} />
            if (schema.control === 'currency') return <CurrencyField key={field.key} label={field.label} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} onChange={v => updateTrade(field.key, v)} />
            if (schema.control === 'stepper' || schema.control === 'duration') return <PresetNumberField key={field.key} label={field.label} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} presets={schema.presets ?? [1,2,4,6,8,10]} suffix={schema.control === 'duration' ? 'units' : fieldUnit(field.key)} onChange={v => updateTrade(field.key, v)} />
            return <ChoiceField key={field.key} label={field.label} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} options={schema.options ?? []} allowCustom onChange={v => updateTrade(field.key, v)} />
          })}
        </div>
        {SITE_DEPENDENT.has(config.trade_id) ? (
          <div className="trade-pricing-info-box"><Info size={15} /><span>This trade can stay structured while site measurement, route complexity or physical verification is handled through a survey / quote step.</span></div>
        ) : null}
        {onOpenListings ? <button type="button" onClick={onOpenListings} className="trade-pricing-link-button">Edit listing capabilities</button> : null}
      </section>
    </div>
  )
}

function PricingStep({ config, draft, readOnly, update }) {
  const units = UNIT_OPTIONS[config.mode] ?? UNIT_OPTIONS.PACKAGE
  return (
    <div className="space-y-3">
      <section className="trade-pricing-card">
        <SectionHeader icon={WalletCards} title="Pricing rules" subtitle="Set your base pricing and customer-facing conditions." />
        <div className="trade-pricing-base-card">
          <div className="trade-pricing-price-preset-area">
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
          <ChoiceField label="Price applies to" value={draft.pricing_unit} disabled={readOnly} options={units.map(x => [x, titleizeUnit(x)])} onChange={v => update('pricing_unit', v)} />
          <PresetNumberField label="Minimum order" value={draft.minimum_order} disabled={readOnly} presets={getMinimumOrderPresets(config, draft.pricing_unit)} suffix={minimumSuffix(draft.pricing_unit)} onChange={v => update('minimum_order', v)} />
          <PresetNumberField label="Included duration" value={draft.included_duration} disabled={readOnly} presets={tradeDurationPresets(config)} suffix={durationLabel(config)} onChange={v => update('included_duration', v)} />
        </div>

        <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-4">
          <PresetNumberField label="Lead time" value={draft.lead_time} disabled={readOnly} presets={LEAD_TIME_PRESETS} suffix="days" onChange={v => update('lead_time', v)} />
          <ChoiceField label="Travel policy" value={draft.travel_policy} disabled={readOnly} options={TRAVEL_POLICIES} onChange={v => update('travel_policy', v)} />
          <FeeChoice label="Setup charge" value={draft.setup_fee} disabled={readOnly} onChange={v => update('setup_fee', v)} />
          <FeeChoice label="Teardown charge" value={draft.teardown_fee} disabled={readOnly} onChange={v => update('teardown_fee', v)} />
        </div>

        <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-2">
          <CurrencyPresetField label="Additional unit rate" value={draft.additional_unit_rate} disabled={readOnly} presets={[50,100,250,500,750,1000,1500,2500]} onChange={v => update('additional_unit_rate', v)} />
          <CurrencyPresetField label="Additional duration rate" value={draft.additional_duration_rate} disabled={readOnly} presets={[100,250,500,750,1000,1500,2500,5000]} onChange={v => update('additional_duration_rate', v)} />
        </div>
      </section>
      <section className="trade-pricing-card">
        <SectionHeader icon={Clock3} title="Commercial snapshot" subtitle="This is the rule Sambramo will store with the package version." />
        <div className="trade-pricing-snapshot-grid">
          <Snapshot label="Unit" value={titleizeUnit(draft.pricing_unit)} />
          <Snapshot label="Minimum" value={(draft.minimum_order || '1') + ' ' + minimumSuffix(draft.pricing_unit)} />
          <Snapshot label="Lead time" value={draft.lead_time === '' ? 'Not set' : draft.lead_time + ' days'} />
          <Snapshot label="Quote lane" value={config.mode === 'CUSTOM' ? 'Custom quote' : 'Structured'} />
        </div>
      </section>
    </div>
  )
}

function AddonsStep({ config, addons, readOnly, suggestions, addAddon, updateAddon, removeAddon }) {
  return (
    <div className="space-y-3">
      <section className="trade-pricing-card">
        <div className="trade-pricing-section-heading">
          <SectionHeader icon={CirclePlus} title="Add-ons" subtitle="Choose optional extras that belong to this trade." />
          {!readOnly ? <button type="button" onClick={() => addAddon()} className="trade-pricing-small-action"><Plus size={14} /> Custom</button> : null}
        </div>

        <div className="trade-pricing-addon-grid">
          {suggestions.map(template => {
            const selected = addons.some(x => String(x.name).trim().toLowerCase() === template.name.trim().toLowerCase())
            return (
              <button key={template.id} type="button" disabled={readOnly || selected} onClick={() => addAddon(template)} className={'trade-pricing-addon-card ' + (selected ? 'is-selected' : '')}>
                <span className="trade-pricing-addon-check">{selected ? <Check size={12} /> : null}</span>
                <span className="block min-w-0 truncate text-[11px] font-extrabold">{template.name}</span>
                <span className="mt-0.5 block text-[10px] font-semibold text-[#6B5B85]">{selected ? 'Selected' : 'Tap to add'}</span>
              </button>
            )
          })}
        </div>

        {!addons.length ? (
          <div className="trade-pricing-addon-empty">
            <Plus size={19} />
            <span>No optional extras selected yet.</span>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {addons.map(addon => (
              <div key={addon.id} className="trade-pricing-addon-editor">
                <div className="flex min-w-0 items-center gap-2">
                  <TextField label="Add-on" value={addon.name} disabled={readOnly} onChange={v => updateAddon(addon.id, { name: v })} placeholder="Custom add-on" />
                  {!readOnly ? <button type="button" onClick={() => removeAddon(addon.id)} aria-label="Remove add-on" className="trade-pricing-delete-button"><Trash2 size={13} /></button> : null}
                </div>
                <div className="trade-pricing-fields-grid trade-pricing-pricing-grid-2 mt-2">
                  <CurrencyPresetField label="Rate" value={addon.rate_paise === '' ? '' : Number(addon.rate_paise || 0) / 100} disabled={readOnly} presets={[50,100,250,500,750,1000,1500,2500,5000]} onChange={v => updateAddon(addon.id, { rate_paise: v === '' ? '' : Math.round(Number(v) * 100) })} />
                  <ChoiceField label="Unit" value={addon.unit} disabled={readOnly} options={ADDON_UNITS} onChange={v => updateAddon(addon.id, { unit: v })} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function PreviewStep({ config, draft, fields, addons, media, onManageMedia }) {
  const selectedFields = fields.filter(f => draft.trade_inputs?.[f.key] !== '' && draft.trade_inputs?.[f.key] != null)
  return (
    <div className="space-y-3">
      <section className="trade-pricing-card trade-pricing-preview-wrapper">
        <div className="trade-pricing-preview-heading">
          <div className="min-w-0">
            <p className="trade-pricing-overline text-white/60">Customer preview</p>
            <h2 className="trade-pricing-preview-title">This is how your package will appear to customers.</h2>
          </div>
          <button type="button" onClick={onManageMedia} className="trade-pricing-preview-media-button"><Upload size={14} /> Manage media</button>
        </div>

        <div className="trade-pricing-preview-main">
          <div className="trade-pricing-preview-media-large">
            {media[0]?.kind === 'video' ? (
              <video src={media[0].url} muted playsInline controls className="h-full w-full object-cover" />
            ) : media[0]?.url ? (
              <img src={media[0].url} alt="Partner catalog" className="h-full w-full object-cover" />
            ) : (
              <div className="trade-pricing-preview-placeholder"><Images size={28} /><span>Add approved work to make this a richer catalog.</span></div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="trade-pricing-preview-overline">{config.name}</p>
            <h3 className="trade-pricing-preview-package">{draft.name || 'Your package'}</h3>
            <p className="trade-pricing-preview-description">{draft.description || 'Choose a customer-ready description above.'}</p>
            <div className="trade-pricing-preview-metrics">
              <PreviewMetric label="Price" value={draft.base_price ? formatINR(Number(draft.base_price)) + ' / ' + titleizeUnit(draft.pricing_unit) : 'Quote'} />
              <PreviewMetric label="Minimum" value={(draft.minimum_order || 1) + ' ' + minimumSuffix(draft.pricing_unit)} />
              <PreviewMetric label="Lead time" value={draft.lead_time === '' ? '—' : draft.lead_time + ' days'} />
              {selectedFields.slice(0, 2).map(field => <PreviewMetric key={field.key} label={field.label} value={String(draft.trade_inputs[field.key])} />)}
            </div>
          </div>
        </div>

        {media.length > 1 ? (
          <div className="trade-pricing-preview-strip">
            {media.slice(0, 4).map(item => (
              <div key={item.id} className="trade-pricing-preview-thumb">
                {item.kind === 'video' ? <video src={item.url} muted playsInline className="h-full w-full object-cover" /> : <img src={item.url} alt="" className="h-full w-full object-cover" />}
              </div>
            ))}
            <span>{media.length} catalog items</span>
          </div>
        ) : null}

        <div className="trade-pricing-preview-tags">
          <span><ShieldCheck size={13} /> Approved partner work can appear here</span>
          <span><BadgeCheck size={13} /> Review-ready pricing</span>
        </div>
      </section>

      <section className="trade-pricing-card">
        <SectionHeader icon={Eye} title="Customer detail summary" subtitle="Only the values selected for this package are shown." />
        {selectedFields.length ? (
          <div className="trade-pricing-selected-values">
            {selectedFields.map(field => <span key={field.key}><strong>{field.label}</strong>{String(draft.trade_inputs[field.key])}</span>)}
          </div>
        ) : (
          <p className="trade-pricing-empty-copy">No trade-specific values selected yet.</p>
        )}
        {addons.length ? (
          <div className="mt-3">
            <p className="trade-pricing-label">Optional extras</p>
            <div className="trade-pricing-selected-values">
              {addons.filter(a => a.name && a.active !== false).map(a => <span key={a.id}><strong>{a.name}</strong>{a.rate_paise ? formatINR(Math.round(Number(a.rate_paise) / 100)) : 'Quote'} · {titleizeUnit(a.unit)}</span>)}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="trade-pricing-section-header">
      <span className="trade-pricing-section-icon"><Icon size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="trade-pricing-section-title">{title}</p>
        <p className="trade-pricing-section-subtitle">{subtitle}</p>
      </div>
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
      {allowCustom && isCustom ? <input className="trade-pricing-custom-inline" value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder="Custom value" /> : null}
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

function CurrencyPresetField({ label, value, onChange, presets = PRICE_PRESETS, disabled = false }) {
  return (
    <div className="trade-pricing-field">
      <span className="trade-pricing-field-label">{label}</span>
      <CurrencyFieldInner value={value} disabled={disabled} onChange={onChange} />
      {!disabled ? (
        <div className="trade-pricing-chip-row">
          {presets.slice(0, 5).map(amount => <button key={amount} type="button" onClick={() => onChange(String(amount))} className={'trade-pricing-mini-chip ' + (Number(value) === amount ? 'is-selected' : '')}>{formatINR(Number(amount))}</button>)}
        </div>
      ) : null}
    </div>
  )
}

function CurrencyFieldInner({ value, onChange, disabled }) {
  return <span className="trade-pricing-currency-wrap"><span>₹</span><input type="number" min="0" value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder="Enter amount" /></span>
}

function PresetNumberField({ label, value, onChange, presets = [], suffix = '', disabled = false }) {
  const numbers = presets.map(Number)
  const current = value === '' || value == null ? '' : Number(value)
  const selected = current !== '' && numbers.includes(Number(current))
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
      {!disabled && current !== '' && !selected ? <input type="number" min="0" value={current} onChange={e => onChange(e.target.value)} className="trade-pricing-custom-inline" placeholder="Custom value" /> : null}
    </label>
  )
}

function FeeChoice({ label, value, onChange, disabled = false }) {
  const amount = Number(value || 0)
  return (
    <ChoiceField label={label} value={amount === 0 ? 'included' : String(value)} disabled={disabled} options={[['included','Included'],['250','₹250'],['500','₹500'],['1000','₹1,000'],['2500','₹2,500']]} allowCustom onChange={v => onChange(v === 'included' ? '0' : v)} />
  )
}

function StructuredList({ label, values, suggested, disabled, onChange }) {
  const current = Array.isArray(values) ? values : []
  function toggle(item) { onChange(current.includes(item) ? current.filter(x => x !== item) : [...current, item]) }
  return (
    <div className="trade-pricing-structured">
      <p className="trade-pricing-label">{label}</p>
      <div className="trade-pricing-pills">
        {suggested.map(item => {
          const active = current.includes(item)
          return <button key={item} type="button" disabled={disabled} onClick={() => toggle(item)} className={'trade-pricing-pill ' + (active ? 'is-selected' : '')}>{active ? '✓ ' : '+ '}{item}</button>
        })}
      </div>
    </div>
  )
}

function PreviewMetric({ label, value }) {
  return <div className="trade-pricing-preview-metric"><span>{label}</span><strong>{value}</strong></div>
}

function Snapshot({ label, value }) {
  return <div className="trade-pricing-snapshot-item"><span>{label}</span><strong>{value}</strong></div>
}

function updateFromTemplate(template, update) {
  if (!template) return
  const [id, label] = template
  update('source', 'SAMBRAMO_TEMPLATE')
  update('template_id', id)
  update('name', label)
  update('tier', inferTier(label))
}

function addonDraft(config, template, sortOrder) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? ('tmp-' + Date.now() + '-' + sortOrder),
    name: template?.name ?? '',
    rate_paise: '',
    unit: template?.unit ?? defaultAddonUnit(config),
    minimum_quantity: '1',
    included_quantity: '0',
    active: true,
    sort_order: sortOrder,
  }
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

function fieldUnit(key) {
  const k = String(key ?? '')
  if (k.includes('guest')) return 'guests'
  if (k.includes('people') || k.includes('staff') || k.includes('guards') || k.includes('attendant')) return 'people'
  if (k.includes('hour') || k === 'duration' || k === 'shift' || k === 'runtime') return 'hours'
  if (k.includes('day')) return 'days'
  if (k.includes('km')) return 'km'
  if (k.includes('kg') || k === 'weight') return 'kg'
  if (k.includes('qty') || k.includes('quantity') || k.includes('items')) return 'units'
  return 'units'
}

function tradeDurationPresets(config) {
  if (['L04','L06'].includes(config.trade_id)) return [1, 2, 3, 7, 14, 30]
  if (['E09','L08'].includes(config.trade_id)) return [1, 2, 4, 8, 12, 24]
  return [1, 2, 4, 6, 8, 10, 12, 24]
}

function durationLabel(config) {
  if (['L04','L06'].includes(config.trade_id)) return 'days'
  return 'hours'
}

function defaultAddonUnit(config) {
  if (config?.mode === 'RATE_CARD') return 'per trip'
  if (config?.mode === 'CATALOG') return 'per item'
  if (config?.trade_id === 'E01') return 'per guest'
  return 'per event'
}

const SITE_DEPENDENT = new Set(['E04', 'E05', 'E10', 'E13', 'E17', 'E22', 'E23', 'L08'])
