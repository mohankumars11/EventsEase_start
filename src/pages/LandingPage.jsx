import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { FESTIVALS } from '../data/festivals'
import { EVENT_TYPES, SERVICE_CATEGORIES } from '../config/sambramo'
import { SHOP_CATEGORIES } from '../config/shop'

/* ═══════════════════════════════════════════════════════════
   Derived / static data
═══════════════════════════════════════════════════════════ */

/**
 * Flatten nested SERVICE_CATEGORIES into individual chips.
 * Each category has a category-level emoji used for all its services.
 */
const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(cat =>
  cat.services.map(svc => ({ emoji: cat.emoji, name: svc }))
)

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

const FLOW_NODES = [
  { emoji: '👤', label: 'Customer',         desc: 'You share your celebration details' },
  { emoji: '🤝', label: 'Sambramo',         desc: 'Your dedicated coordinator' },
  { emoji: '🏪', label: 'Vendors',          desc: 'Venues, caterers, decorators & more' },
  { emoji: '🎉', label: 'Your Celebration', desc: 'Everything comes together' },
]

const TRUST_POINTS = [
  { emoji: '🤝', title: 'Human-assisted planning',  desc: 'A real Sambramo coordinator handles your request' },
  { emoji: '🏪', title: 'Multiple services',        desc: 'Venue, decoration, food, photography, entertainment and more' },
  { emoji: '📞', title: 'Vendor coordination',      desc: "We coordinate with vendors so you don't have to" },
  { emoji: '💡', title: 'Transparent proposals',    desc: "See what you're paying for before confirming" },
]

