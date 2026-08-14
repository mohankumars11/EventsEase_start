import { Check, Star, Minus, Plus, Info } from 'lucide-react'
import OptionArt from './OptionArt'
import ImageSourceBadge from '../shop/ImageSourceBadge'
import { packCost, packUnitLabel, defaultPackQty } from '../../data/servicePacks'
import { PACK_PHOTOS } from '../../config/generatedServicePhotos'
import { formatINR } from '../../utils/format'

/**
 * One bookable package — a photographer's full day, a 25 kVA generator, four
 * mehendi artists.
 *
 * ── Why the whole inclusion list is on the card ─────────────────────────
 * The instinct is to truncate: show two lines, hide the rest behind "see
 * details". That is right for a shop where the product is a known object and
 * wrong here, because the entire question a customer has about "Photography —
 * ₹35,000" is *what do I get for that*. A collapsed list makes them tap to find
 * out, and every tap between a price and its justification is somewhere to
 * leave. The list is the product; it stays open.
 *
 * ── The quantity stepper ────────────────────────────────────────────────
 * Only on `unit` packs, and it opens at a count sized to the guest number
 * rather than at one — four guards for 400 guests, two minders for a party
 * with children. Nobody should have to work out the ratio; they should only
 * have to disagree with ours.
 */
export default function PackCard({
  pack, guestCount, selected, qty, onSelect, onQty, index = 0,
}) {
  const photo = PACK_PHOTOS[pack.id]
  const count = qty ?? defaultPackQty(pack, guestCount)
  const total = packCost(pack, guestCount, count)
  const isUnit = pack.unit === 'unit'
  const isGuest = pack.unit === 'guest'

  return (
    <div
      className={`home-card rise-in flex flex-col transition-all ${
        selected ? 'ring-2 ring-saffron-400' : ''
      }`}
      style={{ '--rise-delay': `${Math.min(index, 10) * 45}ms` }}
    >
      <button
        type="button"
        onClick={() => onSelect(pack)}
        aria-pressed={selected}
        className="text-left"
      >
        <OptionArt
          tint={pack.tint}
          emoji={pack.emoji}
          height={96}
          seed={index + pack.name.length}
          photo={photo}
          alt={`${pack.name} — representative photograph`}
        >
          {pack.popular && (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-plum-900 shadow-sm">
              <Star size={8} className="fill-saffron-500 text-saffron-500" /> Most booked
            </span>
          )}
          {selected && (
            <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-saffron-400 text-plum-950 shadow-md">
              <Check size={13} strokeWidth={3.5} />
            </span>
          )}
          {/* Same non-negotiable rule as every other image in this app — see
              the note in ThemeCard and the header of DecorSampleGallery. */}
          {photo?.url && (
            <ImageSourceBadge
              source={photo.source}
              size="sm"
              className="absolute bottom-2 left-2 !px-1.5 !py-0 !text-[8.5px] !gap-0.5"
            />
          )}
        </OptionArt>

        <div className="px-3.5 pt-3">
          <p className="text-[14px] font-extrabold leading-tight text-gray-900">{pack.name}</p>
          <p className="mt-1 text-[11.5px] leading-snug text-gray-500">{pack.blurb}</p>

          {/* Rate and total are different numbers and are stated as such — the
              exact mistake the occasion cards used to make, where a ₹120/seat
              dining setup rendered as "₹14,400 per guest". */}
          <p className="mt-2.5 text-[15px] font-extrabold text-plum-700">
            {formatINR(total)}
            <span className="ml-1.5 text-[10px] font-semibold text-gray-500">
              {isGuest
                ? `${formatINR(pack.price)} per guest × ${guestCount || 0}`
                : isUnit
                  ? `${count} × ${formatINR(pack.price)} ${packUnitLabel(pack).replace('per ', 'per ')}`
                  : 'for the event'}
            </span>
          </p>

          <ul className="mt-2.5 space-y-1">
            {pack.includes.map(line => (
              <li key={line} className="flex items-start gap-1.5 text-[11px] leading-snug text-gray-600">
                <Check size={11} className="mt-[3px] shrink-0 text-green-600" />
                {line}
              </li>
            ))}
          </ul>

          {pack.note && (
            <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[10.5px] leading-snug text-amber-800">
              <Info size={11} className="mt-[2px] shrink-0" />
              {pack.note}
            </p>
          )}
        </div>
      </button>

      {/* How many. Only where the question is real — nobody orders two
          "full day photography". */}
      {isUnit && (
        <div className="mt-auto flex items-center justify-between gap-3 px-3.5 pb-3 pt-3">
          <span className="text-[11px] font-bold text-gray-500">
            How many {pack.unitLabel ?? 'unit'}s?
          </span>
          <div className="flex items-center rounded-xl ring-1 ring-gray-200">
            <button
              type="button"
              onClick={() => onQty(pack, Math.max(1, count - 1))}
              disabled={count <= 1}
              aria-label="One fewer"
              className="p-2 text-gray-500 disabled:opacity-30"
            >
              <Minus size={13} />
            </button>
            <span className="w-7 text-center text-[13px] font-extrabold text-gray-900">{count}</span>
            <button
              type="button"
              onClick={() => onQty(pack, count + 1)}
              aria-label="One more"
              className="p-2 text-gray-500"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      )}

      {!isUnit && <div className="pb-3" />}
    </div>
  )
}
