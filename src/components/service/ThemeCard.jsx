import { Check, Star } from 'lucide-react'
import OptionArt from './OptionArt'
import ImageSourceBadge from '../shop/ImageSourceBadge'
import { themeCost } from '../../data/decorThemes'
import { THEME_PHOTOS } from '../../config/generatedServicePhotos'
import { formatINR } from '../../utils/format'

/**
 * One decoration setup, as a card you can actually buy from.
 *
 * ── What a card has to carry ────────────────────────────────────────────
 * The old shelf card was an emoji, a name and a price band on white. That is
 * enough to identify a service and not nearly enough to choose a decoration,
 * because choosing decoration is a visual decision about a specific thing. So
 * every card here answers four questions in the order they get asked:
 *
 *   what does it look like   the art band, drawn in the setup's own palette
 *   what is it               name, and one line of what it actually is
 *   what does it cost        the real number at the scale and headcount on
 *                            screen — not a band, not "from", not "enquire"
 *   is it for me             the tags: the occasion and the region it belongs to
 *
 * The price recomputes as the scale bar above changes, which is the whole
 * argument for putting that bar at the top of the page: a grid where every
 * number is right for *your* event is a grid somebody can shop from.
 */
export default function ThemeCard({ theme, scaleId, guestCount, selected, onSelect, index = 0 }) {
  const cost = themeCost(theme, scaleId, guestCount)
  const photo = THEME_PHOTOS[theme.id]

  return (
    <button
      type="button"
      onClick={() => onSelect(theme)}
      aria-pressed={selected}
      className={`home-card rise-in group text-left transition-all ${
        selected ? 'ring-2 ring-saffron-400' : ''
      }`}
      style={{ '--rise-delay': `${Math.min(index, 10) * 40}ms` }}
    >
      <OptionArt
        tint={theme.tint}
        emoji={theme.emoji}
        seed={index + theme.name.length}
        photo={photo}
        alt={`${theme.name} — representative photograph of a similar setup`}
      >
        {theme.popular && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-plum-900 shadow-sm">
            <Star size={8} className="fill-saffron-500 text-saffron-500" /> Most booked
          </span>
        )}
        {selected && (
          <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-saffron-400 text-plum-950 shadow-md">
            <Check size={13} strokeWidth={3.5} />
          </span>
        )}
        {/* On the image, on every card. DecorSampleGallery states the rule and
            calls it non-negotiable: Sambramo has delivered nothing, every
            photograph here is a licensed lookalike, and a grid of 89 unbadged
            stock photos is precisely the "our recent work" impression that
            component refuses to give. Bottom-left, where the art's own shadow
            already sits, so it does not fight the "Most booked" flag. */}
        {photo?.url && (
          <ImageSourceBadge
            source={photo.source}
            size="sm"
            className="absolute bottom-2 left-2 !px-1.5 !py-0 !text-[8.5px] !gap-0.5"
          />
        )}
      </OptionArt>

      <div className="p-3">
        <p className="text-[13px] font-extrabold leading-tight text-gray-900 line-clamp-2">
          {theme.name}
        </p>
        <p className="mt-1 text-[10.5px] leading-snug text-gray-500 line-clamp-2">
          {theme.blurb}
        </p>

        {/* The number people came for, at their own size. */}
        <p className="mt-2 text-[13px] font-extrabold text-plum-700">
          {formatINR(cost.total)}
          <span className="ml-1 text-[9.5px] font-semibold uppercase tracking-wide text-gray-500">
            {cost.scale.name}
          </span>
        </p>

        {theme.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {theme.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500"
              >
                {tag}
              </span>
            ))}
            <span className="rounded-md bg-plum-50 px-1.5 py-0.5 text-[9px] font-bold text-plum-600">
              {theme.includes.length} things installed
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
