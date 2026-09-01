import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Bell, IndianRupee, CalendarDays, ClipboardList, UserCog } from 'lucide-react'
import { isPartnerSurface } from '../../config/surface'
import { useAuth } from '../../context/AuthContext'

/**
 * The partner app's tab bar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE BOTTOM, AND WHY FIVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * These five destinations have now been a horizontal strip that scrolled
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
 * Five is the ceiling. A sixth makes each target under 60px on a 360px
 * phone, which is below the size a thumb reliably hits, and the whole
 * point of this bar is that it is hit without looking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ORDER IS NOT ALPHABETICAL AND NOT A GUESS
 * ══════════════════════════════════════════════════════════════════════
 *
 *   Jobs        first, and the default. It is why the app is opened.
 *   Earnings    second, because it is why the app is KEPT.
 *   Calendar    third — the one that costs a partner money when it is
 *               ignored, since dispatch offers work on days nobody
 *               blocked.
 *   My work     the service list. Set once, edited rarely.
 *   Account     payouts and profile. Deepest because it is opened least.
 *
 * ── It drives the URL, not local state ──────────────────────────────
 * Each tab writes `?tab=`, which the dashboard already reads. So the
 * back button works, a link can point at Earnings, and the bar and the
 * page cannot disagree about which tab is open — there is one source
 * and it is the address bar.
 */

const TABS = [
  { id: 'offers',       label: 'Jobs',      icon: Bell },
  { id: 'earnings',     label: 'Earnings',  icon: IndianRupee },
  { id: 'availability', label: 'Calendar',  icon: CalendarDays },
  { id: 'list',         label: 'My work',   icon: ClipboardList },
  { id: 'account',      label: 'Account',   icon: UserCog },
]

export default function PartnerBottomNav() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { profile } = useAuth()

  // Only in the partner app, and only on the dashboard it navigates.
  if (!isPartnerSurface()) return null
  if (!pathname.startsWith('/dashboard/vendor')) return null

  /* Not before there is an account to have tabs for. A partner still
     signing up is on a one-way flow and a tab bar there is five ways to
     abandon it. */
  if (!profile) return null

  const active = params.get('tab') ?? 'offers'

  return (
    <nav
      aria-label="Partner sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/[0.08] bg-white/97 backdrop-blur"
      /* The home-indicator strip on a gesture-navigation phone sits under
         the bar; without this the last row of labels is behind it. */
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = active === id
          return (
            <li key={id} className="flex-1">
              <Link
                to={id === 'offers' ? '/dashboard/vendor' : `/dashboard/vendor?tab=${id}`}
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
