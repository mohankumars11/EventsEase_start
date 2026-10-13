import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Heart, Share2, ShieldCheck, Loader2, CircleAlert } from 'lucide-react'
import TradeListingCard from '../../customer/TradeListingCard'
import PartnerAvatarInput from '../PartnerAvatarInput'
import { fetchWork, signedUrlsFor } from '../../../lib/partnerWork'

const EMPTY_MEDIA = []
const safeNumber = value => {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}
const rupeesToPaise = value => safeNumber(value) == null ? null : Math.round(Number(value) * 100)
const valueLabel = value => typeof value === 'string' || typeof value === 'number' ? String(value) : value?.label ?? value?.name ?? value?.value ?? value?.id ?? ''
const toList = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map(x => x.trim()).filter(Boolean) : []

function packageRatePaise(pkg) {
  const paise = pkg?.customer_paise ?? pkg?.customer_price_paise ?? pkg?.public_price_paise ??
    pkg?.price?.customer_paise ?? pkg?.price?.customer_price_paise ??
    pkg?.calculation_snapshot?.customer_paise ?? pkg?.commercial_inputs?.customer_paise ??
    pkg?.trade_inputs?.customer_paise
  if (paise != null && Number(paise) > 0) return Math.round(Number(paise))
  const rupees = pkg?.customer_price ?? pkg?.public_price ?? pkg?.customer_rate
  if (rupees != null && rupees !== '') return rupeesToPaise(rupees)
  return null
}

function cleanDetails(fields, values) {
  const details = []
  for (const field of Array.isArray(fields) ? fields : []) {
    const key = field.key ?? field.id ?? field.field
    const label = field.label ?? field.name ?? key
    if (!key || !label || field.customer_visible === false || field.private === true) continue
    if (/(aadhaar|aadhar|pan number|bank|account number|password|private|internal|take.?home|platform fee|commission|payout|review note|license number|licence number|government id|otp)/i.test(String(label)) continue
    const raw = values?.[key] ?? values?.[String(key).replace(/-/g, '_')]
    if (raw == null || raw === '' || (Array.isArray(raw) && !raw.length)) continue
    if (field.type === 'file' || field.type === 'document' || typeof raw === 'object' && !Array.isArray(raw)) continue
    const value = Array.isArray(raw) ? raw.map(valueLabel).filter(Boolean).join(', ') : valueLabel(raw)
    if (value) details.push({ key, label, value })
  }
  return details
}

function normalizedTerms(draft = {}, service = {}) {
  const input = draft.trade_inputs ?? {}
  const commercial = draft.commercial_inputs ?? {}
  const source = service?.specs?.trade_v1 ?? service?.specs?.catering_v1 ?? service?.specs?.profile ?? {}
  const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '')
  const terms = {
    instant: first(draft.availability_policy, commercial.availability_policy, input.availability_policy, source.availability_policy),
    advance_pct: first(draft.advance_pct, commercial.advance_pct, input.advance_pct, source.advance_pct),
    advance_percent: first(draft.advance_percent, commercial.advance_percent, input.advance_percent, source.advance_percent),
    payment_policy: first(draft.payment_policy, commercial.payment_policy, input.payment_policy, source.payment_policy),
    min_notice_days: first(draft.min_notice_days, draft.lead_time, input.min_notice_days, input.lead_time_days, source.min_notice_days, service.lead_time_days),
    cancellation: first(draft.cancellation_policy, commercial.cancellation_policy, input.cancellation_policy, source.cancellation_policy, source.cancellation),
    cancellation_details: first(draft.cancellation_details, input.cancellation_details, source.cancellation_details),
    reschedule_policy: first(draft.reschedule_policy, input.reschedule_policy, source.reschedule_policy),
    travel_policy: first(draft.travel_policy, input.travel_policy, source.travel_policy),
    charges: [],
  }
  const addCharge = (label, value, unit) => {
    const paise = rupeesToPaise(value)
    if (paise) terms.charges.push({ label, customer_paise: paise, unit })
  }
  addCharge('Additional unit', draft.additional_unit_rate, draft.pricing_unit)
  addCharge('Additional duration', draft.additional_duration_rate, 'time unit')
  addCharge('Setup fee', draft.setup_fee, 'one-time')
  addCharge('Teardown fee', draft.teardown_fee, 'one-time')
  addCharge('Travel fee', draft.travel_fee, 'travel')
  return Object.fromEntries(Object.entries(terms).filter(([key, value]) => key !== 'charges' ? value !== undefined && value !== null && value !== '' : true))
}

