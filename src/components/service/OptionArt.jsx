/**
 * The picture on a card, drawn rather than fetched.
 *
 * ── Why not photographs ─────────────────────────────────────────────────
 * Eighty decoration setups and two hundred packages is eighty to two hundred
 * images. The app already has a hard ceiling here — lib/unsplash.js allows 24
 * live lookups per page load, app-wide — and the committed set in
 * generatedDecorSamples.js is sixty photographs mapped to sixty *occasion*
 * samples, not to these. Stretching those sixty across two hundred cards would
 * put a wedding mandap on the "cold pyro" card, which is worse than no picture:
 * a wrong photograph is a claim, and this catalogue is pre-launch with no
 * signed supplier behind it (see the header of decorThemes.js).
 *
 * So each card draws its own art from the two colours the setup actually uses.
 * That is not a placeholder standing in for a photo — it is the palette, which
 * is a real thing the customer is choosing, and it makes a grid of eighty cards
 * legible at a glance in a way eighty near-identical stock photos never do.
 *
 * ── The composition ─────────────────────────────────────────────────────
 * A diagonal two-stop gradient, two soft radial lights over it, a repeating
 * motif that reads as texture rather than pattern, and the emoji sitting large
 * and slightly rotated. Every value is derived from `tint` so no two cards land
 * on the same picture, and nothing here costs a network request.
 */
export default function OptionArt({ tint, emoji, height = 96, seed = 0, children }) {
  const [from, to] = tint ?? ['#7c3aed', '#f59e0b']

  // Two lights, placed from the seed so a row of cards does not repeat. Kept
  // inside the middle of the box: a light at the very edge reads as a
  // rendering error rather than as depth.
  const x1 = 18 + ((seed * 37) % 55)
  const y1 = 12 + ((seed * 23) % 40)
  const x2 = 55 + ((seed * 17) % 35)

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height,
        backgroundImage: `
          radial-gradient(58% 70% at ${x1}% ${y1}%, rgba(255,255,255,0.34) 0%, transparent 62%),
          radial-gradient(46% 58% at ${x2}% 96%, rgba(0,0,0,0.24) 0%, transparent 60%),
          linear-gradient(128deg, ${from} 0%, ${to} 100%)
        `,
      }}
    >
      {/* Texture. A 6px dot lattice at 14% white — visible as a surface,
          invisible as a pattern, and it survives being scaled down to a
          two-column phone grid. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 0.5px, transparent 0.6px)',
          backgroundSize: '7px 7px',
        }}
      />

      {/* The emoji, large, tilted and bled off the bottom-right corner so the
          card has a subject rather than a centred sticker. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-2 right-1 select-none text-[54px] leading-none opacity-90 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
        style={{ transform: `rotate(${(seed % 5) - 2}deg)` }}
      >
        {emoji}
      </span>

      {/* A soft shelf at the base, so white text on a light tint stays legible
          without darkening the whole picture. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ backgroundImage: 'linear-gradient(180deg, transparent, rgba(12,4,22,0.42))' }}
      />

      {children}
    </div>
  )
}
