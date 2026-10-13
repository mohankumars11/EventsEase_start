/**
 * Shared customer-facing storefront for all non-Anchor trades.
 * Layout intentionally mirrors AnchorProfileCard: blue hero, separate partner
 * identity, five section tabs, horizontal package rows, portfolio, pricing,
 * trade details, extras, booking terms, trust information and reviews.
 *
 * Only listing/customer fields are rendered here. Internal review notes,
 * partner take-home, payout information and platform fee fields are not used.
 */
import { useEffect, useId, useMemo, useState } from 'react'
import {
  MapPin, Star, Check, Clock, Package, Boxes, Plus, Info, UserRound,
  Camera, Mic2, ShieldCheck, CreditCard, BadgeCheck, Gift, Image as ImageIcon,
  PlayCircle, Video, Users, Languages, ChevronRight, CalendarDays,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { rupees } from '../../lib/tierPackages'

const UNIT_LABEL = {
  per_hour: 'per hour', per_day: 'per day', per_event: 'per event',
  per_guest: 'per guest', per_plate: 'per plate', per_person: 'per person',
  per_item: 'per item', per_trip: 'per trip', per_km: 'per km',
  per_vehicle: 'per vehicle', per_piece: 'per piece', per_kg: 'per kg',
  per_sqft: 'per sq ft', per_session: 'per session', per_function: 'per function',
  per_project: 'per project', per_staff: 'per staff', per_worker: 'per worker',
  per_month: 'per month', per_day: 'per day', per_set: 'per set',
  included: 'included',
}
const unitOf = value => UNIT_LABEL[value] ?? String(value ?? '').replace(/^per_/, 'per ').replace(/_/g, ' ')
const asArray = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map(x => x.trim()).filter(Boolean) : []
const valueLabel = value => typeof value === 'string' || typeof value === 'number' ? String(value) : value?.label ?? value?.name ?? value?.value ?? value?.id ?? ''
const nonEmpty = value => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length)
const isInstant = terms => terms?.instant === true || terms?.instant === 'true' || terms?.availability_policy === 'instant' || terms?.booking_mode === 'instant'
const statusText = status => ({
  DRAFT: 'Draft preview · customers cannot see this version yet.',
  UNDER_REVIEW: 'This version is with our team. Customers continue to see your live listing, if you have one.',
  ACTION_REQUIRED: 'This version needs changes before it can go live.',
  REJECTED: 'This version needs changes before it can go live.',
  ARCHIVED: 'This listing version is hidden from customers.',
}[String(status || '').toUpperCase()] || '')

function Section({ id, icon: Icon, title, children }) {
  return (
    <section id={id} className="scroll-mt-3 border-t border-[#e9eef7] bg-white px-4 py-4">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-[#7b879d]">
        {Icon ? <Icon size={14} /> : null}{title}
      </h3>
      {children}
    </section>
  )
}

function Row({ label, value, detail }) {
  if (!nonEmpty(value)) return null
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#eef2f8] py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="break-words text-[12.5px] font-semibold text-[#18274f]">{label}</p>
        {nonEmpty(detail) ? <p className="mt-0.5 break-words text-[10.5px] leading-snug text-[#7a879f]">{detail}</p> : null}
      </div>
      <p className="max-w-[58%] shrink-0 break-words text-right text-[12.5px] font-extrabold text-[#18274f]">{value}</p>
    </div>
  )
}

function SummaryTile({ title, detail, tone, icon: Icon }) {
  const classes = {
    blue: 'bg-[#e6f3ff] text-[#1671df]',
    violet: 'bg-[#f0e7ff] text-[#6b31df]',
    amber: 'bg-[#fff1d1] text-[#a96a08]',
  }
  return (
    <div className="min-w-0 rounded-[17px] border border-[#e7eef9] bg-white p-2.5 shadow-[0_4px_16px_rgba(25,82,150,.05)]">
      <span className={'mb-2 grid h-8 w-8 place-items-center rounded-full ' + classes[tone || 'blue']}><Icon size={16}/></span>
      <p className="text-[10px] font-extrabold leading-tight text-[#172752]">{title}</p>
      <p className="mt-1 break-words text-[9px] leading-snug text-[#63718d]">{detail}</p>
    </div>
  )
}

