import { Bell, ChevronRight } from 'lucide-react'
import { LIFECYCLE } from '../../lib/partnerOnboarding'
import OnlineToggle from './OnlineToggle'
import PartnerAvatar from '../vendor/PartnerAvatar'

/**
 * The strip at the top of the operations home.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO DIFFERENT FACTS, AND THEY ARE BOTH HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The switch is whether this partner is taking work at all right now —
 * `vendors.accepting_jobs`, which migration 126 added and which
 * `match_partners` reads. It answers "am I getting jobs today", and the
 * partner controls it.
 *
 * The pill is the state that decides whether work COULD arrive, which
 * the partner mostly does not control:
 *
 *   Live            approved, and a listing is live
 *   Under review    everything submitted, waiting on us
 *   Action needed   something was sent back
 *   Setting up      onboarding is not finished
 *
 * Both are needed, and neither answers for the other. A partner who is
 * Online but not yet verified is getting no jobs, and a switch on its
 * own would leave them with no way to find out why.
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

export default function JobsHeader({ lifecycle, businessName, vendorId, avatarUrl, acceptingJobs, unreadAlerts = 0, onAcceptingChange, onOpenProfile, onOpenAlerts }) {
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
          {/* Under the name, not beside the bell: it is a statement
              about the business, and it is the control a partner reaches
              for in a hurry. */}
          <div className="mt-2">
            <OnlineToggle
              vendorId={vendorId}
              initial={acceptingJobs}
              onChange={onAcceptingChange}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenAlerts}
            aria-label={unreadAlerts
              ? `Alerts and updates, ${unreadAlerts} unread`
              : 'Alerts and updates'}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <Bell size={17} />
            {/* The count, not a bare dot. "3" tells a partner whether
                this is worth opening now; a dot only says "something". */}
            {unreadAlerts > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-extrabold tabular-nums text-white ring-2 ring-plum-950">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </button>

          {/* ── The face, top right ──────────────────────────────────
              Where the reference design puts it, and it goes to the
              account rather than opening a menu: there is one place to
              change anything about yourself and this is the shortest
              route to it. Falls back to initials, which is what every
              partner sees until they add a photograph. */}
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Your account"
            className="rounded-full ring-2 ring-white/25"
          >
            <PartnerAvatar url={avatarUrl} name={businessName} size={40} />
          </button>
        </div>
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
