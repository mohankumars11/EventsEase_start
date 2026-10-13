/**
 * The Pricing tab.
 *
 * Listings whose trade has a pricing profile (Anchor & MC) get the Pricing
 * Control Center, read from their published listing version. Every other
 * trade keeps SambramoPricingStudio until it is ported, so nothing that
 * works today changes for them.
 */
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles, ArrowRight, CircleAlert, Hourglass, CircleHelp, CheckCircle2, ChevronRight, X, ArrowLeft, MapPin, Package, CalendarClock, SlidersHorizontal, IndianRupee, Eye, Pencil } from 'lucide-react'
import PricingControlCenter, { SeasonalUpdate } from './PricingControlCenter'
import TradePricing from './TradePricing'
import { useEngineReady, onEngine } from '../../../lib/tradeEngine'
import SambramoPricingStudio from '../SambramoPricingStudio'
import AnchorProfileCard from '../../customer/AnchorProfileCard'
import { Sheet } from '../anchor/ui'
import { hasProfileFor } from '../../../data/tradePricingProfiles'
import { useAnchorPricing } from '../../../hooks/useAnchorPricing'
import { ADDONS_V3, EVENT_GROUPS_V3, CANCELLATION_V3 } from '../anchor/options'
import { buildListingPayload } from '../anchor/payload'
import { rupees } from '../../../lib/tierPackages'
import { supabase } from '../../../lib/supabase'
import { useToast, friendlyError } from '../../../context/ToastContext'
import SambramoTradePictogram from '../SambramoTradePictogram'
import PartnerMediaLinks from './PartnerMediaLinks'

const MODEL_UNIT = { hour: '/hr', multi_day: '/day' }
const MODEL_LABEL = { hour: 'Per hour', session: 'Per session', event: 'Per event', half_day: 'Half-day', full_day: 'Full-day', multi_day: 'Multi-day' }
const UNIT_LABEL = { per_event: 'per event', per_session: 'per session', per_hour: 'per hour', per_day: 'per day' }
const EVENT_LABEL = Object.fromEntries(EVENT_GROUPS_V3.flatMap(g => g.items.map(i => [i.id, i.label])))
const ROLE = { anchor: 'Anchor', mc: 'MC', both: 'Anchor & MC' }
const TRAVEL = { included_radius: 'Included within your area', flat: 'Flat outstation fee', per_km: 'Per km beyond your area', customer_arranged: 'Customer arranges travel & stay', custom: 'Custom quote' }
const label = id => ADDONS_V3.find(a => a.id === id)?.label ?? id
const title = t => t.charAt(0) + t.slice(1).toLowerCase()

