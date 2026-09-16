import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ClipboardList, CalendarDays, LayoutDashboard, UserCog,
  CheckCircle2, Loader2, AlertCircle,
  MessageCircle, Bell, IndianRupee,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import { VENDOR_STATUS } from '../../config/vendor'
import { PARTNER_PLANS, PLAN_BY_ID, effectiveTier } from '../../config/partnerPlans'
import { useVendorAccount } from '../../hooks/useVendorAccount'
import VendorServiceList from '../../components/vendor/VendorServiceList'
import VendorAvailability from '../../components/vendor/VendorAvailability'
import OfferInbox from '../../components/vendor/OfferInbox'
import JobAlerts from '../../components/vendor/JobAlerts'
import MyJobs from '../../components/vendor/MyJobs'
import OfferHistory from '../../components/vendor/OfferHistory'
import CalendarNudge from '../../components/vendor/CalendarNudge'
import PartnerAccount from '../../components/vendor/PartnerAccount'
import TermsGate from '../../components/vendor/TermsGate'
import ClosedAccount from '../../components/vendor/ClosedAccount'
import Earnings from '../../components/vendor/Earnings'
import JobsHeader from '../../components/partner/JobsHeader'
import JobsStats from '../../components/partner/JobsStats'
import { fetchNotifications } from '../../lib/partnerInbox'
import UpcomingWeek from '../../components/partner/UpcomingWeek'
import AttentionSummary from '../../components/partner/AttentionSummary'
import CalendarMonth from '../../components/partner/CalendarMonth'
import { usePartnerAttention } from '../../hooks/usePartnerAttention'
import { PARTNER_TERMS_VERSION } from '../../config/partnerTerms'

/**
 * The partner's console.
 *
 * What this replaces: a page of literals. Seven cards that opened WhatsApp, a
 * five-item checklist hardcoded to 1/5 with a "Coming soon" pill on every
 * remaining step, four stat tiles reading "—" and "0", and a "Free plan" badge
 * that ignored `vendors.subscription_plan`. It queried nothing — an approved
 * vendor with a full profile saw the same "Complete your profile · Important"
 * nag as someone who signed up ten seconds ago.
 *
 * The change of principle: a vendor now *does* things here rather than asking
 * for them to be done. Two of the four sections write to the database, and the
 * two that still route to a coordinator do so because the data genuinely lives
 * on the coordinator's side — concierge sourcing is admin-only by RLS
 * (migration 006), so an "Enquiries" tab would be an empty box with a lie in it.
 *
 * WhatsApp stays for exactly that, and no further. A "contact us" link where a
 * control belongs is a support cost dressed up as a feature.
 */

const TABS = [
  // Jobs first, and it is the only tab whose position is load-bearing.
  // An offer lives for 45 seconds; a partner who has to find the right
  // tab has already lost it. Everything else here can wait.
  { id: 'offers',       label: 'Jobs',         icon: Bell             },
  // Second only to Jobs. A partner opens this app to work and to find
  // out what they have earned, in that order.
  { id: 'earnings',     label: 'Earnings',     icon: IndianRupee     },
  /* Overview is NOT here on purpose. It is absent from
     PartnerBottomNav, so listing it made a tab reachable only by
     typing a URL — and TABS is what validates ?tab=, so a stale link
     to it rendered a screen with no way back to the others. The
     component stays; nothing routes to it. */
  { id: 'list',         label: 'Listing',      icon: ClipboardList   },
  { id: 'availability', label: 'Calendar',     icon: CalendarDays    },
  { id: 'account',      label: 'Account',      icon: UserCog         },
]

const TONES = {
  amber: { card: 'border-amber-200 bg-amber-50/70',   pill: 'bg-amber-100 text-amber-800',    icon: 'text-amber-600'   },
  green: { card: 'border-emerald-200 bg-emerald-50/60', pill: 'bg-emerald-100 text-emerald-800', icon: 'text-emerald-600' },
  rose:  { card: 'border-rose-200 bg-rose-50/70',     pill: 'bg-rose-100 text-rose-800',      icon: 'text-rose-600'    },
  gray:  { card: 'border-gray-200 bg-gray-50',        pill: 'bg-gray-200 text-gray-700',      icon: 'text-gray-500'    },
}

