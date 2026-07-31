import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Star, CheckCircle2, Users, CalendarCheck, ShieldCheck,
  Heart, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Lock, CreditCard, Headphones, Award, Sparkles, MapPin,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { FESTIVALS } from '../data/festivals'

/* ═══════════════════════════════════════════════════════════
   Static data
═══════════════════════════════════════════════════════════ */

const EVENT_CATEGORIES = [
  { emoji: '🎂', name: 'Birthday Party',    vendors: '1,200+ vendors', span: 'col-span-2 row-span-2', bg: 'from-amber-100 to-orange-200' },
  { emoji: '👶', name: 'Baby Shower',       vendors: '840+ vendors',   span: 'col-span-1',            bg: 'from-pink-100 to-rose-200'   },
  { emoji: '✨', name: 'Naming Ceremony',   vendors: '620+ vendors',   span: 'col-span-1',            bg: 'from-purple-100 to-violet-200'},
  { emoji: '💍', name: 'Anniversary',       vendors: '950+ vendors',   span: 'col-span-2',            bg: 'from-rose-100 to-pink-200'   },
  { emoji: '🏠', name: 'Housewarming',      vendors: '710+ vendors',   span: 'col-span-1',            bg: 'from-emerald-100 to-green-200'},
  { emoji: '🥂', name: 'Get-Together',      vendors: '530+ vendors',   span: 'col-span-1',            bg: 'from-blue-100 to-indigo-200' },
]

const STATS = [
  { value: 10000, suffix: '+',  label: 'Verified Vendors',       icon: ShieldCheck },
  { value: 50000, suffix: '+',  label: 'Happy Celebrations',     icon: Star        },
  { value: 150,   suffix: '+',  label: 'Cities Across India',    icon: MapPin      },
  { value: 4.9,   suffix: '★', label: 'Average Rating',         icon: Award       },
]

const PROVIDERS = [
  { name: "Meena's Decoration Studio", category: 'Decoration & Styling',  city: 'Mumbai',    rating: 4.9, price: 'From ₹8,000',   gradient: 'from-pink-400 to-rose-500',     emoji: '🎀' },
  { name: 'Royal Feast Catering',      category: 'Catering & Food',       city: 'Delhi',     rating: 4.8, price: 'From ₹250/plate', gradient: 'from-amber-400 to-orange-500', emoji: '🍽️' },
  { name: 'Kapoor Photography',        category: 'Photography',           city: 'Bengaluru', rating: 4.9, price: 'From ₹12,000',  gradient: 'from-violet-400 to-purple-500', emoji: '📸' },
  { name: 'Beat Drop DJs',             category: 'Entertainment & Music', city: 'Mumbai',    rating: 4.7, price: 'From ₹15,000',  gradient: 'from-blue-400 to-indigo-500',  emoji: '🎵' },
  { name: "Celebration Cakes by Priya",category: 'Cakes & Desserts',      city: 'Pune',      rating: 4.8, price: 'From ₹1,200',   gradient: 'from-emerald-400 to-teal-500', emoji: '🎂' },
  { name: 'Majestic Venues',           category: 'Venue & Lawns',         city: 'Hyderabad', rating: 4.9, price: 'From ₹25,000',  gradient: 'from-crimson-400 to-rose-600', emoji: '🏛️' },
]

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    event: 'Birthday Party',
    city: 'Mumbai',
    rating: 5,
    quote: 'EventEase made my daughter\'s first birthday absolutely magical. The decorator arrived on time, the catering was outstanding, and the photographer captured every priceless moment. I couldn\'t have done it without this platform!',
    avatar: 'PS',
    bg: 'bg-rose-500',
  },
  {
    name: 'Rahul & Neha Gupta',
    event: '10th Anniversary',
    city: 'Delhi',
    rating: 5,
    quote: 'We found the perfect decorator within hours of signing up. The vendor was professional, creative, and went beyond our expectations. Our anniversary dinner looked like something out of a dream. Highly recommend!',
    avatar: 'RG',
    bg: 'bg-violet-500',
  },
  {
    name: 'Meera Krishnan',
    event: 'Baby Shower',
    city: 'Chennai',
    rating: 5,
    quote: 'Every vendor we booked through EventEase was professional, warm, and genuinely invested in making our baby shower special. The catering team even included a surprise traditional Tamil spread that moved my mother to tears.',
    avatar: 'MK',
    bg: 'bg-emerald-500',
  },
  {
    name: 'Arjun Mehta',
    event: 'Corporate Team Event',
    city: 'Bengaluru',
    rating: 5,
    quote: 'The catering team exceeded every single expectation. 200 people, flawless execution, and a menu that had everyone asking for the vendor\'s contact. EventEase has become our go-to for every company event.',
    avatar: 'AM',
    bg: 'bg-marigold-500',
  },
]

