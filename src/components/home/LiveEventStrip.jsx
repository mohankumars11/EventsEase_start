import { Link } from 'react-router-dom'
import { ChevronRight, Calendar, Users } from 'lucide-react'
import { JOURNEY, needsYou } from '../../lib/celebrations'

/**
 * "Your celebration is being arranged" — the live strip at the top of home.
 *
 * A food app shows the order that is out for delivery before it shows
 * anything it wants to sell you, because for the twenty minutes that order is
 * live it is the only thing the customer opened the app for. A concierge
 * booking runs for weeks rather than minutes, which makes the equivalent more
 * valuable here, not less: someone whose wedding proposal is being prepared
 * checks in repeatedly, and the answer used to be four taps down a separate
 * dashboard.
 *
 * ── Why this now takes normalised celebrations ──────────────────────────
 * It used to take raw `events` rows and index their status into a hardcoded
 * eleven-stage pipeline. That made it structurally incapable of showing a
 * request from the celebration builder or the services cart, which live in
 * `service_enquiries` and have four states, not eleven — so the customer whose
 * request came through either of those doors saw nothing here at all. It reads
 * lib/celebrations.js's shape instead, which both tables are projected onto,
 * and the bar is a real position on that shared journey rather than a fake
 * "80% complete".
 */
export default function LiveEventStrip({ celebrations = [] }) {
  if (celebrations.length === 0) return null

  return (
    <section aria-label="Your celebrations in progress" className="px-4">
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x scroll-pl-4">
        {celebrations.map(c => (
          <LiveCard key={c.key} celebration={c} single={celebrations.length === 1} />
        ))}
      </div>
    </section>
  )
}

function LiveCard({ celebration: c, single }) {
  const yours = needsYou(c)
  const step = JOURNEY.findIndex(s => s.key === c.stage)

  return (
    /* Straight to this celebration's own tracker, not to a list.
       It used to point at /dashboard/customer/events — the list — from a card
       that already names the celebration, so tapping the thing you were
       reading about took you to a page where you had to find it again. */
    <Link
      to={`/track/${c.kind}/${c.id}`}
      className={`home-glass group relative shrink-0 snap-start overflow-hidden p-3.5 ${single ? 'w-full' : 'w-[86%]'}`}
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-xl ring-1 ring-hairline/[0.08]">
          {c.emoji}
          {/* The live dot, on the stages where something is actively moving. */}
          {!yours && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-saffron-400 animate-pulse-ring" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-saffron-400" />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold capitalize leading-tight text-ink">
            {c.title}
            {c.city && <span className="font-semibold text-ink-mute"> · {c.city}</span>}
          </p>
          <p className={`truncate text-[11px] font-semibold ${yours ? 'text-saffron-700' : 'text-ink-mute'}`}>
            {yours ? 'Needs you — open your proposal' : c.stageLabel}
          </p>
        </div>

        <span
          className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-extrabold transition-transform group-active:scale-95 ${
            yours ? 'bg-saffron-400 text-plum-950' : 'bg-surface text-ink ring-1 ring-hairline/10'
          }`}
        >
          {yours ? 'Review' : 'Track'} <ChevronRight size={12} strokeWidth={3} />
        </span>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            yours ? 'bg-saffron-400' : 'bg-gradient-to-r from-plum-400 to-berry-400'
          }`}
          style={{ width: `${c.progress}%` }}
        />
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-ink-mute">
        {/* The stage's NAME, not "Step 2 of 5".
            Track draws the same journey on four stops, so a count here said
            "of 5" while the tracker one tap away said four — two numbers for
            one process, which reads as one of them being wrong. The name is
            what the customer actually wants anyway ("Coordinator working on
            it" beats "Step 2"), and it cannot disagree with a total. */}
        <span>{JOURNEY[Math.max(step, 0)]?.label ?? 'In progress'}</span>
        <span className="font-mono">{c.reference}</span>
        {c.eventDate && (
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {new Date(c.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {c.guestCount && (
          <span className="flex items-center gap-1"><Users size={10} />{c.guestCount} guests</span>
        )}
      </div>
    </Link>
  )
}
