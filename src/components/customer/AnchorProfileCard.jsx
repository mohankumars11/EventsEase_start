/**
 * Shared customer storefront for Anchor & MC.
 *
 * Uses only fields supplied by the public listing/profile and the partner's
 * saved portfolio. The same component appears in the customer app and the
 * partner's full-screen preview so the two views cannot drift apart.
 */
import {
  Languages, MapPin, Users, Star, Youtube, Check, Crown, Mic2,
  Sparkles, Camera, PlayCircle, CalendarDays, ReceiptText, Settings2,
  ChevronRight, ShieldCheck, Clock3, Image as ImageIcon
} from 'lucide-react'
import { rupees } from '../../lib/tierPackages'
import { EVENT_GROUPS_V3 } from '../vendor/anchor/options'

const EVENT_LABEL = Object.fromEntries(EVENT_GROUPS_V3.flatMap(g => g.items.map(i => [i.id, i.label])))
const ROLE = { anchor: 'Anchor', mc: 'MC', both: 'Anchor & MC' }
const packagesTone = [
  'from-[#eaf5ff] to-white ring-[#cfe8ff]',
  'from-[#f2eaff] to-white ring-[#e2d2ff]',
  'from-[#fff5df] to-white ring-[#f5dfae]',
]

function normalizedItems(value) {
  return Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map(x => x.trim()).filter(Boolean) : []
}
function labelOf(value) {
  return typeof value === 'string' ? value : value?.label ?? value?.name ?? value?.id ?? ''
}
function IconTile({ icon: Icon, title, detail, tone = 'blue' }) {
  const tones = {
    blue: 'bg-[#e5f3ff] text-[#1873e8]',
    violet: 'bg-[#efe7ff] text-[#6d28d9]',
    amber: 'bg-[#fff0ce] text-[#ae6a05]',
  }
  return (
    <div className="min-w-0 rounded-[18px] border border-[#eaf1fa] bg-white/95 p-2.5 shadow-[0_5px_20px_rgba(25,82,150,.06)]">
      <span className={`mb-2 grid h-9 w-9 place-items-center rounded-full ${tones[tone]}`}><Icon size={17} /></span>
      <p className="text-[10.5px] font-extrabold leading-tight text-[#142554]">{title}</p>
      <p className="mt-1 text-[9.5px] leading-snug text-[#536582]">{detail}</p>
    </div>
  )
}

