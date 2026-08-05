import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, ArrowRight, Sparkles, MessageCircleQuestion, ShieldCheck, Star } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { FESTIVALS } from '../data/festivals'
import { EVENT_TYPES, SERVICE_CATEGORIES } from '../config/sambramo'
import { SHOP_CATEGORIES } from '../config/shop'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchUnsplashPhoto } from '../lib/unsplash'
import SlideCarousel from '../components/common/SlideCarousel'
import StarRating from '../components/reviews/StarRating'

/* ═══════════════════════════════════════════════════════════
   Derived / static data
═══════════════════════════════════════════════════════════ */

/**
 * Flatten nested SERVICE_CATEGORIES into individual chips.
 * Each category has a category-level emoji/photo used for all its services.
 */
const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(cat =>
  cat.services.map(svc => ({ emoji: cat.emoji, category: cat.category, name: svc }))
)

/** ALL_SERVICES split into 3 even rows for the self-scrolling roller. */
const SERVICE_ROWS = (() => {
  const rows = [[], [], []]
  ALL_SERVICES.forEach((svc, i) => rows[i % 3].push(svc))
  return rows
})()

/** Real photos for the hero's floating corner decorations — no emoji. */
const HERO_FLOAT_QUERIES = {
  confetti: 'confetti party celebration colorful',
  diya:     'diya oil lamp diwali India',
  flower:   'hibiscus flower pink India',
  cake:     'birthday cake celebration slice',
}

/**
 * Per-event-type gradient — landing page only.
 * Keyed by EVENT_TYPES[].id from sambramo config.
 */
const EVENT_GRADIENTS = {
  'birthday':        'from-amber-400 to-orange-500',
  'baby-shower':     'from-pink-400 to-rose-500',
  'naming-ceremony': 'from-violet-400 to-purple-600',
  'anniversary':     'from-rose-400 to-pink-600',
  'housewarming':    'from-emerald-400 to-teal-500',
  'engagement':      'from-indigo-400 to-blue-600',
  'wedding':         'from-purple-400 to-fuchsia-600',
  'festival':        'from-orange-400 to-amber-600',
  'get-together':    'from-blue-400 to-cyan-500',
}

const STORY_STEPS = [
  { emoji: '🗣️', title: 'Tell us',       desc: 'Share your vision in minutes' },
  { emoji: '🔍', title: 'We plan',       desc: 'Our team finds the right vendors' },
  { emoji: '📋', title: 'You approve',   desc: 'Review a clear, complete proposal' },
  { emoji: '🤝', title: 'We handle it',  desc: 'We coordinate everything for you' },
  { emoji: '🎉', title: 'You celebrate', desc: 'Just enjoy your day' },
]

const HOW_STEPS = [
  { num: '01', title: 'Tell us',      desc: 'Your date, place, people, budget and dream.' },
  { num: '02', title: 'We plan',      desc: 'Our team finds the right services and vendors.' },
  { num: '03', title: 'You approve',  desc: 'We present a complete plan and transparent proposal.' },
  { num: '04', title: 'We handle it', desc: 'We coordinate the details while you enjoy your people.' },
]

const TRUST_POINTS = [
  { emoji: '🤝', title: 'Human-assisted planning',  desc: 'A real Sambramo coordinator handles your request' },
  { emoji: '🏪', title: 'Multiple services',        desc: 'Venue, decoration, food, photography, entertainment and more' },
  { emoji: '📞', title: 'Vendor coordination',      desc: "We coordinate with vendors so you don't have to" },
  { emoji: '💡', title: 'Transparent proposals',    desc: "See what you're paying for before confirming" },
]

