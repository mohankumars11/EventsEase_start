import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BadgeCheck, BarChart3, Check, ChevronRight, CircleAlert, Clock3,
  Edit3, Eye, FileCheck2, Layers3, MapPin, Ruler, Send, ShieldCheck,
  Sparkles, X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { usePartnerOnboarding } from '../../hooks/usePartnerOnboarding'
import {
  normalizeTrade, STATUS_META, PRICING_STATES, storefrontStatus, pricingReadiness
} from '../../data/sambramoBusinessPreview'

const unitLabel = unit => ({
  fixed: 'per booking',
  package: 'per package',
  per_guest: 'per guest',
  per_unit: 'per unit',
  per_hour: 'per hour',
  per_day: 'per day',
  per_trip: 'per trip',
  per_event: 'per event',
}[unit] ?? unit ?? 'per booking')

function CustomerOfferingCard({ offering, config }) {
  const packages = offering?.pricing_packages ?? []
  const readiness = pricingReadiness({ offerings: [{ ...offering, pricing_packages: packages }] })
  const title = offering?.name || config.templates[0]?.[1] || 'Your service'
  const fields = config.fields
    .map(field => ({ field, value: offering?.specs?.[field.key] }))
    .filter(x => x.value !== undefined && x.value !== null && x.value !== '')
    .slice(0, 5)

  return (
    <article className="overflow-hidden rounded-[24px] bg-white ring-1 ring-ink/[0.08] shadow-[0_12px_34px_rgba(42,8,92,0.09)]">
      <div className="h-1.5 bg-gradient-to-r from-plum-900 via-plum-600 to-saffron-400" />
      <div className="p-4.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.15em] text-ink-mute">{config.pillar} · {config.name}</p>
            <h3 className="mt-1 text-[18px] font-black leading-tight text-ink">{title}</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-[10px] font-extrabold text-forest-700 ring-1 ring-forest-200">
            <BadgeCheck size={11} /> Preview
          </span>
        </div>

        {!!fields.length && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {fields.map(({ field, value }) => (
              <span key={field.key} className="rounded-full bg-plum-50 px-2.5 py-1 text-[10.5px] font-bold text-plum-800 ring-1 ring-plum-100">
                {field.label}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
              </span>
            ))}
          </div>
        )}

        {packages.length ? (
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-ink-mute">Pricing catalog</p>
              <span className="text-[9.5px] font-extrabold text-plum-700">{packages.length} package{packages.length === 1 ? '' : 's'}</span>
            </div>
            {packages.map(pkg => (
              <div key={pkg.id} className="rounded-2xl bg-page-sunk p-3 ring-1 ring-ink/[0.06]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-black text-ink">{pkg.name}</p>
                    <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-mute">
                      {pkg.source === 'SAMBRAMO_TEMPLATE' ? 'Sambramo package' : 'Partner package'}
                      {pkg.pricing_version ? ' · v' + pkg.pricing_version : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.06]">
                    {pkg.status === 'LIVE' ? 'Enabled' : pkg.status === 'UNDER_REVIEW' ? 'Under review' : 'Preview'}
                  </span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[8.5px] font-extrabold uppercase tracking-wide text-ink-mute">Customer price basis</p>
                    <p className="mt-0.5 text-[16px] font-black text-plum-950">
                      {pkg.price?.rate_paise != null
                        ? formatINR(Math.round(Number(pkg.price.rate_paise) / 100))
                        : 'Quote on request'}
                    </p>
                    <p className="text-[9.5px] text-ink-mute">{pkg.price?.unit ? unitLabel(pkg.price.unit) : 'Sambramo calculates the final price from customer requirements'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8.5px] font-extrabold uppercase tracking-wide text-ink-mute">Add-ons</p>
                    <p className="mt-0.5 text-[12px] font-extrabold text-ink">{(pkg.addons ?? []).filter(a => a.active !== false).length}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-page-sunk px-3 py-2.5">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-ink-mute">Pricing lane</p>
            <p className="mt-0.5 text-[12px] font-extrabold text-ink">{PRICING_STATES[readiness.state]?.label}</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-ink-mute">{readiness.note || PRICING_STATES[readiness.state]?.detail}</p>
          </div>
        )}

        {packages.length > 0 && (
          <div className="mt-3 rounded-2xl bg-page-sunk px-3 py-2.5">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-ink-mute">Booking lane</p>
            <p className="mt-0.5 text-[12px] font-extrabold text-ink">{PRICING_STATES[readiness.state]?.label}</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-ink-mute">{readiness.note || PRICING_STATES[readiness.state]?.detail}</p>
          </div>
        )}

        <button type="button" className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-extrabold text-plum-700">
          View full customer details <ChevronRight size={13} />
        </button>
      </div>
    </article>
  )
}

function EditAction({ icon: Icon, label, detail, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[64px] items-center gap-2.5 rounded-2xl bg-page-sunk px-3 text-left ring-1 ring-ink/[0.06] transition active:scale-[0.99]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-plum-700 ring-1 ring-ink/[0.06]"><Icon size={15} /></span>
      <span className="min-w-0">
        <span className="block text-[12px] font-extrabold text-ink">{label}</span>
        <span className="mt-0.5 block text-[10px] text-ink-mute">{detail}</span>
      </span>
    </button>
  )
}

function Readiness({ vendor, listings, onEdit }) {
  const checks = useMemo(() => {
    const tradeCheck = listings.length > 0 && listings.some(x => (x.offerings?.length ?? 0) > 0)
    const pricingCheck = listings.length > 0 && listings.every(x => pricingReadiness(x).ready)
    return [
      ['Business profile', !!vendor?.business_name && !!vendor?.description, 'Customer-facing identity is complete.'],
      ['At least one service', tradeCheck, 'A service must have something sellable underneath it.'],
      ['Pricing lanes', pricingCheck, 'Every listed trade has a structured or controlled pricing lane.'],
      ['Service area', !!vendor?.city && Number(vendor?.service_radius_km) > 0, 'Sambramo can match demand to your base.'],
      ['Customer preview', true, 'This screen is generated from the same partner data model.'],
    ]
  }, [vendor, listings])

  const done = checks.filter(x => x[1]).length
  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-mute">Launch readiness</p>
          <p className="mt-1 text-[13px] font-black text-ink">{done} of {checks.length} checks ready</p>
        </div>
        <button type="button" onClick={onEdit} className="text-[11px] font-extrabold text-plum-700">Fix gaps</button>
      </div>
      <div className="mt-2 overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.08]">
        {checks.map(([label, ok, detail]) => (
          <div key={label} className="flex items-center gap-3 border-b border-ink/[0.06] px-4 py-3 last:border-0">
            <span className={'grid h-7 w-7 shrink-0 place-items-center rounded-full ' + (ok ? 'bg-forest-600 text-white' : 'bg-amber-100 text-amber-800')}>
              {ok ? <Check size={13} strokeWidth={3} /> : <CircleAlert size={13} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-extrabold text-ink">{label}</p>
              <p className="text-[10.5px] text-ink-mute">{detail}</p>
            </div>
            <span className={'text-[10px] font-extrabold uppercase ' + (ok ? 'text-forest-700' : 'text-amber-800')}>{ok ? 'Ready' : 'Fix'}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function SubmissionPanel({ status, allDone, onSubmitted, error, setError }) {
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const snapshot = await supabase.rpc('submit_sambramo_business')
      if (!snapshot.error) {
        if (snapshot.data?.ok === false) throw new Error(snapshot.data.says ?? snapshot.data.reason ?? 'Could not submit this business for review.')
        await onSubmitted()
        return
      }

      const missing = /Could not find the function|does not exist/i.test(snapshot.error.message ?? '')
      if (!missing) throw snapshot.error

      const opened = await supabase.rpc('open_verification_case')
      if (opened.error && !/Could not find the function|does not exist/i.test(opened.error.message ?? '')) throw opened.error
      const submitted = await supabase.rpc('submit_verification_case')
      if (submitted.error) {
        const oldMissing = /Could not find the function|does not exist/i.test(submitted.error.message ?? '')
        if (!oldMissing) throw submitted.error
        const fallback = await supabase.rpc('submit_for_review')
        if (fallback.error) throw fallback.error
      }
      await onSubmitted()
    } catch (e) {
      setError(e?.message ?? 'Could not submit this business for review.')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'UNDER_REVIEW') {
    return <div className="rounded-[22px] bg-amber-50 p-4 ring-1 ring-amber-200"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 shrink-0 text-amber-700" size={18} /><div className="min-w-0"><p className="text-[14px] font-extrabold text-amber-950">Sambramo is reviewing your business</p><p className="mt-1 text-[12px] leading-relaxed text-amber-900/75">Minimum review window: 2 hours. Publishing happens only after approval.</p></div></div></div>
  }
  if (status === 'ACTION_REQUIRED') {
    return <div className="rounded-[22px] bg-rose-50 p-4 ring-1 ring-rose-200"><p className="flex items-center gap-2 text-[14px] font-extrabold text-rose-950"><CircleAlert size={17} /> Correction requested</p><p className="mt-1 text-[12px] leading-relaxed text-rose-800">Sambramo needs a change before this version can go live. Correct the marked details and resubmit within the remaining review rounds.</p><button type="button" onClick={() => window.location.assign('/partner/setup/review')} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-3.5 py-2 text-[12px] font-extrabold text-white">Open review</button></div>
  }
  if (status === 'LIVE') {
    return <div className="rounded-[22px] bg-forest-50 p-4 ring-1 ring-forest-200"><p className="flex items-center gap-2 text-[14px] font-extrabold text-forest-900"><BadgeCheck size={17} /> Your approved storefront is live</p><p className="mt-1 text-[12px] leading-relaxed text-forest-800/75">Customers see the approved version. Future material edits create a new reviewable version.</p></div>
  }
  return (
    <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.08] shadow-sm">
      <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-plum-50 text-plum-700"><Send size={17} /></div><div className="min-w-0 flex-1"><p className="text-[14px] font-extrabold text-ink">Ready to go live?</p><p className="mt-1 text-[12px] leading-relaxed text-ink-soft">Send this exact storefront version to the Sambramo team. We review it before customers can see it.</p></div></div>
      <button type="button" disabled={!allDone || busy} onClick={submit} className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-plum-950 px-4 text-[13.5px] font-extrabold text-white shadow-[0_10px_26px_rgba(42,8,92,0.18)] disabled:cursor-not-allowed disabled:opacity-40">{busy ? <Sparkles size={16} className="animate-spin" /> : <Send size={16} />}Submit for Sambramo Review</button>
      <p className="mt-2 text-center text-[10.5px] leading-snug text-ink-mute">Minimum review window: 2 hours · Publishing requires Sambramo approval</p>
      {!allDone && <p className="mt-2 text-center text-[11.5px] font-semibold text-amber-800">Complete pricing for every listed trade before submitting.</p>}
    </div>
  )
}

export default function BusinessPreview() {
  const navigate = useNavigate()
  const { loading, account, steps, refresh } = usePartnerOnboarding()
  const [mode, setMode] = useState('customer')
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [error, setError] = useState('')
  const [pricingByService, setPricingByService] = useState({})
  const [pricingLoading, setPricingLoading] = useState(true)

  const vendor = account.vendor
  const listings = account.listings ?? []

  useEffect(() => {
    let alive = true
    const serviceIds = listings.flatMap(l => l.offerings ?? []).map(x => x.id).filter(Boolean)
    if (!serviceIds.length) {
      setPricingByService({})
      setPricingLoading(false)
      return
    }
    setPricingLoading(true)
    Promise.all([
      supabase.from('sambramo_trade_packages')
        .select('id,vendor_service_id,template_id,source,name,description,commercial_inputs,trade_inputs,status,revision_round')
        .in('vendor_service_id', serviceIds),
      supabase.from('sambramo_partner_price_books')
        .select('id,vendor_service_id,offering_id,unit,rate_paise,minimum_quantity,included_quantity,quantity_formula,status,version')
        .in('vendor_service_id', serviceIds)
        .order('version', { ascending: false }),
      supabase.from('sambramo_trade_package_addons')
        .select('id,package_id,name,unit,rate_paise,minimum_quantity,included_quantity,active,sort_order')
        .in('package_id', listings.flatMap(l => l.offerings ?? []).map(o => o.id).filter(Boolean)),
      supabase.from('sambramo_catering_packages')
        .select('id,vendor_service_id,name,status,min_guests,max_guests,service_hours,service_style,notes')
        .in('vendor_service_id', serviceIds),
    ]).then(([packagesRes, pricesRes, addonsRes, cateringRes]) => {
      if (!alive) return
      const packages = packagesRes.data ?? []
      const prices = pricesRes.data ?? []
      const addons = addonsRes.data ?? []
      const catering = cateringRes.data ?? []
      const out = {}
      for (const serviceId of serviceIds) {
        const generic = packages.filter(p => p.vendor_service_id === serviceId).map(p => ({
          ...p,
          price: prices.find(x => x.offering_id === String(p.id)) ?? null,
          addons: addons.filter(a => a.package_id === p.id),
        }))
        const cateringForService = catering.filter(p => p.vendor_service_id === serviceId).map(p => ({
          id: p.id,
          name: p.name,
          source: 'PARTNER_CATERING',
          status: p.status === 'ACTIVE' ? 'LIVE' : p.status,
          min_guests: p.min_guests,
          max_guests: p.max_guests,
          service_hours: p.service_hours,
          service_style: p.service_style,
          description: p.notes ?? '',
          price: null,
          addons: [],
        }))
        out[serviceId] = [...generic, ...cateringForService]
      }
      setPricingByService(out)
      setPricingLoading(false)
    }).catch(() => {
      if (alive) setPricingLoading(false)
    })
    return () => { alive = false }
  }, [listings])

  const enrichedListings = useMemo(() => listings.map(listing => ({
    ...listing,
    offerings: (listing.offerings ?? []).map(offering => ({
      ...offering,
      pricing_packages: pricingByService[offering.id] ?? [],
    })),
  })), [listings, pricingByService])

  if (loading || pricingLoading && account.vendor) {
    return <div className="native-screen grid place-items-center bg-white"><Sparkles className="animate-pulse text-plum-700" size={28} /></div>
  }

  const status = storefrontStatus(vendor, enrichedListings)
  const visibleListings = selectedTrade ? enrichedListings.filter(l => l.trade === selectedTrade) : enrichedListings
  const launchReady = steps.filter(s => s.id !== 'review').every(s => s.status === 'COMPLETE') &&
    enrichedListings.length > 0 &&
    enrichedListings.every(l => pricingReadiness(l).ready) &&
    !!vendor?.city && Number(vendor?.service_radius_km) > 0

  function editProfile() { navigate('/partner/setup/details') }
  function editServices() { navigate('/partner/setup/services') }
  function editPricing() { navigate('/dashboard/vendor?tab=pricing') }
  function editAvailability() { navigate('/dashboard/vendor?tab=availability') }
  function editTrade(trade) { navigate('/dashboard/vendor?tab=list&start=' + encodeURIComponent(trade) + '&return=preview') }
  function editMeasurement(trade) { navigate('/dashboard/vendor?tab=list&start=' + encodeURIComponent(trade) + '&return=preview&focus=measurement') }

  return (
    <div className="min-h-[100dvh] bg-page">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-ink ring-1 ring-ink/10"><ArrowLeft size={17} /></button>
          <div className="min-w-0 flex-1"><p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-plum-600">Sambramo Partner Studio</p><h1 className="truncate text-[17px] font-black text-ink">Business Preview</h1></div>
          <div className="flex items-center gap-1.5"><StatusPill status={status} /><button type="button" onClick={() => setMode(mode === 'customer' ? 'edit' : 'customer')} className="grid h-10 w-10 place-items-center rounded-2xl bg-plum-950 text-white" aria-label={mode === 'customer' ? 'Edit business' : 'Show customer view'}>{mode === 'customer' ? <Edit3 size={15} /> : <Eye size={15} />}</button></div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-32 pt-4">
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-plum-950 via-plum-800 to-plum-600 p-5 text-white shadow-[0_18px_52px_rgba(42,8,92,0.22)]">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-saffron-400/15 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-plum-200">Customer-facing storefront</p><h2 className="mt-1 break-words text-[25px] font-black tracking-tight">{vendor?.business_name || 'Your business'}</h2><p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-white/70"><MapPin size={12} /> {vendor?.city || 'Bengaluru'}{vendor?.service_radius_km ? ' · within ' + vendor.service_radius_km + ' km' : ''}</p></div><ShieldCheck size={19} className="shrink-0 text-saffron-300" /></div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-white/80">{vendor?.description || 'Add a clear business description so customers understand what you provide.'}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {enrichedListings.slice(0, 5).map(l => <span key={l.trade} className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold ring-1 ring-white/10">{l.trade}</span>)}
              {enrichedListings.length > 5 && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold ring-1 ring-white/10">+{enrichedListings.length - 5} more</span>}
            </div>
          </div>
        </section>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => setSelectedTrade(null)} className={'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold ring-1 ' + (selectedTrade === null ? 'bg-plum-950 text-white ring-plum-950' : 'bg-white text-ink-soft ring-ink/10')}>All services</button>
          {enrichedListings.map(l => <button key={l.trade} type="button" onClick={() => setSelectedTrade(l.trade)} className={'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold ring-1 ' + (selectedTrade === l.trade ? 'bg-plum-950 text-white ring-plum-950' : 'bg-white text-ink-soft ring-ink/10')}>{l.trade}</button>)}
        </div>

        {mode === 'customer' ? (
          <section className="mt-4 space-y-3">
            {visibleListings.length === 0 ? (
              <div className="rounded-[22px] bg-white p-8 text-center ring-1 ring-ink/[0.08]"><Layers3 className="mx-auto text-ink-mute" size={28} /><p className="mt-3 text-[14px] font-extrabold text-ink">Nothing ready to preview yet</p><p className="mt-1 text-[12px] leading-relaxed text-ink-mute">Complete a trade and its offering, then return here.</p></div>
            ) : visibleListings.flatMap(listing => {
              const config = normalizeTrade(listing.trade, listing.trade_id)
              const offerings = listing.offerings?.length ? listing.offerings : [null]
              return offerings.map((offering, index) => <CustomerOfferingCard key={offering?.id ?? (String(listing.id ?? listing.trade) + '-' + index)} offering={offering} config={config} />)
            })}
          </section>
        ) : (
          <section className="mt-4 space-y-3">
            <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.08]">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[9.5px] font-extrabold uppercase tracking-[0.15em] text-plum-600">Edit controls</p><h2 className="mt-1 text-[16px] font-black text-ink">Everything customers can see</h2></div><Sparkles size={19} className="text-saffron-500" /></div>
              <div className="mt-4 grid grid-cols-2 gap-2"><EditAction icon={Edit3} label="Business profile" detail="Name, description & media" onClick={editProfile} /><EditAction icon={Layers3} label="Services" detail="Trades & offerings" onClick={editServices} /><EditAction icon={BarChart3} label="Pricing" detail="Rates, packages & add-ons" onClick={editPricing} /><EditAction icon={Clock3} label="Availability" detail="Capacity & calendar" onClick={editAvailability} /></div>
            </div>

            {visibleListings.map(listing => {
              const config = normalizeTrade(listing.trade, listing.trade_id)
              const offering = listing.offerings?.[0]
              return (
                <article key={listing.id ?? listing.trade} className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.08]">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">{config.trade_id} · {config.name}</p><h3 className="mt-1 break-words text-[15px] font-extrabold text-ink">{offering?.name || 'Untitled offering'}</h3></div><button type="button" onClick={() => editTrade(listing.trade)} className="inline-flex h-9 items-center gap-1 rounded-full bg-plum-50 px-3 text-[11px] font-extrabold text-plum-700"><Edit3 size={13} /> Edit</button></div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {config.fields.slice(0, 6).map(field => <div key={field.key} className="rounded-xl bg-page-sunk px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wide text-ink-mute">{field.label}</p><p className="mt-0.5 truncate text-[11.5px] font-extrabold text-ink">{offering?.specs?.[field.key] ?? offering?.[field.key] ?? 'Not configured'}</p></div>)}
                  </div>
                  {offering?.pricing_packages?.length > 0 && (
                    <div className="mt-3 rounded-2xl bg-page-sunk p-3">
                      <div className="flex items-center justify-between"><p className="text-[9.5px] font-extrabold uppercase tracking-wide text-ink-mute">Pricing catalog</p><span className="text-[9.5px] font-extrabold text-plum-700">{offering.pricing_packages.length} package{offering.pricing_packages.length === 1 ? '' : 's'}</span></div>
                      <div className="mt-2 space-y-1.5">
                        {offering.pricing_packages.map(pkg => <div key={pkg.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-ink/[0.06]"><span className="min-w-0 truncate text-[11px] font-extrabold text-ink">{pkg.name}</span><span className="shrink-0 text-[10px] font-extrabold text-plum-700">{pkg.status === 'LIVE' ? 'Enabled' : pkg.status.replaceAll('_', ' ')}</span></div>)}
                      </div>
                    </div>
                  )}
                  {config.siteMode !== 'NONE' && <button type="button" onClick={() => editMeasurement(listing.trade)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-plum-300 bg-plum-50 py-2.5 text-[11.5px] font-extrabold text-plum-700"><Ruler size={14} /> Configure site measurements / survey</button>}
                </article>
              )
            })}
          </section>
        )}

        <section className="mt-5"><Readiness vendor={vendor} listings={enrichedListings} onEdit={() => setMode('edit')} /></section>
        <section className="mt-4"><SubmissionPanel status={status} allDone={launchReady} error={error} setError={setError} onSubmitted={async () => { await refresh(); setMode('customer') }} /></section>

        {error && <div className="fixed inset-x-4 bottom-24 z-40 rounded-2xl bg-rose-700 px-4 py-3 text-[12px] font-extrabold text-white shadow-xl" role="alert">{error}<button type="button" onClick={() => setError('')} className="float-right ml-3" aria-label="Close error"><X size={14} /></button></div>}
        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-semibold text-ink-mute"><FileCheck2 size={12} /> Submitted versions are reviewed before publication</div>
      </main>
    </div>
  )
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT
  return <span className={'rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ring-1 ' + meta.tone}>{meta.label}</span>
}

function formatINR(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN')
}
