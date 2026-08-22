import { useId } from 'react'

/**
 * The Sambramo lockup — a gold Spencerian S over the wordmark.
 *
 * ── Drawn from the reference, not traced from it ──────────────────────────
 * The brand supplied an ornate gold S on navy: a flag at the top right, a
 * long tapered spine, an open curl at the bottom left heavier than the bowl
 * above it. That is a Spencerian capital, and it is set here as one — real
 * script type rather than path data, for the reason given on Monogram below.
 *
 * ── Two grounds, one mark ─────────────────────────────────────────────────
 * On navy (the splash) the wordmark is white and the S is gold, which is the
 * reference exactly. On white (the app itself) the S stays gold and the
 * wordmark takes royal-800 — the blue of a wedding invitation rather than a
 * bank — because white type on white is not a choice.
 *
 * The blue is an IDENTITY ramp and is kept apart from plum, which stays the
 * interaction colour. The moment a brand colour also means "tap this", every
 * logo on the page starts looking like a button.
 */
export default function SambramoWordmark({
  /** Height of the whole lockup in px. Everything scales from this. */
  size = 56,
  /** 'stacked' for splash and hero, 'inline' for an app bar. */
  layout = 'stacked',
  /** Set false on a dark ground; the wordmark then paints white. */
  onLight = true,
  className = '',
  /** Hides the ® — it belongs on a splash, not in 20px of chrome. */
  registered = false,
}) {
  const id = useId()
  const gold = `gold-${id}`
  const ink = onLight ? 'text-royal-800' : 'text-white'

  const markSize = layout === 'stacked' ? size * 0.62 : size * 1.15

  return (
    <span
      className={`inline-flex ${layout === 'stacked' ? 'flex-col items-center gap-1.5' : 'flex-row items-center gap-1.5'} ${className}`}
      aria-label="Sambramo"
    >
      <Monogram size={markSize} gradientId={gold} />

      <span
        className={`font-display font-bold leading-none tracking-[-0.015em] ${ink}`}
        style={{ fontSize: layout === 'stacked' ? size * 0.44 : size * 0.62 }}
      >
        Sambramo
        {registered && (
          <sup className="ml-0.5 align-super text-[0.34em] font-semibold opacity-70">®</sup>
        )}
      </span>
    </span>
  )
}

/**
 * The monogram alone — for a splash, a seal on a card, a tab bar.
 *
 * ── Why the S is type and not path data ───────────────────────────────────
 * The mark is a Spencerian capital: a flag at the top right, a long tapered
 * spine, and an open curl at the bottom left that is larger than the bowl
 * above it. None of those three exist in a book serif, and none of them
 * survive being approximated by hand — a Spencerian S is defined by where the
 * stroke swells and where it goes hairline, and eyeballing that in cubic
 * Béziers produces a shape that is recognisably almost-right, which is worse
 * than plainly different.
 *
 * So it is Pinyon Script, a real Spencerian face, with one glyph used. Snell
 * Roundhand and Apple Chancery are the fallbacks and are the same species; a
 * font that has not loaded yet degrades to a near neighbour rather than to
 * something geometric.
 *
 * ── The gold ──────────────────────────────────────────────────────────────
 * Gilding is not a colour, it is a sequence: a pale edge where the light
 * catches, a saturated body, a burnt shadow in the recess, and one hard
 * highlight running across the middle. The gradient below is that sequence on
 * a diagonal, and the near-white stop at 46% is the highlight — it is what
 * stops the letter reading as flat yellow and is the "gold and white mix" the
 * reference has.
 */
export function Monogram({ size = 40, gradientId, className = '' }) {
  const fallback = useId()
  const gid = gradientId ?? `gold-${fallback}`

  /* ── Two ramps, and the small one is not a shortcut ──────────────────────
     The highlight stop is what makes the letter look gilded, and it is also
     near-white — which on a white ground at 20px turns a third of the stroke
     invisible and leaves a broken S. Above ~30px the stroke is wide enough
     to carry the highlight and still read; below it the letter needs to be
     one solid, darker metal. This is the same reason the old kolam mark had
     a `solid` variant below 24px. */
  const small = size < 30

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Sambramo"
    >
      <defs>
        <linearGradient id={gid} x1="16" y1="10" x2="50" y2="56" gradientUnits="userSpaceOnUse">
          {small ? (
            <>
              <stop offset="0%"   stopColor="#D9A445" />
              <stop offset="50%"  stopColor="#B8823A" />
              <stop offset="100%" stopColor="#8C5F22" />
            </>
          ) : (
            <>
              <stop offset="0%"   stopColor="#EFCE7E" />
              <stop offset="20%"  stopColor="#D9A445" />
              <stop offset="42%"  stopColor="#FFF4CF" />
              <stop offset="58%"  stopColor="#C9973A" />
              <stop offset="82%"  stopColor="#8C5F22" />
              <stop offset="100%" stopColor="#E4C173" />
            </>
          )}
        </linearGradient>
      </defs>

      {/* ── The size and the offset are measured, not eyeballed ────────────
          A script face sets its capitals oddly against the em, and Pinyon
          Script is worse than most: getBBox on the glyph at font-size 100
          reports ink 89.1 wide by 124.8 tall, and — because textAnchor
          centres on the ADVANCE and this S carries a long entry stroke — the
          ink's own centre sits 18.9 to the RIGHT of the anchor.

          Both numbers were read off the rendered glyph rather than guessed,
          because guessing produced a letter at two-fifths of the box on the
          first attempt and a clipped one on the second.

             font-size  100 × (56 / 124.8) ≈ 46, to leave a 4px margin
             x          32 − (18.9 × 0.46) ≈ 23.3, to put ink centre on 32 */}
      <text
        x="23.3"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fill={`url(#${gid})`}
        /* ── The weight is added, because the face has none ──────────────
           The reference S is heavy: broad strokes with a visible taper.
           Pinyon Script is the right LETTERFORM — the flag, the spine, the
           open lower curl — and the wrong weight; it is a hairline face, and
           a hairline gold letter on a white page is a rumour.

           Stroking the glyph in its own gradient thickens every stroke by
           twice the width while leaving the skeleton untouched, which is
           what a heavier cut of the same script would do. `paint-order` puts
           the stroke behind the fill so the highlight in the middle of the
           gradient still reads as a highlight rather than being outlined.

           1.6 in a 64 box at font-size 46 is roughly a 3.5% stroke — enough
           to carry the letter at 22px, not enough to close the counters. */
        stroke={`url(#${gid})`}
        strokeWidth={small ? 2.1 : 1.6}
        strokeLinejoin="round"
        style={{
          fontFamily: '"Pinyon Script", "Snell Roundhand", "Apple Chancery", cursive',
          fontSize: '46px',
          fontWeight: 400,
          paintOrder: 'stroke fill',
        }}
      >
        S
      </text>
    </svg>
  )
}
