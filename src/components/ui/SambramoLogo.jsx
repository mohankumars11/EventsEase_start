import { BRAND } from '../../config/sambramo'
import SambramoMark from './SambramoMark'

/**
 * The two lines that can hang under the wordmark, as the phrases they are set
 * from. `descriptor` is the two-part "what is this?" line; `emotion` is one
 * phrase, so the pulli that separates the descriptor's halves opens the line
 * instead — the mark's centre dot doing the same job in both.
 */
const CAPTION_PARTS = {
  descriptor: () => BRAND.taglineParts,
  emotion:    () => [BRAND.emotion],
}

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
  /**
   * false, or which line to hang under the wordmark:
   *
   *   'descriptor' — "Celebrations, arranged ◆ Essentials, delivered". ~45
   *                  characters, so it sets wider than the wordmark and needs
   *                  a rail with room: the footer, the auth panels.
   *   'emotion'    — "Every emotion, valued". Short enough to sit under the
   *                  wordmark unhidden at any width, which is what the navbar
   *                  and the wizard header need.
   *
   * `true` stays a synonym for 'descriptor' so existing callers read the same.
   */
  caption = false,
  /**
   * Escape hatch for a caller whose rail is tighter than the line it asked
   * for — e.g. 'hidden min-[360px]:flex' to drop the caption on the narrowest
   * phones rather than let it push the row into overflow.
   */
  captionClassName = '',
  className = '',
}) {
  const wordColor = ground === 'onDark' ? 'text-white' : 'text-plum-950'

  const mode  = caption === true ? 'descriptor' : caption
  const parts = mode ? CAPTION_PARTS[mode]?.() : null

  // The emotional line is the one thing on the bar that is there to be felt
  // rather than read past, and it is a fifth the length of the descriptor —
  // so it can afford a step more size and a step more contrast without
  // starting to compete with the name above it.
  const isEmotion = mode === 'emotion'

  const capColor = ground === 'onDark'
    ? (isEmotion ? 'text-plum-200' : 'text-plum-300')
    : (isEmotion ? 'text-plum-700' : 'text-plum-600')

  // Playfair at display weight already carries the name; the optical size of
  // the wordmark is tied to the mark so the lockup scales as one object.
  const wordSize = size >= 40 ? 'text-3xl' : size >= 30 ? 'text-xl' : 'text-lg'
  const capSize  = isEmotion
    ? (size >= 40 ? 'text-[11px]' : 'text-[10px]')
    : (size >= 40 ? 'text-[10px]' : 'text-[9px]')

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

      {/* Indented to the wordmark's left edge, and punctuated with a pulli
          rather than a full stop — the dot at the centre of the kolam, set
          between the descriptor's halves or ahead of the single emotional
          phrase. It is the one place the mark's geometry reappears in the
          type, so it earns the extra element either way. */}
      {parts && (
        <span
          style={{ paddingLeft: `${size + GAP}px` }}
          className={`mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 ${capSize} font-semibold leading-snug ${isEmotion ? 'tracking-[0.12em]' : 'tracking-[0.11em]'} uppercase ${capColor} ${captionClassName}`}
        >
          {parts.map((part, i) => (
            <span key={part} className="flex items-center gap-1.5 whitespace-nowrap">
              {/* Separator between halves; opening mark when there is only one. */}
              {(i > 0 || parts.length === 1) && (
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