export function buildLegacyTradeListing({ vendor, service, config, draft = {}, packages = [], addons = [], fields = [] }) {
  const tradeInputs = draft.trade_inputs && typeof draft.trade_inputs === 'object' ? draft.trade_inputs : {}
  const serviceProfile = service?.specs?.trade_v1 ?? service?.specs?.profile ?? service?.specs?.[config?.trade_id] ?? {}
  const draftProfile = draft.profile && typeof draft.profile === 'object' ? draft.profile : {}
  const profile = {
    ...serviceProfile,
    ...tradeInputs,
    ...draftProfile,
    business_name: draftProfile.business_name || tradeInputs.business_name || vendor?.business_name || vendor?.name || service?.name,
    stage_name: draftProfile.stage_name || tradeInputs.stage_name || draftProfile.display_name || '',
    tagline: draftProfile.tagline || tradeInputs.tagline || draft.description || '',
    bio: draftProfile.bio || tradeInputs.bio || draft.description || '',
    languages: draftProfile.languages ?? tradeInputs.languages ?? serviceProfile.languages,
    events: draftProfile.events ?? tradeInputs.supported_events ?? tradeInputs.event_types ?? tradeInputs.events ?? serviceProfile.events,
    specialties: draftProfile.specialties ?? tradeInputs.specialties ?? tradeInputs.service_types ?? serviceProfile.specialties,
    years_experience: draftProfile.years_experience ?? tradeInputs.years_experience ?? tradeInputs.years_active ?? serviceProfile.years_experience,
    capacity: draftProfile.capacity ?? tradeInputs.capacity ?? tradeInputs.max_guests ?? serviceProfile.capacity,
  }
  const normalizePackage = item => {
    const price = packageRatePaise(item)
    const inclusions = item?.inclusions ?? item?.commercial_inputs?.inclusions ?? item?.trade_inputs?.inclusions ?? []
    return {
      ...item,
      id: item.id ?? item.key ?? item.name,
      name: item.name || item.title || 'Package',
      customer_paise: price,
      unit: item.unit || item.pricing_unit || draft.pricing_unit || service?.unit,
      hours: item.hours ?? item.duration_hours ?? item.included_duration ?? item.duration,
      duration: item.duration,
      min_guests: item.min_guests ?? item.minGuests ?? item.minimum_order,
      max_guests: item.max_guests ?? item.maxGuests,
      inclusions: toList(inclusions),
    }
  }
  const rawPackages = Array.isArray(packages) ? packages.filter(item => item && !['ARCHIVED', 'PAUSED'].includes(String(item.status).toUpperCase())) : []
  const currentHasContent = !!(draft?.name || draft?.id || (draft?.base_price != null && draft.base_price !== ''))
  const current = currentHasContent ? normalizePackage({
    ...draft,
    price: { rate_paise: packageRatePaise(draft) },
    base_price: draft.base_price,
    unit: draft.pricing_unit,
    hours: draft.included_duration,
    inclusions: draft.commercial_inputs?.inclusions ?? [],
  }) : null
  const byId = new Map()
  for (const item of [...rawPackages, ...(current ? [current] : [])]) {
    const normalized = normalizePackage(item)
    byId.set(String(normalized.id || normalized.name), normalized)
  }
  const packageList = Array.from(byId.values())
  const basePaise = packageRatePaise(draft)
  const ruleList = []
  if (basePaise) ruleList.push({
    label: unitLabel(draft.pricing_unit || service?.unit || 'per_event'),
    customer_paise: basePaise,
    unit: draft.pricing_unit || service?.unit,
    min_qty: draft.minimum_order || undefined,
    included_qty: draft.included_quantity || undefined,
    included_hours: draft.included_duration || undefined,
  })
  const addOns = (Array.isArray(addons) && addons.length ? addons : draft.addons ?? []).filter(item => item && item.active !== false)
    .map(item => ({
      ...item,
      id: item.id ?? item.addon_id ?? item.name,
      label: item.label || item.name || 'Optional extra',
      customer_paise: packageRatePaise({ ...item, base_price: item.base_price ?? (item.rate_paise != null ? Number(item.rate_paise) / 100 : item.rate) }),
      unit: item.unit || item.pricing_unit || 'per_event',
      description: item.description || item.notes || '',
    }))
  const rawCatalogue = draft.catalogue ?? draft.items ?? draft.trade_inputs?.catalogue ?? draft.trade_inputs?.items ?? draft.commercial_inputs?.catalogue ?? []
  const catalogue = (Array.isArray(rawCatalogue) ? rawCatalogue : []).map(item => ({
    ...item,
    name: item.name || item.label || item.title || item.item_key || 'Service item',
    customer_paise: packageRatePaise(item),
    unit: item.unit || item.pricing_unit || draft.pricing_unit || service?.unit,
  }))
  const details = cleanDetails(fields, tradeInputs)
  const status = String(draft.status || 'DRAFT').toUpperCase()
  const businessName = vendor?.business_name || vendor?.name || profile.business_name || service?.name || config?.name
  return {
    ...draft,
    trade_id: config?.trade_id || service?.trade_id || service?.category,
    trade_name: config?.name || service?.category || service?.name,
    business_name: businessName,
    vendor_name: businessName,
    avatar_url: vendor?.avatar_url || vendor?.profile_photo_url || profile.avatar_url,
    city: [vendor?.area, vendor?.city, vendor?.state].filter(Boolean).join(', ') || service?.city || service?.location || profile.city || '',
    rating: vendor?.rating_avg ?? vendor?.rating ?? vendor?.average_rating,
    review_count: vendor?.review_count ?? vendor?.reviews_count,
    is_verified: vendor?.is_verified === true || vendor?.verified === true,
    is_live: ['LIVE', 'ACTIVE'].includes(status),
    status,
    profile,
    description: draft.description || profile.description || profile.tagline || profile.bio || '',
    packages: packageList,
    rules: ruleList,
    catalogue,
    addons: addOns,
    terms: normalizedTerms(draft, service),
    details,
  }
}

