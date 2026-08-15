import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, AlertCircle, Sparkles, Store } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { fetchActivity, TRACK_STAGES, needsYou, isLive } from '../../lib/activity'
import { formatINR } from '../../utils/format'
import FulfilmentFilm from '../../components/track/FulfilmentFilm'

/**
 * Everything the customer has going with us, in one place.
 *
 * ── Why this replaces three screens ───────────────────────────────────────
 * `MyOrders`, `MyEvents` and `MyRequests` each answered "where is my thing?"
 * in a different vocabulary, and none of them said when anything happened. A
 * customer with a cake order and a birthday booking had to visit two screens
 * and translate between them.
 *
 * ── Why the two halves are deliberately unequal ───────────────────────────
 * A shop order needs a status word and a date. A celebration is weeks of work
 * on somebody's wedding and a five-figure sum paid in stages — it needs the
 * whole road. Giving them the same card weight would either bury the
 * celebration or make a cake delivery look like a project.
 */
export default function TrackHub() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)      // null = still loading
  const [errors, setErrors] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) { setItems([]); return }
    let cancelled = false
    fetchActivity(user.id).then(({ items: rows, errors: errs }) => {
      if (cancelled) return
      setItems(rows)
      setErrors(errs)
    })
    return () => { cancelled = true }
  }, [user])

  const counts = useMemo(() => ({
    all: items?.length ?? 0,
    needsYou: items?.filter(needsYou).length ?? 0,
    live: items?.filter(isLive).length ?? 0,
    past: items?.filter(i => !i.live).length ?? 0,
  }), [items])

  const shown = useMemo(() => {
    if (!items) return []
    if (filter === 'needsYou') return items.filter(needsYou)
    if (filter === 'live') return items.filter(isLive)
    if (filter === 'past') return items.filter(i => !i.live)
    return items
  }, [items, filter])

  const celebrations = shown.filter(i => i.kind === 'celebration')
  const orders = shown.filter(i => i.kind === 'order')

  return (
    <div className="home-canvas min-h-screen pb-bottom-nav">
      <header className="px-4 pt-5">
        <h1 className="font-serif text-[26px] font-extrabold leading-tight text-ink">Track</h1>
        <p className="mt-0.5 text-[12px] text-ink-mute">
          Every celebration and every order, with what happens next.
        </p>
      </header>

      {/* ── Named failures, never a silent empty state ─────────────────
          "You have nothing here" is the most damaging thing this screen can
          say untruthfully. If one source failed, the other still renders and
          the customer is told which half is missing. */}
      {errors.length > 0 && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-2xl bg-chilli-50 px-3.5 py-3 ring-1 ring-chilli-600/15">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-chilli-700" />
          <p className="text-[11.5px] leading-relaxed text-chilli-800">
            We couldn't load your {errors.map(e => e.source === 'orders' ? 'orders' : 'celebrations').join(' and ')} just now.
            Anything shown below is complete; pull down to try again.
          </p>
        </div>
      )}

      {!user ? (
        <SignedOutPitch />
      ) : items === null ? (
        <div className="mx-auto max-w-3xl space-y-3 px-4 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-sunk/[0.07]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mx-auto max-w-3xl space-y-6 pb-8 pt-4">
          <Filters filter={filter} onChange={setFilter} counts={counts} />

          {celebrations.length > 0 && (
            <section aria-labelledby="celebrations-heading">
              <h2 id="celebrations-heading" className="px-4 text-[15px] font-extrabold text-ink">
                Your celebrations
              </h2>
              <div className="mt-3 space-y-3 px-4">
                {celebrations.map(c => <CelebrationCard key={c.key} item={c} />)}
              </div>
            </section>
          )}

          {orders.length > 0 && (
            <section aria-labelledby="orders-heading">
              <h2 id="orders-heading" className="px-4 text-[15px] font-extrabold text-ink">
                Your orders
              </h2>
              <p className="mt-0.5 px-4 text-[11px] text-ink-mute">
                Delivered by Sambramo. Tap one to see where it is.
              </p>
              <div className="mt-3 divide-y divide-hairline/[0.06] overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline/[0.08] mx-4">
                {orders.map(o => <OrderRow key={o.key} item={o} />)}
              </div>
            </section>
          )}

          {shown.length === 0 && (
            <p className="px-4 py-10 text-center text-[12.5px] text-ink-mute">
              Nothing here under this filter.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Filters ──────────────────────────────────────────────────────────── */

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'needsYou', label: 'Needs you' },
  { id: 'live',     label: 'Live' },
  { id: 'past',     label: 'Past' },
]

function Filters({ filter, onChange, counts }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
      {FILTERS.map(f => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          aria-pressed={filter === f.id}
          className={`tap-tall home-chip shrink-0 ${
            filter === f.id
              ? 'bg-saffron-400 text-plum-950'
              : 'bg-surface-sunk/[0.07] text-ink-soft ring-1 ring-hairline/10'
          }`}
        >
          {f.label}
          {counts[f.id] > 0 && <span className="ml-1 opacity-70">{counts[f.id]}</span>}
        </button>
      ))}
    </div>
  )
}

/* ── A celebration ────────────────────────────────────────────────────── */

