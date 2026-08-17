import { Link } from 'react-router-dom'
import { BadgeCheck, ArrowUpRight } from 'lucide-react'
import RotatingPhoto from './RotatingPhoto'
import SambramoMark from '../ui/SambramoMark'
import { formatINR } from '../../utils/format'

/**
 * One occasion, as a square.
 *
 * ── Why square, and what it cost ──────────────────────────────────────────
 * This card used to be a 5:4 photograph with a white panel bolted under it
 * holding seven separate facts: a trust badge, a service count, a package
 * count, a "Starting at" label, the price, an arrow, and a coupon-code chip.
 * Fifteen of those in a two-column grid is a very tall page in which no single
 * card has a subject — the photograph, which is the only thing on the card that
 * makes somebody picture their own day, was getting a little over half the
 * height and the rest went to a spec sheet.
 *
 * A square is the right shape for a photo-led tile for the same reason every
 * photo grid ever built converges on it: at two-per-row on a 390px phone it
 * gives the image ~170×170 instead of ~170×136, the grid reads as an even field
 * rather than as a list of receipts, and nothing has to decide how tall a card
 * is — which is what made the old layout ragged whenever one tagline wrapped to
 * three lines and its neighbour's did not.
 *
 * It also puts this card in the same language as ServiceMosaic directly above
 * it on Home: photograph to the edges, copy on a tinted scrim, one arrow. Two
 * grids on one screen speaking two different card dialects was the strongest
 * argument for the change.
 *
 * ── The edit is the design ────────────────────────────────────────────────
 * A square holds a name and a number. It does not hold seven facts, so four of
 * them are gone rather than shrunk:
 *
 *   the tagline          "Another year. Another beautiful memory." is lovely and
 *                        it is the occasion PAGE's headline, one tap away. On a
 *                        170px tile it clamped to one line and read as a
 *                        fragment.
 *   the package count    the service count is the more concrete of the two and
 *                        both were competing for the same 9px row.
 *   "Starting at"        the label cost a whole line to say what "From ₹25,500"
 *                        says in one word.
 *   the coupon-code chip the ribbon already states the discount. The code
 *                        itself is not usable from this screen — you cannot
 *                        type it into anything here — so it belonged at
 *                        checkout, which is where it also still is.
 *
 * What survives is what a person actually chooses on: the photographs, the
 * name, the price, and who is answerable for it.
 *
 * ── What the card is allowed to claim ─────────────────────────────────────
 * `fromPrice` is the cheapest real package for this occasion, straight out of
 * eventServicesData — the same number the catalogue quotes. There is no
 * struck-through "was", because nothing has been marked up.
 *
 * The discount ribbon shows a live coupon from the database, chosen by
 * bestOfferFor against this occasion's entry price — the identical helper and
 * rule the shop's product cards use, so a coupon means the same thing on both
 * halves of the business. When no coupon applies, no ribbon.
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
    <Link
      to={`/services/${o.id}`}
      /* `isolate` so the scrims and the seal stack inside this tile rather than
         against whatever the page has going on behind it. */
      className="group relative isolate block aspect-square overflow-hidden rounded-2xl bg-plum-900 ring-1 ring-hairline/10 shadow-[0_10px_28px_-18px_rgba(43,15,82,0.55)] transition-transform active:scale-[0.985]"
    >
      {/* Four real photographs of this occasion, cross-fading, rather than one
          still. A single stock frame says we own a stock photo; four says we
          have done this, which is what makes somebody picture their own day.
          `stagger` keeps the fifteen cards from flipping in unison, which reads
          as the page glitching.

          No emoji plate is passed. Every occasion has four committed frames
          (generatedDecorSamples), so the fallback would be dead code — and an
          emoji filling a 170px square does not read as graceful degradation, it
          reads as a missing image. A failed URL leaves the plum ground, which
          is a finished surface. */}
      <RotatingPhoto
        photos={o.photos}
        alt={`${o.name} arranged by Sambramo`}
        className="absolute inset-0 h-full w-full"
        stagger={stagger}
      />

      {/* Bottom scrim so the copy stays readable over any photo the resolver
          returns — the images are searched, not art-directed, so the card cannot
          assume a dark or a light one.

          Two layers rather than one ramp. A single gradient sits at ~15% across
          the middle of the tile, which is where the name now goes, and against a
          bright frame that line measured 4.4:1 — right on the AA boundary and
          over it on the lighter ones. The lower half gets a near-solid floor. */}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-plum-950/90 via-plum-950/25 to-plum-950/5" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-plum-950/95 to-transparent" />

      {offerLabel && (
        <span className="absolute left-0 top-2.5 rounded-r-lg bg-chilli-600 py-1 pl-2 pr-2.5 text-[10px] font-extrabold tracking-wide text-white shadow-lg">
          {offerLabel}
        </span>
      )}

      {/* ── The hallmark ──────────────────────────────────────────
          A square seal, top-right, opposite the offer ribbon.

          Square because that is what a hallmark is. A pill reads as a UI label —
          one more badge among the badges — whereas a square carrying a mark
          reads as something stamped onto the object: an assay mark, a GI seal,
          the punch on the back of a piece of Bidriware. This tile is selling
          "somebody reputable arranged this", and that is the shape the trades
          already use for exactly that claim.

          Mark-only, no words inside. Any text that fits in a seal this size
          would be 6px — present but unreadable, which is worse than absent — so
          the seal carries the mark and the words are set as the overline below.

          `solid` because the kolam's monoline centre closes up below ~24px; the
          petals fill and the pulli is knocked out instead. The knockout has to
          be painted the SEAL's own colour, so it is set here rather than
          inherited from --bar (the app bar's white, which would punch a white
          hole in a plum square). Same contract as the Plan tab in BottomNav. */}
      <span
        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-[9px] bg-plum-950/70 ring-1 ring-saffron-400/45 backdrop-blur-[2px]"
        style={{ '--sambramo-knockout': '#2e1065' }}
      >
        <SambramoMark size={19} variant="solid" title="" />
      </span>

      <span className="absolute inset-x-0 bottom-0 flex items-end gap-2 p-2.5">
        <span className="min-w-0 flex-1">
          {/* The trust claim, as an overline rather than a row in a spec panel.
              It is the actual product — a customer is not buying a decorator's
              phone number, they are buying the fact that somebody else handles
              all of it — so it sits directly above the name and the price it
              justifies. */}
          <span className="flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-[0.1em] text-saffron-300">
            <BadgeCheck size={9} strokeWidth={3} className="shrink-0" />
            Arranged by Sambramo
          </span>

          <span className="mt-1 block truncate font-serif text-[15px] font-bold leading-tight text-white drop-shadow">
            {o.name}
          </span>

          <span className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[13px] font-extrabold leading-none text-white">
              {Number.isFinite(o.fromPrice) ? `From ${formatINR(o.fromPrice)}` : 'On request'}
            </span>
            <span className="truncate text-[9px] font-medium text-white/65">
              · {o.serviceCount} services
            </span>
          </span>
        </span>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/95 text-plum-950 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight size={14} strokeWidth={2.8} />
        </span>
      </span>
    </Link>
  )
}