const BUDGET_RANGES = [
  'Under ₹5,000',
  '₹5,000 – ₹10,000',
  '₹10,000 – ₹25,000',
  '₹25,000 – ₹50,000',
  '₹50,000 – ₹1,00,000',
  '₹1,00,000 – ₹2,50,000',
  '₹2,50,000 – ₹5,00,000',
  'Above ₹5,00,000',
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
  const [openFaq,     setOpenFaq]     = useState(null)
  const [activeBudget, setActiveBudget] = useState(null)

  /** Navigate to /plan with optional pre-selected params */
  function toPlan(params = {}) {
    const qs = new URLSearchParams(params).toString()
    navigate('/plan' + (qs ? '?' + qs : ''))
  }

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ══════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-plum-950 via-plum-900 to-berry-900 pt-24 pb-20 px-4">

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

        {/* Floating emoji corners */}
        <span
          className="absolute left-[5%] top-28 text-3xl float pointer-events-none select-none"
          style={{ animationDelay: '0s' }}
        >🎉</span>
        <span
          className="absolute right-[6%] top-36 text-4xl float pointer-events-none select-none"
          style={{ animationDelay: '1s' }}
        >🪔</span>
        <span
          className="absolute left-[8%] bottom-16 text-3xl float pointer-events-none select-none"
          style={{ animationDelay: '0.5s' }}
        >🌺</span>
        <span
          className="absolute right-[10%] bottom-10 text-2xl float pointer-events-none select-none"
          style={{ animationDelay: '1.5s' }}
        >🎂</span>

        <div className="relative max-w-4xl mx-auto text-center">

          {/* Tag */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-sm font-semibold rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
            ✨ India's Celebration Concierge
          </div>

          {/* H1 */}
          <h1 className="font-serif text-5xl md:text-6xl font-extrabold text-white leading-[1.1] mb-6">
            Your Moment.
            <br />
            <span className="text-saffron-400">Our Magic.</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            From birthdays and baby showers to weddings and everything in between,
            tell us what you're celebrating. We'll take care of every detail.
          </p>

          {/* CTA pair */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              onClick={() => toPlan()}
              className="btn-cta"
            >
              Plan My Celebration ✨
            </button>
            <a
              href="#celebrations"
              className="inline-flex items-center gap-2 border border-white/20 text-white rounded-2xl px-6 py-3.5 text-base font-semibold hover:bg-white/10 transition-colors"
            >
              Explore Celebrations
            </a>
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
      <section className="py-8 px-4 bg-plum-900 border-t border-plum-800">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <p className="text-plum-300 text-sm font-medium shrink-0">Need something for a celebration today?</p>
          <div className="flex flex-wrap justify-center gap-2 flex-1">
            {SHOP_CATEGORIES.map(cat => (
              <Link
                key={cat.id}
                to={`/shop/${encodeURIComponent(cat.id)}`}
                className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-plum-200 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              >
                {cat.emoji} {cat.label}
              </Link>
            ))}
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
          <p className="text-center font-serif text-2xl md:text-3xl italic text-saffron-400 reveal">
            "That's the Sambramo difference."
          </p>
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

          {/* 3-col grid (desktop), 2-col (tablet), 1-col (mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {EVENT_TYPES.slice(0, 9).map((type, i) => {
              const gradient = EVENT_GRADIENTS[type.id] ?? 'from-gray-400 to-gray-600'
              return (
                <button
                  key={type.id}
                  onClick={() => toPlan({ type: type.id })}
                  className={`reveal reveal-delay-${Math.min(i + 1, 4)} group relative rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} p-7 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl`}
                >
                  <span className="text-5xl block mb-4">{type.emoji}</span>
                  <h3 className="font-serif text-xl font-bold text-white mb-1">{type.label}</h3>
                  <p className="text-white/80 text-sm leading-relaxed">{type.tagline}</p>
                  <div className="absolute bottom-5 right-5 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </button>
              )
            })}
          </div>

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

          {/* Service chip cloud — all 40+ services */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {ALL_SERVICES.map((svc, i) => (
              <div
                key={`${svc.name}-${i}`}
                className={`reveal reveal-delay-${(i % 4) + 1} flex items-center gap-2 bg-white shadow-sm border border-gray-100 rounded-full px-4 py-2 text-sm font-medium text-gray-700`}
              >
                <span>{svc.emoji}</span>
                <span>{svc.name}</span>
              </div>
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
          5. TECHNOLOGY FINDS IT. HUMANS MAKE IT HAPPEN.
      ══════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-plum-900">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-14 reveal">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-5">
              Technology finds it. Humans make it happen.
            </h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
              Sambramo isn't just an app that sends you vendor numbers. A real Sambramo
              team understands your celebration, coordinates with vendors and stays with
              you through the event.
            </p>
          </div>

          {/* Customer → Sambramo → Vendors → Celebration flow */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-0 mb-16 reveal">
            {FLOW_NODES.map((node, i) => (
              <div key={node.label} className="flex items-center gap-2 md:gap-0">
                <div className="flex flex-col items-center p-5 bg-white/10 rounded-2xl border border-white/10 min-w-[140px] text-center backdrop-blur-sm">
                  <span className="text-3xl mb-2">{node.emoji}</span>
                  <span className="font-bold text-white text-sm">{node.label}</span>
                  <span className="text-white/50 text-xs mt-1 leading-tight">{node.desc}</span>
                </div>
                {i < FLOW_NODES.length - 1 && (
                  <span className="text-white/30 text-xl md:mx-4 rotate-90 md:rotate-0 shrink-0 select-none">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FESTIVALS.map((f, i) => (
              <FestivalCard
                key={f.id}
                festival={f}
                delay={Math.min((i % 4) + 1, 4)}
                onPlan={() => toPlan({ type: 'festival', festival: f.id })}
              />
            ))}
          </div>
        </div>
      </section>

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
   FestivalCard sub-component
═══════════════════════════════════════════════════════════ */
function FestivalCard({ festival, delay, onPlan }) {
  const [hovered, setHovered] = useState(false)
  const { name, emoji, gradientFrom, gradientTo, month, foods } = festival

  return (
    <div
      className={`reveal reveal-delay-${delay} group relative bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlan}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onPlan()}
    >
      {/* Gradient header */}
      <div
        className="h-28 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)` }}
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

      {/* Hover overlay CTA */}
      <div
        className="absolute inset-0 flex items-end p-4 pointer-events-none transition-opacity duration-200"
        style={{
          background: `linear-gradient(to top, ${gradientFrom}cc 0%, transparent 55%)`,
          opacity: hovered ? 1 : 0,
        }}
      >
        <button
          className="pointer-events-auto w-full text-center text-white text-sm font-bold py-2.5 bg-white/20 rounded-xl backdrop-blur-sm"
          onClick={e => { e.stopPropagation(); onPlan() }}
        >
          Plan this festival →
        </button>
      </div>
    </div>
  )
}