function whatsappHref(message) {
  return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`
}

export default function VendorDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [calendarDismissed, setCalendarDismissed] = useState(false)
  /* The bell's count. Lives here rather than inside JobsHeader so the
     header stays a presentational strip, and so the same number can
     later drive a tab badge without a second query. */
  const [unreadAlerts, setUnreadAlerts] = useState(0)

  const account = useVendorAccount()
  const {
    loading, error, refresh, vendor, services, availability, reviews,
    stats, checklist, updateVendor, addService, updateService, removeService,
    setDayStatus, setRangeStatus, clearDays,
  } = account

  // The tab lives in the URL so the checklist can link straight at the thing
  // it is asking for, and so a vendor who reloads mid-edit lands back where
  // they were rather than on Overview.
  const tab = TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'offers'
  const setTab = id => setParams(id === 'offers' ? {} : { tab: id }, { replace: true })

  const businessName = vendor?.business_name ?? profile?.full_name ?? 'Your business'
  const statusMeta   = VENDOR_STATUS[vendor?.status] ?? VENDOR_STATUS.PENDING_REVIEW

  /* Is anything rendered above the tab content? The business-name header
     is Jobs-only and the status card only shows when it blocks, so on
     Listing the answer is usually no — and the margin written to clear
     them was pure white space.

     The gap is 24px on a tab that has something above it and 0 on one
     that does not. It used to be 24 on Jobs regardless, stacked on top of
     CalendarNudge's own 16 — 40px of nothing before the jobs a partner
     opened the app to see — and 48 for a blocked partner, because the
     status card already carries its own 24. */
  const aboveTabs = tab === 'offers' || statusMeta.blocking
  /* PARTNER_PLANS, not VENDOR_PLANS. The two ladders describe different
     businesses — VENDOR_PLANS still sells "priority in coordinator search"
     and "5 enquiries a month" — and this pill and the Account tab reading
     different ones would put two answers to "what plan am I on" in the
     same app. `effectiveTier` also honours the launch offer, which is the
     reason a partner on `free` correctly reads Pro here. */
  const plan         = PLAN_BY_ID[effectiveTier(vendor?.subscription_plan)] ?? PARTNER_PLANS[0]

  /* ── The status the header shows ────────────────────────────────────
     Derived here from the vendors row rather than through
     partnerLifecycle(), which wants the full onboarding account shape —
     listings, documents, payout. This tab already holds the one row
     that settles it, and passing `services` in where `listings` is
     expected would type-check and answer wrongly.

     Order matters: approved wins over everything, and "sent back"
     outranks "waiting", because it is the one the partner must act on. */
  const lifecycle =
    !vendor ? 'ONBOARDING'
    : vendor.verification_status === 'rejected' ? 'REQUIRES_ACTION'
    : (vendor.is_verified && vendor.status === 'APPROVED') ? 'LIVE'
    : vendor.verification_status === 'submitted' ? 'UNDER_REVIEW'
    : 'ONBOARDING'

  /* Counts only — the sections below fetch their own rows. */
  const attention = usePartnerAttention(vendor?.id)

  /* Unread notifications, for the bell. Absent until 125 is applied,
     which is why a failure leaves the count at zero rather than
     blanking the header. */
  useEffect(() => {
    let alive = true
    if (!vendor?.id) return undefined
    fetchNotifications(vendor.id, 1).then(({ unread, unavailable }) => {
      if (alive && !unavailable) setUnreadAlerts(unread)
    })
    return () => { alive = false }
  }, [vendor?.id, tab])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="animate-spin text-plum-600" size={30} />
        <span className="text-sm">Loading your dashboard…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="card p-6 border-red-200 bg-red-50/60 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">We couldn't load your dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Your list and calendar are safe — this is a connection problem on our side.
            </p>
            <button onClick={refresh} className="btn-plum text-sm mt-4">Try again</button>
          </div>
        </div>
      </div>
    )
  }

  /* A vendor account with no vendors row: they signed up and never
     finished onboarding, or onboarding failed.

     This used to be a second, quieter version of "Great! Let's get
     started" — a card inside the dashboard shell, on a grey ground, with
     a different heading and a different list of steps. A partner who
     reached it had been sent PAST the real intro screen to a smaller
     copy of it, which is the jump-ahead as it was actually experienced.

     One screen owns this state now, and it is /partner/setup. The
     redirect is `replace` so the back button does not bounce them into
     the dashboard they cannot use. */
  if (!vendor) return <Navigate to="/partner/setup" replace />

  /* ══════════════════════════════════════════════════════════════════
     NOTHING LOADS UNTIL THE TERMS ARE ANSWERED
     ══════════════════════════════════════════════════════════════════

     The cancellation ladder (081) and the three-strike suspension (083)
     are already enforced in the database against partners who were
     never shown either rule. Consent obtained after the charge is not
     consent, so this sits in front of the dashboard rather than in a
     menu.

     After the !vendor check on purpose: somebody without a vendor row
     is still onboarding and has nothing to agree to yet.

     Version-aware. A partner who accepted v1 sees this again when the
     substance changes, and not for a typo -- see config/partnerTerms. */
  if (vendor.terms_version !== PARTNER_TERMS_VERSION) {
    return <TermsGate vendorId={vendor.id} onAccepted={refresh} />
  }

  /* ══════════════════════════════════════════════════════════════════
     A CLOSED ACCOUNT IS A DOOR, NOT A BANNER
     ══════════════════════════════════════════════════════════════════

     Closing a partner used to do nothing at all. The suspension banner
     below keys on `suspended_at`, which set_vendor_verification never
     wrote, so it did not render -- and nothing else gated anything. A
     closed partner went on editing listings, setting their calendar and
     changing their payout details, and the only sign was that no work
     ever arrived.

     Keyed on `verification_status`, which 078 made the source of truth,
     rather than on `suspended_at`, which two different mechanisms wrote
     inconsistently. 116 now sets both together so they cannot disagree,
     but the status is the one to trust.

     After the terms gate: a closed partner has nothing to agree to. */
  if (vendor.verification_status === 'suspended') {
    return <ClosedAccount vendor={vendor} onSignOut={handleSignOut} />
  }

  return (
    /* pb-28 clears the fixed partner tab bar. Without it the last job
       card sits under the bar and looks cut off -- and on the customer
       surface, where that bar does not render, it is 7rem of harmless
       whitespace at the very bottom of a scrolled page. */
    <div className="max-w-5xl mx-auto px-4 pb-28 pt-4 sm:px-6 sm:pt-5">

      {/* Above the header, above the tabs, above everything.
          A master opens this app because something is happening or to
          find out whether anything is, and the answer used to require
          finding the right tab. This states the single most pressing
          fact about their day and links straight at it. */}
      {/* Only ever visible in a browser — the component checks for the
          Capacitor bridge and renders nothing inside the app. So seeing
          it at all is unambiguous proof this is not the app, which is
          the distinction that cost hours to establish by other means. */}
      {/* Suspension is said out loud.
          `match_partners` requires is_verified, so a suspended master
          silently receives nothing — and silence is indistinguishable
          from a quiet week. Somebody whose income has stopped is owed
          the reason on the first screen, not a support call. */}
      {vendor.suspended_at && (
        <div className="mb-4 rounded-[22px] bg-rose-50 p-4 ring-1 ring-rose-200">
          <p className="text-[15px] font-extrabold text-rose-900">Your account is suspended</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-rose-900/85">
            {vendor.suspended_reason ?? 'Contact Sambramo.'} You will not be
            offered jobs until this is resolved.
          </p>
          <a
            href={`https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent('My Sambramo partner account is suspended and I would like to discuss it.')}`}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-[13.5px] font-extrabold text-white"
          >
            Talk to Sambramo
          </a>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BOTH OF THESE ARE HOME-SCREEN FURNITURE
          ══════════════════════════════════════════════════════════════

          They rendered above every tab, so opening Account greeted a
          partner with "Next: Photography · Thursday, 10 Sep" and an
          install nudge before anything about their account. Reported
          exactly that way.

          It is the same mistake the header made and was fixed for: a
          card that answers "what is happening today" is the home tab's
          job. On Earnings, Listing, Calendar and Account it is a
          different subject sitting above the one somebody navigated to
          — and on Account it also linked back to Jobs, which is the one
          place they had just chosen to leave. */}
      {/* space-y, because these rendered as bare siblings: the install
          banner butted straight into the resume card and the resume card
          into the header below it. */}
      {/* ── Header ───────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════
          THE HEADER IS PART OF THE JOBS TAB, NOT THE APP
          ══════════════════════════════════════════════════════════════

          Business name, trade, status pill, plan pill, Sign out — all of
          it repeated above every tab. Open Earnings and the first third
          of the screen is a header you already read; open Listing and
          it is there again. On a phone that is the difference between
          landing on your money and scrolling to it.

          Reported as "the same header, events, is visible on every
          navigation". It is a home-screen header, so it lives on the
          home tab.

          Account still shows the business, in Business details, where
          somebody goes to change it. */}
      {/* ── The operations header ─────────────────────────────────
          Replaces the old business-name block on this tab. It carries
          the one status that actually decides whether work arrives —
          derived from the partner's real lifecycle, not an invented
          online/offline toggle this platform has no column for. See
          components/partner/JobsHeader. */}
      {tab === 'offers' && (
        <div className="-mx-4 -mt-4 mb-4 sm:-mx-6">
          <JobsHeader
            lifecycle={lifecycle}
            businessName={businessName}
            vendorId={vendor?.id}
            avatarUrl={vendor?.avatar_url}
            unreadAlerts={unreadAlerts}
            acceptingJobs={vendor?.accepting_jobs}
            onAcceptingChange={() => refresh()}
            onOpenProfile={() => setTab('account')}
            onOpenAlerts={() => setTab('account')}
          />
        </div>
      )}

      {/* ── The scoreboard ───────────────────────────────────────────
          Four counts, each traceable to rows, riding up over the
          header's bottom edge the way the reference design has them. */}
      {tab === 'offers' && (
        <div className="mb-4">
          <JobsStats
            vendorId={vendor?.id}
            onOpen={key => {
              if (key === 'messages') setTab('account')
              else if (key === 'confirmed' || key === 'accepted') setTab('availability')
            }}
          />
        </div>
      )}

      {/* What needs doing, and nothing at all when nothing does. */}
      {tab === 'offers' && (
        <AttentionSummary
          counts={{ ...attention, requiresAction: vendor?.verification_status === 'rejected' ? 1 : 0 }}
          onOpen={key => {
            if (key === 'claimable' || key === 'awaitingPayment') setTab('earnings')
            else if (key === 'requiresAction') setTab('account')
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          THE OLD HEADER IS GONE
          ══════════════════════════════════════════════════════════════

          A second header used to render here, under JobsHeader: the
          business name at 2xl in a different font, the category and
          area, a status pill, a plan pill and a Sign out button. Two
          headers on one screen, in two type scales, saying the same
          thing twice — which is exactly the "new header + old profile"
          stack this consolidation exists to remove.

          Everything it carried still exists, in one place each:

            business name, area, status   JobsHeader, compactly
            plan                          More, where it can be changed
            sign out                      More, at the bottom, behind
                                          the confirm it always had

          A partner's own details do not belong at the top of the
          operational screen. They belong under More, which is where
          somebody goes to change them. */}


      {/* ── Status ───────────────────────────────────────── */}
      {/* Leads the page whenever the vendor is not live, because it is the only
          fact that changes what the rest of the page means. Once approved it
          stays but stops shouting. */}
      {/* Only when something is WRONG.

          "You are live on Sambramo" was three lines of green congratulating
          a partner for a state they can already read in one word: the Live
          pill sits next to their business name at the top of every tab. A
          card that repeats the pill is not reassurance, it is the app
          talking about itself above the jobs somebody opened it to see.

          Pending or rejected is the opposite — it changes what every other
          screen on the app means, and a partner who does not know they are
          not live will sit waiting for jobs that are never coming. That
          keeps its card, on every tab. */}
      {statusMeta.blocking && (
      <section className={`card mt-4 p-4 sm:p-5 flex items-start gap-3 ${TONES[statusMeta.tone].card}`}>
        <CheckCircle2 size={20} className={`mt-0.5 shrink-0 ${TONES[statusMeta.tone].icon}`} />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 text-sm">{statusMeta.headline}</h2>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{statusMeta.detail}</p>
          {vendor.status === 'REJECTED' && vendor.rejection_reason && (
            <p className="text-sm text-rose-800 bg-white/70 border border-rose-200 rounded-xl px-3 py-2 mt-3">
              <span className="font-semibold">What we noted:</span> {vendor.rejection_reason}
            </p>
          )}
          {statusMeta.blocking && (
            <a
              href={whatsappHref(`Hi Sambramo — this is ${businessName}. I'd like an update on my partner profile (${vendor.status}).`)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-plum-700 hover:text-plum-900 mt-3"
            >
              <MessageCircle size={14} /> Talk to our team
            </a>
          )}
        </div>
      </section>
      )}

      {/* Only when the calendar really is out of date, and dismissible
          for the session. See the component for why it is not a
          permanent banner.

          Home tab only, for the same reason InstallTheApp and PartnerResume
          are: it is a card whose entire job is to send somebody to the
          Calendar tab. On the Calendar tab it is a purple banner urging you
          to open the screen you are already looking at, and it pushes the
          calendar itself below the fold to say so. The Calendar tab carries
          its own six-month coverage card, which says the same thing about
          the month in front of you rather than in general. */}
      {tab === 'offers' && !calendarDismissed && (
        <CalendarNudge
          availability={availability}
          onOpen={() => { setTab('availability'); setCalendarDismissed(true) }}
          onDismiss={() => setCalendarDismissed(true)}
        />
      )}

      {/* The five destinations live in the bottom bar now --
          components/layout/PartnerBottomNav. They have been a scrolling
          strip and a card grid; both made a partner reach this page and
          scroll before they could go anywhere. A fixed bar is where the
          thumb already is, and it survives scrolling. */}

      {/* ── Nothing above, so nothing to clear ──────────────────────
          The business-name header renders on Home only, and the status
          card only when it is blocking. On Listing, for a partner in
          good standing, BOTH are absent — and this still carried the
          page padding, a spacer and a 24px top margin written to sit
          below them. About 110px of white between the navbar and the
          first heading, on the screen a partner opens most.

          So the gap is spent only when there is something above to be
          separated from. */}
      <div className={aboveTabs ? 'mt-6' : ''}>
        {/* Live jobs. Rendered only for an approved partner — an
            unverified one is not in the dispatch pool (match_partners
            filters on is_verified), so an inbox for them would be a
            permanently empty box with a promise in it. */}
        {/* ══════════════════════════════════════════════════════════
            WHY THE JOBS TAB IS EMPTY, PER LISTING
            ══════════════════════════════════════════════════════════

            A partner whose listings are under review sees "no jobs right
            now" and concludes the platform has none — rather than that
            theirs has not been switched on yet.

            This said so, once, in a navy box, and only when EVERY
            listing was under review. A caterer with four listings of
            which three were live and one was not saw nothing at all, and
            a caterer whose listing came BACK saw nothing either, because
            'rejected' is not 'under_review'.

            So it is the same tracker the Listing tab is built from, in
            compact mode: which listing is where, in the same words, on
            both tabs. A status a partner has to look up in two places
            and reconcile is a status they do not trust. */}
        {tab === 'offers' && (
          vendor?.is_verified ? (
            <div className="space-y-5">
              {/* Above the inbox deliberately: an empty inbox with alerts
                  off is a master who will never know a job arrived, and
                  that is the first thing worth telling them. */}
              <JobAlerts vendorId={vendor.id} />

              {/* New offers, which expire in 45 seconds. */}
              <OfferInbox vendorId={vendor.id} />

              {/* Seven days, three rows. Between the expiring offers and
                  the full job list because it answers the morning
                  question -- what have I got on -- which sits between
                  "is there new work" and "show me everything". */}
              <UpcomingWeek onSeeAll={() => setTab('availability')} />

              {/* And everything already accepted.
                  Below the inbox because an expiring offer is urgent and a
                  job next Saturday is not -- but on the SAME tab, because
                  a master who accepted a job and then could not find it
                  anywhere had no way to know the tap had worked. */}
              <div>
                <p className="mb-2 type-overline text-ink-mute">Your jobs</p>
                <MyJobs vendorId={vendor.id} />
              </div>

              {/* Last, and collapsed. It answers "why am I not getting
                  work", which is a question asked occasionally — not a
                  thing to scroll past on the way to today's jobs. */}
              <OfferHistory vendorId={vendor.id} />
            </div>
          ) : (
            /* ── Two different waits, and they are not the same news ───
               A partner who has submitted everything and one who has not
               started both saw "finish your list". The first has nothing
               left to do and was being told to do more; the second needs
               to know exactly what is outstanding.

               §29: submitted is not live, and the screen has to say which
               of the two it is without ever implying approval. */
            <div className="rounded-[22px] bg-white p-8 text-center ring-1 ring-ink/[0.06]">
              {vendor?.verification_status === 'submitted' ? (
                <>
                  <p className="text-[14px] font-extrabold text-ink">Your profile is under review</p>
                  <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-snug text-ink-mute">
                    Setup complete. A person at Sambramo is reading it now — we will
                    tell you the moment it is done, and jobs open then.
                  </p>
                  <p className="mt-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-800">
                    Under review
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-extrabold text-ink">Jobs open once you are approved</p>
                  <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-snug text-ink-mute">
                    We check every master before sending them work. Finish the six
                    setup steps and we will take it from there.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/partner/setup')}
                    className="mt-4 min-h-[44px] rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-5 text-[13px] font-extrabold text-white"
                  >
                    Continue setup
                  </button>
                </>
              )}
            </div>
          )
        )}

        {tab === 'earnings' && (
          <Earnings vendorId={vendor?.id} onAddPayout={() => setTab('account')} />
        )}

        {tab === 'list' && (
          <VendorServiceList
            vendor={vendor}
            services={services}
            onAdd={addService}
            onUpdate={updateService}
            onRemove={removeService}
            /* The review banner's one call to action. Jumping tabs rather
               than linking, so the partner keeps their place. */
            onOpenCalendar={() => setTab('availability')}
            onOpenJobs={() => setTab('offers')}
            /* ── Straight into the flow they just signed up for ────
               Onboarding ends at ?tab=list&start=<trade>, so the last
               tap of signing up and the first tap of listing are the
               same tap. Read once and cleared, or a partner who closes
               the flow and comes back to this tab would have it thrown
               at them again. */
            startTrade={params.get('start')}
            /* Step 1's sub-flow hands back here. When the partner came
               from onboarding the questionnaire must return them to the
               Business and Services hub rather than leaving them on the
               dashboard — which is the single change that stops a saved
               trade reading as a finished sign-up. */
            returnTo={params.get('return') === 'setup' ? '/partner/setup/services' : null}
            onStartConsumed={() => setParams(prev => {
              const next = new URLSearchParams(prev)
              next.delete('start')
              return next
            }, { replace: true })}
          />
        )}

        {/* ── What is actually booked, above the grid that says which
               days are free ──────────────────────────────────────────
            The availability calendar reads vendor_availability; the work
            lives in partner_jobs. A partner asking "what am I doing next
            week" had to hold both in their head. The agenda answers it,
            and carries the travel-conflict warnings a month grid cannot
            show. See components/partner/AgendaView. */}
        {tab === 'availability' && (
          <div className="mb-6">
            <h2 className="mb-3 text-[15px] font-extrabold text-ink">Your schedule</h2>
            {/* The month, then the day. CalendarMonth owns both and
                feeds the grid from the same conflict engine the agenda
                rows use, so a dot and the warning under it cannot
                disagree about the same day. */}
            <CalendarMonth vendorId={vendor?.id} availability={availability}
                           onSetDay={setDayStatus} onSetRange={setRangeStatus} />
          </div>
        )}

        {tab === 'availability' && (
          <VendorAvailability
            vendor={vendor}
            availability={availability}
            onSetDay={setDayStatus}
            onSetRange={setRangeStatus}
            onClearDays={clearDays}
            onUpdateVendor={updateVendor}
          />
        )}

        {/* The whole tab, in one component. It used to be three siblings
            assembled here — a payout card, a read-only <dl> with a link
            back into the onboarding wizard, and the handbook — with the
            ordering argument living in this file rather than next to the
            thing it orders. components/vendor/PartnerAccount owns all of
            it now, including sign-out, which was previously reachable
            only from the header on the Jobs tab. */}
        {tab === 'account' && (
          <PartnerAccount
            vendor={vendor}
            profile={profile}
            reviews={reviews}
            onUpdateVendor={updateVendor}
            onSignOut={handleSignOut}
            /* More → My Services → a trade opens that trade's own
               listing, on the tab that already renders it. Switching the
               tab rather than routing keeps the partner inside the
               dashboard and keeps one implementation of the flow. */
            onOpenTrade={trade => setParams({ tab: 'list', start: trade })}
          />
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════
   Overview is gone.

   It was the old partner dashboard: a 7-step setup checklist, four stat
   tiles, two big navigation cards and a WhatsApp promo section. Nothing
   routed to it — `overview` was deliberately left out of TABS, and TABS
   is what validates ?tab=, so the only way to reach it was a URL that
   no longer resolved. A hundred and sixty lines of screen that could
   render and never did.

   Its three jobs are done elsewhere now, each by one thing:

     what needs doing      AttentionSummary, on Jobs
     the numbers           JobsStats, on Jobs
     where to go next      the bottom navigation

   Deleted rather than commented out. A screen kept "in case" is a
   screen somebody eventually routes to again.
   ══════════════════════════════════════════════════════════════════════ */
