import { Link } from 'react-router-dom'
import { BadgeCheck, Ticket, ArrowRight } from 'lucide-react'
import RotatingPhoto from './RotatingPhoto'
import { formatINR } from '../../utils/format'

/**
 * One occasion, as something worth tapping.
 *
 * This replaces a row of 72×72 thumbnails with a caption under each. That row
 * was the whole of "What are we celebrating?" on the home screen, and it had
 * three problems that compounded: at 72px the photograph was a smudge, so
 * fifteen occasions read as fifteen identical grey squares; nothing on it said
 * what an occasion costs, includes, or that we arrange it, so there was no
 * reason to tap one rather than another; and being a horizontal scroller, the
 * eleven occasions past the fold were never seen at all.
 *
 * A two-per-row grid is the fix for all three. The photo gets ~170px and
 * becomes legible, there is room for a price and a badge, and every occasion
 * is on screen as you scroll rather than hidden behind a swipe most people
 * never make.
 *
 * ── What the card is allowed to claim ──────────────────────────────────
 * `fromPrice` is the cheapest real package for this occasion, straight out of
 * eventServicesData — the same number the catalogue quotes. There is no
 * struck-through "was", because nothing has been marked up; the codebase's
 * rule is that only whole-job ranges get published and inventing a fake
 * original to manufacture a discount would break it.
 *
 * The discount ribbon shows a *live coupon from the database*, chosen by
 * bestOfferFor against this occasion's entry price — the identical helper and
 * the identical rule the shop's product cards use, so a coupon means the same
 * thing on both halves of the business. When no coupon applies, no ribbon: an
 * empty offer slot is better than a decorative one nobody can redeem.
 */
export default function OccasionCard({ occasion, offer, stagger = 0 }) {
  const o = occasion

  // What the ribbon says. Percent coupons are stated as the percentage
  // (which is what people remember); flat ones as the rupee amount.
  const offerLabel = offer
    ? offer.discount_type === 'percent'
      ? `${Number(offer.discount_value)}% OFF`
      : `${formatINR(offer.discount_value)} OFF`
    : null

  return (
    <Link to={`/services/${o.id}`} className="home-card group flex flex-col">
      <span className="relative block">
        {/* Four real photographs of this occasion, cross-fading, rather than
            one still. A single stock frame says we own a stock photo; four
            says we have done this, which is what makes somebody picture their
            own day. `stagger` keeps the fifteen cards from flipping in
            unison, which reads as the page glitching. */}
        <RotatingPhoto
          photos={o.photos}
          emoji={o.emoji}
          alt={`${o.name} arranged by Sambramo`}
          className="aspect-[5/4] w-full"
          stagger={stagger}
        />
        {/* Bottom scrim so the title stays readable over any photo the
            resolver returns — the images are searched, not art-directed, so
            the card cannot assume a dark or a light one.

            Two layers rather than one ramp. The single gradient is at 15%
            across the middle of the card, which is where the tagline sits,
            and against a bright photograph that line measured 4.4:1 — right
            on the AA boundary and over it on the lighter frames. The lower
            two-fifths gets a near-solid floor. */}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-plum-950/85 via-plum-950/15 to-transparent" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-plum-950/95 to-transparent" />

        {offerLabel && (
          <span className="absolute left-0 top-2.5 rounded-r-lg bg-chilli-600 py-1 pl-2 pr-2.5 text-[10px] font-extrabold tracking-wide text-white shadow-lg">
            {offerLabel}
          </span>
        )}

        <span className="absolute inset-x-0 bottom-0 p-2.5">
          <span className="block font-serif text-[15px] font-bold leading-tight text-white drop-shadow">
            {o.name}
          </span>
          <span className="mt-0.5 block text-[10px] leading-snug text-white/70 line-clamp-1">
            {o.tagline}
          </span>
        </span>
      </span>

      <span className="flex flex-1 flex-col p-2.5">
        {/* The trust mark, on every card rather than only as a rail heading.
            "Arranged by Sambramo" is the actual product — a customer is not
            buying a decorator's phone number, they are buying the fact that
            somebody else handles all of it — and it belongs next to the price
            it justifies. */}
        <span className="flex items-center gap-1 text-[10px] font-bold text-plum-600">
          <BadgeCheck size={11} className="shrink-0" />
          Arranged by Sambramo
        </span>

        <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
          <span>{o.serviceCount} services</span>
          <span aria-hidden="true">·</span>
          <span>{o.packageCount} packages</span>
        </span>

        <span className="mt-2 flex items-end justify-between gap-1">
          <span className="min-w-0">
            <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-500">
              Starting at
            </span>
            <span className="block truncate text-[15px] font-extrabold leading-none text-gray-900">
              {Number.isFinite(o.fromPrice) ? formatINR(o.fromPrice) : 'On request'}
            </span>
          </span>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-plum-600 text-white transition-transform group-hover:translate-x-0.5">
            <ArrowRight size={14} strokeWidth={2.6} />
          </span>
        </span>

        {offer && (
          <span className="mt-2 flex items-center gap-1 rounded-lg bg-chilli-50 px-2 py-1 text-[10px] font-bold text-chilli-700">
            <Ticket size={10} className="shrink-0" />
            <span className="truncate">Use code {offer.code}</span>
          </span>
        )}
      </span>
    </Link>
  )
}
