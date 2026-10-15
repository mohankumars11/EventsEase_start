/**
 * The Pricing tab.
 *
 * Listings whose trade has a pricing profile (Anchor & MC) get the Pricing
 * Control Center, read from their published listing version. Every other
 * trade keeps SambramoPricingStudio until it is ported, so nothing that
 * works today changes for them.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Sparkles, ArrowRight, CircleAlert, Hourglass, CircleHelp, CheckCircle2, ChevronRight, X, ArrowLeft, MapPin, Package, CalendarClock, SlidersHorizontal, IndianRupee, Eye, Pencil } from 'lucide-react'
import PricingControlCenter, { SeasonalUpdate } from './PricingControlCenter'
import TradePricing from './TradePricing'
import { useEngineReady, onEngine } from '../../../lib/tradeEngine'
import SambramoPricingStudio from '../SambramoPricingStudio'
import AnchorCustomerPreviewScreen from './AnchorCustomerPreviewScreen'
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

export default function PricingTab({ vendor, services = [], onOpenListings, onEditListing, onOpenPayout, openReviewListing = false, onReviewListingHandled }) {
  const [helpOpen, setHelpOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [legacyScreen, setLegacyScreen] = useState('details')
  const [legacySelectedPackage, setLegacySelectedPackage] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [priceWindowOpen, setPriceWindowOpen] = useState(false)
  const reviewNavigationHandled = useRef(false)
  const [listingMeta, setListingMeta = useState({ byId: {}, versionById: {}, publishedAtById: {}, packagesById: {}, priceById: {}, priceUnitById: {}, packageDetailsById: {}, priceLockById: {}, nextPriceDate: null, nextPriceServiceId: null, loading: true })
  const engineReady = useEngineReady()
  const anchors = services.filter(s => hasProfileFor(s.category))
  const engine = engineReady ? services.filter(s => onEngine(s.category)) : []
  const others = services.filter(s => !hasProfileFor(s.category) && !engine.includes(s))
  const selectedService = services.find(s => s.id === selectedServiceId) ?? null

  useEffect(() => {
    let alive = true
    const ids = services.map(s => s.id).filter(Boolean)
    if (!ids.length) {
      setListingMeta({ byId: {}, versionById: {}, publishedAtById: {}, packagesById: {}, priceById: {}, priceUnitById: {}, packageDetailsById: {}, priceLockById: {}, nextPriceDate: null, nextPriceServiceId: null, loading: false })
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
      const versionById = {}
      const publishedAtById = {}
      for (const id of ids) {
        const regular = versions.filter(v => v.vendor_service_id === id && !v.seasonal_window_id)
        const latest = regular[0] ?? null
        const ownPackages = [...packages.filter(p => p.vendor_service_id === id), ...catering.filter(p => p.vendor_service_id === id)]
        const fallback = ownPackages.some(p => ['LIVE', 'ACTIVE'].includes(String(p.status).toUpperCase())) ? 'LIVE'
          : ownPackages.some(p => ['UNDER_REVIEW', 'ACTION_REQUIRED', 'REJECTED'].includes(String(p.status).toUpperCase())) ? 'UNDER_REVIEW'
          : ownPackages.length ? 'DRAFT' : 'NOT_CONFIGURED'
        byId[id] = latest?.status ?? fallback
        versionById[id] = latest?.version ?? null
        publishedAtById[id] = versions.find(v => v.vendor_service_id === id && v.status === 'LIVE' && !v.seasonal_window_id)?.published_at ?? null
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
      setListingMeta({ byId, versionById, publishedAtById, packagesById, priceById, priceUnitById, packageDetailsById, priceLockById, nextPriceDate: futureLocks[0]?.date ?? null, nextPriceServiceId: futureLocks[0]?.serviceId ?? null, loading: false })
    }).catch(() => {
      if (alive) setListingMeta(s => ({ ...s, loading: false }))
    })
    return () => { alive = false }
  }, [services])

  // A tap on the Jobs review card must open the actual trade detail, not
  // the account-level Services screen. Status comes from the same version
  // and package rows shown in this tab, so we never guess a random service.
  useEffect(() => {
    if (!openReviewListing) {
      reviewNavigationHandled.current = false
      return
    }
    if (reviewNavigationHandled.current || listingMeta.loading) return

    const reviewStates = new Set([
      'UNDER_REVIEW', 'IN_REVIEW', 'PENDING_REVIEW', 'REVIEW_PENDING',
      'SUBMITTED', 'SUBMITTED_FOR_REVIEW',
    ])
    const target = services.find(service => {
      const statuses = [
        listingMeta.byId[service.id],
        service.review_status,
        service.approval_status,
        service.status,
      ].map(value => String(value ?? '').trim().toUpperCase().replace(/[\\s-]+/g, '_'))
      return statuses.some(value => reviewStates.has(value))
    })

    reviewNavigationHandled.current = true
    setFilterStatus('review')
    setLegacyScreen('details')
    if (target?.id) setSelectedServiceId(target.id)
    else setSelectedServiceId(null)
    onReviewListingHandled?.()
  }, [openReviewListing, listingMeta.loading, listingMeta.byId, services, onReviewListingHandled])

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
    <div className="space-y-3 pb-5 pt-1">
      {!selectedService ? (
        <>
          <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-plum-800 via-plum-700 to-[#321067] px-4 pb-4 pt-4 text-white sm:px-5">
            <div className="pointer-events-none absolute -right-12 -top-10 h-44 w-44 rounded-full border border-white/10 bg-white/[0.04]" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[clamp(1.55rem,6vw,1.85rem)] font-extrabold leading-tight tracking-tight">Pricing & Listings</h1>
                <p className="mt-1 text-[14px] font-medium text-white/80">Manage your services, packages and rates.</p>
              </div>
              <button type="button" onClick={() => setHelpOpen(true)} aria-label="Pricing help and setup guidance" title="Pricing help"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-sm backdrop-blur transition hover:bg-white/15 active:scale-95">
                <CircleHelp size={21} />
              </button>
            </div>
            <div className="relative mt-4 grid grid-cols-4 gap-1 rounded-[22px] bg-white p-2 text-plum-950 shadow-[0_12px_30px_rgba(20,0,50,0.18)]">
              <StatusMetric label="Live" count={counts.live} glyph="✓" tone="text-emerald-700 bg-emerald-50" active={filterStatus === 'live'} onClick={() => setFilterStatus('live')} />
              <StatusMetric label="In review" count={counts.review} glyph="◷" tone="text-amber-700 bg-amber-50" active={filterStatus === 'review'} onClick={() => setFilterStatus('review')} />
              <StatusMetric label="Drafts" count={counts.draft} glyph="▤" tone="text-violet-700 bg-violet-50" active={filterStatus === 'draft'} onClick={() => setFilterStatus('draft')} />
              <StatusMetric label="Total" count={services.length} glyph="▥" tone="text-slate-700 bg-slate-100" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
            </div>
          </section>

          <button type="button" onClick={() => {
            if (listingMeta.nextPriceServiceId) setSelectedServiceId(listingMeta.nextPriceServiceId)
            else setPriceWindowOpen(true)
          }} aria-haspopup="dialog" aria-label="Price update window details"
            className="flex w-full items-center gap-2.5 rounded-[18px] bg-gradient-to-r from-plum-50 via-white to-violet-50 px-3 py-2.5 text-left ring-1 ring-plum-100 transition active:scale-[0.995]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-plum-700"><CalendarClock size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-extrabold text-plum-950">Price update window</span>
              <span className="mt-0.5 block text-[12.5px] font-extrabold leading-snug text-plum-800">{listingMeta.nextPriceDate ? `Next eligible price change in ${daysUntil(listingMeta.nextPriceDate)} day${daysUntil(listingMeta.nextPriceDate) === 1 ? '' : 's'}` : 'Price-update dates appear here after a listing is published'}</span>
              <span className="mt-0.5 block text-[10.5px] leading-snug text-ink/55">Regular prices follow the 15-day policy. Approved seasonal windows appear here when available.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-plum-700" />
          </button>

          <div className="flex items-center justify-between gap-3 px-1">
            <div className="min-w-0">
              <h2 className="text-[22px] font-extrabold tracking-tight text-plum-950">Your listings</h2>
              <p className="text-[12px] leading-snug text-ink/55">{services.length} services · live status from saved listing data</p>
            </div>
            <button type="button" onClick={() => setManageOpen(true)} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-plum-200 bg-white px-3 text-[12.5px] font-extrabold text-plum-700 shadow-sm">
              <SlidersHorizontal size={15} /> Manage
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              ['all', `All · ${services.length}`],
              ['live', `Live · ${counts.live}`],
              ['review', `In review · ${counts.review}`],
              ['draft', `Draft · ${counts.draft}`],
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setFilterStatus(key)}
                className={`min-h-10 shrink-0 rounded-full px-4 py-2.5 text-[12px] font-extrabold leading-none ring-1 transition ${filterStatus === key ? 'bg-plum-700 text-white ring-plum-700' : 'bg-white text-ink/65 ring-ink/[0.09]'}`}>
                {label}
              </button>
            ))}
          </div>

          {services.length ? (
            <div className="space-y-3">
              {services.filter(service => filterStatus === 'all' || statusGroup(listingMeta.byId[service.id] ?? 'NOT_CONFIGURED') === filterStatus).length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-plum-200 bg-white px-4 py-6 text-center">
                  <p className="text-[15px] font-extrabold text-plum-950">No {filterStatus === 'review' ? 'listings in review' : filterStatus === 'live' ? 'live listings' : 'draft listings'} yet</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink/60">This count updates automatically when your listing status changes.</p>
                  <button type="button" onClick={() => setFilterStatus('all')} className="mt-3 rounded-full bg-plum-700 px-4 py-2.5 text-[12px] font-extrabold text-white">Show all listings</button>
                </div>
              ) : services.filter(service => filterStatus === 'all' || statusGroup(listingMeta.byId[service.id] ?? 'NOT_CONFIGURED') === filterStatus).map(service => {
                const status = listingMeta.byId[service.id] ?? 'NOT_CONFIGURED'
                const look = statusCopy[status] ?? statusCopy.NOT_CONFIGURED
                const packCount = listingMeta.packagesById[service.id] ?? 0
                const configName = service.category || service.trade || 'Service'
                return (
                  <button key={service.id} type="button" onClick={() => { setSelectedServiceId(service.id); setLegacyScreen('details') }}
                    className="group flex w-full items-center gap-3 rounded-[22px] bg-white p-3 text-left ring-1 ring-ink/[0.07] shadow-[0_6px_22px_rgba(30,15,55,0.04)] transition active:scale-[0.995]">
                    <span className="flex w-[82px] shrink-0 flex-col items-center gap-1.5">
                      <span className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[19px] bg-gradient-to-br from-plum-50 to-violet-100 ring-1 ring-plum-100">
                        <SambramoTradePictogram trade={configName} size="sm" showSparkle={false} title={false} />
                      </span>
                      <span className="max-w-full text-center text-[10.5px] font-bold leading-tight text-ink/70">{configName}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15.5px] font-extrabold leading-tight text-plum-950">{service.name || configName}</span>
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
              version={listingMeta.versionById[selectedService.id] ?? null}
              publishedAt={listingMeta.publishedAtById[selectedService.id] ?? null}
              packages={listingMeta.packageDetailsById[selectedService.id] ?? []}
              onPreview={() => setLegacyScreen('preview')}
              onEdit={() => setLegacyScreen('edit')}
              onViewPackage={setLegacySelectedPackage}
            />
          ) : (
            <SambramoPricingStudio vendor={vendor} services={[selectedService]} initialServiceId={selectedService.id}
              startPreview={legacyScreen === 'preview'}
              priceLockedUntil={listingMeta.priceLockById[selectedService.id] ?? null}
              onOpenListings={onOpenListings} onReturnToPricing={() => setLegacyScreen('details')} />
          )}
        </>
      )}

      <Sheet open={!!legacySelectedPackage} onOpenChange={open => !open && setLegacySelectedPackage(null)} title={legacySelectedPackage?.name || 'Package details'}>
        {legacySelectedPackage ? (
          <div className="space-y-3">
            <div className="rounded-[22px] bg-gradient-to-br from-plum-50 to-white p-4 ring-1 ring-plum-100">
              <p className="text-[25px] font-extrabold tracking-tight text-plum-950">{Number(legacySelectedPackage.rate_paise ?? legacySelectedPackage.take_home_paise) > 0 ? rupees(legacySelectedPackage.rate_paise ?? legacySelectedPackage.take_home_paise) : 'Price on request'}</p>
              <p className="mt-1 text-[11.5px] font-bold text-ink/55">Your rate</p>
              {legacySelectedPackage.hours ? <p className="mt-2 text-[12px] font-bold text-ink/55">{legacySelectedPackage.hours} hours included</p> : null}
              {legacySelectedPackage.description ? <p className="mt-2 text-[12.5px] leading-relaxed text-ink/70">{legacySelectedPackage.description}</p> : null}
            </div>
            {(legacySelectedPackage.inclusions || []).length ? (
              <><p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Included in this package</p>
                {legacySelectedPackage.inclusions.map((item,index) => <p key={index} className="flex items-start gap-2 text-[12.5px] font-semibold text-ink/75"><span className="text-emerald-700">✓</span><span>{item}</span></p>)}</>
            ) : <p className="text-[12.5px] text-ink/55">No inclusions were saved for this package.</p>}
          </div>
        ) : null}
      </Sheet>

      {priceWindowOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="price-window-title">
          <button type="button" aria-label="Close price update details" onClick={() => setPriceWindowOpen(false)} className="absolute inset-0 cursor-default" />
          <section className="relative w-full max-w-lg rounded-t-[28px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px]">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-plum-700"><CalendarClock size={22} /></span>
              <div className="min-w-0 flex-1">
                <h2 id="price-window-title" className="text-[18px] font-extrabold text-plum-950">Price update access</h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink/65">Your price update window becomes available after a listing is published and live. Until then, you can review or edit the listing and its packages.</p>
              </div>
              <button type="button" onClick={() => setPriceWindowOpen(false)} aria-label="Close price update details" className="rounded-full p-2 text-ink/60 hover:bg-plum-50"><X size={19} /></button>
            </div>
            <div className="mt-4 rounded-2xl bg-plum-50 p-3.5">
              <p className="text-[13px] font-extrabold text-plum-950">{counts.live > 0 ? 'Your live listings follow the 15-day pricing policy.' : 'Your listings are not live yet.'}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink/65">{counts.live > 0 ? 'The next eligible update date will appear here when it is available. Approved seasonal price windows will also be shown here.' : 'Once Sambramo approves and publishes a listing, this card will show when regular price updates are eligible. Approved seasonal windows will appear here too.'}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setPriceWindowOpen(false); setFilterStatus('all') }} className="min-h-11 rounded-full border border-plum-200 px-3 text-[12px] font-extrabold text-plum-700">View listings</button>
              <button type="button" onClick={() => { setPriceWindowOpen(false); onOpenListings?.() }} className="min-h-11 rounded-full bg-plum-700 px-3 text-[12px] font-extrabold text-white">Edit listing</button>
            </div>
          </section>
        </div>
      )}

      {manageOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="manage-pricing-title">
          <button type="button" aria-label="Close manage listings" onClick={() => setManageOpen(false)} className="absolute inset-0 cursor-default" />
          <section className="relative max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Listing controls</p>
                <h2 id="manage-pricing-title" className="mt-1 text-[20px] font-extrabold text-plum-950">Manage your listings</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-ink/60">Choose a service to review prices or edit its saved listing. You’ll stay in the right workflow.</p>
              </div>
              <button type="button" onClick={() => setManageOpen(false)} aria-label="Close manage listings" className="rounded-full p-2 text-ink/60 hover:bg-plum-50"><X size={20} /></button>
            </div>
            <div className="mt-4 space-y-2">
              {services.map(service => {
                const status = listingMeta.byId[service.id] ?? 'NOT_CONFIGURED'
                const look = statusCopy[status] ?? statusCopy.NOT_CONFIGURED
                return <div key={service.id} className="rounded-2xl border border-ink/[0.08] p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-plum-50 text-plum-700"><SambramoTradePictogram trade={service.category || service.trade || 'Service'} size="xs" showSparkle={false} title={false} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-extrabold text-plum-950">{service.name || service.category || 'Service listing'}</p>
                      <p className="mt-0.5 text-[11px] text-ink/55">{listingMeta.packagesById[service.id] ?? 0} packages · {listingMeta.priceById[service.id] ? `from ${rupees(listingMeta.priceById[service.id])}` : 'price not set'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold ring-1 ${look.tone}`}>{look.label}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { setSelectedServiceId(service.id); setLegacyScreen('details'); setManageOpen(false) }} className="flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-plum-200 bg-white px-3 text-[11.5px] font-extrabold text-plum-700"><Eye size={14} /> Pricing details</button>
                    <button type="button" onClick={() => { setManageOpen(false); onEditListing?.(service) }} className="flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-plum-700 px-3 text-[11.5px] font-extrabold text-white"><Pencil size={14} /> Edit listing</button>
                  </div>
                </div>
              })}
            </div>
            <button type="button" onClick={() => { setManageOpen(false); onOpenListings?.() }} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-800 to-plum-600 px-4 text-[12.5px] font-extrabold text-white">Open full listing manager <ArrowRight size={15} /></button>
          </section>
        </div>
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
  version, publishedAt, packages = [], onPreview, onEdit, onViewPackage,
}) {
  const specs = service?.specs && typeof service.specs === 'object' ? service.specs : {}
  const profile = specs.trade_v1 ?? specs.trade_inputs ?? specs.profile ?? specs
  const booking = profile.booking_rules && typeof profile.booking_rules === 'object' ? profile.booking_rules : profile.terms && typeof profile.terms === 'object' ? profile.terms : profile
  const travel = profile.travel_rules && typeof profile.travel_rules === 'object' ? profile.travel_rules : {}
  const asList = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(Boolean) : []
  const valueText = value => typeof value === 'string' || typeof value === 'number' ? String(value) : value?.label ?? value?.name ?? value?.value ?? value?.id ?? ''
  const humanize = value => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
  const numberPositive = value => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null
  const displayName = profile.stage_name || profile.display_name || profile.business_name || profile.name || vendor?.business_name || vendor?.name || service?.name || service?.category || 'Your listing'
  const city = [profile.locality, profile.city, service?.city, service?.location, vendor?.area, vendor?.city, vendor?.state].filter(Boolean).map(valueText).filter(Boolean).filter((value, index, rows) => rows.indexOf(value) === index).join(', ')
  const languages = asList(profile.languages ?? profile.language).map(valueText).filter(Boolean)
  const events = asList(profile.events ?? profile.event_types ?? profile.supported_events ?? profile.service_types ?? profile.specialties).map(valueText).filter(Boolean)
  const formats = asList(profile.formats ?? profile.service_formats ?? profile.work_modes).map(valueText).filter(Boolean)
  const years = profile.years ?? profile.years_experience ?? profile.years_active
  const audience = profile.max_audience ?? profile.max_guests ?? profile.capacity ?? profile.guest_capacity
  const statusForUi = status === 'REJECTED' ? 'ACTION_REQUIRED' : status === 'NOT_CONFIGURED' ? 'DRAFT' : status

  const visiblePackages = packages.filter(pkg => String(pkg.status || '').toUpperCase() !== 'ARCHIVED').map((pkg, index) => {
    const rate = numberPositive(pkg.ratePaise ?? pkg.pricePaise ?? pkg.rate_paise ?? pkg.take_home_paise)
    const duration = numberPositive(pkg.duration ?? pkg.hours ?? pkg.duration_hours ?? pkg.serviceHours)
    const inclusions = asList(pkg.inclusions).map(valueText).filter(Boolean)
    const bandPrices = asList(pkg.rateBands).map(band => numberPositive(band?.rate_paise) || (numberPositive(band?.rate) ? Math.round(Number(band.rate) * 100) : null)).filter(Boolean)
    const price = rate || (bandPrices.length ? Math.min(...bandPrices) : null)
    return {
      key: pkg.id || pkg.name || String(index),
      tier: pkg.name || pkg.tier || String(index),
      name: pkg.name || pkg.title || 'Package',
      status: pkg.status || statusForUi,
      rate_paise: price,
      take_home_paise: price,
      price_paise: null,
      hours: duration,
      sessions: numberPositive(pkg.sessions ?? pkg.included_sessions),
      inclusions,
      description: pkg.description || pkg.notes || '',
      base: pkg.description || (duration ? String(duration) + ' included' : pkg.name || 'Core service'),
    }
  })

  const rawModels = profile.pricing_models ?? profile.pricingModels ?? profile.models ?? profile.rates ?? profile.rules ?? specs.pricing_models ?? specs.pricingModels ?? null
  let modelEntries = []
  if (Array.isArray(rawModels)) modelEntries = rawModels.map((model, index) => [model.model || model.id || model.key || model.name || ('model_' + index), model])
  else if (rawModels && typeof rawModels === 'object') modelEntries = Object.entries(rawModels)
  const models = modelEntries.filter(([, model]) => model && model.on !== false && model.enabled !== false).map(([key, model]) => {
    const source = model && typeof model === 'object' ? model : { rate: model }
    const label = source.label || source.name || humanize(key)
    let rate = numberPositive(source.customer_paise ?? source.rate_paise ?? source.take_home_paise ?? source.amount_paise)
    if (!rate && numberPositive(source.rate ?? source.amount ?? source.price)) rate = Math.round(Number(source.rate ?? source.amount ?? source.price) * 100)
    const includedHours = numberPositive(source.included_hours ?? source.included_duration_hours)
    const minHours = numberPositive(source.min_hours)
    const maxHours = numberPositive(source.max_hours)
    const rules = [
      includedHours ? String(includedHours) + ' hrs included' : null,
      minHours ? 'min ' + minHours + ' hrs' : null,
      maxHours ? 'max ' + maxHours + ' hrs' : null,
      source.minimum_quantity ? 'minimum ' + source.minimum_quantity + ' ' + humanize(source.unit || '') : null,
    ].filter(Boolean).join(' · ')
    return { id: key, label, customer_paise: rate, unit: source.unit ? '/' + humanize(source.unit).replace(/^Per /, '') : '', rules }
  })
  if (!models.length && !visiblePackages.length && numberPositive(startingPricePaise)) {
    models.push({ id: 'base_rate', label: priceUnit ? 'Base rate · ' + humanize(priceUnit) : 'Base rate', customer_paise: numberPositive(startingPricePaise), unit: '', rules: 'Saved base rate' })
  }

  const rawAddons = profile.addons ?? profile.extras ?? profile.extra_services ?? profile.optional_extras ?? specs.addons ?? []
  const addons = asList(rawAddons).map((addon, index) => {
    const item = addon && typeof addon === 'object' ? addon : { name: addon }
    let paise = numberPositive(item.take_home_paise ?? item.rate_paise ?? item.customer_paise)
    if (!paise && numberPositive(item.rate ?? item.price ?? item.amount)) paise = Math.round(Number(item.rate ?? item.price ?? item.amount) * 100)
    return {
      id: item.id || item.addon_id || item.name || String(index),
      name: item.label || item.name || item.title || 'Optional extra',
      paise,
      unit: humanize(item.unit || item.pricing_unit || 'per event'),
      in: asList(item.included_in ?? item.includedIn).map(humanize),
    }
  })

  const charges = []
  for (const item of asList(profile.charges ?? profile.booking_charges ?? booking.charges)) {
    if (item && typeof item === 'object') {
      const rate = numberPositive(item.take_home_paise ?? item.rate_paise ?? item.customer_paise)
      const value = rate ? '₹' + Math.round(rate / 100).toLocaleString('en-IN') : valueText(item.value ?? item.description ?? item.amount)
      if (item.label || item.name) charges.push({ k: item.label || item.name, v: value || 'As listed' })
    }
  }
  const travelModel = travel.model || travel.scope || travel.policy || profile.travel_policy || profile.service_area || profile.travel_radius_km
  const travelLabels = { included_radius: 'Included within your area', included: 'Included within your area', flat: 'Flat outstation fee', per_km: 'Per km beyond your area', customer_arranged: 'Customer arranges travel and stay', custom: 'Custom quote' }
  if (travelModel) charges.push({ k: 'Travel', v: travelLabels[travelModel] || humanize(travelModel) })
  const flatTravel = numberPositive(travel.flat_take_home_paise ?? profile.travel_fee_paise)
  if (flatTravel) charges.push({ k: 'Travel fee', v: '₹' + Math.round(flatTravel / 100).toLocaleString('en-IN') })

  const rules = []
  const addRule = (label, value) => { if (value !== undefined && value !== null && value !== '') rules.push({ k: label, v: value }) }
  const instant = booking.availability_policy ?? booking.instant ?? booking.instant_booking ?? profile.availability_policy ?? profile.booking_mode
  if (instant !== undefined && instant !== null && instant !== '') addRule('Instant booking', ['instant', 'true', 'on'].includes(String(instant).toLowerCase()) || instant === true ? 'On' : 'Off')
  if (booking.custom_quotes !== undefined && booking.custom_quotes !== null) addRule('Custom quotes', booking.custom_quotes === false ? 'Off' : 'On')
  if (booking.advance_pct != null || booking.advance_percent != null) addRule('Advance payment', String(booking.advance_pct ?? booking.advance_percent) + '% at booking')
  const payment = booking.payment_policy ?? booking.payment_terms ?? profile.payment_policy ?? profile.payment_terms
  if (payment) addRule('Payment terms', humanize(payment))
  const notice = booking.min_notice_days ?? booking.lead_time_days ?? profile.min_notice_days ?? profile.lead_time_days
  if (notice != null && notice !== '') addRule('Minimum notice', String(notice) + ' day' + (Number(notice) === 1 ? '' : 's'))
  const cancellation = booking.cancellation_policy ?? booking.cancellation ?? profile.cancellation_policy ?? profile.cancellation
  if (cancellation) addRule('Cancellation', humanize(cancellation))
  const reschedule = booking.reschedule_policy ?? booking.rescheduling_policy ?? profile.reschedule_policy
  if (reschedule) addRule('Rescheduling', humanize(reschedule))
  if (booking.quote_hours) addRule('Quote response time', String(booking.quote_hours) + ' hours')
  if (profile.minimum_order != null) addRule('Minimum order', String(profile.minimum_order))

  const statusBanner = ['ACTION_REQUIRED', 'REJECTED'].includes(String(status || '').toUpperCase()) ? (
    <div className="flex gap-2.5 rounded-[20px] bg-rose-50 p-4 ring-1 ring-rose-200">
      <span className="text-[16px] text-rose-700">!</span>
      <div><p className="text-[13.5px] font-extrabold text-rose-900">Sambramo asked for changes</p><p className="mt-0.5 text-[12.5px] text-rose-900/80">{profile.review_note || service?.review_note || 'Open your listing to see what needs updating.'}</p></div>
    </div>
  ) : null

  const controlData = {
    status: statusForUi,
    version: version ?? null,
    published_at: publishedAt ?? null,
    price_locked_until: priceLockedUntil || null,
    now: new Date().toISOString(),
    editable: false,
    seasonal: null,
    packages: visiblePackages,
    listing: {
      initials: String(displayName || 'S').slice(0, 2).toUpperCase(),
      stage_name: displayName,
      role: profile.role ? humanize(profile.role) : (service?.category || service?.trade || 'Service'),
      years,
      tagline: profile.tagline || profile.bio || profile.description || '',
      city,
      travel: travelModel ? (String(travelModel).match(/^\d+$/) ? 'up to ' + travelModel + ' km' : travelLabels[travelModel] || humanize(travelModel)) : '',
      languages: languages.join(' · '),
      audience: audience != null && audience !== '' ? (Number.isFinite(Number(audience)) ? Number(audience).toLocaleString('en-IN') : String(audience)) : '',
      formats: formats.join(', '),
      events,
    },
    models,
    addons,
    charges,
    rules,
  }
  return (
    <div className="space-y-3 pb-5">
      <PricingControlCenter
        data={controlData}
        banner={statusBanner}
        onEdit={() => onEdit?.()}
        onPreview={onPreview}
        onViewPackage={key => {
          const pkg = visiblePackages.find(item => String(item.tier) === String(key) || String(item.name) === String(key))
          setLegacySelectedPackage(pkg || null)
          onViewPackage?.(pkg || null)
        }}
      />
    </div>
  )
}


function StatusMetric({ label, count, glyph, tone, active, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] border px-0.5 py-2 text-center transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-500 ${active ? 'border-plum-300 bg-plum-50 shadow-inner' : 'border-plum-100 bg-gradient-to-b from-white to-plum-50 shadow-[0_2px_8px_rgba(35,12,64,0.06)]'}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-black ${tone}`}>{glyph}</span>
      <span className="block w-full truncate text-[10px] font-black uppercase tracking-[0.02em] text-plum-800">{label}</span>
      <span className="block text-[27px] font-black leading-none tabular-nums text-[#211035]">{count}</span>
    </button>
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

      {sheet === 'preview' && (
        <AnchorCustomerPreviewScreen
          vendor={vendor}
          profile={d.current.profile}
          city={view.listing.city}
          rating={vendor?.rating_avg}
          reviewCount={vendor?.review_count ?? 0}
          verified={vendor?.is_verified === true}
          packages={view.packages.map(p => ({ tier: p.tier, name: p.name, hours: p.hours, customer_paise: p.price_paise, inclusions: p.inclusions }))}
          pricingModels={view.models.map(m => ({ name: MODEL_LABEL[m.id] ?? m.id, rules: m.rules, price: `${rupees(m.customer_paise)} ${m.unit}` }))}
          extras={view.addons.map(a => ({ name: a.name, price: `${rupees(a.paise)} ${a.unit}` }))}
          bookingDetails={[
            ...view.charges.map(c => ({ label: c.k, value: c.v })),
            ...view.rules.map(c => ({ label: c.k, value: c.v })),
          ]}
          isLive={d.current?.status === 'LIVE'}
          instantBookEnabled={d.current.booking_rules?.instant !== false && d.current.booking_rules?.instant !== 'false'}
          onClose={() => setSheet(null)}
          onPick={picked => setSheet({ tier: picked.tier })}
        />
      )}

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
  const asArray = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(Boolean) : []
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
        inclusions: (Array.isArray(p.commercial_inputs?.inclusions) ? p.commercial_inputs.inclusions : typeof p.commercial_inputs?.inclusions === 'string' ? p.commercial_inputs.inclusions.split(',').map(x => x.trim()).filter(Boolean) : []).map(label),
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
      languages: asArray(prof.languages).map(l => typeof l === 'string' ? l : [l?.name, l?.level ? `(${l.level})` : ''].filter(Boolean).join(' ')).filter(Boolean).join(' · '),
      audience: prof.max_audience ? Number(prof.max_audience).toLocaleString('en-IN') : '—',
      formats: asArray(prof.formats).map(x => typeof x === 'string' ? x : x?.label ?? x?.name ?? x?.id).filter(Boolean).join(', '),
      events: asArray(prof.events).map(e => typeof e === 'string' ? EVENT_LABEL[e] ?? e : EVENT_LABEL[e?.id] ?? e?.label ?? e?.name ?? e?.id).filter(Boolean),
    },
    models: d.rules.map(r => ({
      id: r.model, customer_paise: r.customer_paise, unit: MODEL_UNIT[r.model] ?? '',
      rules: [r.included_hours && `${r.included_hours} hrs included`, r.min_hours && `min ${r.min_hours} hrs`, r.max_hours && `max ${r.max_hours} hrs`,
        r.included_sessions && `${r.included_sessions} function${r.included_sessions > 1 ? 's' : ''}`,
        r.multi_day?.max_days && `up to ${r.multi_day.max_days} days`].filter(Boolean).join(' · ') || 'Fixed price',
    })),
    addons: d.addons.map(a => ({ name: a.label, paise: a.customer_paise, unit: UNIT_LABEL[a.unit] ?? '', in: (Array.isArray(a.included_in) ? a.included_in : typeof a.included_in === 'string' ? a.included_in.split(',').map(x => x.trim()).filter(Boolean) : []).map(title) })),
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


