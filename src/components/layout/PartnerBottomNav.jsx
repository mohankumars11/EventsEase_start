import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Bell, IndianRupee, CalendarDays, Menu } from 'lucide-react'
import { isPartnerSurface } from '../../config/surface'
import { useAuth } from '../../context/AuthContext'

/**
 * The partner app's tab bar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE BOTTOM, AND WHY FOUR
 * ══════════════════════════════════════════════════════════════════════
 *
 * These destinations have now been a horizontal strip that scrolled
 * off the edge, and a grid of cards halfway down the page. Both were
 * wrong in the same way: a partner had to reach the dashboard, scroll,
 * and read before they could go anywhere.
 *
 * Every app this one is competing with for the same thumb — Porter,
 * Rapido, Swiggy's delivery app — puts navigation at the bottom, fixed,
 * always there. It is where the thumb already is on a 6-inch phone, it
 * survives scrolling, and it means the answer to "where is Earnings" is
 * never "scroll up".
 *
 * Five was the ceiling and four is the number: see the note on TABS for
 * why Listing is not one of them, and what it costs a marketplace when
 * an add-anything button sits one tap from every screen.
 *
 * ── It drives the URL, not local state ──────────────────────────────
 * Each tab writes `?tab=`, which the dashboard already reads. So the
 * back button works, a link can point at Earnings, and the bar and the
 * page cannot disagree about which tab is open — there is one source
 * and it is the address bar.
 */

/* ── Four, and Listing is deliberately not one of them ──────────────
 *
 * It was five, with "Listing" third. That tab was an unrestricted way
 * into the add flow from anywhere in the app, one tap from every screen
 * — and the add flow's first screen is twenty-six trades with nothing
 * saying which of them the partner already has. That is how a partner
 * ends up with four Photographys and a marketplace ends up with four
 * rows nobody can tell apart.
 *
 * Listing is not deleted; it has a front door instead. More → My
 * Services shows the trades they actually have, with the status of
 * each, and Add Service goes to the same twenty-six with the ones they
 * own already marked. The rule and the screen now arrive together.
 *
 * Four also buys every target ~90px on a 360px phone, which is the size
 * a thumb hits without looking — the thing this bar exists for.
 */
const TABS = [
  { id: 'offers',       label: 'Jobs',     icon: Bell },
  { id: 'availability', label: 'Calendar', icon: CalendarDays },
  { id: 'earnings',     label: 'Earnings', icon: IndianRupee },
  /* Still `account` underneath. The id is in every ?tab= link, in the
     dashboard's validation list and in four call sites; renaming it to
     `more` would break all of them to change one word on screen. */
  { id: 'account',      label: 'More',     icon: Menu },
]

