import { Link } from 'react-router-dom'
import { Check, Users, ArrowRight, ShoppingCart, UtensilsCrossed, Palette } from 'lucide-react'
import { formatINR } from '../../utils/format'
import RatingBadge from '../reviews/RatingBadge'

/**
 * One scale of celebration, priced for this occasion.
 *
 * ── What this replaces ──────────────────────────────────────────────────
 * "Essential Birthday — ₹25,000 to ₹50,000" and "Grand Celebration —
 * ₹75,000 to ₹1,50,000", hand-written per occasion. Two failures, and the
 * second is the expensive one:
 *
 *   The names ranked the buyer. Whoever picks "Essential" has been told by the
 *   product itself that they bought the cheap thing — the precise mistake
 *   celebrationTiers.js exists to avoid, and it was still shipping on the page
 *   customers actually land on.
 *
 *   The range could not move. ₹75,000–₹1,50,000 is the same span whether you
 *   have forty guests or four hundred, so it answered nobody. A range four
 *   times wider than the decision it has to support is not caution, it is a
 *   refusal to quote.
 *
 * This card is named for the shape of the gathering, ordered by guest count,
 * and every rupee on it comes from buildQuote() at the tier's typical
 * headcount with this occasion's own cuisine, decor and services. Two numbers,
 * because there are two different questions:
 *
 *   `from`   the cheapest real booking at this rung — "can I start here"
 *   `range`  what this occasion typically costs here — "what would mine be"
 *
 * Both are labelled. One number pretending to be both is how a customer ends
 * up feeling misled by arithmetic that was honest.
 */
