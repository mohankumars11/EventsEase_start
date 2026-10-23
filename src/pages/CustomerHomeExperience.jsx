import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, ChevronDown, UserRound, Search, SlidersHorizontal,
  Sparkles, Wrench, ArrowRight, ChevronRight, CalendarDays,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCity } from '../context/CityContext'
import { SERVICE_GROUPS } from '../data/servicePricing'
import './CustomerHomeExperience.css'

const CATEGORIES = [
  { id: 'life', title: 'Personal Celebrations', short: 'Life’s Milestones', emoji: '🎂', tone: 'rose', query: 'birthday, anniversary, family milestones' },
  { id: 'weddings', title: 'Indian Weddings', short: 'Weddings & Ceremonies', emoji: '💐', tone: 'peach', query: 'wedding, engagement, traditional ceremonies' },
  { id: 'festivals', title: 'Religious & Cultural', short: 'Festivals & Culture', emoji: '🪔', tone: 'saffron', query: 'Diwali, Indian festivals, family traditions' },
  { id: 'school', title: 'School Events', short: 'School Events', emoji: '🎒', tone: 'sky', query: 'school annual day, student celebrations' },
  { id: 'college', title: 'College & University', short: 'College & University', emoji: '🎓', tone: 'lavender', query: 'college graduation, campus festivals' },
  { id: 'corporate', title: 'Corporate & Business', short: 'Corporate & Business', emoji: '🏆', tone: 'ice', query: 'corporate award, business conference' },
  { id: 'nightlife', title: 'Live Entertainment', short: 'Live Entertainment', emoji: '🎤', tone: 'pink', query: 'live music, DJ night, entertainment' },
  { id: 'public', title: 'Public Shows', short: 'Public & Cultural Shows', emoji: '🎭', tone: 'lilac', query: 'public show, theatre, cultural performance' },
  { id: 'sports', title: 'Sports & Wellness', short: 'Sports, Fitness & Wellness', emoji: '🏅', tone: 'mint', query: 'sports tournament, fitness, wellness' },
  { id: 'food', title: 'Food & Dining', short: 'Food & Dining', emoji: '🍲', tone: 'cream', query: 'Indian chef, catering, dining event' },
  { id: 'retail', title: 'Retail & Lifestyle', short: 'Retail, Fashion & Lifestyle', emoji: '🛍️', tone: 'pink', query: 'fashion, retail launch, lifestyle event' },
  { id: 'property', title: 'Property & Real Estate', short: 'Property & Real Estate', emoji: '🏡', tone: 'mint', query: 'housewarming, real estate, new home' },
  { id: 'community', title: 'Community & Charity', short: 'Government, Community & Charity', emoji: '🌱', tone: 'sage', query: 'community gathering, charity, volunteering' },
  { id: 'industry', title: 'Industry & Professional', short: 'Industry & Professional', emoji: '🎙️', tone: 'ice', query: 'industry conference, innovation summit' },
  { id: 'themed', title: 'Seasonal & Themed Parties', short: 'Seasonal & Themed Parties', emoji: '🎭', tone: 'lavender', query: 'themed party, masquerade, costume celebration' },
  { id: 'outdoor', title: 'Travel & Outdoor', short: 'Travel & Outdoor', emoji: '🏕️', tone: 'sky', query: 'outdoor celebration, travel, picnic' },
  { id: 'virtual', title: 'Virtual & Hybrid', short: 'Virtual & Hybrid Events', emoji: '💻', tone: 'lilac', query: 'virtual event, hybrid conference, livestream' },
  { id: 'special', title: 'Special Occasions', short: 'Special & Private Experiences', emoji: '💝', tone: 'rose', query: 'romantic dinner, private proposal, special occasion' },
]

const SERVICE_EMOJI = {
  photography: '📸', videography: '🎥', 'anchor & mc': '🎤', anchor: '🎤',
  catering: '🍽️', food: '🍲', decoration: '🌸', decor: '🌷', music: '🎧',
  dj: '🎧', makeup: '💄', beauty: '💄', logistics: '🚚', transport: '🚐',
  venue: '🏛️', security: '🛡️', lighting: '💡', sound: '🔊', travel: '🧳',
  printing: '🖨️', cake: '🎂', gift: '🎁', balloon: '🎈', magician: '🪄',
}