function CelebrationCard({ item }) {
  const stageLabel = item.cancelled
    ? 'Cancelled'
    : TRACK_STAGES[item.stageIndex]?.label ?? 'Received'

  return (
    <Link
      to={item.href}
      className="block overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline/[0.08] transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/[0.08] text-xl">
          {item.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[14px] font-extrabold text-ink">{item.title}</p>
            <span className="shrink-0 font-mono text-[10px] text-ink-mute">{item.reference}</span>
          </div>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">{item.message}</p>

          {item.needsYou && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-saffron-400/15 px-2.5 py-1 text-[11px] font-extrabold text-saffron-700 ring-1 ring-saffron-400/30">
              {item.needsYou.label}
            </p>
          )}
        </div>
      </div>

      {/* The bar is the axis only. `needsYou` never moves it — a plan waiting
          on the customer has not travelled further, it has stopped. */}
      <div className="px-4 pb-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-sunk/[0.08]"
          role="progressbar"
          aria-valuenow={item.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${item.title}: ${stageLabel}`}
        >
          <span
            className={`block h-full rounded-full transition-all duration-500 ${item.cancelled ? 'bg-ink/20' : 'bg-accent'}`}
            style={{ width: `${Math.max(item.progress, 4)}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[11px] font-bold text-ink-soft">{stageLabel}</span>
          {/* Names the payment panel rather than a generic "open". The ladder
              is one tap in, and a card that does not mention it is why
              somebody looks at this hub and concludes the payment options
              were never built. */}
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent">
            Steps &amp; payments <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── An order ─────────────────────────────────────────────────────────── */

function OrderRow({ item }) {
  return (
    <Link to={item.href} className="flex items-center gap-3 p-3.5 transition-colors active:bg-surface-sunk/[0.04]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunk/[0.06] text-base">
        {item.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-ink">{item.title}</span>
        <span className="block text-[11px] text-ink-mute">
          {TRACK_STAGES[item.stageIndex]?.label ?? 'Cancelled'}
          {item.amount != null && <> · {formatINR(item.amount)}</>}
        </span>
      </span>
      <ChevronRight size={15} className="shrink-0 text-ink-mute" />
    </Link>
  )
}

/* ── Signed out ───────────────────────────────────────────────────────────
 *
 * The tab is permanent, so this is a real destination for somebody who has
 * never ordered — and it is the single best place in the app to make the
 * argument, because it describes what happens AFTER they commit. A brand with
 * no ratings and no order count cannot win on reputation; it can win on
 * showing exactly how the thing will be run.
 *
 * So this is the promise, not an apology for being empty, and certainly not a
 * login wall. Sign-in is asked at the point there is something to see.
 */
const PROMISES = [
  { emoji: '🤝', title: 'Every step your coordinator takes',
    body: 'Masters sourced, decorator confirmed, caterer confirmed — as it happens, with the time it happened.' },
  { emoji: '💳', title: 'Every payment, and what it released',
    body: 'Paid in stages, never all at once. Each one shows exactly what work it set in motion.' },
  { emoji: '📋', title: 'Your plan, priced and itemised',
    body: 'One number you approve before anything is booked. Change it and we re-send it.' },
  { emoji: '🛍️', title: 'Your shop orders too',
    body: 'Cakes, gifts and pooja essentials, from placed to delivered.' },
]

function SignedOutPitch() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10 pt-4">
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-hairline/[0.08]">
        <p className="font-serif text-[20px] font-extrabold leading-tight text-ink">
          Everything about your celebration lives here
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-mute">
          Once you send us a celebration or place an order, this is where you watch it
          happen — every step, every payment, one screen. Nothing to set up.
        </p>

        <ul className="mt-4 space-y-3.5">
          {PROMISES.map(p => (
            <li key={p.title} className="flex gap-3">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.08] text-base">
                {p.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-ink">{p.title}</span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-mute">{p.body}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link to="/plan" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-saffron-400 px-4 py-3 text-[13px] font-extrabold text-plum-950">
            <Sparkles size={15} /> Plan a celebration
          </Link>
          <Link to="/shop" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-sunk/[0.07] px-4 py-3 text-[13px] font-extrabold text-ink ring-1 ring-hairline/10">
            <Store size={15} /> Browse the shop
          </Link>
        </div>

        {/* Sign-in is offered, never imposed — the same rule the planner and
            the storefront follow. Somebody who already has a booking should
            be able to get to it from here in one tap. */}
        <p className="mt-3 text-center text-[11.5px] text-ink-mute">
          Already booked something?{' '}
          <Link to="/login" className="font-bold text-accent underline underline-offset-2">
            Sign in to track it
          </Link>
        </p>
      </div>

      <FulfilmentFilm />
    </div>
  )
}

/* ── Nothing yet ──────────────────────────────────────────────────────── */

/**
 * Reachable only by deep link or on desktop — the tab does not appear until
 * there is something to track. So it is not an apology, it is the pitch: the
 * film shows exactly what this screen will fill up with.
 */
function EmptyState() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10 pt-6">
      <div className="rounded-2xl bg-surface p-5 text-center ring-1 ring-hairline/[0.08]">
        <p className="font-serif text-[19px] font-extrabold text-ink">Nothing to track yet</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-mute">
          When you send us a celebration or place an order, it appears here — every
          step, every payment, in one place.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/plan" className="inline-flex items-center justify-center gap-2 rounded-xl bg-saffron-400 px-4 py-3 text-[13px] font-extrabold text-plum-950">
            <Sparkles size={15} /> Plan a celebration
          </Link>
          <Link to="/shop" className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-sunk/[0.07] px-4 py-3 text-[13px] font-extrabold text-ink ring-1 ring-hairline/10">
            <Store size={15} /> Browse the shop
          </Link>
        </div>
      </div>

      <FulfilmentFilm />
    </div>
  )
}
