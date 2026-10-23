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

const OCCASIONS = {
  life: ['Birthday Party','First Birthday','Kids’ Birthday Party','Teen Birthday Party','Milestone Birthday','Surprise Birthday Party','Wedding Anniversary','Silver Jubilee Anniversary','Golden Jubilee Anniversary','Engagement Celebration','Marriage Proposal','Valentine’s Day Celebration','Baby Shower','Gender Reveal Party','Naming Ceremony','Cradle Ceremony','Rice-Feeding Ceremony','Housewarming Ceremony','Retirement Party','Graduation Celebration','Family Reunion','Friends’ Get-Together','Farewell Party','Bachelor Party','Bachelorette Party','Bridal Shower','Private Dinner Party','Children’s Theme Party','Pet Birthday Party','Memorial Gathering','Celebration of Life'],
  weddings: ['Roka Ceremony','Pre-Engagement Celebration','Engagement Ceremony','Haldi Ceremony','Mehendi Ceremony','Sangeet Night','Cocktail Party','Baraat Procession','Jaimala Ceremony','Wedding Ceremony','Muhurtham Ceremony','Pellikuthuru Ceremony','Pellikoduku Ceremony','Wedding Reception','Post-Wedding Celebration','Destination Wedding','Intimate Wedding','Bridal Entry','Griha Pravesh After Wedding'],
  festivals: ['Diwali Celebration','Ganesh Chaturthi','Navratri Celebration','Durga Puja','Dussehra Celebration','Holi Festival','Ugadi Celebration','Gudi Padwa','Onam Celebration','Pongal Celebration','Sankranti Festival','Vishu Celebration','Eid Celebration','Ramadan Iftar Gathering','Christmas Celebration','New Year Celebration','Gurpurab Celebration','Janmashtami Celebration','Maha Shivaratri','Saraswati Puja','Independence Day Celebration','Republic Day Celebration','Regional Cultural Festival','Traditional Community Festival'],
  school: ['School Annual Day','School Sports Day','School Graduation','Kindergarten Graduation','School Farewell','Freshers’ Welcome','Teachers’ Day Celebration','Children’s Day Celebration','Science Exhibition','Art and Craft Exhibition','School Cultural Day','School Talent Show','School Debate Competition','School Awards Ceremony','Parent-Teacher Gathering','School Reunion','School Fundraiser','School Carnival','Career Day','School Project Exhibition'],
  college: ['College Fest','Freshers’ Party','College Farewell','Convocation Ceremony','Graduation Party','Technical Fest','Hackathon','College Cultural Fest','Intercollege Competition','College Sports Meet','Alumni Meet','College Concert','College Fashion Show','Debate Competition','Student Awards Night','Entrepreneurship Summit','Campus Recruitment Event','College Club Meetup','Innovation Showcase','Youth Festival'],
  corporate: ['Corporate Annual Day','Corporate Conference','Business Summit','Product Launch','Brand Launch','Store Opening','Office Inauguration','Board Meeting','Annual General Meeting','Dealer Meet','Distributor Conference','Employee Awards Night','Employee Appreciation Event','Team-Building Event','Corporate Retreat','Leadership Summit','Investor Meet','Networking Event','Trade Partner Meet','Corporate Family Day','Corporate Sports Day','Training Workshop','Press Conference','Media Launch','Business Expo','Industry Convention','Recruitment Drive','Company Milestone Celebration','Corporate Town Hall','Sales Kick-Off','Client Appreciation Event','Franchise Meet','Business Anniversary','Strategic Planning Offsite','Partner Summit'],
  nightlife: ['Live Concert','DJ Night','EDM Festival','Bollywood Night','Techno Night','Live Band Performance','Acoustic Music Night','Karaoke Night','Stand-Up Comedy Show','Open Mic Night','Poetry Night','Dance Performance','Celebrity Appearance','Pub Party','Brewery Event','Rooftop Party','Pool Party','Lounge Night','Nightclub Theme Party','Silent Disco','Music Festival','Battle of the Bands','Cultural Music Night','Food and Music Night','Live Orchestra','Jazz Night','Tribute Concert','Comedy Festival','Dance Battle','Underground Music Event','College Music Night'],
  public: ['Public Festival','Fashion Show','Film Premiere','Film Screening','Theatre Performance','Art Exhibition','Photography Exhibition','Flea Market','Comic Convention','Gaming Convention','Auto Expo','Fireworks Show','Public Carnival','Street Performance Festival','Dance Festival','Literary Festival','Book Launch','Awards Ceremony','Charity Gala','Public Awareness Event','Magic Show','Circus Performance','Cultural Showcase','Talent Competition','Light and Sound Show','Immersive Experience','Fan Convention','Cosplay Event'],
  sports: ['Cricket Tournament','Football Tournament','Badminton Tournament','Marathon','Cycling Event','Corporate Sports Tournament','School Sports Competition','Esports Tournament','Fitness Bootcamp','Yoga Workshop','Meditation Retreat','Wellness Retreat','Martial Arts Competition','Swimming Competition','Sports Awards Ceremony','Community Fitness Day','Basketball Tournament','Volleyball Tournament','Kabaddi Tournament','Running Club Meetup','Adventure Sports Event','Fitness Challenge','Gym Launch Event','Sports Fan Gathering','Charity Run','Dance Fitness Workshop'],
  food: ['Food Festival','Street Food Festival','Restaurant Opening','Restaurant Anniversary','Chef’s Table Experience','Wine and Food Evening','Culinary Workshop','Bakery Launch','Food Tasting Event','Pop-Up Dining Experience','BBQ Party','Brunch Gathering','Private Chef Dinner','Coffee Festival','Dessert Festival','Cooking Competition','Baking Workshop','Brewery Tasting Event','Farm-to-Table Dinner','Food Truck Festival','Catering Showcase','Hospitality Food Expo'],
  retail: ['Shopping Festival','Retail Store Launch','Shopping Mall Event','Fashion Pop-Up','Fashion Exhibition','Luxury Brand Showcase','Designer Collection Launch','Jewellery Exhibition','Beauty and Makeup Workshop','Product Demonstration','Customer Appreciation Event','Seasonal Sale Event','Lifestyle Expo','Home Decor Exhibition','Interior Design Showcase','Artisan Market','Handicraft Exhibition','Wedding Expo','Lifestyle Workshop','Beauty Pageant'],
  property: ['Property Launch','Real Estate Exhibition','Property Open House','New Project Inauguration','Hotel Opening','Resort Launch','Hospitality Awards Night','Luxury Property Showcase','Home Interior Reveal','Architecture Exhibition','Smart Home Showcase','Hotel Anniversary','Travel Trade Meet','Tourism Expo','Holiday Resort Celebration'],
  community: ['Government Inauguration','Public Consultation','Civic Awareness Campaign','Community Gathering','Community Cultural Day','NGO Fundraiser','Charity Auction','Blood Donation Camp','Volunteer Appreciation Event','Environmental Awareness Event','Tree-Planting Drive','Community Service Day','Public Health Awareness Event','Social Impact Summit','Fundraising Gala','Community Cleanup Drive','Disaster Relief Fundraiser','Public Grievance Meeting','Local Residents’ Association Meeting','Community Sports Day','Neighbourhood Festival','Civic Award Ceremony','Public Safety Awareness Programme'],
  industry: ['Technology Summit','AI and Innovation Conference','Startup Demo Day','Investor Pitch Event','Healthcare Conference','Medical Workshop','Education Summit','Academic Conference','Research Symposium','Agriculture Expo','Manufacturing Expo','Logistics Summit','Automotive Conference','Banking and Finance Summit','Sustainability Conference','Architecture Conference','Legal Conference','Hospitality Industry Summit','Franchise Expo','Professional Networking Meet','Cybersecurity Conference','Data Science Conference','Developer Conference','Robotics Exhibition','Clean Energy Summit','Biotechnology Conference','Supply Chain Conference','Aviation Expo','Pharmaceutical Conference','Telecommunications Summit','Mining and Infrastructure Expo'],
  themed: ['Halloween Party','Christmas Party','New Year’s Eve Party','Valentine’s Party','Retro Theme Party','Masquerade Ball','Black-Tie Gala','White Party','Neon Party','Costume Party','Garden Party','Beach Party','Poolside Party','Casino Theme Night','Great Gatsby Party','Carnival Theme Party','Glow Party','Rooftop Celebration','Outdoor Movie Night','Summer Party','Winter Wonderland Party','Tropical Theme Party','Arabian Nights Theme Party','Space Theme Party','Decades Theme Party','Murder Mystery Party','Pajama Party','Silent Party','Enchanted Garden Party'],
  outdoor: ['Destination Celebration','Beach Wedding','Garden Wedding','Resort Celebration','Camping Gathering','Adventure Club Meetup','Outdoor Concert','Open-Air Cinema','Scenic Picnic Event','Destination Birthday','Travel Community Meetup','Outdoor Festival','Heritage Celebration','Cultural Tourism Event','Mountain Retreat','Luxury Yacht Party','Boat Cruise Celebration','Nature Retreat','Glamping Experience','Outdoor Adventure Challenge','Destination Anniversary','Sunset Celebration','Stargazing Gathering','Road Trip Meetup'],
  virtual: ['Virtual Conference','Hybrid Conference','Online Workshop','Virtual Product Launch','Webinar','Virtual Awards Ceremony','Hybrid Corporate Town Hall','Online Graduation Celebration','Virtual Family Reunion','Livestream Concert','Virtual Networking Event','Online Training Session','Hybrid Trade Show','Virtual Career Fair','Online Hackathon','Virtual Fundraiser','Hybrid Wedding','Virtual Birthday Celebration','Online Community Meetup','Livestream Product Demonstration'],
  special: ['Surprise Celebration','Romantic Dinner','Anniversary Dinner','Proposal Setup','Private Screening','Luxury Picnic','Candlelight Dinner','Personalised Theme Party','VIP Celebration','Exclusive House Party','Private Music Performance','Intimate Garden Dinner','Luxury Rooftop Dinner','Private Karaoke Party','Family Celebration Dinner','Milestone Achievement Party','Welcome Home Party','Going-Away Party','Reunion Dinner','Graduation Dinner']
}

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
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || mode !== 'celebrations' || selectedCategory) return CATEGORIES
    return CATEGORIES.filter(item => `${item.title} ${item.short} ${item.query}`.toLowerCase().includes(q))
  }, [query, mode, selectedCategory])

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SERVICE_CARDS
    return SERVICE_CARDS.filter(item => `${item.name} ${item.group}`.toLowerCase().includes(q))
  }, [query])

  const firstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0]
  const avatar = profile?.avatar_url || profile?.photo_url || user?.user_metadata?.avatar_url

  const goToCategory = category => {
    setSelectedCategory(category)
    setQuery('')
  }

  const selectedOccasions = selectedCategory ? (OCCASIONS[selectedCategory.id] || []) : []
  const filteredOccasions = selectedOccasions.filter(occasion => !query.trim() || occasion.toLowerCase().includes(query.trim().toLowerCase()))
  const chooseOccasion = occasion => navigate(`/plan?occasion=${encodeURIComponent(occasion)}&category=${encodeURIComponent(selectedCategory?.id || '')}`)

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
          onClick={() => { setMode('celebrations'); setSelectedCategory(null); setQuery('') }}
        >
          <span className="sambramo-mode-icon"><Sparkles size={20} /></span>
          <span><strong>Celebrations</strong><small>Make a moment special</small></span>
        </button>
        <button
          role="tab"
          aria-selected={mode === 'services'}
          className={mode === 'services' ? 'is-active' : ''}
          onClick={() => { setMode('services'); setSelectedCategory(null); setQuery('') }}
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
            placeholder={mode === 'celebrations' ? (selectedCategory ? `Search ${selectedCategory.title.toLowerCase()} occasions…` : 'Search birthdays, weddings, festivals…') : 'Search photography, catering, décor…'}
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
            <h2>{mode === 'celebrations' ? (selectedCategory ? selectedCategory.title : 'Explore 18 categories') : 'Explore all services'}</h2>
          </div>
          {selectedCategory && mode === 'celebrations' ? <button onClick={() => { setSelectedCategory(null); setQuery('') }}><ChevronDown size={16} /> All categories</button> : <button onClick={() => navigate(mode === 'celebrations' ? '/plan' : '/services')}>View all <ChevronRight size={17} /></button>}
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
