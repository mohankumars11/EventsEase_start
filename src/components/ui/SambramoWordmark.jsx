import { useId } from 'react'

/**
 * The Sambramo lockup — a gold monogram over a blue wordmark.
 *
 * ── What this is, and what it deliberately is not ─────────────────────────
 * It is drawn from the reference the brand supplied: an ornate gold S above
 * "Sambramo" set in a high-contrast serif. It is not a trace of it. The
 * monogram here is built from the app's own geometry — the S is set in
 * Playfair Display, the same face as the wordmark, so the two are literally
 * the same hand rather than a logo bolted onto a word.
 *
 * ── The gold is three stops, because metal is three stops ─────────────────
 * A flat yellow reads as plastic. Real gilding has a pale highlight where the
 * light lands, a saturated body, and a burnt shadow in the recess — so the
 * gradient runs gold-100 → gold-300 → gold-500 → gold-200 on a diagonal, with
 * the second highlight low and small. That last stop is what stops it looking
 * like a sunset.
 *
 * ── Why the frame is an arc and not a circle ──────────────────────────────
 * A closed ring around a letter is a coin, and a coin is what every fintech
 * app in the country already looks like. Two opposing arcs leave the letter
 * open at the sides — closer to the way a kolam frames a threshold without
 * enclosing it, which is the mark the brand already owns (SambramoMark).
 *
 * ── The blue ──────────────────────────────────────────────────────────────
 * royal-800. Deep enough to read as ceremonial rather than corporate: the
 * blue of a wedding invitation, not of a bank. On pure white it measures well
 * past AA at every size this is used.
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

  const markSize = layout === 'stacked' ? size * 0.62 : size

  return (
    <span
      className={`inline-flex ${layout === 'stacked' ? 'flex-col items-center gap-1.5' : 'flex-row items-center gap-2.5'} ${className}`}
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
 * The monogram alone — for a favicon, a tab bar, a seal on a card.
 *
 * The S is real type rather than a traced path on purpose: Playfair's S has a
 * spine and a stress that hand-authored path data does not get right by eye,
 * and using the wordmark's own face means the monogram can never drift from
 * it. Georgia is the fallback and its S is also a high-contrast serif, so a
 * font that has not loaded yet degrades to a near neighbour rather than to
 * something geometric.
 */
export function Monogram({ size = 40, gradientId, className = '' }) {
  const fallback = useId()
  const gid = gradientId ?? `gold-${fallback}`

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
        <linearGradient id={gid} x1="14" y1="6" x2="50" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#fdf3c8" />
          <stop offset="28%"  stopColor="#eccd74" />
          <stop offset="58%"  stopColor="#c9973a" />
          <stop offset="80%"  stopColor="#f7e3a1" />
          <stop offset="100%" stopColor="#a8762b" />
        </linearGradient>
      </defs>

      {/* The two arcs. Open at the sides — see the header for why this is not
          a ring. Thin, because the letter is the mark and the frame is only
          there to give it a threshold to stand in. */}
      <path
        d="M20 7.5C10.8 12.2 4.5 21.4 4.5 32S10.8 51.8 20 56.5"
        stroke={`url(#${gid})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M44 7.5C53.2 12.2 59.5 21.4 59.5 32S53.2 51.8 44 56.5"
        stroke={`url(#${gid})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* The pulli — the kolam's centre dot, kept as the one piece of the
          older mark that carries over. It sits at the S's own optical centre
          so the two marks are the same object seen twice. */}
      <circle cx="32" cy="4.6" r="1.9" fill={`url(#${gid})`} />
      <circle cx="32" cy="59.4" r="1.9" fill={`url(#${gid})`} />

      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fill={`url(#${gid})`}
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '52px',
          fontWeight: 800,
        }}
      >
        S
      </text>
    </svg>
  )
}
