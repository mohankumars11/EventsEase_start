/**
 * Where the customer is in planning their event — the five stages as one
 * capsule (Mohan, 2026-11-10: "change the rail … make it very innovative"),
 * and, under it, one plain line that says what this step is for and what
 * comes next (Mohan, 2026-11-11: "a customer might get confused — very
 * cleanly mention what that step is about, what I'm going through and
 * what next").
 *
 *   ( ✓ )─( ✓ )─(  ⚙ Preferences 3/5  )─( ◎ )─( ✓ )
 *   Step 3 · Preferences — choose how each service should be.  Next: Masters
 *
 * The stage you are on is the only one that spells its name, in a lit
 * pill; finished stages are green ticks you can tap to go back to; the
 * rest are quiet icons. Five labels in a row at 10px was a row of words
 * nobody read — one name, said clearly, is the whole message.
 */
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Check, ChevronRight, ClipboardList, LayoutGrid, Radar, SlidersHorizontal } from 'lucide-react'

const STAGES = [
  ['Details', ClipboardList, 'tell us the day, the guests and the place'],
  ['Your plan', LayoutGrid, 'everything your event needs — add or remove'],
  ['Preferences', SlidersHorizontal, 'choose how each service should be, priced as you go'],
  ['Masters', Radar, 'compare real offers for your date and pick'],
  ['Confirm', BadgeCheck, 'pay after a master accepts; your date is locked'],
]
const ROUTE = id => [`/o/${id}`, `/o/${id}/plan`, `/o/${id}/prefs`, `/o/${id}/live`, `/o/${id}/board`]

export default function EventJourney({ at = 0, occasionId = null, explain = true }) {
  const to = occasionId ? ROUTE(occasionId) : []
  const next = STAGES[at + 1]
  return (
    <div data-journey-wrap>
      <nav className="mx-3 flex items-center rounded-full bg-[#F5F1FC] p-[5px] shadow-[inset_0_0_0_1px_#ECE4FA]" aria-label={`Step ${at + 1} of ${STAGES.length}: ${STAGES[at][0]}`} data-journey={at}>
        {STAGES.map(([label, Icon], i) => {
          const done = i < at, now = i === at
          const node = now
            ? (
              <span className="relative flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-3 py-[7px] text-white shadow-[0_8px_16px_-8px_rgba(91,33,182,.95)]" aria-current="step">
                <span aria-hidden className="cx-explore-sheen pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <Icon size={14} strokeWidth={2.6} className="relative shrink-0" />
                <span className="relative truncate text-[12.5px] font-black tracking-[-0.01em]">{label}</span>
                <span className="relative shrink-0 rounded-full bg-white/20 px-1.5 py-[1px] text-[9.5px] font-black">{i + 1}/{STAGES.length}</span>
              </span>
            )
            : (
              <span className={'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full transition-colors ' + (done ? 'bg-[#16A34A] text-white shadow-[0_4px_10px_-5px_rgba(22,163,74,.9)]' : 'bg-white text-[#A79FBF] shadow-[0_0_0_1px_#E7E0F3]')} title={label}>
                {done ? <Check size={14} strokeWidth={3.2} /> : <Icon size={14} strokeWidth={2.2} />}
              </span>
            )
          return (
            <Fragment key={label}>
              {i > 0 && <span aria-hidden className={'mx-[3px] h-[2px] w-2.5 shrink-0 rounded-full ' + (i <= at ? 'bg-[#4ADE80]' : 'bg-[#E1D8F1]')} />}
              {done && to[i] ? <Link to={to[i]} aria-label={`Back to ${label}`} className="shrink-0">{node}</Link> : node}
            </Fragment>
          )
        })}
      </nav>
      {/* What this step is, and what follows — one line, read once. */}
      {explain && (
        <p className="mx-4 mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold leading-snug text-[var(--ink-3)]" data-journey-explain>
          <span className="min-w-0 flex-1 truncate"><b className="font-black text-[#5B21B6]">Step {at + 1} · {STAGES[at][0]}</b> — {STAGES[at][2]}</span>
          {next && <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#F5F1FC] px-2 py-[2px] text-[10.5px] font-extrabold text-[#6D28D9]">Next: {next[0]}<ChevronRight size={11} /></span>}
        </p>
      )}
    </div>
  )
}
