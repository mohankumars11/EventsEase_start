import { Link } from 'react-router-dom'
import { UserRound, Timer, ShieldCheck, ArrowRight } from 'lucide-react'
import { useShopCategories } from '../../hooks/useShopCategories'
import { CATEGORY_PHOTO } from '../../config/imagery'

/**
 * The two proof blocks inside the hero card: what we sell, and why to
 * trust us with it.
 */

/**
 * "Party Essentials" and "Pooja & Essentials" set at full length wrap the
 * row on a 375px screen. Shortened for display only — the link still
 * carries the real category id.
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
 *
 * ── Why this is a scrolling rail and not a wrapping pill block ────────────
 * As pills it wrapped to three rows on a phone and cost roughly 90px of the
 * one screen that can least afford it — and those 90px sat directly above the
 * primary CTA, which is the element it was pushing off the fold.
 *
 * One non-wrapping row fixes the height, and once it is one row the honest
 * form for it is the rail every marketplace already uses: a photograph per
 * category rather than an emoji, scrolled horizontally with the thumb. It is
 * shorter, it shows the actual goods, and it is a gesture people already know.
 * The photos are the same module constants the storefront cards use, so the
 * rail cannot show a different cake from the one the category page opens on.
 */
export function ShopRail() {
  const shopCategories = useShopCategories()
  return (
    <div className="relative -mx-6 sm:mx-0 mt-5 sm:mt-6 pt-5 border-t border-white/10">
      <div className="flex sm:flex-wrap sm:justify-center gap-3 sm:gap-4 overflow-x-auto scrollbar-hide px-6 sm:px-0 pb-1">
        {shopCategories.map(cat => (
          <Link
            key={cat.id}
            to={`/shop/${encodeURIComponent(cat.id)}`}
            className="group shrink-0 flex flex-col items-center gap-1.5 w-14"
          >
            <span className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white/10 border border-white/20 group-hover:border-saffron-400/70 transition-colors">
              {/* The emoji is the floor, not the fallback of last resort: it
                  sits underneath at all times so a slow or failed photo shows
                  a designed circle rather than an empty ring. */}
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-lg">
                {cat.emoji}
              </span>
              {CATEGORY_PHOTO[cat.id] && (
                <img
                  src={CATEGORY_PHOTO[cat.id]}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="relative w-full h-full object-cover"
                />
              )}
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-white/75 group-hover:text-white transition-colors whitespace-nowrap">
              {SHORT_LABEL[cat.id] ?? cat.label}
            </span>
          </Link>
        ))}

        {/* The catalogue is still growing, and saying so is the difference
            between "this is all they have" and "worth checking back". */}
        <Link to="/shop" className="group shrink-0 flex flex-col items-center gap-1.5 w-14">
          <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-saffron-400/15 border border-dashed border-saffron-400/50 text-saffron-300 group-hover:bg-saffron-400/25 transition-colors">
            <ArrowRight size={16} aria-hidden="true" />
          </span>
          {/* Deliberately not a count. The Shop hero prints "600+ items" and
              resolve-product-images.mjs puts the catalogue at ~344 rows — one
              of those two is wrong, and the hero of the whole site is not the
              place to repeat a number nobody has reconciled. */}
          <span className="text-[10px] sm:text-[11px] font-semibold text-saffron-300 group-hover:text-saffron-200 transition-colors whitespace-nowrap">
            See all
          </span>
        </Link>
      </div>
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

/**
 * Two layouts, because three tiles across a 375px screen is not a layout.
 *
 * ── What was wrong ────────────────────────────────────────────────────────
 * It was one grid at every width: three cards, each a centred icon over a
 * centred title, with the explanatory line hidden below `sm`. At 375px that
 * left three ~105px columns carrying "One coordinator", "Proposal in 24–48
 * hrs" and "Free to ask" — the middle one wrapping to three ragged lines
 * against its neighbours' one, so the row sat visibly off-balance directly
 * under the primary CTA. And hiding `desc` meant the phone got the headline
 * without the thing that makes it mean anything.
 *
 * ── What it is now ────────────────────────────────────────────────────────
 * Phones get one row per claim: icon on the left, title and description
 * beside it, reading as three short sentences instead of three cramped
 * columns. Nothing is hidden, and left-aligned rows cost less height than
 * centred cards because the text uses the full width instead of wrapping at
 * a third of it.
 *
 * From `sm` it becomes the three-across row it always wanted to be, at a
 * width where three columns genuinely fit and the description has room.
 */
export function TrustRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-left sm:text-center">
      {POINTS.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 bg-white/[0.07] border border-white/10 rounded-2xl px-3.5 py-3 sm:p-4 backdrop-blur-sm"
        >
          <span className="w-9 h-9 rounded-xl bg-saffron-400/15 text-saffron-300 flex items-center justify-center shrink-0">
            <Icon size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-white text-[13px] sm:text-sm font-bold leading-tight">{title}</p>
            <p className="text-white/55 text-[11px] sm:text-xs leading-snug mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
