import { Link } from 'react-router-dom'
import { UserRound, Timer, ShieldCheck, ArrowRight } from 'lucide-react'
import { SHOP_CATEGORIES } from '../../config/shop'

/**
 * The two proof blocks inside the hero card: what we sell, and why to
 * trust us with it.
 */

/**
 * "Party Essentials" and "Pooja & Essentials" set at full length wrap the
 * pill row to three or four lines on a 375px screen. Shortened for display
 * only — the link still carries the real category id.
 */
const SHORT_LABEL = {
  'Party Essentials':   'Party',
  'Pooja & Essentials': 'Pooja',
}

/**
 * The shop half of the business, as navigation rather than prose.
 *
 * This replaced the tail of the hero paragraph — "or shop cakes, flowers,
 * hampers and pooja essentials" — which named four of the six real
 * categories and read as the whole catalogue. Gifts and Party Essentials
 * were invisible to anyone who arrived wanting exactly those.
 *
 * Driven off SHOP_CATEGORIES rather than a hardcoded list, because a
 * hardcoded list is precisely how it drifted to four-of-six; a seventh
 * category added to config now appears here on its own.
 */
export function ShopPills() {
  const pill = 'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap'

  return (
    <div className="relative flex flex-wrap items-center justify-center gap-2 mb-6 sm:mb-8">
      {SHOP_CATEGORIES.map(cat => (
        <Link
          key={cat.id}
          to={`/shop/${encodeURIComponent(cat.id)}`}
          className={`${pill} bg-white/10 border-white/15 text-white/85 hover:bg-white/20 hover:text-white`}
        >
          <span aria-hidden="true">{cat.emoji}</span>
          {SHORT_LABEL[cat.id] ?? cat.label}
        </Link>
      ))}

      {/* The catalogue is still growing, and saying so is the difference
          between "this is all they have" and "worth checking back". */}
      <Link
        to="/shop"
        className={`${pill} bg-saffron-400/15 border-saffron-400/30 text-saffron-200 hover:bg-saffron-400/25 hover:text-saffron-100`}
      >
        <span aria-hidden="true">✨</span>
        more every week
        <ArrowRight size={12} aria-hidden="true" />
      </Link>
    </div>
  )
}

/**
 * Three reasons to hand over a celebration.
 *
 * The previous version was three loose spans of `text-white/60` floating
 * under the card, and two of them — "A real team handles your request" and
 * "Personal coordinator assigned" — made the same point twice, spending a
 * third of the space saying nothing new.
 *
 * Every claim below is already stated elsewhere on this same page (the FAQ
 * accordion and the PathFork panels), so the hero is summarising the site
 * rather than making promises the rest of it doesn't back.
 */
const POINTS = [
  {
    icon:  UserRound,
    title: 'One coordinator',
    desc:  'A real person on WhatsApp, start to finish',
  },
  {
    icon:  Timer,
    title: 'Proposal in 24–48 hrs',
    desc:  'Not days of chasing quotes yourself',
  },
  {
    icon:  ShieldCheck,
    title: 'Free to ask',
    desc:  'The fee is in the proposal, disclosed upfront',
  },
]

export function TrustRow() {
  return (
    // Three across at every width. Stacking them on mobile would add ~180px
    // directly below the primary CTA, on the one screen that can least
    // afford the height — so phones get icon and title, and the supporting
    // line appears from sm up where there is room for it.
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {POINTS.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="flex flex-col items-center text-center gap-1.5 sm:gap-2 bg-white/[0.07] border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-sm"
        >
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-saffron-400/15 text-saffron-300 flex items-center justify-center shrink-0">
            <Icon size={16} aria-hidden="true" />
          </span>
          <p className="text-white text-[11px] sm:text-sm font-bold leading-tight">{title}</p>
          <p className="hidden sm:block text-white/55 text-xs leading-snug">{desc}</p>
        </div>
      ))}
    </div>
  )
}
