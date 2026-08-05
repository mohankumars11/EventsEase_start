import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UPCOMING_FESTIVALS } from '../../data/eventServicesData'
import { FESTIVALS } from '../../data/festivals'
import { fetchUnsplashPhoto } from '../../lib/unsplash'

// Calculates days from today to a date string
function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.ceil((target - today) / 86400000)
}

function urgencyColor(days) {
  if (days <= 7)  return 'text-red-600 bg-red-50 border-red-200'
  if (days <= 21) return 'text-orange-600 bg-orange-50 border-orange-200'
  return 'text-amber-700 bg-amber-50 border-amber-200'
}

function urgencyLabel(days) {
  if (days === 0) return 'Today!'
  if (days === 1) return 'Tomorrow!'
  return `${days} days`
}

const HAS_DETAIL_PAGE = new Set(FESTIVALS.map(f => f.id))

// Festivals without a real detail page route straight into the Shop
// category + occasion tag that actually matches what someone needs for
// that festival — e.g. Raksha Bandhan -> Gifts filtered to "Rakhi" —
// instead of a generic catch-all or a dead end into the planning wizard.
const FESTIVAL_SHOP_ROUTE = {
  'independence-day': { category: 'Party Essentials', occasion: 'Independence Day' },
  'raksha-bandhan':    { category: 'Gifts', occasion: 'Rakhi' },
  'janmashtami':       { category: 'Pooja & Essentials', occasion: 'Janmashtami' },
  'dussehra':          { category: 'Pooja & Essentials', occasion: 'Navratri' },
  'new-years-eve':     { category: 'Hampers', occasion: 'New Year' },
}

export default function FestivalBanner() {
  const scrollRef = useRef(null)
  const navigate = useNavigate()

  // Auto-scroll the ticker
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let frame
    let pos = 0
    function tick() {
      pos += 0.5
      if (pos >= el.scrollWidth / 2) pos = 0
      el.scrollLeft = pos
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    el.addEventListener('mouseenter', () => cancelAnimationFrame(frame))
    el.addEventListener('mouseleave', () => { frame = requestAnimationFrame(tick) })
    return () => cancelAnimationFrame(frame)
  }, [])

  const upcoming = UPCOMING_FESTIVALS.map(f => ({ ...f, days: daysUntil(f.date) })).filter(f => f.days >= 0).slice(0, 9)

  // Every festival routes to something about itself — its real detail
  // page when one exists, otherwise the Shop category/occasion that
  // actually matches it. Never a generic unrelated fallback.
  function goToFestival(id) {
    if (HAS_DETAIL_PAGE.has(id)) { navigate(`/festivals/${id}`); return }
    const route = FESTIVAL_SHOP_ROUTE[id]
    if (route) {
      const qs = route.occasion ? `?occasion=${encodeURIComponent(route.occasion)}` : ''
      navigate(`/shop/${encodeURIComponent(route.category)}${qs}`)
    } else {
      navigate(`/plan?type=festival&festival=${id}`)
    }
  }

  return (
    <div className="bg-white border-b border-orange-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 hidden sm:block">Upcoming</span>
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide"
          style={{ scrollBehavior: 'auto' }}
        >
          {/* Duplicate for seamless loop */}
          {[...upcoming, ...upcoming].map((f, i) => (
            <FestivalChip key={i} festival={f} onClick={() => goToFestival(f.id)} />
          ))}
        </div>
        <button
          onClick={() => navigate('/shop/Pooja%20%26%20Essentials')}
          className="shrink-0 text-xs text-amber-600 font-semibold hover:text-amber-700 whitespace-nowrap hidden sm:block"
        >
          Shop festival essentials →
        </button>
      </div>
    </div>
  )
}

function FestivalChip({ festival, onClick }) {
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchUnsplashPhoto(`${festival.name} festival India`).then(p => { if (!cancelled) setPhoto(p) })
    return () => { cancelled = true }
  }, [festival.name])

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full border shrink-0 cursor-pointer hover:shadow-sm transition-shadow ${urgencyColor(festival.days)}`}
    >
      {photo ? (
        <img src={photo.url} alt="" loading="lazy" className="w-5 h-5 rounded-full object-cover shrink-0" />
      ) : (
        <span className="w-5 h-5 flex items-center justify-center shrink-0 text-sm">{festival.emoji}</span>
      )}
      <span className="font-serif font-semibold text-[13px] leading-none">{festival.name}</span>
      <span className="opacity-70 text-[11px] leading-none">· {urgencyLabel(festival.days)}</span>
    </div>
  )
}