export function buildCateringTradeListing({ vendor, service, config, draft = {}, dishes = [], terms = {} }) {
  const dishById = new Map((dishes || []).map(item => [item.id, item]))
  const selectedDishes = (draft.items || []).map(item => dishById.get(item.id) || item)
  const dishNames = selectedDishes.map(item => item.name || dishById.get(item.dish_id)?.name || item.dish_id).filter(Boolean)
  // Catering editor rates are partner supply/take-home rates. Only use an
  // explicit customer-facing rate supplied by the backend/public payload.
  const customerPaise = safeNumber(draft.customer_paise ?? draft.customer_price_paise) ??
    rupeesToPaise(draft.customer_price ?? draft.public_price)
  const customerBandsRaw = Array.isArray(draft.customer_rate_bands) ? draft.customer_rate_bands
    : Array.isArray(draft.customerRateBands) ? draft.customerRateBands : []
  const normalizedBands = customerBandsRaw.map(band => ({
    min: Number(band.minGuests ?? band.min_guests) || 0,
    max: Number(band.maxGuests ?? band.max_guests) || null,
    customerPaise: safeNumber(band.customer_paise ?? band.customer_price_paise) ??
      rupeesToPaise(band.customer_price ?? band.rate),
  })).filter(band => band.customerPaise)
  const baseRate = customerPaise || (normalizedBands.length ? Math.min(...normalizedBands.map(band => band.customerPaise)) : null)
  const status = String(draft.status || 'DRAFT').toUpperCase()
  const serviceProfile = service?.specs?.trade_v1 ?? service?.specs?.catering_v1 ?? {}
  const businessName = vendor?.business_name || vendor?.name || service?.name || config?.name || 'Catering partner'
  const packageItem = {
    id: draft.id || 'catering-preview-package',
    name: draft.name || 'Menu package',
    status,
    customer_paise: baseRate || null,
    unit: 'per_guest',
    hours: draft.serviceHours || undefined,
    min_guests: draft.minGuests || undefined,
    max_guests: draft.maxGuests || undefined,
    inclusions: dishNames,
    description: draft.notes || '',
  }
  const addonRows = (draft.addons || []).filter(addon => addon && addon.active !== false).map(addon => ({
    id: addon.id, label: addon.name || 'Optional extra',
    customer_paise: safeNumber(addon.customer_paise ?? addon.customer_price_paise) ?? rupeesToPaise(addon.customer_price),
    unit: addon.unit || 'per_guest',
  }))
  return {
    trade_id: config?.trade_id || service?.trade_id || 'E01',
    trade_name: config?.name || service?.category || 'Catering & Food',
    business_name: businessName, vendor_name: businessName,
    avatar_url: vendor?.avatar_url || vendor?.profile_photo_url,
    city: [vendor?.area, vendor?.city, vendor?.state].filter(Boolean).join(', ') || service?.city || service?.location || '',
    rating: vendor?.rating_avg ?? vendor?.rating ?? vendor?.average_rating,
    review_count: vendor?.review_count ?? vendor?.reviews_count,
    is_verified: vendor?.is_verified === true || vendor?.verified === true,
    is_live: ['LIVE', 'ACTIVE'].includes(status),
    status,
    profile: {
      ...serviceProfile,
      business_name: businessName,
      tagline: draft.notes || serviceProfile.tagline || '',
      bio: draft.notes || serviceProfile.bio || '',
      specialties: draft.cuisines || serviceProfile.cuisines || [],
    },
    description: draft.notes || serviceProfile.description || '',
    packages: [packageItem],
    rules: normalizedBands.map(band => ({
      label: band.max ? band.min + '–' + band.max + ' guests' : band.min + '+ guests',
      customer_paise: band.customerPaise,
      unit: 'per_guest',
      min_qty: band.min,
    })),
    catalogue: [],
    addons: addonRows,
    terms: {
      instant: terms.availability_policy ?? terms.instant_booking,
      payment_policy: terms.payment_policy,
      advance_pct: terms.advance_pct ?? terms.advance_percent,
      min_notice_days: terms.min_notice_days,
      cancellation: terms.cancellation_policy ?? terms.cancellation,
      reschedule_policy: terms.reschedule_policy,
    },
    details: [
      draft.serviceStyle ? { label: 'Service style', value: String(draft.serviceStyle).replace(/_/g, ' ') } : null,
      draft.kitchenType ? { label: 'Kitchen type', value: String(draft.kitchenType).replace(/_/g, ' ') } : null,
      draft.sourcingMode ? { label: 'Sourcing mode', value: String(draft.sourcingMode).replace(/_/g, ' ') } : null,
      draft.minGuests ? { label: 'Minimum guests', value: String(draft.minGuests) } : null,
      draft.maxGuests ? { label: 'Maximum guests', value: String(draft.maxGuests) } : null,
      draft.serviceHours ? { label: 'Service hours', value: String(draft.serviceHours) } : null,
    ].filter(Boolean),
  }
}