const statusCopy = {
  LIVE: { label: 'Live', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  UNDER_REVIEW: { label: 'In review', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  ACTION_REQUIRED: { label: 'Action needed', tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
  REJECTED: { label: 'Changes needed', tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
  DRAFT: { label: 'Draft', tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  ARCHIVED: { label: 'Hidden', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  NOT_CONFIGURED: { label: 'Setup needed', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
}
const statusGroup = status => status === 'LIVE' ? 'live'
  : ['UNDER_REVIEW', 'ACTION_REQUIRED', 'REJECTED'].includes(status) ? 'review' : 'draft'
const shortDate = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
const daysUntil = value => value ? Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)) : null

export default function PricingTab({ vendor, services = [], onOpenListings, onEditListing, onOpenPayout }) {
  const [helpOpen, setHelpOpen] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [legacyScreen, setLegacyScreen] = useState('details')
  const [filterStatus, setFilterStatus] = useState('all')
  const [listingMeta, setListingMeta] = useState({ byId: {}, packagesById: {}, priceById: {}, priceUnitById: {}, packageDetailsById: {}, priceLockById: {}, nextPriceDate: null, nextPriceServiceId: null, loading: true })
  const engineReady = useEngineReady()
  const anchors = services.filter(s => hasProfileFor(s.category))
  const engine = engineReady ? services.filter(s => onEngine(s.category)) : []
  const others = services.filter(s => !hasProfileFor(s.category) && !engine.includes(s))
  const selectedService = services.find(s => s.id === selectedServiceId) ?? null

  useEffect(() => {
    let alive = true
    const ids = services.map(s => s.id).filter(Boolean)
    if (!ids.length) {
      setListingMeta({ byId: {}, packagesById: {}, priceById: {}, priceUnitById: {}, packageDetailsById: {}, priceLockById: {}, nextPriceDate: null, nextPriceServiceId: null, loading: false })
      return () => { alive = false }
    }
    setListingMeta(s => ({ ...s, loading: true }))
    Promise.all([
      supabase.from('sambramo_listing_versions')
        .select('vendor_service_id,version,status,seasonal_window_id,price_locked_until,published_at')
        .in('vendor_service_id', ids).order('version', { ascending: false }),
      supabase.from('sambramo_trade_packages')
        .select('id,vendor_service_id,name,description,status,trade_inputs,commercial_inputs,calculation_snapshot,price_locked_until,published_at')
        .in('vendor_service_id', ids),
      supabase.from('sambramo_catering_packages')
        .select('id,vendor_service_id,name,status,rate_bands,min_guests,max_guests,service_hours,notes')
        .in('vendor_service_id', ids),
      supabase.from('sambramo_partner_price_books')
        .select('vendor_service_id,offering_id,component_id,status,effective_from,rate_paise,unit,minimum_quantity,included_quantity,quantity_formula,version,created_at')
        .in('vendor_service_id', ids).eq('component_id', 'base').in('status', ['active', 'draft']).order('version', { ascending: false }),
      supabase.from('sambramo_pricing_config').select('price_lock_days').limit(1).maybeSingle(),
    ]).then(async ([versionsRes, packagesRes, cateringRes, priceBooksRes, pricingConfigRes]) => {
      if (!alive) return
      const versions = versionsRes.data ?? []
      const packages = packagesRes.data ?? []
      const catering = cateringRes.data ?? []
      const priceBooks = priceBooksRes.data ?? []
      const priceLockDays = Math.max(1, Number(pricingConfigRes.data?.price_lock_days ?? 15))
      const cateringIds = catering.map(p => p.id).filter(Boolean)
      let cateringPrices = []
      if (cateringIds.length) {
        try {
          const response = await supabase.from('sambramo_catering_price_versions')
            .select('package_id,effective_from,status')
            .in('package_id', cateringIds).eq('status', 'ACTIVE')
          cateringPrices = response.data ?? []
        } catch { cateringPrices = [] }
      }
      const lockUntilFrom = (value, days = priceLockDays) => {
        if (!value) return null
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return null
        return new Date(date.getTime() + days * 86400000).toISOString()
      }
      const byId = {}
      for (const id of ids) {
        const regular = versions.filter(v => v.vendor_service_id === id && !v.seasonal_window_id)
        const latest = regular[0] ?? null
        const ownPackages = [...packages.filter(p => p.vendor_service_id === id), ...catering.filter(p => p.vendor_service_id === id)]
        const fallback = ownPackages.some(p => ['LIVE', 'ACTIVE'].includes(String(p.status).toUpperCase())) ? 'LIVE'
          : ownPackages.some(p => ['UNDER_REVIEW', 'ACTION_REQUIRED', 'REJECTED'].includes(String(p.status).toUpperCase())) ? 'UNDER_REVIEW'
          : ownPackages.length ? 'DRAFT' : 'NOT_CONFIGURED'
        byId[id] = latest?.status ?? fallback
      }
      const packagesById = {}
      const priceById = {}
      const draftPriceById = {}
      const priceUnitById = {}
      const packageDetailsById = {}
      const priceLockById = {}
      for (const p of packages) {
        if (!p.vendor_service_id) continue
        packagesById[p.vendor_service_id] = (packagesById[p.vendor_service_id] ?? 0) + (p.status === 'ARCHIVED' ? 0 : 1)
        const packageBooks = priceBooks.filter(row => row.offering_id === String(p.id) && row.vendor_service_id === p.vendor_service_id && row.component_id === 'base')
        const priceBook = packageBooks.find(row => row.status === 'active') ?? packageBooks.find(row => row.status === 'draft') ?? packageBooks[0] ?? null
        const savedRatePaise = Number(priceBook?.rate_paise ?? p.trade_inputs?.take_home_paise ?? p.take_home_paise ?? 0)
        if (p.status !== 'ARCHIVED') (packageDetailsById[p.vendor_service_id] ??= []).push({
          id: p.id, name: p.name, description: p.description, status: p.status,
          pricePaise: savedRatePaise,
          duration: p.trade_inputs?.duration_hours ?? p.trade_inputs?.duration ?? priceBook?.quantity_formula?.included_duration ?? null,
          inclusions: Array.isArray(p.commercial_inputs?.inclusions) ? p.commercial_inputs.inclusions : [],
        })
        if (savedRatePaise > 0 && p.status !== 'ARCHIVED') {
          const target = p.status === 'LIVE' ? priceById : draftPriceById
          target[p.vendor_service_id] = Math.min(target[p.vendor_service_id] ?? savedRatePaise, savedRatePaise)
        }
      }
      for (const p of catering) {
        if (!p.vendor_service_id || p.status === 'ARCHIVED') continue
        (packageDetailsById[p.vendor_service_id] ??= []).push({
          id: p.id, name: p.name, status: p.status, rateBands: Array.isArray(p.rate_bands) ? p.rate_bands : [],
          minGuests: p.min_guests, maxGuests: p.max_guests, serviceHours: p.service_hours, description: p.notes,
          inclusions: [],
        })
        const bands = Array.isArray(p.rate_bands) ? p.rate_bands : []
        const rates = bands.map(b => {
          const paise = Number(b?.rate_paise)
          if (Number.isFinite(paise) && paise > 0) return paise
          const rupeesValue = Number(b?.rate)
          return Number.isFinite(rupeesValue) && rupeesValue > 0 ? Math.round(rupeesValue * 100) : 0
        }).filter(rate => rate > 0)
        const ratePerGuestPaise = rates.length ? Math.min(...rates) : 0
        if (ratePerGuestPaise > 0) {
          const isPublished = ['ACTIVE', 'LIVE'].includes(String(p.status).toUpperCase())
          const target = isPublished ? priceById : draftPriceById
          if (!(target[p.vendor_service_id] > 0)) target[p.vendor_service_id] = ratePerGuestPaise
          if (isPublished) priceUnitById[p.vendor_service_id] = 'per guest'
        }
      }
      for (const id of ids) {
        const listing = versions.find(v => v.vendor_service_id === id && !v.seasonal_window_id && v.status === 'LIVE')
        const candidates = []
        if (listing?.price_locked_until) candidates.push(listing.price_locked_until)
        for (const pkg of packages.filter(p => p.vendor_service_id === id && p.status === 'LIVE')) {
          if (pkg.price_locked_until) candidates.push(pkg.price_locked_until)
          else if (pkg.published_at) candidates.push(lockUntilFrom(pkg.published_at))
          const book = priceBooks.find(row => row.offering_id === String(pkg.id) && row.vendor_service_id === id)
          if (!pkg.price_locked_until && !pkg.published_at && book?.effective_from) candidates.push(lockUntilFrom(book.effective_from))
        }
        const activeCateringPackages = catering.filter(p => p.vendor_service_id === id && ['ACTIVE', 'LIVE'].includes(String(p.status).toUpperCase()))
        for (const pkg of activeCateringPackages) {
          const currentPrice = cateringPrices.filter(row => row.package_id === pkg.id).sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from))[0]
          if (currentPrice?.effective_from) candidates.push(lockUntilFrom(currentPrice.effective_from))
        }
        const activeLocks = candidates.filter(value => value && new Date(value) > new Date())
        if (activeLocks.length) priceLockById[id] = activeLocks.sort((a, b) => new Date(b) - new Date(a))[0]
      }
      for (const id of ids) if (!(priceById[id] > 0) && draftPriceById[id] > 0) priceById[id] = draftPriceById[id]

      const futureLocks = ids.map(id => priceLockById[id] ? ({ date: priceLockById[id], serviceId: id }) : null)
        .filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date))
      setListingMeta({ byId, packagesById, priceById, priceUnitById, packageDetailsById, priceLockById, nextPriceDate: futureLocks[0]?.date ?? null, nextPriceServiceId: futureLocks[0]?.serviceId ?? null, loading: false })
    }).catch(() => {
      if (alive) setListingMeta(s => ({ ...s, loading: false }))
    })
    return () => { alive = false }
  }, [services])

  if (engineReady === null && services.some(s => onEngine(s.category))) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-plum-600" /></div>
  }

  const counts = services.reduce((out, service) => {
    const status = listingMeta.byId[service.id] ?? 'NOT_CONFIGURED'
    out[statusGroup(status)] += 1
    return out
  }, { live: 0, review: 0, draft: 0 })

  const detailHeader = selectedService ? (
    <div className="mb-4 flex items-center gap-3">
      <button type="button" onClick={() => { setSelectedServiceId(null); setLegacyScreen('details') }} aria-label="Back to all listings"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-plum-800 ring-1 ring-ink/[0.08]">
        <ArrowLeft size={19} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[18px] font-extrabold text-plum-950">{selectedService.name || selectedService.category}</p>
        <p className="text-[12px] text-ink/55">Listing details · packages · terms & pricing</p>
      </div>
      <button type="button" onClick={() => setHelpOpen(true)} aria-label="Pricing setup help"
        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-plum-200 bg-white px-3 text-[12px] font-extrabold text-plum-700">
        <CircleHelp size={18} /> Help
      </button>
    </div>
  ) : null

  return (
    <div className="space-y-4 pb-5">
      {!selectedService ? (
        <>
          <section className="relative -mx-4 -mt-4 overflow-hidden rounded-b-[30px] bg-gradient-to-br from-plum-800 via-plum-700 to-[#321067] px-5 pb-7 pt-5 text-white sm:-mx-6">
            <div className="pointer-events-none absolute -right-12 -top-10 h-44 w-44 rounded-full border border-white/10 bg-white/[0.04]" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/60">Sambramo partner studio</p>
                <h1 className="mt-1 text-[clamp(1.45rem,6vw,1.8rem)] font-extrabold leading-tight tracking-tight">Pricing & Listings</h1>
                <p className="mt-1 text-[13px] text-white/75">Manage your services, packages and rates.</p>
              </div>
              <button type="button" onClick={() => setHelpOpen(true)} aria-label="Pricing help and setup guidance" title="Pricing help"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-sm backdrop-blur transition hover:bg-white/15 active:scale-95">
                <CircleHelp size={22} />
              </button>
            </div>
            <div className="relative mt-5 grid grid-cols-4 gap-1 rounded-[22px] bg-white p-3 text-plum-950 shadow-[0_12px_30px_rgba(20,0,50,0.18)]">
              <StatusMetric label="Live" count={counts.live} glyph="✓" tone="text-emerald-700 bg-emerald-50" />
              <StatusMetric label="In review" count={counts.review} glyph="◷" tone="text-amber-700 bg-amber-50" />
              <StatusMetric label="Drafts" count={counts.draft} glyph="▤" tone="text-violet-700 bg-violet-50" />
              <StatusMetric label="Total" count={services.length} glyph="▥" tone="text-slate-700 bg-slate-100" />
            </div>
          </section>

          <button type="button" onClick={() => setSelectedServiceId(listingMeta.nextPriceServiceId ?? services[0]?.id ?? null)}
            disabled={!listingMeta.nextPriceServiceId}
            className="flex w-full items-center gap-3 rounded-[22px] bg-gradient-to-r from-plum-50 to-white p-4 text-left ring-1 ring-plum-100 disabled:cursor-default">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-plum-100 text-plum-700"><CalendarClock size={23} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-extrabold text-plum-950">Price update window</span>
              <span className="mt-0.5 block text-[14px] font-extrabold text-plum-800">{listingMeta.nextPriceDate ? `Next eligible price change in ${daysUntil(listingMeta.nextPriceDate)} day${daysUntil(listingMeta.nextPriceDate) === 1 ? '' : 's'}` : 'Your price-update dates appear here once a listing is published'}</span>
              <span className="mt-0.5 block text-[11.5px] text-ink/55">Regular prices follow the 15-day update policy. An approved seasonal window, when available, is shown inside the listing.</span>
            </span>
            <ChevronRight size={19} className="shrink-0 text-plum-700" />
          </button>

          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-[21px] font-extrabold tracking-tight text-plum-950">Your listings</h2>
              <p className="text-[12px] text-ink/50">{services.length} service{services.length === 1 ? '' : 's'} · status from saved listing data</p>
            </div>
            <button type="button" onClick={() => onOpenListings?.()} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-plum-200 bg-white px-3 text-[12px] font-extrabold text-plum-700">
              <SlidersHorizontal size={15} /> Manage
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              ['all', `All · ${services.length}`],
              ['live', `Live · ${counts.live}`],
              ['review', `In review · ${counts.review}`],
              ['draft', `Draft · ${counts.draft}`],
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setFilterStatus(key)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[11.5px] font-extrabold ring-1 transition ${filterStatus === key ? 'bg-plum-700 text-white ring-plum-700' : 'bg-white text-ink/65 ring-ink/[0.09]'}`}>
                {label}
              </button>
            ))}
          </div>

          {services.length ? (
            <div className="space-y-3">
              {services.filter(service => filterStatus === 'all' || statusGroup(listingMeta.byId[service.id] ?? 'NOT_CONFIGURED') === filterStatus).map(service => {
                const status = listingMeta.byId[service.id] ?? 'NOT_CONFIGURED'
                const look = statusCopy[status] ?? statusCopy.NOT_CONFIGURED
                const packCount = listingMeta.packagesById[service.id] ?? 0
                const configName = service.category || service.trade || 'Service'
                return (
                  <button key={service.id} type="button" onClick={() => { setSelectedServiceId(service.id); setLegacyScreen('details') }}
                    className="group flex w-full items-center gap-3 rounded-[24px] bg-white p-3.5 text-left ring-1 ring-ink/[0.07] shadow-[0_6px_22px_rgba(30,15,55,0.04)] transition active:scale-[0.995]">
                    <span className="flex w-[92px] shrink-0 flex-col items-center gap-1.5">
                      <span className="flex h-[82px] w-[82px] items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-plum-50 to-violet-100 ring-1 ring-plum-100">
                        <SambramoTradePictogram trade={configName} size="sm" showSparkle={false} title={false} />
                      </span>
                      <span className="max-w-full text-center text-[10.5px] font-bold leading-tight text-ink/70">{configName}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-extrabold text-plum-950">{service.name || configName}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ring-1 ${look.tone}`}>{look.label}</span>
                      </span>
                      <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink/55"><MapPin size={13} className="shrink-0 text-plum-600" />{service.city || service.location || vendor?.city || 'Service location not set'}</span>
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-plum-50 px-2.5 py-1.5 text-[11.5px] font-bold text-plum-800">
                        <Package size={14} />{listingMeta.loading ? 'Checking packages…' : packCount ? `${packCount} package${packCount === 1 ? '' : 's'}${listingMeta.priceById[service.id] ? ` · from ${rupees(listingMeta.priceById[service.id])}${listingMeta.priceUnitById[service.id] ? ` / ${listingMeta.priceUnitById[service.id]}` : ''}` : ''}` : 'Finish package setup'}
                        <ChevronRight size={14} className="ml-1" />
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <section className="rounded-[24px] bg-white p-5 text-center ring-1 ring-ink/[0.07]">
              <p className="text-[16px] font-extrabold text-plum-950">Your pricing starts with a listing</p>
              <p className="mt-1 text-[12.5px] text-ink/60">Add a service first, then configure its packages, prices and booking rules.</p>
              <button type="button" onClick={onOpenListings} className="mt-4 rounded-full bg-plum-700 px-5 py-3 text-[13px] font-extrabold text-white">Open my listings</button>
            </section>
          )}
        </>
      ) : (
        <>
          {detailHeader}
          {anchors.some(s => s.id === selectedService.id) ? (
            <AnchorPricing service={selectedService} vendor={vendor}
              onEdit={() => onEditListing?.(selectedService)}
              onOpenPayout={onOpenPayout} />
          ) : engine.some(s => s.id === selectedService.id) ? (
            <TradePricing service={selectedService} vendor={vendor}
              onEdit={() => onEditListing?.(selectedService)}
              onOpenPayout={onOpenPayout} />
          ) : legacyScreen === 'details' ? (
            <LegacyListingDetails
              service={selectedService}
              vendor={vendor}
              status={listingMeta.byId[selectedService.id] ?? 'NOT_CONFIGURED'}
              packageCount={listingMeta.packagesById[selectedService.id] ?? 0}
              startingPricePaise={listingMeta.priceById[selectedService.id] ?? null}
              priceUnit={listingMeta.priceUnitById[selectedService.id] ?? null}
              priceLockedUntil={listingMeta.priceLockById[selectedService.id] ?? null}
              packages={listingMeta.packageDetailsById[selectedService.id] ?? []}
              onPreview={() => setLegacyScreen('preview')}
              onEdit={() => setLegacyScreen('edit')}
            />
          ) : (
            <SambramoPricingStudio vendor={vendor} services={[selectedService]} initialServiceId={selectedService.id}
              startPreview={legacyScreen === 'preview'}
              priceLockedUntil={listingMeta.priceLockById[selectedService.id] ?? null}
              onOpenListings={onOpenListings} onReturnToPricing={() => setLegacyScreen('details')} />
          )}
        </>
      )}

      {helpOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="pricing-help-title">
          <button type="button" aria-label="Close help" onClick={() => setHelpOpen(false)} className="absolute inset-0 cursor-default" />
          <section className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Partner setup assistant</p>
                <h2 id="pricing-help-title" className="mt-1 text-xl font-extrabold text-plum-950">Let’s get your listing ready</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-ink/65">Use this checklist to finish your listing. Your saved details and review status remain the source of truth.</p>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} aria-label="Close help" className="rounded-full p-2 text-ink/60 hover:bg-plum-50"><X size={20} /></button>
            </div>
            <div className="mt-4 space-y-2">
              {[
                ['Profile & service area', 'Confirm your display name, location, travel radius, languages and event preferences.'],
                ['Packages & pricing', 'Add package names, durations, inclusions and rates that match the service you provide.'],
                ['Media & portfolio', 'Upload relevant photos, audio samples or performance videos where your trade supports them.'],
                ['Booking rules', 'Review advance payment, cancellation, rescheduling, extra hours, travel and other charges.'],
                ['Customer preview', 'Check the customer-facing listing and make sure every displayed detail is accurate.'],
              ].map(([title, description], i) => (
                <div key={title} className="flex items-start gap-3 rounded-2xl border border-ink/[0.08] p-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-plum-50 text-plum-700"><CheckCircle2 size={17} /></span>
                  <div className="min-w-0 flex-1"><p className="text-[13.5px] font-extrabold text-ink">{i + 1}. {title}</p><p className="mt-0.5 text-[12px] leading-relaxed text-ink/60">{description}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-amber-50 p-3.5 text-[12px] leading-relaxed text-amber-950">
              <b>Blocked or unable to continue?</b> Open your listing editor and check for required fields, upload errors or review feedback. Some price changes may remain locked during the 15-day pricing window.
            </div>
            <button type="button" onClick={() => { setHelpOpen(false); onOpenListings?.() }}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-5 text-[14px] font-extrabold text-white">
              Open my listing <ChevronRight size={18} />
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

function LegacyListingDetails({
  service, vendor, status, packageCount, startingPricePaise, priceUnit, priceLockedUntil,
  packages = [], onPreview, onEdit,
}) {
  const category = service?.category || service?.trade || service?.name || 'Service'
  const specs = service?.specs && typeof service.specs === 'object' ? service.specs : {}
  const profile = specs.trade_v1 ?? specs.trade_inputs ?? specs.profile ?? specs
  const lockDays = priceLockedUntil ? Math.max(0, Math.ceil((new Date(priceLockedUntil).getTime() - Date.now()) / 86400000)) : null
  const look = statusCopy[status] ?? statusCopy.NOT_CONFIGURED
  const details = [
    ['Location', service?.city ?? service?.location ?? vendor?.city ?? profile?.city],
    ['Service area', profile?.travel_policy ?? profile?.service_area ?? profile?.travel_radius_km ?? profile?.travel_radius],
    ['Languages', profile?.languages ?? profile?.language],
    ['Events / services', profile?.supported_events ?? profile?.event_types ?? profile?.events ?? profile?.service_types],
    ['Capacity', profile?.guest_capacity ?? profile?.max_guests ?? profile?.capacity],
    ['Minimum notice', profile?.lead_time_days ?? profile?.min_notice_days],
    ['Booking mode', profile?.availability_policy ?? profile?.booking_mode],
    ['Payment terms', profile?.payment_policy ?? profile?.payment_terms],
    ['Cancellation policy', profile?.cancellation_policy ?? profile?.cancellation],
    ['Rescheduling policy', profile?.reschedule_policy ?? profile?.rescheduling_policy],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length))
    .map(([label, value]) => [label, Array.isArray(value) ? value.map(v => typeof v === 'object' ? (v.label ?? v.name ?? v.value ?? '') : String(v)).filter(Boolean).join(', ') : typeof value === 'object' ? (value.label ?? value.name ?? value.value ?? '') : String(value)])
    .filter(([, value]) => value !== '')
  const shownPackages = packages.filter(pkg => pkg.status !== 'ARCHIVED').sort((a, b) => {
    const aa = String(a.name ?? '').toLowerCase(), bb = String(b.name ?? '').toLowerCase()
    const rank = name => name.includes('essential') || name.includes('basic') ? 0 : name.includes('signature') || name.includes('premium') ? 1 : name.includes('vip') ? 2 : 3
    return rank(aa) - rank(bb) || aa.localeCompare(bb)
  })

  function priceOf(pkg) {
    if (Number(pkg.pricePaise) > 0) return Number(pkg.pricePaise)
    const bands = Array.isArray(pkg.rateBands) ? pkg.rateBands : []
    const bandPaise = bands.map(band => {
      if (Number(band?.rate_paise) > 0) return Number(band.rate_paise)
      const rate = Number(band?.rate)
      return Number.isFinite(rate) && rate > 0 ? Math.round(rate * 100) : 0
    }).filter(value => value > 0)
    return bandPaise.length ? Math.min(...bandPaise) : null
  }

  return (
    <div className="space-y-4 pb-5">
      <section className="overflow-hidden rounded-[26px] bg-white ring-1 ring-ink/[0.07] shadow-[0_10px_28px_rgba(40,15,70,0.05)]">
        <div className="bg-gradient-to-br from-plum-800 via-plum-700 to-[#321067] p-4 text-white">
          <div className="flex items-start gap-3">
            <span className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="grid h-[76px] w-[76px] place-items-center rounded-[22px] bg-white/10 ring-1 ring-white/20">
                <SambramoTradePictogram trade={category} size="sm" showSparkle={false} title={false} />
              </span>
              <span className="max-w-[90px] text-center text-[10px] font-bold leading-tight text-white/80">{category}</span>
            </span>
            <div className="min-w-0 flex-1">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ring-1 ${look.tone}`}>{look.label}</span>
              <h2 className="mt-2 text-[19px] font-extrabold leading-tight">{service?.name || category}</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-white/70">{service?.description || 'Your saved trade-specific profile, packages and booking rules.'}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-white/85"><MapPin size={14} />{service?.city || service?.location || vendor?.city || 'Location not set'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-ink/[0.06] p-3">
          <div className="px-2"><p className="text-[9px] font-extrabold uppercase tracking-wide text-ink/45">Packages</p><p className="mt-1 text-[20px] font-black text-plum-950">{packageCount}</p></div>
          <div className="px-2"><p className="text-[9px] font-extrabold uppercase tracking-wide text-ink/45">Starting price</p><p className="mt-1 text-[15px] font-black text-plum-800">{startingPricePaise ? rupees(startingPricePaise) : '—'}</p>{priceUnit ? <p className="text-[9.5px] text-ink/50">{priceUnit}</p> : null}</div>
          <div className="px-2"><p className="text-[9px] font-extrabold uppercase tracking-wide text-ink/45">Availability</p><p className="mt-1 text-[12px] font-extrabold text-ink">{String(profile?.availability_policy ?? profile?.booking_mode ?? 'Check at booking').replace(/_/g, ' ')}</p></div>
        </div>
      </section>

      {priceLockedUntil && lockDays !== null && (
        <section className="flex items-start gap-3 rounded-[22px] bg-gradient-to-r from-plum-50 to-white p-4 ring-1 ring-plum-100">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-plum-100 text-plum-700"><CalendarClock size={20} /></span>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-plum-950">{lockDays > 0 ? `Next eligible price change in ${lockDays} day${lockDays === 1 ? '' : 's'}` : 'Regular price editing is available'}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/60">The 15-day price policy applies to published rates. You can still update your profile, media and booking terms while prices are locked.</p>
          </div>
        </section>
      )}

      {shownPackages.length > 0 && (
        <section className="rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.07]">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h3 className="text-[16px] font-extrabold text-plum-950">Packages & pricing</h3><p className="mt-0.5 text-[11px] text-ink/55">Swipe horizontally to review each saved package.</p></div>
            <span className="text-[10px] font-bold text-ink/45">{shownPackages.length} saved</span>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex snap-x snap-mandatory items-stretch gap-3">
              {shownPackages.map((pkg, index) => {
                const price = priceOf(pkg)
                return (
                  <article key={pkg.id ?? pkg.name ?? index} className="flex w-[78%] max-w-[280px] shrink-0 snap-center flex-col rounded-[22px] bg-gradient-to-b from-plum-50 to-white p-4 ring-1 ring-plum-100">
                    <p className="text-[14px] font-extrabold text-plum-950">{pkg.name || 'Package'}</p>
                    {pkg.duration ? <p className="mt-1 text-[11px] text-ink/55">{pkg.duration} hours</p> : pkg.serviceHours ? <p className="mt-1 text-[11px] text-ink/55">{pkg.serviceHours} service hours</p> : null}
                    <p className="mt-3 text-[23px] font-extrabold text-plum-950">{price ? rupees(price) : 'Price not set'}</p>
                    {pkg.minGuests ? <p className="mt-1 text-[10.5px] text-ink/55">{pkg.minGuests}{pkg.maxGuests ? `–${pkg.maxGuests}` : '+'} guests</p> : null}
                    {!!pkg.inclusions?.length && <div className="mt-3 space-y-1.5">{pkg.inclusions.map((item, i) => <p key={i} className="flex items-start gap-1.5 text-[11px] leading-snug text-ink/70"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-700"/><span>{typeof item === 'string' ? item : item?.label ?? item?.name ?? item?.id ?? String(item)}</span></p>)}</div>}
                    <div className="mt-auto pt-4"><span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[9.5px] font-extrabold text-ink/60 ring-1 ring-ink/[0.08]">{statusCopy[['ACTIVE', 'LIVE'].includes(String(pkg.status ?? '').toUpperCase()) ? 'LIVE' : String(pkg.status ?? '').toUpperCase()]?.label ?? String(pkg.status ?? 'Saved').replace(/_/g, ' ')}</span></div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <PartnerMediaLinks vendor={vendor} profile={profile ?? vendor ?? {}} />

      {details.length > 0 && (
        <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
          <h3 className="mb-2 text-[13px] font-extrabold text-plum-950">Booking & listing details</h3>
          <div className="divide-y divide-ink/[0.05]">{details.map(([label, value]) => <Row key={label} k={label} v={value} />)}</div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onPreview} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-3 text-[12.5px] font-extrabold text-plum-700 ring-1 ring-plum-300"><Eye size={16}/>Customer preview</button>
        <button type="button" onClick={onEdit} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-violet-600 px-3 text-[12.5px] font-extrabold text-white shadow-sm"><Pencil size={16}/>Edit listing</button>
      </div>
    </div>
  )
}

function StatusMetric({ label, count, glyph, tone }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-1 border-r border-ink/[0.06] px-0.5 text-center last:border-0">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-black ${tone}`}>{glyph}</span>
      <span className="block w-full truncate text-[8px] font-extrabold uppercase tracking-wide text-ink/50">{label}</span>
      <span className="block text-[19px] font-black leading-tight text-plum-950">{count}</span>
    </div>
  )
}

function AnchorPricing({ service, vendor, onEdit, onOpenPayout }) {
  const toast = useToast()
  const d = useAnchorPricing(service)
  const [sheet, setSheet] = useState(null)       // 'preview' | 'seasonal' | {tier}
  const [proposed, setProposed] = useState({})
  const [busy, setBusy] = useState(false)
  const answers = service.specs?.anchor_v3 ?? null

  const view = useMemo(() => d.current ? toView(d, service) : null, [d, service])

  if (d.loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-plum-600" /></div>
  if (d.empty || !view) {
    return (
      <div className="rounded-[22px] bg-gradient-to-br from-plum-50 to-white p-5 ring-1 ring-plum-100">
        <p className="text-[16px] font-extrabold text-plum-950">Finish your Anchor & MC setup</p>
        <p className="mt-1 text-[13px] text-ink/60">Your packages and prices appear here once you submit them.</p>
        <button type="button" onClick={onEdit} className="mt-4 flex h-11 items-center gap-1.5 rounded-full bg-plum-700 px-5 text-[13.5px] font-extrabold text-white">
          Continue setup <ArrowRight size={15} />
        </button>
      </div>
    )
  }

  const pendingOverLive = d.live && d.pending
  const banner = (<>
    {d.current.status === 'ACTION_REQUIRED' || d.current.status === 'REJECTED' ? (
      <div className="flex gap-2.5 rounded-[20px] bg-rose-50 p-4 ring-1 ring-rose-200">
        <CircleAlert size={17} className="mt-0.5 shrink-0 text-rose-600" />
        <div><p className="text-[13.5px] font-extrabold text-rose-900">Sambramo asked for changes</p>
          <p className="mt-0.5 text-[12.5px] text-rose-900/80">{d.current.review_note || 'Open your listing to see what to change.'}</p>
          <button type="button" onClick={onEdit} className="mt-2 text-[12.5px] font-extrabold text-rose-800 underline">Update listing</button></div>
      </div>
    ) : null}
    {pendingOverLive && (
      <div className="flex gap-2.5 rounded-[20px] bg-amber-50 p-4 ring-1 ring-amber-200">
        <Hourglass size={17} className="mt-0.5 shrink-0 text-amber-700" />
        <p className="text-[12.5px] font-semibold text-amber-900">
          Version {d.pending.version} is {d.pending.status === 'ACTION_REQUIRED' ? 'waiting for your changes' : 'with our team for review'}. Customers keep seeing your live prices until it is approved.
        </p>
      </div>
    )}
    {d.seasonal.filter(v => v.status === 'LIVE').map(v => (
      <div key={v.id} className="flex gap-2.5 rounded-[20px] bg-white p-4 ring-1 ring-amber-200">
        <Sparkles size={17} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-[12.5px] font-semibold text-ink/75">Seasonal prices are live for events from {fmt(v.effective_from)} to {fmt(v.effective_to)}.</p>
      </div>
    ))}
  </>)

  const liveRules = d.rules
  const seasonalFields = d.window ? liveRules.filter(r => d.window.permitted_fields?.includes(r.model)).map(r => ({
    id: r.model, label: `${MODEL_LABEL[r.model]} (you earn)`, current_paise: r.take_home_paise,
  })).concat(liveRules.filter(r => !d.window.permitted_fields?.includes(r.model)).map(r => ({
    id: r.model, label: MODEL_LABEL[r.model], current_paise: r.take_home_paise, locked: true,
  }))) : []

  async function submitSeasonal() {
    if (!answers) { toast.error('Open your listing once to refresh it, then try again.'); return }
    setBusy(true)
    try {
      const next = structuredClone(answers)
      for (const [model, rupeesTyped] of Object.entries(proposed)) {
        if (String(rupeesTyped).trim() !== '' && next.pricing?.[model]) next.pricing[model].rate = String(rupeesTyped)
      }
      const payload = buildListingPayload(next)
      const { error } = await supabase.rpc('submit_seasonal_listing_version', {
        p_vendor_service_id: service.id, p_window_id: d.window.id, p_payload: payload,
      })
      if (error) throw error
      toast.success('Seasonal prices sent for review.')
      setSheet(null); setProposed({}); d.reload()
    } catch (e) { toast.error(friendlyError(e)) } finally { setBusy(false) }
  }

  const pkg = typeof sheet === 'object' && sheet ? view.packages.find(p => p.tier === sheet.tier) : null

  return (
    <>
      <PricingControlCenter data={view} banner={banner}
        onEdit={onEdit} onPayout={onOpenPayout}
        onSeasonal={() => setSheet('seasonal')} onPreview={() => setSheet('preview')}
        onViewPackage={tier => setSheet({ tier })} />

      <Sheet open={sheet === 'preview'} onOpenChange={o => !o && setSheet(null)} title="Customer preview">
        <div className="space-y-4">
          <AnchorProfileCard profile={d.current.profile} city={view.listing.city}
            packages={view.packages.map(p => ({ tier: p.tier, name: p.name, hours: p.hours, customer_paise: p.price_paise, inclusions: p.inclusions }))}
            onPick={pkg => setSheet({ tier: pkg.tier })} showBookingCtaPreview
            instantBookEnabled={d.current.booking_rules?.instant !== false && d.current.booking_rules?.instant !== 'false'} />
          <PartnerMediaLinks vendor={vendor} profile={d.current.profile} />
          <PreviewSection title="What you can order" icon={Package}>
            {view.models.length ? view.models.map(m => {
              const [name, Icon] = MODEL[m.id] ?? [m.id, Package]
              return <Row key={m.id} k={<span className="inline-flex items-center gap-1.5"><Icon size={13} />{name} · {m.rules}</span>} v={`${rupees(m.customer_paise)} ${m.unit}`} />
            }) : <p className="text-[12.5px] text-ink/55">No separate pricing models are configured.</p>}
            {view.addons.length > 0 && <p className="pt-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Optional extras</p>}
            {view.addons.map(a => <Row key={a.name} k={a.name} v={`${rupees(a.paise)} ${a.unit}`} />)}
          </PreviewSection>
          <PreviewSection title="Other booking charges" icon={IndianRupee}>
            {view.charges.length ? view.charges.map(c => <Row key={c.k} k={c.k} v={c.v} />) : <p className="text-[12.5px] text-ink/55">No additional booking charges are configured.</p>}
          </PreviewSection>
          <PreviewSection title="Booking & payment rules" icon={CalendarClock}>
            {view.rules.map(c => <Row key={c.k} k={c.k} v={c.v} />)}
          </PreviewSection>
          <p className="rounded-2xl bg-plum-50 p-3 text-[11.5px] leading-relaxed text-plum-900">This preview is generated from your saved listing data. Media waiting for approval is marked and should not be treated as published customer content.</p>
        </div>
      </Sheet>

      <Sheet open={sheet === 'seasonal'} onOpenChange={o => !o && setSheet(null)} title="Update seasonal prices">
        {d.window && (
          <SeasonalUpdate window={{ from: d.window.event_from, to: d.window.event_to }} fields={seasonalFields}
            value={proposed} onChange={setProposed} onSubmit={busy ? undefined : submitSeasonal} />
        )}
      </Sheet>

      <Sheet open={!!pkg} onOpenChange={o => !o && setSheet(null)} title={pkg ? pkg.name : ''}>
        {pkg && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-plum-50 p-4">
              <p className="text-[28px] font-extrabold text-ink">{rupees(pkg.price_paise)}</p>
              <p className="text-[12.5px] font-bold text-ink/55">Your rate · {rupees(pkg.take_home_paise)}</p>
              <p className="mt-1 text-[12px] font-bold text-plum-700">{pkg.edited ? 'Your price' : 'Recommended price'} · based on your {MODEL_LABEL[pkg.basis] ?? 'rate'}</p>
            </div>
            <Row k="Hours included" v={`${pkg.hours} hours`} />
            {pkg.extra_hour_paise && <Row k="Each extra hour" v={rupees(pkg.extra_hour_paise)} />}
            <p className="pt-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Included</p>
            {pkg.inclusions.length ? pkg.inclusions.map(i => <p key={i} className="text-[13px] font-semibold">✓ {i}</p>) : <p className="text-[13px] text-ink/55">Hosting only.</p>}
            <p className="pt-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Customer can add</p>
            {view.addons.filter(a => !a.in.includes(title(pkg.tier))).map(a => <Row key={a.name} k={a.name} v={`${rupees(a.paise)} ${a.unit}`} />)}
          </div>
        )}
      </Sheet>
    </>
  )
}

const Row = ({ k, v }) => (
  <div className="flex justify-between gap-3 border-b border-ink/[0.05] py-2 text-[13px]"><span className="min-w-0 text-ink/55">{k}</span><span className="shrink-0 text-right font-bold">{v}</span></div>
)

function PreviewSection({ title, icon: Icon, children }) {
  return <section className="overflow-hidden rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.07]">
    <h3 className="mb-2 flex items-center gap-2 text-[13.5px] font-extrabold text-plum-950"><Icon size={16} className="text-plum-700" />{title}</h3>
    {children}
  </section>
}

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

function toView(d, service) {
  const v = d.current, prof = v.profile ?? {}, br = v.booking_rules ?? {}, tr = v.travel_rules ?? {}
  const loc = service.specs?.anchor_v3?.location ?? {}
  const byModel = Object.fromEntries(d.rules.map(r => [r.model, r]))
  const hourRule = byModel.hour
  const order = { ESSENTIAL: 0, SIGNATURE: 1, VIP: 2 }
  const items = d.readiness?.items ?? []

  const packages = d.packages
    .filter(p => p.commercial_inputs?.tier && p.status !== 'ARCHIVED')
    .sort((a, b) => order[a.commercial_inputs.tier] - order[b.commercial_inputs.tier])
    .map(p => {
      const t = p.commercial_inputs.tier, ti = p.trade_inputs ?? {}, snap = p.calculation_snapshot ?? {}
      const rule = byModel[snap.basis]
      return {
        tier: t, name: p.name, status: p.status,
        price_paise: Number(ti.customer_paise) || 0, take_home_paise: Number(ti.take_home_paise) || 0,
        hours: Number(ti.duration_hours) || 0, sessions: rule?.included_sessions ?? null,
        inclusions: (p.commercial_inputs.inclusions ?? []).map(label),
        edited: !!ti.edited_by_partner, basis: snap.basis,
        extra_hour_paise: rule?.extra_hour_take_home_paise ? Math.round(rule.extra_hour_take_home_paise / (1 - (snap.platform_fee_rate ?? 0.08)) / 10) * 10 : null,
      }
    })

  const gross = take => take ? Math.round(take / 0.92 / 10) * 10 : null
  const charges = [
    hourRule?.extra_hour_take_home_paise && { k: 'Overtime', v: `${rupees(gross(hourRule.extra_hour_take_home_paise))} per hour · ${hourRule.overtime_step_minutes ?? 60}-min steps after ${hourRule.overtime_grace_minutes ?? 0} min` },
    Object.values(byModel).find(r => r.extra_session_take_home_paise) && { k: 'Extra function', v: `${rupees(gross(Object.values(byModel).find(r => r.extra_session_take_home_paise).extra_session_take_home_paise))} each` },
    { k: 'Travel', v: TRAVEL[tr.model] ?? '—' },
    tr.flat_take_home_paise && { k: 'Outstation fee', v: rupees(gross(tr.flat_take_home_paise)) },
    tr.per_km_take_home_paise && { k: 'Per km', v: rupees(gross(tr.per_km_take_home_paise)) },
    br.waiting && { k: 'Waiting time', v: `${br.waiting.free_minutes} min free, then ${rupees(gross(br.waiting.fee_take_home_paise))} / 30 min` },
    br.surcharge && { k: 'Late-night / holiday', v: `+${br.surcharge.pct}% after ${br.surcharge.after}${br.surcharge.holidays ? ', and on holidays' : ''}` },
  ].filter(Boolean)

  return {
    status: v.status === 'REJECTED' ? 'ACTION_REQUIRED' : v.status,
    version: v.version, published_at: d.live?.published_at, price_locked_until: d.live?.price_locked_until,
    editable: !d.live, now: new Date().toISOString(),
    instant_ready: d.readiness?.state === 'READY_FOR_INSTANT_BOOKING',
    instant_missing: items.filter(i => i.status !== 'pass').length,
    payout_status: items.find(i => i.id === 'payout')?.status === 'pass' ? 'active' : 'pending',
    seasonal: d.window && d.live ? { name: d.window.name, deadline: d.window.closes_at } : null,
    packages,
    listing: {
      initials: (prof.stage_name ?? '?').slice(0, 2).toUpperCase(), stage_name: prof.stage_name,
      role: prof.role === 'other' ? prof.role_other : ROLE[prof.role] ?? 'Anchor & MC', years: prof.years, tagline: prof.tagline ?? '',
      city: [loc.locality, loc.city].filter(Boolean).join(', ') || '—',
      travel: tr.scope ? (/^\d+$/.test(tr.scope) ? `up to ${tr.scope} km` : tr.scope) : '—',
      languages: (prof.languages ?? []).map(l => `${l.name} (${l.level})`).join(' · '),
      audience: prof.max_audience ? Number(prof.max_audience).toLocaleString('en-IN') : '—',
      formats: (prof.formats ?? []).join(', '),
      events: (prof.events ?? []).map(e => EVENT_LABEL[e] ?? e),
    },
    models: d.rules.map(r => ({
      id: r.model, customer_paise: r.customer_paise, unit: MODEL_UNIT[r.model] ?? '',
      rules: [r.included_hours && `${r.included_hours} hrs included`, r.min_hours && `min ${r.min_hours} hrs`, r.max_hours && `max ${r.max_hours} hrs`,
        r.included_sessions && `${r.included_sessions} function${r.included_sessions > 1 ? 's' : ''}`,
        r.multi_day?.max_days && `up to ${r.multi_day.max_days} days`].filter(Boolean).join(' · ') || 'Fixed price',
    })),
    addons: d.addons.map(a => ({ name: a.label, paise: a.customer_paise, unit: UNIT_LABEL[a.unit] ?? '', in: (a.included_in ?? []).map(title) })),
    charges,
    rules: [
      { k: 'Instant booking', v: br.instant === false ? 'Off' : 'On' },
      { k: 'Custom quotes', v: br.custom_quotes === false ? 'Off' : `On · reply within ${br.quote_hours ?? '—'} hrs` },
      { k: 'Advance', v: br.advance_pct ? `${br.advance_pct}% at booking` : '—' },
      { k: 'Cancellation', v: CANCELLATION_V3.find(c => c.id === br.cancellation) ? `${CANCELLATION_V3.find(c => c.id === br.cancellation).title} · ${CANCELLATION_V3.find(c => c.id === br.cancellation).body}` : '—' },
      { k: 'Minimum notice', v: br.min_notice_days != null ? `${br.min_notice_days} days` : '—' },
    ],
  }
}