const SERVICE_CARDS = (() => {
  const seen = new Set()
  return SERVICE_GROUPS.flatMap(group => (group.services || []).map(service => ({
    id: service.id,
    name: service.name,
    group: group.name || group.label || 'Event services',
    emoji: service.emoji || SERVICE_EMOJI[service.name?.toLowerCase()] || '✨',
  }))).filter(service => {
    if (!service.id || seen.has(service.id)) return false
    seen.add(service.id)
    return true
  })
})()

function getServiceEmoji(name, fallback) {
  const lower = String(name || '').toLowerCase()
  const match = Object.entries(SERVICE_EMOJI).find(([key]) => lower.includes(key))
  return match?.[1] || fallback || '✨'
}

function CategoryArtwork({ emoji, tone }) {
  return (
    <div className={`sambramo-art sambramo-art--${tone}`} aria-hidden="true">
      <span className="sambramo-art-orbit sambramo-art-orbit--one" />
      <span className="sambramo-art-orbit sambramo-art-orbit--two" />
      <span className="sambramo-art-spark sambramo-art-spark--one">✦</span>
      <span className="sambramo-art-spark sambramo-art-spark--two">✧</span>
      <span className="sambramo-art-emoji">{emoji}</span>
    </div>
  )
}

export default function CustomerHomeExperience() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { city, openCityPicker } = useCity()
  const [mode, setMode] = useState('celebrations')
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || mode !== 'celebrations') return CATEGORIES
    return CATEGORIES.filter(item => `${item.title} ${item.short} ${item.query}`.toLowerCase().includes(q))
  }, [query, mode])

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SERVICE_CARDS
    return SERVICE_CARDS.filter(item => `${item.name} ${item.group}`.toLowerCase().includes(q))
  }, [query])

  const firstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0]
  const avatar = profile?.avatar_url || profile?.photo_url || user?.user_metadata?.avatar_url

  const goToCategory = category => {
    navigate(`/plan?occasion=${encodeURIComponent(category.id)}`)
  }

  return (
    <div className="sambramo-home">
      <header className="sambramo-home-header">
        <button className="sambramo-location" onClick={openCityPicker} aria-label="Choose delivery city">
          <span className="sambramo-location-pin"><MapPin size={18} fill="currentColor" /></span>
          <span className="sambramo-location-copy">
            <span className="sambramo-eyebrow">YOUR LOCATION</span>
            <strong>{city || 'Choose your city'}</strong>
          </span>
          <ChevronDown size={17} strokeWidth={2.5} />
        </button>
        <button className="sambramo-avatar" onClick={() => navigate(user ? '/account' : '/login')} aria-label={firstName ? `Account for ${firstName}` : 'Open account'}>
          {avatar ? <img src={avatar} alt="" /> : <UserRound size={21} />}
        </button>
      </header>

      <div className="sambramo-mode-switch" role="tablist" aria-label="Choose what you need">
        <button
          role="tab"
          aria-selected={mode === 'celebrations'}
          className={mode === 'celebrations' ? 'is-active' : ''}
          onClick={() => { setMode('celebrations'); setQuery('') }}
        >
          <span className="sambramo-mode-icon"><Sparkles size={20} /></span>
          <span><strong>Celebrations</strong><small>Make a moment special</small></span>
        </button>
        <button
          role="tab"
          aria-selected={mode === 'services'}
          className={mode === 'services' ? 'is-active' : ''}
          onClick={() => { setMode('services'); setQuery('') }}
        >
          <span className="sambramo-mode-icon"><Wrench size={20} /></span>
          <span><strong>Book a Service</strong><small>One service. Right away.</small></span>
        </button>
      </div>

      <section className={`sambramo-hero sambramo-hero--${mode}`} aria-label={mode === 'celebrations' ? 'Celebrations' : 'Book a service'}>
        <div className="sambramo-hero-copy">
          <span className="sambramo-hero-kicker">{mode === 'celebrations' ? 'YOUR MOMENT. OUR MAGIC.' : 'GOOD PEOPLE. GREAT SERVICE.'}</span>
          <h1>{mode === 'celebrations' ? <>Make every<br />moment special.</> : <>Your event.<br />Handled beautifully.</>}</h1>
          <p>{mode === 'celebrations' ? 'From little joys to life’s biggest milestones.' : 'Find trusted professionals for the details that matter.'}</p>
          <button className="sambramo-hero-cta" onClick={() => navigate(mode === 'celebrations' ? '/plan' : '/book/instant')}>
            {mode === 'celebrations' ? 'Plan a celebration' : 'Book instantly'} <ArrowRight size={15} />
          </button>
        </div>
        <div className="sambramo-hero-art" aria-hidden="true">
          <span className="sambramo-hero-glow" />
          {mode === 'celebrations' ? (
            <>
              <span className="sambramo-hero-person sambramo-hero-person--dad">👨🏽</span>
              <span className="sambramo-hero-person sambramo-hero-person--child">👧🏽</span>
              <span className="sambramo-hero-person sambramo-hero-person--mom">👩🏽</span>
              <span className="sambramo-hero-cake">🎂</span>
              <span className="sambramo-confetti">✦ ✧ · ✦</span>
            </>
          ) : (
            <>
              <span className="sambramo-hero-person sambramo-hero-person--pro">🧑🏽‍🔧</span>
              <span className="sambramo-hero-tool">📸</span>
              <span className="sambramo-confetti">✦ ✧ · ✦</span>
            </>
          )}
        </div>
      </section>

      <div className="sambramo-search-wrap">
        <label className="sambramo-search">
          <Search size={20} />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={mode === 'celebrations' ? 'Search birthdays, weddings, festivals…' : 'Search photography, catering, décor…'}
            aria-label={mode === 'celebrations' ? 'Search celebrations and occasions' : 'Search services'}
          />
          <button type="button" onClick={() => setFiltersOpen(value => !value)} aria-label="Search options" aria-expanded={filtersOpen}>
            <SlidersHorizontal size={19} />
          </button>
        </label>
        {filtersOpen && (
          <div className="sambramo-search-hints">
            <span>Popular searches</span>
            {(mode === 'celebrations' ? ['Birthday', 'Wedding', 'Diwali'] : ['Photography', 'Catering', 'Decoration']).map(term => (
              <button key={term} onClick={() => { setQuery(term); setFiltersOpen(false) }}>{term}</button>
            ))}
          </div>
        )}
      </div>

      <section className="sambramo-catalogue">
        <div className="sambramo-section-heading">
          <div>
            <span className="sambramo-section-kicker">{mode === 'celebrations' ? 'FIND YOUR REASON' : 'ON-DEMAND PROFESSIONALS'}</span>
            <h2>{mode === 'celebrations' ? 'Explore 18 categories' : 'Explore all services'}</h2>
          </div>
          <button onClick={() => navigate(mode === 'celebrations' ? '/plan' : '/services')}>View all <ChevronRight size={17} /></button>
        </div>

        {mode === 'celebrations' ? (
          <div className="sambramo-category-grid">
            {filteredCategories.map(category => (
              <button className="sambramo-category-card" key={category.id} onClick={() => goToCategory(category)}>
                <CategoryArtwork emoji={category.emoji} tone={category.tone} />
                <span className="sambramo-category-title">{category.title}</span>
                <span className="sambramo-card-arrow"><ChevronRight size={15} /></span>
              </button>
            ))}
            {filteredCategories.length === 0 && <div className="sambramo-empty-search">No categories match “{query}”. Try a broader search.</div>}
          </div>
        ) : (
          <div className="sambramo-service-grid">
            {filteredServices.map(service => (
              <button className="sambramo-service-card" key={service.id} onClick={() => navigate('/book/instant')}>
                <CategoryArtwork emoji={getServiceEmoji(service.name, service.emoji)} tone="lavender" />
                <span>{service.name}</span>
                <ChevronRight size={14} />
              </button>
            ))}
            {filteredServices.length === 0 && <div className="sambramo-empty-search">No services match “{query}”. Try another term.</div>}
          </div>
        )}
      </section>

      <button className="sambramo-location-banner" onClick={openCityPicker}>
        <span className="sambramo-location-banner-icon"><MapPin size={22} fill="currentColor" /></span>
        <span className="sambramo-location-banner-copy"><strong>Explore 400+ locations</strong><small>Across cities, towns and beautiful destinations</small></span>
        <span className="sambramo-location-banner-art">🏰 🌴</span>
        <span className="sambramo-location-banner-arrow"><ArrowRight size={17} /></span>
      </button>

      <div className="sambramo-trust-line"><span>✦</span> Thoughtfully chosen professionals. Moments made easier.</div>
    </div>
  )
}