export default function PartnerBottomNav() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { profile } = useAuth()

  /* ══════════════════════════════════════════════════════════════════
     ONE BAR, AND IT IS THERE BEFORE YOU SIGN IN
     ══════════════════════════════════════════════════════════════════

     There were briefly two bars: a browse bar on the landing with its own
     four tabs, and this one after signing in. That is two mental models —
     the thing at the bottom of the screen changed meaning depending on
     whether you had an account.

     The fix for that was to delete the second bar, and it went one step
     too far: the landing ended up with NO bar, so the app only looked
     like an app once you were signed in. Reported exactly that way: "there
     is no navigation bar on the very first page itself, customer needs to
     log in to see the navigation bar."

     So it is the SAME four tabs, in the same order, in the same place,
     signed in or not. What changes is only where they lead: signed out,
     every tab except Jobs goes to sign-in and comes back to the tab that
     was tapped. Nothing is hidden and nothing is renamed, because the bar
     is also how somebody learns what the app contains before they have
     committed to it. Zomato and Rapido both show you the whole app and
     ask for an account at the point you need one. */
  if (!isPartnerSurface()) return null

  /* -- Not on the way in --------------------------------------------
     /partner/join is the sign-in screen, and on the APK it is the first
     thing a partner sees. A tab bar there is wrong twice over: it sits
     on top of the login the screen exists for, and every tab on it leads
     back to the same sign-in they are already looking at.

     Excluded rather than the whole of /partner, because /partner is the
     pitch a WhatsApp forward lands on -- and the argument in the note
     above, that the bar is how somebody learns what the app contains
     before committing, is exactly right THERE. It is only on the door
     itself that it has nothing to offer.

     /onboarding/vendor needs no exclusion: it matches neither test and
     has always returned null. */
  /* Nothing on the way in. /partner/onboarding, the three location
     screens, the login and the setup introduction are all pre-account
     states: a tab bar on any of them sits on top of the one thing the
     screen is for, and every tab leads back to the sign-in already in
     front of them.

     Listed by prefix rather than turning the bar off for all of
     /partner, because /partner itself is the pitch a forwarded link
     lands on -- and the note above, that the bar is how somebody learns
     what the app contains before committing, is right there. */
  const PRE_ACCOUNT = [
    '/partner/onboarding',
    '/partner/location',
    '/partner/login',
    '/partner/join',
    '/partner/verify',
    '/partner/setup',
    /* What you offer. Its own sticky Continue sits exactly where the bar
       would be, and a partner mid-setup has one thing to do. */
    '/partner/services',
    '/partner/market',
  ]
  const preAccount  = PRE_ACCOUNT.some(r => pathname.startsWith(r))
  const onLanding   = pathname.startsWith('/partner') && !preAccount
  const onDashboard = pathname.startsWith('/dashboard/vendor')
  if (!onLanding && !onDashboard) return null

  /* Signed out anywhere but the landing means mid sign-up, and a one-way
     flow does not want four ways out of it. */
  const signedOut = !profile
  if (signedOut && !onLanding) return null

  const items = TABS.map(t => ({
    ...t,
    to: signedOut
      /* `next` so the tap is not lost: sign in, land on what you tapped. */
      ? (t.id === 'offers' ? '/partner/join' : `/login?next=${encodeURIComponent(`/dashboard/vendor?tab=${t.id}`)}`)
      : (t.id === 'offers' ? '/dashboard/vendor' : `/dashboard/vendor?tab=${t.id}`),
  }))

  /* On the landing, Jobs is where you are. */
  const active = signedOut ? 'offers' : (params.get('tab') ?? 'offers')

  return (
    <nav
      aria-label="Partner sections"
      /* Solid white, not 97% with a blur.
         A translucent bar looks considered on a design mock and looks
         broken on a phone: job cards slide under it and their text
         reads THROUGH the labels while scrolling. backdrop-blur does
         not save it either — blurred text behind a label is still
         movement behind a label, and the bar is the one part of the
         screen that must never look like it is doing something.
         Reported exactly that way: "the navigation bar is completely
         transparent, whenever scrolling I can see the buttons". */
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/[0.10] bg-white shadow-[0_-4px_16px_rgba(36,16,67,0.06)]"
      /* The home-indicator strip on a gesture-navigation phone sits under
         the bar; without this the last row of labels is behind it. */
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* max-w-5xl to match the page. At max-w-2xl the active tab sat
          under the middle of a wider screen while the content it belonged
          to ran past both sides of it. */}
      <ul className="mx-auto flex max-w-5xl items-stretch">
        {items.map(({ id, label, icon: Icon, to }) => {
          const on = active === id
          return (
            <li key={id} className="flex-1">
              <Link
                to={to}
                aria-current={on ? 'page' : undefined}
                className="flex flex-col items-center gap-0.5 py-2 pt-2.5"
              >
                {/* The active pill sits behind the icon rather than
                    colouring the whole cell: a full-width fill at this
                    size reads as a pressed state that never released. */}
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                  on ? 'bg-saffron-400' : 'bg-transparent'
                }`}>
                  <Icon size={17} className={on ? 'text-plum-950' : 'text-ink-mute'} />
                </span>
                <span className={`text-[10.5px] leading-none ${
                  on ? 'font-extrabold text-ink' : 'font-bold text-ink-mute'
                }`}>
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
