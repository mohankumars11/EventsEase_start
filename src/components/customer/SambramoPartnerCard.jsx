import { useEffect, useState } from 'react'
import { BadgeCheck, Images, MapPin, Star, UserRound, X } from 'lucide-react'
import { formatINR } from '../../utils/format'
import { fetchWork, signedUrlsFor } from '../../lib/partnerWork'

export default function SambramoPartnerCard({
  vendor,
  serviceName = 'Your service',
  customerPrice = null,
  status = 'accepted',
}) {
  if (!vendor) return null
  const rating = Number(vendor.rating_avg)
  const years = Number(vendor.years_experience)
  const [work, setWork] = useState([])
  const [mediaUrls, setMediaUrls] = useState({})
  const [catalogOpen, setCatalogOpen] = useState(false)
  useEffect(() => {
    let alive = true
    async function load() {
      const { rows } = await fetchWork(vendor.id)
      const approved = (rows ?? []).filter(row => row.review_status === 'live' && ['photo','video'].includes(row.kind))
      const urls = await signedUrlsFor(approved.map(row => row.storage_path), 900)
      if (alive) { setWork(approved); setMediaUrls(urls) }
    }
    if (vendor.id) load()
    return () => { alive = false }
  }, [vendor.id])
  return (
    <section className="overflow-hidden rounded-[26px] bg-white shadow-[var(--shadow-1)] ring-1 ring-hairline/10">
      <div className="bg-gradient-to-r from-plum-950 via-plum-800 to-violet-700 p-4 text-white">
        <div className="flex items-center gap-3">
          {vendor.avatar_url
            ? <img src={vendor.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/20" />
            : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><UserRound size={26} /></div>}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-[18px] font-extrabold">{vendor.business_name ?? 'Sambramo Partner'}</h3>
              {vendor.is_verified && <BadgeCheck size={16} className="text-saffron-300" />}
            </div>
            <p className="mt-0.5 text-[11px] text-white/70">{vendor.city}{vendor.area ? ' · ' + vendor.area : ''}</p>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5">
          {vendor.is_verified && <span className="rounded-full bg-forest-50 px-2 py-1 text-[10px] font-extrabold text-forest-700">Verified on Sambramo</span>}
          {Number.isFinite(rating) && rating > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-extrabold text-amber-800"><Star size={10} fill="currentColor" /> {rating.toFixed(1)} rating</span>}
          {Number.isFinite(years) && years > 0 && <span className="rounded-full bg-surface px-2 py-1 text-[10px] font-extrabold text-ink-soft">{years} yrs experience</span>}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface p-3">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-ink-mute">Booked for</p>
            <p className="mt-1 text-[12.5px] font-extrabold text-ink">{serviceName}</p>
          </div>
          {customerPrice != null && <div className="rounded-2xl bg-plum-50 p-3"><p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Your Sambramo price</p><p className="mt-1 text-[18px] font-extrabold tabular-nums text-ink">{formatINR(customerPrice)}</p></div>}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-surface-sunk/[0.05] p-3 text-[11px] leading-relaxed text-ink-mute">
          <MapPin size={14} className="mt-0.5 shrink-0 text-plum-600" />
          Sambramo handles the match, agreed scope and booking communication here.
        </div>
        {work.length > 0 && (
          <button type="button" onClick={() => setCatalogOpen(true)} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-plum-50 text-[13px] font-extrabold text-plum-800 ring-1 ring-plum-100">
            <Images size={17} /> Explore partner catalog · {work.length} photos & videos
          </button>
        )}
        {catalogOpen && (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Partner work catalog">
            <section className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-[#F8F7FB] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-[28px]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-plum-700">Sambramo partner catalog</p><h3 className="mt-1 text-[20px] font-black text-ink">{vendor.business_name ?? 'Partner work'}</h3><p className="mt-1 text-[12px] text-ink-mute">Approved real photos and videos from this partner.</p></div>
                <button type="button" onClick={() => setCatalogOpen(false)} aria-label="Close catalog" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink ring-1 ring-ink/10"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {work.map(item => mediaUrls[item.storage_path] ? (
                  <article key={item.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.08]">
                    {item.kind === 'video'
                      ? <video src={mediaUrls[item.storage_path]} controls playsInline preload="metadata" className="aspect-[4/5] w-full bg-black object-cover" />
                      : <img src={mediaUrls[item.storage_path]} alt={item.caption || 'Partner portfolio'} loading="lazy" className="aspect-[4/5] w-full object-cover" />}
                    {item.caption && <p className="px-3 py-2.5 text-[12px] font-semibold leading-snug text-ink">{item.caption}</p>}
                  </article>
                ) : null)}
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  )
}
