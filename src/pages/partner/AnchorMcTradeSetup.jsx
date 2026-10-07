import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, Loader2, Plus, Send, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const TRADE = 'Anchor & MC'
const CONTRACT = '2026-10-07.anchor-mc.v1'

const TEMPLATES = [
  {
    id: 'professional-anchor',
    name: 'Professional Anchor',
    description: 'Structured event hosting with announcements, audience interaction and event-flow coordination.',
    styles: ['Formal', 'Traditional', 'Corporate-scripted'],
    recommended: true,
  },
  {
    id: 'bilingual-anchor',
    name: 'Bilingual Anchor',
    description: 'Professional hosting in two selected languages with smooth bilingual transitions.',
    styles: ['Bilingual', 'Formal', 'Traditional'],
    recommended: false,
  },
  {
    id: 'premium-event-host',
    name: 'Premium Event Host',
    description: 'High-touch hosting with games, audience engagement and stage/DJ coordination.',
    styles: ['Formal', 'Comedy', 'Games'],
    recommended: false,
  },
]

const LANGUAGES = ['Kannada', 'English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Urdu']
const EVENTS = ['Wedding', 'Reception', 'Sangeet', 'Engagement', 'Corporate', 'Launch', 'Birthday', 'Kids', 'College-school', 'Religious']
const DURATIONS = ['2h', '3h', '4h', 'Full event']

const DEFAULT_INCLUSIONS = [
  'Event announcements',
  'Audience interaction',
  'Games & activities',
  'DJ coordination',
  'Stage coordination',
  'Event flow management',
]

function blankPackage(template) {
  return {
    templateId: template.id,
    templateName: template.name,
    description: template.description,
    languages: ['English'],
    eventTypes: ['Wedding', 'Reception'],
    style: template.styles[0],
    durations: ['2h'],
    hostCount: 1,
    audienceCapacity: '',
    scriptSupport: 'No',
    rehearsal: 'No',
    travelMode: 'radius',
    travelRadiusKm: '25',
    outstation: false,
    accommodation: false,
    customScript: false,
    inclusions: DEFAULT_INCLUSIONS.filter(x => template.id !== 'professional-anchor' || x !== 'Games & activities'),
    prices: { '2h': '', '3h': '', '4h': '', 'Full event': '' },
    extraHour: '',
    rehearsalRate: '',
    additionalAnchorRate: '',
  }
}

