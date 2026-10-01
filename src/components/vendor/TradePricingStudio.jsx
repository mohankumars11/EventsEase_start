import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calculator, Check, ChevronRight, CirclePlus, Clock3, Eye,
  Filter, Loader2, Plus, Ruler, ShieldCheck, SlidersHorizontal,
  Sparkles, Trash2, WalletCards, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import {
  COMMON_PRICING_UNITS,
  EXCLUSIONS_BY_MODE,
  INCLUSIONS_BY_MODE,
  LEAD_TIME_PRESETS,
  PACKAGE_TIERS,
  PRICE_PRESETS,
  ROYAL_AMETHYST,
  TRAVEL_POLICIES,
  getAddonSuggestions,
  getDescriptionSuggestions,
  getFieldSchema,
  getIncludedQuantityPresets,
  getMinimumOrderPresets,
  getPackageNameSuggestions,
} from '../../data/sambramoPricingCatalog'

const ADDON_UNITS = [
  ['per item', 'Per item'],
  ['per piece', 'Per piece'],
  ['per guest', 'Per guest'],
  ['per hour', 'Per hour'],
  ['per day', 'Per day'],
  ['per trip', 'Per trip'],
  ['per event', 'Per event'],
]

const UNIT_OPTIONS = {
  PACKAGE: ['package', 'per event', 'per hour', 'per day', 'per function'],
  RATE_CARD: ['per trip', 'per km', 'per hour', 'per day', 'per event'],
  CATALOG: ['per item', 'per piece', 'per batch', 'package', 'per event'],
  HYBRID: ['package', 'per person', 'per guest', 'per hour', 'per event'],
  CUSTOM: ['custom quote', 'per event', 'per day', 'per project'],
}

const SITE_DEPENDENT = new Set(['E04', 'E05', 'E10', 'E13', 'E17', 'E22', 'E23', 'L08'])

