/**
 * A journey, as a vertical rail.
 *
 * ── Where this came from ──────────────────────────────────────────────────
 * It was inline JSX inside `components/admin/OrderJourney.jsx`, and it was the
 * only real timeline in the codebase — filled node for reached, ring for
 * current, a connector coloured by whether the NEXT stop was reached, and,
 * crucially, honest empty states: `time not recorded` where nothing wrote a
 * timestamp and `(approx)` where one was inferred.
 *
 * Lifting it rather than writing a second one matters because those honesty
 * rules are the whole point. A fresh customer-side stepper would have grown
 * its own idea of what to render for a stage with no timestamp, and the
 * obvious idea — hide the row, or show today's date — is exactly the invented
 * progress this product forbids.
 *
 * ── The two voices ────────────────────────────────────────────────────────
 * Every stage in `orderJourney.js` already carries BOTH an `admin` sentence
 * ("With the partner kitchen or supplier") and a `customer` one ("Your order
 * is being made"). The customer half was written and rendered nowhere. `voice`
 * picks which is spoken, so one component serves the console and the customer
 * without either one being told the other's business.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 * The admin console runs on raw greys and the `dataviz` ordinal ramp; the
 * customer surfaces run on the semantic tokens (`ink`, `surface`, `accent`),
 * which is what lets the whole app be relit in one place. So the customer
 * voice uses tokens and the admin voice keeps the palette it already had —
 * passed in rather than hardcoded, so neither drifts into the other.
 */

/** Rounded, never precise. Mirrors `orderJourney.formatDuration`. */
function formatWhen(at) {
  if (!at) return null
  return new Date(at).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}

export default function JourneyStepper({
  stages = [],
  voice = 'customer',
  /** Renders under a stage — the unlock lines, a pay button, anything. */
  renderExtra,
  className = '',
}) {
  if (stages.length === 0) return null
  const isCustomer = voice === 'customer'

  return (
    <ol className={`space-y-0 ${className}`}>
      {stages.map((s, i) => {
        const body = isCustomer ? (s.customer ?? s.admin) : (s.admin ?? s.customer)
        const when = formatWhen(s.at)
        const last = i === stages.length - 1
        const nextReached = !last && stages[i + 1].reached

        return (
          <li key={s.id ?? s.key} className="flex gap-3">
            {/* The rail. A node the stage's own emoji sits in, and a
                connector whose colour is decided by the stop BELOW it —
                which is what makes the line read as travelled-so-far
                rather than as a list of separated dots. */}
            <div className="flex shrink-0 flex-col items-center">
              <span
                aria-hidden="true"
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full text-[15px] transition-colors',
                  s.reached
                    ? 'bg-accent text-white'
                    : 'bg-surface-sunk/[0.08] text-ink-mute ring-1 ring-hairline/10',
                  s.current ? 'ring-4 ring-saffron-400/50' : '',
                ].join(' ')}
              >
                {s.emoji}
              </span>
              {!last && (
                <span
                  aria-hidden="true"
                  className={`w-0.5 flex-1 min-h-[28px] ${nextReached ? 'bg-accent/40' : 'bg-hairline/10'}`}
                />
              )}
            </div>

            <div className="min-w-0 flex-1 pb-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className={`text-[13.5px] ${s.reached ? 'font-extrabold text-ink' : 'font-bold text-ink-mute'}`}>
                  {s.title ?? s.label}
                </span>
                <span className="text-[11px] tabular-nums text-ink-mute">
                  {/* Three distinct truths, never collapsed: a real time, a
                      stage that happened but was never timestamped, and a
                      stage that has not happened. */}
                  {when ?? (s.reached ? 'time not recorded' : '')}
                  {s.inferred && when ? ' (approx)' : ''}
                </span>
              </div>

              {/* An unreached stage states its own future tense where it has
                  one (`upcoming`). The generic "Not yet — <copy>" fallback
                  survives for callers that do not, but it cannot be the only
                  option: applied to a completion sentence it produced "Not yet
                  — thank you for celebrating with us." */}
              {(s.reached ? body : (s.upcoming ?? body)) && (
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">
                  {s.reached
                    ? body
                    : s.upcoming ?? `Not yet — ${body.charAt(0).toLowerCase()}${body.slice(1)}`}
                </p>
              )}

              {s.note && (
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{s.note}</p>
              )}

              {renderExtra?.(s, i)}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