const PREVIEW_NOTE = {
  DRAFT: 'Preview of your draft. Customers cannot see this version yet.',
  UNDER_REVIEW: 'This version is with our team. Customers still see your live listing, if you have one.',
  ACTION_REQUIRED: 'This version needs a change before it can go live.',
  REJECTED: 'This version needs a change before it can go live.',
  ARCHIVED: 'This listing version is hidden from customers.',
}

export default function TradeCustomerPreviewScreen({
  vendor, service, config, listing, tradeName, media: suppliedMedia = EMPTY_MEDIA, avatarSlot,
  onClose, onPick, isLive, previewError, onRetry, previewState, previewLoading = false, onAction,
}) {
  const [favorite, setFavorite] = useState(false)
  const [actionNote, setActionNote] = useState('')
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [mediaState, setMediaState] = useState({ loading: false, rows: [] })
  useEffect(() => {
    let alive = true
    async function load() {
      if (suppliedMedia.length) {
        setMediaState({ loading: false, rows: suppliedMedia })
        return
      }
      if (!vendor?.id) {
        setMediaState({ loading: false, rows: [] })
        return
      }
      setMediaState({ loading: true, rows: [] })
      try {
        const result = await fetchWork(vendor.id)
        const rows = (result.rows || []).filter(row => ['photo', 'video'].includes(row.kind))
        const signed = await signedUrlsFor(rows.map(row => row.storage_path), 600)
        if (alive) setMediaState({
          loading: false,
          rows: rows.map(row => ({ ...row, url: signed[row.storage_path] || '' })).filter(row => row.url),
        })
      } catch {
        if (alive) setMediaState({ loading: false, rows: [] })
      }
    }
    load()
    return () => { alive = false }
  }, [vendor?.id, suppliedMedia])
  const media = mediaState.rows
  const profileName = listing?.profile?.business_name || listing?.profile?.stage_name || listing?.profile?.name || vendor?.business_name || vendor?.name || 'Your business'
  const finalLive = isLive != null ? isLive : listing?.is_live === true
  const status = String(previewState || listing?.status || '').toUpperCase()
  const notice = !finalLive ? PREVIEW_NOTE[status] || '' : ''
  const cardListing = useMemo(() => {
    if (!listing || listing.state === 'NONE' || listing.state === 'ERROR') return listing
    return {
      ...listing,
      business_name: listing.business_name || vendor?.business_name || vendor?.name,
      avatar_url: listing.avatar_url || vendor?.avatar_url || vendor?.profile_photo_url,
      city: listing.city || [vendor?.area, vendor?.city].filter(Boolean).join(', '),
      rating: listing.rating ?? vendor?.rating_avg ?? vendor?.rating,
      review_count: listing.review_count ?? vendor?.review_count,
      is_verified: listing.is_verified ?? vendor?.is_verified,
      is_live: finalLive,
      terms: listing.terms || (listing.booking_rules ? { ...listing.booking_rules } : {}),
    }
  }, [listing, vendor, finalLive])

  async function share() {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: (tradeName || config?.name || service?.name || 'Sambramo') + ' customer preview', text: 'Preview this Sambramo listing', url: window.location.href })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href)
      }
    } catch {
      // A dismissed share sheet is not an error.
    }
  }

  const instant = !!(cardListing?.terms?.instant === true || ['true', 'instant', 'on'].includes(String(cardListing?.terms?.instant ?? '').toLowerCase()) || cardListing?.terms?.availability_policy === 'instant' || cardListing?.terms?.booking_mode === 'instant')
  const isLoading = previewLoading || (!listing && !previewError)
  const isNone = !!listing && listing.state === 'NONE'
  const isError = listing?.state === 'ERROR' || !!previewError
  return (
    <div className="fixed inset-0 z-[240] flex flex-col bg-[#f7fbff] text-[#102250]"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog" aria-modal="true" aria-label="Full-screen customer storefront preview">
      <header className="z-20 flex h-[54px] shrink-0 items-center gap-2 border-b border-[#e4edf9] bg-white/95 px-3 backdrop-blur">
        <button type="button" onClick={onClose} aria-label="Close customer preview" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eff6ff] text-[#16356b]"><ArrowLeft size={19}/></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black text-[#102250]">Customer preview</p>
          <p className="truncate text-[9px] font-semibold text-[#657897]">{tradeName || config?.name || service?.name || 'Your service'} · mobile storefront</p>
        </div>
        <button type="button" onClick={share} aria-label="Share preview" className="grid h-9 w-9 place-items-center rounded-full bg-[#eff6ff] text-[#16356b]"><Share2 size={17}/></button>
        <button type="button" onClick={() => setFavorite(value => !value)} aria-label={favorite ? 'Remove preview from favourites' : 'Add preview to favourites'} aria-pressed={favorite} className={'grid h-9 w-9 place-items-center rounded-full ' + (favorite ? 'bg-rose-50 text-rose-600' : 'bg-[#eff6ff] text-[#16356b]')}><Heart size={17} fill={favorite ? 'currentColor' : 'none'}/></button>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
        {notice ? <div className="mx-3 mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10.5px] font-semibold leading-snug text-amber-900"><ShieldCheck size={13} className="mt-0.5 shrink-0"/><span>{notice}</span></div> : null}
        {mediaState.loading ? <div className="mx-3 mt-2 h-1 overflow-hidden rounded-full bg-[#e5effb]"><div className="h-full w-1/2 animate-pulse rounded-full bg-[#2586ef]"/></div> : null}
        {isLoading ? <div className="flex h-40 items-center justify-center"><Loader2 size={22} className="animate-spin text-[#6b31df]"/></div>
          : isError ? <div className="space-y-3 py-8 text-center"><CircleAlert size={28} className="mx-auto text-rose-600"/><p className="text-[14px] font-extrabold text-[#172752]">Your preview could not load</p><p className="px-5 text-[12px] leading-relaxed text-[#667693]">{previewError || 'Check your connection and try again.'}</p><button type="button" onClick={onRetry} className="rounded-full bg-[#5f2bdf] px-4 py-2.5 text-[12px] font-extrabold text-white">Retry</button></div>
          : isNone ? <div className="mx-4 mt-5 rounded-2xl bg-white p-5 text-center text-[13px] font-bold text-[#536787]">Finish your listing once and its saved details will appear here.</div>
          : <TradeListingCard
              listing={cardListing}
              tradeName={tradeName || config?.name || service?.name}
              media={media}
              avatarSlot={avatarSlot || <PartnerAvatarInput vendor={vendor} draft={{ profile: cardListing?.profile ?? {} }} businessName={profileName} editable variant="marketplace"/>}
              onPick={pkg => { setSelectedPackage(pkg); onPick?.(pkg) }}
            />}
      </main>

      {selectedPackage ? (
        <div className="fixed inset-0 z-[260] flex items-end justify-center bg-[#101833]/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Package details">
          <button type="button" aria-label="Close package details" onClick={() => setSelectedPackage(null)} className="absolute inset-0"/>
          <section className="relative max-h-[82dvh] w-full max-w-lg overflow-y-auto rounded-t-[26px] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[26px]">
            <div className="mb-3 flex items-start gap-3">
              <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-wide text-[#6b31df]">Package details</p><h2 className="mt-1 break-words text-[18px] font-black text-[#152552]">{selectedPackage.name || 'Package'}</h2></div>
              <button type="button" onClick={() => setSelectedPackage(null)} className="rounded-full bg-[#f1f5ff] px-3 py-2 text-[11px] font-extrabold text-[#465b80]">Close</button>
            </div>
            <p className="text-[25px] font-black text-[#152552]">{Number(selectedPackage.customer_paise) > 0 ? '₹' + (Number(selectedPackage.customer_paise) / 100).toLocaleString('en-IN') : 'Price on request'}</p>
            {selectedPackage.description ? <p className="mt-2 text-[12px] leading-relaxed text-[#5d6d8b]">{selectedPackage.description}</p> : null}
            {Array.isArray(selectedPackage.inclusions) && selectedPackage.inclusions.length ? <div className="mt-4"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[#7b879d]">Included</p><div className="space-y-2">{selectedPackage.inclusions.map((item,i)=><p key={i} className="flex items-start gap-2 text-[12px] font-semibold text-[#24365d]"><span className="text-emerald-700">✓</span><span>{valueLabel(item)}</span></p>)}</div></div> : null}
            {(selectedPackage.addons || []).length ? <div className="mt-4"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[#7b879d]">Optional extras</p>{selectedPackage.addons.map((item,i)=><div key={item.id || item.name || i} className="flex justify-between gap-3 border-b border-[#eef2f8] py-2 text-[12px]"><span>{item.label || item.name || 'Extra'}</span><span className="font-bold">{Number(item.customer_paise)>0 ? '₹'+(Number(item.customer_paise)/100).toLocaleString('en-IN') : 'As listed'}</span></div>)}</div> : null}
          </section>
        </div>
      ) : null}

      <footer className="z-20 shrink-0 border-t border-[#e4ecfa] bg-white/95 px-3 pb-2 pt-2 shadow-[0_-5px_20px_rgba(26,75,140,.08)] backdrop-blur">
        <button type="button" onClick={() => { const message = 'Preview only. The live booking flow checks the service date, availability and final payable amount before payment.'; setActionNote(message); onAction?.(message) }}
          className={'flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[17px] px-4 text-center text-[13px] font-black text-white shadow-lg ' + (instant ? 'bg-gradient-to-r from-[#4935dc] to-[#7134ed]' : 'bg-gradient-to-r from-[#287be9] to-[#1557cc]')}>
          <span>{instant ? 'Instant Book & Pay' : 'Check availability & request quote'}</span><span aria-hidden="true">→</span>
        </button>
        <p className="mt-1.5 text-center text-[9px] font-medium text-[#657594]" role={actionNote ? 'status' : undefined}>{actionNote || 'Preview only · secure payment and booking confirmation happen in the customer flow.'}</p>
      </footer>
    </div>
  )
}

const unitLabel = value => {
  const maps = {
    'per event': 'per_event', 'per hour': 'per_hour', 'per day': 'per_day',
    'per guest': 'per_guest', 'per plate': 'per_plate', 'per person': 'per_person',
    'per trip': 'per_trip', 'per item': 'per_item', 'per piece': 'per_piece',
    'per month': 'per_month', 'per project': 'per_project', 'per staff': 'per_staff',
  }
  const text = String(value || 'per_event').toLowerCase()
  return maps[text] || text.replace(/\s+/g, '_')
}
