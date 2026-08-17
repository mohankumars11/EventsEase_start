import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Truck, ShieldCheck, Sparkles } from 'lucide-react'
import { SHOP_CATEGORIES, FREE_DELIVERY_THRESHOLD } from '../../config/shop'
import { CTA } from '../../config/sambramo'
import {
  CATEGORY_PHOTO, CATEGORY_PHOTO_QUERY, OCCASION_CARDS, occasionPhoto,
  PLAN_REEL, SHOP_REEL,
} from '../../config/imagery'
import SlideCarousel from '../common/SlideCarousel'
import RuntimePhoto from './RuntimePhoto'
import PhotoReel from './PhotoReel'

/**
 * Written out rather than built with `reveal-delay-${n}`. These live in
 * @layer utilities, so Tailwind's scanner purges any class it cannot find as
 * a literal string in the source — reveal-delay-4 had already been dropped
 * from the stylesheet, and an interpolated name would have silently produced
 * cards with no stagger at all.
 */
const REVEAL_DELAYS = ['', 'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3']

/**
 * The storefront half of the landing page.
 *
 * A visitor arrives in one of two moods, and the page previously only
 * answered one of them. Either they have an event in three weeks and want
 * someone to take it off their hands, or they need a cake by tomorrow. The
 * shop used to be a row of 144px thumbnails wedged under the hero, so the
 * second visitor had to infer that Sambramo sells anything at all.
 *
 * These sections give that second path real estate proportional to the fact
 * that it is half the business.
 */

/* ═══════════════════════════════════════════════════════════
   Photo primitive
═══════════════════════════════════════════════════════════ */

/**
 * A catalogue photo with a coloured fallback.
 *
 * Every card here is a real photograph rather than a gradient, but a card
 * whose image 404s or is still in flight must never collapse or flash white,
 * so the tinted plate and the emoji sit underneath the image at all times and
 * the photo fades in on top of them.
 */
