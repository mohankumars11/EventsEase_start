import { BRAND } from '../../config/sambramo'
import SambramoMark from './SambramoMark'

/**
 * Mark + wordmark lockup.
 *
 * The wordmark stays a single colour. The old header split it as
 * "Sambr" + "amo" in saffron, which broke the name at an arbitrary point and
 * put the accent in competition with the mark; the saffron now lives only in
 * the pulli at the centre of the kolam, so the name reads as one word.
 */
export default function SambramoLogo({
  size    = 32,
  // 'onDark' for the plum navbar and footer, 'onLight' for cream and white.
  ground  = 'onDark',
  caption = false,
  /**
   * The caption is ~45 characters. Set at once it is wider than the wordmark
   * it sits under, so in tight rails (the navbar especially, where it competes
   * with the links and the CTA) the caller hides it at small breakpoints
   * rather than letting it push the row into overflow.
   */
  captionClassName = '',
  className = '',
}) {
  const wordColor = ground === 'onDark' ? 'text-white' : 'text-plum-950'
  const capColor  = ground === 'onDark' ? 'text-plum-300' : 'text-plum-600'

  // Playfair at display weight already carries the name; the optical size of
  // the wordmark is tied to the mark so the lockup scales as one object.
  const wordSize = size >= 40 ? 'text-3xl' : size >= 30 ? 'text-xl' : 'text-lg'
  const capSize  = size >= 40 ? 'text-[10px]' : 'text-[9px]'

  // Gap between mark and wordmark, in px. The caption is indented by exactly
  // this plus the mark width so its left edge lands on the wordmark's left
  // edge at any size — hardcoding a Tailwind padding step would only line up
  // at one of them.
  const GAP = 10

  return (
    // The mark pairs with the wordmark in its own row, and the caption hangs
    // beneath that row. Centering the mark against a column that contained
    // both lines dropped it to sit between them, so the mark drifted off the
    // name as soon as a caption was switched on.
    <span className={`inline-flex flex-col ${className}`}>
      <span className="inline-flex items-center" style={{ gap: `${GAP}px` }}>
        <SambramoMark size={size} className="shrink-0" />
        <span className={`font-display font-bold tracking-tight leading-none ${wordSize} ${wordColor}`}>
          {BRAND.name}
        </span>
      </span>

      {/* Indented to the wordmark's left edge, and set as two halves either
          side of a pulli rather than a full stop — the dot at the centre of
          the kolam, doing the punctuation. It is the one place the mark's
          geometry reappears in the type. */}
      {caption && (
        <span
          style={{ paddingLeft: `${size + GAP}px` }}
          className={`mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 ${capSize} font-semibold leading-snug tracking-[0.11em] uppercase ${capColor} ${captionClassName}`}
        >
          {BRAND.taglineParts.map((part, i) => (
            <span key={part} className="flex items-center gap-1.5 whitespace-nowrap">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="inline-block w-[3px] h-[3px] rotate-45 bg-saffron-400 shrink-0"
                />
              )}
              {part}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
