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
    <header className="relative isolate overflow-hidden bg-gradient-to-br from-[#10052F] via-[#24105F] to-[#4B0B78] px-4 pb-7 pt-[calc(14px+env(safe-area-inset-top,0px))] text-white sm:px-6" style={{backgroundImage:'radial-gradient(circle at 78% 22%, rgba(168,85,247,.34), transparent 25%), radial-gradient(circle at 58% 78%, rgba(236,72,153,.18), transparent 28%), linear-gradient(135deg,#10052F 0%,#24105F 48%,#4B0B78 100%)'}}>
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="relative text-[25px] font-black uppercase tracking-[-0.045em] text-white drop-shadow-[0_0_16px_rgba(255,255,255,.35)] sm:text-[31px]">Sambramo<span aria-hidden="true" className="pointer-events-none absolute -bottom-2 left-0 h-1.5 w-[88%] -skew-x-[24deg] rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-transparent shadow-[0_0_14px_rgba(168,85,247,.9)]" /></span>
            <span className="rounded-full border border-fuchsia-300/40 bg-fuchsia-500/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_18px_rgba(168,85,247,.28)] sm:text-[12px]">Partner</span>
            <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ring-4 ring-emerald-400/10 ${acceptingJobs ? 'bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.85)]' : 'bg-white/35'}`} />
          </div>
          <p className="mt-5 text-[15px] font-semibold leading-tight text-violet-100 sm:text-[20px]">{wish},</p>
          <h1 className="mt-1 max-w-[320px] truncate text-[27px] font-black leading-none tracking-[-0.035em] sm:max-w-[520px] sm:text-[42px]">{businessName ?? 'Your business'} <span aria-hidden="true">👋</span></h1>
          <p className="mt-2 text-[16px] font-bold text-violet-100/90 sm:text-[21px]">{dayLine}</p>
          <div className="mt-5"><OnlineToggle vendorId={vendorId} initial={acceptingJobs} onChange={onAcceptingChange} /></div>
        </div>
        <div className="relative z-20 flex shrink-0 items-start gap-2 sm:gap-3">
          <button type="button" onClick={onOpenAlerts} aria-label={unreadAlerts ? `Alerts and updates, ${unreadAlerts} unread` : 'Alerts and updates'} className="relative flex h-12 w-12 items-center justify-center rounded-full border border-fuchsia-300/55 bg-violet-950/55 shadow-[0_0_24px_rgba(168,85,247,.6)] backdrop-blur sm:h-16 sm:w-16">
            <Bell size={25} className="text-white sm:h-8 sm:w-8" />
            {unreadAlerts > 0 && <span className="absolute right-0 top-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-[#24105F]">{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>}
          </button>
          <button type="button" onClick={onOpenProfile} aria-label="Your account" className="rounded-[16px] border-2 border-fuchsia-300/70 shadow-[0_0_20px_rgba(168,85,247,.5)]">
            <PartnerAvatar url={avatarUrl} name={businessName} size={48} shape="square" />
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-10 top-20 h-44 w-44 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-[32%] h-24 w-72 -rotate-12 rounded-[50%] bg-fuchsia-500/20 blur-2xl" />
        <span className="absolute right-[34%] top-[32%] text-2xl text-yellow-200 drop-shadow-[0_0_12px_rgba(253,224,71,.9)]">✦</span>
        <span className="absolute right-[20%] top-[60%] text-lg text-yellow-200 drop-shadow-[0_0_12px_rgba(253,224,71,.8)]">✦</span>
        <div className="absolute right-[10%] top-[28%] w-[43%] max-w-[390px] min-w-[210px] rotate-[-5deg] sm:right-[8%] sm:top-[22%]">
          <div className="absolute -right-2 -top-7 z-20 rounded-2xl border border-white/30 bg-violet-800/80 px-4 py-3 text-center text-[10px] font-black leading-tight text-white shadow-[0_0_24px_rgba(168,85,247,.45)] sm:text-[13px]">Let’s create<br />more celebrations<br />together!</div>
          <div className="relative rounded-[28px] border-2 border-fuchsia-300/70 bg-gradient-to-br from-violet-400/90 via-fuchsia-300/80 to-violet-700/90 p-3 shadow-[0_16px_45px_rgba(0,0,0,.35),0_0_35px_rgba(168,85,247,.7)]">
            <div className="absolute -top-6 left-[18%] h-12 w-5 rounded-full border-4 border-fuchsia-200/80 bg-violet-950" />
            <div className="absolute -top-6 left-[48%] h-12 w-5 rounded-full border-4 border-fuchsia-200/80 bg-violet-950" />
            <div className="absolute -top-6 right-[18%] h-12 w-5 rounded-full border-4 border-fuchsia-200/80 bg-violet-950" />
            <div className="rounded-[20px] bg-white/95 p-4 shadow-inner"><div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(i => <span key={i} className="flex h-8 items-center justify-center rounded-lg bg-violet-50"><span className="h-2.5 w-6 rounded-full bg-violet-700" /></span>)}</div></div>
          </div>
          <div className="absolute -left-10 bottom-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_8px_20px_rgba(0,0,0,.25)] rotate-[8deg] sm:h-16 sm:w-16"><span className="text-3xl">🎁</span></div>
          <div className="absolute -left-1 bottom-[-8px] flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl shadow-[0_0_22px_rgba(124,58,237,.65)]"><span>👥</span></div>
          <div className="absolute -right-3 bottom-[-5px] flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-500 text-2xl shadow-[0_0_22px_rgba(217,70,239,.7)]"><span>🎉</span></div>
          <div className="absolute -left-2 top-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-700 text-3xl shadow-[0_0_28px_rgba(168,85,247,.8)]"><span>🔔</span></div>
        </div>
      </div>
    </header>
  )
}
