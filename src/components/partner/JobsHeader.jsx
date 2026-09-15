import { Bell, ChevronRight } from 'lucide-react'
import { LIFECYCLE } from '../../lib/partnerOnboarding'

/**
 * The strip at the top of the operations home.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE STATUS IS THE PARTNER'S REAL ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not an online/offline toggle. This platform has no "go online"
 * concept — dispatch matches on verification, location, a live listing
 * and the calendar, and there is no column anywhere that means "taking
 * jobs right now". Rendering a toggle would invent a control that
 * changes nothing, which is worse than not having one.
 *
 * So the pill shows the state that genuinely decides whether work
 * arrives, in the partner's own terms:
 *
 *   Live            approved, and a listing is live
 *   Under review    everything submitted, waiting on us
 *   Action needed   something was sent back
 *   Setting up      onboarding is not finished
 *
 * When a real availability switch exists, this is the one place that
 * changes.
 */
const STATE = {
  [LIFECYCLE.LIVE]: {
    label: 'Live', dot: 'bg-forest-400',
    pill: 'bg-forest-500/15 text-forest-100 ring-forest-400/30',
    sub: 'Receiving opportunities',
  },
  [LIFECYCLE.UNDER_REVIEW]: {
    label: 'Under review', dot: 'bg-amber-300',
    pill: 'bg-amber-400/15 text-amber-100 ring-amber-300/30',
    sub: 'We are checking your profile',
  },
  [LIFECYCLE.REQUIRES_ACTION]: {
    label: 'Action needed', dot: 'bg-rose-400',
    pill: 'bg-rose-500/15 text-rose-100 ring-rose-400/30',
    sub: 'Something needs your attention',
  },
  [LIFECYCLE.ONBOARDING]: {
    label: 'Setting up', dot: 'bg-white/50',
    pill: 'bg-white/10 text-white/80 ring-white/20',
    sub: 'Finish setup to receive jobs',
  },
}

export default function JobsHeader({ lifecycle, businessName, onOpenProfile, onOpenAlerts }) {
  const s = STATE[lifecycle] ?? STATE[LIFECYCLE.ONBOARDING]

  return (
    <header className="safe-top bg-plum-950 px-5 pb-5 pt-3 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-plum-300">
            Sambramo Partner
          </p>
          <h1 className="mt-1 truncate text-[19px] font-extrabold leading-tight">
            {businessName ?? 'Your business'}
          </h1>
        </div>

        <button
          type="button"
          onClick={onOpenAlerts}
          aria-label="Alerts and updates"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"
        >
          <Bell size={17} />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenProfile}
        data-partner-state={lifecycle}
        className={`mt-3 flex w-full items-center gap-2 rounded-full px-3 py-2 text-left ring-1 ${s.pill}`}
      >
        {/* Never colour alone — the dot has a word beside it. §59. */}
        <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
        <span className="text-[12.5px] font-extrabold">{s.label}</span>
        <span className="min-w-0 flex-1 truncate text-[11.5px] opacity-70">{s.sub}</span>
        <ChevronRight size={14} className="shrink-0 opacity-60" />
      </button>
    </header>
  )
}
