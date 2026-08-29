import { useState, useEffect } from 'react'
import AppBadge from '../../components/common/AppBadge'
import InstallTheApp from '../../components/vendor/InstallTheApp'
import { Link } from 'react-router-dom'
import {
  ChevronRight, ChevronDown, CalendarHeart, ClipboardList, Route as RouteIcon,
  Package, ShoppingBag, LayoutGrid, MapPin, ShieldCheck, MessageCircle,
  PhoneCall, LogOut, User, Sparkles, Store, RotateCcw, Mail,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useCity } from '../../context/CityContext'
import { useCustomerActivity } from '../../hooks/useCustomerActivity'
import { BRAND } from '../../config/sambramo'
import { CANCELLATION, RETURN_TERMS, CATEGORY_RULES } from '../../config/policies'
import AppBar from '../../components/layout/AppBar'
import SambramoLogo from '../../components/ui/SambramoLogo'
import ChatWidget from '../../components/customer/ChatWidget'
import ReferAndEarn from '../../components/customer/ReferAndEarn'
import AccountSettings from '../../components/customer/AccountSettings'

/**
 * Account — the sixth tab, and the app's one answer to "where is my stuff?"
 *
 * ── Why this screen exists ────────────────────────────────────────────────
 * Everything on it was already in the product and none of it was reachable in
 * fewer than three taps. Orders and Requests lived behind a 32px avatar in an
 * app bar; celebrations lived behind the same avatar one row down; the delivery
 * city was a control in a different bar; the referral card was rendered on a
 * page that is no longer routed, so `profile.referral_code` was being issued to
 * customers who had no way to see it; and the returns policy — the part people
 * actually go looking for before they buy from a brand they have not heard of —
 * existed only inside the return dialog of an order they had already placed.
 *
 * A dropdown in a header is a desktop control. On a phone it hides a whole
 * region of the app behind a hit target the size of a thumbnail, and this
 * audience is essentially all phone.
 *
 * ── It is honest about being pre-launch ───────────────────────────────────
 * There is deliberately no "Saved addresses", no "Saved cards", no
 * "Notification settings" and no "Language". Every one of those is a row every
 * app of this shape has, and every one of them would be a row that opens
 * nothing: addresses are collected per-order at checkout, there is no gateway
 * holding a card (payments are UPI deep links), and there is no notification
 * preference store. A settings list that lies about what it can do is worse
 * than a short one that doesn't.
 *
 * What IS here is real: live counts from the customer's own three tables, the
 * city that actually governs pricing and serviceability, the referral code the
 * database actually issued, and the policy text the admin console evaluates
 * against.
 *
 * ── Signed out ────────────────────────────────────────────────────────────
 * The tab is permanent (see BottomNav), so a guest has to land somewhere that
 * is not a login wall — the same rule Track and the storefront already follow.
 * They get the brand, what an account is FOR in three specifics, one sign-in
 * button, and the policy and support blocks, which are exactly the things
 * somebody deciding whether to trust a pre-launch brand wants to read.
 */

/* ── Live counts ──────────────────────────────────────────────────────────
   Three `head: true` counts — no row payload at all. The tab-bar hook next
   door deliberately fetches statuses because it has to decide what needs the
   customer; this screen only prints totals beside a label, so it asks for the
   cheaper thing.

   `allSettled` for the same reason `useCustomerActivity` documents: one table
   failing an RLS change must not blank all three, because "you have nothing"
   is the most damaging sentence this screen can say untruthfully. A count that
   could not be read shows as `null` and renders as a dash, not as a zero. */
function useAccountCounts() {
  const { user } = useAuth()
  const [counts, setCounts] = useState({ events: null, orders: null, enquiries: null })

  useEffect(() => {
    if (!user) { setCounts({ events: null, orders: null, enquiries: null }); return }
    let cancelled = false

    const head = table => supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)

    Promise.allSettled([head('events'), head('orders'), head('service_enquiries')])
      .then(([events, orders, enquiries]) => {
        if (cancelled) return
        const n = r => (r.status === 'fulfilled' && !r.value.error ? r.value.count ?? 0 : null)
        setCounts({ events: n(events), orders: n(orders), enquiries: n(enquiries) })
      })

    return () => { cancelled = true }
  }, [user])

  return counts
}

