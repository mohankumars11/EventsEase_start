/**
 * A partner of any trade, as a customer sees them.
 *
 * The direct analogue of AnchorProfileCard, and written for the same
 * reason its header gives: it is built ONLY from what listing_public()
 * returns, so legal name, bank details, documents, review notes, the
 * partner's take-home and the platform fee are not in its input at all
 * and cannot leak through it. The SQL strips private keys out of
 * `answers` and `attributes` by regex before they ever reach the client
 * (20261010_09:838), and every amount in the payload is customer_paise.
 *
 * Used by BOTH the customer page and the partner's "Preview my customer
 * listing", exactly as AnchorProfileCard is. That is the point: a
 * preview rendered by a second component is a preview that drifts, and
 * a drifting preview is how internal fields end up on a customer screen.
 *
 * Anchor & MC keeps AnchorProfileCard -- it has a profile shape of its
 * own (role, languages, event groups) that the engine trades do not.
 */
import { useEffect, useState } from 'react'
import { MapPin, Star, Check, Clock, Package, Boxes, Plus, Info, UserRound, Camera, Mic2, ShieldCheck, CreditCard, BadgeCheck, Gift, Image as ImageIcon, UserRound as AboutIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { rupees } from '../../lib/tierPackages'

const UNIT_LABEL = {
  per_hour: 'per hour', per_day: 'per day', per_event: 'per event', per_guest: 'per guest',
  per_plate: 'per plate', per_item: 'per item', per_km: 'per km', per_vehicle: 'per vehicle',
  per_piece: 'per piece', per_kg: 'per kg', per_sqft: 'per sq ft', per_person: 'per person',
}
const unitOf = u => UNIT_LABEL[u] ?? String(u ?? '').replace(/^per_/, 'per ').replace(/_/g, ' ')

const CANCELLATION_COPY = {
  flexible: 'Full refund up to 7 days before the event.',
  moderate: 'Full refund up to 14 days before the event.',
  strict: 'Part refund — see the full policy at checkout.',
}

function Section({ icon: Icon, title, children, id }) {
  return (
    <section id={id} className="scroll-mt-3 border-t border-ink/[0.06] px-5 py-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-ink/45">
        {Icon && <Icon size={13} />}{title}
      </p>
      {children}
    </section>
  )
}

function Row({ k, v, sub }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="whitespace-normal break-words text-[13.5px] font-bold text-ink">{k}</p>
        {sub && <p className="text-[11.5px] text-ink/50">{sub}</p>}
      </div>
      <p className="max-w-[55%] whitespace-normal break-words text-right text-[13.5px] font-extrabold text-ink">{v}</p>
    </div>
  )
}

