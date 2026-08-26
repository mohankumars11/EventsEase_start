import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { fetchBranding } from '../../lib/branding'

/**
 * The Sambramo wordmark. The name, set — and nothing else.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE S IS GONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * This component used to draw a gold Spencerian capital S above the name, on
 * navy. It was a careful piece of work and it had two problems that no amount
 * of care fixes:
 *
 *   It did not survive being small. A Spencerian capital is defined by where
 *   the stroke swells and where it goes hairline. At the 22px the tab bar
 *   gives it, the hairlines fall below a device pixel and the letter renders
 *   as a gold smudge — so the app's own mark was illegible in the one place
 *   it appeared on every single screen.
 *
 *   And it made the brand a letter rather than a name. Nobody has heard of
 *   Sambramo yet. A monogram is what a brand earns *after* people know the
 *   word; leading with one means the icon on the home screen tells a new
 *   customer nothing, and the launcher label underneath is doing all the
 *   work on its own.
 *
 * So the mark is the word now, in white on the aqua ground and in the aqua
 * ramp on white. One object, two grounds, legible at every size it is drawn
 * at — which is the test the S kept failing.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE MARK, TWO GROUNDS
 * ══════════════════════════════════════════════════════════════════════
 *
 * On the aqua ground (the splash, the app icon, the tab chip) it is white and
 * bold, because white on that ramp is the only pairing that holds contrast
 * across the whole gradient — the deep corner and the light corner are four
 * stops apart, and any colour that reads on one washes out on the other.
 *
 * On white it takes `.brand-aqua-text`: the same gradient the ground uses,
 * clipped to the type. That is what keeps the two from looking like two
 * different logos — the wordmark on the home screen is made of the same light
 * as the wordmark on the launch screen.
 *
 * Never letter it in aqua-500 or lighter on white. Those are surface colours
 * and they fail contrast as ink; the ramp in `.brand-aqua-text` deliberately
 * runs 900 → 500 so even its lightest stop is carrying a darker one beside it.
 */
export default function SambramoWordmark({
  /** Cap height of the wordmark in px. Ignored when `fit` is set. */
  size = 28,
  /** Kept for call-site compatibility; the lockup is one line either way. */
  layout = 'inline',
  /** Set false on the aqua ground; the wordmark then paints white. */
  onLight = true,
  /**
   * Size against the viewport instead of `size`, and centre it.
   *
   * For the screens where the name IS the screen — the splash, the auth
   * panels. See `.brand-wordmark-fit`: a fixed px wordmark is comfortable on
   * one handset width and cramped on another, and this market is mostly the
   * narrower one.
   */
  fit = false,
  className = '',
  /** Hides the ® — it belongs on a splash, not in 20px of chrome. */
  registered = false,
}) {
  const ink = onLight ? 'brand-aqua-text' : 'text-white'

  return (
    <span
      className={`inline-flex items-center justify-center ${fit ? 'w-full' : ''} ${className}`}
      aria-label="Sambramo"
    >
      <span
        /* Tracking is NOT set here when `fit` is on: display sizes want a
           tighter fit than chrome sizes, and `.brand-wordmark-fit` tightens
           it as the type grows. A utility class here would win the cascade
           over the component class and quietly undo that. */
        className={`font-display font-bold leading-none ${ink} ${
          fit ? 'brand-wordmark-fit text-center' : 'tracking-[-0.022em]'
        }`}
        style={fit ? undefined : { fontSize: size }}
      >
        Sambramo
        {registered && (
          <sup className={`ml-1 align-super text-[0.3em] font-semibold ${onLight ? 'opacity-60' : 'text-white/60'}`}>
            ®
          </sup>
        )}
      </span>
    </span>
  )
}

/**
 * The brand as a small square — a tab chip, a seal on a card, a chat bubble.
 *
 * ── What this is, now that there is no monogram ─────────────────────────
 * A 22–40px square cannot hold the word "Sambramo" legibly, and the letter
 * that used to go here is exactly what the brand is moving away from. So the
 * square carries the GROUND rather than a glyph: the aqua gradient, tightened
 * (see `.brand-aqua-chip`), with whatever icon the surrounding context
 * already uses painted white on top of it.
 *
 * That is not a compromise, it is how the strongest app marks in this
 * category work — the recognisable thing is the colour and the shape, and the
 * name is carried by the label underneath. It also means the seal on a
 * celebration card and the primary tab in the bar are visibly the same
 * object, which they never were when one held a 26px S and the other a 22px
 * one at different opacities.
 *
 * `children` is the glyph, and it DEFAULTS rather than being optional.
 * Four call sites — the two app bars, the admin rail, the chat launcher —
 * previously passed a 26px monogram and now pass nothing, and a bare gradient
 * square beside a page title reads as an image that failed to load rather
 * than as a mark. A default means retiring the S could not leave a hole in
 * any of them.
 *
 * ── The upload still wins ───────────────────────────────────────────────
 * If an admin has uploaded a logo in the console it replaces this everywhere,
 * with no other file changed — the lookup stays here rather than at each call
 * site for exactly that reason. The drawn seal is not a placeholder for the
 * upload; it is what renders before the fetch resolves, when nothing has been
 * uploaded, and if the image 404s later. There is never a frame with no mark.
 */
export function BrandSeal({ size = 28, radius = 11, children, className = '' }) {
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

  return (
    <span
      role="img"
      aria-label="Sambramo"
      className={`brand-aqua-chip inline-flex shrink-0 items-center justify-center text-white ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {children ?? <Sparkles size={Math.round(size * 0.58)} strokeWidth={2.4} />}
    </span>
  )
}

/**
 * Backwards-compatible alias.
 *
 * Eight call sites imported `Monogram`, and renaming it in the same commit
 * that changes what it draws would mean eight files whose diffs mix "the mark
 * changed" with "the import moved" — and one of them missed is a blank screen
 * rather than a compile error, because a bad named import is `undefined` at
 * render time in a JSX position.
 *
 * New code should use `BrandSeal`, which says what it now is.
 */
export const Monogram = BrandSeal