// Calibrated to real package pricing (eventServicesData.js) — the
// cheapest full-service package anywhere in the catalog starts around
// ₹15,000 (e.g. an intimate anniversary dinner), so a bracket like
// "Under ₹5,000" was never a real option and undercut the "we quote
// after understanding your needs" message right above this section.
const BUDGET_RANGES = [
  '₹15,000 – ₹30,000',
  '₹30,000 – ₹60,000',
  '₹60,000 – ₹1,00,000',
  '₹1,00,000 – ₹2,50,000',
  '₹2,50,000 – ₹5,00,000',
  '₹5,00,000 – ₹10,00,000',
  '₹10,00,000 – ₹25,00,000',
  'Above ₹25,00,000',
]

const FAQS = [
  {
    q: 'How does Sambramo work?',
    a: 'We receive your celebration requirements, our team manually sources and contacts vendors, collects quotations, negotiates, and presents you a complete transparent proposal. You approve and we handle coordination.',
  },
  {
    q: 'Is there a fee to submit a request?',
    a: 'Submitting your celebration request is completely free. Our fee is included in the final proposal and is always disclosed transparently before you confirm.',
  },
  {
    q: 'What cities do you serve?',
    a: "We primarily serve Bengaluru. We're expanding — submit your request and we'll do our best to help.",
  },
  {
    q: 'How long does it take to get a proposal?',
    a: 'We typically present a complete proposal within 24–48 hours of receiving your request.',
  },
  {
    q: 'Can I make changes after receiving a proposal?',
    a: 'Absolutely. We work with you until the plan feels exactly right.',
  },
  {
    q: 'Do I need to pay upfront?',
    a: "We accept manual UPI or bank transfer after you've approved the proposal. No payment until you're completely happy.",
  },
]