export default function AnchorProfileCard({
  profile = {}, packages = [], city, rating, reviewCount = 0, verified = false,
  onPick, selectedTier, showBookingCtaPreview = false, instantBookEnabled = true,
  media = [], avatarSlot = null, pricingModels = [], extras = [], bookingDetails = [],
}) {
  const p = profile && typeof profile === 'object' ? profile : {}
  const avatar = p.avatar_url || p.profile_photo_url || p.photo_url || p.avatar || ''
  const languageItems = normalizedItems(p.languages).map(labelOf).filter(Boolean)
  const eventItems = normalizedItems(p.events).map(e => EVENT_LABEL[e?.id ?? e] ?? labelOf(e)).filter(Boolean)
  const name = p.stage_name || p.name || p.display_name || 'Anchor & MC'
  const role = p.role === 'other' ? p.role_other : ROLE[p.role] ?? 'Anchor & MC'
  const experience = Number(p.years ?? p.years_experience ?? p.years_active)
  const audience = Number(p.max_audience ?? p.max_guests ?? p.audience)
  const photos = media.filter(item => item?.url && item.kind === 'photo')
  const videos = media.filter(item => item?.url && item.kind === 'video')
  const cover = photos[0]?.url || p.cover_photo_url || p.banner_url || p.hero_image_url || '/onboarding/anchor-mc-hero.jpg'
  const bookingSummary = bookingDetails.length
    ? bookingDetails.slice(0, 2).map(x => x.label ?? x.k ?? x.name).filter(Boolean).join(' · ')
    : 'Availability and final booking terms confirmed before payment'
  const modelSummary = pricingModels.length
    ? pricingModels.slice(0, 2).map(x => x.name ?? x.label).filter(Boolean).join(' · ')
    : packages.length ? 'Packages available for your event' : 'Ask for pricing based on your event'
  const extrasSummary = extras.length
    ? `${extras.length} optional extra${extras.length === 1 ? '' : 's'} listed`
    : 'Custom requirements can be discussed'

  function scrollTo(id) {
    const target = document.getElementById(id)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="w-full overflow-hidden bg-[#f7fbff] text-[#101f50]">
      {/* Blue hero: uses the partner's real portfolio image when available. */}
      <section className="relative isolate mx-3 mt-2 min-h-[242px] overflow-hidden rounded-[27px] bg-gradient-to-br from-[#bdeaff] via-[#4fa8ff] to-[#087be9] text-[#071b58] shadow-[0_14px_34px_rgba(26,129,232,.16)]">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-[#14d2ff]/50 blur-[1px]" />
          <div className="absolute right-[18%] top-[-35%] h-[360px] w-[180px] rotate-[32deg] rounded-full bg-gradient-to-b from-[#1a76ff]/80 to-[#37d8ff]/30" />
          <div className="absolute -left-14 bottom-[-80px] h-56 w-56 rounded-full bg-[#dff7ff]/70 blur-2xl" />
          {cover ? <img src={cover} alt="" className="absolute inset-y-0 right-0 h-full w-[64%] object-cover object-center opacity-95" /> : null}
          {cover ? <div className="absolute inset-0 bg-gradient-to-r from-[#bcecff] via-[#75c2ff]/95 to-[#0e96f2]/15" /> : null}
        </div>
        <div className="relative flex min-h-[242px] flex-col justify-between p-4">
          <div className="max-w-[68%]">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#0756ba]">SAMBRAMO · ANCHOR & MC</p>
            <h2 className="mt-4 text-[25px] font-black leading-[1.02] tracking-[-.045em] text-[#071b58]">Make Your<br />Event Unforgettable</h2>
            <p className="mt-2 max-w-[230px] text-[11px] font-semibold leading-snug text-[#123a79]">Energetic anchors · engaging hosts<br />Memorable experiences</p>
          </div>
          {!cover && (
            <div className="pointer-events-none absolute bottom-4 right-4 grid h-[128px] w-[108px] place-items-center">
              <div className="absolute inset-0 rounded-[45%] bg-white/25 blur-lg" />
              <div className="absolute inset-1 rotate-[-12deg] rounded-[36px] border border-white/50 bg-gradient-to-br from-white/55 to-[#268aff]/10 shadow-xl" />
              <Mic2 size={64} strokeWidth={1.5} className="relative text-[#064fc6] drop-shadow-[0_8px_10px_rgba(5,62,153,.2)]" />
              <Sparkles size={21} className="absolute right-0 top-1 text-white" />
            </div>
          )}
          <div className="relative mt-4 flex max-w-[72%] flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/65 px-2.5 py-1.5 text-[9.5px] font-extrabold text-[#073a96]"><Mic2 size={13} /> {role}</span>
            {experience > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/65 px-2.5 py-1.5 text-[9.5px] font-extrabold text-[#073a96]"><Star size={12} /> {experience}+ years</span>}
            {languageItems.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/65 px-2.5 py-1.5 text-[9.5px] font-extrabold text-[#073a96]"><Users size={12} /> {languageItems.length} language{languageItems.length === 1 ? '' : 's'}</span>}
          </div>
        </div>
      </section>

      {/* Profile identity, with the real uploaded avatar in the circular slot. */}
      <section id="anchor-preview-profile" className="mx-3 mt-2 rounded-[25px] border border-[#e6f0fc] bg-white/95 p-3.5 shadow-[0_5px_22px_rgba(29,76,141,.06)]">
        <div className="flex items-start gap-3">
          {avatarSlot ? (
            <div className="relative w-[72px] shrink-0">{avatarSlot}</div>
          ) : (
            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-br from-[#d8f0ff] to-[#c3d8ff] shadow-[0_3px_12px_rgba(20,100,210,.16)]">
              {avatar
                ? <img src={avatar} alt={`${name} profile`} className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                : <span className="flex h-full w-full flex-col items-center justify-center text-[#1168d9]"><Mic2 size={24} /><b className="mt-0.5 text-[8px] font-black">ANCHOR</b></span>}
            </div>
          )}
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <h3 className="max-w-full break-words text-[16px] font-black leading-tight text-[#111f50]">{name}</h3>
              {verified && <span title="Verified partner" className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#1684ef] text-white"><ShieldCheck size={12} /></span>}
            </div>
            <p className="mt-1 text-[11.5px] font-semibold text-[#495b80]">{role}</p>
            {city && <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-medium text-[#4c6188]"><MapPin size={12} className="shrink-0 text-[#1876e8]" />{city}</p>}
          </div>
          {Number(rating) > 0 && <div className="mt-1 flex shrink-0 items-center gap-1 rounded-full bg-[#f0f4ff] px-2 py-1.5 text-[10px] font-black text-[#122452]"><Star size={12} className="fill-[#ffb62d] text-[#ffb62d]" />{Number(rating).toFixed(1)}{Number(reviewCount) > 0 ? <span className="font-semibold text-[#506081]">({reviewCount})</span> : null}</div>}
        </div>
        {(eventItems.length > 0 || languageItems.length > 0) && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[...eventItems, ...languageItems].slice(0, 8).map((item, i) => <span key={item + i} className="shrink-0 rounded-full bg-[#f1f5ff] px-3 py-1.5 text-[9.5px] font-bold text-[#364d7c]">{item}</span>)}
          </div>
        )}
        {p.bio && <p className="mt-3 text-[11.5px] leading-relaxed text-[#4f6287]">{p.bio}</p>}
      </section>

      {/* Tappable anchors mirror the customer listing information architecture. */}
      <nav className="mx-3 mt-2 flex items-center justify-between gap-1 overflow-x-auto border-b border-[#e3ebf8] bg-[#f7fbff] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Customer listing sections">
        {[
          ['Packages', 'anchor-preview-packages', '🎁'],
          ['Photos', 'anchor-preview-gallery', '▧'],
          ['Videos', 'anchor-preview-gallery', '▷'],
          ['About', 'anchor-preview-about', '♙'],
          ['Reviews', 'anchor-preview-reviews', '☆'],
        ].map(([label, id, glyph], i) => (
          <button key={label} type="button" onClick={() => scrollTo(id)} className={`flex shrink-0 flex-col items-center gap-1 border-b-2 px-2.5 py-2 text-[10.5px] font-bold ${i === 0 ? 'border-[#6b35ef] text-[#5e2ce8]' : 'border-transparent text-[#4b5f82]'}`}>
            <span className="text-[18px] leading-none">{glyph}</span>{label}
          </button>
        ))}
      </nav>

      {/* Horizontal package row cards, stacked vertically like the approved reference. */}
      <section id="anchor-preview-packages" className="mt-3 scroll-mt-3">
        <div className="mb-2 flex items-center justify-between px-4">
          <h3 className="text-[15px] font-black tracking-tight text-[#12214f]">Popular Packages</h3>
          <span className="text-[10.5px] font-semibold text-[#54658a]">Compare packages</span>
        </div>
        {packages.length > 0 ? (
          <div className="space-y-2.5 px-3 pb-3">
            {packages.map((k, index) => {
              const sel = selectedTier === k.tier
              const inclusions = (Array.isArray(k.inclusions) ? k.inclusions : []).map(labelOf).filter(Boolean)
              const thumb = photos[index % Math.max(photos.length, 1)]?.url || cover
              const popular = k.is_popular === true || k.is_featured === true
              const rowTone = ['bg-gradient-to-r from-[#eaf4ff] to-[#f8fbff] ring-[#dceaff]', 'bg-gradient-to-r from-[#f0e7ff] to-[#fcf9ff] ring-[#e5d7ff]', 'bg-gradient-to-r from-[#fff4dc] to-[#fffbf2] ring-[#f5e2ba]'][index % 3]
              const accent = index === 1 ? 'text-[#6b2bdf]' : index === 2 ? 'text-[#a46808]' : 'text-[#1761cb]'
              const checkTone = index === 1 ? 'text-[#7537e8]' : index === 2 ? 'text-[#b4760e]' : 'text-[#176de1]'
              return (
                <button key={k.tier ?? k.name} type="button" disabled={!onPick} onClick={() => onPick?.(k)}
                  className={`relative block w-full overflow-hidden rounded-[21px] ${rowTone} p-2.5 text-left ring-1 transition active:scale-[.995] ${sel ? 'outline outline-2 outline-[#6737ed]' : ''}`}>
                  {popular && <span className="absolute left-2.5 top-1.5 z-10 flex items-center gap-1 rounded-full bg-[#6d35e9] px-2 py-1 text-[8px] font-extrabold text-white"><Crown size={10} /> Most Popular</span>}
                  <div className={`grid grid-cols-[56px_minmax(84px,1fr)_minmax(82px,1fr)_18px] items-center gap-2.5 max-[380px]:grid-cols-[48px_minmax(76px,1fr)_minmax(70px,.9fr)_16px] max-[380px]:gap-1.5 ${popular ? 'pt-5' : ''}`}>
                    <div className="h-[76px] w-[56px] overflow-hidden rounded-[13px] bg-white/80 ring-1 ring-white max-[380px]:h-[66px] max-[380px]:w-[48px]">
                      {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[#327ee3]"><Mic2 size={23} /></span>}
                    </div>
                    <div className="min-w-0">
                      <p className={`break-words text-[12px] font-black leading-tight max-[380px]:text-[10.5px] ${accent}`}>{k.name}</p>
                      <p className="mt-1 break-words text-[17px] font-black leading-tight tracking-tight text-[#101f50] max-[380px]:text-[14px]">{Number(k.customer_paise) > 0 ? rupees(k.customer_paise) : 'Price on request'}</p>
                      <p className="mt-1 flex items-center gap-1 text-[9px] font-semibold leading-tight text-[#556586] max-[380px]:text-[8px]"><Clock3 size={10} className="shrink-0" />{k.hours ? `${k.hours} Hours` : 'Duration as agreed'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      {(inclusions.length ? inclusions.slice(0, 3) : ['Package details', 'Booking terms']).map((inc, i) => (
                        <p key={i} className="flex min-w-0 items-start gap-1 text-[9px] font-semibold leading-tight text-[#2f426d] max-[380px]:text-[8px]"><Check size={10} strokeWidth={3} className={`mt-0.5 shrink-0 ${checkTone}`} /><span className="line-clamp-2 break-words">{inc}</span></p>
                      ))}
                    </div>
                    <span className="grid h-7 w-[18px] place-items-center rounded-full bg-white/90 text-[#6933e9] shadow-sm max-[380px]:h-6 max-[380px]:w-4"><ChevronRight size={16} /></span>
                  </div>
                  <span className="mt-2 flex items-center justify-end gap-1 text-[9.5px] font-extrabold text-[#5f2be4]">View details <ChevronRight size={12} /></span>
                </button>
              )
            })}
          </div>
        ) : <div className="mx-3 rounded-[18px] border border-dashed border-[#b9d9fb] bg-white p-4 text-[11.5px] text-[#536787]">Your saved packages will appear here once pricing is configured.</div>}
      </section>

      {/* Actual uploaded media only; no invented gallery imagery or counts. */}
      <section id="anchor-preview-gallery" className="mt-2 scroll-mt-3">
        <div className="mb-2 flex items-center justify-between px-4">
          <h3 className="text-[15px] font-black tracking-tight text-[#12214f]">Gallery</h3>
          <span className="text-[10.5px] font-semibold text-[#54658a]">{photos.length} photo{photos.length === 1 ? '' : 's'} · {videos.length} video{videos.length === 1 ? '' : 's'}</span>
        </div>
        {media.length ? (
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {media.slice(0, 12).map((item, i) => (
              <a key={item.id || item.storage_path || i} href={item.url} target="_blank" rel="noreferrer" className="relative h-[112px] w-[154px] shrink-0 snap-start overflow-hidden rounded-[15px] bg-[#d9eaff] shadow-sm">
                {item.kind === 'video'
                  ? <><video src={item.url} muted playsInline className="h-full w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[8px] font-bold text-white"><PlayCircle size={10} className="mr-1 inline" />Video</span></>
                  : <img src={item.url} alt={item.caption || 'Partner portfolio'} className="h-full w-full object-cover" />}
                {item.review_status && item.review_status !== 'live' && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-amber-100/95 px-2 py-1 text-[8px] font-extrabold text-amber-900">{item.review_status === 'rejected' ? 'Changes needed' : 'In review'}</span>}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-2 pt-5 text-[9px] font-bold text-white">{item.caption || (item.kind === 'video' ? 'Performance video' : 'Portfolio photo')}</span>
              </a>
            ))}
          </div>
        ) : <div className="mx-3 flex items-center gap-3 rounded-[18px] border border-dashed border-[#b9d9fb] bg-white p-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e3f2ff] text-[#1972e8]"><ImageIcon size={17} /></span><div><p className="text-[11.5px] font-extrabold text-[#1e3159]">Portfolio gallery</p><p className="mt-0.5 text-[10px] text-[#637492]">Approved photos and videos will appear here.</p></div></div>}
      </section>

      {/* Compact three-column information strip from saved listing data. */}
      <section id="anchor-preview-about" className="mx-3 mt-2 grid scroll-mt-3 grid-cols-3 gap-2">
        <IconTile icon={ReceiptText} title="How They Charge" detail={modelSummary} />
        <IconTile icon={Settings2} title="Optional Extras" detail={extrasSummary} tone="violet" />
        <IconTile icon={CalendarDays} title="Booking Terms" detail={bookingSummary} tone="blue" />
      </section>

      <section id="anchor-preview-reviews" className="mx-3 mb-4 mt-3 rounded-[18px] border border-[#e6eefb] bg-white p-3.5 scroll-mt-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff2ce] text-[#a86e0b]"><Star size={17} className="fill-current" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-extrabold text-[#152552]">Customer reviews</p>
            {Number(rating) > 0
              ? <p className="mt-0.5 text-[10px] text-[#586b8c]">{Number(rating).toFixed(1)} average rating{Number(reviewCount) > 0 ? ` from ${reviewCount} review${Number(reviewCount) === 1 ? '' : 's'}` : ''}</p>
              : <p className="mt-0.5 text-[10px] text-[#586b8c]">Ratings appear here as customers share their experience.</p>}
          </div>
        </div>
      </section>

      {showBookingCtaPreview && (
        <div className="mx-3 mb-4 rounded-[18px] border border-[#e4ecfa] bg-white p-3.5">
          <div aria-label="Customer action preview" className={`flex min-h-[50px] items-center justify-center gap-2 rounded-full px-4 text-center text-[13px] font-extrabold text-white ${instantBookEnabled ? 'bg-gradient-to-r from-[#4d36dc] to-[#6f32ee] shadow-lg shadow-violet-700/15' : 'bg-slate-400'}`}>
            {instantBookEnabled ? 'Instant Book & Pay' : 'Check availability & request quote'} <span aria-hidden="true">→</span>
          </div>
          <p className="mt-2 text-center text-[10px] text-[#667493]">Preview only · final availability and pricing are confirmed before payment.</p>
        </div>
      )}
      {p.video_url && <a href={p.video_url} target="_blank" rel="noreferrer" className="mx-3 mb-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-[#2154b6] ring-1 ring-[#e3ecfc]"><Youtube size={15} />Watch performance video</a>}
      {audience > 0 && <p className="px-4 pb-3 text-[10px] text-[#637492]"><Users size={12} className="mr-1 inline" />Hosting capacity up to {audience.toLocaleString('en-IN')} guests</p>}
      {!!pricingModels.length && <div className="sr-only">{pricingModels.map(m => m.rules).filter(Boolean).join(' ')}</div>}
    </div>
  )
}
