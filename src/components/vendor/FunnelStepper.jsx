import { Check, AlertCircle } from 'lucide-react'

/**
 * Where you are, what is done, and what still needs you.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS REPLACED A PROGRESS BAR
 * ══════════════════════════════════════════════════════════════════════
 *
 * The header carried fourteen thin segments. They answered "roughly how
 * far along am I" and nothing else — not what the steps were, not which
 * one had a problem, not how much was left in a form somebody is filling
 * in standing up.
 *
 * A stepper answers all three. Each phase has a name, an icon and a
 * state, and the state is the point: a partner who tapped Continue on the
 * kitchen screen without choosing one should SEE which step is unhappy,
 * not just find the button dead.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PHASES, NOT SCREENS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The flow can run to fourteen screens — one per cuisine, seven
 * operational, the libraries. Fourteen circles on a phone are unreadable
 * and would need scrolling to find the current one.
 *
 * So the screens group into seven phases a caterer would recognise as
 * stages of their own work. Five cuisine screens are one dot called
 * "Dishes", and the dot says "3 of 5" underneath while you are in it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE THREE STATES, AND WHY RED IS RARE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   done     green, a tick. Behind you and answered.
 *   current  plum, the number, a ring. Where you are.
 *   blocked  red, a warning. You reached it, left it empty, and it is one
 *            of the two that genuinely cannot be skipped.
 *   ahead    grey. Not yet.
 *
 * Red only ever appears on a step somebody has actually visited. Marking
 * an unvisited step red would be scolding a partner for not having done
 * something they have not been shown yet, which is how a form starts
 * feeling like an exam.
 */

/* ── IT HAS TO LOOK THE SAME AT FOUR DOTS AND AT SEVEN ────────────────
   A 390px phone leaves 358 inside the padding. Seven columns and six
   connectors at 44px: 7x44 + 6x8 = 356, which fits.

   It was 68px a column, needing 476 — so 'Your rate' and 'Submit' sat off
   the right edge and a partner could not see that the form ends. It
   scrolled, so nothing looked broken; it just quietly hid the finish line
   from somebody deciding whether to start.

   Fixing the width fixed seven and broke everything else. A photographer
   sees FOUR phases, and four 44px columns in a `min-w-max` row cluster
   hard against the left edge with half the header empty beside them —
   reported as "for some it is spread out, for some it is tight in the
   corner". Same component, same screen, two different-looking headers.

   So the columns flex and the row fills the width: `flex-1` with a
   `min-w-[44px]` floor, `justify-between` so the connectors take the
   slack. Four dots space themselves across the header, seven pack to
   their floor and still fit, and the horizontal scroll stays for handsets
   narrower than 358 where seven genuinely cannot. */
export default function FunnelStepper({ phases = [], currentId, doneIds = [], blockedIds = [] }) {
  const done = new Set(doneIds)
  const blocked = new Set(blockedIds)

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1" aria-label="Progress">
      <ol className="flex w-full items-start justify-between gap-0">
        {phases.map((p, i) => {
          const isCurrent = p.id === currentId
          const isBlocked = blocked.has(p.id)
          const isDone = done.has(p.id) && !isBlocked
          const Icon = p.icon

          const circle =
            isBlocked ? 'bg-rose-600 text-white ring-2 ring-rose-200'
            : isDone ? 'bg-forest-600 text-white'
            : isCurrent ? 'bg-plum-950 text-white ring-[3px] ring-plum-950/12'
            : 'bg-ink/[0.06] text-ink-mute'

          const label =
            isBlocked ? 'text-rose-700'
            : isDone ? 'text-forest-700'
            : isCurrent ? 'text-ink'
            : 'text-ink-mute'

          return (
            <li key={p.id} className="flex min-w-0 flex-1 items-start last:flex-none">
              <div className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold transition-all ${circle}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isBlocked ? <AlertCircle size={13} />
                    : isDone ? <Check size={13} />
                    : Icon ? <Icon size={13} />
                    : i + 1}
                </span>
                <span className={`text-center text-[9px] font-extrabold leading-[1.15] tracking-tight ${label}`}>
                  {p.label}
                </span>
                {/* Only the current phase says how far through itself it
                    is. Showing "1 of 5" on every dot would be five numbers
                    competing with the seven that matter. */}
                {isCurrent && p.subLabel && (
                  <span className="text-center text-[8.5px] font-bold text-ink-mute">
                    {p.subLabel}
                  </span>
                )}
              </div>

              {i < phases.length - 1 && (
                <span
                  aria-hidden="true"
                  /* The connector takes the slack. At four phases it
                     stretches and the dots sit evenly across the header;
                     at seven it shrinks to its 8px floor. */
                  className={`mt-3.5 h-[2px] min-w-[8px] flex-1 rounded-full ${
                    done.has(p.id) ? 'bg-forest-600' : 'bg-ink/[0.10]'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
