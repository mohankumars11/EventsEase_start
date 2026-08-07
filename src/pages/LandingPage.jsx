import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, ArrowRight, MessageCircleQuestion, ShieldCheck, Star } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { FESTIVALS } from '../data/festivals'
import { BRAND, EVENT_TYPES, SERVICE_CATEGORIES, CTA } from '../config/sambramo'
import { supabase } from '../lib/supabase'
import { fetchUnsplashPhoto } from '../lib/unsplash'
import SlideCarousel from '../components/common/SlideCarousel'
import StarRating from '../components/reviews/StarRating'
import { PathFork, OldWayBand, ShopCategoryGrid, OccasionRail } from '../components/landing/StorefrontSections'
import KolamSticker, { KolamClipDefs } from '../components/landing/KolamSticker'
import HeroTicker from '../components/landing/HeroTicker'
import { ShopPills, TrustRow } from '../components/landing/HeroProof'
import SalesNudge from '../components/landing/SalesNudge'
import { KOLAM_PATH } from '../components/ui/SambramoMark'

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

/**
 * The one telling of how this works, and the page's `#how-it-works` anchor.
 *
 * There used to be a second: a numbered "How Sambramo Works" band lower down
 * that said 01 Tell us / 02 We plan / 03 You approve / 04 We handle it — the
 * same four steps as the first four here, in the same order, in the same
 * words, roughly a thousand pixels apart. Between them the OldWayBand makes
 * the same argument a third time in prose ("You describe it once, to a
 * person… we call the vendors… one transparent proposal"). Told once it is a
 * promise; told three times on one scroll it reads as padding, and the
 * numbered version was the weakest of the three — four steps of grey text
 * under 96px numerals, no imagery, and it ended on "we handle it" rather than
 * on the customer celebrating.
 */
const STORY_STEPS = [
  { emoji: '🗣️', title: 'Tell us',       desc: 'Your date, place, people and what you picture' },
  { emoji: '🔍', title: 'We plan',       desc: 'Our team sources vendors and compares quotes' },
  { emoji: '📋', title: 'You approve',   desc: 'One clear, complete proposal — the fee stated in it' },
  { emoji: '🤝', title: 'We handle it',  desc: 'We coordinate every detail on the day' },
  { emoji: '🎉', title: 'You celebrate', desc: 'Just be there for the moment' },
]