function Photo({ src, alt, emoji, tint = 'from-plum-800 to-plum-950', className = '', sizes }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${tint} ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-4xl opacity-70 select-none"
      >
        {emoji}
      </span>

      {src && !failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`relative w-full h-full object-cover transition-opacity duration-700 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   1. The fork — plan, or shop
═══════════════════════════════════════════════════════════ */

/**
 * Two doors, given equal room and unequal weight.
 *
 * Planning stays the louder card because it is the higher-value path and the
 * one the rest of the page is built around; shopping gets the same footprint
 * so it cannot be missed, but a lighter ground and an outline button. Equal
 * size, honest hierarchy.
 */
export function PathFork({ onPlan }) {
  return (
    <section className="py-16 sm:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 reveal">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Two ways to celebrate with us
          </h2>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Hand us the whole occasion, or just the bit you're short of. Most people
            start with one and come back for the other.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 sm:gap-6">

          {/* Plan */}
          <div className="reveal group relative rounded-3xl overflow-hidden bg-plum-950 text-white flex flex-col card-hover">
            <PhotoReel
              frames={PLAN_REEL}
              emoji="🎊"
              tint="from-plum-800 to-berry-900"
              className="h-52 sm:h-60"
              sizes="(min-width: 768px) 50vw, 100vw"
            />

            <div className="p-6 sm:p-8 flex flex-col flex-1">
              <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold tracking-wider uppercase text-saffron-300 bg-saffron-400/10 border border-saffron-400/25 rounded-full px-3 py-1 mb-4">
                <Sparkles size={12} /> Concierge
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold mb-2">Plan a celebration</h3>
              <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-5 flex-1">
                Tell us the date, the people and the budget. A real coordinator sources
                vendors, negotiates, and brings you one clear proposal to approve.
              </p>

              <ul className="space-y-2 mb-6 text-sm text-white/75">
                {[
                  'Free to ask — the fee is in the proposal, disclosed upfront',
                  'Venue, food, décor, photography, entertainment',
                  'One coordinator, on WhatsApp, until the day is done',
                ].map(point => (
                  <li key={point} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-1.5 w-1 h-1 rounded-full bg-saffron-400 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>

              <button onClick={onPlan} className="btn-cta w-full justify-center">
                Plan My Celebration ✨
              </button>
            </div>
          </div>

          {/* Shop */}
          <div className="reveal reveal-delay-1 group relative rounded-3xl overflow-hidden bg-white border border-amber-100 flex flex-col card-hover">
            <PhotoReel
              frames={SHOP_REEL}
              emoji="🎂"
              tint="from-amber-200 to-rose-200"
              className="h-52 sm:h-60"
              sizes="(min-width: 768px) 50vw, 100vw"
              // Offset from the plan card's cadence so the two never flip in
              // lockstep, which reads as one animation rather than two cards.
              intervalMs={3700}
            />

            <div className="p-6 sm:p-8 flex flex-col flex-1">
              <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold tracking-wider uppercase text-plum-700 bg-plum-100 border border-plum-200 rounded-full px-3 py-1 mb-4">
                <Truck size={12} /> Shop
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Shop the essentials
              </h3>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-5 flex-1">
                Cakes, flowers, hampers, party supplies and pooja samagri — priced,
                in stock and on their way. No enquiry, no waiting for a quote.
              </p>

              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                {[
                  'Prices shown upfront — add to cart and checkout',
                  `Free delivery over ₹${FREE_DELIVERY_THRESHOLD.toLocaleString('en-IN')}`,
                  'Message on the cake, note in the hamper',
                ].map(point => (
                  <li key={point} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-1.5 w-1 h-1 rounded-full bg-plum-500 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>

              <Link
                to="/shop"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-plum-600 text-plum-700 hover:bg-plum-600 hover:text-white font-bold px-6 py-3.5 transition-colors"
              >
                {CTA.shop} <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   1B. The contrast band — moved
   ───────────────────────────────────────────────────────────
   OldWayBand lived here: a two-column "Doing it yourself" vs "With
   Sambramo" section. Its argument, and its exact wording, are now slides one
   and two of components/landing/StoryDeck.jsx, which tells the same case in
   one screen instead of a full-height band.

   Deleted rather than left exported-but-unused. Two copies of the same
   marketing copy in one repo is how the four contradicting descriptors this
   project already had to reconcile got started — one of them still called
   the product a marketplace.
═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   2. Shop categories — real photographs, not thumbnails
═══════════════════════════════════════════════════════════ */

export function ShopCategoryGrid() {
  return (
    <section id="shop" className="py-16 sm:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8 sm:mb-12 reveal">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-plum-600 mb-2">
              Everything, in stock
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900">
              What we deliver
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-plum-700 hover:text-plum-900 font-semibold text-sm"
          >
            {CTA.shop} <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {SHOP_CATEGORIES.map((cat, i) => {
            const src = CATEGORY_PHOTO[cat.id]
            const query = CATEGORY_PHOTO_QUERY[cat.id]

            return (
              <Link
                key={cat.id}
                to={`/shop/${encodeURIComponent(cat.id)}`}
                className={`reveal ${REVEAL_DELAYS[i % REVEAL_DELAYS.length]} group relative rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-shadow`}
              >
                {/* The two categories migration 017 never reached resolve
                    their photo at runtime instead of shipping a hardcoded
                    one; both degrade to the emoji plate if that fails. */}
                {src ? (
                  <Photo
                    src={src}
                    alt={cat.label}
                    emoji={cat.emoji}
                    className="h-36 sm:h-48"
                    sizes="(min-width: 1024px) 33vw, 50vw"
                  />
                ) : (
                  <RuntimePhoto
                    query={query}
                    alt={cat.label}
                    emoji={cat.emoji}
                    className="h-36 sm:h-48"
                  />
                )}

                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />

                <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span aria-hidden="true" className="text-lg sm:text-xl">{cat.emoji}</span>
                    <h3 className="font-bold text-white text-sm sm:text-lg leading-tight">
                      {cat.label}
                    </h3>
                  </div>
                  <p className="text-white/75 text-[11px] sm:text-sm leading-snug line-clamp-2">
                    {cat.tagline}
                  </p>
                </div>

                <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-plum-800 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
                  <ArrowRight size={15} />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   3. Shop by occasion
═══════════════════════════════════════════════════════════ */

/**
 * People shop by the reason, not the aisle. Somebody with a rakhi to post
 * does not think "Gifts" — they think "Rakhi" — so this rail is keyed on the
 * occasion and quietly routes to the category that carries it.
 */
export function OccasionRail() {
  return (
    <section className="py-16 sm:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 sm:mb-10 reveal">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-plum-600 mb-2">
            Shop by occasion
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            What's the occasion?
          </h2>
          <p className="text-gray-500 text-base max-w-xl leading-relaxed">
            Skip the categories. Tell us what's coming up and we'll show you what
            people actually send for it.
          </p>
        </div>

        <SlideCarousel>
          {OCCASION_CARDS.map(card => (
            <div key={card.occasion} className="shrink-0 w-44 sm:w-56 snap-center">
              <Link
                to={`/shop/${encodeURIComponent(card.category)}?occasion=${encodeURIComponent(card.occasion)}`}
                className="group block rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-plum-200 transition-all"
              >
                <Photo
                  src={occasionPhoto(card)}
                  alt={card.label}
                  emoji="🎁"
                  tint="from-plum-200 to-berry-200"
                  className="h-32 sm:h-40"
                  sizes="224px"
                />
                <div className="p-3.5 sm:p-4">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-0.5">
                    {card.label}
                  </h3>
                  <p className="text-gray-500 text-[11px] sm:text-xs leading-snug line-clamp-2">
                    {card.blurb}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </SlideCarousel>

        {/* The three things a first-time buyer actually wants to know before
            they trust a shop they have never heard of. */}
        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          {[
            { icon: Clock,       title: 'Same-day on flowers & cakes', desc: 'Order before 2pm in Bengaluru' },
            { icon: Truck,       title: `Free over ₹${FREE_DELIVERY_THRESHOLD.toLocaleString('en-IN')}`, desc: 'Flat ₹49 below that' },
            { icon: ShieldCheck, title: 'Pay on delivery or UPI',      desc: 'No card details stored, ever' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl bg-white border border-amber-100 p-4">
              <span className="shrink-0 w-9 h-9 rounded-xl bg-white flex items-center justify-center text-plum-600">
                <Icon size={17} />
              </span>
              <div>
                <div className="font-bold text-gray-900 text-sm leading-tight">{title}</div>
                <div className="text-gray-500 text-xs mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