/* ═══════════════════════════════════════════════════════════
   Main Landing Page
═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  useScrollReveal()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const [openFaq,     setOpenFaq]     = useState(null)
  const [activeBudget, setActiveBudget] = useState(null)
  const [heroPhotos, setHeroPhotos] = useState({})

  // Real floating photos for the hero corners — replaces the emoji.
  useEffect(() => {
    let cancelled = false
    Promise.all(
      Object.entries(HERO_FLOAT_QUERIES).map(([key, q]) => fetchUnsplashPhoto(q).then(p => [key, p]))
    ).then(entries => {
      if (cancelled) return
      setHeroPhotos(Object.fromEntries(entries.filter(([, p]) => p)))
    })
    return () => { cancelled = true }
  }, [])

  /**
   * Navigate to /plan with optional pre-selected params.
   *
   * A guest is sent to /login *carrying the destination* in router state.
   * LoginPage already knows how to resume a `from` location — it even
   * shows a "let's pick up where you left off" note for /plan — but this
   * function used to call `navigate('/login')` with no state at all. So
   * someone who tapped "Wedding", or a specific budget bracket, signed in
   * and landed on an empty dashboard with their choice thrown away, and
   * had to find and re-make it. That is the single largest drop-off point
   * on the page: every hero CTA, all nine celebration cards, all eight
   * budget chips and both closing CTAs funnel through here.
   */
  function toPlan(params = {}) {
    const qs = new URLSearchParams(params).toString()
    const to = '/plan' + (qs ? '?' + qs : '')
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/plan', search: qs ? '?' + qs : '' } } })
      return
    }
    navigate(to)
  }

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ══════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-plum-950 via-plum-900 to-berry-900 pt-8 sm:pt-14 md:pt-20 pb-10 sm:pb-14 md:pb-20 px-4">

        {/* Animated blob decorations */}
        <div
          className="absolute top-12 right-8 w-96 h-96 bg-white/5 blob pointer-events-none"
        />
        <div
          className="absolute bottom-0 left-8 w-80 h-80 bg-white/5 blob pointer-events-none"
          style={{ animationDelay: '2.5s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-white/5 blob pointer-events-none"
          style={{ animationDelay: '5s' }}
        />

        {/* Heart-shaped clip path, defined once, reused by every floating photo below */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <clipPath id="heartClip" clipPathUnits="objectBoundingBox">
              <path d="M0.5,1 C0.5,1 0,0.619 0,0.336 C0,0.1505 0.1329,0 0.2969,0 C0.3844,0 0.464,0.04473 0.5,0.1146 C0.536,0.04473 0.6156,0 0.7031,0 C0.8671,0 1,0.1505 1,0.336 C1,0.619 0.5,1 0.5,1 Z" />
            </clipPath>
          </defs>
        </svg>

        {/* Floating real photos — confetti / diya / flower / cake, no emoji, heart-shaped */}
        {heroPhotos.confetti && (
          <img
            src={heroPhotos.confetti.url} alt=""
            className="block absolute left-[5%] top-24 sm:top-28 w-10 h-10 sm:w-12 sm:h-12 object-cover shadow-lg float pointer-events-none select-none"
            style={{ animationDelay: '0s', clipPath: 'url(#heartClip)' }}
          />
        )}
        {heroPhotos.diya && (
          <img
            src={heroPhotos.diya.url} alt=""
            className="block absolute right-[6%] top-32 sm:top-36 w-11 h-11 sm:w-14 sm:h-14 object-cover shadow-lg float pointer-events-none select-none"
            style={{ animationDelay: '1s', clipPath: 'url(#heartClip)' }}
          />
        )}
        {heroPhotos.flower && (
          <img
            src={heroPhotos.flower.url} alt=""
            className="block absolute left-[8%] bottom-14 sm:bottom-16 w-10 h-10 sm:w-12 sm:h-12 object-cover shadow-lg float pointer-events-none select-none"
            style={{ animationDelay: '0.5s', clipPath: 'url(#heartClip)' }}
          />
        )}
        {heroPhotos.cake && (
          <img
            src={heroPhotos.cake.url} alt=""
            className="block absolute right-[10%] bottom-8 sm:bottom-10 w-9 h-9 sm:w-11 sm:h-11 object-cover shadow-lg float pointer-events-none select-none"
            style={{ animationDelay: '1.5s', clipPath: 'url(#heartClip)' }}
          />
        )}

        <div className="relative max-w-4xl mx-auto text-center">

          {/* Sleek glass card — the hero's centerpiece */}
          <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl shadow-black/40 px-6 sm:px-10 md:px-16 py-8 sm:py-12 md:py-16 mb-8 sm:mb-10 overflow-hidden">
            {/* Accent glow line + corner sparkle */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-1 rounded-full bg-gradient-to-r from-saffron-300 via-saffron-400 to-saffron-300" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-saffron-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-berry-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Tag */}
            <div className="relative inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-sm font-semibold rounded-full px-4 py-1.5 mb-4 sm:mb-6 md:mb-8 backdrop-blur-sm">
              ✨ India's Celebration Concierge
            </div>

            {/* H1 */}
            <h1 className="relative font-serif text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] mb-3 sm:mb-5 md:mb-6">
              Your Moment.
              <br />
              <span className="text-saffron-400">Our Magic.</span>
            </h1>

            {/* Sub-headline */}
            <p className="relative text-white/70 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-5 sm:mb-8 md:mb-10 leading-relaxed">
              From birthdays and baby showers to weddings and everything in between,
              tell us what you're celebrating. We'll take care of every detail.
            </p>

            {/* Single primary CTA — a second equal-weight button here would
                split attention on the one decision that matters most on
                this screen. "Explore" is offered below as a quiet,
                subordinate scroll cue instead of a competing pill. */}
            <div className="relative flex flex-col items-center justify-center gap-3">
              <button
                onClick={() => toPlan()}
                className="btn-cta"
              >
                Plan My Celebration ✨
              </button>
              <a
                href="#celebrations"
                className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm font-medium transition-colors"
              >
                or explore celebrations first <ChevronDown size={14} />
              </a>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-white/60 text-sm">
            {[
              ['🤝', 'A real team handles your request'],
              ['📞', 'Personal coordinator assigned'],
              ['✅', 'Transparent proposals'],
            ].map(([icon, text]) => (
              <span key={text} className="flex items-center gap-2">
                {icon} {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          1B. SHOP TEASER (secondary to Plan My Celebration)
      ══════════════════════════════════════════════ */}
      <section className="py-6 sm:py-8 md:py-10 px-4 bg-plum-900 border-t border-plum-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-plum-300 text-sm font-medium mb-4">Need something for a celebration today?</p>
          <SlideCarousel>
            {SHOP_CATEGORIES.map(cat => (
              <div key={cat.id} className="shrink-0 w-36 sm:w-40 snap-center">
                <ShopTeaserCard category={cat} />
              </div>
            ))}
            <div className="shrink-0 w-36 sm:w-40 snap-center">
              <ComingSoonCard />
            </div>
          </SlideCarousel>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          1C. WHY NO PRICES? — trust reassurance for the
          quote-after-requirements model, placed early since
          "no visible pricing" can otherwise read as a red flag
          to a brand-new visitor.
      ══════════════════════════════════════════════ */}
      <section className="py-10 px-4 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-plum-50 flex items-center justify-center">
            <MessageCircleQuestion size={26} className="text-plum-600" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Wondering why there's no price tag?</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              A birthday for 20 and a wedding for 400 don't cost the same — so we don't guess. Tell us what you need,
              we source real quotes from vendors on your behalf, and you get one clear final price. Free to ask, no obligation.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-plum-600 bg-plum-50 px-3 py-1.5 rounded-full">
            <ShieldCheck size={14} /> No fee to enquire
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          2. STORY FLOW  (dark — continues from hero)
      ══════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-plum-950">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-14 reveal">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-5">
              Your celebration deserves your full presence.
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
              Ten vendor calls, a dozen quotes to compare, timings to coordinate —
              we've done it a thousand times. Let us do it for you too, so you can
              just be there for the moment.
            </p>
          </div>

          {/* 5-step visual story */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-16">
            {STORY_STEPS.map((step, i) => (
              <div
                key={step.title}
                className={`reveal reveal-delay-${Math.min(i + 1, 4)} relative flex flex-col items-center text-center p-5 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm`}
              >
                <span className="text-4xl mb-3">{step.emoji}</span>
                <h3 className="font-bold text-white text-sm mb-1">{step.title}</h3>
                <p className="text-white/60 text-xs leading-relaxed">{step.desc}</p>

                {/* Arrow connector between cards (desktop) */}
                {i < 4 && (
                  <span className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center bg-plum-800 rounded-full text-white/50 text-sm">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Signature statement */}
          <p className="text-center font-serif text-2xl md:text-3xl italic text-saffron-400 reveal mb-16">
            "That's the Sambramo difference."
          </p>

          {/* Four trust points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
            {TRUST_POINTS.map((pt, i) => (
              <div
                key={pt.title}
                className={`reveal reveal-delay-${i + 1} flex items-start gap-4 p-5 bg-white/10 rounded-2xl border border-white/10`}
              >
                <span className="text-2xl shrink-0 mt-0.5">{pt.emoji}</span>
                <div>
                  <h3 className="font-bold text-white text-sm mb-1">{pt.title}</h3>
                  <p className="text-white/70 text-xs leading-relaxed">{pt.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center reveal">
            <button onClick={() => toPlan()} className="btn-cta">
              Tell us about your celebration
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. WHAT ARE YOU CELEBRATING?
      ══════════════════════════════════════════════ */}
      <section id="celebrations" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-12 reveal">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              What are you celebrating?
            </h2>
            <p className="text-gray-500 text-lg">Every occasion has a story. Tell us yours.</p>
          </div>

          {/* Slide instead of scroll — swipe, drag, or use the arrow buttons */}
          <SlideCarousel className="mb-10 px-1">
            {EVENT_TYPES.slice(0, 9).map((type, i) => (
              <div key={type.id} className="shrink-0 w-64 sm:w-72 snap-center">
                <CelebrationCard
                  type={type}
                  gradient={EVENT_GRADIENTS[type.id] ?? 'from-gray-400 to-gray-600'}
                  delay={Math.min(i + 1, 4)}
                  onClick={() => toPlan({ type: type.id })}
                />
              </div>
            ))}
          </SlideCarousel>

          <div className="text-center">
            <Link
              to="/plan"
              className="text-plum-600 font-semibold hover:text-plum-700 transition-colors text-base"
            >
              Tell us about something else →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. ONE REQUEST. EVERYTHING ARRANGED.
      ══════════════════════════════════════════════ */}
      <section id="services" className="py-20 px-4 bg-cream">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-12 reveal">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              One request. Everything arranged.
            </h2>
            <p className="text-gray-500 text-lg">
              Tell us what you need. Your Sambramo team coordinates the rest.
            </p>
          </div>

          {/* Service roller — all 40+ services, each with its own real photo.
              Three self-scrolling rows (alternating direction) instead of a
              grid, so browsing never requires scrolling the page — only the
              rows move, continuously, and pause on hover/touch. */}
          <div className="space-y-3 mb-12 reveal">
            {SERVICE_ROWS.map((row, i) => (
              <AutoScrollRow key={i} items={row} reverse={i % 2 === 1} />
            ))}
          </div>

          <div className="text-center reveal">
            <button onClick={() => toPlan()} className="btn-cta">
              Let us arrange it all
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          6. HOW SAMBRAMO WORKS
      ══════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16 reveal">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900">
              How Sambramo Works
            </h2>
          </div>

          <div className="relative">
            {/* Horizontal connecting line (desktop) */}
            <div
              className="absolute top-[3.25rem] left-[12.5%] right-[12.5%] h-0.5 bg-plum-100 hidden md:block"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
              {HOW_STEPS.map((step, i) => (
                <div
                  key={step.num}
                  className={`reveal reveal-delay-${i + 1} flex flex-col items-center text-center`}
                >
                  {/* Large number */}
                  <div className="relative z-10 mb-4">
                    <span className="font-serif text-8xl font-extrabold text-plum-100 leading-none select-none">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          7. FESTIVAL FOODS & RITUALS
      ══════════════════════════════════════════════ */}
      <section id="festivals" className="py-20 px-4 bg-gradient-to-br from-saffron-50 to-amber-50">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-12 reveal">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              🎊 Celebrate Every Festival in Style
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              From Diwali diyas to Onam sadya — we help you plan the perfect festive celebration.
            </p>
          </div>

          <SlideCarousel className="px-1">
            {FESTIVALS.map((f, i) => (
              <div key={f.id} className="shrink-0 w-64 sm:w-72 snap-center">
                <FestivalCard
                  festival={f}
                  delay={Math.min((i % 4) + 1, 4)}
                  onPlan={() => toPlan({ type: 'festival', festival: f.id })}
                />
              </div>
            ))}
          </SlideCarousel>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          7B. CUSTOMER VOICES — real reviews_catalog data,
          honest at any volume. Placed right before the final
          budget/CTA push, where trust reinforcement matters most.
      ══════════════════════════════════════════════ */}
      <CustomerVoices />

      {/* ══════════════════════════════════════════════
          8. BUDGET
      ══════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-12 reveal">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Beautiful celebrations at the budget you're comfortable with.
            </h2>
            <p className="text-gray-500 text-lg">
              Tell us your comfort zone. We'll work within it.
            </p>
          </div>

          {/* 8 budget chips — 2 rows of 4 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 reveal">
            {BUDGET_RANGES.map((label) => (
              <button
                key={label}
                onClick={() => {
                  setActiveBudget(label)
                  toPlan({ budget: label })
                }}
                className={`card text-sm font-semibold px-3 py-3.5 text-center transition-all duration-200 hover:border-saffron-300 hover:shadow-md ${
                  activeBudget === label
                    ? 'border-saffron-400 bg-saffron-50 text-saffron-700 shadow-md'
                    : 'text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mb-8 reveal">
            We've planned celebrations at every budget. What matters is that your day is perfect.
          </p>

          <div className="text-center reveal">
            <button
              onClick={() => toPlan()}
              className="btn-plum text-base px-8 py-4 rounded-2xl"
            >
              Start planning — it's free
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          9. FINAL CTA  (full-bleed dark plum)
      ══════════════════════════════════════════════ */}
      <section className="py-28 px-4 bg-gradient-to-br from-plum-900 to-berry-900">
        <div className="max-w-3xl mx-auto text-center">

          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-5 reveal">
            Ready to plan your perfect celebration?
          </h2>

          <p className="text-white/70 text-lg mb-10 reveal reveal-delay-1">
            Join the families who trusted Sambramo with their most important moments.
          </p>

          <div className="reveal reveal-delay-2">
            <button
              onClick={() => toPlan()}
              className="btn-cta text-lg px-10 py-5"
            >
              Plan My Celebration ✨
            </button>
          </div>

          <p className="text-white/40 text-sm mt-6 reveal reveal-delay-3">
            No payment needed to submit your request. A coordinator will reach out within hours.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          10. FAQ  (smooth accordion)
      ══════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-12 reveal">
            <h2 className="font-serif text-3xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3 reveal">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="bg-cream rounded-2xl border border-orange-100 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-gray-900 hover:text-plum-600 transition-colors"
                >
                  <span className="pr-4 text-sm sm:text-base">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp   size={18} className="text-plum-500 shrink-0" />
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
   CustomerVoices — real reviews_catalog data, nothing fabricated.
   Renders nothing at all if there are genuinely zero reviews yet
   (an empty "testimonials" section would be worse than none); scales
   from a single honest review up to a full carousel as real
   feedback accumulates — no fake "thousands of happy customers".
═══════════════════════════════════════════════════════════ */
function CustomerVoices() {
  const [reviews, setReviews] = useState(null) // null = loading, [] = none

  useEffect(() => {
    let cancelled = false
    supabase.from('reviews_catalog')
      .select('*')
      .not('comment', 'is', null)
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => { if (!cancelled) setReviews(data ?? []) })
    return () => { cancelled = true }
  }, [])

  if (!reviews || reviews.length === 0) return null

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 reveal">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Real voices, real celebrations
          </h2>
          <div className="flex items-center justify-center gap-2">
            <StarRating value={avg} count={reviews.length} size="md" />
          </div>
        </div>

        <SlideCarousel>
          {reviews.map(r => (
            <div key={r.id} className="shrink-0 w-72 snap-center">
              <div className="h-full flex flex-col bg-cream rounded-2xl border border-orange-100 p-5">
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={i < r.rating ? 'currentColor' : 'none'} className={i < r.rating ? '' : 'text-gray-200'} strokeWidth={i < r.rating ? 0 : 1.5} />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1">"{r.comment}"</p>
                <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-orange-100">
                  <div className="w-8 h-8 rounded-full bg-plum-100 text-plum-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {r.customer_name?.charAt(0)?.toUpperCase() ?? 'S'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{r.customer_name}</p>
                    <p className="text-[11px] text-gray-400 truncate">on {r.subject_name}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </SlideCarousel>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   AutoScrollRow — a row that scrolls itself, continuously, in a
   seamless loop (same requestAnimationFrame technique as
   FestivalBanner's ticker), pausing on hover/touch. Alternating
   `reverse` per row is what makes a multi-row "roller" read as
   deliberate rather than a single stalled marquee.
═══════════════════════════════════════════════════════════ */
/**
 * One tile per service. Deliberately emoji-on-gradient rather than a
 * photo: these render at 112×64 inside a strip that is always moving, so
 * a cropped stock photo is unreadable at that size — while costing one
 * live Unsplash search each. Forty-six services duplicated for the loop
 * meant ~92 requests from this component alone, against a 50-per-hour
 * quota shared with the whole site, which is why the rest of the page's
 * imagery kept collapsing to fallbacks. The photo budget now goes to the
 * large cards where a photo actually carries the design.
 */
const CATEGORY_TINTS = {
  Venue:         'from-plum-100 to-plum-50',
  Decoration:    'from-berry-100 to-berry-50',
  Food:          'from-saffron-100 to-saffron-50',
  Entertainment: 'from-sky-100 to-sky-50',
  Photography:   'from-emerald-100 to-emerald-50',
  Personal:      'from-rose-100 to-rose-50',
  Rentals:       'from-amber-100 to-amber-50',
  Other:         'from-indigo-100 to-indigo-50',
}

function AutoScrollRow({ items, reverse = false }) {
  // Slower rows for longer content keeps every row's apparent speed the
  // same regardless of how many services landed in it.
  const duration = Math.max(30, items.length * 4)

  return (
    <div className="marquee-viewport overflow-hidden">
      <div
        className={`marquee-track gap-3 ${reverse ? 'marquee-track-reverse' : ''}`}
        style={{ '--marquee-duration': `${duration}s` }}
      >
        {[...items, ...items].map((svc, i) => (
          <div
            key={`${svc.name}-${i}`}
            aria-hidden={i >= items.length || undefined}
            className="shrink-0 w-28 bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden text-center"
          >
            <div className={`w-full h-16 flex items-center justify-center bg-gradient-to-br ${CATEGORY_TINTS[svc.category] ?? 'from-gray-100 to-gray-50'}`}>
              <span className="text-2xl">{svc.emoji}</span>
            </div>
            <p className="text-xs font-medium text-gray-700 leading-tight px-2 py-2 truncate">{svc.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ShopTeaserCard sub-component — photo-topped card for the
   "Need something for a celebration today?" shop-category strip.
   Fixed total height so every card (including ComingSoonCard) lines
   up perfectly in the carousel row; emoji badge overlaps the photo's
   bottom edge for a bit of visual polish over a plain image+label card.
═══════════════════════════════════════════════════════════ */
const SHOP_TEASER_QUERIES = {
  'Cakes':              'chocolate birthday cake slice',
  'Gifts':               'wrapped gift box present ribbon',
  'Flowers':              'flower bouquet fresh',
  'Hampers':              'wicker gift basket fruit',       // "hamper" alone matches laundry hampers on Unsplash
  'Party Essentials':      'balloons party decoration',
  'Pooja & Essentials':     'pooja thali diya India',
}

function ShopTeaserCard({ category }) {
  const [photo, setPhoto] = useState(null)
  const [done, setDone]   = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchUnsplashPhoto(SHOP_TEASER_QUERIES[category.id] ?? category.label).then(p => {
      if (cancelled) return
      setPhoto(p)
      setDone(true)
    })
    return () => { cancelled = true }
  }, [category.id])

  return (
    <Link
      to={`/shop/${encodeURIComponent(category.id)}`}
      className="group flex flex-col h-40 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30"
    >
      <div className="relative flex-1 min-h-0">
        {photo ? (
          <>
            <img src={photo.url} alt={photo.alt} loading="lazy" className="w-full h-full object-cover" />
            {/* Badge only shown over a real photo — the fallback tile below already carries the emoji, so showing both at once would duplicate it. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 pointer-events-none" />
            <span className="absolute bottom-1.5 left-2 text-xl drop-shadow-lg">{category.emoji}</span>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className={`text-3xl transition-opacity ${done ? 'opacity-100' : 'opacity-40 animate-pulse'}`}>{category.emoji}</span>
          </div>
        )}
      </div>
      <div className="px-2 py-2 text-center shrink-0">
        <p className="text-plum-100 text-xs font-semibold group-hover:text-white transition-colors truncate">{category.label}</p>
      </div>
    </Link>
  )
}

/* ═══════════════════════════════════════════════════════════
   ComingSoonCard — teaser at the end of the shop-category strip
   telling customers the catalog keeps growing.
═══════════════════════════════════════════════════════════ */
function ComingSoonCard() {
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchUnsplashPhoto('surprise gift sparkle celebration').then(p => { if (!cancelled) setPhoto(p) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="relative flex flex-col h-40 rounded-2xl overflow-hidden border-2 border-dashed border-saffron-400/40">
      {photo
        ? <img src={photo.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        : <div className="absolute inset-0 bg-plum-800" />
      }
      <div className="absolute inset-0 bg-gradient-to-b from-plum-950/60 via-plum-950/75 to-plum-950/90" />
      <div className="relative flex-1 flex flex-col items-center justify-center gap-1.5 p-3 text-center">
        <Sparkles size={22} className="text-saffron-400 animate-pulse" />
        <p className="text-saffron-300 text-xs font-bold leading-tight">Many more on the way!</p>
        <p className="text-plum-300 text-[10px]">Keep watching ✨</p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   CelebrationCard sub-component — real photo with a gradient
   fallback + dark overlay so the white title/tagline stay legible
   over any photo (same compositing pattern as FestivalDetailPage).
═══════════════════════════════════════════════════════════ */
function CelebrationCard({ type, gradient, delay, onClick }) {
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchUnsplashPhoto(`Indian ${type.label} celebration`).then(p => { if (!cancelled) setPhoto(p) })
    return () => { cancelled = true }
  }, [type.id])

  return (
    <button
      onClick={onClick}
      className={`reveal reveal-delay-${delay} group relative w-full h-56 rounded-2xl overflow-hidden ${photo ? '' : `bg-gradient-to-br ${gradient}`} p-7 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl`}
      style={photo ? { backgroundImage: `url(${photo.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {photo && <div className="absolute inset-0 bg-black/45 group-hover:bg-black/35 transition-colors" />}
      <div className="relative">
        <span className="text-5xl block mb-4">{type.emoji}</span>
        <h3 className="font-serif text-xl font-bold text-white mb-1">{type.label}</h3>
        <p className="text-white/80 text-sm leading-relaxed">{type.tagline}</p>
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ArrowRight size={14} className="text-white" />
        </div>
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════
   FestivalCard sub-component
═══════════════════════════════════════════════════════════ */
function FestivalCard({ festival, delay, onPlan }) {
  const [photo, setPhoto] = useState(null)
  const { name, emoji, gradientFrom, gradientTo, month, foods } = festival

  useEffect(() => {
    let cancelled = false
    fetchUnsplashPhoto(`${name} festival India celebration`).then(p => { if (!cancelled) setPhoto(p) })
    return () => { cancelled = true }
  }, [name])

  // A real <button>, not a div with role="button". The card previously
  // also carried a hover-revealed overlay repeating the same "Plan this
  // festival →" label that is already printed in the card body — two
  // controls doing one job, and the overlay was invisible on touch,
  // where most of this traffic is.
  return (
    <button
      type="button"
      className={`reveal reveal-delay-${delay} group relative w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-plum-500 focus-visible:ring-offset-2`}
      onClick={onPlan}
    >
      {/* Photo (or gradient fallback) header */}
      <div
        className="h-28 flex items-center justify-center relative overflow-hidden"
        style={photo
          ? { backgroundImage: `linear-gradient(135deg, ${gradientFrom}99 0%, ${gradientTo}99 100%), url(${photo.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)` }
        }
      >
        <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
          {emoji}
        </span>
        {/* Month badge */}
        <span className="absolute top-2 right-2 bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
          {month}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-serif font-bold text-gray-900 text-base mb-3">{name}</h3>

        {/* Signature food pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {foods.slice(0, 3).map(food => (
            <span
              key={food.name}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-saffron-50 text-saffron-700 border border-saffron-100"
            >
              {food.emoji} {food.name}
            </span>
          ))}
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-plum-600 group-hover:gap-2 transition-all duration-200">
          Plan this festival →
        </span>
      </div>
    </button>
  )
}
