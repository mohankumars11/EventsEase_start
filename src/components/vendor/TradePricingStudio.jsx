import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calculator, Check, ChevronRight, CirclePlus, Clock3, Copy, Eye,
  Loader2, Plus, ShieldCheck, Sparkles, Trash2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'

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
    commercial_inputs: { inclusions: [], exclusions: [] },
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
    tier: '',
    description: pkg.description ?? '',
    revision_round: pkg.revision_round ?? 0,
    commercial_inputs: c,
    trade_inputs: pkg.trade_inputs ?? {},
    base_price: priceBook?.rate_paise != null ? String(Number(priceBook.rate_paise) / 100) : (service?.price != null ? String(service.price) : ''),
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
      tier: template[1],
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
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Pricing · {config.name}</p>
          <h2 className="truncate text-[23px] font-extrabold leading-tight text-plum-950">{service?.name || config.name}</h2>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-plum-950 via-plum-800 to-violet-700 p-5 text-white">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Calculator size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/60">Trade-specific pricing</p>
            <h3 className="mt-1 text-[22px] font-extrabold leading-tight">Configure what you actually sell.</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-white/75">This lane belongs only to this partner listing. Start from a Sambramo package or build your own package; both use the same structured pricing engine underneath.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <MetaPill text={config.mode === 'CUSTOM' ? 'Custom quote capable' : 'Structured pricing'} />
          <MetaPill text={config.templates.length + ' Sambramo packages'} />
          {SITE_DEPENDENT.has(config.trade_id) && <MetaPill text="Site-dependent controls" />}
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Your pricing catalog</p>
            <h3 className="mt-1 text-[18px] font-extrabold text-ink">{packages.length} package{packages.length === 1 ? '' : 's'}</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">Pricing is scoped to <span className="font-extrabold text-ink">{service?.name || config.name}</span>. The partner never prices an unrelated trade.</p>
          </div>
          <span className="shrink-0 rounded-full bg-plum-50 px-2.5 py-1 text-[9.5px] font-extrabold text-plum-700">{config.trade_id}</span>
        </div>
      </section>

      {error && (
        <section role="alert" className="rounded-2xl bg-rose-50 p-4 text-[12px] text-rose-800 ring-1 ring-rose-200">
          <p className="font-extrabold">Pricing could not be loaded</p>
          <p className="mt-1 break-words">{error}</p>
          <button type="button" onClick={load} className="mt-3 rounded-xl bg-white px-4 py-2 font-extrabold ring-1 ring-rose-200">Try again</button>
        </section>
      )}

      <section className="overflow-hidden rounded-[26px] border border-dashed border-plum-200 bg-plum-50/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Build your package</p>
            <h3 className="mt-1 text-[18px] font-extrabold text-plum-950">How do you want to build it?</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-plum-800/70">Some partners already have packages; others do not. Sambramo supports both without changing the underlying trade.</p>
          </div>
          <Sparkles size={19} className="text-saffron-500" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setTemplateOpen(x => !x)} className="rounded-2xl bg-plum-950 p-4 text-left text-white transition active:scale-[0.995]">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-plum-200">Option 1</p>
            <h4 className="mt-1 text-[15px] font-black">Choose a Sambramo package</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-white/70">Pick a trade-specific starter and enter your own rate, capabilities and inclusions.</p>
          </button>
          <button type="button" onClick={startCustom} className="rounded-2xl bg-white p-4 text-left text-plum-950 ring-1 ring-plum-200 transition active:scale-[0.995]">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-plum-600">Option 2</p>
            <h4 className="mt-1 text-[15px] font-black">Create my own package</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">Use your own package name and commercial structure while Sambramo keeps the trade-specific fields structured.</p>
          </button>
        </div>
        {templateOpen && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {config.templates.map(template => (
              <button key={template[0]} type="button" onClick={() => startTemplate(template)} className="rounded-2xl bg-white p-3 text-left ring-1 ring-ink/[0.07]">
                <p className="text-[12px] font-extrabold text-ink">{template[1]}</p>
                <p className="mt-1 text-[10.5px] text-ink-mute">{template[0]} · {config.name} starter</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {loading ? (
        <div className="flex items-center justify-center rounded-[24px] bg-white py-14 ring-1 ring-ink/[0.06]"><Loader2 size={23} className="animate-spin text-plum-600" /></div>
      ) : packages.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Configured packages</p>
              <p className="text-[12px] text-ink-mute">Use several packages to offer Sambramo starters and your own packages side by side.</p>
            </div>
            <button type="button" onClick={startCustom} className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-3 text-[11.5px] font-extrabold text-plum-700 ring-1 ring-plum-200"><Plus size={14} /> Add</button>
          </div>
          {packages.map(pkg => (
            <div key={pkg.id} className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.07]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-plum-700">{pkg.source === 'SAMBRAMO_TEMPLATE' ? <Sparkles size={18} /> : <Calculator size={18} />}</div>
                <button type="button" onClick={() => openExisting(pkg)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-[15px] font-extrabold text-ink">{pkg.name}</h4>
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
                    ? 'flex shrink-0 items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1.5 text-[10px] font-extrabold text-forest-700 ring-1 ring-forest-200'
                    : pkg.status === 'UNDER_REVIEW'
                      ? 'flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1.5 text-[10px] font-extrabold text-amber-800 ring-1 ring-amber-200'
                      : 'flex shrink-0 items-center gap-1 rounded-full bg-ink/[0.04] px-2.5 py-1.5 text-[10px] font-extrabold text-ink-mute ring-1 ring-ink/[0.08]'
                }>
                  {pkg.status === 'LIVE' ? <Check size={13} /> : <Clock3 size={13} />}
                  {pkg.status === 'LIVE' ? 'Enabled' : pkg.status === 'UNDER_REVIEW' ? 'Reviewing' : 'Draft'}
                </span>
              </div>
              <button type="button" onClick={() => openExisting(pkg)} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-surface px-3 py-2.5 text-[11px] font-extrabold text-plum-700">
                <span>{(pkg.addons ?? []).filter(a => a.active).length} active add-ons · {pkg.description || 'Trade-specific commercial package'}</span>
                <span className="inline-flex items-center gap-1">Open package <ChevronRight size={13} /></span>
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className="rounded-[24px] border border-dashed border-ink/10 bg-white p-5 text-center">
          <CirclePlus className="mx-auto text-plum-600" size={25} />
          <p className="mt-3 text-[14px] font-extrabold text-ink">No pricing package yet</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">Choose a Sambramo package or create your own. You do not need to invent a package structure before you can start.</p>
        </section>
      )}

      {SITE_DEPENDENT.has(config.trade_id) && (
        <section className="rounded-[24px] bg-surface p-4 ring-1 ring-ink/[0.06]">
          <div className="flex items-center gap-2 text-[12px] font-extrabold text-ink"><ShieldCheck size={15} className="text-plum-600" /> Site-dependent pricing</div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">Standard offerings can be structured. When a customer request depends on measurements, access, route complexity or another physical unknown, the request moves to a quote/survey lane instead of inventing a final price.</p>
        </section>
      )}
    </div>
  )
}

function TradePackageEditor({ service, config, units, draft, setDraft, step, setStep, preview, setPreview, onBack, onSaved, readOnly, setError }) {
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')
  const [addons, setAddons] = useState(draft.addons ?? [])
  useEffect(() => { setAddons(draft.addons ?? []) }, [draft.id])

  const fields = config.fields ?? []
  const update = (key, value) => setDraft(d => ({ ...d, [key]: value }))
  const updateTradeField = (key, value) => setDraft(d => ({ ...d, trade_inputs: { ...(d.trade_inputs ?? {}), [key]: value } }))
  const updateCommercialArray = (key, value) => setDraft(d => ({ ...d, commercial_inputs: { ...(d.commercial_inputs ?? {}), [key]: value } }))

  function addAddon() {
    setAddons(xs => [...xs, { id: globalThis.crypto?.randomUUID?.() ?? ('tmp-' + Date.now()), name: '', rate_paise: '', unit: 'per item', minimum_quantity: '1', included_quantity: '0', active: true, sort_order: xs.length }])
  }
  function updateAddon(id, patch) { setAddons(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x)) }
  function removeAddon(id) { setAddons(xs => xs.filter(x => x.id !== id)) }

  const validation = useMemo(() => {
    const out = []
    if (!String(draft.name ?? '').trim()) out.push('Package name is required.')
    if (draft.base_price !== '' && Number(draft.base_price) < 0) out.push('Base price cannot be negative.')
    if (Number(draft.minimum_order || 0) <= 0) out.push('Minimum order must be greater than zero.')
    if (draft.effective_from && draft.effective_to && draft.effective_to < draft.effective_from) out.push('Effective-to cannot be before effective-from.')
    if (draft.status !== 'LIVE' && config.mode !== 'CUSTOM' && Number(draft.base_price || 0) <= 0) out.push('Enter a positive base rate before pricing can be submitted.')
    for (const addon of addons) {
      if (!String(addon.name ?? '').trim()) continue
      if (Number(addon.rate_paise || 0) < 0) out.push('Add-on rates cannot be negative.')
      if (addon.maximum_quantity !== '' && addon.maximum_quantity != null && Number(addon.maximum_quantity) < Number(addon.minimum_quantity || 0)) out.push('An add-on quantity range is invalid.')
    }
    return out
  }, [draft, addons, config.mode])

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
        commercial_inputs: draft.commercial_inputs ?? {},
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
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Package card · {config.name}</p>
          <h2 className="truncate text-[22px] font-extrabold text-plum-950">{draft.name || 'New package'}</h2>
        </div>
        <button type="button" onClick={() => setPreview(x => !x)} className="flex h-10 w-10 items-center justify-center rounded-full bg-plum-950 text-white" aria-label="Preview customer"><Eye size={16} /></button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[['package','Package card'],['details','Trade fields'],['pricing','Pricing rules'],['addons','Add-ons'],['preview','Customer preview']].map(([id,label]) => (
          <button key={id} type="button" onClick={() => id === 'preview' ? setPreview(true) : setStep(id)}
            className={step === id || (id === 'preview' && preview) ? 'shrink-0 rounded-full bg-plum-700 px-3 py-1.5 text-[10.5px] font-extrabold text-white' : 'shrink-0 rounded-full bg-surface px-3 py-1.5 text-[10.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.07]'}>
            {label}
          </button>
        ))}
      </div>

      {localError && <section role="alert" className="rounded-2xl bg-rose-50 p-3 text-[11.5px] font-semibold text-rose-800 ring-1 ring-rose-200">{localError}</section>}

      <section className="rounded-2xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 ring-1 ring-amber-100">
        <div className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0" /><p>{readOnly ? 'This approved package is live. Existing bookings keep their approved snapshot.' : 'This package is attached to this exact listing. The partner can save the draft or submit pricing for Sambramo review; partners cannot publish pricing themselves.'}</p></div>
      </section>

      {step === 'package' && (
        <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <SectionHeading icon={Sparkles} title="Package card" helper={'Trade-specific package card for ' + config.name + '. Keep the Sambramo name or build your own.'} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Package name" required value={draft.name} disabled={readOnly} onChange={v => update('name', v)} />
            <Field label="Package tier" value={draft.tier} disabled={readOnly} placeholder="Basic / Classic / Premium" onChange={v => update('tier', v)} />
            <Field label={config.mode === 'CUSTOM' ? 'Reference rate (optional)' : 'Base commercial rate'} type="number" value={draft.base_price} disabled={readOnly} onChange={v => update('base_price', v)} />
            <SelectField label="Pricing unit" value={draft.pricing_unit} disabled={readOnly} options={units} onChange={v => update('pricing_unit', v)} />
          </div>
          <TextArea label="Short description" value={draft.description} disabled={readOnly} placeholder="What the customer gets from this package." onChange={v => update('description', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Minimum order" type="number" value={draft.minimum_order} disabled={readOnly} onChange={v => update('minimum_order', v)} />
            <Field label="Included quantity" type="number" value={draft.included_quantity} disabled={readOnly} onChange={v => update('included_quantity', v)} />
            <Field label="Included duration" type="number" value={draft.included_duration} disabled={readOnly} onChange={v => update('included_duration', v)} />
            <Field label="Lead time (days)" type="number" value={draft.lead_time} disabled={readOnly} onChange={v => update('lead_time', v)} />
          </div>
          <Field label="Travel policy" value={draft.travel_policy} disabled={readOnly} placeholder="Included / zone-based / quote" onChange={v => update('travel_policy', v)} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <TextArea label="Inclusions" value={(draft.commercial_inputs?.inclusions ?? []).join(', ')} disabled={readOnly} placeholder="What is included" onChange={v => updateCommercialArray('inclusions', v.split(',').map(x => x.trim()).filter(Boolean))} />
            <TextArea label="Exclusions" value={(draft.commercial_inputs?.exclusions ?? []).join(', ')} disabled={readOnly} placeholder="What is not included" onChange={v => updateCommercialArray('exclusions', v.split(',').map(x => x.trim()).filter(Boolean))} />
          </div>
        </section>
      )}

      {step === 'details' && (
        <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <SectionHeading icon={Calculator} title="Trade-specific fields" helper={'Only fields relevant to ' + config.name + ' are shown here.'} />
          {fields.length ? (
            <div className="grid grid-cols-2 gap-2">
              {fields.map(field => (
                <Field key={field.key} label={field.label} type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'} value={draft.trade_inputs?.[field.key] ?? ''} disabled={readOnly} onChange={v => updateTradeField(field.key, v)} />
              ))}
            </div>
          ) : <div className="rounded-2xl bg-surface p-4 text-center"><p className="text-[12px] font-extrabold text-ink">This trade uses the common pricing structure.</p><p className="mt-1 text-[10.5px] text-ink-mute">All material commercial controls are available in the other tabs.</p></div>}
        </section>
      )}

      {step === 'pricing' && (
        <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <SectionHeading icon={Clock3} title="Pricing rules" helper="Additional units, duration, travel and minimums are stored with this package version." />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Additional unit rate" type="number" value={draft.additional_unit_rate} disabled={readOnly} onChange={v => update('additional_unit_rate', v)} />
            <Field label="Additional duration rate" type="number" value={draft.additional_duration_rate} disabled={readOnly} onChange={v => update('additional_duration_rate', v)} />
            <Field label="Setup fee" type="number" value={draft.setup_fee} disabled={readOnly} onChange={v => update('setup_fee', v)} />
            <Field label="Teardown fee" type="number" value={draft.teardown_fee} disabled={readOnly} onChange={v => update('teardown_fee', v)} />
          </div>
        </section>
      )}

      {step === 'addons' && (
        <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <SectionHeading icon={CirclePlus} title="Add-ons" helper="Only extras this partner genuinely sells should be enabled." />
            {!readOnly && <button type="button" onClick={addAddon} className="flex min-h-[38px] items-center gap-1 rounded-full bg-plum-700 px-3 text-[11px] font-extrabold text-white"><Plus size={14} /> Add</button>}
          </div>
          <div className="space-y-2">
            {addons.map(addon => (
              <div key={addon.id} className="rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]">
                <div className="flex items-start gap-2">
                  <input value={addon.name} disabled={readOnly} onChange={e => updateAddon(addon.id, { name: e.target.value })} placeholder="Extra service" className="w-full bg-transparent text-[12.5px] font-extrabold text-ink outline-none disabled:opacity-60" />
                  {!readOnly && <button type="button" onClick={() => removeAddon(addon.id)} aria-label="Remove add-on" className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink-mute ring-1 ring-ink/[0.07]"><Trash2 size={13} /></button>}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Field label="Rate ₹" type="number" value={addon.rate_paise === '' ? '' : Number(addon.rate_paise || 0) / 100} disabled={readOnly} onChange={v => updateAddon(addon.id, { rate_paise: v === '' ? '' : Math.round(Number(v) * 100) })} />
                  <SelectField label="Unit" value={addon.unit} disabled={readOnly} options={ADDON_UNITS.map(x => x[0])} onChange={v => updateAddon(addon.id, { unit: v })} />
                  <Field label="Minimum qty" type="number" value={addon.minimum_quantity} disabled={readOnly} onChange={v => updateAddon(addon.id, { minimum_quantity: v })} />
                  <Field label="Included qty" type="number" value={addon.included_quantity} disabled={readOnly} onChange={v => updateAddon(addon.id, { included_quantity: v })} />
                </div>
              </div>
            ))}
          </div>
          {!addons.length && <div className="rounded-2xl border border-dashed border-ink/10 p-4 text-center"><p className="text-[12px] font-bold text-ink-soft">No optional extras yet.</p><p className="mt-1 text-[10.5px] text-ink-mute">Add only the extras you genuinely provide.</p></div>}
        </section>
      )}

      {preview && (
        <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <SectionHeading icon={Eye} title="Customer preview" helper="This preview uses the exact package data saved for this listing." />
          <div className="overflow-hidden rounded-[22px] bg-surface ring-1 ring-ink/[0.07]">
            <div className="bg-plum-950 p-4 text-white">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-plum-200">{config.name}</p>
              <h3 className="mt-1 text-[19px] font-black">{draft.name || 'Your package'}</h3>
              <p className="mt-1 text-[11px] text-white/70">{draft.description || 'Package description appears here.'}</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2">
                <PreviewMetric label="Price basis" value={draft.base_price ? formatINR(Math.round(Number(draft.base_price))) + ' ' + draft.pricing_unit : 'Quote on request'} />
                <PreviewMetric label="Minimum order" value={String(draft.minimum_order || 1)} />
                <PreviewMetric label="Included duration" value={draft.included_duration ? String(draft.included_duration) : 'As configured'} />
                <PreviewMetric label="Capacity" value={draft.trade_inputs?.capacity ? String(draft.trade_inputs.capacity) : 'As configured'} />
              </div>
              {!!fields.filter(f => draft.trade_inputs?.[f.key] != null && draft.trade_inputs?.[f.key] !== '').length && (
                <div className="flex flex-wrap gap-1.5">
                  {fields.filter(f => draft.trade_inputs?.[f.key] != null && draft.trade_inputs?.[f.key] !== '').map(f => (
                    <span key={f.key} className="rounded-full bg-white px-2.5 py-1 text-[10.5px] font-bold text-ink-soft ring-1 ring-ink/[0.07]">{f.label}: {String(draft.trade_inputs[f.key])}</span>
                  ))}
                </div>
              )}
              {addons.filter(a => a.name && a.active !== false).length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-mute">Optional extras</p>
                  <div className="mt-1.5 space-y-1.5">
                    {addons.filter(a => a.name && a.active !== false).map(a => (
                      <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-ink/[0.07]"><span className="text-[11px] font-bold text-ink">{a.name}</span><span className="text-[10px] font-extrabold text-ink-soft">{a.rate_paise ? formatINR(Math.round(Number(a.rate_paise) / 100)) : 'Quote'} · {a.unit}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {!readOnly && (
        <div className="fixed inset-x-0 bottom-[64px] z-30 bg-white/92 px-4 pb-3 pt-2 backdrop-blur-md sm:static sm:bg-transparent sm:p-0">
          <div className="mx-auto flex max-w-3xl gap-2">
            <button type="button" onClick={() => save('DRAFT')} disabled={saving} className="flex-1 rounded-2xl bg-white py-3.5 text-[12.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.1] disabled:opacity-50">{saving ? 'Saving…' : 'Save draft'}</button>
            <button type="button" onClick={() => save('UNDER_REVIEW')} disabled={saving} className="flex-[1.5] rounded-2xl bg-saffron-400 py-3.5 text-[12.5px] font-extrabold text-plum-950 disabled:opacity-50">{saving ? 'Submitting…' : 'Submit pricing for review'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder = '', type = 'text', disabled = false, required = false }) {
  return (
    <label className="rounded-xl bg-surface p-2.5 ring-1 ring-ink/[0.07]">
      <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}{required ? ' *' : ''}</span>
      <input type={type} disabled={disabled} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full bg-transparent text-[12.5px] font-extrabold text-ink outline-none placeholder:font-normal placeholder:text-ink-mute disabled:opacity-60" />
    </label>
  )
}

function SelectField({ label, value, onChange, options, disabled = false }) {
  return (
    <label className="rounded-xl bg-surface p-2.5 ring-1 ring-ink/[0.07]">
      <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span>
      <select value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} className="mt-1 w-full bg-transparent text-[12.5px] font-extrabold text-ink outline-none">
        {options.map(option => <option key={Array.isArray(option) ? option[0] : option} value={Array.isArray(option) ? option[0] : option}>{Array.isArray(option) ? option[1] : option}</option>)}
      </select>
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder = '', disabled = false }) {
  return (
    <label className="block rounded-xl bg-surface p-2.5 ring-1 ring-ink/[0.07]">
      <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span>
      <textarea rows="3" disabled={disabled} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full resize-none bg-transparent text-[12px] font-semibold text-ink outline-none placeholder:text-ink-mute disabled:opacity-60" />
    </label>
  )
}

function SectionHeading({ icon: Icon, title, helper }) {
  return <div className="flex min-w-0 items-start gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-plum-50 text-plum-700"><Icon size={17} /></span><div className="min-w-0"><p className="text-[14px] font-extrabold text-ink">{title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{helper}</p></div></div>
}

function MetaPill({ text }) {
  return <span className="rounded-full bg-white/10 px-2.5 py-1.5 text-[10px] font-extrabold text-white ring-1 ring-white/10">{text}</span>
}

function PreviewMetric({ label, value }) {
  return <div className="rounded-2xl bg-white p-3 ring-1 ring-ink/[0.07]"><p className="text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</p><p className="mt-1.5 text-[12.5px] font-black text-ink">{value}</p></div>
}
