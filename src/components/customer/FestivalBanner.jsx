import { useNavigate } from 'react-router-dom'
import { UPCOMING_FESTIVALS } from '../../data/eventServicesData'
import { FESTIVALS } from '../../data/festivals'

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
  const navigate = useNavigate()

  const upcoming = UPCOMING_FESTIVALS
    .map(f => ({ ...f, days: daysUntil(f.date) }))
    .filter(f => f.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 9)

  // Late in the festival calendar this list empties out. It used to still
  // render its container, leaving a bare white strip with a bottom border
  // under the header on every single page.
  if (upcoming.length === 0) return null

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
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 hidden sm:block">
          Upcoming
        </span>

        {/* CSS marquee. The old version drove this with
            requestAnimationFrame writing `scrollLeft` ~60×/second, which
            (a) forced a synchronous layout every frame, (b) leaked its
            mouseenter/mouseleave listeners on unmount, and (c) fought
            any attempt to swipe the strip on a phone, since the next
            frame immediately snapped scroll position back. */}
        <div className="marquee-viewport flex-1 overflow-hidden min-w-0">
          <div
            className="marquee-track gap-2"
            style={{ '--marquee-duration': `${Math.max(20, upcoming.length * 5)}s` }}
          >
            {/* Duplicated once so the loop point is seamless. aria-hidden
                on the copy keeps screen readers from reading it twice. */}
            {upcoming.map(f => (
              <FestivalChip key={f.id} festival={f} onClick={() => goToFestival(f.id)} />
            ))}
            {upcoming.map(f => (
              <FestivalChip key={`dup-${f.id}`} festival={f} onClick={() => goToFestival(f.id)} ariaHidden />
            ))}
          </div>
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

// Emoji, not a photo. This strip renders on every page, and each chip
// used to fire its own Unsplash search — 18 requests (9 festivals × the
// duplicated track) per navigation, for 20px circles nobody can make out
// anyway, against a 50-request/hour quota shared with the whole site.
function FestivalChip({ festival, onClick, ariaHidden = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-hidden={ariaHidden || undefined}
      tabIndex={ariaHidden ? -1 : 0}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shrink-0 cursor-pointer hover:shadow-sm transition-shadow ${urgencyColor(festival.days)}`}
    >
      <span className="text-sm leading-none">{festival.emoji}</span>
      <span className="font-serif font-semibold text-[13px] leading-none">{festival.name}</span>
      <span className="opacity-70 text-[11px] leading-none">· {urgencyLabel(festival.days)}</span>
    </button>
  )
}
