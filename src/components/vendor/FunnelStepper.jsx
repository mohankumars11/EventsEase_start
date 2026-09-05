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

/* ── SEVEN DOTS HAVE TO FIT 358px ─────────────────────────────────────
   A 390px phone leaves 358 inside the padding. Seven columns and six
   connectors: 7x44 + 6x8 = 356.

   This was 68px a column, which needs 476 — so 'Your rate' and 'Submit'
   sat off the right edge and a partner could not see that the form ends.
   It scrolled, so nothing looked broken; it just quietly hid the finish
   line from somebody deciding whether to start. The whole point of a
   stepper over a progress bar is seeing where it stops.

   The scroll stays for handsets narrower than 358. */
export default function FunnelStepper({ phases = [], currentId, doneIds = [], blockedIds = [] }) {
  const done = new Set(doneIds)
  const blocked = new Set(blockedIds)

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1" aria-label="Progress">
      <ol className="flex min-w-max items-start gap-0">
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
            <li key={p.id} className="flex items-start">
              <div className="flex w-[44px] flex-col items-center gap-1">
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
                  className={`mt-3.5 h-[2px] w-2 rounded-full ${
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
