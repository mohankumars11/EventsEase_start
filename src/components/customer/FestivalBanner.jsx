import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { UPCOMING_FESTIVALS } from '../../data/eventServicesData'

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
  if (days <= 7)  return `${days} days`
  if (days <= 30) return `${days} days`
  return `${days} days`
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

  // Only a handful of festivals have a full detail page today (festivals.js) —
  // route to it when one exists, otherwise fall back to festival shopping.
  const DETAIL_PAGE_IDS = { 'Ganesh Chaturthi': 'ganesh-chaturthi', 'Navratri': 'navratri', 'Diwali': 'diwali', 'Christmas': 'christmas' }
  function goToFestival(name) {
    const id = DETAIL_PAGE_IDS[name]
    navigate(id ? `/festivals/${id}` : '/shop/Pooja%20%26%20Essentials')
  }

  return (
    <div className="bg-white border-b border-orange-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 hidden sm:block">Upcoming</span>
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide"
          style={{ scrollBehavior: 'auto' }}
        >
          {/* Duplicate for seamless loop */}
          {[...upcoming, ...upcoming].map((f, i) => (
            <div
              key={i}
              onClick={() => goToFestival(f.name)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shrink-0 cursor-pointer hover:shadow-sm transition-shadow ${urgencyColor(f.days)}`}
            >
              <span>{f.emoji}</span>
              <span>{f.name}</span>
              <span className="opacity-70">· {urgencyLabel(f.days)}</span>
            </div>
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