export default function TierPackageCard({
  tier, eventId, selected, suggested, onSelect, inCart, onAdd,
  reviewEnquiryId, onReview, index = 0,
}) {
  const guestLabel = `${tier.guests.min}–${tier.guests.max} guests`

  return (
    <div
      className={`rise-in ${selected ? 'event-halo' : ''}`}
      style={{ '--rise-delay': `${Math.min(index, 10) * 55}ms` }}
    >
      <div className={`event-card sheen-on-hover ${selected ? 'ring-2 ring-white/60' : ''}`}>
        {/* The chosen scale announces itself in words at the top of the card.
            Among eight near-identical cards a moved highlight reads as the page
            having picked its own option. */}
        {selected && (
          <div
            className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white"
            style={{ background: 'var(--event-ink)' }}
          >
            <Check size={11} /> Your scale
          </div>
        )}

        <div className="p-4 sm:p-5">
          {/* ── Identity ──────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-2xl" aria-hidden="true">{tier.emoji}</span>
                <h3 className="text-[17px] font-extrabold leading-tight text-gray-900">{tier.name}</h3>
                <span className="text-[11px] font-medium italic text-gray-400">{tier.localName}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {tier.popular && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                    ★ Most booked
                  </span>
                )}
                {suggested && !selected && (
                  <span className="event-tint rounded-full px-2 py-0.5 text-[10px] font-extrabold">
                    Fits your guest count
                  </span>
                )}
                <RatingBadge subjectType="package" subjectId={tier.id} />
              </div>
              <p className="mt-1.5 text-[13px] font-semibold text-gray-700">{tier.tagline}</p>
            </div>

            <div className="shrink-0 rounded-2xl bg-gray-50 px-2.5 py-2 text-center ring-1 ring-gray-100">
              <Users size={12} className="mx-auto text-gray-400" />
              <p className="mt-0.5 whitespace-nowrap text-[12px] font-extrabold text-gray-800">
                {tier.guests.min}–{tier.guests.max}
              </p>
              <p className="text-[9px] uppercase tracking-wide text-gray-400">guests</p>
            </div>
          </div>

          <p className="mt-2 text-[12px] leading-relaxed text-gray-500">{tier.description}</p>

          {/* ── The two numbers ───────────────────────────────── */}
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-gray-50 p-2.5 ring-1 ring-gray-100">
              <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Starts at</p>
              <p className="text-[15px] font-extrabold leading-tight text-gray-900">
                {Number.isFinite(tier.from) ? formatINR(tier.from) : '—'}
              </p>
              <p className="text-[9.5px] leading-tight text-gray-400">
                the cheapest real booking at {tier.guests.min} guests
              </p>
            </div>
            <div
              className="rounded-2xl p-2.5 ring-1"
              style={{ background: 'rgba(0,0,0,0.03)', borderColor: 'transparent' }}
            >
              <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                Typical {tier.typicalGuests} guests
              </p>
              <p className="text-[15px] font-extrabold leading-tight" style={{ color: 'var(--event-ink)' }}>
                {tier.range
                  ? `${formatINR(tier.range.low)}–${formatINR(tier.range.high)}`
                  : 'On request'}
              </p>
              <p className="text-[9.5px] leading-tight text-gray-400">
                incl. taxes{tier.perGuest ? ` · ≈ ${formatINR(tier.perGuest)}/guest` : ''}
              </p>
            </div>
          </div>

          {/* ── What this rung gets you ───────────────────────
              The occasion's own signature moments deliberately do NOT repeat
              here. They are stated once in the page header; printed again on
              each of eight cards they became three identical lines rendered
              twenty-four times, which trains the eye to skip the block that
              actually differs between rungs. What makes a card occasion-
              specific is underneath it and is real: this occasion's cuisine,
              its decor level and its services (a purohit on a namakarana, a
              DJ on a birthday, AV on a corporate event). */}
          <ul className="mt-3.5 space-y-1">
            {tier.highlights.map(h => (
              <li key={h} className="flex items-start gap-1.5 text-[12px] leading-snug text-gray-600">
                <Check size={11} className="mt-0.5 shrink-0 text-green-600" />
                {h}
              </li>
            ))}
          </ul>

          {/* ── What is priced into it ────────────────────────── */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tier.cuisine && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10.5px] font-semibold text-gray-600 ring-1 ring-gray-100">
                <UtensilsCrossed size={10} className="text-gray-400" />
                {tier.cuisine.name}
                {tier.vegOnly ? ' · pure veg' : ''}
              </span>
            )}
            {tier.decor && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10.5px] font-semibold text-gray-600 ring-1 ring-gray-100">
                <Palette size={10} className="text-gray-400" />
                {tier.decor.name} decor
              </span>
            )}
            {tier.services.map(s => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10.5px] font-semibold text-gray-600 ring-1 ring-gray-100"
              >
                {s.emoji} {s.name}
              </span>
            ))}
          </div>

          <p className="mt-2.5 text-[10.5px] leading-relaxed text-gray-400">
            {tier.coordination}
            {tier.coordinationPct ? ` · coordination is about ${tier.coordinationPct}% of the total` : ''}
          </p>

          {/* ── The actions ───────────────────────────────────── */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <Link
              to={`/plan/build/${eventId}?tier=${tier.id}&guests=${tier.typicalGuests}`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-white transition-transform active:scale-95"
              style={{ background: 'var(--event-ink)' }}
            >
              Build &amp; price this <ArrowRight size={14} />
            </Link>
            <button
              onClick={() => !inCart && onAdd()}
              disabled={inCart}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-extrabold transition-transform active:scale-95 ${
                inCart
                  ? 'cursor-default bg-green-50 text-green-700 ring-1 ring-green-200'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {inCart ? <Check size={14} /> : <ShoppingCart size={14} />}
              {inCart ? 'Added' : 'Add to enquiry'}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onSelect}
              className="text-[11px] font-bold text-gray-400 hover:text-gray-700"
            >
              {selected ? `Your scale — ${guestLabel}` : `Set this as my scale (${guestLabel})`}
            </button>
            {reviewEnquiryId && (
              <button
                onClick={onReview}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700"
              >
                ★ Rate &amp; review
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