const SECTION_NAV = [
  ['package', 'Package card', 'Name, description, tier and commercial basics'],
  ['details', 'Trade fields', 'Only the fields relevant to this listed trade'],
  ['pricing', 'Pricing rules', 'Rates, minimums, duration, travel and setup'],
  ['addons', 'Add-ons', 'Selectable extras with their own pricing rules'],
  ['preview', 'Customer preview', 'See exactly what the customer will receive'],
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
    commercial_inputs: { inclusions: INCLUSIONS_BY_MODE[config.mode] ?? [], exclusions: EXCLUSIONS_BY_MODE[config.mode] ?? [] },
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
  const [editorStep, setEditorStep] = useState('package')
  const [preview, setPreview] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)

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

  const units = UNIT_OPTIONS[config.mode] ?? UNIT_OPTIONS.PACKAGE

  function startCustom() {
    setTemplateOpen(false)
    setPreview(false)
    setEditor(blankPackage(config, service))
    setEditorStep('package')
  }

  function startTemplate(template) {
    setTemplateOpen(false)
    setPreview(false)
    setEditor({
      ...blankPackage(config, service),
      source: 'SAMBRAMO_TEMPLATE',
      template_id: template[0],
      name: template[1],
      tier: inferTier(template[1]),
    })
    setEditorStep('package')
  }

  function openExisting(pkg) {
    setPreview(false)
    setEditor(normalizeLoaded(pkg, pkg.price, service))
    setEditorStep('package')
  }

  if (editor) {
    return (
      <TradePackageEditor
        service={service}
        config={config}
        units={units}
        draft={editor}
        setDraft={setEditor}
        step={editorStep}
        setStep={setEditorStep}
        preview={preview}
        setPreview={setPreview}
        onBack={() => setEditor(null)}
        onSaved={async () => { setEditor(null); await load() }}
        readOnly={editor.status === 'LIVE'}
        setError={setError}
      />
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back to pricing"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-soft ring-1 ring-ink/[0.08]">
            <ChevronRight size={18} className="rotate-180" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2A085C]">Pricing · {config.name}</p>
          <h2 className="truncate text-[23px] font-extrabold leading-tight text-[#2A085C]">{service?.name || config.name}</h2>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] bg-[#2A085C] p-5 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Calculator size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/60">Trade-specific pricing</p>
            <h3 className="mt-1 text-[22px] font-extrabold leading-tight">Configure what you actually sell.</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-white/75">Only this partner listing is in scope. Sambramo keeps the commercial structure consistent while you choose your own package, price and options.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <MetaPill text={config.mode === 'CUSTOM' ? 'Custom quote capable' : 'Structured pricing'} />
          <MetaPill text={config.templates.length + ' starter packages'} />
          {SITE_DEPENDENT.has(config.trade_id) && <MetaPill text="Site-dependent controls" />}
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Your pricing catalog</p>
            <h3 className="mt-1 text-[18px] font-extrabold text-ink">{packages.length} package{packages.length === 1 ? '' : 's'}</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">Pricing is scoped to <span className="font-extrabold text-ink">{service?.name || config.name}</span>. Unrelated trades never enter this editor.</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#2A085C]/[0.07] px-2.5 py-1 text-[9.5px] font-extrabold text-[#2A085C]">{config.trade_id}</span>
        </div>
      </section>

      {error && (
        <section role="alert" className="rounded-2xl bg-rose-50 p-4 text-[12px] text-rose-800 ring-1 ring-rose-200">
          <p className="font-extrabold">Pricing could not be loaded</p>
          <p className="mt-1 break-words">{error}</p>
          <button type="button" onClick={load} className="mt-3 rounded-xl bg-white px-4 py-2 font-extrabold ring-1 ring-rose-200">Try again</button>
        </section>
      )}

      <section className="overflow-hidden rounded-[26px] bg-[#2A085C] p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/60">One-go setup</p>
            <h3 className="mt-1 text-[18px] font-extrabold">Start with a ready structure.</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/75">Pick a Sambramo starter, then use structured controls for the fields that matter to this trade.</p>
          </div>
          <Sparkles size={19} className="text-white/80" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setTemplateOpen(x => !x)} className="rounded-2xl bg-white p-4 text-left text-[#2A085C] transition active:scale-[0.995]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#2A085C]/60">Option 1</p>
            <h4 className="mt-1 text-[15px] font-black">Choose a Sambramo package</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">Start with the trade-specific package structure and tune the commercial details.</p>
          </button>
          <button type="button" onClick={startCustom} className="rounded-2xl bg-white/10 p-4 text-left text-white ring-1 ring-white/15 transition active:scale-[0.995]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-white/60">Option 2</p>
            <h4 className="mt-1 text-[15px] font-black">Create my own package</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-white/70">Keep the same structured trade controls without being forced into a fixed package name.</p>
          </button>
        </div>
        {templateOpen && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {config.templates.map(template => (
              <button key={template[0]} type="button" onClick={() => startTemplate(template)} className="rounded-2xl bg-white p-3 text-left text-ink ring-1 ring-white/10">
                <p className="text-[12px] font-extrabold">{template[1]}</p>
                <p className="mt-1 text-[10.5px] text-ink-mute">{template[0]} · {config.name} starter</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {loading ? (
        <div className="flex items-center justify-center rounded-[24px] bg-white py-14 ring-1 ring-ink/[0.06]"><Loader2 size={23} className="animate-spin text-[#2A085C]" /></div>
      ) : packages.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Configured packages</p>
              <p className="text-[12px] text-ink-mute">Use more than one package when your offer changes by scope or volume.</p>
            </div>
            <button type="button" onClick={startCustom} className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#2A085C] px-3 text-[11.5px] font-extrabold text-white"><Plus size={14} /> Add</button>
          </div>
          {packages.map(pkg => (
            <div key={pkg.id} className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.07]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2A085C] text-white">{pkg.source === 'SAMBRAMO_TEMPLATE' ? <Sparkles size={18} /> : <Calculator size={18} />}</div>
                <button type="button" onClick={() => openExisting(pkg)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-[15px] font-extrabold text-ink">{pkg.name || 'Unnamed package'}</h4>
                    <span className="rounded-full bg-ink/[0.04] px-2 py-0.5 text-[9px] font-extrabold uppercase text-ink-mute">{pkg.source === 'SAMBRAMO_TEMPLATE' ? 'Sambramo package' : 'My package'}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-mute">
                    {pkg.status === 'LIVE' ? 'LIVE' : pkg.status.replaceAll('_', ' ')}
                    {pkg.price?.rate_paise != null ? ' · ' + formatINR(Math.round(Number(pkg.price.rate_paise) / 100)) + ' ' + pkg.price.unit : ' · price not set'}
                    {pkg.price?.version ? ' · v' + pkg.price.version : ''}
                  </p>
                </button>
                <span className={
                  pkg.status === 'LIVE'
                    ? 'flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-700 ring-1 ring-emerald-200'
                    : pkg.status === 'UNDER_REVIEW'
                      ? 'flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1.5 text-[10px] font-extrabold text-amber-800 ring-1 ring-amber-200'
                      : 'flex shrink-0 items-center gap-1 rounded-full bg-ink/[0.04] px-2.5 py-1.5 text-[10px] font-extrabold text-ink-mute ring-1 ring-ink/[0.08]'
                }>
                  {pkg.status === 'LIVE' ? <Check size={13} /> : <Clock3 size={13} />}
                  {pkg.status === 'LIVE' ? 'Enabled' : pkg.status === 'UNDER_REVIEW' ? 'Reviewing' : 'Draft'}
                </span>
              </div>
              <button type="button" onClick={() => openExisting(pkg)} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-surface px-3 py-2.5 text-[11px] font-extrabold text-[#2A085C]">
                <span className="min-w-0 truncate">{(pkg.addons ?? []).filter(a => a.active).length} active add-ons · {pkg.description || 'Trade-specific commercial package'}</span>
                <span className="ml-2 inline-flex shrink-0 items-center gap-1">Open <ChevronRight size={13} /></span>
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className="rounded-[24px] border border-dashed border-[#2A085C]/20 bg-white p-5 text-center">
          <CirclePlus className="mx-auto text-[#2A085C]" size={25} />
          <p className="mt-3 text-[14px] font-extrabold text-ink">No pricing package yet</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">Choose a starter or create your own. Sambramo will keep the fields and pricing lifecycle structured.</p>
        </section>
      )}

      {SITE_DEPENDENT.has(config.trade_id) && (
        <section className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <div className="flex items-center gap-2 text-[12px] font-extrabold text-ink"><ShieldCheck size={15} className="text-[#2A085C]" /> Site-dependent pricing</div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">Where measurements, access, route complexity or another physical unknown affects the final amount, the package stays structured and the final request can move into a survey / quote lane.</p>
        </section>
      )}
    </div>
  )
}

function TradePackageEditor({ service, config, units, draft, setDraft, step, setStep, preview, setPreview, onBack, onSaved, readOnly, setError }) {
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')
  const [addons, setAddons] = useState(draft.addons ?? [])
  const [configureOpen, setConfigureOpen] = useState(false)

  useEffect(() => { setAddons(draft.addons ?? []) }, [draft.id])

  const fields = config.fields ?? []
  const descriptionSuggestions = useMemo(() => getDescriptionSuggestions(config), [config])
  const addonSuggestions = useMemo(() => getAddonSuggestions(config), [config])
  const nameSuggestions = useMemo(() => getPackageNameSuggestions(config), [config])

  const update = (key, value) => setDraft(d => ({ ...d, [key]: value }))
  const updateTradeField = (key, value) => setDraft(d => ({ ...d, trade_inputs: { ...(d.trade_inputs ?? {}), [key]: value } }))
  const updateCommercialArray = (key, value) => setDraft(d => ({ ...d, commercial_inputs: { ...(d.commercial_inputs ?? {}), [key]: value } }))

  function addAddon(template = null) {
    const next = template
      ? { id: globalThis.crypto?.randomUUID?.() ?? ('tmp-' + Date.now()), name: template.name, rate_paise: '', unit: template.unit ?? defaultAddonUnit(config), minimum_quantity: '1', included_quantity: '0', active: true, sort_order: addons.length }
      : { id: globalThis.crypto?.randomUUID?.() ?? ('tmp-' + Date.now()), name: '', rate_paise: '', unit: defaultAddonUnit(config), minimum_quantity: '1', included_quantity: '0', active: true, sort_order: addons.length }
    setAddons(xs => [...xs, next])
  }

  function addSuggestedAddon(name) {
    if (addons.some(a => String(a.name).trim().toLowerCase() === name.toLowerCase())) return
    addAddon({ name, unit: defaultAddonUnit(config) })
  }

  function updateAddon(id, patch) { setAddons(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x)) }
  function removeAddon(id) { setAddons(xs => xs.filter(x => x.id !== id)) }

  const validation = useMemo(() => {
    const out = []
    if (!String(draft.name ?? '').trim()) out.push('Package name is required.')
    if (draft.base_price !== '' && Number(draft.base_price) < 0) out.push('Base price cannot be negative.')
    if (Number(draft.minimum_order || 0) <= 0) out.push('Minimum order must be greater than zero.')
    if (draft.status !== 'LIVE' && config.mode !== 'CUSTOM' && Number(draft.base_price || 0) <= 0) out.push('Enter a positive base rate before pricing can be submitted.')
    for (const addon of addons) {
      if (!String(addon.name ?? '').trim()) continue
      if (Number(addon.rate_paise || 0) < 0) out.push('Add-on rates cannot be negative.')
      if (addon.maximum_quantity !== '' && addon.maximum_quantity != null && Number(addon.maximum_quantity) < Number(addon.minimum_quantity || 0)) out.push('An add-on quantity range is invalid.')
    }
    return out
  }, [draft, addons, config.mode])

  const sectionStatus = useMemo(() => {
    const fieldKeys = fields.map(f => f.key)
    const detailCount = fieldKeys.filter(key => {
      const value = draft.trade_inputs?.[key]
      return value !== '' && value != null
    }).length
    return {
      package: String(draft.name ?? '').trim() && String(draft.description ?? '').trim() ? 'Complete' : 'Needs input',
      details: !fieldKeys.length || detailCount === fieldKeys.length ? 'Complete' : (detailCount > 0 ? 'In progress' : 'Needs input'),
      pricing: Number(draft.base_price || 0) > 0 || config.mode === 'CUSTOM' ? 'Complete' : 'Needs input',
      addons: addons.length ? 'Complete' : 'Optional',
      preview: 'Ready',
    }
  }, [draft, fields, addons, config.mode])

  function selectSection(id) {
    setConfigureOpen(false)
    if (id === 'preview') {
      setPreview(true)
      setStep('preview')
      return
    }
    setPreview(false)
    setStep(id)
  }

  function continueToNext() {
    if (step === 'package') return setStep('details')
    if (step === 'details') return setStep('pricing')
    if (step === 'pricing') return setStep('addons')
    if (step === 'addons') {
      setPreview(true)
      setStep('preview')
    }
  }

  async function save(status) {
    if (readOnly || saving) return
    setLocalError('')
    setError('')
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
      const { data, error: err } = await supabase.rpc('save_sambramo_trade_package', {
        p_vendor_service_id: service.id,
        p_package_id: draft.id || null,
        p_package: pPackage,
        p_addons: payloadAddons,
        p_pricing: pPricing,
      })
      if (err) throw err
      if (data?.ok === false) throw new Error(data.reason ?? 'Could not save this pricing package.')
      await onSaved()
    } catch (e) {
      setLocalError(e?.message ?? 'Could not save this pricing package.')
      setError(e?.message ?? 'Could not save this pricing package.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-soft ring-1 ring-ink/[0.08]"><ChevronRight size={18} className="rotate-180" /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2A085C]">Package studio · {config.name}</p>
          <h2 className="truncate text-[22px] font-extrabold text-[#2A085C]">{draft.name || 'New package'}</h2>
        </div>
        <button type="button" onClick={() => { setPreview(x => !x); if (!preview) setStep('preview') }} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2A085C] text-white" aria-label="Preview customer"><Eye size={16} /></button>
      </div>

      <button type="button" onClick={() => setConfigureOpen(true)} className="flex w-full items-center gap-3 rounded-[22px] bg-[#2A085C] p-3.5 text-left text-white shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><Ruler size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/60"><Filter size={11} /> Configure</span>
          <span className="mt-0.5 block truncate text-[14px] font-extrabold">{SECTION_NAV.find(x => x[0] === step)?.[1] ?? 'Package card'}</span>
        </span>
        <SlidersHorizontal size={18} className="text-white/75" />
      </button>

      <div className="grid grid-cols-5 gap-1.5">
        {SECTION_NAV.map(([id, label], index) => {
          const active = step === id || (id === 'preview' && preview)
          const status = sectionStatus[id]
          return (
            <button key={id} type="button" onClick={() => selectSection(id)} className="group flex min-w-0 flex-col items-center gap-1">
              <span className={active ? 'flex h-2 w-full rounded-full bg-[#2A085C]' : 'flex h-2 w-full rounded-full bg-ink/[0.08]'} />
              <span className={active ? 'text-[9px] font-extrabold text-[#2A085C]' : 'truncate text-[9px] font-bold text-ink-mute'}>{index + 1}</span>
              <span className="sr-only">{label} · {status}</span>
            </button>
          )
        })}
      </div>

      {localError && <section role="alert" className="rounded-2xl bg-rose-50 p-3 text-[11.5px] font-semibold text-rose-800 ring-1 ring-rose-200">{localError}</section>}

      <section className="rounded-2xl bg-white p-3 ring-1 ring-ink/[0.06]">
        <div className="flex items-start gap-2">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#2A085C]" />
          <p className="text-[11px] leading-relaxed text-ink-mute">{readOnly ? 'This approved package is live. Existing bookings keep their approved snapshot.' : 'This package belongs to this exact listing. Save a draft while working, or submit it for Sambramo review when the setup is complete.'}</p>
        </div>
      </section>

      {step === 'package' && !preview && (
        <PackageSection
          config={config}
          units={units}
          draft={draft}
          setDraft={setDraft}
          readOnly={readOnly}
          suggestions={nameSuggestions}
          descriptionSuggestions={descriptionSuggestions}
          update={update}
          updateCommercialArray={updateCommercialArray}
        />
      )}

      {step === 'details' && !preview && (
        <TradeDetailsSection
          fields={fields}
          config={config}
          draft={draft}
          readOnly={readOnly}
          updateTradeField={updateTradeField}
        />
      )}

      {step === 'pricing' && !preview && (
        <PricingSection
          config={config}
          units={units}
          draft={draft}
          update={update}
          readOnly={readOnly}
        />
      )}

      {step === 'addons' && !preview && (
        <AddonsSection
          config={config}
          addons={addons}
          readOnly={readOnly}
          suggestions={addonSuggestions}
          addSuggestedAddon={addSuggestedAddon}
          addAddon={addAddon}
          updateAddon={updateAddon}
          removeAddon={removeAddon}
        />
      )}

      {(preview || step === 'preview') && (
        <CustomerPreviewSection config={config} draft={draft} fields={fields} addons={addons} onBack={() => { setPreview(false); setStep('package') }} />
      )}

      {!readOnly && (
        <div className="fixed inset-x-0 bottom-[64px] z-30 bg-white/92 px-4 pb-3 pt-2 backdrop-blur-md sm:static sm:bg-transparent sm:p-0">
          <div className="mx-auto flex max-w-3xl gap-2">
            <button type="button" onClick={() => save('DRAFT')} disabled={saving}
              className="flex-1 rounded-2xl bg-white py-3.5 text-[12px] font-extrabold text-ink-soft ring-1 ring-ink/[0.1] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            {step === 'preview' || preview ? (
              <button type="button" onClick={() => save('UNDER_REVIEW')} disabled={saving}
                className="flex-[1.5] rounded-2xl bg-[#2A085C] py-3.5 text-[12px] font-extrabold text-white disabled:opacity-50">
                {saving ? 'Submitting…' : 'Submit pricing for review'}
              </button>
            ) : (
              <button type="button" onClick={continueToNext} disabled={saving}
                className="flex-[1.5] rounded-2xl bg-[#2A085C] py-3.5 text-[12px] font-extrabold text-white disabled:opacity-50">
                Continue <ChevronRight size={15} className="ml-1 inline-block" />
              </button>
            )}
          </div>
        </div>
      )}

      {configureOpen && (
        <ConfigureSheet
          sections={SECTION_NAV}
          statuses={sectionStatus}
          active={step}
          preview={preview}
          onSelect={selectSection}
          onClose={() => setConfigureOpen(false)}
        />
      )}
    </div>
  )
}

function PackageSection({ config, units, draft, setDraft, readOnly, suggestions, descriptionSuggestions, update, updateCommercialArray }) {
  const tierOptions = PACKAGE_TIERS
  const quantityPresets = getMinimumOrderPresets(config, draft.pricing_unit)
  const includedPresets = getIncludedQuantityPresets(config, draft.pricing_unit)

  return (
    <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <SectionHeading icon={Sparkles} title="Package card" helper="Pick the words and commercial structure once. Keep partner spelling consistent with controlled choices." />

      <SuggestionRow label="Package name suggestions" items={suggestions} value={draft.name} disabled={readOnly} onPick={v => update('name', v)} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="Package name" required value={draft.name} disabled={readOnly} placeholder="Choose a suggestion or enter your own" onChange={v => update('name', v)} />
        <ChoiceField label="Package tier" value={draft.tier} disabled={readOnly} options={tierOptions} onChange={v => update('tier', v)} allowCustom />
        <CurrencyPresetField label={config.mode === 'CUSTOM' ? 'Reference rate (optional)' : 'Base commercial rate'} value={draft.base_price} disabled={readOnly} presets={PRICE_PRESETS} onChange={v => update('base_price', v)} />
        <ChoiceField label="Pricing unit" value={draft.pricing_unit} disabled={readOnly} options={units.map(x => [x, titleizeUnit(x)])} onChange={v => update('pricing_unit', v)} />
      </div>

      <RecommendationTextArea
        label="Short description"
        value={draft.description}
        disabled={readOnly}
        suggestions={descriptionSuggestions}
        onPick={v => update('description', v)}
        onChange={v => update('description', v)}
        helper="Pick a recommended trade-specific description, then edit it to match exactly what you deliver."
      />

      <div className="grid grid-cols-2 gap-2">
        <PresetNumberField label="Minimum order" value={draft.minimum_order} disabled={readOnly} presets={quantityPresets} suffix={minimumSuffix(draft.pricing_unit)} onChange={v => update('minimum_order', v)} />
        <PresetNumberField label="Included quantity" value={draft.included_quantity} disabled={readOnly} presets={includedPresets} suffix={quantitySuffix(draft.pricing_unit)} onChange={v => update('included_quantity', v)} />
        <PresetNumberField label="Included duration" value={draft.included_duration} disabled={readOnly} presets={[1, 2, 3, 4, 6, 8, 10, 12, 24]} suffix="value" onChange={v => update('included_duration', v)} />
        <PresetNumberField label="Lead time" value={draft.lead_time} disabled={readOnly} presets={LEAD_TIME_PRESETS} suffix="days" onChange={v => update('lead_time', v)} />
      </div>

      <ChoiceField label="Travel policy" value={draft.travel_policy} disabled={readOnly} options={TRAVEL_POLICIES} onChange={v => update('travel_policy', v)} />

      <StructuredListEditor
        label="Inclusions"
        helper="Start from the common items for this pricing mode; partner can still edit the final list."
        values={draft.commercial_inputs?.inclusions ?? []}
        suggested={INCLUSIONS_BY_MODE[config.mode] ?? []}
        disabled={readOnly}
        onChange={values => updateCommercialArray('inclusions', values)}
      />
      <StructuredListEditor
        label="Exclusions"
        helper="Keep the customer view consistent by choosing common exclusions first."
        values={draft.commercial_inputs?.exclusions ?? []}
        suggested={EXCLUSIONS_BY_MODE[config.mode] ?? []}
        disabled={readOnly}
        onChange={values => updateCommercialArray('exclusions', values)}
      />
    </section>
  )
}

function TradeDetailsSection({ fields, config, draft, readOnly, updateTradeField }) {
  return (
    <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <SectionHeading icon={Calculator} title="Trade-specific fields" helper={'Only fields relevant to ' + config.name + ' are shown. Select common values instead of typing long descriptions.'} />
      {fields.length ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {fields.map(field => (
            field.key === 'sku'
              ? <Field key={field.key} label={field.label} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} placeholder="Partner SKU" onChange={v => updateTradeField(field.key, v)} />
              : <TradeFieldControl key={field.key} field={field} config={config} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} onChange={v => updateTradeField(field.key, v)} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-surface p-4 text-center">
          <p className="text-[12px] font-extrabold text-ink">Common pricing structure</p>
          <p className="mt-1 text-[10.5px] text-ink-mute">This trade does not need extra trade-specific fields beyond the package and pricing sections.</p>
        </div>
      )}
    </section>
  )
}

function PricingSection({ config, units, draft, update, readOnly }) {
  const setupIncluded = String(draft.setup_fee || '0') === '0'
  const teardownIncluded = String(draft.teardown_fee || '0') === '0'

  return (
    <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <SectionHeading icon={WalletCards} title="Pricing rules" helper="Use presets for speed, then edit exact amounts where your commercial model needs it. Every value remains partner-editable." />

      <div className="rounded-2xl bg-[#2A085C] p-3 text-white">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/60">Pricing basis</p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="text-[22px] font-black">{draft.base_price ? formatINR(Math.round(Number(draft.base_price))) : 'Quote'}</p>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold">{titleizeUnit(draft.pricing_unit)}</span>
        </div>
        <p className="mt-1 text-[10.5px] text-white/70">Pricing unit is selected from the trade-aware list. Sambramo stores the exact rate with this listing.</p>
      </div>

      <CurrencyPresetField label="Base rate" value={draft.base_price} disabled={readOnly} presets={PRICE_PRESETS} onChange={v => update('base_price', v)} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CurrencyPresetField label={'Additional ' + titleizeUnit(draft.pricing_unit) + ' rate'} value={draft.additional_unit_rate} disabled={readOnly} presets={[50, 100, 250, 500, 750, 1000, 1500, 2500]} onChange={v => update('additional_unit_rate', v)} />
        <CurrencyPresetField label="Additional duration rate" value={draft.additional_duration_rate} disabled={readOnly} presets={[100, 250, 500, 750, 1000, 1500, 2500, 5000]} onChange={v => update('additional_duration_rate', v)} />
        <FeeChoice label="Setup fee" value={draft.setup_fee} disabled={readOnly} included={setupIncluded} presets={[0, 250, 500, 750, 1000, 1500, 2500, 5000]} onChange={v => update('setup_fee', v)} />
        <FeeChoice label="Teardown fee" value={draft.teardown_fee} disabled={readOnly} included={teardownIncluded} presets={[0, 250, 500, 750, 1000, 1500, 2500, 5000]} onChange={v => update('teardown_fee', v)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PresetNumberField label="Minimum order" value={draft.minimum_order} disabled={readOnly} presets={getMinimumOrderPresets(config, draft.pricing_unit)} suffix={minimumSuffix(draft.pricing_unit)} onChange={v => update('minimum_order', v)} />
        <PresetNumberField label="Included quantity" value={draft.included_quantity} disabled={readOnly} presets={getIncludedQuantityPresets(config, draft.pricing_unit)} suffix={quantitySuffix(draft.pricing_unit)} onChange={v => update('included_quantity', v)} />
        <PresetNumberField label="Included duration" value={draft.included_duration} disabled={readOnly} presets={[1, 2, 4, 6, 8, 12, 24]} suffix="value" onChange={v => update('included_duration', v)} />
        <PresetNumberField label="Lead time" value={draft.lead_time} disabled={readOnly} presets={LEAD_TIME_PRESETS} suffix="days" onChange={v => update('lead_time', v)} />
      </div>

      <ChoiceField label="Travel policy" value={draft.travel_policy} disabled={readOnly} options={TRAVEL_POLICIES} onChange={v => update('travel_policy', v)} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <RulePill label="Unit" value={titleizeUnit(draft.pricing_unit)} />
        <RulePill label="Minimum" value={String(draft.minimum_order || 1) + ' ' + minimumSuffix(draft.pricing_unit)} />
        <RulePill label="Lead time" value={draft.lead_time === '' ? 'Not set' : String(draft.lead_time) + ' days'} />
      </div>

      {SITE_DEPENDENT.has(config.trade_id) && (
        <InfoCard icon={ShieldCheck} text="This trade can remain structured while the request uses a survey / quote lane whenever site measurements or route complexity are unknown." />
      )}
    </section>
  )
}

function AddonsSection({ config, addons, readOnly, suggestions, addSuggestedAddon, addAddon, updateAddon, removeAddon }) {
  return (
    <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <SectionHeading icon={CirclePlus} title="Add-ons" helper="Tap a recommended extra to add it. Only price the extras you really provide." />
        {!readOnly && (
          <button type="button" onClick={() => addAddon()} className="flex min-h-[38px] items-center gap-1 rounded-full bg-[#2A085C] px-3 text-[11px] font-extrabold text-white">
            <Plus size={14} /> Custom
          </button>
        )}
      </div>

      {!readOnly && (
        <div>
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Recommended for {config.name}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestions.map(template => {
              const already = addons.some(a => String(a.name).trim().toLowerCase() === template.name.toLowerCase())
              return (
                <button key={template.id} type="button" disabled={already} onClick={() => addSuggestedAddon(template.name)}
                  className={already
                    ? 'min-w-[165px] shrink-0 rounded-2xl bg-ink/[0.04] p-3 text-left text-ink-mute ring-1 ring-ink/[0.06]'
                    : 'min-w-[165px] shrink-0 rounded-2xl bg-[#2A085C] p-3 text-left text-white ring-1 ring-[#2A085C]/20'}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11.5px] font-extrabold">{template.name}</span>
                    {already ? <Check size={14} /> : <Plus size={14} />}
                  </div>
                  <p className="mt-1 text-[10px] leading-snug opacity-70">{already ? 'Already added' : 'Tap to add'}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {addons.map(addon => (
          <div key={addon.id} className="rounded-[22px] bg-surface p-3 ring-1 ring-ink/[0.07]">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">Selected extra</p>
                {suggestions.some(s => s.name === addon.name) ? (
                  <p className="mt-1 text-[13px] font-extrabold text-ink">{addon.name}</p>
                ) : (
                  <Field label="Custom add-on name" value={addon.name} disabled={readOnly} onChange={v => updateAddon(addon.id, { name: v })} placeholder="Type only when Sambramo does not have a preset" />
                )}
              </div>
              {!readOnly && (
                <button type="button" onClick={() => removeAddon(addon.id)} aria-label="Remove add-on" className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink-mute ring-1 ring-ink/[0.07]">
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <CurrencyPresetField label="Rate ₹" value={addon.rate_paise === '' ? '' : Number(addon.rate_paise || 0) / 100} disabled={readOnly} presets={[50, 100, 250, 500, 750, 1000, 1500, 2500, 5000, 10000]} onChange={v => updateAddon(addon.id, { rate_paise: v === '' ? '' : Math.round(Number(v) * 100) })} />
              <ChoiceField label="Unit" value={addon.unit} disabled={readOnly} options={ADDON_UNITS} onChange={v => updateAddon(addon.id, { unit: v })} />
              <PresetNumberField label="Minimum qty" value={addon.minimum_quantity} disabled={readOnly} presets={[1, 2, 5, 10, 25, 50, 100]} suffix="units" onChange={v => updateAddon(addon.id, { minimum_quantity: v })} />
              <PresetNumberField label="Included qty" value={addon.included_quantity} disabled={readOnly} presets={[0, 1, 2, 5, 10, 25, 50]} suffix="units" onChange={v => updateAddon(addon.id, { included_quantity: v })} />
            </div>
          </div>
        ))}
      </div>

      {!addons.length && (
        <div className="rounded-2xl border border-dashed border-ink/10 p-5 text-center">
          <CirclePlus className="mx-auto text-[#2A085C]" size={22} />
          <p className="mt-2 text-[12px] font-bold text-ink-soft">No optional extras selected</p>
          <p className="mt-1 text-[10.5px] text-ink-mute">Recommended add-ons stay one tap away above.</p>
        </div>
      )}
    </section>
  )
}

function CustomerPreviewSection({ config, draft, fields, addons, onBack }) {
  const selectedFields = fields.filter(f => draft.trade_inputs?.[f.key] !== '' && draft.trade_inputs?.[f.key] != null)
  return (
    <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <SectionHeading icon={Eye} title="Customer preview" helper="This is a clean preview of the values captured for this exact partner listing." />
        <button type="button" onClick={onBack} className="rounded-full bg-[#2A085C]/[0.07] px-3 py-1.5 text-[10.5px] font-extrabold text-[#2A085C]">Back to edit</button>
      </div>
      <div className="overflow-hidden rounded-[24px] bg-[#2A085C] text-white">
        <div className="p-4">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-white/55">{config.name}</p>
          <h3 className="mt-1 text-[21px] font-black">{draft.name || 'Your package'}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/72">{draft.description || 'Add a customer-ready description in the package card.'}</p>
        </div>
        <div className="space-y-3 bg-white p-4 text-ink">
          <div className="grid grid-cols-2 gap-2">
            <PreviewMetric label="Price" value={draft.base_price ? formatINR(Math.round(Number(draft.base_price))) + ' / ' + titleizeUnit(draft.pricing_unit) : 'Quote on request'} />
            <PreviewMetric label="Minimum" value={String(draft.minimum_order || 1) + ' ' + minimumSuffix(draft.pricing_unit)} />
            <PreviewMetric label="Included qty" value={draft.included_quantity ? String(draft.included_quantity) + ' ' + quantitySuffix(draft.pricing_unit) : 'As configured'} />
            <PreviewMetric label="Lead time" value={draft.lead_time === '' ? 'Not set' : String(draft.lead_time) + ' days'} />
          </div>

          {selectedFields.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-mute">Selected service details</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedFields.map(field => (
                  <span key={field.key} className="rounded-full bg-surface px-2.5 py-1 text-[10.5px] font-bold text-ink-soft ring-1 ring-ink/[0.07]">{field.label}: {String(draft.trade_inputs[field.key])}</span>
                ))}
              </div>
            </div>
          )}

          {!!(draft.commercial_inputs?.inclusions ?? []).length && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-mute">Included</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {draft.commercial_inputs.inclusions.map(x => <span key={x} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700 ring-1 ring-emerald-100">{x}</span>)}
              </div>
            </div>
          )}

          {!!addons.filter(a => a.name && a.active !== false).length && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-mute">Optional extras</p>
              <div className="mt-1.5 space-y-1.5">
                {addons.filter(a => a.name && a.active !== false).map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-ink/[0.06]">
                    <span className="text-[11px] font-bold text-ink">{a.name}</span>
                    <span className="shrink-0 text-[10px] font-extrabold text-ink-soft">{a.rate_paise ? formatINR(Math.round(Number(a.rate_paise) / 100)) : 'Quote'} · {titleizeUnit(a.unit)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ConfigureSheet({ sections, statuses, active, preview, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink/[0.07] p-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2A085C]">Configure</p>
            <h3 className="mt-0.5 text-[18px] font-extrabold text-ink">Jump to any pricing section</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close configure" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-mute ring-1 ring-ink/[0.07]"><X size={16} /></button>
        </div>

        <div className="space-y-2 p-3">
          {sections.map(([id, label, helper], index) => {
            const selected = active === id || (id === 'preview' && preview)
            const status = statuses[id]
            return (
              <button key={id} type="button" onClick={() => onSelect(id)}
                className={selected ? 'flex w-full items-center gap-3 rounded-2xl bg-[#2A085C] p-3.5 text-left text-white' : 'flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 text-left text-ink ring-1 ring-ink/[0.06]'}>
                <span className={selected ? 'flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[11px] font-black' : 'flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[11px] font-black text-[#2A085C] ring-1 ring-ink/[0.06]'}>{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-extrabold">{label}</span>
                  <span className={selected ? 'mt-0.5 block text-[10.5px] text-white/65' : 'mt-0.5 block text-[10.5px] text-ink-mute'}>{helper}</span>
                </span>
                <span className={selected ? 'rounded-full bg-white/10 px-2 py-1 text-[9.5px] font-extrabold' : status === 'Complete' ? 'rounded-full bg-emerald-50 px-2 py-1 text-[9.5px] font-extrabold text-emerald-700' : 'rounded-full bg-white px-2 py-1 text-[9.5px] font-extrabold text-ink-mute ring-1 ring-ink/[0.06]'}>{status}</span>
                <ChevronRight size={15} className={selected ? 'text-white/75' : 'text-ink-mute'} />
              </button>
            )
          })}
        </div>

        <div className="border-t border-ink/[0.07] bg-[#2A085C]/[0.035] p-3">
          <div className="flex items-center gap-2 text-[11px] text-ink-mute"><Ruler size={14} className="text-[#2A085C]" /> One tap switches sections without losing the draft.</div>
        </div>
      </div>
    </div>
  )
}

function RecommendationTextArea({ label, value, suggestions, onPick, onChange, disabled, helper }) {
  return (
    <div>
      <label className="block rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]">
        <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span>
        <textarea rows="3" disabled={disabled} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder="Choose a suggestion below or edit the text directly" className="mt-1 w-full resize-none bg-transparent text-[12px] font-semibold text-ink outline-none placeholder:text-ink-mute disabled:opacity-60" />
      </label>
      <p className="mt-1.5 text-[10.5px] text-ink-mute">{helper}</p>
      {!disabled && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {suggestions.slice(0, 5).map((text, index) => (
            <button key={text} type="button" onClick={() => onPick(text)} className="rounded-2xl bg-[#2A085C] p-3 text-left text-white ring-1 ring-[#2A085C]/20">
              <div className="flex items-start gap-2">
                <Sparkles size={13} className="mt-0.5 shrink-0 text-white/70" />
                <span className="text-[11px] font-semibold leading-relaxed">{index + 1}. {text}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionRow({ label, items, value, onPick, disabled }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map(item => {
          const active = value === item
          return (
            <button key={item} type="button" disabled={disabled} onClick={() => onPick(item)} className={active ? 'min-w-[150px] shrink-0 rounded-2xl bg-[#2A085C] p-3 text-left text-white' : 'min-w-[150px] shrink-0 rounded-2xl bg-surface p-3 text-left text-ink ring-1 ring-ink/[0.07]'}>
              <span className="block text-[11.5px] font-extrabold">{item}</span>
              <span className={active ? 'mt-1 block text-[9.5px] text-white/65' : 'mt-1 block text-[9.5px] text-ink-mute'}>{active ? 'Selected' : 'Use this name'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StructuredListEditor({ label, helper, values, suggested, disabled, onChange }) {
  const current = Array.isArray(values) ? values : []
  function toggle(item) {
    if (current.includes(item)) onChange(current.filter(x => x !== item))
    else onChange([...current, item])
  }
  return (
    <div>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">{label}</p>
      <p className="mt-1 text-[10.5px] text-ink-mute">{helper}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggested.map(item => {
          const active = current.includes(item)
          return (
            <button key={item} type="button" disabled={disabled} onClick={() => toggle(item)}
              className={active ? 'rounded-full bg-[#2A085C] px-2.5 py-1.5 text-[10px] font-extrabold text-white' : 'rounded-full bg-surface px-2.5 py-1.5 text-[10px] font-extrabold text-ink-soft ring-1 ring-ink/[0.07]'}>
              {active ? '✓ ' : '+ '}{item}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] text-ink-mute">Selected: {current.length ? current.join(' · ') : 'None yet'}</p>
    </div>
  )
}

function TradeFieldControl({ field, config, value, disabled, onChange }) {
  const schema = getFieldSchema(field, config)
  if (schema.control === 'currency') {
    return <CurrencyPresetField label={field.label} value={value} disabled={disabled} presets={schema.presets} onChange={onChange} />
  }
  if (schema.control === 'stepper' || schema.control === 'duration') {
    return <PresetNumberField label={field.label} value={value} disabled={disabled} presets={schema.presets} suffix={schema.control === 'duration' ? 'value' : quantitySuffixFromField(field)} onChange={onChange} />
  }
  return <ChoiceField label={field.label} value={value} disabled={disabled} options={schema.options ?? []} onChange={onChange} allowCustom />
}

function Field({ label, value, onChange, placeholder = '', type = 'text', disabled = false, required = false }) {
  return (
    <label className="rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]">
      <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}{required ? ' *' : ''}</span>
      <input type={type} disabled={disabled} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full bg-transparent text-[12.5px] font-extrabold text-ink outline-none placeholder:font-normal placeholder:text-ink-mute disabled:opacity-60" />
    </label>
  )
}

function ChoiceField({ label, value, onChange, options, disabled = false, allowCustom = false }) {
  const normalized = (options ?? []).map(o => Array.isArray(o) ? o : [o, o])
  const isCustom = allowCustom && value !== '' && !normalized.some(o => o[0] === value)
  const selectValue = isCustom ? '__custom__' : (value ?? '')
  return (
    <label className="rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]">
      <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span>
      <select value={selectValue} disabled={disabled} onChange={e => onChange(e.target.value === '__custom__' ? '' : e.target.value)} className="mt-1 w-full bg-transparent text-[12.5px] font-extrabold text-ink outline-none">
        <option value="">Select</option>
        {normalized.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
        {allowCustom && <option value="__custom__">Custom / type my own</option>}
      </select>
      {allowCustom && (isCustom || selectValue === '__custom__') && (
        <input value={isCustom ? value : ''} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder="Custom value" className="mt-2 w-full rounded-xl bg-white px-2.5 py-2 text-[11.5px] font-semibold text-ink outline-none ring-1 ring-ink/[0.07]" />
      )}
    </label>
  )
}

function CurrencyPresetField({ label, value, onChange, presets = PRICE_PRESETS, disabled = false }) {
  const numeric = value === '' || value == null ? '' : Number(value)
  const presetHit = presets.map(Number).includes(Number(numeric))
  return (
    <div className="rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]">
      <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[12px] font-black text-ink">₹</span>
        <input type="number" min="0" disabled={disabled} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder="Enter amount" className="min-w-0 flex-1 bg-transparent text-[13px] font-black text-ink outline-none placeholder:font-normal placeholder:text-ink-mute" />
      </div>
      {!disabled && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {presets.slice(0, 7).map(amount => (
            <button key={amount} type="button" onClick={() => onChange(String(amount))} className={presetHit && Number(numeric) === Number(amount) ? 'shrink-0 rounded-full bg-[#2A085C] px-2.5 py-1 text-[9.5px] font-extrabold text-white' : 'shrink-0 rounded-full bg-white px-2.5 py-1 text-[9.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.07]'}>
              {formatINR(Number(amount))}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PresetNumberField({ label, value, onChange, presets, suffix = '', disabled = false }) {
  const normalized = (presets ?? []).map(Number)
  const current = value === '' || value == null ? '' : Number(value)
  const presetHit = normalized.includes(Number(current))
  const selectValue = current === '' ? '' : (presetHit ? String(current) : '__custom__')
  return (
    <label className="rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]">
      <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span>
      <select value={selectValue} disabled={disabled} onChange={e => onChange(e.target.value === '__custom__' ? '' : e.target.value)} className="mt-1 w-full bg-transparent text-[12.5px] font-extrabold text-ink outline-none">
        <option value="">Select</option>
        {normalized.map(x => <option key={x} value={x}>{x} {suffix}</option>)}
        <option value="__custom__">Custom value</option>
      </select>
      {(!disabled && (selectValue === '__custom__' || (current !== '' && !presetHit))) && (
        <input type="number" min="0" value={current === '' ? '' : current} onChange={e => onChange(e.target.value)} placeholder="Custom value" className="mt-2 w-full rounded-xl bg-white px-2.5 py-2 text-[11.5px] font-semibold text-ink outline-none ring-1 ring-ink/[0.07]" />
      )}
      {disabled && !presetHit && current !== '' && <p className="mt-1 text-[11px] font-bold text-ink">{current} {suffix}</p>}
    </label>
  )
}

function FeeChoice({ label, value, onChange, presets, included, disabled }) {
  return (
    <div className="rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span>
        <span className="text-[9px] font-extrabold text-ink-mute">{included ? 'Included' : 'Paid'}</span>
      </div>
      <select value={included ? '0' : '__custom__'} disabled={disabled} onChange={e => onChange(e.target.value === '0' ? '0' : (e.target.value === '__custom__' ? '' : e.target.value))} className="mt-1 w-full bg-transparent text-[12.5px] font-extrabold text-ink outline-none">
        <option value="0">Included · ₹0</option>
        {presets.filter(x => Number(x) > 0).map(x => <option key={x} value={x}>₹{x}</option>)}
        <option value="__custom__">Custom amount</option>
      </select>
      {!included && !disabled && (
        <input type="number" min="0" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder="Exact fee" className="mt-2 w-full rounded-xl bg-white px-2.5 py-2 text-[11.5px] font-semibold text-ink outline-none ring-1 ring-ink/[0.07]" />
      )}
    </div>
  )
}

function RulePill({ label, value }) {
  return <div className="rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]"><p className="text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</p><p className="mt-1.5 truncate text-[12px] font-black text-ink">{value}</p></div>
}

function PreviewMetric({ label, value }) {
  return <div className="rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]"><p className="text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</p><p className="mt-1.5 text-[12.5px] font-black text-ink">{value}</p></div>
}

function SectionHeading({ icon: Icon, title, helper }) {
  return <div className="flex min-w-0 items-start gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2A085C] text-white"><Icon size={17} /></span><div className="min-w-0"><p className="text-[14px] font-extrabold text-ink">{title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{helper}</p></div></div>
}

function MetaPill({ text }) {
  return <span className="rounded-full bg-white/10 px-2.5 py-1.5 text-[10px] font-extrabold text-white ring-1 ring-white/10">{text}</span>
}

function InfoCard({ icon: Icon, text }) {
  return <div className="rounded-2xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 ring-1 ring-amber-100"><div className="flex items-start gap-2"><Icon size={14} className="mt-0.5 shrink-0" /><p>{text}</p></div></div>
}

function titleizeUnit(value) {
  return String(value ?? '')
    .split(' ')
    .map(x => x ? x[0].toUpperCase() + x.slice(1) : x)
    .join(' ')
}

function minimumSuffix(unit) {
  if (String(unit).includes('guest')) return 'guests'
  if (String(unit).includes('person')) return 'people'
  if (String(unit).includes('hour')) return 'hours'
  if (String(unit).includes('day')) return 'days'
  if (String(unit).includes('trip')) return 'trips'
  if (String(unit).includes('item')) return 'items'
  if (String(unit).includes('piece')) return 'pieces'
  return 'units'
}

function quantitySuffix(unit) {
  return minimumSuffix(unit)
}

function quantitySuffixFromField(field) {
  const key = String(field?.key ?? '')
  if (key.includes('guest')) return 'guests'
  if (key.includes('people') || key.includes('staff') || key.includes('guards')) return 'people'
  if (key.includes('hour') || key === 'duration' || key === 'shift') return 'value'
  if (key.includes('km')) return 'km'
  if (key.includes('days')) return 'days'
  if (key.includes('quantity') || key.includes('items')) return 'units'
  return 'units'
}

function defaultAddonUnit(config) {
  if (config?.mode === 'RATE_CARD') return 'per trip'
  if (config?.mode === 'CATALOG') return 'per item'
  if (config?.trade_id === 'E01') return 'per guest'
  return 'per event'
}
