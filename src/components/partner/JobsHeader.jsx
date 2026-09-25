import { useEffect, useState } from 'react'
import { greetingFor, msUntilNextBand } from '../../lib/greeting'
import { Bell, ChevronRight } from 'lucide-react'
import { LIFECYCLE } from '../../lib/partnerOnboarding'
import { useReviewClock } from './ReviewCountdown'
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

/* ── The wish, from the clock, and the name in it ──────────────────
 *
 * The bands and the name now live in `src/lib/greeting.js` with no
 * React around them, so `scripts/check-greeting.mjs` can assert all
 * twenty-one weekday-by-band combinations and every way an Indian name
 * gets typed into a free-text box. Checking that 4:59am still says
 * "Good evening" by changing the device clock and looking is not
 * checking it.
 *
 * ── The name is back, and it belongs on this line ──────────────────
 * This header carried no name at all, under a comment saying the
 * business name below "does not need saying twice". That was right
 * while the greeting was bare. It is a different line now: "Good
 * morning, Rahul" names the PERSON and the h1 beneath names their
 * BUSINESS. For a sole trader those are nearly the same thing, and
 * nearly is the whole point -- a partner is a person, and the app
 * opening by addressing their shop is the thing that makes it feel like
 * software rather than like somebody they work with.
 *
 * Where there is no usable first name the greeting loses the comma and
 * stays correct. See `firstNameOf` for what "usable" excludes.
 */
function useGreeting(fullName) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer
    /* Re-armed from the new `now` each time rather than on a fixed
       interval, so this costs three timers a day and survives the clock
       being changed or the device waking from sleep in a different
       band. The extra second keeps a timer that fires a hair early from
       landing back in the band it just left and scheduling a
       zero-length wait. */
    const arm = () => {
      const at = new Date()
      setNow(at)
      timer = setTimeout(arm, msUntilNextBand(at) + 1000)
    }
    timer = setTimeout(arm, msUntilNextBand(new Date()) + 1000)
    return () => clearTimeout(timer)
  }, [])

  return greetingFor({ fullName, date: now })
}

export default function JobsHeader({
  lifecycle, businessName, fullName = null, vendorId, avatarUrl, acceptingJobs, unreadAlerts = 0,
  reviewDueAt = null, reviewSubmittedAt = null,
  onAcceptingChange, onOpenProfile, onOpenAlerts,
}) {
  const s = STATE[lifecycle] ?? STATE[LIFECYCLE.ONBOARDING]
  const { wish, dayLine } = useGreeting(fullName)

  /* The same clock the detail card below uses, from the same hook, so
     the two can never disagree by a minute. */
  const { left, words, fraction } = useReviewClock({
    dueAt: lifecycle === LIFECYCLE.UNDER_REVIEW ? reviewDueAt : null,
    submittedAt: reviewSubmittedAt,
  })

  /* ── px-4, matching the page column exactly ──────────────
     VendorDashboard lays its content out in `px-4 sm:px-6` and pulls
     this header out of it with `-mx-4 sm:-mx-6`. The header then applied
     its OWN px-5, so every line inside it started 4px further right than
     every card below it — a stagger down the whole left edge of the Jobs
     tab, small enough to read as sloppiness rather than as a bug.

     These two paddings have to stay equal to the page's. If the column
     ever changes, this changes with it. */
  return (
    <header className="bg-plum-950 px-4 pb-5 text-white sm:px-6 pt-[calc(12px+env(safe-area-inset-top,0px))]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-plum-300">
            Sambramo Partner
          </p>
          <p className="mt-1.5 truncate text-[13.5px] font-semibold leading-tight text-plum-200">
            {wish}
          </p>
          <h1 className="mt-0.5 truncate text-[19px] font-extrabold leading-tight">
            {businessName ?? 'Your business'}
          </h1>
          {/* Warmth, not information -- the line above carries the
              person and the line above that carries the status, so this
              one is allowed to be worth nothing and just be pleasant.
              Never hard-coded: it is the device's own weekday. */}
          <p className="mt-0.5 text-[12px] font-semibold leading-tight text-plum-300">
            {dayLine}
          </p>
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
            className="rounded-[13px] ring-2 ring-white/25"
          >
            <PartnerAvatar url={avatarUrl} name={businessName} size={44} shape="square" />
          </button>
        </div>
      </div>

      {/* ── The status, and the clock when there is one ──────────────
          ════════════════════════════════════════════════════════════
          ONE STATUS ELEMENT, NOT TWO
          ════════════════════════════════════════════════════════════

          The review countdown used to be its own card rendered ABOVE
          this header in VendorDashboard. Because the header is pulled up
          by `-mt-4` to sit flush with the top of the screen, the card
          was dragged with it and ended up half off the top edge, its
          corners cut by the header behind it — visible in a partner's
          screenshot as a dark slab floating above everything.

          It was also saying the same thing twice. This pill already
          reads "Under review · We are checking your profile"; the card
          above it read "With our team · 23 hours left". Two elements,
          one subject, fighting for the same corner of the screen.

          So the clock lives HERE, where the status already is, and the
          detail card moved down into the content where there is room
          for it. The bar underneath fills as the promised window
          elapses, which is the thing that makes a wait feel finite. */}
      <button
        type="button"
        onClick={onOpenProfile}
        data-partner-state={lifecycle}
        className={`mt-3 w-full rounded-[18px] px-3.5 py-2.5 text-left ring-1 ${s.pill}`}
      >
        <span className="flex items-center gap-2">
          {/* Never colour alone — the dot has a word beside it. §59. */}
          <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
          <span className="text-[12.5px] font-extrabold">{s.label}</span>
          {/* The subtitle gives way to the clock rather than competing
              with it. "We are checking your pro..." next to "23 min 58s
              left" is two truncated half-sentences in one row, and the
              clock is the more useful of the two by a distance --
              "Under review" already says what the subtitle was for. */}
          {words ? (
            <span className={`min-w-0 flex-1 text-right text-[11.5px] font-extrabold tabular-nums ${
              left?.over ? 'text-saffron-200' : ''
            }`}>
              {words}
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-[11.5px] opacity-70">{s.sub}</span>
          )}
          <ChevronRight size={14} className="shrink-0 opacity-60" />
        </span>

        {fraction !== null && !left?.over && (
          <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-white/15">
            <span
              className="block h-full rounded-full bg-amber-300 transition-[width] duration-700 ease-out"
              style={{ width: `${Math.round(fraction * 100)}%` }}
            />
          </span>
        )}
      </button>
    </header>
  )
}