const FAQS = [
  {
    q: 'How does EventEase work?',
    a: 'EventEase connects you with verified local event vendors. Simply tell us about your event — type, date, city, and budget — then browse matching vendors with real photos, reviews, and pricing. Request quotes, compare, and book directly through the platform.',
  },
  {
    q: 'Are all vendors verified?',
    a: 'Yes. Every vendor on EventEase goes through a multi-step verification: business registration check, identity verification, portfolio review, and initial ratings from our internal quality team. We also continuously monitor reviews.',
  },
  {
    q: 'How do I get quotes from vendors?',
    a: 'After browsing vendor profiles, click "Request Quote." Describe your event details and the vendor responds within 24 hours. You can request quotes from multiple vendors simultaneously and compare them side by side.',
  },
  {
    q: 'What\'s the cancellation policy?',
    a: 'Cancellation policies vary by vendor, but all are clearly displayed before you book. For most bookings, full refunds are available 7 or more days before the event date. Our support team will help resolve any disputes.',
  },
  {
    q: 'Can I book multiple vendors for one event?',
    a: 'Absolutely! Most of our customers book 2–4 vendors per event (e.g., decoration + catering + photography). Your EventEase dashboard shows all your bookings in one place, making coordination easy.',
  },
  {
    q: 'Is EventEase available in my city?',
    a: 'We currently serve 150+ cities across India, including all metros and tier-2 cities. Type your city in the search bar — if we don\'t have vendors there yet, you can join the waitlist and we\'ll notify you when we expand.',
  },
]

const TRUST_CARDS = [
  {
    icon: Lock,
    title: 'Verified Vendors Only',
    desc: 'Every vendor is background-checked, portfolio-reviewed, and monitored through our quality program.',
    bg: 'from-amber-50 to-orange-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    icon: CreditCard,
    title: 'Secure Payments',
    desc: 'Escrow-protected payments released only after your event. Full refund guarantee if something goes wrong.',
    bg: 'from-emerald-50 to-teal-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    desc: 'Dedicated event coordinators available round the clock. Call, chat, or WhatsApp — we\'re always here.',
    bg: 'from-violet-50 to-purple-50',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    icon: Award,
    title: 'Quality Guaranteed',
    desc: 'Our vendors maintain a minimum 4.5★ average or they\'re removed. Currently averaging 4.9★ across the platform.',
    bg: 'from-rose-50 to-pink-50',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
]

const CITY_LOGOS = [
  'Mumbai Events', 'Delhi Weddings', 'Bangalore Parties',
  'Chennai Moments', 'Hyderabad Feasts', 'Pune Celebrations',
]

/* ═══════════════════════════════════════════════════════════
   Animated count-up hook
═══════════════════════════════════════════════════════════ */
function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!start) return
    if (target < 10) {
      // For decimal (rating), animate directly
      let startTime = null
      const step = (ts) => {
        if (!startTime) startTime = ts
        const progress = Math.min((ts - startTime) / duration, 1)
        setCount(+(progress * target).toFixed(1))
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    } else {
      let startTime = null
      const step = (ts) => {
        if (!startTime) startTime = ts
        const progress = Math.min((ts - startTime) / duration, 1)
        setCount(Math.floor(progress * target))
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
  }, [target, duration, start])

  return count
}