export default function TradeListingCard({ listing, tradeName, onPick, showBookingCtaPreview = false, media = [], avatarSlot = null }) {
  if (!listing) return null
  const p = listing.profile && typeof listing.profile === 'object' ? listing.profile : {}
  const profileAvatar = p.avatar_url || p.profile_photo_url || p.photo_url || p.avatar || p.logo_url || p.business_logo_url || listing.avatar_url || listing.vendor_avatar_url || listing.profile_photo_url || ''
  const displayName = [p.business_name, listing.business_name, p.stage_name, p.display_name, p.name, listing.vendor_name].find(value => value && !['this partner', 'partner business', 'your business'].includes(String(value).trim().toLowerCase())) || 'Partner profile'
  const terms = listing.terms && typeof listing.terms === 'object' ? listing.terms : {}
  const packages = Array.isArray(listing.packages) ? listing.packages : []
  const catalogue = Array.isArray(listing.catalogue) ? listing.catalogue : []
  const rules = Array.isArray(listing.rules) ? listing.rules : []
  const addons = Array.isArray(listing.addons) ? listing.addons : []
  const portfolio = (Array.isArray(media) && media.length ? media : Array.isArray(listing.media) ? listing.media : []).filter(item => item?.url && ['photo', 'video'].includes(item.kind))
  const heroMedia = portfolio.find(item => item.kind === 'photo') ?? portfolio[0] ?? null
  const verified = listing.is_verified === true || p.is_verified === true || listing.verified === true
  const hasPendingMedia = listing.is_live === false && portfolio.some(item => item.review_status !== 'live')
  const languages = Array.isArray(p.languages) ? p.languages.map(item => typeof item === 'string' ? item : item?.name).filter(Boolean) : typeof p.languages === 'string' ? p.languages.split(',').map(item => item.trim()).filter(Boolean) : []
  const experience = p.years_experience ?? p.years_active ?? p.years ?? listing.years_experience
  const audience = p.max_audience ?? p.max_guests ?? p.audience ?? listing.max_guests
  const eventTypes = Array.isArray(p.events) ? p.events.map(item => typeof item === 'string' ? item : item?.label ?? item?.name ?? item?.id).filter(Boolean) : typeof p.events === 'string' ? p.events.split(',').map(item => item.trim()).filter(Boolean) : []

  /* The cheapest real number on the listing, whatever shape the trade
     prices in. "From" is honest where a single headline price is not. */
  const entry = [
    ...packages.map(x => x.customer_paise),
    ...rules.map(x => x.customer_paise),
    ...catalogue.map(x => x.customer_paise),
  ].filter(n => Number(n) > 0).sort((a, b) => a - b)[0]

  return (
    <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-ink/[0.07]">
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-[#c7efff] via-[#72c6ff] to-[#1b9cf0] text-[#102453]">
        {heroMedia && heroMedia.kind === 'photo' ? <img src={heroMedia.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" /> : null}
        {heroMedia && heroMedia.kind === 'video' ? <video src={heroMedia.url} muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-[#c7efff]/95 via-[#80caff]/72 to-[#1599ec]/15" />
        <div className="relative p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#13549c]">{tradeName ?? listing.trade_id}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {verified ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/30 bg-emerald-300/15 px-2.5 py-1 text-[9px] font-extrabold text-emerald-50"><Check size={11}/> Verified partner</span> : null}
              {hasPendingMedia ? <span className="rounded-full border border-amber-200/40 bg-amber-200/15 px-2.5 py-1 text-[9px] font-extrabold text-amber-50">Portfolio awaiting review</span> : null}
            </div>
          </div>
          <div className="mt-3 flex min-w-0 items-center gap-3">
            {avatarSlot || (
              <span className="relative grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white/80 bg-white/15 shadow-[0_5px_18px_rgba(15,5,30,.25)]">
                <span className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-0.5 bg-gradient-to-br from-violet-100 to-fuchsia-200 text-plum-900">
                  {String(tradeName ?? listing.trade_id ?? '').toLowerCase().includes('anchor') || String(tradeName ?? '').toLowerCase().includes('mc') ? <Mic2 size={24} /> : String(tradeName ?? '').toLowerCase().includes('photo') ? <Camera size={24} /> : <UserRound size={24} />}
                  <b className="text-[9px] font-black">{String(displayName).split(/\s+/).map(x => x[0]).join('').slice(0,2).toUpperCase()}</b>
                </span>
                {profileAvatar ? <PartnerAvatarPhoto src={profileAvatar} alt={displayName + ' profile'} /> : null}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-[21px] font-extrabold leading-tight tracking-tight">{displayName}</h2>
              {p.tagline && <p className="mt-1 text-[12px] leading-snug text-[#173c73]">{p.tagline}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] font-semibold text-[#173c73]">
                {listing.city && <span className="flex items-center gap-1.5"><MapPin size={13}/>{listing.city}</span>}
                {Number(listing.rating) > 0 && <span className="flex items-center gap-1.5"><Star size={13} className="fill-current text-amber-300"/>{Number(listing.rating).toFixed(1)}{listing.review_count ? ' · '+listing.review_count+' reviews' : ''}</span>}
                {(terms.instant === true || terms.instant === 'true') && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold">Instant booking</span>}
              </div>
              {(experience || audience || languages.length || eventTypes.length) ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {experience && Number(experience) > 0 ? <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9.5px] font-semibold text-white/90">{experience}+ years experience</span> : null}
                  {audience && Number(audience) > 0 ? <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9.5px] font-semibold text-white/90">Up to {Number(audience).toLocaleString('en-IN')} guests</span> : null}
                  {languages.slice(0, 3).map(language => <span key={language} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9.5px] font-semibold text-white/90">{language}</span>)}
                  {eventTypes.slice(0, 2).map(event => <span key={event} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9.5px] font-semibold text-white/90">{event}</span>)}
                </div>
              ) : null}
            </div>
          </div>
          {entry > 0 && <p className="mt-4 text-[12px] font-bold text-[#173c73]">From <span className="ml-1 text-[28px] font-black tracking-tight text-[#102453]">{rupees(entry)}</span></p>}
          {listing.description && <p className="mt-2 max-w-xl text-[11.5px] leading-relaxed text-[#173c73]">{listing.description}</p>}
        </div>
      </div>
      <nav aria-label="Storefront sections" className="sticky top-0 z-10 flex items-center justify-between gap-1 border-b border-[#e6edf8] bg-white/95 px-2 py-2 backdrop-blur">
        {[['Packages','trade-preview-packages',Package],['Photos','trade-preview-gallery',ImageIcon],['About','trade-preview-about',AboutIcon],['Reviews','trade-preview-reviews',Star]].map(([label,id,Icon])=><button key={id} type="button" onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})} className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1 text-[9px] font-extrabold text-[#465b80]"><Icon size={18}/><span>{label}</span></button>)}
      </nav>
      {portfolio.length > 0 && (
        <section className="border-b border-ink/[0.06] bg-white px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Portfolio highlights</p>
            <span className="text-[10px] font-bold text-plum-700">{portfolio.length} {portfolio.length === 1 ? 'item' : 'items'}</span>
          </div>
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {portfolio.slice(0, 5).map((item, index) => (
              <a key={item.id || item.storage_path || index} href={item.url} target="_blank" rel="noreferrer" className="relative h-[86px] w-[112px] shrink-0 snap-start overflow-hidden rounded-[15px] bg-plum-50 ring-1 ring-ink/[0.06]">
                {item.kind === 'video' ? <video src={item.url} muted playsInline className="h-full w-full object-cover"/> : <img src={item.url} alt={item.caption || 'Partner portfolio'} className="h-full w-full object-cover"/>}
                {item.kind === 'video' ? <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-1 text-[8px] font-extrabold text-white">▶ Video</span> : null}
                {item.review_status && item.review_status !== 'live' ? <span className="absolute left-1 right-1 top-1 rounded-full bg-amber-100/95 px-1 py-1 text-center text-[7px] font-extrabold text-amber-900">{item.review_status === 'rejected' ? 'Changes needed' : 'In review'}</span> : null}
              </a>
            ))}
            {portfolio.length > 5 ? <div className="grid h-[86px] w-[82px] shrink-0 place-items-center rounded-[15px] bg-plum-50 text-center text-[11px] font-extrabold text-plum-700">+{portfolio.length - 5}<br/>more</div> : null}
          </div>
        </section>
      )}
      {packages.length > 0 && (
        <Section id="trade-preview-packages" icon={Gift} title="Popular Packages">
          <div className="space-y-2.5">
            {packages.map((pkg, index) => {
              const PackageSurface = onPick ? "button" : "div"
              const popular = pkg.is_popular === true || pkg.is_featured === true
              const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : Array.isArray(pkg.commercial_inputs?.inclusions) ? pkg.commercial_inputs.inclusions : []
              const thumb = portfolio[index % Math.max(portfolio.length, 1)]?.url || heroMedia?.url || ""
              const tones = ["bg-gradient-to-r from-[#eaf4ff] to-[#f8fbff] ring-[#dceaff]", "bg-gradient-to-r from-[#f0e7ff] to-[#fcf9ff] ring-[#e5d7ff]", "bg-gradient-to-r from-[#fff4dc] to-[#fffbf2] ring-[#f5e2ba]"]
              const accent = index === 1 ? "text-[#6b2bdf]" : index === 2 ? "text-[#a46808]" : "text-[#1761cb]"
              const checkTone = index === 1 ? "text-[#7537e8]" : index === 2 ? "text-[#b4760e]" : "text-[#176de1]"
              return (
                <PackageSurface key={pkg.key ?? pkg.name} type={onPick ? "button" : undefined}
                  onClick={onPick ? () => onPick(pkg) : undefined}
                  className={"relative block w-full overflow-hidden rounded-[20px] p-2.5 text-left ring-1 transition " + tones[index % 3] + (onPick ? " active:scale-[.995]" : "")}>
                  {popular && <span className="absolute left-2.5 top-1.5 z-10 rounded-full bg-[#6d35e9] px-2 py-1 text-[8px] font-extrabold text-white">★ Partner pick</span>}
                  <div className={"grid grid-cols-[58px_minmax(84px,1fr)_minmax(80px,1fr)_18px] items-center gap-2.5 max-[380px]:grid-cols-[48px_minmax(70px,1fr)_minmax(64px,.9fr)_16px] max-[380px]:gap-1.5 " + (popular ? "pt-5" : "")}>
                    <div className="h-[76px] w-[58px] overflow-hidden rounded-[13px] bg-white/80 ring-1 ring-white max-[380px]:h-[66px] max-[380px]:w-[48px]">
                      {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[#327ee3]"><Package size={22}/></span>}
                    </div>
                    <div className="min-w-0">
                      <p className={"break-words text-[12px] font-black leading-tight " + accent}>{pkg.name || "Package"}</p>
                      <p className="mt-1 break-words text-[16px] font-black leading-tight tracking-tight text-[#101f50] max-[380px]:text-[13px]">{Number(pkg.customer_paise) > 0 ? rupees(pkg.customer_paise) : "Price on request"}</p>
                      <p className="mt-1 text-[9px] font-semibold leading-tight text-[#556586]">{pkg.hours ? pkg.hours + " Hours" : pkg.duration ? pkg.duration + " included" : unitOf(pkg.unit || "per_event")}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      {(inclusions.length ? inclusions.slice(0,3) : [pkg.description || "Details as listed"]).map((inc,i)=><p key={i} className="flex min-w-0 items-start gap-1 text-[9px] font-semibold leading-tight text-[#2f426d] max-[380px]:text-[8px]"><Check size={10} strokeWidth={3} className={"mt-0.5 shrink-0 " + checkTone}/><span className="line-clamp-2 break-words">{typeof inc === "string" ? inc : inc?.label ?? inc?.name ?? inc?.id ?? "Included service"}</span></p>)}
                    </div>
                    <span className="grid h-7 w-[18px] place-items-center rounded-full bg-white/90 text-[#6933e9] shadow-sm"><span aria-hidden="true">›</span></span>
                  </div>
                  {onPick && <span className="mt-2 flex items-center justify-end gap-1 text-[9.5px] font-extrabold text-[#5f2be4]">View details ›</span>}
                  {listing.is_live === false && pkg.status && <span className="mt-1 block text-[8px] font-extrabold uppercase text-amber-800">{String(pkg.status).replace(/_/g," ")}</span>}
                </PackageSurface>
              )
            })}
          </div>
        </Section>
      )}

      {rules.length > 0 && (
        <Section id="trade-preview-pricing" icon={Clock} title="How they charge">
          {rules.map((r, i) => (
            <Row key={i} k={r.label ?? r.kind} v={rupees(r.customer_paise)}
              sub={[unitOf(r.unit), r.included_hours && `${r.included_hours} hrs included`,
                r.min_qty && `min ${r.min_qty}`].filter(Boolean).join(' · ')} />
          ))}
        </Section>
      )}

      {catalogue.length > 0 && (
        <Section id="trade-preview-catalogue" icon={Boxes} title="What you can order">
          {catalogue.map((c, i) => (
            <Row key={c.item_key ?? c.id ?? i} k={c.name ?? c.label ?? c.item_key ?? 'Service item'} v={Number(c.customer_paise) > 0 ? rupees(c.customer_paise) : 'On request'}
              sub={[unitOf(c.unit), c.lead_days && `${c.lead_days} days notice`].filter(Boolean).join(' · ')} />
          ))}

        </Section>
      )}

      {addons.length > 0 && (
        <Section id="trade-preview-extras" icon={Plus} title="Optional extras">
          {addons.map(a => (
            <Row key={a.addon_id} k={a.label} v={rupees(a.customer_paise)} sub={unitOf(a.unit)} />
          ))}
        </Section>
      )}

      <Section id="trade-preview-terms" icon={Info} title="Booking & payment terms">
        {terms.instant != null && <Row k="Booking mode" v={terms.instant === true || terms.instant === 'true' ? 'Instant Book & Pay' : 'Booking request'} />}
        {(terms.advance_pct ?? terms.advance_percent) != null && (
          <Row k="Advance payment" v={String(terms.advance_pct ?? terms.advance_percent) + '% at booking'} />
        )}
        {terms.payment_policy && <Row k="Payment terms" v={String(terms.payment_policy).replace(/_/g, ' ')} />}
        {terms.min_notice_days != null && (
          <Row k="Book at least" v={String(terms.min_notice_days) + ' day' + (Number(terms.min_notice_days) === 1 ? '' : 's') + ' ahead'} />
        )}
        {terms.cancellation && (
          <Row k="Cancellation" v={String(terms.cancellation).replace(/^./, c => c.toUpperCase())}
            sub={terms.cancellation_policy ?? terms.cancellation_details ?? CANCELLATION_COPY[terms.cancellation] ?? 'Check the booking terms for the policy that applies to this listing.'} />
        )}
        {terms.reschedule_policy && <Row k="Rescheduling" v={String(terms.reschedule_policy).replace(/_/g, ' ')} />}
        {(Array.isArray(terms.charges) ? terms.charges : []).map((c, i) => (
          <Row key={i} k={c.label} v={rupees(c.customer_paise)} sub={c.role} />
        ))}
      </Section>

      <section id="trade-preview-reviews" className="scroll-mt-3 border-t border-[#e6eefb] bg-white px-5 py-4">
        <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff2ce] text-[#a86e0b]"><Star size={17} className="fill-current"/></span>
          <div className="min-w-0 flex-1"><p className="text-[12px] font-extrabold text-[#152552]">Customer reviews</p>
            {Number(listing.rating)>0 ? <p className="mt-0.5 text-[10.5px] text-[#586b8c]">{Number(listing.rating).toFixed(1)} average rating{Number(listing.review_count)>0? ` from ${listing.review_count} review${Number(listing.review_count)===1?'':'s'}` : ''}</p> : <p className="mt-0.5 text-[10.5px] text-[#586b8c]">Ratings appear here as customers share their experience.</p>}
          </div>
        </div>
        {Array.isArray(listing.reviews) && listing.reviews.length>0 ? <div className="mt-3 space-y-2">{listing.reviews.slice(0,3).map((review,i)=><div key={review.id||i} className="rounded-xl bg-[#f7faff] p-3"><p className="text-[11px] font-bold text-[#24365d]">{review.title||review.customer_name||'Customer review'}</p><p className="mt-1 text-[11px] leading-relaxed text-[#536582]">{review.comment||review.body||review.text||''}</p></div>)}</div>:null}
      </section>

      <section id="trade-preview-about" className="scroll-mt-3 grid grid-cols-3 gap-2 border-t border-ink/[0.06] bg-gradient-to-r from-plum-50 via-white to-violet-50 px-3 py-3">
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <ShieldCheck size={20} className="text-plum-700" />
          <b className="text-[9.5px] font-extrabold text-plum-950">Clear pricing</b>
          <span className="text-[8px] leading-tight text-ink/50">Rates shown upfront</span>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <CreditCard size={20} className="text-plum-700" />
          <b className="text-[9.5px] font-extrabold text-plum-950">Secure checkout</b>
          <span className="text-[8px] leading-tight text-ink/50">Total confirmed before payment</span>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <BadgeCheck size={20} className={verified ? "text-emerald-700" : "text-plum-700"} />
          <b className="text-[9.5px] font-extrabold text-plum-950">{verified ? "Verified partner" : "Partner status"}</b>
          <span className="text-[8px] leading-tight text-ink/50">{verified ? "Verification complete" : "Status shown transparently"}</span>
        </div>
      </section>

      {showBookingCtaPreview && (
        <div className="border-t border-ink/[0.06] p-4">
          <div aria-label="Customer action preview" className={"flex min-h-[52px] items-center justify-center gap-2 rounded-full px-5 text-center text-[14px] font-extrabold text-white " + ((terms.instant === true || terms.instant === 'true') ? "bg-gradient-to-r from-plum-700 to-violet-600 shadow-lg shadow-plum-700/15" : "bg-slate-400")}>
            {(terms.instant === true || terms.instant === 'true') ? "Instant Book & Pay" : "Instant booking is not enabled"} <span aria-hidden="true">→</span>
          </div>
          <p className="mt-2 text-center text-[10.5px] text-ink/45">Customer action preview · live booking checks availability and the final payable amount.</p>
        </div>
      )}
    </div>
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
  return resolved ? <img src={resolved} alt={alt} className="absolute inset-0 h-full w-full object-cover" onError={() => setResolved('')} /> : null
}
