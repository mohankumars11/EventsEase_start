import { useId, useState, useEffect } from 'react'
import { fetchBranding } from '../../lib/branding'

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

  /* ── An uploaded logo wins, everywhere, with no other file changed ───────
     Putting the lookup HERE rather than at each call site is the whole
     design: the app bars, the tab bar, every celebration card, both auth
     screens, the planner, the admin rail and the splash all draw through
     this component, so an admin uploading a file in the console replaces the
     mark in all of them at once and nothing else has to know.

     The drawn mark is not a placeholder for the upload — it is the fallback
     that renders before the fetch resolves, when nothing has been uploaded,
     and if the image 404s later. There is never a frame with no logo. */
  const [uploaded, setUploaded] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchBranding().then(b => { if (!cancelled) setUploaded(b) })
    return () => { cancelled = true }
  }, [])

  if (uploaded?.url && !failed) {
    return (
      <img
        src={uploaded.url}
        alt={uploaded.alt || 'Sambramo'}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        /* contain, not cover: a logo cropped to fill a square is a logo with
           its swash cut off. Whatever aspect the brand uploads, all of it
           shows and the square is the padding. */
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  /* Below ~44px the near-white highlight stop turns a third of the stroke
     invisible on white, so small marks get one solid, darker metal on a
     heavier stroke. */
  const small = size < 44

  return (
    <svg
      /* ── The viewBox IS the letter ────────────────────────────────────────
         Measured, and measured twice, because the first measurement was
         wrong in a way that looked right.

         `getBBox` on an SVG <text> reports the layout box — for this face,
         124.8 tall at font-size 100, most of which is ascender room Pinyon
         reserves for swashes. Sizing to that left the S filling half its box
         and floating in padding, which is what produced a gap between the
         mark and the wordmark that no margin could close.

         Canvas `measureText` reports the real ink — but only if the font has
         actually loaded. The first run measured before it had, silently got
         the cursive fallback, and reported ink of 46 × 69: a letter half
         again TALLER than wide. Pinyon's S is the opposite, and sizing to
         those numbers scaled it to nearly double its box, so the flag ran off
         the right edge and was clipped.

         With document.fonts.check() true and the advance cross-checked
         against the SVG's own box, the ink at font-size 100 is:

           left 1 · right 90 · ascent 70 · descent 0
           → 91 wide × 70 tall, and the letter does not descend at all

         So the viewBox is that ink, plus 3 units of air for the stroke to
         live in, with the text origin at (0, 0). No arithmetic to place the
         glyph — the box is drawn around where the glyph already is. */
      viewBox="-4 -73 97 76"
      width={size}
      /* The mark is wider than it is tall. Forcing it into a square would
         mean either padding it vertically — the gap again — or squashing it.
         So the height follows the letter, and the square containers it sits
         in (the card seal, the tab chip) centre it themselves. */
      height={Math.round(size * (76 / 97))}
      fill="none"
      className={className}
      role="img"
      aria-label="Sambramo"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="-70" x2="70" y2="0" gradientUnits="userSpaceOnUse">
          {small ? (
            <>
              <stop offset="0%"   stopColor="#D4A03F" />
              <stop offset="50%"  stopColor="#AE7A31" />
              <stop offset="100%" stopColor="#83571C" />
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

      <text
        x="0"
        y="0"
        fill={`url(#${gid})`}
        /* Pinyon Script is the right LETTERFORM — the flag, the spine, the
           open lower curl — and the wrong weight: it is a hairline face, and
           a hairline gold letter on a white page is a rumour. Stroking the
           glyph in its own gradient thickens every stroke while leaving the
           skeleton untouched, which is what a heavier cut would do.
           `paint-order` puts the stroke behind the fill so the highlight in
           the middle of the gradient still reads as a highlight. */
        stroke={`url(#${gid})`}
        strokeWidth={small ? 3.6 : 2.2}
        strokeLinejoin="round"
        style={{
          fontFamily: '"Pinyon Script", "Snell Roundhand", "Apple Chancery", cursive',
          fontSize: '100px',
          fontWeight: 400,
          paintOrder: 'stroke fill',
        }}
      >
        S
      </text>
    </svg>
  )
}
