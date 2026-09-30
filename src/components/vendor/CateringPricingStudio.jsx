import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check, ChevronDown, ChevronRight, CirclePlus, Edit3, Filter, Leaf,
  Loader2, Plus, Search, ShieldCheck, Sparkles, Trash2, UtensilsCrossed,
  Users, WalletCards, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import {
  CATERING_ADDON_CATALOGUE, CATERING_ADDON_UNITS, CATERING_MENU_SECTIONS,
  CATERING_PRICING_UNIT, CATERING_SERVICE_STYLES, cateringCapabilityFromListing,
  cateringDishCatalogue, emptyCateringPackage, sectionLabel, addonUnitLabel,
  validateCateringPackage, CATERING_DIET_LABELS, addonDraftFrom,
} from '../../data/cateringPricing'

const sectionForCourse = courseId => ({
  welcome: 'welcome',
  starters: 'starters',
  soup: 'soup',
  salads: 'salad',
  curries: 'curries',
  mains: 'mains',
  accompaniments: 'accompaniments',
  sweets: 'sweets',
  desserts: 'dessert',
  counters: 'live_counter',
  beverages: 'beverages',
})[courseId] ?? 'other'

const iid = () => crypto?.randomUUID?.() ?? ('tmp-' + Date.now() + Math.random())

