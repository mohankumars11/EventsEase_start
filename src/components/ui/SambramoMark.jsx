import { useId } from 'react'

/**
 * The Sambramo mark — a kolam.
 *
 * A kolam is drawn on the threshold at dawn: a grid of dots, and one
 * continuous line looped around them without lifting the hand. It is the
 * shape of welcome, and it happens to describe the product — one line, no
 * beginning and no end, touching every point it passes.
 *
 * The whole mark is this single closed path. Nothing is redrawn per size or
 * per context; the variants below only change how it is painted.
 */
export const KOLAM_PATH =
  'M38 26C48 22 60 28 60 32C60 36 48 42 38 38C42 48 36 60 32 60C28 60 22 48 26 38C16 42 4 36 4 32C4 28 16 22 26 26C22 16 28 4 32 4C36 4 42 16 38 26Z'

/**
 * Marigold → saffron → rose. Deliberately stops short of the berry end of the
 * palette: magenta sits too close to plum-950 in luminance and the tail of the
 * gradient went muddy on the dark navbar. This ramp stays legible on cream and
 * on plum, so there is one gradient instead of a per-ground pair.
 */
const RAMP = ['#FCD34D', '#F59E0B', '#FB7185']

export default function SambramoMark({
  size = 32,
  // 'gradient' for display sizes, 'solid' below ~24px where the monoline
  // centre closes up, 'current' to inherit the surrounding text colour.
  variant = 'gradient',
  className = '',
  title = 'Sambramo',
}) {
  const gradientId = `sambramo-ramp-${useId()}`

  const stroke = variant === 'current' ? 'currentColor' : `url(#${gradientId})`
  const pulli  = variant === 'current' ? 'currentColor' : '#F59E0B'

  return (
    <svg
      viewBox="-3 -3 70 70"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
    >
      {variant !== 'current' && (
        <defs>
          <linearGradient id={gradientId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={RAMP[0]} />
            <stop offset="0.5" stopColor={RAMP[1]} />
            <stop offset="1" stopColor={RAMP[2]} />
          </linearGradient>
        </defs>
      )}

      {variant === 'solid' ? (
        <>
          {/* Below ~24px the stroked centre fills in, so the relationship
              inverts: the petals become solid and the pulli is knocked out. */}
          <path d={KOLAM_PATH} fill={stroke} />
          <circle cx="32" cy="32" r="5.5" fill="var(--sambramo-knockout, #2E1065)" />
        </>
      ) : (
        <>
          <path d={KOLAM_PATH} fill="none" stroke={stroke} strokeWidth="5.5" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="3.8" fill={pulli} />
        </>
      )}
    </svg>
  )
}