function money(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-2xl bg-white px-3.5 py-3 ring-1 ring-ink/[0.07]">
      <span className="text-[12.5px] font-extrabold text-ink">{label}</span>
      <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? 'bg-plum-700 justify-end' : 'bg-ink/15 justify-start'}`}>
        <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  )
}

export default function AnchorMcTradeSetup() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [vendor, setVendor] = useState(null)
  const [service, setService] = useState(null)
  const [saved, setSaved] = useState([])
  const [packages, setPackages] = useState([blankPackage(TEMPLATES[0])])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      if (!user?.id) return
      setLoading(true)
      const { data: v } = await supabase.from('vendors').select('id').eq('profile_id', user.id).maybeSingle()
      if (!v?.id) { if (alive) setLoading(false); return }
      const { data: services } = await supabase
        .from('vendor_services')
        .select('id,name,category,listing_id,specs,match_profile')
        .eq('vendor_id', v.id)
        .eq('category', TRADE)
      const anchor = (services ?? []).find(s => s.category === TRADE) ?? null
      const { data: existing } = anchor?.id
        ? await supabase.from('sambramo_trade_packages').select('*').eq('vendor_id', v.id).eq('vendor_service_id', anchor.id).order('created_at')
        : { data: [] }
      if (alive) {
        setVendor(v)
        setService(anchor)
        setSaved(existing ?? [])
        if (existing?.length) {
          setPackages(existing.map(row => {
            const t = TEMPLATES.find(x => x.id === row.template_id) ?? TEMPLATES[0]
            const ti = row.trade_inputs ?? {}
            const ci = row.commercial_inputs ?? {}
            return {
              ...blankPackage(t),
              templateId: row.template_id ?? t.id,
              templateName: row.name,
              description: row.description ?? t.description,
              ...ti,
              prices: ci.prices ?? blankPackage(t).prices,
              extraHour: ci.extraHour ?? '',
              rehearsalRate: ci.rehearsalRate ?? '',
              additionalAnchorRate: ci.additionalAnchorRate ?? '',
            }
          }))
        }
        setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user?.id])

  const current = packages[active] ?? packages[0]

  const updateCurrent = patch => setPackages(prev => prev.map((p, i) => i === active ? { ...p, ...patch } : p))

  const valid = useMemo(() => packages.every(p =>
    p.templateId &&
    p.languages.length > 0 &&
    p.eventTypes.length > 0 &&
    p.durations.length > 0 &&
    p.durations.every(d => Number(p.prices[d]) > 0) &&
    Number(p.hostCount) >= 1 &&
    (!p.outstation || p.accommodation !== null)
  ), [packages])

  function toggleArray(key, value) {
    const arr = current[key] ?? []
    updateCurrent({ [key]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value] })
  }

  function addTemplate() {
    const used = new Set(packages.map(p => p.templateId))
    const next = TEMPLATES.find(t => !used.has(t.id))
    if (!next) return
    setPackages(p => [...p, blankPackage(next)])
    setActive(packages.length)
  }

  function removePackage(index) {
    if (packages.length === 1) return
    setPackages(p => p.filter((_, i) => i !== index))
    setActive(Math.max(0, Math.min(active, packages.length - 2)))
  }

  async function savePackage(status = 'DRAFT') {
    if (!vendor?.id || !service?.id || saving) return
    if (!valid) { setMessage('Complete every selected duration price before saving.'); return }
    setSaving(true); setMessage('')
    try {
      for (const p of packages) {
        const payload = {
          vendor_id: vendor.id,
          vendor_service_id: service.id,
          template_id: p.templateId,
          source: 'SAMBRAMO_TEMPLATE',
          name: p.templateName,
          description: p.description,
          commercial_inputs: {
            prices: p.prices,
            extraHour: p.extraHour,
            rehearsalRate: p.rehearsalRate,
            additionalAnchorRate: p.additionalAnchorRate,
            priceUnit: 'event',
          },
          trade_inputs: {
            contractVersion: CONTRACT,
            languages: p.languages,
            eventTypes: p.eventTypes,
            hostingStyle: p.style,
            durations: p.durations,
            hostCount: Number(p.hostCount),
            audienceCapacity: p.audienceCapacity ? Number(p.audienceCapacity) : null,
            scriptSupport: p.scriptSupport,
            rehearsal: p.rehearsal,
            customScript: !!p.customScript,
            inclusions: p.inclusions,
            travel: {
              mode: p.travelMode,
              radiusKm: Number(p.travelRadiusKm || 0),
              outstation: !!p.outstation,
              accommodation: !!p.accommodation,
            },
            bookingRules: {
              instantBookingCandidate: !p.customScript && p.rehearsal === 'No' && !p.outstation,
              quoteTriggers: ['custom script', 'rehearsal', 'additional anchor', 'outstation travel', 'above capacity'],
            },
          },
          status,
          submitted_at: status === 'UNDER_REVIEW' ? new Date().toISOString() : null,
        }
        const { data, error } = await supabase.from('sambramo_trade_packages').insert(payload).select().single()
        if (error) throw error
        if (p.extraHour || p.rehearsalRate || p.additionalAnchorRate) {
          const addons = [
            p.extraHour && { package_id: data.id, name: 'Extra hour', unit: 'hour', rate_paise: money(p.extraHour) },
            p.rehearsalRate && { package_id: data.id, name: 'Rehearsal', unit: 'event', rate_paise: money(p.rehearsalRate) },
            p.additionalAnchorRate && { package_id: data.id, name: 'Additional anchor', unit: 'anchor', rate_paise: money(p.additionalAnchorRate) },
          ].filter(Boolean)
          if (addons.length) {
            const { error: addonError } = await supabase.from('sambramo_trade_package_addons').insert(addons)
            if (addonError) throw addonError
          }
        }
        if (status === 'UNDER_REVIEW') {
          await supabase.from('vendor_services').update({
            specs: {
              ...(service.specs ?? {}),
              anchor_mc_contract: CONTRACT,
              package_setup_status: 'UNDER_REVIEW',
            },
            match_profile: {
              ...(service.match_profile ?? {}),
              anchor_mc: { languages: p.languages, event_types: p.eventTypes, durations: p.durations },
            },
            review_status: 'under_review',
            revised_at: new Date().toISOString(),
          }).eq('id', service.id).eq('vendor_id', vendor.id)
        }
      }
      const { data: fresh } = await supabase.from('sambramo_trade_packages').select('*').eq('vendor_id', vendor.id).eq('vendor_service_id', service.id).order('created_at')
      setSaved(fresh ?? [])
      setMessage(status === 'UNDER_REVIEW' ? 'Anchor & MC packages submitted to Sambramo for review.' : 'Draft packages saved.')
    } catch (e) {
      setMessage(e?.message ?? 'Could not save the Anchor & MC setup.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="native-screen flex items-center justify-center bg-white"><Loader2 size={26} className="animate-spin text-plum-600" /></div>

  if (!service) return (
    <div className="native-screen flex flex-col bg-white">
      <div className="safe-top px-5 pt-3"><button type="button" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={20} /></button></div>
      <div className="flex-1 px-6 pt-8">
        <h1 className="text-2xl font-extrabold text-plum-950">Anchor &amp; MC</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink/65">Add the Anchor &amp; MC service first. This setup is only for the Anchor &amp; MC trade.</p>
        <button type="button" onClick={() => navigate('/partner/services?from=setup')} className="mt-5 min-h-[50px] w-full rounded-full bg-plum-700 text-sm font-extrabold text-white">Add Anchor &amp; MC</button>
      </div>
    </div>
  )

  return (
    <div className="native-screen flex flex-col bg-white">
      <header className="safe-top border-b border-ink/[0.06] bg-white px-5 pb-3 pt-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/partner/setup/services')} className="flex h-10 w-10 items-center justify-center rounded-full"><ArrowLeft size={19} /></button>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Partner • Trade setup</p><h1 className="truncate text-[18px] font-extrabold text-plum-950">Anchor &amp; MC</h1></div>
          <span className="rounded-full bg-plum-50 px-2.5 py-1 text-[10px] font-extrabold text-plum-700">34-trade catalogue</span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        <section className="mt-4 rounded-[22px] bg-plum-50 p-4 ring-1 ring-plum-100">
          <p className="text-[12px] font-extrabold text-plum-950">Sambramo standardized packages</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-plum-900/75">Choose from Sambramo templates. You do not create arbitrary package names. Add the durations and prices that you genuinely provide.</p>
        </section>

        <section className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {packages.map((p, i) => (
            <button key={p.templateId} type="button" onClick={() => setActive(i)} className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-extrabold ${i === active ? 'bg-plum-700 text-white' : 'bg-ink/[0.05] text-ink-mute'}`}>
              {p.templateName}
            </button>
          ))}
          {packages.length < TEMPLATES.length && <button type="button" onClick={addTemplate} className="flex shrink-0 items-center gap-1 rounded-full bg-plum-50 px-3 py-2 text-[11px] font-extrabold text-plum-700"><Plus size={13} /> Add template</button>}
        </section>

        <section className="mt-4 rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Package</p><h2 className="mt-1 text-[18px] font-extrabold text-plum-950">{current.templateName}</h2><p className="mt-1 text-[12px] leading-relaxed text-ink-mute">{current.description}</p></div>
            {packages.length > 1 && <button type="button" onClick={() => removePackage(active)} className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700"><Trash2 size={15} /></button>}
          </div>

          <label className="mt-4 block"><span className="mb-1.5 block text-[12px] font-extrabold text-ink">Hosting style</span><select value={current.style} onChange={e => updateCurrent({ style: e.target.value })} className="w-full rounded-2xl bg-surface px-3.5 py-3 text-[13px] font-bold ring-1 ring-ink/[0.08]">{TEMPLATES.find(t => t.id === current.templateId)?.styles.map(s => <option key={s}>{s}</option>)}</select></label>

          <div className="mt-4"><p className="mb-2 text-[12px] font-extrabold text-ink">Languages <span className="text-rose-600">*</span></p><div className="grid grid-cols-2 gap-2">{LANGUAGES.map(x => <button key={x} type="button" onClick={() => toggleArray('languages', x)} className={`rounded-xl px-3 py-2.5 text-[11.5px] font-extrabold ring-1 ${current.languages.includes(x) ? 'bg-plum-50 text-plum-700 ring-plum-300' : 'bg-white text-ink-mute ring-ink/[0.07]'}`}>{x}</button>)}</div></div>

          <div className="mt-4"><p className="mb-2 text-[12px] font-extrabold text-ink">Event types <span className="text-rose-600">*</span></p><div className="flex flex-wrap gap-2">{EVENTS.map(x => <button key={x} type="button" onClick={() => toggleArray('eventTypes', x)} className={`rounded-full px-3 py-2 text-[10.5px] font-extrabold ring-1 ${current.eventTypes.includes(x) ? 'bg-forest-50 text-forest-700 ring-forest-300' : 'bg-white text-ink-mute ring-ink/[0.07]'}`}>{x}</button>)}</div></div>

          <div className="mt-4"><p className="mb-2 text-[12px] font-extrabold text-ink">Standard durations &amp; prices <span className="text-rose-600">*</span></p><div className="space-y-2">{DURATIONS.map(d => <div key={d} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-2xl bg-surface p-2.5"><button type="button" onClick={() => toggleArray('durations', d)} className={`flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${current.durations.includes(d) ? 'bg-plum-700 text-white ring-plum-700' : 'bg-white text-transparent ring-ink/10'}`}><Check size={14} /></button><span className="text-[12px] font-extrabold text-ink">{d}</span><input value={current.prices[d]} onChange={e => updateCurrent({ prices: { ...current.prices, [d]: e.target.value } })} inputMode="decimal" placeholder="₹ price" className="w-28 rounded-xl bg-white px-2.5 py-2 text-right text-[12px] font-bold ring-1 ring-ink/[0.08]" /></div>)}</div></div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="rounded-2xl bg-surface p-3"><span className="block text-[10.5px] font-extrabold text-ink-mute">Anchors included</span><input type="number" min="1" value={current.hostCount} onChange={e => updateCurrent({ hostCount: e.target.value })} className="mt-1 w-full bg-transparent text-[14px] font-extrabold outline-none" /></label>
            <label className="rounded-2xl bg-surface p-3"><span className="block text-[10.5px] font-extrabold text-ink-mute">Audience capacity</span><input type="number" min="1" value={current.audienceCapacity} onChange={e => updateCurrent({ audienceCapacity: e.target.value })} placeholder="Optional" className="mt-1 w-full bg-transparent text-[14px] font-extrabold outline-none" /></label>
          </div>

          <div className="mt-4"><p className="mb-2 text-[12px] font-extrabold text-ink">Included service scope</p><div className="space-y-2">{DEFAULT_INCLUSIONS.map(x => <button key={x} type="button" onClick={() => toggleArray('inclusions', x)} className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[11.5px] font-bold ring-1 ${current.inclusions.includes(x) ? 'bg-forest-50 text-forest-800 ring-forest-200' : 'bg-white text-ink-mute ring-ink/[0.07]'}`}><Check size={14} className={current.inclusions.includes(x) ? '' : 'opacity-20'} />{x}</button>)}</div></div>

          <div className="mt-4 space-y-2">
            <Toggle checked={current.customScript} onChange={v => updateCurrent({ customScript: v })} label="Custom script / substantial script preparation" />
            <Toggle checked={current.outstation} onChange={v => updateCurrent({ outstation: v })} label="Accept outstation / destination events" />
            {current.outstation && <Toggle checked={current.accommodation} onChange={v => updateCurrent({ accommodation: v })} label="Accommodation can be arranged when required" />}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <label className="rounded-2xl bg-surface p-3"><span className="block text-[9.5px] font-extrabold text-ink-mute">Extra hour ₹</span><input inputMode="decimal" value={current.extraHour} onChange={e => updateCurrent({ extraHour: e.target.value })} className="mt-1 w-full bg-transparent text-[12px] font-extrabold outline-none" /></label>
            <label className="rounded-2xl bg-surface p-3"><span className="block text-[9.5px] font-extrabold text-ink-mute">Rehearsal ₹</span><input inputMode="decimal" value={current.rehearsalRate} onChange={e => updateCurrent({ rehearsalRate: e.target.value })} className="mt-1 w-full bg-transparent text-[12px] font-extrabold outline-none" /></label>
            <label className="rounded-2xl bg-surface p-3"><span className="block text-[9.5px] font-extrabold text-ink-mute">Extra anchor ₹</span><input inputMode="decimal" value={current.additionalAnchorRate} onChange={e => updateCurrent({ additionalAnchorRate: e.target.value })} className="mt-1 w-full bg-transparent text-[12px] font-extrabold outline-none" /></label>
          </div>

          <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
            <b>Booking rule:</b> standard language + duration + supported event + available date/time + configured price can become Instant Book &amp; Pay. Custom script, rehearsal, extra anchor, outstation or above-capacity requests go to Quote &amp; Pay.
          </div>
        </section>

        <section className="mt-4 rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Travel &amp; lead time</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="rounded-2xl bg-surface p-3"><span className="block text-[10px] font-extrabold text-ink-mute">Service radius km</span><input type="number" min="1" value={current.travelRadiusKm} onChange={e => updateCurrent({ travelRadiusKm: e.target.value })} className="mt-1 w-full bg-transparent text-[13px] font-extrabold outline-none" /></label>
            <label className="rounded-2xl bg-surface p-3"><span className="block text-[10px] font-extrabold text-ink-mute">Minimum notice days</span><input type="number" min="0" value={current.minimumNoticeDays ?? ''} onChange={e => updateCurrent({ minimumNoticeDays: e.target.value })} placeholder="Set in calendar" className="mt-1 w-full bg-transparent text-[13px] font-extrabold outline-none" /></label>
          </div>
        </section>

        {message && <div className="mt-4 rounded-2xl bg-plum-50 px-4 py-3 text-[12px] font-bold text-plum-800">{message}</div>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" disabled={saving} onClick={() => savePackage('DRAFT')} className="flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-white text-[12.5px] font-extrabold text-plum-700 ring-1 ring-plum-200 disabled:opacity-50"><Check size={16} /> Save draft</button>
          <button type="button" disabled={saving} onClick={() => savePackage('UNDER_REVIEW')} className="flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-plum-700 text-[12.5px] font-extrabold text-white disabled:opacity-50"><Send size={16} /> Submit for review</button>
        </div>

        {saved.length > 0 && (
          <section className="mt-5 rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Pricing control center</p>
            <p className="mt-1 text-[13px] font-extrabold text-plum-950">{saved.length} Anchor &amp; MC package record{saved.length === 1 ? '' : 's'}</p>
            <div className="mt-3 space-y-2">{saved.map(row => <div key={row.id} className="rounded-2xl bg-surface p-3"><div className="flex items-center justify-between gap-2"><span className="text-[12px] font-extrabold text-ink">{row.name}</span><span className="rounded-full bg-plum-50 px-2 py-1 text-[9.5px] font-extrabold text-plum-700">{row.status}</span></div><p className="mt-1 text-[10.5px] text-ink-mute">Revision {row.revision_round} • {row.template_id}</p></div>)}</div>
          </section>
        )}

        <p className="mt-5 pb-8 text-center text-[10.5px] leading-relaxed text-ink-mute">Sambramo template contract {CONTRACT}. Partner inputs are stored against this Anchor &amp; MC vendor service only.</p>
      </div>
    </div>
  )
}