export default function Account() {
  const { user, profile, signOut } = useAuth()
  const { productCount, totalCount } = useCart()
  const { city, chosen, servable, openCityPicker } = useCity()
  const activity = useCustomerActivity()
  const counts = useAccountCounts()

  const firstName =
    profile?.full_name?.split(' ')[0] ??
    user?.user_metadata?.name?.split(' ')[0] ??
    null

  return (
    <div className="home-canvas min-h-screen pb-bottom-nav">
      {/* No profile dropdown on this screen: it holds the same five links the
          page below is made of, and a menu that duplicates the page it is on
          is a second answer to a question already answered. */}
      <AppBar title="Account" subtitle={firstName ? `Signed in as ${firstName}` : 'Sambramo'} menu={false} />

      <div className="mx-auto max-w-3xl space-y-6 pb-8 pt-3">
        {user ? <Identity profile={profile} user={user} /> : <GuestPanel />}

        {user && (
          <ActivityTiles
            counts={counts}
            needsYou={activity.needsYou}
            live={activity.live}
          />
        )}

        {user && (
          <Group title="Your celebrations" hint="Everything we are arranging for you">
            <Row
              to="/dashboard/customer/events" icon={CalendarHeart}
              label="My celebrations" sub="Every occasion you have asked us to run"
              meta={fmtCount(counts.events)} i={0}
            />
            <Row
              to="/dashboard/customer/requests" icon={ClipboardList}
              label="Requests & quotes" sub="What you have asked for, and what we came back with"
              meta={fmtCount(counts.enquiries)} i={1}
            />
            <Row
              to="/track" icon={RouteIcon}
              label="Track everything" sub="Every step and every payment, in one place"
              badge={activity.needsYou} pulse={activity.needsYou === 0 && activity.live > 0} i={2}
            />
          </Group>
        )}

        {user && (
          <Group title="Your shopping" hint="Delivered goods, and what is still in a basket">
            <Row
              to="/dashboard/customer/orders" icon={Package}
              label="My orders" sub="Deliveries, returns and refunds"
              meta={fmtCount(counts.orders)} i={0}
            />
            {totalCount > 0 && (
              <Row
                to="/dashboard/customer/cart" icon={LayoutGrid}
                label="Services basket" sub="Services and packages waiting to be sent"
                badge={totalCount} i={2}
              />
            )}
          </Group>
        )}

        {/* Self-gates on `profile.referral_code`, so it simply is not there
            until the database has issued one. */}
        {user && <ReferAndEarn />}

        {/* ── Settings ──────────────────────────────────────────────
            Name, phone, city, email, password, saved addresses,
            notification switches and language — the set any commerce app
            of this shape is expected to hold, and every one of them
            writing somewhere real.

            This screen originally shipped without them on the grounds that
            a settings row which opens nothing is worse than a short list.
            That constraint was satisfied rather than relaxed: migration 049
            adds `customer_addresses` and the preference columns, and where
            it has not been applied yet the reads fall back to defaults
            while the writes name the missing migration instead of failing
            silently. */}
        {user && <AccountSettings />}

        <Group title="Where you are" hint="What we can deliver, and what it costs, both follow from this">
          <button
            type="button"
            onClick={openCityPicker}
            className="rise-in home-glass flex w-full items-center gap-3 p-3.5 text-left transition-transform active:scale-[0.99]"
            style={{ '--rise-delay': '0ms' }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
              <MapPin size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-ink">Delivery city</span>
              <span className="block truncate text-[11px] text-ink-mute">
                {chosen
                  ? servable
                    ? `${city} — we are live here`
                    : `${city} — not served yet, tap to change`
                  : 'Not set yet — tap to choose'}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
              chosen && servable
                ? 'bg-forest-600/10 text-forest-700'
                : 'bg-saffron-400/20 text-saffron-700'
            }`}>
              {chosen ? city : 'Set'}
            </span>
          </button>
        </Group>

        <Policies />

        <Support />
        <ChatWidget />

        {user ? (
          <section className="px-4">
            <button
              onClick={signOut}
              className="home-glass flex w-full items-center justify-center gap-2 p-3.5 text-[13px] font-extrabold text-chilli-600 transition-transform active:scale-[0.99]"
            >
              <LogOut size={16} /> Sign out
            </button>
          </section>
        ) : (
          <section className="px-4">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3.5 text-sm font-extrabold text-plum-950 transition-transform active:scale-95"
            >
              Sign in or create an account <ChevronRight size={16} />
            </Link>
          </section>
        )}

        <BrandFoot />
      </div>
    
      {/* Which app this is, and how current. See components/common/AppBadge.
          On the customer side this was missing entirely, so there was no
          way to tell an installed app from a Chrome shortcut with the
          same icon. */}
      {/* Clear of the furniture below it.
          `pb-bottom-nav` on the page wrapper accounts for the tab bar and
          nothing else — the chat button is a separate fixed element in
          the bottom-right corner, and this block was landing underneath
          both of them. The last thing on a page has to clear everything
          floating over it, not just the tallest one. */}
      <div className="mt-8 space-y-3 pb-24">
        <InstallTheApp app="customer" />
        <AppBadge className="text-center" />
      </div>
</div>
  )
}

/** A count that could not be read is a dash, never a zero. */
function fmtCount(n) {
  return n === null ? '—' : String(n)
}

/* ── Identity ─────────────────────────────────────────────────────────────
   The one panel on this screen that is allowed to be a brand moment.

   Plum, because the concierge half of the business is plum and the account is
   the customer's relationship with the company rather than with the shop. The
   kolam sits behind it at low opacity, oversized and turning on a very slow
   loop — the mark has four-fold symmetry, so it rotates onto itself and never
   becomes a different shape (the same property SambramoLogo's hover turn uses).
   It reads as a watermark on stationery, which is the register this panel wants:
   this is your account with a company, not a settings screen. */
function Identity({ profile, user }) {
  const name  = profile?.full_name ?? user?.user_metadata?.name ?? 'Your account'
  const email = profile?.email ?? user?.email
  const initials = profile?.full_name
    ? profile.full_name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : null
  const since = profile?.created_at ?? user?.created_at

  return (
    <section className="px-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-plum-800 via-plum-900 to-plum-950 p-5 shadow-[0_22px_50px_-26px_rgba(43,15,82,0.9)]">
        <span
          aria-hidden="true"
          className="animate-spin-slow pointer-events-none absolute -right-10 -top-10 opacity-[0.13]"
        >
          {/* A watermark, not a mark. This was a 172px Spencerian S at 13%
              opacity, slowly rotating off the corner. With the S retired,
              rendering the brand SEAL here would put a rotating filled
              square in the corner — a square is the one shape that looks
              wrong turning, because its corners sweep. A single open glyph
              rotates cleanly and is what a watermark wants to be. */}
          <Sparkles size={172} strokeWidth={1.1} className="text-white" />
        </span>

        <div className="relative flex items-center gap-3.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-saffron-400 font-display text-xl font-bold text-plum-950 ring-2 ring-white/25">
            {initials ?? <User size={22} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold leading-tight text-white">{name}</p>
            {email && (
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-plum-200">
                <Mail size={11} className="shrink-0" /> {email}
              </p>
            )}
            {since && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-saffron-300">
                <Sparkles size={9} /> With us since {new Date(since).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Signed out ───────────────────────────────────────────────────────────
   Three specifics, not a pitch. The tab is permanent, so this is a screen a
   first-time visitor can land on by accident — and the honest reason to make
   an account here is that the app already lets you browse, plan and fill a
   basket without one. So it names the three things an account actually buys
   you, and asks once. */
const GUEST_REASONS = [
  { icon: RouteIcon,     text: 'Follow every step and every payment of a celebration in one place.' },
  { icon: Package,       text: 'Keep your orders, returns and refunds where you can find them.' },
  { icon: CalendarHeart, text: 'Pick a plan back up where you left it, on any device.' },
]
function GuestPanel() {
  return (
    <section className="px-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-plum-800 via-plum-900 to-plum-950 p-5 shadow-[0_22px_50px_-26px_rgba(43,15,82,0.9)]">
        <span
          aria-hidden="true"
          className="animate-spin-slow pointer-events-none absolute -right-10 -top-10 opacity-[0.13]"
        >
          {/* A watermark, not a mark. This was a 172px Spencerian S at 13%
              opacity, slowly rotating off the corner. With the S retired,
              rendering the brand SEAL here would put a rotating filled
              square in the corner — a square is the one shape that looks
              wrong turning, because its corners sweep. A single open glyph
              rotates cleanly and is what a watermark wants to be. */}
          <Sparkles size={172} strokeWidth={1.1} className="text-white" />
        </span>

        <div className="relative">
          <SambramoLogo size={34} ground="onDark" caption="emotion" />
          <p className="mt-4 text-[13px] font-bold leading-snug text-white">
            You can browse, plan and fill a basket without an account.
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-plum-200">
            Signing in is for keeping things — nothing more is asked of you than
            an email.
          </p>

          <ul className="mt-4 space-y-2.5">
            {GUEST_REASONS.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="rise-in flex items-start gap-2.5"
                style={{ '--rise-delay': `${i * 90}ms` }}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-saffron-400/15 text-saffron-300">
                  <Icon size={13} />
                </span>
                <span className="text-[11px] leading-relaxed text-plum-100">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ── The three counts ─────────────────────────────────────────────────────
   Each tile is a link, because a number you cannot tap is trivia. The middle
   one carries the only urgency on the screen — how many things are waiting on
   the customer — and it is the same integer the tab bar badges, read from the
   same hook, so the bar and the page can never disagree. */
function ActivityTiles({ counts, needsYou, live }) {
  const tiles = [
    { to: '/dashboard/customer/events',  label: 'Celebrations', value: counts.events, icon: CalendarHeart },
    { to: '/dashboard/customer/orders',  label: 'Orders',       value: counts.orders, icon: Package },
    {
      to: '/track', label: needsYou > 0 ? 'Need you' : 'Live now',
      value: needsYou > 0 ? needsYou : live, icon: RouteIcon, urgent: needsYou > 0,
    },
  ]

  return (
    <section className="grid grid-cols-3 gap-2.5 px-4" aria-label="Your activity">
      {tiles.map(({ to, label, value, icon: Icon, urgent }, i) => (
        <Link
          key={label}
          to={to}
          className={`rise-in home-glass flex flex-col items-center gap-1 p-3 text-center transition-transform active:scale-[0.97] ${
            urgent ? 'ring-1 ring-saffron-400/60' : ''
          }`}
          style={{ '--rise-delay': `${i * 80}ms` }}
        >
          <Icon size={16} className={urgent ? 'text-saffron-600' : 'text-accent'} />
          <span className="text-[19px] font-extrabold leading-none text-ink">
            {value === null ? '—' : value}
          </span>
          <span className="text-[10px] font-bold leading-tight text-ink-mute">{label}</span>
        </Link>
      ))}
    </section>
  )
}

/* ── List furniture ───────────────────────────────────────────────────────
   One Row, so every entry on this screen has the same height, the same tap
   target and the same chevron. The stagger is indexed within the group rather
   than across the page: a wave that restarts at each heading reads as three
   short lists, which is what it is. */
function Group({ title, hint, children }) {
  return (
    <section className="px-4">
      <h2 className="text-[15px] font-extrabold text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-[11px] text-ink-mute">{hint}</p>}
      <div className="mt-2.5 space-y-2">{children}</div>
    </section>
  )
}

function Row({ to, icon: Icon, label, sub, meta, badge, pulse, i = 0 }) {
  return (
    <Link
      to={to}
      className="rise-in home-glass flex items-center gap-3 p-3.5 transition-transform active:scale-[0.99]"
      style={{ '--rise-delay': `${i * 80}ms` }}
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
        <Icon size={17} />
        {pulse && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-saffron-400 animate-pulse-ring" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-saffron-500" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-ink">{label}</span>
        {sub && <span className="block truncate text-[11px] text-ink-mute">{sub}</span>}
      </span>
      {badge > 0 && (
        <span className="shrink-0 rounded-full bg-saffron-400 px-2 py-0.5 text-[11px] font-extrabold text-plum-950">
          {badge}
        </span>
      )}
      {meta && !badge && (
        <span className="shrink-0 text-[13px] font-extrabold text-ink-mute">{meta}</span>
      )}
      <ChevronRight size={16} className="shrink-0 text-ink/35" />
    </Link>
  )
}

/* ── Policies ─────────────────────────────────────────────────────────────
   The real rules, from config/policies.js — the same file the admin console
   evaluates a return against, so what a customer reads here and what an
   operator decides by are physically the same text. Restating them in JSX is
   how a policy ends up saying three different things on three screens, which
   is the fault that file was created to fix.

   Collapsed by default and expandable in place rather than a route: it is
   reference material, not a destination, and a pre-launch brand's returns
   policy being one tap from the account screen is worth more than a page
   nobody navigates to. */
function Policies() {
  const [open, setOpen] = useState(null)

  const panels = [
    {
      id: 'cancel',
      icon: RotateCcw,
      title: 'Cancelling an order',
      hint: CANCELLATION.summary,
      lines: CANCELLATION.lines,
    },
    {
      id: 'returns',
      icon: ShieldCheck,
      title: 'Returns & refunds',
      hint: 'What can come back, in what condition, and how the money reaches you.',
      lines: RETURN_TERMS.points,
      /* The per-category windows are the part people actually want, and they
         are data — a cake and a photo frame genuinely differ. */
      windows: Object.entries(CATEGORY_RULES).map(([category, rule]) => ({ category, label: rule.label })),
    },
  ]

  return (
    <section className="px-4">
      <h2 className="text-[15px] font-extrabold text-ink">The promises</h2>
      <p className="mt-0.5 text-[11px] text-ink-mute">
        Written down before you need them, not after.
      </p>

      <div className="mt-2.5 space-y-2">
        {panels.map(({ id, icon: Icon, title, hint, lines, windows }, i) => {
          const isOpen = open === id
          return (
            <div
              key={id}
              className="rise-in home-glass overflow-hidden"
              style={{ '--rise-delay': `${i * 80}ms` }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-600/10 text-forest-700 ring-1 ring-forest-600/15">
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-ink">{title}</span>
                  <span className="block text-[11px] leading-snug text-ink-mute">{hint}</span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-ink/40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="animate-fade-in border-t border-hairline/[0.07] px-3.5 pb-3.5 pt-3">
                  {windows && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {windows.map(w => (
                        <span
                          key={w.category}
                          className="rounded-lg bg-surface px-2 py-1 text-[10px] font-bold text-ink-soft ring-1 ring-hairline/[0.08]"
                        >
                          {w.category} · {w.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <ul className="space-y-2">
                    {lines.map(line => (
                      <li key={line} className="flex gap-2 text-[11px] leading-relaxed text-ink-soft">
                        <span aria-hidden="true" className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-saffron-500" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-mute">
                    Version {RETURN_TERMS.version}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ── Support ──────────────────────────────────────────────────────────────
   The same two controls the home screen's support strip carries, and
   deliberately the same shape: a customer who learned them there should not
   have to learn them again here. */
function Support() {
  return (
    <section className="px-4">
      <div className="home-glass flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink ring-1 ring-hairline/[0.08]">
          <MessageCircle size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-ink">Talk to a person</p>
          <p className="text-[11px] text-ink-mute">Mon–Sat, 9am–8pm. A human, not a bot.</p>
        </div>
        <a
          href={`https://wa.me/${BRAND.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="tap-48 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white transition-transform active:scale-95"
        >
          <MessageCircle size={17} />
        </a>
        <a
          href={`tel:${BRAND.supportPhone}`}
          aria-label="Call support"
          className="tap-48 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink ring-1 ring-hairline/10 transition-transform active:scale-95"
        >
          <PhoneCall size={16} />
        </a>
      </div>
    </section>
  )
}