const TRUST_POINTS = [
  { emoji: '🤝', title: 'Human-assisted planning',  desc: 'A real Sambramo coordinator handles your request' },
  { emoji: '🏪', title: 'Multiple services',        desc: 'Venue, decoration, food, photography, entertainment and more' },
  { emoji: '📞', title: 'Vendor coordination',      desc: "We coordinate with vendors so you don't have to" },
  { emoji: '💡', title: 'Transparent proposals',    desc: "See what you're paying for before confirming" },
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
    a: "We're live in Bengaluru and Mysore as part of our pilot launch. Not in your city yet? Let us know from the banner at the top of the site and we'll notify you the moment we launch there.",
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
  const [openFaq,    setOpenFaq]    = useState(null)
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
   * Everything on this page funnels through here — every hero CTA, all nine
   * celebration cards and the closing CTA — which is why it no longer
   * diverts guests to /login first. Being asked to make
   * an account before hearing a price, on a page whose argument is "free to
   * ask, no obligation", lost people at the door for nothing: the wizard
   * needs an account only at submit, and asks then.
   */
  function toPlan(params = {}) {
    const qs = new URLSearchParams(params).toString()
    navigate('/plan' + (qs ? '?' + qs : ''))
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

        {/* Floating real photos, cut to the mark rather than to a heart — a
            heart belongs to no brand in particular, the kolam belongs to
            this one. Defined once, reused by all four stickers. */}
        <KolamClipDefs />

        <KolamSticker photo={heroPhotos.confetti} delay="0s"
          size="w-11 h-11 sm:w-14 sm:h-14" className="left-[5%] top-24 sm:top-28" />
        <KolamSticker photo={heroPhotos.diya} delay="1s"
          size="w-12 h-12 sm:w-16 sm:h-16" className="right-[6%] top-32 sm:top-36" />
        <KolamSticker photo={heroPhotos.flower} delay="0.5s"
          size="w-11 h-11 sm:w-14 sm:h-14" className="left-[8%] bottom-14 sm:bottom-16" />
        <KolamSticker photo={heroPhotos.cake} delay="1.5s"
          size="w-10 h-10 sm:w-12 sm:h-12" className="right-[10%] bottom-8 sm:bottom-10" />

        <div className="relative max-w-4xl mx-auto text-center">

          {/* Sleek glass card — the hero's centerpiece */}
          <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl shadow-black/40 px-6 sm:px-10 md:px-16 py-8 sm:py-12 md:py-16 mb-8 sm:mb-10 overflow-hidden">
            {/* Accent glow line + corner sparkle */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-1 rounded-full bg-gradient-to-r from-saffron-300 via-saffron-400 to-saffron-300" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-saffron-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-berry-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* The mark, blown up and turned almost all the way down behind
                the card. At this size it stops reading as a logo and starts
                reading as the rangoli it came from — the card sits on the
                threshold drawing rather than on an empty pane of glass. */}
            <svg
              viewBox="-3 -3 70 70" aria-hidden="true"
              className="absolute -right-16 -bottom-20 w-72 h-72 sm:w-96 sm:h-96 text-white opacity-[0.04] pointer-events-none"
            >
              <path d={KOLAM_PATH} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            </svg>

            {/* The prompt rotates through three things you would plan and
                three you would simply buy, so the hero shows the shape of
                the business instead of naming a category. */}
            <HeroTicker />

            {/* H1 — the signature line, read from BRAND rather than typed
                out here. The second half picks up the shimmer utility so the
                promise half of the sentence is the half that moves. */}
            <h1 className="relative font-serif text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] mb-3 sm:mb-5 md:mb-6">
              {BRAND.signatureParts[0]}
              <br />
              <span className="text-saffron-400 shimmer-saffron">{BRAND.signatureParts[1]}</span>
            </h1>

            {/* Sub-headline, in two tiers rather than one run-on sentence.
                It was a single muted paragraph doing two unrelated jobs in
                one breath — explaining the concierge and listing the shop —
                so neither landed and the whole block read as filler.

                The promise now takes the brand's display face (Playfair
                italic, already loaded for the logo wordmark) at a size that
                can carry it; the shop half drops to a quiet support line and
                hands off to the pills, where it becomes something you can
                actually tap instead of a list you have to read. */}
            <p className="relative font-serif italic text-xl sm:text-2xl md:text-[1.75rem] text-white/90 leading-snug max-w-2xl mx-auto mb-3 sm:mb-4">
              Tell us what you're celebrating — we'll arrange every last detail.
            </p>
            <p className="relative text-white/60 text-sm sm:text-base max-w-xl mx-auto mb-4 sm:mb-5">
              Or shop for the day itself, delivered to your door.
            </p>

            <ShopPills />

            {/* Planning stays the single primary action: it is the highest
                value path and the rest of the page is built around it. Shop
                sits beside it as a deliberately lighter outline button rather
                than a second gradient pill, so the second audience has a door
                without the first losing its focus. */}
            <div className="relative flex flex-col items-center justify-center gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => toPlan()}
                  className="btn-cta"
                >
                  Plan My Celebration ✨
                </button>
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 hover:bg-white/15 backdrop-blur-sm text-white font-semibold px-6 py-3.5 transition-colors"
                >
                  🎂 {CTA.shop}
                </Link>
              </div>
              {/* The "or explore celebrations first" scroll cue used to sit
                  here. The pills above already signal there is more below,
                  and PathFork lands immediately after this section — so it
                  was a third competing instruction on a screen that only
                  needs two, and dropping it pays back the height the pills
                  cost on mobile. */}
            </div>
          </div>

          {/* Trust row */}
          <TrustRow />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          1B. THE FORK — plan, or shop

          This replaced a row of 144px thumbnails. Shopping is half the
          business and it was being presented as a footnote, so a visitor
          who arrived wanting to buy something had to deduce that we sell
          anything at all.
      ══════════════════════════════════════════════ */}
      <PathFork onPlan={() => toPlan()} />

      {/* The same case the nudge makes, made to everyone who scrolls rather
          than only to whoever happens to be drifting when it fires. */}
      <OldWayBand onPlan={() => toPlan()} />

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

          Carries `#how-it-works` now that the numbered band that used to own
          that anchor is gone. The header's "How It Works" link and the
          footer's both point here, which is where the five steps live —
          moving the id rather than dropping it keeps those two links working
          instead of scrolling people to the top of the page.
      ══════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 px-4 bg-plum-950">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-14 reveal">
            {/* Eyebrow, in the same register as the other section labels. It
                is what tells someone who arrived by clicking "How It Works"
                that they have landed in the right place — the headline under
                it is a feeling, not a signpost. */}
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-saffron-400 mb-3">
              How Sambramo works
            </p>
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
          5. THE SHOP

          Placed straight after the event services, so the page reads as
          one offer with two halves: here is what we arrange for you, and
          here is what we simply send you.
      ══════════════════════════════════════════════ */}
      <ShopCategoryGrid />
      <OccasionRail />

      {/* ══════════════════════════════════════════════
          6. FESTIVAL FOODS & RITUALS
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
          7. CUSTOMER VOICES — real reviews_catalog data,
          honest at any volume. Placed right before the final
          budget/CTA push, where trust reinforcement matters most.
      ══════════════════════════════════════════════ */}
      <CustomerVoices />

      {/* ══════════════════════════════════════════════
          8. BUDGET — one statement, no numbers.

          This was eight tappable price brackets, ₹15,000–₹30,000 up to
          "Above ₹25,00,000", each of which pre-filled the wizard. Three
          problems with putting them here. They are a price list on a page
          that spends a whole section above explaining why there is no price
          list ("A birthday for 20 and a wedding for 400 don't cost the
          same — so we don't guess"), so the page argued with itself. They
          anchor: a visitor who has never priced a wedding reads ₹15,000 as
          the price of a celebration rather than the floor of the cheapest
          package in the catalog. And they ask the hardest question on the
          page — what is your budget — of someone who has not yet been told
          what anything costs, which is a strange thing to answer before
          talking to anyone.

          The wizard still asks for a budget, in its own step, after the
          occasion and the guest count have made the question answerable.
          That is the right place for it. What belongs here is the promise,
          which is the one line that survived.

          Statement only, no button: the dark CTA immediately below already
          carries the action, and two CTAs a screen apart compete rather
          than compound. This reads as the quiet beat before that.
      ══════════════════════════════════════════════ */}
      <section className="py-20 sm:py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center reveal">
          {/* The mark's own dot, set as a small rule — the same saffron
              punctuation the logo caption uses, doing the job a horizontal
              divider would do more loudly. */}
          <span
            aria-hidden="true"
            className="block w-1.5 h-1.5 rotate-45 bg-saffron-400 mb-7 mx-auto"
          />
          {/* Left to wrap on its own rather than broken with a <br>: a hard
              break placed for a 1280px viewport lands mid-phrase on a phone,
              and this line has no natural hinge to hang one on. The measure
              does the work instead. */}
          <h2 className="font-serif text-3xl md:text-[2.75rem] md:leading-[1.15] font-bold text-gray-900 text-balance max-w-2xl mx-auto">
            Beautiful celebrations at the budget you're comfortable with.
          </h2>
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

      {/* Last, and outside the flow — it is fixed-position and must not sit
          inside a section that could clip it. */}
      <SalesNudge onPlan={() => toPlan()} />

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