export default function CateringPricingStudio({ vendor, service, onBack, onOpenListings }) {
  const capability = useMemo(() => cateringCapabilityFromListing(service), [service])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [preview, setPreview] = useState(false)

  const load = useCallback(async () => {
    if (!service?.id) {
      setPackages([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: rows, error: pkgErr } = await supabase
        .from('sambramo_catering_packages')
        .select('*')
        .eq('vendor_service_id', service.id)
        .order('updated_at', { ascending: false })
      if (pkgErr) throw pkgErr
      const list = rows ?? []
      if (!list.length) {
        setPackages([])
        return
      }
      const ids = list.map(x => x.id)
      const [itemsRes, addonsRes, pricesRes] = await Promise.all([
        supabase.from('sambramo_catering_package_items')
          .select('*').in('package_id', ids).order('sort_order'),
        supabase.from('sambramo_catering_package_addons')
          .select('*').in('package_id', ids).order('sort_order'),
        supabase.from('sambramo_catering_price_versions')
          .select('*').in('package_id', ids).eq('status', 'ACTIVE').order('version', { ascending: false }),
      ])
      if (itemsRes.error) throw itemsRes.error
      if (addonsRes.error) throw addonsRes.error
      if (pricesRes.error) throw pricesRes.error
      const grouped = id => ({
        items: (itemsRes.data ?? []).filter(x => x.package_id === id),
        addons: (addonsRes.data ?? []).filter(x => x.package_id === id),
        price: (pricesRes.data ?? []).find(x => x.package_id === id) ?? null,
      })
      setPackages(list.map(x => ({ ...x, ...grouped(x.id) })))
    } catch (e) {
      setError(e?.message ?? 'Could not load catering pricing.')
    } finally {
      setLoading(false)
    }
  }, [service?.id])

  useEffect(() => { load() }, [load])

  function openNew(seed = null) {
    setPreview(false)
    setEditing(seed ? { ...emptyCateringPackage(capability), ...seed } : emptyCateringPackage(capability))
  }

  const legacyMenus = Array.isArray(service?.specs?.menus) ? service.specs.menus : []
  const legacyRates = service?.specs?.menu_rates && typeof service.specs.menu_rates === 'object'
    ? service.specs.menu_rates
    : {}

  function importLegacyMenu(menu) {
    if (!menu) return
    const style = menu.service === 'buffet' ? 'buffet'
      : menu.service === 'plantain_leaf' ? 'plantain_leaf'
      : 'custom'
    openNew({
      name: String(menu.name ?? '').trim(),
      serviceStyle: style,
      minGuests: Number(menu.minPax) > 0 ? Number(menu.minPax) : 100,
      maxGuests: Number(menu.maxPax) > 0 ? Number(menu.maxPax) : 1000,
      rate: legacyRates[menu.id] != null ? String(legacyRates[menu.id]) : (menu.fromPrice != null ? String(menu.fromPrice) : ''),
      status: 'DRAFT',
    })
  }

  function openExisting(pkg) {
    setPreview(false)
    setEditing({
      id: pkg.id,
      name: pkg.name,
      cuisines: [...(pkg.cuisine_ids ?? [])],
      kitchenType: pkg.kitchen_type,
      serviceStyle: pkg.service_style,
      minGuests: pkg.min_guests,
      maxGuests: pkg.max_guests ?? '',
      serviceHours: pkg.service_hours,
      includedStaff: pkg.included_staff,
      rate: pkg.price ? String(Math.round(Number(pkg.price.supply_rate_paise) / 100))
        : '',
      items: (pkg.items ?? []).map(x => ({
        id: x.dish_id, section: x.section, selectionType: x.selection_type,
        choiceGroup: x.choice_group ?? '',
      })),
      addons: (pkg.addons ?? []).map(addonDraftFrom),
      notes: pkg.notes ?? '',
      status: pkg.status,
      version: pkg.price?.version ?? 0,
    })
  }

  async function removePackage(pkg) {
    if (!confirm('Archive this menu package? It will no longer be offered to customers.')) return
    const { error: err } = await supabase.from('sambramo_catering_packages')
      .update({ status: 'ARCHIVED' }).eq('id', pkg.id)
    if (err) {
      setError(err.message)
      return
    }
    await load()
  }

  if (editing) {
    return (
      <CateringPackageEditor
        vendor={vendor}
        service={service}
        capability={capability}
        draft={editing}
        setDraft={setEditing}
        preview={preview}
        setPreview={setPreview}
        onBack={() => setEditing(null)}
        onSaved={async () => { setEditing(null); await load() }}
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
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Pricing · Catering & Food</p>
          <h2 className="text-[23px] font-extrabold leading-tight text-plum-950">{service?.name || 'Catering listing'}</h2>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-plum-950 via-plum-800 to-violet-700 p-5 text-white">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <UtensilsCrossed size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/60">Your catering pricing</p>
            <h3 className="mt-1 text-[22px] font-extrabold leading-tight">Price the menu, not the trade.</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-white/75">
              Your listing already tells Sambramo what you can cook. Here you turn that capability into named menu packages, per-guest rates and optional extras.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <MetaPill icon={Leaf} text={CATERING_DIET_LABELS[capability.kitchenType]} />
          {capability.cuisineNames.slice(0, 4).map(name => <MetaPill key={name} text={name} />)}
          {capability.cuisineNames.length > 4 && <MetaPill text={`+${capability.cuisineNames.length - 4} more cuisines`} />}
        </div>
      </section>

      {error && (
        <section role="alert" className="rounded-2xl bg-rose-50 p-4 text-[12px] text-rose-800 ring-1 ring-rose-200">
          <p className="font-extrabold">Pricing could not be loaded</p>
          <p className="mt-1 break-words">{error}</p>
          <button type="button" onClick={load} className="mt-3 rounded-xl bg-white px-4 py-2 font-extrabold ring-1 ring-rose-200">Try again</button>
        </section>
      )}

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Menu capability</p>
            <h3 className="mt-1 text-[18px] font-extrabold text-ink">{capability.cuisineNames.length || 'Multiple'} cuisine{capability.cuisineNames.length === 1 ? '' : 's'} · listing driven</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
              Dish choices stay tied to the cuisines and kitchen type already captured on this listing.
            </p>
          </div>
          {onOpenListings && (
            <button type="button" onClick={onOpenListings} className="shrink-0 rounded-xl bg-surface px-3 py-2 text-[11px] font-extrabold text-ink-soft ring-1 ring-ink/[0.07]">
              Edit listing
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center rounded-[24px] bg-white py-14 ring-1 ring-ink/[0.06]">
          <Loader2 size={23} className="animate-spin text-plum-600" />
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Your menu packages</p>
              <h3 className="mt-0.5 text-[19px] font-extrabold text-ink">{packages.length} package{packages.length === 1 ? '' : 's'}</h3>
            </div>
            <button type="button" onClick={openNew} className="flex min-h-[42px] items-center gap-1.5 rounded-full bg-plum-700 px-4 text-[12px] font-extrabold text-white">
              <Plus size={15} /> Create menu
            </button>
          </div>

          {packages.length === 0 ? (
            <section className="overflow-hidden rounded-[26px] border border-dashed border-plum-200 bg-plum-50/50 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-plum-700 ring-1 ring-plum-200">
                <CirclePlus size={22} />
              </div>
              <h3 className="mt-4 text-[18px] font-extrabold text-plum-950">Start with the menu you actually sell.</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                Name the menu yourself. Pick its cuisines and dishes. Sambramo automatically keeps the base unit at {CATERING_PRICING_UNIT.label.toLowerCase()} and handles the customer-facing calculation separately.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" onClick={openNew} className="rounded-2xl bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950">
                  Create your first menu
                </button>
                {legacyMenus.length > 0 && (
                  <button type="button" onClick={() => importLegacyMenu(legacyMenus[0])} className="rounded-2xl bg-white py-3 text-[13px] font-extrabold text-plum-700 ring-1 ring-plum-200">
                    Import an existing menu
                  </button>
                )}
              </div>
              {legacyMenus.length > 1 && (
                <p className="mt-2 text-center text-[10.5px] text-ink-mute">
                  {legacyMenus.length} existing menu cards were found in your listing. Import one at a time and complete its dish structure here.
                </p>
              )}
            </section>
          ) : (
            <div className="space-y-3">
              {packages.map(pkg => (
                <button key={pkg.id} type="button" onClick={() => openExisting(pkg)}
                  className="w-full rounded-[24px] bg-white p-4 text-left ring-1 ring-ink/[0.07] transition active:scale-[0.995]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-plum-700">
                      <UtensilsCrossed size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-extrabold text-ink">{pkg.name}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${pkg.status === 'ACTIVE' ? 'bg-forest-50 text-forest-700' : 'bg-ink/[0.05] text-ink-mute'}`}>
                          {pkg.status === 'ACTIVE' ? 'Ready' : 'Draft'}
                        </span>
                      </span>
                      <span className="mt-1 block text-[11.5px] text-ink-mute">
                        {(pkg.items ?? []).length} dishes · {(pkg.addons ?? []).filter(a => a.active).length} extras
                        {pkg.price ? ` · ${formatINR(Math.round(Number(pkg.price.supply_rate_paise) / 100))} / guest` : ' · price not set'}
                      </span>
                    </span>
                    <ChevronRight size={17} className="mt-1 shrink-0 text-ink-mute" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {packages.length > 0 && (
        <section className="rounded-[24px] bg-surface p-4">
          <div className="flex items-center gap-2 text-[12px] font-extrabold text-ink">
            <ShieldCheck size={15} className="text-plum-600" /> How Sambramo uses this
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">
            Each saved menu is attached to this exact catering listing. Its dishes and extras become matching inputs; its price is versioned so a booked order keeps the historical pricing snapshot.
          </p>
        </section>
      )}
    </div>
  )
}

function CateringPackageEditor({ vendor, service, capability, draft, setDraft, preview, setPreview, onBack, onSaved }) {
  const [dishSearch, setDishSearch] = useState('')
  const [dishOpen, setDishOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [step, setStep] = useState('package')

  const dishes = useMemo(
    () => cateringDishCatalogue(draft.cuisines, draft.kitchenType),
    [draft.cuisines, draft.kitchenType],
  )
  const visibleDishes = useMemo(() => {
    const q = dishSearch.trim().toLowerCase()
    if (!q) return dishes.slice(0, 140)
    return dishes.filter(d =>
      d.name.toLowerCase().includes(q)
      || d.cuisineName.toLowerCase().includes(q)
      || d.courseId.toLowerCase().includes(q)
    ).slice(0, 180)
  }, [dishes, dishSearch])

  const selectedIds = useMemo(() => new Set((draft.items ?? []).map(x => x.id)), [draft.items])
  const sectionCounts = useMemo(() => {
    const out = Object.fromEntries(CATERING_MENU_SECTIONS.map(x => [x.id, 0]))
    for (const item of draft.items ?? []) if (out[item.section] !== undefined) out[item.section]++
    return out
  }, [draft.items])

  const update = (key, value) => setDraft(d => ({ ...d, [key]: value }))

  function chooseDish(dish) {
    if (selectedIds.has(dish.id)) {
      setDraft(d => ({ ...d, items: d.items.filter(x => x.id !== dish.id) }))
      return
    }
    setDraft(d => ({
      ...d,
      items: [...d.items, {
        id: dish.id,
        section: sectionForCourse(dish.courseId),
        selectionType: 'included',
        choiceGroup: '',
      }],
    }))
  }

  function updateItem(id, patch) {
    setDraft(d => ({ ...d, items: d.items.map(x => x.id === id ? { ...x, ...patch } : x) }))
  }

  function addAddon(template = null) {
    setDraft(d => ({
      ...d,
      addons: [...d.addons, addonDraftFrom(template ? {
        id: iid(), name: template.name, unit: template.unit,
      } : null)],
    }))
  }

  function updateAddon(id, patch) {
    setDraft(d => ({ ...d, addons: d.addons.map(x => x.id === id ? { ...x, ...patch } : x) }))
  }

  function removeAddon(id) {
    setDraft(d => ({ ...d, addons: d.addons.filter(x => x.id !== id) }))
  }

  async function save(status) {
    const requireActive = status === 'ACTIVE'
    const check = validateCateringPackage({ draft, requireActive })
    if (!check.ok) {
      setSaveError(Object.values(check.errors)[0] ?? 'Please complete the highlighted fields.')
      setStep(Object.keys(check.errors).some(k => k === 'items' || k.startsWith('addon:')) ? 'menu' : 'package')
      return
    }

    setSaving(true)
    setSaveError('')
    setSavedMessage('')
    try {
      const { data, error: rpcError } = await supabase.rpc('save_sambramo_catering_package', {
        p_vendor_service_id: service.id,
        p_package_id: draft.id || null,
        p_package: {
          name: draft.name.trim(),
          cuisine_ids: draft.cuisines,
          kitchen_type: draft.kitchenType,
          service_style: draft.serviceStyle,
          min_guests: Number(draft.minGuests),
          max_guests: draft.maxGuests === '' ? null : Number(draft.maxGuests),
          service_hours: Number(draft.serviceHours),
          included_staff: Number(draft.includedStaff),
          notes: draft.notes?.trim() || null,
          status,
        },
        p_items: (draft.items ?? []).map((x, index) => ({
          dish_id: x.id,
          section: x.section,
          selection_type: x.selectionType,
          choice_group: x.choiceGroup || null,
          sort_order: index,
        })),
        p_addons: (draft.addons ?? []).filter(x => x.active !== false).map((x, index) => ({
          name: x.name.trim(),
          unit: x.unit,
          rate_paise: Math.round(Number(x.rate || 0) * 100),
          minimum_quantity: Number(x.minimum || 1),
          maximum_quantity: x.maximum === '' ? null : Number(x.maximum),
          included_quantity: Number(x.included || 0),
          notes: x.notes?.trim() || null,
          active: true,
          sort_order: index,
        })),
        p_rate: {
          supply_rate_paise: Math.round(Number(draft.rate || 0) * 100),
        },
      })
      if (rpcError) throw rpcError
      setSavedMessage(status === 'ACTIVE' ? 'Menu pricing is live for this listing.' : 'Draft saved. You can finish it later.')
      setDraft(d => ({ ...d, status }))
      setTimeout(() => onSaved(), 500)
    } catch (e) {
      setSaveError(e?.message ?? 'Could not save the catering package.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-ink/[0.08]">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Catering menu pricing</p>
          <h2 className="truncate text-[20px] font-extrabold text-plum-950">{draft.name || 'New menu package'}</h2>
        </div>
      </div>

      {saveError && (
        <section role="alert" className="rounded-2xl bg-rose-50 p-3.5 text-[12px] font-semibold text-rose-800 ring-1 ring-rose-200">
          {saveError}
        </section>
      )}
      {savedMessage && (
        <section role="status" className="rounded-2xl bg-forest-50 p-3.5 text-[12px] font-bold text-forest-800 ring-1 ring-forest-200">
          {savedMessage}
        </section>
      )}

      <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-ink/[0.04] p-1">
        {[
          ['package','1 · Menu'],
          ['menu','2 · Dishes'],
          ['price','3 · Price'],
          ['addons','4 · Extras'],
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setStep(id)}
            className={`rounded-xl px-2 py-2 text-[10.5px] font-extrabold ${step === id ? 'bg-white text-plum-700 shadow-sm' : 'text-ink-mute'}`}>
            {label}
          </button>
        ))}
      </div>

      {step === 'package' && (
        <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <SectionHeading icon={Sparkles} title="Name and shape" helper="You choose the package name. Sambramo does not force generic tiers." />
          <Field fieldId="catering_package_name" label="Menu package name" value={draft.name} onChange={v => update('name', v)} placeholder="Wedding Plantain Leaf Feast" />
          <div>
            <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Cuisine used in this package</p>
            <div className="flex flex-wrap gap-2">
              {capability.cuisines.map(id => {
                const active = draft.cuisines.includes(id)
                return (
                  <button key={id} type="button" onClick={() => update('cuisines', active ? draft.cuisines.filter(x => x !== id) : [...draft.cuisines, id])}
                    className={`rounded-full px-3 py-2 text-[11.5px] font-extrabold ${active ? 'bg-plum-700 text-white' : 'bg-surface text-ink-soft ring-1 ring-ink/[0.08]'}`}>
                    {capability.cuisineNames[capability.cuisines.indexOf(id)] ?? id}
                  </button>
                )
              })}
            </div>
          </div>
          <ChoiceGrid label="Service style" value={draft.serviceStyle} options={CATERING_SERVICE_STYLES} onChange={v => update('serviceStyle', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Field fieldId="catering_min_guests" label="Minimum guests" type="number" value={draft.minGuests} onChange={v => update('minGuests', v)} />
            <Field fieldId="catering_max_guests" label="Maximum guests" type="number" value={draft.maxGuests} onChange={v => update('maxGuests', v)} placeholder="No upper limit" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field fieldId="catering_service_hours" label="Service hours" type="number" value={draft.serviceHours} onChange={v => update('serviceHours', v)} />
            <Field fieldId="catering_included_staff" label="Included staff" type="number" value={draft.includedStaff} onChange={v => update('includedStaff', v)} />
          </div>
          <label className="block rounded-xl bg-surface p-2.5 ring-1 ring-ink/[0.07]">
            <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">Package notes</span>
            <textarea value={draft.notes ?? ''} onChange={e => update('notes', e.target.value)} rows="3"
              placeholder="Tell customers or coordinators anything material about this menu arrangement."
              className="mt-1 w-full resize-none bg-transparent text-[12px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-mute" />
          </label>
          <InfoCard icon={ShieldCheck} text={CATERING_DIET_LABELS[draft.kitchenType] + '. Dietary eligibility is inherited from your listing and is not customer-editable.'} />
        </section>
      )}

      {step === 'menu' && (
        <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <SectionHeading icon={UtensilsCrossed} title="Choose the dishes" helper={`${dishes.length.toLocaleString('en-IN')} catalogued dishes are available across your selected cuisines and kitchen type.`} />
          <div className="rounded-2xl bg-plum-50 p-3 ring-1 ring-plum-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-extrabold text-plum-950">{draft.items.length} dishes in this menu</p>
                <p className="text-[10.5px] text-plum-700/75">Tap a dish to include or remove it.</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-plum-700 ring-1 ring-plum-100">
                {dishes.length.toLocaleString('en-IN')} available
              </span>
            </div>
            {capability.dishIds?.length > 0 && (
              <button type="button"
                onClick={() => setDraft(d => ({
                  ...d,
                  items: [...new Map([
                    ...(d.items ?? []).map(x => [x.id, x]),
                    ...capability.dishIds
                      .filter(id => dishes.some(x => x.id === id))
                      .map(id => [id, { id, section: sectionForCourse(dishes.find(x => x.id === id)?.courseId), selectionType: 'included', choiceGroup: '' }]),
                  ]).values()],
                }))}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[11px] font-extrabold text-plum-700 ring-1 ring-plum-200">
                <Sparkles size={13} /> Start from the {capability.dishIds.length} dishes already on my listing
              </button>
            )}
          </div>

          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input value={dishSearch} onChange={e => setDishSearch(e.target.value)}
              placeholder="Search dishes — biryani, dosa, payasa…"
              className="w-full rounded-2xl bg-surface py-3 pl-10 pr-10 text-[12.5px] font-semibold outline-none ring-1 ring-ink/[0.07]" />
            {dishSearch && <button type="button" onClick={() => setDishSearch('')} className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-mute ring-1 ring-ink/[0.07]"><X size={12} /></button>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {visibleDishes.map(dish => {
              const on = selectedIds.has(dish.id)
              return (
                <button key={dish.id} type="button" onClick={() => chooseDish(dish)}
                  className={`min-h-[86px] rounded-2xl p-3 text-left ring-1 transition active:scale-[0.99] ${on ? 'bg-forest-50 ring-forest-300' : 'bg-surface ring-ink/[0.07]'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${on ? 'bg-forest-600 text-white' : 'bg-white text-ink-mute'}`}>{dish.diet === 'veg' ? 'VEG' : 'NON-VEG'}</span>
                    {on ? <Check size={16} className="text-forest-700" /> : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12px] font-extrabold leading-snug text-ink">{dish.name}</p>
                  <p className="mt-1 truncate text-[9.5px] text-ink-mute">{dish.cuisineName}</p>
                </button>
              )
            })}
          </div>

          {visibleDishes.length === 0 && (
            <div className="rounded-2xl bg-ink/[0.03] p-5 text-center">
              <p className="text-[12px] font-bold text-ink-soft">No catalogued dish matches that search.</p>
              <p className="mt-1 text-[11px] text-ink-mute">Use your menu upload/listing flow to add a dish that is not yet mapped.</p>
            </div>
          )}

          {!!draft.items.length && (
            <div className="space-y-2 border-t border-ink/[0.06] pt-3">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Menu structure</p>
              {draft.items.map((item, index) => {
                const dish = dishes.find(x => x.id === item.id)
                return (
                  <div key={item.id} className="rounded-2xl bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 shrink-0 text-center text-[10px] font-bold tabular-nums text-ink-mute">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-extrabold text-ink">{dish?.name ?? item.id}</span>
                      </span>
                      <button type="button" onClick={() => chooseDish({ id: item.id })} aria-label="Remove dish" className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink-mute ring-1 ring-ink/[0.06]"><X size={12} /></button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <select value={item.section} onChange={e => updateItem(item.id, { section: e.target.value })} className="rounded-xl bg-white px-2.5 py-2 text-[10.5px] font-bold text-ink ring-1 ring-ink/[0.07]">
                        {CATERING_MENU_SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <select value={item.selectionType} onChange={e => updateItem(item.id, { selectionType: e.target.value })} className="rounded-xl bg-white px-2.5 py-2 text-[10.5px] font-bold text-ink ring-1 ring-ink/[0.07]">
                        <option value="included">Included</option>
                        <option value="optional">Optional</option>
                        <option value="replacement">Replacement</option>
                      </select>
                    </div>
                    {item.selectionType !== 'included' && (
                      <input value={item.choiceGroup ?? ''} onChange={e => updateItem(item.id, { choiceGroup: e.target.value })}
                        placeholder="Choice group — e.g. 'starter 1' or 'dessert 2'"
                        className="mt-2 w-full rounded-xl bg-white px-2.5 py-2 text-[10.5px] font-semibold text-ink outline-none ring-1 ring-ink/[0.07]" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {step === 'price' && (
        <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <SectionHeading icon={WalletCards} title="Set the menu price" helper="The unit is automatic for catering: this menu is priced per guest." />
          <div className="rounded-[22px] bg-plum-950 p-5 text-white">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/60">Partner supply rate</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[36px] font-extrabold tabular-nums">₹</span>
              <input data-field="catering_supply_rate" type="number" min="1" value={draft.rate} onChange={e => update('rate', e.target.value)}
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent text-[36px] font-extrabold outline-none placeholder:text-white/35" />
              <span className="pb-1 text-[14px] font-extrabold text-white/70">{CATERING_PRICING_UNIT.short}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/65">
              You supply the underlying rate. Sambramo calculates the customer-facing commercial price separately.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <InfoMetric label="Minimum order" value={`${draft.minGuests} guests`} icon={Users} />
            <InfoMetric label="Illustrative partner total" value={draft.rate ? formatINR(Number(draft.rate) * Number(draft.minGuests || 0)) : '—'} icon={WalletCards} />
          </div>
          <InfoCard icon={Sparkles} text="A package price is versioned whenever you activate a new rate. Existing bookings can retain the historical pricing snapshot." />
        </section>
      )}

      {step === 'addons' && (
        <section className="space-y-3 rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <SectionHeading icon={CirclePlus} title="Add optional extras" helper="Each extra has its own controlled unit and quantity rules." />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CATERING_ADDON_CATALOGUE.map(template => (
              <button key={template.id} type="button" onClick={() => addAddon(template)}
                className="flex items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-ink/[0.07]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-plum-700 ring-1 ring-ink/[0.06]"><Plus size={16} /></span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-extrabold text-ink">{template.name}</span>
                  <span className="block truncate text-[10px] text-ink-mute">{template.hint}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            {draft.addons.map(addon => (
              <div key={addon.id} className="rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <input data-field="catering_addon_name" value={addon.name} onChange={e => updateAddon(addon.id, { name: e.target.value })}
                      placeholder="Extra service" className="w-full bg-transparent text-[13px] font-extrabold text-ink outline-none" />
                    <p className="mt-1 text-[10.5px] text-ink-mute">Customers can add this to the menu package.</p>
                  </div>
                  <button type="button" onClick={() => removeAddon(addon.id)} aria-label="Remove add-on" className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink-mute ring-1 ring-ink/[0.07]"><Trash2 size={13} /></button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Field fieldId="catering_addon_rate" label="Rate ₹" type="number" value={addon.rate} onChange={v => updateAddon(addon.id, { rate: v })} />
                  <label className="rounded-xl bg-white p-2.5 ring-1 ring-ink/[0.07]">
                    <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">Unit</span>
                    <select value={addon.unit} onChange={e => updateAddon(addon.id, { unit: e.target.value })} className="mt-1 w-full bg-transparent text-[11.5px] font-extrabold text-ink outline-none">
                      {CATERING_ADDON_UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                    </select>
                  </label>
                  <Field fieldId="catering_addon_minimum" label="Minimum qty" type="number" value={addon.minimum} onChange={v => updateAddon(addon.id, { minimum: v })} />
                  <Field fieldId="catering_addon_maximum" label="Maximum qty" type="number" value={addon.maximum} onChange={v => updateAddon(addon.id, { maximum: v })} placeholder="No limit" />
                </div>
                <textarea data-field="catering_addon_notes" value={addon.notes ?? ''} onChange={e => updateAddon(addon.id, { notes: e.target.value })}
                  rows="2" placeholder="Optional note for this extra" className="mt-2 w-full resize-none rounded-xl bg-white px-2.5 py-2 text-[10.5px] font-semibold text-ink outline-none ring-1 ring-ink/[0.07]" />
              </div>
            ))}
          </div>

          {!draft.addons.length && (
            <div className="rounded-2xl border border-dashed border-ink/10 p-4 text-center">
              <p className="text-[12px] font-bold text-ink-soft">No optional extras yet.</p>
              <p className="mt-1 text-[10.5px] text-ink-mute">Add only the extras you genuinely provide.</p>
            </div>
          )}
        </section>
      )}

      <section className="rounded-[26px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Customer preview</p>
            <h3 className="mt-0.5 text-[18px] font-extrabold text-ink">{draft.name || 'Your menu package'}</h3>
          </div>
          <button type="button" onClick={() => setPreview(x => !x)} className="rounded-full bg-plum-50 px-3 py-1.5 text-[10.5px] font-extrabold text-plum-700">
            {preview ? 'Partner setup' : 'Preview customer'}
          </button>
        </div>
        {preview ? (
          <CustomerPreview draft={draft} dishes={dishes} />
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <InfoMetric label="Dishes" value={String(draft.items.length)} icon={UtensilsCrossed} />
            <InfoMetric label="Extras" value={String(draft.addons.length)} icon={CirclePlus} />
            <InfoMetric label="Base unit" value={CATERING_PRICING_UNIT.label} icon={WalletCards} />
            <InfoMetric label="Minimum" value={`${draft.minGuests} guests`} icon={Users} />
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-[64px] z-30 bg-white/92 px-4 pb-3 pt-2 backdrop-blur-md sm:static sm:bg-transparent sm:p-0">
        <div className="mx-auto flex max-w-3xl gap-2">
          <button type="button" onClick={() => save('DRAFT')} disabled={saving}
            className="flex-1 rounded-2xl bg-white py-3.5 text-[12.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.1] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button type="button" onClick={() => save('ACTIVE')} disabled={saving}
            className="flex-[1.3] rounded-2xl bg-saffron-400 py-3.5 text-[12.5px] font-extrabold text-plum-950 disabled:opacity-50">
            {saving ? 'Saving…' : 'Activate menu pricing'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomerPreview({ draft, dishes }) {
  const byId = new Map(dishes.map(d => [d.id, d]))
  const sections = CATERING_MENU_SECTIONS
    .map(section => ({
      ...section,
      items: (draft.items ?? []).filter(x => x.section === section.id).map(x => byId.get(x.id)?.name ?? x.id),
    }))
    .filter(x => x.items.length)

  return (
    <div className="mt-3 overflow-hidden rounded-[22px] bg-surface ring-1 ring-ink/[0.07]">
      <div className="bg-plum-950 p-4 text-white">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/60">Customer view</p>
        <p className="mt-1 text-[18px] font-extrabold">{draft.name || 'Menu package'}</p>
        <p className="mt-1 text-[11px] text-white/70">{draft.minGuests} guest minimum · final customer price calculated by Sambramo</p>
      </div>
      <div className="space-y-3 p-4">
        {sections.map(section => (
          <div key={section.id}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">{section.label}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {section.items.map((name, i) => <span key={name + i} className="rounded-full bg-white px-2.5 py-1 text-[10.5px] font-semibold text-ink-soft ring-1 ring-ink/[0.07]">{name}</span>)}
            </div>
          </div>
        ))}
        {!!draft.addons.length && (
          <div className="border-t border-ink/[0.07] pt-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Optional extras</p>
            <div className="mt-2 space-y-1.5">
              {draft.addons.map(addon => <div key={addon.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-ink/[0.06]"><span className="text-[11px] font-bold text-ink">{addon.name || 'Extra service'}</span><span className="text-[10.5px] font-extrabold text-ink-soft">Optional · {addonUnitLabel(addon.unit)}</span></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHeading({ icon: Icon, title, helper }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-plum-50 text-plum-700"><Icon size={17} /></span>
      <div>
        <p className="text-[14px] font-extrabold text-ink">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{helper}</p>
      </div>
    </div>
  )
}

function MetaPill({ icon: Icon = null, text }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[10px] font-extrabold text-white ring-1 ring-white/10">{Icon ? <Icon size={11} /> : null}{text}</span>
}

function InfoCard({ icon: Icon, text }) {
  return <div className="rounded-2xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 ring-1 ring-amber-100"><div className="flex items-start gap-2"><Icon size={14} className="mt-0.5 shrink-0" /><p>{text}</p></div></div>
}

function InfoMetric({ label, value, icon: Icon }) {
  return <div className="rounded-2xl bg-surface p-3 ring-1 ring-ink/[0.07]"><div className="flex items-center gap-2 text-ink-mute"><Icon size={13} /><span className="text-[9.5px] font-extrabold uppercase tracking-wide">{label}</span></div><p className="mt-1.5 text-[13px] font-extrabold tabular-nums text-ink">{value}</p></div>
}

function ChoiceGrid({ label, value, options, onChange }) {
  return (
    <div>
      <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map(x => (
          <button key={x.id} type="button" onClick={() => onChange(x.id)}
            className={`rounded-2xl p-3 text-left ring-1 ${value === x.id ? 'bg-plum-50 ring-2 ring-plum-400' : 'bg-surface ring-ink/[0.07]'}`}>
            <p className="text-[12px] font-extrabold text-ink">{x.label}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-ink-mute">{x.helper}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function Field({ fieldId, label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <label className="rounded-xl bg-surface p-2.5 ring-1 ring-ink/[0.07]">
      <span className="block text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span>
      <input {...(fieldId ? { 'data-field': fieldId } : {})} type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full bg-transparent text-[12.5px] font-extrabold text-ink outline-none placeholder:font-normal placeholder:text-ink-mute" />
    </label>
  )
}