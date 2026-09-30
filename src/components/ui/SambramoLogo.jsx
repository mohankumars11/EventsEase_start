import { BRAND } from '../../config/sambramo'


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
 * ── The lockup ──────────────────────────────────────────────
 * Mark on the left, and a column to its right holding the wordmark with the
 * caption hung under it. One rule governs the whole thing: the mark is
 * vertically centred on that column, and it is sized to stand as tall as the
 * column is. That is what makes it a lockup rather than three elements that
 * happen to be near each other.
 *
 * It used to be built the other way round — a column of [row(mark, wordmark)]
 * + [caption], with the caption pushed right by `paddingLeft: size + GAP` to
 * land under the wordmark. Two things were wrong with that. The indent was
 * arithmetic standing in for alignment: it only agreed with the wordmark's
 * left edge because the number was recomputed from the same gap, and nothing
 * held it there. And with the caption outside the mark's row, the mark was
 * centred on the wordmark alone, so as soon as a caption appeared the lockup
 * grew a second line the mark knew nothing about and sat visibly high against
 * it — top-left heavy, with the caption trailing off the bottom right.
 *
 * Now the caption is the wordmark's sibling in one column, so their left
 * edges are the same edge and cannot drift; and the mark is centred on both.
 *
 * ── The mark's size ─────────────────────────────────────────
 * `size` is the mark's height with no caption. With one, the mark scales up
 * to bracket the taller stack — a mark that stays at wordmark height next to
 * two lines of type reads as an icon sitting beside some text, which is the
 * one thing a lockup must not look like.
 *
 * ── The turn ────────────────────────────────────────────────
 * On hover the mark rotates a quarter turn. The kolam has four-fold symmetry
 * — rotating it 90° about its centre maps it exactly onto itself — so it
 * turns without ever becoming a different shape. The gradient rides with it,
 * which is the only part you actually see move. It costs one transform and
 * it is the sort of detail that reads as a brand having been made rather
 * than assembled.
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

  // 1.28 is the wordmark-plus-caption stack measured against the wordmark
  // alone at every size this component is called at — the mark ends up a
  // hair taller than the type it stands beside, which is where a mark wants
  // to sit. Rounded so the SVG lands on whole pixels.
  const markSize = parts ? Math.round(size * 1.28) : size

  // Optical gap: a wider mark needs a little more air before the name, and
  // tying it to the mark keeps the proportion identical at 32px and at 52px.
  const gap = Math.round(markSize * 0.3)

  return (
    /* ── There is no mark beside the name any more ──────────────────────
       This was [mark] [wordmark over caption], and the whole file was
       organised around holding those two in a lockup: `markSize`, the
       optical `gap`, the 1.28 factor that made the mark bracket a
       two-line stack. All of it existed to stop the Spencerian S sitting
       visibly high against the type.

       The S is retired (see SambramoWordmark) and the name is the mark, so
       the lockup collapses to one column and every one of those numbers
       stops having anything to align. `markSize` and `gap` are computed
       above and no longer read — left in place only because `markSize`
       still documents the ratio a future mark would need; delete both when
       it is clear nothing is coming back.

       Centred rather than left-aligned: on the auth panels this is the
       subject of the screen, and a lockup that is the subject of a screen
       is centred on it. */
    <span className={`group/logo inline-flex flex-col items-center text-center ${className}`}>
      <span className="inline-flex min-w-0 flex-col items-center">
        <span
          className={`font-display font-bold tracking-tight leading-none ${wordSize} ${
            ground === 'onDark' ? 'text-white' : 'brand-aqua-text'
          }`}
        >
          {BRAND.name}
        </span>

        {/* Punctuated with a pulli rather than a full stop — the dot at the
            centre of the kolam, set between the descriptor's halves or ahead
            of the single emotional phrase. It is the one place the mark's
            geometry reappears in the type, so it earns the extra element
            either way. */}
        {parts && (
          <span
            className={`mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 ${capSize} font-semibold leading-snug ${isEmotion ? 'tracking-[0.12em]' : 'tracking-[0.11em]'} uppercase ${capColor} ${captionClassName}`}
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
    </span>
  )
}
