import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * A fold.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ICON, TITLE, AND THE CURRENT VALUE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The summary line on the closed row is the part that makes this pattern
 * work. A settings list whose rows say only what they are CALLED forces
 * somebody to open all nine to find the one that is wrong. "Bank · ends
 * 4417 · being checked" answers the question without opening anything.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY IT IS ITS OWN FILE
 * ══════════════════════════════════════════════════════════════════════
 *
 * There were two of these, in PartnerAccount and PartnerHandbook, and
 * they had drifted: one called the second line `summary` and the other
 * `sub`, one unmounted its children on close and the other hid them, one
 * could open by default and the other could not. Two components with the
 * same name, on the same tab, behaving differently — and the next person
 * to fix a fold would have fixed one of them.
 *
 * ── `hidden`, not unmounting ────────────────────────────────────────
 * The sections hold forms with typing in them, and a fold that discards
 * a half-typed account number because somebody collapsed it to check
 * something else is a fold that loses work. The exception is a section
 * expensive to mount, which is why PayoutDetails is given `defaultOpen`
 * rather than being mounted eagerly under every partner who never opens
 * it.
 */

const TONE = {
  good:    'text-forest-600',
  nudge:   'text-saffron-600',
  neutral: 'text-ink-mute',
}

export default function Fold({
  icon: Icon,
  title,
  summary,
  /* `sub` is the name the handbook's copy used. Accepted so the merge
     did not have to touch six call sites at once, and so a future
     caller reaching for either word gets the fold they expected. */
  sub,
  tone = 'neutral',
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const line = summary ?? sub

  return (
    <section className="overflow-hidden rounded-[20px] bg-white ring-1 ring-ink/[0.06]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {Icon && <Icon size={18} className={`shrink-0 ${TONE[tone] ?? TONE.neutral}`} />}
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold leading-tight text-ink">{title}</span>
          {line && (
            <span className="mt-0.5 block truncate text-[11.5px] font-semibold leading-snug text-ink-mute">
              {line}
            </span>
          )}
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div hidden={!open} className="border-t border-ink/[0.06] p-4">
        {children}
      </div>
    </section>
  )
}