export default function TradeListingCard({ listing, tradeName, onPick, showBookingCtaPreview = false, media = [], avatarSlot = null }) {
  const idPrefix = 'trade-store-' + useId().replace(/:/g, '')
  if (!listing) return null

  const profile = listing.profile && typeof listing.profile === 'object' ? listing.profile : {}
  const terms = listing.terms && typeof listing.terms === 'object' ? listing.terms : {}
  const packages = Array.isArray(listing.packages) ? listing.packages : []
  const catalogue = Array.isArray(listing.catalogue) ? listing.catalogue : []
  const rules = Array.isArray(listing.rules) ? listing.rules : []
  const addons = Array.isArray(listing.addons) ? listing.addons : []
  const portfolio = (Array.isArray(media) && media.length ? media : Array.isArray(listing.media) ? listing.media : [])
    .filter(item => item?.url && ['photo', 'video'].includes(item.kind))
  const photos = portfolio.filter(item => item.kind === 'photo')
  const videos = portfolio.filter(item => item.kind === 'video')
  const heroMedia = photos.find(item => item.review_status === 'live') || photos[0] || videos[0] || null
  const profileAvatar = profile.avatar_url || profile.profile_photo_url || profile.photo_url || profile.avatar ||
    profile.logo_url || profile.business_logo_url || listing.avatar_url || listing.vendor_avatar_url || listing.profile_photo_url || ''
  const displayName = [
    profile.business_name, listing.business_name, profile.stage_name, profile.display_name,
    profile.name, listing.vendor_name,
  ].find(value => value && !['this partner', 'partner business', 'your business'].includes(String(value).trim().toLowerCase())) || 'Partner profile'
  const location = listing.city || profile.city || profile.location || profile.locality || ''
  const verified = listing.is_verified === true || profile.is_verified === true || listing.verified === true
  const rating = Number(listing.rating ?? listing.rating_avg ?? listing.average_rating ?? 0)
  const reviewCount = Number(listing.review_count ?? listing.reviews_count ?? 0)
  const isLive = listing.is_live === true || ['LIVE', 'ACTIVE'].includes(String(listing.status || '').toUpperCase())
  const hasPendingMedia = !isLive && portfolio.some(item => String(item.review_status || '').toLowerCase() !== 'live')
  const languages = asArray(profile.languages).map(valueLabel).filter(Boolean)
  const events = asArray(profile.events ?? profile.supported_events ?? profile.event_types).map(valueLabel).filter(Boolean)
  const publicTags = asArray(profile.specialties ?? profile.services ?? profile.service_types).map(valueLabel).filter(Boolean)
  const experience = profile.years_experience ?? profile.years_active ?? profile.years ?? listing.years_experience
  const audience = profile.max_audience ?? profile.max_guests ?? profile.capacity ?? listing.max_guests
  const description = listing.description || profile.tagline || profile.bio || profile.about || ''
  const details = (Array.isArray(listing.details) ? listing.details : [])
    .filter(item => item && nonEmpty(item.value) && item.customer_visible !== false)
    .filter(item => !/(aadhaar|aadhar|pan number|bank|account number|password|private|internal|take.?home|platform fee|commission|payout|review note|license number|licence number)/i.test(String(item.label || '')))
  const entry = [
    ...packages.map(item => item.customer_paise),
    ...rules.map(item => item.customer_paise),
    ...catalogue.map(item => item.customer_paise),
  ].map(Number).filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b)[0]
  const bookingSummary = [
    terms.payment_policy && String(terms.payment_policy).replace(/_/g, ' '),
    terms.advance_pct != null && Number(terms.advance_pct) > 0 ? String(terms.advance_pct) + '% advance' : null,
    terms.min_notice_days != null ? String(terms.min_notice_days) + ' day notice' : null,
  ].filter(Boolean).slice(0, 2).join(' · ') || (isInstant(terms) ? 'Instant booking available' : 'Availability confirmed before payment')
  const extrasSummary = addons.length ? addons.length + ' optional extra' + (addons.length === 1 ? '' : 's') + ' listed' : 'No extras listed'
  const pricingSummary = rules.length
    ? (rules[0].label || unitOf(rules[0].unit || '')) + (entry ? ' · from ' + rupees(entry) : '')
    : catalogue.length ? 'Rates shown by item' : packages.length ? 'Package prices shown below' : entry ? 'From ' + rupees(entry) : 'Price on request'

  const scrollTo = key => {
    if (typeof document === 'undefined') return
    document.getElementById(idPrefix + '-' + key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const sectionId = key => idPrefix + '-' + key

  return (
    <article className="w-full overflow-hidden rounded-[26px] bg-[#f7fbff] text-[#102250] ring-1 ring-[#e6eefb] shadow-[0_8px_24px_rgba(25,82,150,.06)]">
      <section className="relative isolate mx-3 mt-3 min-h-[226px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#c7efff] via-[#72c6ff] to-[#1b9cf0] text-[#102453] shadow-[0_12px_28px_rgba(26,129,232,.15)]">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {heroMedia ? (
            <>
              {heroMedia.kind === 'video'
                ? <video src={heroMedia.url} muted playsInline className="absolute inset-y-0 right-0 h-full w-[58%] object-cover opacity-55" />
                : <img src={heroMedia.url} alt="" className="absolute inset-y-0 right-0 h-full w-[62%] object-cover opacity-55" />}
              <div className="absolute inset-0 bg-gradient-to-r from-[#bfeaff] via-[#91d3ff]/90 to-[#1599ec]/25" />
            </>
          ) : (
            <>
              <div className="absolute -right-10 -top-12 h-56 w-56 rounded-full bg-[#13d1ff]/45" />
              <div className="absolute right-[15%] top-[-42%] h-[300px] w-[150px] rotate-[32deg] rounded-full bg-gradient-to-b from-[#1679ff]/65 to-[#38d8ff]/25" />
              <div className="absolute -left-12 bottom-[-80px] h-52 w-52 rounded-full bg-white/45 blur-2xl" />
            </>
          )}
        </div>
        <div className="relative flex min-h-[226px] flex-col justify-between p-4">
          <div className="max-w-[77%]">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#13549c]">SAMBRAMO · {tradeName || listing.trade_name || listing.trade_id || 'EVENT SERVICE'}</p>
            <h2 className="mt-4 max-w-[340px] text-[25px] font-black leading-[1.02] tracking-[-.04em] text-[#071b58]">{profile.hero_title || listing.hero_title || 'Make Your Service Unforgettable'}</h2>
            <p className="mt-2 max-w-[340px] text-[11px] font-semibold leading-snug text-[#123a79]">{description || 'Trusted professionals · tailored services · memorable experiences'}</p>
          </div>
          <div className="relative mt-4 flex max-w-[85%] flex-wrap gap-1.5">
            {experience != null && Number(experience) > 0 ? <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/70 px-2.5 py-1.5 text-[9px] font-extrabold text-[#073a96]"><Star size={11}/> {experience}+ years</span> : null}
            {audience != null && Number(audience) > 0 ? <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/70 px-2.5 py-1.5 text-[9px] font-extrabold text-[#073a96]"><Users size={11}/> Up to {Number(audience).toLocaleString('en-IN')}</span> : null}
            {languages.slice(0, 2).map((item, i) => <span key={item + i} className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/70 px-2.5 py-1.5 text-[9px] font-extrabold text-[#073a96]"><Languages size={11}/> {item}</span>)}
          </div>
        </div>
      </section>

      <section className="mx-3 mt-2 rounded-[24px] border border-[#e6f0fc] bg-white/95 p-3.5 shadow-[0_5px_22px_rgba(29,76,141,.06)]">
        <div className="flex items-start gap-3">
          <div className="relative h-[72px] w-[72px] shrink-0">
            {avatarSlot || (
              <span className="relative grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-br from-[#d8f0ff] to-[#c3d8ff] shadow-[0_3px_12px_rgba(20,100,210,.16)]">
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-[#1168d9]">
                  {String(tradeName || listing.trade_id || '').toLowerCase().includes('photo') ? <Camera size={23}/> : <UserRound size={23}/>}
                  <b className="text-[8px] font-black">{String(displayName).split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()}</b>
                </span>
                {profileAvatar ? <PartnerAvatarPhoto src={profileAvatar} alt={displayName + ' profile'}/> : null}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <h3 className="max-w-full break-words text-[16px] font-black leading-tight text-[#111f50]">{displayName}</h3>
              {verified ? <span title="Verified partner" className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#1684ef] text-white"><BadgeCheck size={12}/></span> : null}
            </div>
            <p className="mt-1 text-[11.5px] font-semibold text-[#495b80]">{tradeName || listing.trade_name || listing.trade_id || 'Event partner'}</p>
            {location ? <p className="mt-1.5 flex items-start gap-1.5 text-[10.5px] font-medium text-[#4c6188]"><MapPin size={12} className="mt-0.5 shrink-0 text-[#1876e8]"/><span>{location}</span></p> : null}
            {rating > 0 ? <p className="mt-1 flex items-center gap-1 text-[10px] font-extrabold text-[#26375f]"><Star size={12} className="fill-[#ffb62d] text-[#ffb62d]"/>{rating.toFixed(1)}{reviewCount > 0 ? <span className="font-semibold text-[#61708d]">({reviewCount})</span> : null}</p> : null}
          </div>
          {!isLive && listing.status ? <span className="mt-1 shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[8.5px] font-extrabold text-amber-900 ring-1 ring-amber-200">{String(listing.status).replace(/_/g, ' ')}</span> : null}
        </div>
        {(events.length || publicTags.length) ? (
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[...events, ...publicTags].slice(0, 10).map((item, i) => <span key={item + i} className="shrink-0 rounded-full bg-[#f1f5ff] px-3 py-1.5 text-[9.5px] font-bold text-[#364d7c]">{item}</span>)}
          </div>
        ) : null}
      </section>

      <nav aria-label="Customer listing sections" className="sticky top-0 z-10 mx-3 mt-2 flex items-center justify-between gap-1 overflow-x-auto border-b border-[#e3ebf8] bg-[#f7fbff]/95 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          ['Packages', 'packages', Gift],
          ['Photos', 'photos', Camera],
          ['Videos', 'videos', PlayCircle],
          ['About', 'about', UserRound],
          ['Reviews', 'reviews', Star],
        ].map(([label, key, Icon], index) => (
          <button key={key} type="button" onClick={() => scrollTo(key)} className={'flex shrink-0 flex-col items-center gap-1 border-b-2 px-2.5 py-2 text-[10px] font-bold ' + (index === 0 ? 'border-[#6b35ef] text-[#5e2ce8]' : 'border-transparent text-[#4b5f82]')}>
            <Icon size={18}/>{label}
          </button>
        ))}
      </nav>

      <section id={sectionId('packages')} className="mt-3 scroll-mt-3">
        <div className="mb-2 flex items-center justify-between px-4">
          <h3 className="text-[15px] font-black tracking-tight text-[#12214f]">{packages.length ? 'Popular Packages' : 'Packages & Pricing'}</h3>
          <span className="text-[10px] font-semibold text-[#54658a]">{packages.length ? 'Compare packages' : 'Saved rates and items'}</span>
        </div>
        {packages.length ? (
          <div className="space-y-2.5 px-3 pb-3">
            {packages.map((pkg, index) => {
              const includes = asArray(pkg.inclusions ?? pkg.commercial_inputs?.inclusions).map(valueLabel).filter(Boolean)
              const thumb = photos[index % Math.max(photos.length, 1)] || heroMedia
              const tone = ['bg-gradient-to-r from-[#eaf4ff] to-[#f8fbff] ring-[#dceaff]', 'bg-gradient-to-r from-[#f0e7ff] to-[#fcf9ff] ring-[#e5d7ff]', 'bg-gradient-to-r from-[#fff4dc] to-[#fffbf2] ring-[#f5e2ba]'][index % 3]
              const accent = index === 1 ? 'text-[#6b2bdf]' : index === 2 ? 'text-[#a46808]' : 'text-[#1761cb]'
              const status = pkg.status && !['LIVE', 'ACTIVE'].includes(String(pkg.status).toUpperCase()) ? String(pkg.status).replace(/_/g, ' ') : ''
              return (
                <div key={pkg.id || pkg.key || pkg.name || index} className={'relative w-full overflow-hidden rounded-[20px] p-2.5 ring-1 ' + tone}>
                  {pkg.is_popular === true || pkg.is_featured === true ? <span className="absolute left-2.5 top-1.5 z-10 rounded-full bg-[#6d35e9] px-2 py-1 text-[8px] font-extrabold text-white">★ Most Popular</span> : null}
                  <div className={'grid grid-cols-[58px_minmax(84px,1fr)_minmax(80px,1fr)_18px] items-center gap-2.5 max-[380px]:grid-cols-[46px_minmax(66px,1fr)_minmax(62px,.9fr)_16px] max-[380px]:gap-1.5 ' + ((pkg.is_popular === true || pkg.is_featured === true) ? 'pt-5' : '')}>
                    <div className="h-[76px] w-[58px] overflow-hidden rounded-[13px] bg-white/80 ring-1 ring-white max-[380px]:h-[64px] max-[380px]:w-[46px]">
                      {thumb?.url ? <img src={thumb.url} alt="" className="h-full w-full object-cover"/> : <span className="flex h-full items-center justify-center text-[#327ee3]"><Package size={22}/></span>}
                    </div>
                    <div className="min-w-0">
                      <p className={'break-words text-[12px] font-black leading-tight ' + accent}>{pkg.name || 'Package'}</p>
                      <p className="mt-1 break-words text-[16px] font-black leading-tight tracking-tight text-[#101f50] max-[380px]:text-[13px]">{Number(pkg.customer_paise) > 0 ? rupees(Number(pkg.customer_paise)) : 'Price on request'}</p>
                      <p className="mt-1 text-[9px] font-semibold leading-tight text-[#556586]">{pkg.duration_hours || pkg.hours ? String(pkg.duration_hours || pkg.hours) + ' hrs' : pkg.duration ? String(pkg.duration) + ' included' : unitOf(pkg.unit || 'per_event')}</p>
                      {pkg.min_guests || pkg.max_guests ? <p className="mt-1 text-[8.5px] text-[#657594]">{pkg.min_guests || 0}{pkg.max_guests ? '–' + pkg.max_guests : '+'} guests</p> : null}
                    </div>
                    <div className="min-w-0 space-y-1">
                      {(includes.length ? includes.slice(0, 3) : [pkg.description || 'Details as listed']).map((item, i) => <p key={i} className="flex min-w-0 items-start gap-1 text-[9px] font-semibold leading-tight text-[#2f426d] max-[380px]:text-[8px]"><Check size={10} strokeWidth={3} className={'mt-0.5 shrink-0 ' + (index === 1 ? 'text-[#7537e8]' : index === 2 ? 'text-[#b4760e]' : 'text-[#176de1]')}/><span className="line-clamp-2 break-words">{item}</span></p>)}
                    </div>
                    <span className="grid h-7 w-[18px] place-items-center rounded-full bg-white/90 text-[#6933e9] shadow-sm"><ChevronRight size={16}/></span>
                  </div>
                  {onPick ? <button type="button" onClick={() => onPick(pkg)} className="mt-2 flex w-full items-center justify-end gap-1 text-[9.5px] font-extrabold text-[#5f2be4]">View details <ChevronRight size={12}/></button> : null}
                  {status ? <p className="mt-1 text-[8px] font-extrabold uppercase text-amber-800">{status}</p> : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mx-3 rounded-[18px] border border-dashed border-[#b9d9fb] bg-white p-4 text-[11px] text-[#536787]">No packages are saved for this trade yet. Any saved pricing rules or catalogue items are shown below.</div>
        )}
      </section>

      <section className="mx-3 mt-2 rounded-[18px] border border-[#e6eefb] bg-white p-3 scroll-mt-3" aria-label="Portfolio gallery">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[15px] font-black tracking-tight text-[#12214f]">Gallery</h3>
          <span className="text-[10px] font-semibold text-[#54658a]">{photos.length} photos · {videos.length} videos</span>
        </div>
        <section id={sectionId('photos')} className="scroll-mt-3">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7b879d]">Photos</p>
          {photos.length ? (
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {photos.slice(0, 12).map((item, index) => (
                <a key={item.id || item.storage_path || index} href={item.url} target="_blank" rel="noreferrer" className="relative h-[112px] w-[154px] shrink-0 snap-start overflow-hidden rounded-[15px] bg-[#d9eaff] shadow-sm">
                  <img src={item.url} alt={item.caption || 'Partner portfolio photo'} className="h-full w-full object-cover"/>
                  {item.review_status && item.review_status !== 'live' ? <span className="absolute left-1 right-1 top-1 rounded-full bg-amber-100/95 px-1 py-1 text-center text-[8px] font-extrabold text-amber-900">{item.review_status === 'rejected' ? 'Changes needed' : 'In review'}</span> : null}
                  {item.caption ? <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-5 text-[9px] font-bold text-white">{item.caption}</span> : null}
                </a>
              ))}
            </div>
          ) : <p className="rounded-xl bg-[#f7faff] p-3 text-[10px] text-[#667693]">Photos uploaded for this trade will appear here.</p>}
        </section>
        <section id={sectionId('videos')} className="mt-3 scroll-mt-3 border-t border-[#eef2f8] pt-3">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7b879d]">Videos</p>
          {videos.length ? (
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {videos.slice(0, 8).map((item, index) => (
                <a key={item.id || item.storage_path || index} href={item.url} target="_blank" rel="noreferrer" className="relative h-[112px] w-[154px] shrink-0 snap-start overflow-hidden rounded-[15px] bg-[#d9eaff] shadow-sm">
                  <video src={item.url} muted playsInline className="h-full w-full object-cover"/>
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[8px] font-bold text-white"><PlayCircle size={11} className="mr-1 inline"/>Video</span>
                  {item.review_status && item.review_status !== 'live' ? <span className="absolute right-1 top-1 rounded-full bg-amber-100/95 px-1.5 py-1 text-[8px] font-extrabold text-amber-900">{item.review_status === 'rejected' ? 'Changes needed' : 'In review'}</span> : null}
                </a>
              ))}
            </div>
          ) : <p className="rounded-xl bg-[#f7faff] p-3 text-[10px] text-[#667693]">Videos uploaded for this trade will appear here.</p>}
        </section>
      </section>

      <section className="mx-3 mt-2 grid grid-cols-3 gap-2">
        <SummaryTile icon={Clock} title="How They Charge" detail={pricingSummary} tone="blue"/>
        <SummaryTile icon={Plus} title="Optional Extras" detail={extrasSummary} tone="violet"/>
        <SummaryTile icon={CalendarDays} title="Booking Terms" detail={bookingSummary} tone="amber"/>
      </section>

      <Section id={sectionId('about')} icon={UserRound} title="About this service">
        {description ? <p className="text-[12px] leading-relaxed text-[#526485]">{description}</p> : <p className="text-[11px] text-[#667693]">Additional service information has not been added yet.</p>}
        {details.length ? <div className="mt-3 divide-y divide-[#eef2f8]">{details.map((item, i) => <Row key={item.key || item.label || i} label={item.label || item.key || 'Service detail'} value={Array.isArray(item.value) ? item.value.map(valueLabel).filter(Boolean).join(', ') : valueLabel(item.value)} detail={item.detail}/>)}</div> : null}
        {events.length ? <div className="mt-3"><p className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7b879d]">Suitable for</p><div className="flex flex-wrap gap-1.5">{events.map((item, i) => <span key={item + i} className="rounded-full bg-[#f1f5ff] px-2.5 py-1 text-[9px] font-bold text-[#364d7c]">{item}</span>)}</div></div> : null}
      </Section>

      {rules.length ? (
        <Section id={sectionId('pricing')} icon={Clock} title="How they charge">
          {rules.map((rule, index) => (
            <Row key={rule.id || rule.label || index}
              label={rule.label || unitOf(rule.unit) || 'Rate'}
              value={Number(rule.customer_paise) > 0 ? rupees(Number(rule.customer_paise)) + (rule.unit ? ' / ' + unitOf(rule.unit) : '') : rule.value || 'Price on request'}
              detail={[rule.included_hours && rule.included_hours + ' hours included', rule.min_hours && 'min ' + rule.min_hours + ' hours', rule.max_hours && 'max ' + rule.max_hours + ' hours', rule.min_qty && 'minimum ' + rule.min_qty + ' ' + unitOf(rule.unit), rule.included_qty && rule.included_qty + ' included'].filter(Boolean).join(' · ')}
            />
          ))}
        </Section>
      ) : null}

      {catalogue.length ? (
        <Section id={sectionId('catalogue')} icon={Boxes} title="What you can order">
          {catalogue.map((item, index) => (
            <Row key={item.id || item.item_key || item.name || index}
              label={item.name || item.label || item.item_key || 'Service item'}
              value={Number(item.customer_paise) > 0 ? rupees(Number(item.customer_paise)) + (item.unit ? ' / ' + unitOf(item.unit) : '') : item.value || 'Details on request'}
              detail={[item.description, item.lead_days && item.lead_days + ' days notice', item.stock_qty != null && item.stock_qty + ' available'].filter(Boolean).join(' · ')}
            />
          ))}
        </Section>
      ) : null}

      {addons.length ? (
        <Section id={sectionId('extras')} icon={Plus} title="Optional extras">
          {addons.map((addon, index) => (
            <Row key={addon.id || addon.addon_id || addon.label || index}
              label={addon.label || addon.name || 'Optional extra'}
              value={Number(addon.customer_paise) > 0 ? rupees(Number(addon.customer_paise)) + (addon.unit ? ' / ' + unitOf(addon.unit) : '') : addon.value || 'Price as listed'}
              detail={addon.description || (Array.isArray(addon.included_in) ? 'Included in selected packages: ' + addon.included_in.join(', ') : '')}
            />
          ))}
        </Section>
      ) : null}

      {(Object.keys(terms).length > 0) ? (
        <Section id={sectionId('terms')} icon={Info} title="Booking & payment terms">
          {terms.instant != null || terms.availability_policy != null || terms.booking_mode != null ? <Row label="Booking mode" value={isInstant(terms) ? 'Instant Book & Pay' : 'Booking request / quote'}/> : null}
          {(terms.advance_pct ?? terms.advance_percent) != null ? <Row label="Advance payment" value={String(terms.advance_pct ?? terms.advance_percent) + '% at booking'}/> : null}
          {terms.payment_policy ? <Row label="Payment terms" value={String(terms.payment_policy).replace(/_/g, ' ')}/> : null}
          {terms.min_notice_days != null ? <Row label="Book at least" value={String(terms.min_notice_days) + ' day' + (Number(terms.min_notice_days) === 1 ? '' : 's') + ' ahead'}/> : null}
          {terms.cancellation || terms.cancellation_policy ? <Row label="Cancellation" value={String(terms.cancellation ?? terms.cancellation_policy).replace(/_/g, ' ')} detail={terms.cancellation_details || terms.cancellation_text || ''}/> : null}
          {terms.reschedule_policy ? <Row label="Rescheduling" value={String(terms.reschedule_policy).replace(/_/g, ' ')}/> : null}
          {terms.travel_policy ? <Row label="Travel" value={String(terms.travel_policy).replace(/_/g, ' ')}/> : null}
          {(Array.isArray(terms.charges) ? terms.charges : []).map((charge, index) => <Row key={charge.id || charge.label || index} label={charge.label || 'Additional charge'} value={charge.customer_paise ? rupees(Number(charge.customer_paise)) : charge.value || 'As listed'} detail={charge.detail || charge.unit || ''}/>)}
        </Section>
      ) : null}

      <section id={sectionId('trust')} className="grid grid-cols-3 gap-2 border-t border-[#e6eefb] bg-gradient-to-r from-[#f2edff] via-white to-[#eef8ff] px-3 py-3">
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <ShieldCheck size={20} className="text-[#6a31df]"/>
          <b className="text-[9.5px] font-extrabold text-[#21124a]">Clear pricing</b>
          <span className="text-[8px] leading-tight text-[#7b879d]">Rates shown upfront</span>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <CreditCard size={20} className="text-[#6a31df]"/>
          <b className="text-[9.5px] font-extrabold text-[#21124a]">Secure checkout</b>
          <span className="text-[8px] leading-tight text-[#7b879d]">Total confirmed before payment</span>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <BadgeCheck size={20} className={verified ? 'text-emerald-700' : 'text-[#6a31df]'}/>
          <b className="text-[9.5px] font-extrabold text-[#21124a]">{verified ? 'Verified partner' : 'Partner status'}</b>
          <span className="text-[8px] leading-tight text-[#7b879d]">{verified ? 'Verification complete' : 'Status shown transparently'}</span>
        </div>
      </section>

      <section id={sectionId('reviews')} className="mb-3 mt-2 scroll-mt-3 rounded-[20px] border border-[#e5eefb] bg-white p-3.5 mx-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff2ce] text-[#a86e0b]"><Star size={17} className="fill-current"/></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-extrabold text-[#152552]">Customer reviews</p>
            {rating > 0
              ? <p className="mt-0.5 text-[10.5px] text-[#586b8c]">{rating.toFixed(1)} average rating{reviewCount > 0 ? ' from ' + reviewCount + ' review' + (reviewCount === 1 ? '' : 's') : ''}</p>
              : <p className="mt-0.5 text-[10.5px] text-[#586b8c]">Ratings and written reviews appear here when customers share their experience.</p>}
          </div>
        </div>
        {Array.isArray(listing.reviews) && listing.reviews.length ? (
          <div className="mt-3 space-y-2">{listing.reviews.slice(0, 3).map((review, index) => (
            <div key={review.id || index} className="rounded-xl bg-[#f7faff] p-3">
              <p className="text-[11px] font-bold text-[#24365d]">{review.title || review.customer_name || 'Customer review'}</p>
              {review.rating ? <p className="mt-0.5 text-[10px] font-bold text-amber-600">★ {review.rating}</p> : null}
              <p className="mt-1 text-[11px] leading-relaxed text-[#536582]">{review.comment || review.body || review.text || ''}</p>
            </div>
          ))}</div>
        ) : null}
      </section>

      {showBookingCtaPreview ? (
        <div className="border-t border-[#e4ecfa] bg-white p-4">
          <div aria-label="Customer action preview" className={'flex min-h-[50px] items-center justify-center gap-2 rounded-[17px] px-4 text-center text-[13px] font-extrabold text-white ' + (isInstant(terms) ? 'bg-gradient-to-r from-[#4d36dc] to-[#6f32ee] shadow-lg shadow-violet-700/15' : 'bg-[#6b7280]')}>
            {isInstant(terms) ? 'Instant Book & Pay' : 'Check availability & request quote'} <span aria-hidden="true">→</span>
          </div>
          <p className="mt-2 text-center text-[10px] text-[#667493]">Preview only · final availability and price are confirmed in the booking flow.</p>
        </div>
      ) : null}
    </article>
  )
}

function PartnerAvatarPhoto({ src, alt }) {
  const [resolved, setResolved] = useState('')
  useEffect(() => {
    let alive = true
    async function resolve() {
      if (!src) { setResolved(''); return }
      if (/^https?:\/\//i.test(String(src))) { setResolved(src); return }
      try {
        let { data, error } = await supabase.storage.from('partner-avatars').createSignedUrl(String(src), 600)
        if (error) ({ data, error } = await supabase.storage.from('partner-uploads').createSignedUrl(String(src), 600))
        if (alive) setResolved(error ? '' : data?.signedUrl || '')
      } catch { if (alive) setResolved('') }
    }
    resolve()
    return () => { alive = false }
  }, [src])
  return resolved ? <img src={resolved} alt={alt} className="absolute inset-0 h-full w-full object-cover" onError={() => setResolved('')}/> : null
}
