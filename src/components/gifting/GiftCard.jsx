import { Link } from 'react-router-dom'
import { Plus, Minus, Clock, Zap, Star } from 'lucide-react'
import RemoteImage from '../common/RemoteImage'
import { formatINR } from '../../utils/format'
import { useCartLine } from '../shop/useProductAdd'
import { useIsConfigurable } from '../../hooks/useProductOptions'
import { earliestPromise } from '../../lib/deliveryPromise'
import { kindFor, KIND_LABEL, KINDS } from '../../lib/productCopy'

/**
 * One product, as a square tile.
 *
 * ── Why square ───────────────────────────────────────────────────────────
 * A gifting catalogue is photographs, and a square crop is the only ratio
 * that treats a tall bouquet, a wide hamper and a round cake equally badly —
 * which is to say, equally. Mixed ratios make a two-column grid ragged and
 * force every row to the height of its tallest card; a fixed square means the
 * grid is a grid, the eye can scan a column of prices down one axis, and the
 * photo is the thing that differentiates the tiles rather than their shape.
 *
 * ── The price block, and the number that is NOT invented ─────────────────
 * The strike-through and the "N% off" pill render only when `mrp` is a real
 * number ABOVE the selling price. Where no MRP has been set, the card prints
 * one price and no discount theatre.
 *
 * That is a deliberate refusal. An inflated "was" price is the most common
 * lie in this category and it is the one customers have learned to check —
 * once somebody catches a fake anchor on one tile they stop believing the
 * genuine discount on the next one. A catalogue with honest prices on eighty
 * per cent of its rows is worth more than one with fake savings on all of
 * them.
 *
 * ── The delivery line is computed, not a badge ───────────────────────────
 * "Same Day" as a static badge is a claim about the catalogue. `earliestPromise`
 * answers for this product at this moment, so a cake stops advertising
 * same-day delivery after the kitchen's cut-off instead of at midnight.
 */
export default function GiftCard({
  product,
  offer,
  onAdd,
  /** Rank badge for a bestseller rail — 1-indexed, falsy to omit. */
  rank = 0,
  className = '',
}) {
  const p = product
  const { qty, inc, dec } = useCartLine(p.id)
  const configurable = useIsConfigurable(p)

  const price = Number(p.price) || 0
  const mrp = Number(p.mrp) || 0
  // Strictly greater, and by at least a rupee — an MRP equal to the price is
  // a data-entry artefact, not a saving, and printing "0% off" is worse than
  // printing nothing.
  const hasAnchor = mrp > price && mrp - price >= 1
  const offPct = hasAnchor ? Math.round(((mrp - price) / mrp) * 100) : 0

  const promise = earliestPromise(p)
  const kind = kindFor(p)

  // The rating is only shown when it came from somewhere. `seed_rating` is a
  // launch placeholder on some rows and a real aggregate on others; either
  // way an absent value prints nothing rather than an empty star row, because
  // a pre-launch shop inventing social proof is the fastest way to lose it.
  const rating = Number(p.seed_rating) || 0
  const ratingCount = Number(p.seed_rating_count) || 0

  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_10px_22px_-16px_rgba(6,60,42,0.28)] transition-shadow duration-300 hover:shadow-[0_20px_40px_-20px_rgba(6,60,42,0.4)] ${className}`}>
      <Link to={`/shop/product/${p.id}`} className="block">
        <div className="relative">
          <RemoteImage
            src={p.image_url}
            query={p.image_url ? undefined : `${p.name} ${p.category}`}
            emoji={p.emoji}
            alt={p.image_alt || p.name}
            cinematic
            className="aspect-square w-full"
          />

          {/* Top-left stack. Discount first because it is the only thing here
              that changes a decision; the kind label is context. */}
          <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
            {offPct > 0 && (
              <span className="rounded-md bg-chilli-600 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white shadow-sm">
                {offPct}% OFF
              </span>
            )}
            {rank > 0 && (
              <span className="rounded-md bg-forest-800 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white shadow-sm">
                #{rank}
              </span>
            )}
          </div>

          {/* Same-day is the badge people scan for, so it sits bottom-left on
              the photo where the eye lands after the image and before the
              name — and it disappears the moment the cut-off passes. */}
          {promise.sameDay && (
            <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-extrabold text-forest-700 shadow-sm backdrop-blur-sm">
              <Zap size={10} className="fill-current" /> TODAY
            </span>
          )}

          {/* The handmade shelf earns a mark on the photo. It is the one
              differentiator in this catalogue that a competitor cannot copy
              by lowering a price. */}
          {kind === KINDS.CRAFT && (
            <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-emerald-900/90 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-50 shadow-sm">
              Handmade
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-2.5">
        <Link to={`/shop/product/${p.id}`} className="block">
          <h3 className="line-clamp-2 text-[12.5px] font-bold leading-snug text-ink">{p.name}</h3>
        </Link>

        {rating > 0 && (
          <span className="mt-1 inline-flex w-fit items-center gap-0.5 rounded bg-forest-50 px-1 py-px text-[10px] font-bold text-forest-700">
            <Star size={9} className="fill-current" />
            {rating.toFixed(1)}
            {ratingCount > 0 && <span className="font-semibold text-forest-600">({ratingCount})</span>}
          </span>
        )}

        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-[14px] font-extrabold text-ink">{formatINR(price)}</span>
          {hasAnchor && (
            <span className="text-[11px] font-semibold text-ink-mute line-through">{formatINR(mrp)}</span>
          )}
        </div>

        {/* The promise line. Always present, always computed — a tile that
            cannot say when it arrives is a tile that has not answered the
            question the customer is actually holding. */}
        <p className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-ink-mute">
          <Clock size={10} className="shrink-0" />
          <span className="truncate">{promise.short ? `Get it ${promise.short}` : 'Ask us for a date'}</span>
        </p>

        {offer && (
          <p className="mt-1 truncate text-[10px] font-bold text-chilli-600">
            Extra off with {offer.code}
          </p>
        )}

        <div className="mt-2 flex-1" />

        {qty > 0 && !configurable ? (
          <div className="flex h-10 items-center justify-between rounded-full bg-forest-800 px-1 text-white shadow-[0_8px_18px_-10px_rgba(6,60,42,0.6)]">
            <button onClick={dec} aria-label={`Remove one ${p.name}`} className="tap-48 flex h-8 w-8 items-center justify-center rounded-full active:bg-white/15">
              <Minus size={15} />
            </button>
            <span className="text-[13px] font-extrabold">{qty}</span>
            <button onClick={inc} aria-label={`Add one ${p.name}`} className="tap-48 flex h-8 w-8 items-center justify-center rounded-full active:bg-white/15">
              <Plus size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAdd?.(p)}
            className="h-10 w-full rounded-full border border-forest-700 bg-white text-[12px] font-extrabold uppercase tracking-wide text-forest-700 transition-colors active:bg-forest-50"
          >
            {configurable ? 'Choose options' : qty > 0 ? `${qty} in bag` : 'Add'}
          </button>
        )}
      </div>
    </article>
  )
}

/** The same tile at rail width — used inside horizontal scrollers. */
export function GiftCardRailItem(props) {
  return <GiftCard {...props} className={`w-[150px] shrink-0 sm:w-[170px] ${props.className ?? ''}`} />
}