/* ── The assistant ────────────────────────────────────────────────────────
   It used to be mounted in App and therefore live on every screen, as a
   floating dock in the bottom-right corner. On Home that corner is busy —
   ResumePrompt and the date badge both want it, the tab bar is directly
   under it, and the assistant sat over the last row of celebration cards.
   A support control that covers merchandise is a support control that costs
   money.

   So it lives here, on the one screen whose whole job is "I need something
   from Sambramo, not from the catalogue". It sits directly under the human
   contacts above it deliberately: the order is phone, WhatsApp, then bot,
   because that is the order of how much a person actually wants.

   It keeps its own floating dock rather than being inlined into the page:
   the panel is a conversation and wants the height, and on THIS screen the
   bottom-right corner is empty. That is the whole difference — the dock was
   never the problem, the screen it was docked to was. */
/* ── The sign-off ─────────────────────────────────────────────────────────
   The one place in the app where the lockup gets to sit on its own with air
   around it. `caption="emotion"` rather than the descriptor: somebody on their
   account screen does not need telling what Sambramo is, and the emotional
   line is the one worth reading twice.

   The two links are the halves of the business, named the way config/sambramo
   names them — so this footer cannot drift from the labels every other surface
   uses. */
function BrandFoot() {
  return (
    <footer className="px-4 pt-2">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-surface-sunk/[0.04] px-5 py-7 text-center ring-1 ring-hairline/[0.06]">
        <SambramoLogo size={38} ground="onLight" caption="emotion" />
        <p className="max-w-[16rem] text-[11px] leading-relaxed text-ink-mute">
          {BRAND.descriptor}, live in {BRAND.pilotCities.join(' and ')}.
        </p>
        <div className="flex items-center gap-2">
          <Link
            to="/plan"
            className="flex items-center gap-1.5 rounded-xl bg-plum-900 px-3.5 py-2 text-[11px] font-extrabold text-white"
          >
            <Sparkles size={12} /> Plan a celebration
          </Link>
        </div>
      </div>
    </footer>
  )
}
