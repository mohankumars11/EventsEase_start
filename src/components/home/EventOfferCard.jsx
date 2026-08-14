import { Link } from 'react-router-dom'
import { Crown, ArrowRight, Check, Sparkles } from 'lucide-react'
import DetailRotator from '../shop/DetailRotator'
import { formatINR } from '../../utils/format'

/**
 * One package Sambramo will arrange, as an offer card.
 *
 * These are the closest thing this business has to a "deal", and they are
 * real: every price here is the package's own `price_min`/`price_max` from
 * data/eventServicesData, the same numbers the catalogue and the planner
 * quote. Nothing is marked down, because nothing has been marked up — the
 * codebase's own rule is that per-service prices stay hidden and only
 * whole-job ranges get published, and inventing a struck-through "was
 * ₹1,20,000" to make a range look like a discount would break it.
 *
 * What makes the card an offer rather than a price list is the second half of
 * the proposition: the package is everything, arranged, for one number and
 * one point of contact. So the rotating line spends its turns naming what is
 * actually inside — venue, decor, cake, photography — because "16 services
 * included" is the saving, and it is one nobody has to be lied to about.
 */
export default function EventOfferCard({
  pkg,
  event,              // the EVENT_DATA entry this package belongs to
  stagger = 0,
}) {
  const isHamper = pkg.type === 'hamper'
  const fixed    = pkg.price_min === pkg.price_max

  // Hampers list literal contents; full packages list included services by
  // key, which is why these two read from different fields.
  const inclusions = isHamper ? (pkg.items ?? []) : (pkg.includes ?? [])

  const facts = [
    pkg.popular && { key: 'pop', icon: Crown, tone: 'offer', text: 'Most booked package' },
    !isHamper && inclusions.length > 0 && {
      key: 'count', icon: Sparkles, tone: 'trust',
      text: `${inclusions.length} services, all arranged`,
    },
    ...inclusions.slice(0, 6).map((item, n) => ({
      key: `inc-${n}`,
      icon: Check,
      text: isHamper ? item : labelFor(item),
    })),
    { key: 'tag', text: pkg.tagline },
  ]

  return (
    <article className="home-card group flex h-full flex-col p-4">
      {pkg.popular && (
        <span className="absolute right-0 top-0 rounded-bl-2xl bg-gradient-to-r from-saffron-400 to-saffron-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-plum-950">
          Popular
        </span>
      )}

      <div className="flex items-start gap-2.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-xl">
          {pkg.emoji}
        </span>
        <div className="min-w-0 flex-1 pr-12">
          <p className="text-[13px] font-extrabold leading-tight text-gray-900">{pkg.name}</p>
          <p className="text-[11px] font-semibold text-plum-600">{event.name}</p>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        {!fixed && <span className="text-[11px] font-bold text-gray-500">from</span>}
        <span className="text-[17px] font-extrabold text-plum-900">{formatINR(pkg.price_min)}</span>
        {!fixed && <span className="text-[11px] font-semibold text-gray-500">to {formatINR(pkg.price_max)}</span>}
      </div>

      <DetailRotator facts={facts} stagger={stagger} className="mb-3 mt-1.5" />

      {/* `mt-auto` pins the CTA to the bottom of the card. The rail stretches
          every card to the height of the tallest — a two-line package name is
          enough to do it — and without this the shorter cards left the button
          floating mid-card above 100px of blank white. */}
      <Link
        to={`/services/${event.id}`}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-plum-900 pt-2.5 pb-2.5 text-[12px] font-extrabold text-white transition-transform active:scale-95"
      >
        See what's included <ArrowRight size={13} strokeWidth={3} />
      </Link>
    </article>
  )
}

/* Service keys are snake_case ids in the package data. This is presentation
   only — a key with no entry falls back to a de-underscored version of
   itself, so a service added to the data never renders as a blank line. */
const SERVICE_LABELS = {
  venue: 'Venue', decor: 'Decoration', balloon_arch: 'Balloon arch', stage: 'Stage',
  lighting: 'Lighting', cake: 'Cake', catering: 'Catering', cooks: 'Cooks',
  menu: 'Menu planning', dining: 'Dining setup', welcome_drinks: 'Welcome drinks',
  ice_cream: 'Ice cream counter', dj: 'DJ', live_music: 'Live music',
  entertainment: 'Entertainment', emcee: 'Emcee', photography: 'Photography',
  videography: 'Videography', photobooth: 'Photo booth', kids_play: 'Kids play area',
  bouncers: 'Security', return_gifts: 'Return gifts', invitations: 'Invitations',
  fireworks: 'Fireworks', cleanup: 'Cleanup', transport: 'Transport',
  priest: 'Priest', mandap: 'Mandap', mehendi: 'Mehendi', makeup: 'Makeup',
}
function labelFor(key) {
  return SERVICE_LABELS[key] ?? String(key).replace(/_/g, ' ')
}
