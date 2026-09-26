/**
 * A clock that is always moving.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A STATIC CARD READS AS A STALLED ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The review card had three states and two of them showed no time at
 * all. A partner whose `review_due_at` was never written saw "we will
 * confirm when to expect an answer shortly" — true, and read by the
 * person waiting as "we have not looked at this and cannot say when we
 * will". Which is the opposite of what a review card is for.
 *
 * So there is always a dial and it always moves:
 *
 *   with a deadline     it counts DOWN, and the ring drains
 *   without one         it counts UP from when they submitted, and the
 *                       ring fills against the promised window
 *   past the deadline   it keeps counting UP, in saffron, and the ring
 *                       is full — because "overdue by 2h" is a fact and
 *                       a frozen "0m left" is not
 *
 * The second case invents nothing. Elapsed time is arithmetic on
 * `submitted_at`, which is a real column; it never implies a finish
 * time we have not got.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY AN SVG RING AND NOT A BAR
 * ══════════════════════════════════════════════════════════════════════
 *
 * A bar reads as loading. A ring with a number in it reads as a clock,
 * which is what this is — and it survives being 40px wide on the left
 * of a card, where a bar would need the full width the sentence wants.
 *
 * `prefers-reduced-motion` removes the sweep transition and keeps the
 * number. The number is the information; the motion is reassurance.
 */
export default function ReviewDial({
  /* Fraction of the promised window used, 0..1+. Past 1 is overdue. */
  fraction = 0,
  /* The big number, already worded. */
  label,
  /* True once the deadline has passed. */
  over = false,
  size = 54,
}) {
  const stroke = 4
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r

  /* Clamped for the drawing only. A review that is 300% over still
     draws a full ring rather than wrapping round again, which would
     make a badly overdue review look nearly on time. */
  const drawn = Math.max(0, Math.min(1, fraction))
  const offset = circumference * (1 - drawn)

  return (
    <span
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ? `${label} of review time` : 'Review in progress'}
    >
      {/* ── Absolute, all three layers ────────────────────────────────
          The first version left the svg and the label both in normal
          flow inside a fixed-width box, so they laid out side by side
          and the number was pushed off the right edge — on screen it
          read as a stray letter beside a ring. A stacking context
          wants its children stacked, not flowed. */}
      <svg
        width={size} height={size}
        className="absolute inset-0 -rotate-90" aria-hidden="true"
      >
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="currentColor" strokeWidth={stroke}
          className="text-white/15"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke="currentColor"
          className={`${over ? 'text-saffron-300' : 'text-saffron-400'} motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      {/* ── The one moving thing on the card ──────────────────────────
          A quiet pulse on the rim, not on the whole dial: a card that
          breathes reads as alive, and a card that throbs reads as an
          alarm. Removed entirely under prefers-reduced-motion. */}
      <span
        aria-hidden="true"
        className={`absolute inset-1 rounded-full motion-safe:animate-pulse ${
          over ? 'bg-saffron-300/10' : 'bg-white/[0.06]'
        }`}
      />

      <span className="absolute inset-0 flex items-center justify-center">
        <span className={`font-mono text-[12px] font-extrabold leading-none tabular-nums ${
          over ? 'text-saffron-200' : 'text-white'
        }`}>
          {label}
        </span>
      </span>
    </span>
  )
}
