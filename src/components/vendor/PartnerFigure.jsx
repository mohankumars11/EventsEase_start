/**
 * A master, drawn.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS VECTOR AND NOT A PHOTOGRAPH
 * ══════════════════════════════════════════════════════════════════════
 *
 * A photograph on a partner screen is a photograph OF somebody. Either
 * it is a real Sambramo master — and there are two, neither of whom has
 * been asked — or it is a stranger from a stock library presented as
 * one, which is a claim about a person that is not true.
 *
 * An illustration makes no such claim. Nobody looks at a drawn figure
 * and concludes it is a specific decorator in Koramangala, and that is
 * exactly the property wanted here: this has to say "an app for people
 * who do this work" without saying "here is one of them".
 *
 * So it is SVG, drawn in code. It also weighs about 3 KB, scales to any
 * size without a second asset, and recolours from the brand tokens
 * rather than being re-exported.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT HAS TO COMMUNICATE IN UNDER A SECOND
 * ══════════════════════════════════════════════════════════════════════
 *
 * A master glancing at the partner app should read: this is for a
 * working person, not a customer. So the figure carries the marks of the
 * trade rather than of the brand —
 *
 *   the apron        the single clearest signal of somebody at work
 *   the tool         changes per trade, so a decorator sees a decorator
 *   the phone        the job arrives on it; that is the whole product
 *
 * Deliberately faceless. A face is an ethnicity, an age and a gender,
 * and every one of those excludes some of the people this is for. A
 * figure without one is read as "somebody like me" far more readily —
 * the same reason wayfinding pictograms have no features.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE MOTION IS ONE LOOP AND IT STOPS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The phone pulses when a job is live and is still otherwise. Motion
 * that never stops is motion nobody reads; motion that means something
 * is a signal. `prefers-reduced-motion` removes it entirely.
 */

const TRADE_TOOL = {
  'Photography':          'camera',
  'Videography':          'camera',
  'Decoration & Floral':  'balloon',
  'Cake & Desserts':      'cake',
  'Catering & Food':      'pan',
  'Cooks':                'pan',
  'DJ & Music':           'note',
}

export default function PartnerFigure({ trade, live = false, size = 128, className = '' }) {
  const tool = TRADE_TOOL[trade] ?? 'balloon'

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="A Sambramo master at work"
    >
      <defs>
        <linearGradient id="pf-apron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#256F8A" />
          <stop offset="100%" stopColor="#17566C" />
        </linearGradient>
        <linearGradient id="pf-ground" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#5FBBB4" stopOpacity=".22" />
          <stop offset="100%" stopColor="#3D96A4" stopOpacity=".06" />
        </linearGradient>
      </defs>

      {/* The ground. A soft disc, so the figure sits on something rather
          than floating — and it is what carries the brand colour when
          the figure itself is mostly neutral. */}
      <circle cx="100" cy="104" r="86" fill="url(#pf-ground)" />

      {/* Head. No features — see the header. */}
      <circle cx="100" cy="62" r="21" fill="#F3D9BE" />
      {/* Hair, as a simple cap. Enough to read as a person, not enough to
          be one particular person. */}
      <path d="M79 60a21 21 0 0 1 42 0c0 2-3 2-6-1-6-5-12-7-18-6-8 1-13 5-15 8-2 2-3 1-3-1Z" fill="#2F2A33" />

      {/* Torso and arms. */}
      <path d="M64 168c0-27 16-46 36-46s36 19 36 46Z" fill="#EDE7DF" />

      {/* The apron. The clearest single signal of somebody at work, so it
          is the biggest shape and the only saturated one. */}
      <path d="M78 130c0-9 10-14 22-14s22 5 22 14v38H78Z" fill="url(#pf-apron)" />
      <path d="M89 124c0-5 5-9 11-9s11 4 11 9" stroke="#17566C" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Apron pocket — small, and it is what makes the apron read as an
          apron rather than a bib. */}
      <rect x="90" y="142" width="20" height="13" rx="3" fill="#17566C" opacity=".45" />

      {/* The phone in hand. The job arrives here; it is the product. */}
      <g>
        <rect x="128" y="118" width="26" height="40" rx="5" fill="#2F2A33" />
        <rect x="131" y="122" width="20" height="32" rx="3" fill={live ? '#FBBF24' : '#8FA3AD'} />
        {live && (
          <>
            {/* One loop, and only when a job is actually live. */}
            <circle cx="141" cy="138" r="16" fill="none" stroke="#FBBF24" strokeWidth="2" opacity=".7">
              <animate attributeName="r" values="10;24" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".7;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </g>
      {/* The forearm holding it. Drawn after the phone so the hand is in
          front, which is the difference between holding and hovering. */}
      <path d="M126 128c6-6 12-8 16-6" stroke="#F3D9BE" strokeWidth="11" strokeLinecap="round" fill="none" />

      {/* The tool of the trade, in the other hand. */}
      {tool === 'camera' && (
        <g transform="translate(46,120)">
          <rect x="0" y="6" width="34" height="24" rx="5" fill="#2F2A33" />
          <circle cx="17" cy="18" r="8" fill="#5FBBB4" />
          <circle cx="17" cy="18" r="4" fill="#17566C" />
          <rect x="10" y="1" width="12" height="6" rx="2" fill="#2F2A33" />
        </g>
      )}
      {tool === 'balloon' && (
        <g transform="translate(48,104)">
          <ellipse cx="16" cy="15" rx="14" ry="16" fill="#FBBF24" />
          <ellipse cx="11" cy="10" rx="4" ry="5" fill="#FFFFFF" opacity=".45" />
          <path d="M16 31c2 8-3 12-1 20" stroke="#17566C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      )}
      {tool === 'cake' && (
        <g transform="translate(46,118)">
          <rect x="0" y="12" width="34" height="18" rx="4" fill="#FFFFFF" />
          <rect x="0" y="8" width="34" height="8" rx="4" fill="#FBBF24" />
          <rect x="15" y="0" width="3" height="8" rx="1.5" fill="#17566C" />
          <circle cx="16.5" cy="-2" r="3" fill="#FBBF24" />
        </g>
      )}
      {tool === 'pan' && (
        <g transform="translate(44,124)">
          <ellipse cx="18" cy="16" rx="18" ry="7" fill="#2F2A33" />
          <ellipse cx="18" cy="14" rx="14" ry="5" fill="#5FBBB4" opacity=".5" />
          <rect x="34" y="13" width="18" height="4" rx="2" fill="#2F2A33" />
        </g>
      )}
      {tool === 'note' && (
        <g transform="translate(52,110)">
          <circle cx="8" cy="28" r="7" fill="#FBBF24" />
          <rect x="13" y="2" width="3.5" height="27" rx="1.75" fill="#FBBF24" />
          <path d="M16.5 2c8 1 12 4 12 8-4-3-8-4-12-4Z" fill="#FBBF24" />
        </g>
      )}
    </svg>
  )
}