/* ═══════════════════════════════════════════════════════════
   Stat item with count-up
═══════════════════════════════════════════════════════════ */
function StatItem({ stat, started }) {
  const count = useCountUp(stat.value, 1800, started)
  const Icon  = stat.icon

  const formatted = stat.value >= 10000
    ? (count / 1000).toFixed(0) + 'k'
    : stat.value >= 1000
      ? count.toLocaleString('en-IN')
      : count

  return (
    <div className="text-center">
      <div className="flex justify-center mb-3">
        <Icon size={28} className="text-marigold-400" />
      </div>
      <div className="text-4xl sm:text-5xl font-extrabold text-white mb-1 tabular-nums">
        {formatted}{stat.suffix}
      </div>
      <div className="text-gray-400 text-sm">{stat.label}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Main Landing Page
═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  useScrollReveal()
  const { user, profile } = useAuth()
  const navigate          = useNavigate()

  const [activeTab,       setActiveTab]       = useState('customer')
  const [testimonialIdx,  setTestimonialIdx]  = useState(0)
  const [openFaq,         setOpenFaq]         = useState(null)
  const [statsStarted,    setStatsStarted]    = useState(false)
  const [likedVendors,    setLikedVendors]    = useState({})
  const [searchState,     setSearchState]     = useState({ type: '', city: '', date: '' })

  const statsRef = useRef(null)

  /* ── Intersection observer for stats ─────────────── */
  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsStarted(true); obs.disconnect() } },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  /* ── Auto-advance testimonials ───────────────────── */
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  function dashLink() {
    if (!profile) return '/signup'
    if (profile.role === 'vendor') return '/dashboard/vendor'
    return '/dashboard/customer'
  }

  function handleFind() {
    navigate(user ? '/dashboard/customer/browse' : '/signup')
  }

  function toggleLike(name) {
    setLikedVendors(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const t = TESTIMONIALS[testimonialIdx]

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ══════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 pt-16 pb-24 px-4">

        {/* Animated blobs */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-marigold-200 opacity-40 blob pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-rose-200 opacity-30 blob pointer-events-none" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-100 opacity-20 blob pointer-events-none" style={{ animationDelay: '4s' }} />

        {/* Floating emojis */}
        <span className="absolute left-[5%] top-24 text-3xl float pointer-events-none select-none" style={{ animationDelay: '0s' }}>🎉</span>
        <span className="absolute right-[8%] top-32 text-4xl float pointer-events-none select-none" style={{ animationDelay: '1s' }}>🪔</span>
        <span className="absolute left-[12%] bottom-24 text-3xl float pointer-events-none select-none" style={{ animationDelay: '0.5s' }}>🌺</span>
        <span className="absolute right-[15%] bottom-16 text-2xl float pointer-events-none select-none" style={{ animationDelay: '1.5s' }}>🎂</span>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-orange-200 text-marigold-700 text-sm font-semibold rounded-full px-4 py-1.5 mb-6 shadow-sm">
            <span>🎊</span> India's #1 Celebration Marketplace
          </div>

          {/* H1 */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.08] mb-6">
            Your perfect celebration,{' '}
            <span className="gradient-text">beautifully planned</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect with 10,000+ verified vendors for decorations, catering, photography, and more —
            all in one place, from baby showers to grand Diwali nights.
          </p>

          {/* Search bar */}
          <div className="bg-white rounded-2xl shadow-xl border border-orange-100 p-3 max-w-3xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={searchState.type}
                onChange={e => setSearchState(p => ({ ...p, type: e.target.value }))}
                className="flex-1 px-4 py-2.5 text-sm text-gray-700 bg-orange-50 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-marigold-400 appearance-none cursor-pointer"
              >
                <option value="">🎉 Event type</option>
                <option>Birthday Party</option>
                <option>Baby Shower</option>
                <option>Anniversary</option>
                <option>Naming Ceremony</option>
                <option>Housewarming</option>
                <option>Get-Together</option>
              </select>

              <select
                value={searchState.city}
                onChange={e => setSearchState(p => ({ ...p, city: e.target.value }))}
                className="flex-1 px-4 py-2.5 text-sm text-gray-700 bg-orange-50 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-marigold-400 appearance-none cursor-pointer"
              >
                <option value="">📍 Your city</option>
                {['Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad','Jaipur','Surat'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <input
                type="date"
                value={searchState.date}
                onChange={e => setSearchState(p => ({ ...p, date: e.target.value }))}
                className="flex-1 px-4 py-2.5 text-sm text-gray-700 bg-orange-50 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-marigold-400"
              />

              <button
                onClick={handleFind}
                className="btn-primary px-6 py-2.5 shrink-0 text-sm"
              >
                Find Vendors <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            {['Free to browse', '10,000+ vendors', 'Verified & insured'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-marigold-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          2. TRUSTED-BY LOGOS STRIP
      ══════════════════════════════════════════════ */}
      <section className="py-10 px-4 bg-white border-y border-orange-100">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
            Trusted by families across India
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {CITY_LOGOS.map(name => (
              <span
                key={name}
                className="px-5 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm font-semibold text-gray-400 tracking-tight"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. CATEGORY BENTO
      ══════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-cream">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 reveal">
            <h2 className="section-title">What are you celebrating?</h2>
            <p className="section-subtitle">Thousands of vendors for every special occasion</p>
          </div>

          {/* Asymmetric bento grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[140px] md:auto-rows-[160px]">
            {EVENT_CATEGORIES.map(({ emoji, name, vendors, span, bg }, i) => (
              <Link
                key={name}
                to={user ? dashLink() : '/signup'}
                className={`reveal reveal-delay-${Math.min(i + 1, 4)} ${span} group relative rounded-2xl overflow-hidden bg-gradient-to-br ${bg} border border-white/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer`}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <span className="text-4xl md:text-5xl mb-2 group-hover:scale-110 transition-transform duration-300">
                    {emoji}
                  </span>
                  <span className="font-bold text-gray-800 text-base leading-tight">{name}</span>
                  <span className="text-xs text-gray-500 mt-1">{vendors}</span>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/10 transition-colors duration-300 flex items-end p-3 opacity-0 group-hover:opacity-100">
                  <span className="text-xs font-semibold text-gray-700 bg-white/80 px-2 py-1 rounded-full ml-auto">
                    Browse vendors →
                  </span>
                </div>
              </Link>
            ))}
            {/* More card */}
            <Link
              to="/signup"
              className="col-span-2 md:col-span-2 group relative rounded-2xl overflow-hidden bg-gradient-to-br from-marigold-50 to-orange-100 border-2 border-dashed border-marigold-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center p-4 text-center"
            >
              <span className="text-4xl mb-2">✦</span>
              <span className="font-bold text-marigold-700">& many more</span>
              <span className="text-xs text-marigold-500 mt-1">Explore all categories</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. STATS STRIP (animated count-up)
      ══════════════════════════════════════════════ */}
      <section
        ref={statsRef}
        className="py-16 px-4 bg-gradient-to-br from-gray-900 to-gray-800"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(stat => (
            <StatItem key={stat.label} stat={stat} started={statsStarted} />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5. FEATURED PROVIDERS (horizontal scroll)
      ══════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8 reveal">
            <div>
              <h2 className="section-title">Top-Rated Vendors Near You</h2>
              <p className="section-subtitle">Verified, reviewed, and ready to make your event special</p>
            </div>
            <Link to="/signup" className="hidden sm:flex items-center gap-1 text-marigold-600 font-semibold text-sm hover:gap-2 transition-all">
              View all <ArrowRight size={15} />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
            {PROVIDERS.map((p, i) => (
              <div
                key={p.name}
                className={`reveal reveal-delay-${Math.min(i + 1, 4)} shrink-0 w-64 bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden`}
              >
                {/* Image placeholder */}
                <div className={`h-40 bg-gradient-to-br ${p.gradient} flex items-center justify-center text-5xl relative`}>
                  {p.emoji}
                  <span className="absolute top-3 left-3 bg-white/90 text-xs font-bold text-emerald-600 px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                  <button
                    onClick={() => toggleLike(p.name)}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Heart
                      size={13}
                      className={likedVendors[p.name] ? 'text-red-500 fill-red-500' : 'text-gray-400'}
                    />
                  </button>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight mb-0.5">{p.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{p.category}</p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <Star size={11} className="fill-amber-400 text-amber-400" /> {p.rating}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={10} /> {p.city}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-marigold-700">{p.price}</span>
                    <Link
                      to="/signup"
                      className="text-xs font-semibold text-marigold-600 hover:text-marigold-800 transition-colors"
                    >
                      View profile →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          6. FESTIVAL SECTION
      ══════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 reveal">
            <span className="inline-block bg-marigold-100 text-marigold-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              🎊 Festival Planning
            </span>
            <h2 className="section-title">Celebrate Every Festival in Style</h2>
            <p className="section-subtitle max-w-2xl mx-auto">
              From the lights of Diwali to the colors of Holi — discover traditional foods, sacred rituals,
              and trusted vendors for every festival on India's golden calendar
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {FESTIVALS.map((f, i) => (
              <FestivalCard key={f.id} festival={f} delay={Math.min(i + 1, 4)} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          7. HOW IT WORKS (2-tab toggle)
      ══════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 reveal">
            <h2 className="section-title">How EventEase Works</h2>
            <p className="section-subtitle">Simple steps to your perfect celebration</p>
          </div>

          {/* Toggle */}
          <div className="flex justify-center mb-12 reveal">
            <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
              {['customer', 'vendor'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                    activeTab === tab
                      ? 'bg-white shadow text-marigold-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'customer' ? '🛍️ For Customers' : '🏪 For Vendors'}
                </button>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-10 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-0.5 bg-gradient-to-r from-marigold-200 via-marigold-400 to-marigold-200 hidden md:block" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {(activeTab === 'customer'
                ? [
                    { step: '01', title: 'Browse Events', desc: 'Tell us your event type, city, date, and budget. Browse matching vendors in seconds.', icon: CalendarCheck },
                    { step: '02', title: 'Compare Vendors', desc: 'See real photos, verified reviews, and transparent pricing. Request quotes instantly.', icon: Users },
                    { step: '03', title: 'Book & Celebrate', desc: 'Confirm your booking securely and relax. We handle follow-up so you can focus on celebrating.', icon: ShieldCheck },
                  ]
                : [
                    { step: '01', title: 'Create Profile', desc: 'Sign up free, upload your portfolio, and set your service areas. Takes under 10 minutes.', icon: Sparkles },
                    { step: '02', title: 'Get Inquiries', desc: 'Customers searching for your services see your profile. Respond to quotes and win business.', icon: Users },
                    { step: '03', title: 'Grow Business', desc: 'Build your reputation with reviews, upgrade your plan for more visibility, and grow faster.', icon: Award },
                  ]
              ).map(({ step, title, desc, icon: Icon }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div className="relative w-20 h-20 bg-marigold-100 rounded-2xl flex items-center justify-center mb-4 z-10">
                    <Icon size={28} className="text-marigold-600" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-marigold-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                      {step}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-12 reveal">
            <Link to="/signup" className="btn-primary px-8 py-3 text-base">
              {activeTab === 'customer' ? 'Start Planning Free' : 'Join as a Vendor'} <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          8. TESTIMONIALS CAROUSEL
      ══════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-cream">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 reveal">
            <h2 className="section-title">Stories from Happy Families</h2>
            <p className="section-subtitle">Real events, real love, real reviews</p>
          </div>

          <div className="relative bg-white rounded-3xl shadow-xl border border-orange-100 p-8 md:p-12 reveal">
            {/* Stars */}
            <div className="flex items-center gap-1 mb-6">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
              ))}
            </div>

            {/* Quote */}
            <blockquote className="text-gray-700 text-lg leading-relaxed italic mb-8">
              "{t.quote}"
            </blockquote>

            {/* Author */}
            <div className="flex items-center gap-4">
              <span className={`w-12 h-12 rounded-full ${t.bg} flex items-center justify-center text-white font-bold text-base`}>
                {t.avatar}
              </span>
              <div>
                <p className="font-bold text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.event} · {t.city}</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <div className="flex gap-2">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTestimonialIdx(i)}
                    className={`rounded-full transition-all ${
                      i === testimonialIdx
                        ? 'w-6 h-2.5 bg-marigold-500'
                        : 'w-2.5 h-2.5 bg-gray-200 hover:bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTestimonialIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:text-marigold-600 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length)}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:text-marigold-600 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          9. WHY CHOOSE US
      ══════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 reveal">
            <h2 className="section-title">Why Families Choose EventEase</h2>
            <p className="section-subtitle">Built on trust, powered by love for celebrations</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TRUST_CARDS.map((card, i) => {
              const Icon = card.icon
              return (
                <div
                  key={card.title}
                  className={`reveal reveal-delay-${i + 1} rounded-2xl bg-gradient-to-br ${card.bg} border border-orange-100/50 p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}
                >
                  <div className={`w-11 h-11 ${card.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon size={20} className={card.iconColor} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{card.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{card.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          10. DUAL CTA BANNER
      ══════════════════════════════════════════════ */}
      <section className="py-4 px-4 bg-cream reveal">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer CTA */}
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-8 text-center md:text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 text-8xl opacity-10 pointer-events-none select-none">🎉</div>
            <div className="relative">
              <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">For customers</p>
              <h3 className="text-2xl font-extrabold text-white mb-3 leading-tight">
                Ready to plan your perfect event?
              </h3>
              <p className="text-white/80 text-sm mb-6 leading-relaxed">
                Browse 10,000+ verified vendors across 150 cities. Free to use, no credit card needed.
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
              >
                Start Planning — It's Free <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Vendor CTA */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 text-center md:text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 text-8xl opacity-10 pointer-events-none select-none">🏪</div>
            <div className="relative">
              <p className="text-marigold-400 text-xs font-bold uppercase tracking-widest mb-2">For vendors</p>
              <h3 className="text-2xl font-extrabold text-white mb-3 leading-tight">
                Grow your event business
              </h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Join 10,000+ vendors already growing with EventEase. Free plan available. No upfront costs.
              </p>
              <Link
                to="/signup?role=vendor"
                className="inline-flex items-center gap-2 bg-marigold-500 hover:bg-marigold-600 text-white font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
              >
                Join as a Vendor — Free <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          11. FAQ ACCORDION
      ══════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 reveal">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">Everything you need to know before you start</p>
          </div>

          <div className="space-y-3 reveal">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="bg-cream rounded-2xl border border-orange-100 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-gray-900 hover:text-marigold-700 transition-colors"
                >
                  <span className="pr-4 text-sm sm:text-base">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp size={18} className="text-marigold-500 shrink-0" />
                    : <ChevronDown size={18} className="text-gray-400 shrink-0" />
                  }
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? 'max-h-60' : 'max-h-0'
                  }`}
                >
                  <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-orange-100 pt-3">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Festival card subcomponent
═══════════════════════════════════════════════════════════ */
function FestivalCard({ festival, delay }) {
  const [hovered, setHovered] = useState(false)
  const { id, name, emoji, gradientFrom, gradientTo, month, foods, rituals } = festival

  return (
    <Link
      to={`/festivals/${id}`}
      className={`reveal reveal-delay-${delay} group relative bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden hover:-translate-y-2 hover:shadow-2xl transition-all duration-300`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gradient header */}
      <div
        className="h-24 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)` }}
      >
        <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{emoji}</span>

        {/* Month badge */}
        <span className="absolute top-2 right-2 bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
          {month}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base mb-3">{name}</h3>

        {/* Food pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {foods.slice(0, 3).map(food => (
            <span
              key={food.name}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100"
            >
              {food.emoji} {food.name}
            </span>
          ))}
        </div>

        {/* Key rituals */}
        <ul className="space-y-1 mb-4">
          {rituals.slice(0, 2).map(r => (
            <li key={r.name} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>{r.emoji}</span> {r.name}
            </li>
          ))}
        </ul>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-marigold-600 group-hover:gap-2 transition-all">
          Explore Foods &amp; Rituals <ArrowRight size={12} />
        </span>
      </div>

      {/* Hover overlay CTA */}
      <div
        className="absolute inset-0 flex items-end p-4 transition-opacity duration-200"
        style={{
          background: `linear-gradient(to top, ${gradientFrom}ee 0%, transparent 60%)`,
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        <span className="w-full text-center text-white text-sm font-bold py-2 bg-white/20 rounded-xl backdrop-blur-sm">
          Plan this festival →
        </span>
      </div>
    </Link>
  )
}
