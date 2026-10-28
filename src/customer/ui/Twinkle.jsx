/**
 * Sparkles that twinkle (Mohan, 2026-10-28: "very native, amazing, like
 * sparkles — for the RSVP and the scratch things"). Four-point stars,
 * each on its own beat; transform and opacity only, so it costs no paint,
 * and still with reduced motion. Place inside a `relative` parent.
 */
const SPOTS = [[8, 12, 14, 0], [86, 9, 11, 0.5], [92, 58, 16, 1.1], [6, 72, 10, 0.8], [52, 4, 9, 1.6], [70, 88, 12, 0.3], [24, 92, 9, 1.3]]

export default function Twinkle({ color = '#C026D3', accent = '#F5B301', count = 7, className = '' }) {
  return (
    <span aria-hidden className={'pointer-events-none absolute inset-0 ' + className}>
      {SPOTS.slice(0, count).map(([x, y, s, d], i) => (
        <svg key={i} viewBox="0 0 24 24" width={s} height={s} className="cx-twinkle absolute" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s`, color: i % 3 === 1 ? accent : color }}>
          <path fill="currentColor" d="M12 0c.6 5.6 2.4 7.4 8 8-5.6.6-7.4 2.4-8 8-.6-5.6-2.4-7.4-8-8 5.6-.6 7.4-2.4 8-8Z" transform="translate(0 4)" />
        </svg>
      ))}
    </span>
  )
}
